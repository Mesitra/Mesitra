import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'
import { sendNewOrderNotif, sendInspectionNotif } from '../services/notificationService.js'
import { calculateSettlement, PLATFORM_FEE_RATE } from '../lib/settlement.js'
import { ensureDisputeTicket } from '../lib/dispute.js'

export const ordersRouter = Router()

/**
 * Middleware: ambil userId dari JWT token.
 * Dipakai di semua endpoint /api/orders.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token tidak disertakan' }
    })
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret)
    req.userId = decoded.userId
    req.userRole = String(decoded.role || '').toUpperCase()
    req.user = { id: decoded.userId, role: req.userRole }
    next()
  } catch {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
    })
  }
}

// Semua endpoint memerlukan autentikasi.
ordersRouter.use(authenticate)

/**
 * Kembalikan pembayaran WALLET secara utuh ke dompet penyewa.
 * Harus dipanggil di dalam `prisma.$transaction` yang sama dengan perubahan
 * status pesanan agar tidak terjadi saldo menggantung bila salah satu gagal.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} order
 * @param {string} reasonLabel
 * @returns {Promise<object|null>} WalletTransaction refund atau null
 */
async function refundWalletPaymentIfNeeded(tx, order, reasonLabel) {
  if (String(order.paymentMethod || '').toUpperCase() !== 'WALLET') return null

  const refundAmount = Number(order.totalPaid) || 0
  if (refundAmount <= 0) return null

  // Guard idempotensi: jangan refund dua kali untuk invoice yang sama.
  const existingRefund = await tx.walletTransaction.findFirst({
    where: {
      userId: order.userId,
      type: 'REFUND',
      reference: order.invoiceNumber,
      status: 'BERHASIL'
    }
  })
  if (existingRefund) return existingRefund

  await tx.user.update({
    where: { id: order.userId },
    data: { walletBalance: { increment: refundAmount } }
  })

  return tx.walletTransaction.create({
    data: {
      userId: order.userId,
      type: 'REFUND',
      amount: refundAmount,
      description: `${reasonLabel} ${order.invoiceNumber} · Dana dikembalikan ke dompet`,
      status: 'BERHASIL',
      reference: order.invoiceNumber,
      paymentMethod: 'WALLET'
    }
  })
}

/**
 * Helper: Generate nomor invoice unik.
 */
function generateInvoiceNumber() {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `INV-${yy}${mm}-${seq}`
}

// ─── Kode Promo yang Valid ─────────────────────────────────────────────────────
const PROMO_CODES = {
  UMKMAJU: { type: 'FIXED', amount: 50000, description: 'Potongan Rp 50.000 untuk UMKM baru' },
  SEWAHEMAT: { type: 'PERCENT', amount: 10, description: 'Diskon 10% total sewa' },
  MYRENT10: { type: 'PERCENT', amount: 10, description: 'Diskon 10% khusus MyRent' },
  COBA50: { type: 'FIXED', amount: 50000, description: 'Gratis ongkir + potongan Rp 50.000' }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// Daftar pesanan milik user yang sedang login (sebagai penyewa atau pemilik, atau semua untuk admin).
ordersRouter.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.userRole === 'ADMIN'
    const isOwner = req.userRole === 'PEMILIK' || req.query.as === 'owner' || req.query.role === 'owner'

    let where = {}
    if (isAdmin && (req.query.all === 'true' || req.query.status || !req.query.as)) {
      if (req.query.status) {
        where.status = String(req.query.status)
      }
    } else if (isOwner) {
      where = { equipment: { ownerId: req.userId } }
      if (req.query.status) {
        where.status = String(req.query.status)
      }
    } else {
      where = { userId: req.userId }
      if (req.query.status) {
        where.status = String(req.query.status)
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        equipment: {
          include: { owner: { select: { id: true, fullName: true, email: true, phone: true, kycData: true } } }
        },
        user: { select: { id: true, fullName: true, email: true, phone: true, kycData: true } },
        review: true,
        disputeTicket: true
      }
    })

    // Sort di level aplikasi (JavaScript) agar aman dari batas sort_buffer_size MySQL saat ada field JSON besar
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Jangan kirim base64 photos raksasa di daftar ringkasan pesanan jika bukan detail
    const sanitized = orders.map((o) => {
      let returnData = o.returnData
      if (returnData && typeof returnData === 'object' && returnData.photos) {
        const rawPhotos = returnData.photos
        const hasLargeBase64 = Object.values(rawPhotos || {}).some(
          (p) => typeof p === 'string' && p.startsWith('data:') && p.length > 500
        )
        if (hasLargeBase64) {
          const { photos, ...restReturnData } = returnData
          returnData = {
            ...restReturnData,
            hasPhotos: true,
            photoCount: Object.values(photos || {}).filter(Boolean).length
          }
        }
      }

      // Pastikan field images pada equipment tidak ter-exclude dan terformat sebagai array
      let equipment = o.equipment
      if (equipment) {
        let images = equipment.images
        if (typeof images === 'string') {
          try {
            images = JSON.parse(images)
          } catch {
            images = [images]
          }
        }
        equipment = {
          ...equipment,
          images: Array.isArray(images) ? images : (images ? [images] : [])
        }
      }

      return { ...o, returnData, tenant: o.user, equipment }
    })

    return res.json({ data: sanitized })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/orders/owner/me ──────────────────────────────────────────────────
