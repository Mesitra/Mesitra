import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../../middleware/adminAuth.js'

export const adminFinanceRouter = Router()

// Proteksi seluruh endpoint di bawah middleware requireAdmin
adminFinanceRouter.use(requireAdmin)

const WITHDRAWAL_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  walletBalance: true
}

/**
 * GET /withdrawals
 * Mengambil daftar pengajuan penarikan dana.
 * Secara default mengambil status 'MENUNGGU'.
 * Query parameter:
 * - status : 'MENUNGGU' | 'DIPROSES' | 'SELESAI' | 'DITOLAK' | 'ALL' (default: 'MENUNGGU')
 * - search : pencarian nama, kode penarikan, rekening, bank
 */
adminFinanceRouter.get('/withdrawals', async (req, res, next) => {
  try {
    const { status = 'MENUNGGU', search } = req.query ?? {}

    const where = {}

    if (status && String(status).toUpperCase() !== 'ALL') {
      where.status = String(status).toUpperCase()
    }

    if (search && String(search).trim()) {
      const q = String(search).trim()
      where.OR = [
        { withdrawalCode: { contains: q } },
        { bankName: { contains: q } },
        { accountNumber: { contains: q } },
        { accountHolder: { contains: q } },
        { user: { fullName: { contains: q } } },
        { user: { email: { contains: q } } }
      ]
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where,
      include: {
        user: { select: WITHDRAWAL_USER_SELECT }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json({
      message: 'Daftar penarikan dana berhasil dimuat',
      total: withdrawals.length,
      withdrawals
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * GET /withdrawals/:id
 * Mengambil rincian satu pengajuan penarikan dana.
 */
adminFinanceRouter.get('/withdrawals/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        user: { select: WITHDRAWAL_USER_SELECT }
      }
    })

    if (!withdrawal) {
      return res.status(404).json({
        error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Permintaan penarikan dana tidak ditemukan' }
      })
    }

    return res.json({
      message: 'Detail penarikan dana berhasil dimuat',
      withdrawal
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /withdrawals/:id/approve
 * Menyetujui pencairan dana:
 * Menerima bankReference dan transferProofUrl, mengubah status menjadi SELESAI,
 * mencatat timestamp & adminId pemroses, serta menyimpan jejak audit log.
 */
adminFinanceRouter.patch('/withdrawals/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params
    const { bankReference, transferProofUrl, adminNotes } = req.body ?? {}

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    })

    if (!withdrawal) {
      return res.status(404).json({
        error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Permintaan penarikan dana tidak ditemukan' }
      })
    }

    if (withdrawal.status !== 'MENUNGGU' && withdrawal.status !== 'DIPROSES') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: `Penarikan berstatus ${withdrawal.status} tidak dapat disetujui`
        }
      })
    }

    const cleanRef = typeof bankReference === 'string' ? bankReference.trim() : ''
    const cleanProof = typeof transferProofUrl === 'string' ? transferProofUrl.trim() : null
    const cleanNotes = typeof adminNotes === 'string' ? adminNotes.trim() : null

    const adminId = req.admin?.id || req.userId
    const now = new Date()

    const [updatedWithdrawal] = await prisma.$transaction([
      // 1. Update status WithdrawalRequest menjadi SELESAI
      prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: 'SELESAI',
          bankReference: cleanRef.length > 0 ? cleanRef : null,
          transferProofUrl: cleanProof,
          adminNotes: cleanNotes,
          processedAt: now,
          processedById: adminId
        },
        include: {
          user: { select: WITHDRAWAL_USER_SELECT }
        }
      }),
      // 2. Catat audit trail aksi admin
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'APPROVE_WITHDRAWAL',
          targetType: 'WITHDRAWAL',
          targetId: withdrawal.id,
          metadata: {
            withdrawalCode: withdrawal.withdrawalCode,
            userId: withdrawal.userId,
            userEmail: withdrawal.user.email,
            amount: withdrawal.amount,
            bankName: withdrawal.bankName,
            accountNumber: withdrawal.accountNumber,
            accountHolder: withdrawal.accountHolder,
            bankReference: cleanRef
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Pencairan dana ${updatedWithdrawal.withdrawalCode} sebesar Rp ${updatedWithdrawal.amount.toLocaleString('id-ID')} disetujui`,
      withdrawal: updatedWithdrawal
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /withdrawals/:id/reject
 * Menolak pencairan dana:
 * [KRUSIAL] Menggunakan transaksi database Prisma:
 * 1. Mengubah status WithdrawalRequest menjadi DITOLAK beserta rejectionReason.
 * 2. Mengembalikan (rollback) saldo amount ke walletBalance pemilik.
 * 3. Mencatat mutasi transaksi dompet gagal untuk riwayat pengguna.
 * 4. Mencatat adminAuditLog atas aksi penolakan ini.
 */
adminFinanceRouter.patch('/withdrawals/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params
    const { rejectionReason } = req.body ?? {}

    if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
      return res.status(400).json({
        error: { code: 'REJECTION_REASON_REQUIRED', message: 'Alasan penolakan pencairan dana wajib diisi' }
      })
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, walletBalance: true } }
      }
    })

    if (!withdrawal) {
      return res.status(404).json({
        error: { code: 'WITHDRAWAL_NOT_FOUND', message: 'Permintaan penarikan dana tidak ditemukan' }
      })
    }

    if (withdrawal.status !== 'MENUNGGU' && withdrawal.status !== 'DIPROSES') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: `Penarikan berstatus ${withdrawal.status} tidak dapat ditolak`
        }
      })
    }

    const reasonText = rejectionReason.trim()
    const adminId = req.admin?.id || req.userId
    const now = new Date()

    const [updatedWithdrawal, updatedUser] = await prisma.$transaction([
      // 1. Update status WithdrawalRequest menjadi DITOLAK
      prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: 'DITOLAK',
          rejectionReason: reasonText,
          processedAt: now,
          processedById: adminId
        },
        include: {
          user: { select: WITHDRAWAL_USER_SELECT }
        }
      }),
      // 2. Rollback saldo: Tambahkan kembali amount ke walletBalance user
      prisma.user.update({
        where: { id: withdrawal.userId },
        data: {
          walletBalance: {
            increment: withdrawal.amount
          }
        },
        select: WITHDRAWAL_USER_SELECT
      }),
      // 3. Catat mutasi wallet GAGAL / pengembalian dana
      prisma.walletTransaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'WITHDRAW',
          amount: withdrawal.amount,
          description: `Pencairan dana ${withdrawal.withdrawalCode} ditolak: ${reasonText} (Saldo dikembalikan)`,
          status: 'GAGAL',
          reference: withdrawal.withdrawalCode,
          paymentMethod: withdrawal.bankName
        }
      }),
      // 4. Catat jejak audit admin
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'REJECT_WITHDRAWAL',
          targetType: 'WITHDRAWAL',
          targetId: withdrawal.id,
          metadata: {
            withdrawalCode: withdrawal.withdrawalCode,
            userId: withdrawal.userId,
            userEmail: withdrawal.user.email,
            amount: withdrawal.amount,
            rejectionReason: reasonText
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Pencairan dana ${updatedWithdrawal.withdrawalCode} ditolak. Saldo Rp ${updatedWithdrawal.amount.toLocaleString('id-ID')} telah dikembalikan ke dompet pengguna.`,
      withdrawal: updatedWithdrawal,
      refundedBalance: updatedUser.walletBalance
    })
  } catch (error) {
    return next(error)
  }
})
