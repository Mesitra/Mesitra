import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../../middleware/adminAuth.js'

export const adminModerationRouter = Router()

// Proteksi seluruh endpoint moderasi dilindungi middleware requireAdmin
adminModerationRouter.use(requireAdmin)

/**
 * GET /equipments
 * Mengambil daftar katalog alat untuk pengawasan & kurasi admin backoffice.
 * Parameter query: status, isTakedown, category, search, page, limit.
 */
adminModerationRouter.get('/equipments', async (req, res, next) => {
  try {
    const { status, isTakedown, category, search } = req.query ?? {}

    const where = {}

    if (status) {
      where.status = String(status).toUpperCase()
    }

    if (isTakedown !== undefined) {
      where.isTakedownByAdmin = isTakedown === 'true'
    }

    if (category) {
      where.category = String(category)
    }

    if (search && String(search).trim()) {
      const q = String(search).trim()
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { owner: { fullName: { contains: q } } },
        { owner: { email: { contains: q } } }
      ]
    }

    const equipments = await prisma.equipment.findMany({
      where,
      select: {
        id: true,
        ownerId: true,
        name: true,
        category: true,
        // Wajib tersedia untuk modal preview katalog admin.
        description: true,
        images: true,
        pricePerDay: true,
        deposit: true,
        powerWatt: true,
        weightKg: true,
        condition: true,
        location: true,
        status: true,
        isTakedownByAdmin: true,
        takedownReason: true,
        takedownAt: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json({
      message: 'Katalog alat untuk moderasi berhasil dimuat',
      total: equipments.length,
      equipments
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /equipments/:id/takedown
 * Melakukan arsip paksa / takedown pada alat berbahaya / melanggar TOS.
 * Payload: { takedownReason }
 * Mengubah: isTakedownByAdmin = true, status = 'NONAKTIF', takedownAt = NOW(), moderatedById.
 * Alat disembunyikan dari katalog pencarian publik.
 */
adminModerationRouter.patch('/equipments/:id/takedown', async (req, res, next) => {
  try {
    const { id } = req.params
    const { takedownReason } = req.body ?? {}

    if (!takedownReason || typeof takedownReason !== 'string' || !takedownReason.trim()) {
      return res.status(400).json({
        error: { code: 'TAKEDOWN_REASON_REQUIRED', message: 'Alasan takedown alat wajib diisi' }
      })
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: { owner: { select: { id: true, email: true, fullName: true } } }
    })

    if (!equipment) {
      return res.status(404).json({
        error: { code: 'EQUIPMENT_NOT_FOUND', message: 'Alat tidak ditemukan' }
      })
    }

    const reasonText = takedownReason.trim()
    const adminId = req.admin?.id || req.userId
    const now = new Date()

    const [updatedEquipment] = await prisma.$transaction([
      prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          isTakedownByAdmin: true,
          takedownReason: reasonText,
          takedownAt: now,
          moderatedById: adminId,
          status: 'NONAKTIF'
        },
        include: {
          owner: { select: { id: true, fullName: true, email: true } }
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'TAKEDOWN_EQUIPMENT',
          targetType: 'EQUIPMENT',
          targetId: equipment.id,
          metadata: {
            equipmentName: equipment.name,
            ownerId: equipment.ownerId,
            ownerEmail: equipment.owner?.email,
            takedownReason: reasonText
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Alat "${updatedEquipment.name}" berhasil ditakedown oleh admin dan dinonaktifkan dari katalog publik`,
      equipment: updatedEquipment
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /equipments/:id/restore
 * Memulihkan alat yang sebelumnya di-takedown.
 * Menghapus flag takedown agar pemilik dapat mengaktifkan kembali unitnya.
 */
adminModerationRouter.patch('/equipments/:id/restore', async (req, res, next) => {
  try {
    const { id } = req.params

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: { owner: { select: { id: true, email: true, fullName: true } } }
    })

    if (!equipment) {
      return res.status(404).json({
        error: { code: 'EQUIPMENT_NOT_FOUND', message: 'Alat tidak ditemukan' }
      })
    }

    if (!equipment.isTakedownByAdmin) {
      return res.status(400).json({
        error: { code: 'NOT_TAKEDOWN', message: 'Alat ini tidak sedang dalam status takedown' }
      })
    }

    const adminId = req.admin?.id || req.userId

    const [updatedEquipment] = await prisma.$transaction([
      prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          isTakedownByAdmin: false,
          takedownReason: null,
          takedownAt: null,
          moderatedById: null,
          status: 'TERSEDIA'
        },
        include: {
          owner: { select: { id: true, fullName: true, email: true } }
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'RESTORE_EQUIPMENT',
          targetType: 'EQUIPMENT',
          targetId: equipment.id,
          metadata: {
            equipmentName: equipment.name,
            ownerId: equipment.ownerId,
            ownerEmail: equipment.owner?.email
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Status takedown alat "${updatedEquipment.name}" berhasil dicabut dan dikembalikan ke status TERSEDIA`,
      equipment: updatedEquipment
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * GET /reviews
 * Mengambil daftar ulasan untuk audit moderasi kata kasar / spam.
 * Parameter query: isDeleted, isFlagged, rating, search.
 */
adminModerationRouter.get('/reviews', async (req, res, next) => {
  try {
    const { isDeleted, isFlagged, rating, search } = req.query ?? {}

    const where = {}

    if (isDeleted !== undefined) {
      where.isDeleted = isDeleted === 'true'
    }

    if (isFlagged !== undefined) {
      where.isFlagged = isFlagged === 'true'
    }

    if (rating && !isNaN(Number(rating))) {
      where.rating = Number(rating)
    }

    if (search && String(search).trim()) {
      const q = String(search).trim()
      where.OR = [
        { comment: { contains: q } },
        { user: { fullName: { contains: q } } },
        { equipment: { name: { contains: q } } }
      ]
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            verificationStatus: true,
            createdAt: true
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
            category: true,
            images: true,
            pricePerDay: true,
            ownerId: true,
            owner: { select: { id: true, fullName: true, email: true } }
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
      orderBy: { createdAt: 'desc' }
    })

    return res.json({
      message: 'Daftar ulasan untuk moderasi berhasil dimuat',
      total: reviews.length,
      reviews
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /reviews/:id/delete
 * Menghapus / menyembunyikan ulasan toksik (Soft Delete).
 * Payload: { moderationNote }
 * Mengubah: isDeleted = true, isFlagged = true, moderatedAt = NOW(), moderatedById.
 * Tidak menghapus data fisik (audit trail terjaga).
 */
adminModerationRouter.patch('/reviews/:id/delete', async (req, res, next) => {
  try {
    const { id } = req.params
    const { moderationNote } = req.body ?? {}

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        equipment: { select: { id: true, name: true } }
      }
    })

    if (!review) {
      return res.status(404).json({
        error: { code: 'REVIEW_NOT_FOUND', message: 'Ulasan tidak ditemukan' }
      })
    }

    if (review.isDeleted) {
      return res.status(400).json({
        error: { code: 'ALREADY_DELETED', message: 'Ulasan ini sudah dihapus sebelumnya' }
      })
    }

    const noteText = typeof moderationNote === 'string' && moderationNote.trim().length > 0
      ? moderationNote.trim()
      : 'Ulasan dihapus oleh admin karena melanggar panduan komunitas'

    const adminId = req.admin?.id || req.userId
    const now = new Date()

    const [updatedReview] = await prisma.$transaction([
      prisma.review.update({
        where: { id: review.id },
        data: {
          isDeleted: true,
          isFlagged: true,
          moderatedAt: now,
          moderatedById: adminId,
          moderationNote: noteText
        },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          equipment: { select: { id: true, name: true } }
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'DELETE_REVIEW',
          targetType: 'REVIEW',
          targetId: review.id,
          metadata: {
            equipmentId: review.equipmentId,
            equipmentName: review.equipment?.name,
            reviewerUserId: review.userId,
            reviewerName: review.user?.fullName,
            rating: review.rating,
            commentSnippet: review.comment ? review.comment.slice(0, 100) : null,
            moderationNote: noteText
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: 'Ulasan berhasil dihapus (soft-delete) oleh admin dan disembunyikan dari penilaian publik',
      review: updatedReview
    })
  } catch (error) {
    return next(error)
  }
})