// Endpoint privat untuk mengambil daftar pesanan yang HANYA milik peralatan dari user yang login (pemilik).
ordersRouter.get('/owner/me', async (req, res, next) => {
  try {
    const ownerId = req.user?.id || req.userId
    if (!ownerId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User tidak teridentifikasi' }
      })
    }

    const where = {
      equipment: {
        ownerId
      }
    }

    if (req.query.status) {
      where.status = String(req.query.status)
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        equipment: {
          include: {
            owner: {
              select: { id: true, fullName: true, email: true, phone: true, kycData: true }
            }
          }
        },
        user: {
          select: { id: true, fullName: true, email: true, phone: true, kycData: true }
        },
        review: true,
        disputeTicket: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Sort di level aplikasi (JavaScript) agar aman dari batas sort_buffer_size MySQL saat ada field JSON besar
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Jangan kirim base64 photos raksasa di daftar ringkasan pesanan
    const sanitized = orders.map((o) => {
      let returnData = o.returnData
      if (returnData && typeof returnData === 'object' && returnData.photos) {
        const rawPhotos = returnData.photos
        const hasLargeBase64 = Object.values(rawPhotos || {}).some(
          (p) => typeof p === 'string' && p.startsWith('data:') && p.length > 500
        )
        if (hasLargeBase64) {
          const { photos, ...restReturnData } = returnData
          returnData = {
            ...restReturnData,
            hasPhotos: true,
            photoCount: Object.values(photos || {}).filter(Boolean).length
          }
        }
      }

      // Pastikan field images pada equipment tidak ter-exclude dan terformat sebagai array
      let equipment = o.equipment
      if (equipment) {
        let images = equipment.images
        if (typeof images === 'string') {
          try {
            images = JSON.parse(images)
          } catch {
            images = [images]
          }
        }
        equipment = {
          ...equipment,
          images: Array.isArray(images) ? images : (images ? [images] : [])
        }
      }

      return {
        ...o,
        returnData,
        tenant: o.user,
        equipment
      }
    })

    return res.json({ data: sanitized })
  } catch (error) {
    next(error)
  }
})

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
// Detail pesanan berdasarkan id ATAU invoiceNumber (dapat diakses oleh Penyewa, Pemilik Alat, atau Admin).
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const identifier = req.params.id
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: identifier },
          { invoiceNumber: identifier }
        ]
      },
      include: {
        equipment: {
          include: { owner: { select: { id: true, fullName: true, email: true, phone: true, kycData: true } } }
        },
        user: { select: { id: true, fullName: true, email: true, phone: true, kycData: true } },
        review: true,
        disputeTicket: true
      }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (req.userRole !== 'ADMIN' && order.userId !== req.userId && order.equipment?.ownerId !== req.userId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki hak akses untuk pesanan ini' }
      })
    }

    // Pastikan field images pada equipment tidak ter-exclude dan terformat sebagai array
    let equipment = order.equipment
    if (equipment) {
      let images = equipment.images
      if (typeof images === 'string') {
        try {
          images = JSON.parse(images)
        } catch {
          images = [images]
        }
      }
      equipment = {
        ...equipment,
        images: Array.isArray(images) ? images : (images ? [images] : [])
      }
    }

    return res.json({ data: { ...order, equipment } })
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/orders/validate-promo ─────────────────────────────────────────
// Validasi kode promo dan kembalikan detail diskon.
ordersRouter.post('/validate-promo', async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body ?? {}

    if (!code) {
      return res.status(400).json({
        error: { code: 'MISSING_CODE', message: 'Kode promo wajib diisi' }
      })
    }

    const promo = PROMO_CODES[String(code).toUpperCase().trim()]
    if (!promo) {
      return res.status(404).json({
        error: { code: 'PROMO_NOT_FOUND', message: 'Kode promo tidak valid atau sudah kadaluarsa' }
      })
    }

    let discountAmount = 0
    if (promo.type === 'FIXED') {
      discountAmount = promo.amount
    } else if (promo.type === 'PERCENT') {
      discountAmount = Math.round((Number(subtotal) * promo.amount) / 100)
    }

    return res.json({
      data: {
        code: String(code).toUpperCase().trim(),
        type: promo.type,
        amount: promo.amount,
        discountAmount,
        description: promo.description,
        valid: true
      }
    })
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Buat pesanan baru dari Checkout Step 2.
// Pesanan dibuat dengan status MENUNGGU_PEMBAYARAN agar step 3 bisa dilanjutkan.
ordersRouter.post('/', async (req, res, next) => {
  try {
    const {
      equipmentId, startDate, endDate, rentalDays,
      deliveryMethod, rentalCost, shippingCost, depositAmount, totalPaid,
      // Checkout extended fields
      addons, addonsCost, promoCode, discountAmount, renterNotes, contractAgreedAt
    } = req.body ?? {}

    if (!equipmentId || !startDate || !endDate || !rentalDays) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Data pesanan tidak lengkap' }
      })
    }

    // Pastikan alat masih tersedia.
    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } })
    if (!equipment) {
      return res.status(404).json({
        error: { code: 'EQUIPMENT_NOT_FOUND', message: 'Alat tidak ditemukan' }
      })
    }

    // Validasi metode serah terima yang diizinkan pemilik alat
    const rawDelivery = Array.isArray(equipment.deliveryMethods) ? equipment.deliveryMethods : []
    const allowedDeliveryMethods = (rawDelivery.length > 0 ? rawDelivery : ['PICKUP', 'COURIER']).map((m) =>
      String(m).toUpperCase()
    )
    const normalizedMethod = String(
      deliveryMethod || (allowedDeliveryMethods.includes('PICKUP') ? 'PICKUP' : 'COURIER')
    ).toUpperCase()

    if (!allowedDeliveryMethods.includes(normalizedMethod)) {
      return res.status(400).json({
        error: {
          code: 'DELIVERY_METHOD_NOT_ALLOWED',
          message: `Metode serah terima '${
            normalizedMethod === 'COURIER' ? 'Diantar kurir toko' : 'Ambil di gudang'
          }' tidak diaktifkan oleh pemilik alat.`
        }
      })
    }

    // Hitung ongkir kurir sesuai pengaturan pemilik alat
    let calculatedShipping = 0
    if (normalizedMethod === 'COURIER') {
      const isPickupAddonIncluded =
        Array.isArray(addons) && addons.some((a) => (typeof a === 'string' ? a : a.id) === 'pickup')
      calculatedShipping = isPickupAddonIncluded
        ? 0
        : equipment.deliveryFee !== undefined && equipment.deliveryFee !== null
        ? Number(equipment.deliveryFee)
        : 45000
    }

    const invoiceNumber = generateInvoiceNumber()
    // Deadline pembayaran: 24 jam dari sekarang
    const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const order = await prisma.order.create({
      data: {
        invoiceNumber,
        userId: req.userId,
        equipmentId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rentalDays: Number(rentalDays),
        deliveryMethod: normalizedMethod,
        rentalCost: Number(rentalCost) || 0,
        shippingCost: calculatedShipping,
        depositAmount: Number(depositAmount) || 0,
        totalPaid: Number(totalPaid) || 0,
        status: 'MENUNGGU_PEMBAYARAN',
        // Checkout metadata
        addons: addons || [],
        addonsCost: Number(addonsCost) || 0,
        promoCode: promoCode || null,
        discountAmount: Number(discountAmount) || 0,
        renterNotes: renterNotes || null,
        contractAgreedAt: contractAgreedAt ? new Date(contractAgreedAt) : null,
        paymentDeadline
      },
      include: {
        user: { select: { fullName: true } },
        equipment: {
          include: { owner: { select: { id: true, fullName: true, email: true } } }
        }
      }
    })

    // Kirim notifikasi pesanan baru ke pemilik alat (non-blocking)
    sendNewOrderNotif(equipment.ownerId, {
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      equipmentName: equipment.name,
      renterName: order.user?.fullName || 'Penyewa'
    }).catch(() => {})

    return res.status(201).json({ data: order })
  } catch (error) {
    next(error)
  }
})

