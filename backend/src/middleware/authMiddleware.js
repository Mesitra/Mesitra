import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { prisma } from '../lib/prisma.js'

/**
 * Middleware autentikasi umum (Bearer JWT).
 * Memvalidasi token, memverifikasi pengguna di database,
 * dan memastikan akun tidak dalam status suspensi (isSuspended).
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token otentikasi wajib disertakan' }
      })
    }

    const token = authHeader.slice('Bearer '.length).trim()

    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
      })
    }

    const userId = decoded.userId || decoded.id
    if (!userId) {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Payload token tidak valid' }
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isSuspended: true,
        suspendedReason: true,
        suspendedAt: true
      }
    })

    if (!user) {
      return res.status(401).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }

    // Invalidation check: Tolak request jika akun telah ditangguhkan
    if (user.isSuspended) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Akun Anda telah ditangguhkan',
          reason: user.suspendedReason || null
        }
      })
    }

    req.user = user
    req.userId = user.id
    req.userRole = String(user.role || '').toUpperCase()

    return next()
  } catch (error) {
    return next(error)
  }
}

/**
 * Middleware penjaga khusus Admin (Admin Guard).
 * Memanggil requireAuth terlebih dahulu, lalu memvalidasi apakah user memiliki role ADMIN.
 */
export async function requireAdmin(req, res, next) {
  return requireAuth(req, res, (err) => {
    if (err) return next(err)

    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Akses ditolak. Memerlukan hak akses administrator'
        }
      })
    }

    req.admin = req.user
    return next()
  })
}

