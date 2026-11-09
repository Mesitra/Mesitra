import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../../middleware/adminAuth.js'

export const adminStaffRouter = Router()

/**
 * Middleware: Pastikan hanya SUPERADMIN yang bisa akses
 */
function requireSuperadmin(req, res, next) {
  if (req.admin?.adminRole !== 'SUPERADMIN') {
    return res.status(403).json({
      error: {
        code: 'SUPERADMIN_ONLY',
        message: 'Hanya superadmin yang dapat mengakses fitur ini'
      }
    })
  }
  next()
}

// Semua endpoint di bawah butuh auth admin dulu
adminStaffRouter.use(requireAdmin)

/**
 * GET /admin/staff
 * List semua admin users (superadmin only)
 */
adminStaffRouter.get('/', requireSuperadmin, async (req, res, next) => {
  try {
    const users = await prisma.adminUser.findMany({
      orderBy: [
        { role: 'asc' }, // SUPERADMIN dulu
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        securityPinHash: false,
        passwordHash: false
      }
    })

    return res.json({
      message: 'Daftar admin users berhasil dimuat',
      total: users.length,
      users
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /admin/staff
 * Buat admin user baru (staff) - superadmin only
 */
adminStaffRouter.post('/', requireSuperadmin, async (req, res, next) => {
  try {
    const { email, name, password, role = 'STAFF' } = req.body

    if (!email || !name || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email, nama, dan password wajib diisi'
        }
      })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(name).trim()
    const cleanPassword = String(password).trim()

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        error: {
          code: 'PASSWORD_TOO_SHORT',
          message: 'Password minimal 6 karakter'
        }
      })
    }

    // Cek duplikat email
    const existing = await prisma.adminUser.findUnique({
      where: { email: cleanEmail }
    })

    if (existing) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email sudah terdaftar'
        }
      })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(cleanPassword, 10)

    // Create AdminUser
    const newUser = await prisma.adminUser.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        passwordHash,
        role: role === 'SUPERADMIN' ? 'SUPERADMIN' : 'STAFF',
        isActive: true,
        createdById: req.admin.adminUserId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    // Juga buat entry di User table dengan role ADMIN untuk kompatibilitas
    try {
      await prisma.user.create({
        data: {
          email: cleanEmail,
          password: passwordHash,
          fullName: cleanName,
          phone: '-',
          role: 'ADMIN',
          verificationStatus: 'DISETUJUI'
        }
      })
    } catch (userErr) {
      // Jika user sudah ada di User table, skip
      console.log('User table entry skipped (already exists):', cleanEmail)
    }

    return res.status(201).json({
      message: 'Admin user berhasil dibuat',
      user: newUser
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /admin/staff/:id/deactivate
 * Nonaktifkan akun admin user (superadmin only)
 */
adminStaffRouter.patch('/:id/deactivate', requireSuperadmin, async (req, res, next) => {
  try {
    const { id } = req.params

    const adminUser = await prisma.adminUser.findUnique({
      where: { id }
    })

    if (!adminUser) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Admin user tidak ditemukan' }
      })
    }

    if (adminUser.role === 'SUPERADMIN') {
      return res.status(403).json({
        error: {
          code: 'CANNOT_DEACTIVATE_SUPERADMIN',
          message: 'Tidak dapat menonaktifkan akun superadmin'
        }
      })
    }

    const updated = await prisma.adminUser.update({
      where: { id },
      data: { isActive: false }
    })

    return res.json({
      message: 'Admin user berhasil dinonaktifkan',
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        isActive: updated.isActive
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /admin/staff/:id/activate
 * Aktifkan kembali akun admin user (superadmin only)
 */
adminStaffRouter.patch('/:id/activate', requireSuperadmin, async (req, res, next) => {
  try {
    const { id } = req.params

    const updated = await prisma.adminUser.update({
      where: { id },
      data: { isActive: true }
    })

    return res.json({
      message: 'Admin user berhasil diaktifkan',
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        isActive: updated.isActive
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /admin/staff/:id/reset-pin
 * Reset PIN staff (superadmin only)
 */
adminStaffRouter.patch('/:id/reset-pin', requireSuperadmin, async (req, res, next) => {
  try {
    const { id } = req.params

    const adminUser = await prisma.adminUser.findUnique({
      where: { id }
    })

    if (!adminUser) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Admin user tidak ditemukan' }
      })
    }

    if (adminUser.role === 'SUPERADMIN') {
      return res.status(403).json({
        error: {
          code: 'CANNOT_RESET_SUPERADMIN_PIN',
          message: 'Superadmin tidak menggunakan PIN'
        }
      })
    }

    await prisma.adminUser.update({
      where: { id },
      data: { securityPinHash: null }
    })

    return res.json({
      message: 'PIN staff berhasil direset. Staff akan diminta membuat PIN baru saat login berikutnya.'
    })
  } catch (error) {
    next(error)
  }
})