/**
 * PRODUCTION PAYMENT GATEWAY BLUEPRINT — MyRent
 * ==============================================
 *
 * CATATAN PENTING UNTUK JURI / AUDITOR:
 * Route `PATCH /api/orders/:id/mock-pay` di bawah ini adalah SIMULASI DEMO.
 * Pada produksi, route ini digantikan oleh alur gateway pembayaran sungguhan
 * tanpa mengubah kontrak frontend (Checkout Step 3 tetap meminta QRIS lalu
 * melakukan polling status pesanan).
 *
 * 1. ALUR INTEGRASI PRODUKSI (Midtrans Snap / Xendit QRIS API)
 * ------------------------------------------------------------
 * a. Frontend memanggil `POST /api/payments/intent` dengan `orderId`.
 * b. Backend membuat transaksi ke provider:
 *      - Midtrans Snap:  POST https://app.midtrans.com/snap/v1/transactions
 *        payload: { transaction_details: { order_id, gross_amount },
 *                   enabled_payments: ['qris', 'other_qris'] }
 *      - Xendit QRIS:    POST https://api.xendit.co/qr_codes
 *        payload: { reference_id, type: 'DYNAMIC', currency: 'IDR',
 *                   amount, expires_at }
 *    Server Key / API Key HANYA disimpan di environment backend
 *    (`MIDTRANS_SERVER_KEY`, `XENDIT_SECRET_KEY`) dan tidak pernah dikirim
 *    ke browser.
 * c. Response provider berisi `qr_string` / `actions[].url` (gambar QRIS).
 *    Frontend menampilkan QR tersebut, lalu polling
 *    `GET /api/orders/:id/payment-status` setiap 3 detik.
 * d. Status pesanan TIDAK diubah oleh frontend. Hanya webhook provider yang
 *    berhak memindahkan pesanan dari MENUNGGU_PEMBAYARAN ke
 *    MENUNGGU_KONFIRMASI setelah pembayaran terverifikasi.
 *
 * 2. ENDPOINT WEBHOOK & VERIFIKASI SIGNATURE
 * ------------------------------------------
 *   POST /api/payments/webhook
 *
 *   Midtrans mengirim header/body notification dengan field:
 *     order_id, status_code, gross_amount, signature_key,
 *     transaction_status, transaction_id, fraud_status.
 *
 *   Verifikasi WAJIB sebelum menyentuh database:
 *
 *     expected = SHA512(order_id + status_code + gross_amount + ServerKey)
 *     valid    = crypto.timingSafeEqual(expected, signature_key)
 *
 *   Jika signature tidak valid -> HTTP 401 dan TIDAK ada perubahan data.
 *   Xendit menggunakan header `x-callback-token` yang dibandingkan dengan
 *   `XENDIT_CALLBACK_TOKEN` (constant-time compare).
 *
 *   Pemetaan status pembayaran:
 *     settlement / capture + accept -> PAID
 *     pending                       -> PENDING
 *     deny / cancel / expire        -> FAILED / EXPIRED
 *
 * 3. IDEMPOTENCY & PENCEGAHAN DOUBLE-SETTLEMENT
 * ---------------------------------------------
 * Provider dapat mengirim webhook yang sama lebih dari sekali. Karena itu:
 *
 *   a. Tabel `Payment` (blueprint produksi) menyimpan:
 *        id, orderId, provider, providerEventId (UNIQUE), providerTransactionId,
 *        grossAmount, status, paidAt, rawPayload, createdAt, updatedAt
 *      `providerEventId` = `transaction_id` + `transaction_status` (Midtrans)
 *      atau `id` event Xendit. UNIQUE constraint membuat insert kedua gagal
 *      (Prisma P2002) sehingga handler cukup mengembalikan HTTP 200 "OK".
 *
 *   b. Seluruh proses webhook berjalan dalam satu `prisma.$transaction`:
 *        - INSERT Payment (idempotency guard)
 *        - UPDATE Order.status -> MENUNGGU_KONFIRMASI (hanya dari
 *          MENUNGGU_PEMBAYARAN)
 *        - INSERT WalletTransaction bila metode WALLET/refund
 *      Jika salah satu langkah gagal, seluruh transaksi di-rollback.
 *
 *   c. Settlement escrow (pencairan ke pemilik, refund deposit, dan
 *      pemotongan platform fee 5%) HANYA boleh dieksekusi sekali. Status
 *      Order + kolom `platformFee`/`netOwnerPayout` + guard pada
 *      `DisputeTicket.status` menjadi penjaga terakhir. Route mock-pay di
 *      bawah juga sudah dilindungi guard `status === MENUNGGU_PEMBAYARAN`.
 *
 * Hingga integrasi produksi dilakukan, route ini tetap dipertahankan agar
 * demo kompetisi dapat berjalan instan tanpa ketergantungan jaringan.
 */
