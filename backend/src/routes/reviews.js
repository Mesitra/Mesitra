import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'

export const reviewsRouter = Router()

/**
 * Middleware autentikasi opsional untuk GET /api/reviews
 */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret)
      req.userId = decoded.userId
      req.userRole = String(decoded.role || '').toUpperCase()
    } catch {
      // Token tidak valid diabaikan untuk endpoint publik
    }
  }
  next()
}

/**
 * Middleware autentikasi wajib untuk POST review
 */
function requireAuth(req, res, next) {
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
    next()
  } catch {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
    })
  }
}

/**
 * GET /api/reviews/owner
 * Mengambil daftar ulasan toko milik owner dengan pagination server-side.
 * Parameter query opsional:
 * - page  : nomor halaman (default: 1)
 * - limit : ulasan per halaman (default: 10)
 * - rating: filter nilai bintang (1-5)
 */
reviewsRouter.get('/owner', optionalAuth, async (req, res, next) => {
  try {
    const ownerId = req.userId || req.query.ownerId
    if (!ownerId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token tidak disertakan atau user tidak teridentifikasi' }
      })
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10)
    const skip = (page - 1) * limit
    const take = limit

    const where = {
      equipment: {
        ownerId: String(ownerId)
      }
    }

    if (req.query.rating && !isNaN(Number(req.query.rating))) {
      where.rating = Number(req.query.rating)
    }

    const [total, reviews, allOwnerReviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              kycData: true
            }
          },
          equipment: {
            select: {
              id: true,
              name: true,
              category: true,
              images: true,
              ownerId: true
            }
          },
          order: {
            select: {
              id: true,
              invoiceNumber: true,
              startDate: true,
              endDate: true,
              rentalDays: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.review.findMany({
        where: { equipment: { ownerId: String(ownerId) } },
        select: { rating: true }
      })
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let sumRating = 0

    for (const r of allOwnerReviews) {
      const star = Math.min(Math.max(Number(r.rating) || 5, 1), 5)
      distribution[star] = (distribution[star] || 0) + 1
      sumRating += star
    }

    const averageRating = allOwnerReviews.length > 0 ? Number((sumRating / allOwnerReviews.length).toFixed(1)) : 5.0

    return res.json({
      data: reviews,
      totalPages,
      currentPage: page,
      totalItems: total,
      meta: {
        total,
        totalPages,
        currentPage: page,
        limit,
        averageRating,
        distribution
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/reviews
 * Mengambil daftar ulasan toko/alat beserta kalkulasi rating dan pagination server-side.
 * Parameter query opsional:
 * - equipmentId : ID alat tertentu
 * - ownerId     : ID pemilik alat
 * - rating      : filter nilai bintang (1-5)
 * - page        : nomor halaman (default: 1)
 * - limit       : ulasan per halaman (default: 10)
 */
reviewsRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { equipmentId, ownerId, rating } = req.query

    const where = {}

    if (equipmentId) {
      where.equipmentId = String(equipmentId)
    } else if (ownerId) {
      where.equipment = { ownerId: String(ownerId) }
    } else if (req.userId && (req.userRole === 'PEMILIK' || req.query.as === 'owner')) {
      where.equipment = { ownerId: req.userId }
    }

    if (rating && !isNaN(Number(rating))) {
      where.rating = Number(rating)
    }

    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10)) : 10
    const skip = (page - 1) * limit
    const take = limit

    const [total, reviews, allFilteredReviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        ...(hasPagination ? { skip, take } : {}),
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              kycData: true
            }
          },
          equipment: {
            select: {
              id: true,
              name: true,
              category: true,
              images: true,
              ownerId: true
            }
          },
          order: {
            select: {
              id: true,
              invoiceNumber: true,
              startDate: true,
              endDate: true,
              rentalDays: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.review.findMany({
        where,
        select: { rating: true }
      })
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let sumRating = 0

    for (const r of allFilteredReviews) {
      const star = Math.min(Math.max(Number(r.rating) || 5, 1), 5)
      distribution[star] = (distribution[star] || 0) + 1
      sumRating += star
    }

    const averageRating = total > 0 ? Number((sumRating / total).toFixed(1)) : 5.0

    return res.json({
      data: reviews,
      totalPages,
      currentPage: page,
      totalItems: total,
      meta: {
        total,
        totalPages,
        currentPage: page,
        limit,
        averageRating,
        distribution
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/reviews
 * Menyimpan ulasan baru untuk pesanan yang telah SELESAI
 */
reviewsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { orderId, rating, comment } = req.body ?? {}

    if (!orderId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Order ID wajib disertakan' }
      })
    }

    const numRating = Number(rating)
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Rating harus bernilai angka antara 1 sampai 5' }
      })
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Komentar ulasan tidak boleh kosong' }
      })
    }

    const order = await prisma.order.findUnique({
      where: { id: String(orderId) },
      include: { review: true }
    })

    if (!order) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan' }
      })
    }

    if (order.userId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Anda hanya dapat memberikan ulasan untuk pesanan Anda sendiri' }
      })
    }

    if (order.status !== 'SELESAI') {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'Ulasan hanya dapat diberikan untuk pesanan yang sudah berstatus SELESAI' }
      })
    }

    if (order.review) {
      return res.status(400).json({
        error: { code: 'ALREADY_REVIEWED', message: 'Pesanan ini sudah pernah diulas sebelumnya' }
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
      message: 'Ulasan Anda berhasil dikirim. Terima kasih atas masukan Anda!'
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/reviews/:id/reply
 * Pemilik alat membalas ulasan penyewa
 */
reviewsRouter.post('/:id/reply', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { reply } = req.body ?? {}

    if (!reply || typeof reply !== 'string' || !reply.trim()) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Teks balasan ulasan tidak boleh kosong' }
      })
    }

    const review = await prisma.review.findUnique({
      where: { id: String(id) },
      include: {
        equipment: {
          select: { ownerId: true }
        }
      }
    })

    if (!review) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Ulasan tidak ditemukan' }
      })
    }

    if (review.equipment.ownerId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Hanya pemilik alat yang bersangkutan yang dapat membalas ulasan ini' }
      })
    }

    const updatedReview = await prisma.review.update({
      where: { id: String(id) },
      data: {
        ownerReply: reply.trim(),
        repliedAt: new Date()
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, kycData: true } },
        equipment: { select: { id: true, name: true, category: true, images: true, ownerId: true } },
        order: { select: { id: true, invoiceNumber: true, startDate: true, endDate: true, rentalDays: true } }
      }
    })

    return res.status(200).json({
      data: updatedReview,
      message: 'Balasan ulasan berhasil dikirim'
    })
  } catch (error) {
    next(error)
  }
})
