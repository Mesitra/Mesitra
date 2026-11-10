import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../../middleware/adminAuth.js'
import { calculateSettlement, PLATFORM_FEE_RATE } from '../../lib/settlement.js'

export const adminDisputesRouter = Router()

// Seluruh endpoint mediasi sengketa dilindungi middleware requireAdmin
adminDisputesRouter.use(requireAdmin)

const DISPUTE_ORDER_INCLUDE = {
  id: true,
  invoiceNumber: true,
  startDate: true,
  endDate: true,
  rentalDays: true,
  rentalCost: true,
  shippingCost: true,
  addonsCost: true,
  depositAmount: true,
  totalPaid: true,
  status: true,
  initialBast: true,
  returnData: true,
  ownerInspectionPhotos: true,
  disputeReason: true,
  disputeNote: true,
  finalDamageFee: true,
  adminResolutionNote: true,
  resolvedAt: true,
  isResolvedByAdmin: true,
  equipment: {
    select: {
      id: true,
      name: true,
      category: true,
      images: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          walletBalance: true
        }
      }
    }
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      walletBalance: true
    }
  }
}

/**
 * GET /disputes
 * Mengambil daftar sengketa aktif atau riwayat resolusi.
 * Parameter query opsional:
 * - status: 'AKTIF' | 'SELESAI' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED_OWNER_WIN' | 'RESOLVED_RENTER_WIN' | 'RESOLVED_SPLIT' | 'ALL'
 *   (default: memuat semua sengketa atau sesuai query filter)
 */