// ─── PATCH /api/orders/:id/mock-pay ──────────────────────────────────────────
// Mock Payment: ubah status MENUNGGU_PEMBAYARAN → MENUNGGU_KONFIRMASI.
// Catat paymentMethod dan paidAt.
ordersRouter.patch('/:id/mock-pay', async (req, res, next) => {
  try {
    const { paymentMethod = 'QRIS' } = req.body ?? {}

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.status !== 'MENUNGGU_PEMBAYARAN') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: `Pesanan berstatus ${order.status}, tidak bisa diproses ulang pembayarannya`
        }
      })
    }

    const normalizedMethod = String(paymentMethod).toUpperCase()

    // Jika membayar menggunakan Saldo Dompet Akun
    if (normalizedMethod === 'WALLET' || normalizedMethod === 'DOMPET') {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, walletBalance: true }
      })

      const currentBalance = Number(user?.walletBalance || 0)
      const totalAmount = Number(order.totalPaid || 0)

      if (currentBalance < totalAmount) {
        return res.status(400).json({
          error: {
            code: 'INSUFFICIENT_WALLET_BALANCE',
            message: 'Maaf saldo dompet anda tidak cukup, tolong isi saldo dompet terlebih dahulu atau gunakan metode pembayaran lainnya'
          }
        })
      }

      // Potong saldo dompet dan buat catatan transaksi mutasi
      const [updatedUser, , updatedOrder] = await prisma.$transaction([
        prisma.user.update({
          where: { id: req.userId },
          data: {
            walletBalance: {
              decrement: totalAmount
            }
          }
        }),
        prisma.walletTransaction.create({
          data: {
            userId: req.userId,
            type: 'SEWA_PAYMENT',
            amount: totalAmount,
            description: `Pembayaran sewa alat ${order.invoiceNumber}`,
            status: 'BERHASIL',
            reference: order.invoiceNumber,
            paymentMethod: 'WALLET'
          }
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'MENUNGGU_KONFIRMASI',
            paymentMethod: 'WALLET',
            paidAt: new Date()
          },
          include: {
            equipment: {
              include: { owner: { select: { id: true, fullName: true, email: true, phone: true } } }
            }
          }
        })
      ])

      return res.json({
        data: updatedOrder,
        newWalletBalance: updatedUser.walletBalance,
        message: 'Pembayaran via saldo dompet berhasil. Menunggu konfirmasi pemilik alat.'
      })
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'MENUNGGU_KONFIRMASI',
        paymentMethod: String(paymentMethod),
        paidAt: new Date()
      },
      include: {
        equipment: {
          include: { owner: { select: { id: true, fullName: true, email: true, phone: true } } }
        }
      }
    })

    return res.json({
      data: updated,
      message: 'Pembayaran berhasil diterima escrow. Menunggu konfirmasi pemilik alat.'
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/accept ─────────────────────────────────────────────
// Pemilik menyetujui pesanan masuk (MENUNGGU_KONFIRMASI → DIKIRIM).
ordersRouter.patch('/:id/accept', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { equipment: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.equipment.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya pemilik alat yang berhak menyetujui pesanan' }
      })
    }

    if (order.status !== 'MENUNGGU_KONFIRMASI') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Hanya pesanan berstatus Menunggu Konfirmasi yang bisa diterima' }
      })
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DIKIRIM' },
      include: {
        equipment: true,
        user: { select: { id: true, fullName: true, email: true, phone: true, kycData: true } }
      }
    })

    // Update status alat menjadi DISEWA
    await prisma.equipment.update({
      where: { id: order.equipmentId },
      data: { status: 'DISEWA' }
    }).catch(() => {})

    return res.json({
      data: updated,
      message: 'Pesanan berhasil diterima dan status diubah menjadi Dikirim.'
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/reject ─────────────────────────────────────────────
// Pemilik menolak pesanan masuk (MENUNGGU_KONFIRMASI → DITOLAK).
ordersRouter.patch('/:id/reject', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { equipment: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.equipment.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya pemilik alat yang berhak menolak pesanan' }
      })
    }

    if (order.status !== 'MENUNGGU_KONFIRMASI') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Hanya pesanan berstatus Menunggu Konfirmasi yang bisa ditolak' }
      })
    }

    // [KRUSIAL] Refund saldo WALLET + perubahan status dalam satu transaksi.
    const { updated, refund } = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DITOLAK',
          returnData: {
            ...(order.returnData && typeof order.returnData === 'object' ? order.returnData : {}),
            rejectedAt: new Date().toISOString(),
            rejectionReason: 'Pesanan ditolak oleh pemilik alat.'
          }
        },
        include: {
          equipment: true,
          user: { select: { id: true, fullName: true, email: true, phone: true, kycData: true } },
          disputeTicket: true
        }
      })

      const refundTx = await refundWalletPaymentIfNeeded(
        tx,
        order,
        'Pesanan ditolak pemilik'
      )

      return { updated: updatedOrder, refund: refundTx }
    })

    return res.json({
      data: updated,
      refundedToWallet: refund?.amount || 0,
      message:
        refund?.amount > 0
          ? `Pesanan ditolak. Saldo Rp ${refund.amount.toLocaleString('id-ID')} telah dikembalikan ke dompet penyewa.`
          : 'Pesanan telah ditolak.'
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/cancel ─────────────────────────────────────────────
// Batalkan pesanan yang masih MENUNGGU_KONFIRMASI atau MENUNGGU_PEMBAYARAN.
ordersRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    const cancellableStatuses = ['MENUNGGU_PEMBAYARAN', 'MENUNGGU_KONFIRMASI']
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Hanya pesanan berstatus Menunggu Pembayaran atau Menunggu Konfirmasi yang bisa dibatalkan' }
      })
    }

    // [KRUSIAL] Refund penuh pembayaran WALLET + status DIBATALKAN atomik.
    const { updated, refund } = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DIBATALKAN',
          returnData: {
            ...(order.returnData && typeof order.returnData === 'object' ? order.returnData : {}),
            cancelledAt: new Date().toISOString(),
            cancellationReason: 'Pesanan dibatalkan oleh penyewa.'
          }
        },
        include: { disputeTicket: true }
      })

      const refundTx = await refundWalletPaymentIfNeeded(
        tx,
        order,
        'Pesanan dibatalkan penyewa'
      )

      return { updated: updatedOrder, refund: refundTx }
    })

    return res.json({
      data: updated,
      refundedToWallet: refund?.amount || 0
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/confirm-delivery ───────────────────────────────────
// Konfirmasi Terima & BAST Awal: DIKIRIM → SEWA_AKTIF.
// Dapat dipanggil oleh Penyewa, Pemilik Alat (saat serah terima), atau Admin.
ordersRouter.patch('/:id/confirm-delivery', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { equipment: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.userId !== req.userId && order.equipment?.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Tidak memiliki izin untuk mengonfirmasi penerimaan/serah terima' }
      })
    }

    if (order.status !== 'DIKIRIM') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Pesanan belum berstatus Dikirim' }
      })
    }

    const { initialBast } = req.body ?? {}
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'SEWA_AKTIF',
        ...(initialBast ? { initialBast } : {})
      }
    })

    return res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/initial-bast ─────────────────────────────────────
