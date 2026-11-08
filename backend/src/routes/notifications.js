import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'

export const notificationsRouter = Router()

/**
 * Middleware: Verifikasi JWT token & pasang userId ke request.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token otentikasi wajib disertakan' }
    })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret)
    req.userId = decoded.userId
    req.userRole = String(decoded.role || '').toUpperCase()
    next()
  } catch {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
    })
  }
}

notificationsRouter.use(authenticate)

/**
 * GET /api/notifications
 * Mengembalikan list notifikasi milik user yang sedang login, diurutkan dari terbaru.
 */
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    })

    return res.json({ data: notifications })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /api/notifications/:id/read
 * Mengubah status isRead menjadi true untuk notifikasi tertentu.
 */
notificationsRouter.patch('/:id/read', async (req, res, next) => {
  try {
    const notif = await prisma.notification.findUnique({
      where: { id: req.params.id }
    })

    if (!notif) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Notifikasi tidak ditemukan' }
      })
    }

    if (notif.userId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Akses ditolak' }
      })
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    })

    return res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /api/notifications/read-all
 * Menandai semua notifikasi milik user sebagai telah dibaca.
 */
notificationsRouter.patch('/read-all', async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        isRead: false
      },
      data: { isRead: true }
    })

    return res.json({ data: result, count: result.count })
  } catch (error) {
    next(error)
  }
})