adminDisputesRouter.get('/disputes', async (req, res, next) => {
  try {
    const { status, search } = req.query ?? {}

    const where = {}

    const VALID_ENUM_STATUSES = [
      'OPEN',
      'INVESTIGATING',
      'RESOLVED_OWNER_WIN',
      'RESOLVED_RENTER_WIN',
      'RESOLVED_SPLIT',
      'ESCALATED_LEGAL'
    ]

    if (status && String(status).toUpperCase() !== 'ALL') {
      const normalized = String(status).trim().toUpperCase()
      if (normalized === 'AKTIF' || normalized === 'ACTIVE') {
        where.status = { in: ['OPEN', 'INVESTIGATING', 'ESCALATED_LEGAL'] }
      } else if (normalized === 'SELESAI' || normalized === 'RESOLVED') {
        where.status = { in: ['RESOLVED_OWNER_WIN', 'RESOLVED_RENTER_WIN', 'RESOLVED_SPLIT'] }
      } else if (VALID_ENUM_STATUSES.includes(normalized)) {
        where.status = normalized
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim()
      where.OR = [
        { ticketNumber: { contains: q } },
        { disputeReason: { contains: q } },
        { order: { invoiceNumber: { contains: q } } },
        { order: { equipment: { name: { contains: q } } } },
        { renter: { fullName: { contains: q } } },
        { renter: { email: { contains: q } } }
      ]
    }

    const [disputes, countAktif, countSelesai] = await Promise.all([
      prisma.disputeTicket.findMany({
        where,
        include: {
          order: { select: DISPUTE_ORDER_INCLUDE },
          renter: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.disputeTicket.count({
        where: { status: { in: ['OPEN', 'INVESTIGATING', 'ESCALATED_LEGAL'] } }
      }),
      prisma.disputeTicket.count({
        where: { status: { in: ['RESOLVED_OWNER_WIN', 'RESOLVED_RENTER_WIN', 'RESOLVED_SPLIT'] } }
      })
    ])

    const enrichedDisputes = disputes.map((d) => ({
      ...d,
      owner: d.order?.equipment?.owner || null,
      description: d.disputeReason
    }))

    return res.json({
      message: 'Daftar tiket sengketa berhasil dimuat',
      total: enrichedDisputes.length,
      counts: {
        aktif: countAktif,
        selesai: countSelesai
      },
      disputes: enrichedDisputes
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * GET /disputes/:id
 * Mengambil detail lengkap sengketa untuk perbandingan side-by-side:
 * Menyertakan relasi Order lengkap dengan initialBast (sebelum sewa),
 * returnData & ownerInspectionPhotos (setelah sewa), data alat, penyewa, dan pemilik.
 */
adminDisputesRouter.get('/disputes/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const dispute = await prisma.disputeTicket.findFirst({
      where: {
        OR: [
          { id },
          { ticketNumber: id },
          { orderId: id }
        ]
      },
      include: {
        order: { select: DISPUTE_ORDER_INCLUDE },
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            walletBalance: true
          }
        }
      }
    })

    if (!dispute) {
      return res.status(404).json({
        error: { code: 'DISPUTE_NOT_FOUND', message: 'Tiket sengketa tidak ditemukan' }
      })
    }

    return res.json({
      message: 'Detail tiket sengketa berhasil dimuat',
      dispute: {
        ...dispute,
        owner: dispute.order?.equipment?.owner || null,
        description: dispute.disputeReason
      }
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /disputes/:id/resolve
 * Putusan Mediasi & Arbitrase Sengketa oleh Admin:
 * Payload:
 * - status             : 'RESOLVED_OWNER_WIN' | 'RESOLVED_RENTER_WIN' | 'RESOLVED_SPLIT'
 * - finalDamageFee     : nominal ganti rugi (0 s/d depositAmount)
 * - adminArbitrageNote : catatan resmi putusan mediasi admin
 *
 * [KRUSIAL - Prisma Transaction Atomic]:
 * 1. Update DisputeTicket dengan putusan mediasi final.
 * 2. Ubah status Order menjadi 'SELESAI', catat platformFee (5%) dan netOwnerPayout.
 * 3. Distribusi Escrow:
 *    - Ganti rugi (finalDamageFee) diteruskan ke Pemilik.
 *    - Sisa deposit (depositAmount - finalDamageFee) dikembalikan ke Penyewa.
 *    - Harga sewa bersih (rentalCost - 5% platformFee + ongkir + addons) dicairkan ke Pemilik.
 * 4. Catat mutasi dompet digital (WalletTransaction) untuk kedua belah pihak.
 * 5. Kembalikan status alat (Equipment) menjadi 'TERSEDIA'.
 * 6. Catat AdminAuditLog atas putusan arbitrase sengketa.
 */
adminDisputesRouter.patch('/disputes/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, finalDamageFee = 0, adminArbitrageNote } = req.body ?? {}

    const VALID_RESOLUTIONS = ['RESOLVED_OWNER_WIN', 'RESOLVED_RENTER_WIN', 'RESOLVED_SPLIT']
    if (!status || !VALID_RESOLUTIONS.includes(String(status).toUpperCase())) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RESOLUTION_STATUS',
          message: 'Status putusan wajib bernilai: RESOLVED_OWNER_WIN, RESOLVED_RENTER_WIN, atau RESOLVED_SPLIT'
        }
      })
    }

    const resolutionStatus = String(status).toUpperCase()

    // Cari tiket sengketa
    const dispute = await prisma.disputeTicket.findFirst({
      where: {
        OR: [{ id }, { ticketNumber: id }, { orderId: id }]
      },
      include: {
        order: {
          include: {
            equipment: true,
            user: true
          }
        }
      }
    })

    if (!dispute) {
      return res.status(404).json({
        error: { code: 'DISPUTE_NOT_FOUND', message: 'Tiket sengketa tidak ditemukan' }
      })
    }

    const { order } = dispute
    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan terkait sengketa ini tidak ditemukan' }
      })
    }

    // Guard: Prevent double settlement
    if (order.status !== 'DISPUTE' || dispute.status.startsWith('RESOLVED_')) {
      return res.status(400).json({
        error: {
          code: 'ALREADY_RESOLVED',
          message: `Sengketa ini telah diputuskan sebelumnya dengan status ${dispute.status}`
        }
      })
    }

    // Kalkulasi Finansial menggunakan Settlement Engine
    const depositAmount = order.depositAmount || 0
    let damageFeeAmount = 0

    if (resolutionStatus === 'RESOLVED_RENTER_WIN') {
      damageFeeAmount = 0
    } else if (resolutionStatus === 'RESOLVED_OWNER_WIN') {
      const claim = dispute.claimAmount > 0 ? dispute.claimAmount : depositAmount
      damageFeeAmount = Math.max(0, Math.min(Number(finalDamageFee) || claim, depositAmount))
    } else {
      // RESOLVED_SPLIT
      damageFeeAmount = Math.max(0, Math.min(Number(finalDamageFee) || 0, depositAmount))
    }

    const settlement = calculateSettlement({ ...order, damageFee: damageFeeAmount })
    const refundToRenter = settlement.depositRefund
    const payoutToOwner = settlement.ownerPayout
    const platformFee = settlement.platformFee

    const cleanNote = typeof adminArbitrageNote === 'string' && adminArbitrageNote.trim().length > 0
      ? adminArbitrageNote.trim()
      : `Putusan resmi mediasi sengketa oleh Admin Mesitra: ${resolutionStatus}.`

    const adminId = req.admin?.id || req.userId
    const now = new Date()
    const currentReturnData = (order.returnData && typeof order.returnData === 'object') ? order.returnData : {}

    const [updatedDispute, updatedOrder] = await prisma.$transaction(async (tx) => {
      // 1. Update DisputeTicket
      const dTicket = await tx.disputeTicket.update({
        where: { id: dispute.id },
        data: {
          status: resolutionStatus,
          finalDamageFee: damageFeeAmount,
          refundToRenter,
          payoutToOwner,
          adminArbitrageNote: cleanNote,
          arbitratedAt: now,
          arbitratedById: adminId
        }
      })

      // 2. Update Order dengan settlement data
      const oRes = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'SELESAI',
          damageFee: damageFeeAmount,
          finalDamageFee: damageFeeAmount,
          adminResolutionNote: cleanNote,
          resolvedAt: now,
          isResolvedByAdmin: true,
          platformFeeRate: PLATFORM_FEE_RATE,
          platformFee,
          netOwnerPayout: payoutToOwner,
          returnData: {
            ...currentReturnData,
            resolvedAt: now.toISOString(),
            adminResolution: {
              status: resolutionStatus,
              finalDamageFee: damageFeeAmount,
              refundToRenter,
              payoutToOwner,
              platformFee,
              adminArbitrageNote: cleanNote,
              arbitratedById: adminId,
              resolvedAt: now.toISOString()
            }
          }
        }
      })

      // 3. Distribusi Escrow ke Pemilik (Rental Net + Ongkir/Addons + Kompensasi Kerusakan)
      if (payoutToOwner > 0) {
        await tx.user.update({
          where: { id: order.equipment.ownerId },
          data: { walletBalance: { increment: payoutToOwner } }
        })

        await tx.walletTransaction.create({
          data: {
            userId: order.equipment.ownerId,
            type: 'SEWA_PAYMENT',
            amount: payoutToOwner,
            description: `Pencairan sewa ${order.invoiceNumber} (Net setelah fee platform ${platformFee.toLocaleString('id-ID')}${damageFeeAmount > 0 ? ` + Ganti rugi ${damageFeeAmount.toLocaleString('id-ID')}` : ''})`,
            status: 'BERHASIL',
            reference: order.invoiceNumber,
            paymentMethod: 'ESCROW_PAYOUT'
          }
        })
      }

      // 4. Distribusi Escrow ke Penyewa (Pengembalian Sisa Deposit)
      if (refundToRenter > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { walletBalance: { increment: refundToRenter } }
        })

        await tx.walletTransaction.create({
          data: {
            userId: order.userId,
            type: 'DEPOSIT_REFUND',
            amount: refundToRenter,
            description: `Pengembalian sisa deposit jaminan sewa ${order.invoiceNumber}`,
            status: 'BERHASIL',
            reference: order.invoiceNumber,
            paymentMethod: 'ESCROW_REFUND'
          }
        })
      }

      // 5. Kembalikan status alat menjadi TERSEDIA
      await tx.equipment.update({
        where: { id: order.equipmentId },
        data: { status: 'TERSEDIA' }
      })

      // 6. Catat AdminAuditLog
      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: 'RESOLVE_DISPUTE',
          targetType: 'DISPUTE',
          targetId: dispute.id,
          metadata: {
            ticketNumber: dispute.ticketNumber,
            orderId: order.id,
            invoiceNumber: order.invoiceNumber,
            resolutionStatus,
            finalDamageFee: damageFeeAmount,
            refundToRenter,
            payoutToOwner,
            platformFee,
            adminArbitrageNote: cleanNote
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })

      return [dTicket, oRes]
    })

    return res.json({
      message: `Putusan mediasi sengketa berhasil dieksekusi dengan status ${resolutionStatus}`,
      dispute: updatedDispute,
      financialDistribution: {
        depositAmount,
        finalDamageFee: damageFeeAmount,
        refundToRenter,
        payoutToOwner,
        platformFee
      },
      order: updatedOrder
    })
  } catch (error) {
    return next(error)
  }
})