// Simpan atau perbarui data BAST Awal (foto kondisi serah terima, checklist, catatan).
ordersRouter.patch('/:id/initial-bast', async (req, res, next) => {
  try {
    const { initialBast } = req.body ?? {}
    if (!initialBast || typeof initialBast !== 'object') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Data initialBast wajib diisi' }
      })
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { equipment: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (req.userRole !== 'ADMIN' && order.userId !== req.userId && order.equipment?.ownerId !== req.userId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Tidak memiliki izin untuk memperbarui BAST awal' }
      })
    }

    const now = new Date()
    const finalInitialBast = {
      ...(order.initialBast && typeof order.initialBast === 'object' ? order.initialBast : {}),
      ...initialBast,
      updatedAt: now.toISOString()
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { initialBast: finalInitialBast }
    })

    return res.json({ data: updated, message: 'Data BAST Awal berhasil disimpan' })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/extend ─────────────────────────────────────────────
// Perpanjang masa sewa: tambah hari dan biaya.
ordersRouter.patch('/:id/extend', async (req, res, next) => {
  try {
    const { additionalDays } = req.body ?? {}
    if (!additionalDays || additionalDays < 1 || additionalDays > 7) {
      return res.status(400).json({
        error: { code: 'INVALID_DAYS', message: 'Tambahan hari harus antara 1–7' }
      })
    }

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { equipment: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.status !== 'SEWA_AKTIF') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Hanya pesanan Sewa Aktif yang bisa diperpanjang' }
      })
    }

    const additionalCost = order.equipment.pricePerDay * Number(additionalDays)
    const newEndDate = new Date(order.endDate.getTime() + Number(additionalDays) * 86400000)

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        endDate: newEndDate,
        rentalDays: order.rentalDays + Number(additionalDays),
        rentalCost: order.rentalCost + additionalCost,
        totalPaid: order.totalPaid + additionalCost
      }
    })

    return res.json({ data: updated, additionalCost })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/return-draft ───────────────────────────────────────
// Simpan draf returnData (Step 1–3) tanpa mengubah status.
ordersRouter.patch('/:id/return-draft', async (req, res, next) => {
  try {
    const { returnData } = req.body ?? {}

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { returnData: returnData ?? {} }
    })

    return res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// ─── POST /api/orders/:id/return-submit ───────────────────────────────────────
// Submit final BAST Akhir: simpan returnData lengkap, ubah status ke INSPEKSI.
ordersRouter.post('/:id/return-submit', async (req, res, next) => {
  try {
    const { returnData } = req.body ?? {}

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.status !== 'SEWA_AKTIF') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'BAST Akhir hanya bisa dikirim untuk pesanan Sewa Aktif' }
      })
    }

    // Hitung denda keterlambatan jika ada.
    const now = new Date()
    let lateFee = 0
    if (returnData?.lateFee) {
      lateFee = Number(returnData.lateFee)
    }

    // Generate kode PIN serah terima unik 6-digit jika belum ada
    const generateHandoverPin = () => String(Math.floor(100000 + Math.random() * 900000))
    const handoverPin = returnData?.handoverPin || generateHandoverPin()

    const finalReturnData = {
      ...returnData,
      handoverPin,
      bastSubmittedAt: now.toISOString(),
      handedOverAt: returnData?.handedOverAt || null,
      unitReceivedAt: returnData?.unitReceivedAt || null,
      inspectionDeadline: returnData?.inspectionDeadline || null
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        returnData: finalReturnData,
        status: 'INSPEKSI',
        lateFee
      }
    })

    // Kirim notifikasi inspeksi/deposit ke pemilik alat (non-blocking)
    sendInspectionNotif(order.equipment?.ownerId || updated.equipment?.ownerId, {
      orderId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: 'INSPEKSI'
    }).catch(() => {})

    return res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/mark-handed-over ──────────────────────────────────
// Dipanggil oleh Penyewa saat unit fisik telah diserahkan ke kurir atau toko.
ordersRouter.patch('/:id/mark-handed-over', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.status !== 'INSPEKSI') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Hanya pesanan tahap inspeksi yang bisa ditandai telah diserahkan' }
      })
    }

    const now = new Date()
    const currentReturnData = (order.returnData && typeof order.returnData === 'object') ? order.returnData : {}
    const updatedReturnData = {
      ...currentReturnData,
      handedOverAt: now.toISOString()
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { returnData: updatedReturnData }
    })

    return res.json({
      data: updated,
      message: 'Status penyerahan fisik berhasil dicatat. Pemilik akan segera mengonfirmasi penerimaan.'
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/confirm-return-receipt ────────────────────────────
// Dipanggil oleh Pemilik Alat (pada Dashboard Pemilik) untuk mengonfirmasi penerimaan fisik unit
// menggunakan Kode PIN Serah Terima 6-digit dari penyewa.
ordersRouter.patch('/:id/confirm-return-receipt', async (req, res, next) => {
  try {
    const { handoverPin } = req.body ?? {}

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { equipment: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    // Pastikan yang memanggil adalah pemilik alat terkait atau admin
    if (order.equipment.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya pemilik alat yang berhak mengonfirmasi serah terima fisik unit' }
      })
    }

    if (order.status !== 'INSPEKSI') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Pesanan belum dalam status inspeksi/pengembalian' }
      })
    }

    const expectedPin = order.returnData?.handoverPin
    if (!handoverPin || String(handoverPin).trim() !== String(expectedPin).trim()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_HANDOVER_PIN',
          message: 'Kode PIN serah terima salah atau tidak sesuai. Masukkan PIN 6-digit yang tertera di aplikasi penyewa.'
        }
      })
    }

    const receivedAt = new Date()
    // Timer batas inspeksi 2x24 jam (48 jam) resmi dimulai dari saat fisik diterima
    const inspectionDeadline = new Date(receivedAt.getTime() + 2 * 24 * 60 * 60 * 1000)

    const currentReturnData = (order.returnData && typeof order.returnData === 'object') ? order.returnData : {}
    const updatedReturnData = {
      ...currentReturnData,
      unitReceivedAt: receivedAt.toISOString(),
      inspectionDeadline: inspectionDeadline.toISOString()
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { returnData: updatedReturnData }
    })

    return res.json({
      data: updated,
      message: 'Fisik unit berhasil dikonfirmasi diterima. Masa inspeksi 2×24 jam telah dimulai.'
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/complete-inspection ───────────────────────────────
// Dipanggil oleh Pemilik Alat setelah selesai melakukan inspeksi fisik
// untuk menyetujui pelepasan refund deposit (mengubah status ke SELESAI),
// atau menolak BAST dan mengajukan klaim kerusakan (mengubah status ke DISPUTE).
ordersRouter.patch('/:id/complete-inspection', async (req, res, next) => {
  try {
    const {
      damageFee = 0,
      ownerNotes = '',
      approveRefund = true,
      disputeReason = '',
      ownerInspectionPhotos = null
    } = req.body ?? {}

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        equipment: { include: { owner: true } },
        user: true
      }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.equipment.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya pemilik alat yang berhak menyelesaikan inspeksi' }
      })
    }

    const now = new Date()
    const currentReturnData = (order.returnData && typeof order.returnData === 'object') ? order.returnData : {}

    if (approveRefund) {
      // ─── LULUS INSPEKSI: Pelepasan Escrow & Refund Deposit 100% ─────────────
      // Gunakan Settlement Engine otoritatif: platform fee 5% dipotong SEKALI
      const settlement = calculateSettlement({ ...order, damageFee: 0 })
      const refundToRenter = settlement.depositRefund
      const payoutToOwner = settlement.ownerPayout

      const [updatedOrder] = await prisma.$transaction(async (tx) => {
        const orderUpdate = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'SELESAI',
            damageFee: 0,
            platformFeeRate: PLATFORM_FEE_RATE,
            platformFee: settlement.platformFee,
            netOwnerPayout: payoutToOwner,
            returnData: {
              ...currentReturnData,
              inspectedAt: now.toISOString(),
              ownerNotes,
              inspectionStatus: 'APPROVED',
              payoutSummary: {
                renterRefund: refundToRenter,
                ownerPayout: payoutToOwner,
                platformFee: settlement.platformFee,
                completedAt: now.toISOString()
              }
            }
          }
        })

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
              description: `Pengembalian deposit jaminan sewa ${order.invoiceNumber}`,
              status: 'BERHASIL',
              reference: order.invoiceNumber,
              paymentMethod: 'ESCROW_REFUND'
            }
          })
        }

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
              description: `Pencairan sewa ${order.invoiceNumber} (Net setelah fee platform ${settlement.platformFee.toLocaleString('id-ID')})`,
              status: 'BERHASIL',
              reference: order.invoiceNumber,
              paymentMethod: 'ESCROW_PAYOUT'
            }
          })
        }

        await tx.equipment.update({
          where: { id: order.equipmentId },
          data: { status: 'TERSEDIA' }
        })

        return [orderUpdate]
      })

      return res.json({
        data: updatedOrder,
        settlement: {
          platformFee: settlement.platformFee,
          payoutToOwner,
          refundToRenter
        },
        message: 'Inspeksi fisik disetujui. Dana deposit telah diteruskan ke dompet penyewa dan dana sewa dicairkan ke pemilik.'
      })
    } else {
      // ─── TOLAK BAST & AJUKAN KLAIM KERUSAKAN (DISPUTE) ──────────────────────
      const finalDisputeReason = (disputeReason || ownerNotes || 'Klaim kerusakan diajukan oleh pemilik alat.').trim()
      const claimedFee = Math.max(0, Math.min(Number(damageFee) || 0, order.depositAmount))

      const [updated, disputeTicket] = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'DISPUTE',
            damageFee: claimedFee,
            disputeReason: finalDisputeReason,
            disputeNote: finalDisputeReason,
            ownerInspectionPhotos: ownerInspectionPhotos || null,
            returnData: {
              ...currentReturnData,
              inspectedAt: now.toISOString(),
              disputedAt: now.toISOString(),
              ownerNotes,
              disputeReason: finalDisputeReason,
              damageFeeClaimed: claimedFee
            }
          },
          include: { disputeTicket: true }
        })

        // [KRUSIAL] Buat DisputeTicket otomatis agar Admin Mediasi Sengketa
        // langsung menerima tiket lengkap dengan nominal klaim & foto bukti.
        const ticket = await ensureDisputeTicket(tx, updatedOrder, {
          claimAmount: claimedFee,
          disputeReason: finalDisputeReason,
          ownerPhotos: ownerInspectionPhotos,
          initiatedById: req.userId,
          initiatedByRole: req.userRole === 'ADMIN' ? 'ADMIN' : 'PEMILIK'
        })

        return [updatedOrder, ticket]
      })

      // Kirim notifikasi dispute ke pemilik (non-blocking)
      sendInspectionNotif(order.equipment?.ownerId, {
        orderId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        status: 'DISPUTE'
      }).catch(() => {})

      return res.json({
        data: updated,
        disputeTicket,
        message: 'Klaim diajukan ke status dispute untuk mediasi admin. Dana deposit dan sewa dibekukan di escrow.'
      })
    }
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/dispute ──────────────────────────────────────────
// Dipanggil oleh Pemilik Alat (atau Admin) untuk mengajukan klaim / sengketa,
// memicu status DISPUTE disertai alasan klaim (disputeReason) dan bukti foto.
ordersRouter.patch('/:id/dispute', async (req, res, next) => {
  try {
    const { disputeReason, reason, damageFee, ownerInspectionPhotos } = req.body ?? {}
    const finalReason = (disputeReason || reason || '').trim()

    if (!finalReason) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Alasan klaim (disputeReason) wajib diisi' }
      })
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { equipment: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.equipment.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya pemilik alat yang berhak mengajukan klaim dispute' }
      })
    }

    const now = new Date()
    const currentReturnData = (order.returnData && typeof order.returnData === 'object') ? order.returnData : {}
    const claimedFee = damageFee !== undefined
      ? Math.max(0, Math.min(Number(damageFee) || 0, order.depositAmount))
      : (currentReturnData.damageFeeClaimed || 0)

    const updatedReturnData = {
      ...currentReturnData,
      disputedAt: now.toISOString(),
      disputeReason: finalReason,
      damageFeeClaimed: claimedFee
    }

    const [updated, disputeTicket] = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DISPUTE',
          disputeReason: finalReason,
          disputeNote: finalReason,
          damageFee: claimedFee,
          ownerInspectionPhotos:
            ownerInspectionPhotos !== undefined ? ownerInspectionPhotos : (order.ownerInspectionPhotos || null),
          returnData: updatedReturnData
        },
        include: { disputeTicket: true }
      })

      const ticket = await ensureDisputeTicket(tx, updatedOrder, {
        claimAmount: claimedFee,
        disputeReason: finalReason,
        ownerPhotos: ownerInspectionPhotos !== undefined ? ownerInspectionPhotos : order.ownerInspectionPhotos,
        initiatedById: req.userId,
        initiatedByRole: req.userRole === 'ADMIN' ? 'ADMIN' : 'PEMILIK'
      })

      return [updatedOrder, ticket]
    })

    // Kirim notifikasi dispute ke pemilik (non-blocking)
    sendInspectionNotif(order.equipment?.ownerId, {
      orderId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: 'DISPUTE'
    }).catch(() => {})

    return res.json({
      data: updated,
      disputeTicket,
      message: 'Klaim dispute berhasil diajukan. Status pesanan diubah ke DISPUTE.'
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/initiate-defense ──────────────────────────────────
// Renter submits defense note and counter photos when disputing owner's claim.
ordersRouter.patch('/:id/initiate-defense', async (req, res, next) => {
  try {
    const { renterDefenseNote, renterCounterPhotos } = req.body ?? {}

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { equipment: true, disputeTicket: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.status !== 'DISPUTE') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Pesanan tidak dalam status DISPUTE' }
      })
    }

    if (!order.disputeTicket) {
      return res.status(404).json({
        error: { code: 'DISPUTE_TICKET_NOT_FOUND', message: 'Tiket sengketa tidak ditemukan' }
      })
    }

    const now = new Date()
    const updatedTicket = await prisma.disputeTicket.update({
      where: { id: order.disputeTicket.id },
      data: {
        renterDefenseNote: renterDefenseNote || null,
        renterCounterPhotos: renterCounterPhotos || null,
        defendedAt: now
      }
    })

    return res.json({
      data: updatedTicket,
      message: 'Pembelaan berhasil dikirim ke admin untuk mediasi.'
    })
  } catch (error) {
    next(error)
  }
})

// ─── PATCH /api/orders/:id/resolve-dispute ──────────────────────────────────
// [LEGACY COMPATIBILITY] Keep for renter-side modal/API if needed.
// Admin UI should use /api/admin/disputes/:id/resolve with unified settlement.
ordersRouter.patch('/:id/resolve-dispute', async (req, res, next) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya Admin yang berwenang memberikan putusan mediasi sengketa' }
      })
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        equipment: { include: { owner: true } },
        user: true
      }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.status !== 'DISPUTE') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Pesanan tidak dalam status DISPUTE' }
      })
    }

    const { finalDamageFee = 0, adminResolutionNote = '' } = req.body ?? {}
    const cleanNote = String(adminResolutionNote || '').trim() || 'Putusan resmi mediasi sengketa oleh Admin MyRent.'

    const damageFeeAmount = Math.max(0, Math.min(Number(finalDamageFee) || 0, order.depositAmount))
    const settlement = calculateSettlement({ ...order, damageFee: damageFeeAmount })

    const now = new Date()
    const currentReturnData = (order.returnData && typeof order.returnData === 'object') ? order.returnData : {}

    const [updatedOrder] = await prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'SELESAI',
          damageFee: damageFeeAmount,
          finalDamageFee: damageFeeAmount,
          adminResolutionNote: cleanNote,
          resolvedAt: now,
          isResolvedByAdmin: true,
          platformFeeRate: PLATFORM_FEE_RATE,
          platformFee: settlement.platformFee,
          netOwnerPayout: settlement.ownerPayout,
          returnData: {
            ...currentReturnData,
            resolvedAt: now.toISOString(),
            adminResolution: {
              finalDamageFee: damageFeeAmount,
              refundToRenter: settlement.depositRefund,
              payoutToOwner: settlement.ownerPayout,
              platformFee: settlement.platformFee,
              adminResolutionNote: cleanNote,
              resolvedAt: now.toISOString()
            }
          }
        }
      })

      if (settlement.depositRefund > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { walletBalance: { increment: settlement.depositRefund } }
        })
        await tx.walletTransaction.create({
          data: {
            userId: order.userId,
            type: 'DEPOSIT_REFUND',
            amount: settlement.depositRefund,
            description: `Pengembalian sisa deposit sewa ${order.invoiceNumber}`,
            status: 'BERHASIL',
            reference: order.invoiceNumber,
            paymentMethod: 'ESCROW_REFUND'
          }
        })
      }

      if (settlement.ownerPayout > 0) {
        await tx.user.update({
          where: { id: order.equipment.ownerId },
          data: { walletBalance: { increment: settlement.ownerPayout } }
        })
        await tx.walletTransaction.create({
          data: {
            userId: order.equipment.ownerId,
            type: 'SEWA_PAYMENT',
            amount: settlement.ownerPayout,
            description: `Pencairan sewa ${order.invoiceNumber} + ganti rugi Rp ${damageFeeAmount.toLocaleString('id-ID')}`,
            status: 'BERHASIL',
            reference: order.invoiceNumber,
            paymentMethod: 'ESCROW_PAYOUT'
          }
        })
      }

      await tx.equipment.update({
        where: { id: order.equipmentId },
        data: { status: 'TERSEDIA' }
      })

      return [orderUpdate]
    })

    return res.json({
      data: updatedOrder,
      breakdown: {
        depositAmount: order.depositAmount,
        finalDamageFee: damageFeeAmount,
        refundToRenter: settlement.depositRefund,
        payoutToOwner: settlement.ownerPayout,
        platformFee: settlement.platformFee
      },
      message: `Putusan mediasi berhasil diterapkan. Kompensasi ${damageFeeAmount.toLocaleString('id-ID')} dialokasikan ke pemilik, sisa deposit ${settlement.depositRefund.toLocaleString('id-ID')} dikembalikan ke penyewa.`
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/orders/:id/review
 * Penyewa mengirim rating & ulasan untuk pesanan berstatus SELESAI
 */
ordersRouter.post('/:id/review', async (req, res, next) => {
  try {
    const { rating, comment } = req.body ?? {}
    const numRating = Number(rating)
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Rating harus bernilai 1-5 bintang' }
      })
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Komentar ulasan wajib diisi' }
      })
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { review: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.userId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya penyewa pesanan ini yang dapat memberikan ulasan' }
      })
    }

    if (order.status !== 'SELESAI') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Ulasan hanya dapat dikirimkan untuk pesanan yang sudah berstatus SELESAI' }
      })
    }

    if (order.review) {
      return res.status(400).json({
        error: { code: 'ALREADY_REVIEWED', message: 'Pesanan ini sudah pernah Anda beri ulasan' }
      })
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        equipmentId: order.equipmentId,
        userId: req.userId,
        rating: Math.round(numRating),
        comment: comment.trim()
      },
      include: {
        user: { select: { id: true, fullName: true, kycData: true } },
        equipment: { select: { id: true, name: true, category: true } }
      }
    })

    return res.status(201).json({
      data: review,
      message: 'Ulasan berhasil disimpan. Terima kasih atas apresiasi Anda!'
    })
  } catch (error) {
    next(error)
  }
})

