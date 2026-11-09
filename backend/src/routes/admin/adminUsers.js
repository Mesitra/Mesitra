import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../../middleware/adminAuth.js'
import { summarizeKyc } from '../../lib/kyc.js'

export const adminUsersRouter = Router()

// Proteksi seluruh endpoint di bawah middleware requireAdmin
adminUsersRouter.use(requireAdmin)

const SUBMISSION_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  submissionCode: true,
  verificationStatus: true,
  revisionSteps: true,
  adminNote: true,
  kycData: true,
  isSuspended: true,
  suspendedReason: true,
  suspendedAt: true,
  verifiedAt: true,
  verifiedById: true,
  createdAt: true,
  updatedAt: true
}

const ROLE_LABEL = {
  PENYEWA: 'Penyewa UMKM',
  PEMILIK: 'Pemilik Alat'
}

function presentSubmission(user) {
  const kycData = user.kycData && typeof user.kycData === 'object' ? user.kycData : {}
  const summary = summarizeKyc(kycData, user.role)

  return {
    id: user.id,
    submissionCode: user.submissionCode,
    email: user.email,
    fullName: user.fullName,
    nama: summary.nama || user.fullName,
    inisial: summary.inisial,
    role: user.role,
    tipe: ROLE_LABEL[user.role] ?? user.role,
    phone: user.phone,
    lokasi: summary.lokasi,
    langkah: summary.langkah,
    verificationStatus: user.verificationStatus,
    revisionSteps: Array.isArray(user.revisionSteps) ? user.revisionSteps : [],
    adminNote: user.adminNote ?? null,
    isSuspended: Boolean(user.isSuspended),
    suspendedReason: user.suspendedReason ?? null,
    suspendedAt: user.suspendedAt ?? null,
    verifiedAt: user.verifiedAt ?? null,
    verifiedById: user.verifiedById ?? null,
    kycData,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

async function findSubmission(identifier) {
  const byId = await prisma.user.findFirst({
    where: { id: identifier, role: { in: ['PENYEWA', 'PEMILIK'] } },
    select: SUBMISSION_SELECT
  })

  if (byId) return byId

  return prisma.user.findFirst({
    where: { submissionCode: identifier, role: { in: ['PENYEWA', 'PEMILIK'] } },
    select: SUBMISSION_SELECT
  })
}

/**
 * GET /submissions
 * Daftar seluruh pengajuan KYC (Penyewa & Pemilik).
 * Query opsional: status, role, search.
 */
adminUsersRouter.get('/submissions', async (req, res, next) => {
  try {
    const { status, role, search } = req.query ?? {}

    const where = {
      role: { in: ['PENYEWA', 'PEMILIK'] }
    }

    if (role && ['PENYEWA', 'PEMILIK'].includes(String(role).toUpperCase())) {
      where.role = String(role).toUpperCase()
    }

    if (status) {
      where.verificationStatus = String(status).toUpperCase()
    }

    if (search && String(search).trim()) {
      const q = String(search).trim()
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { submissionCode: { contains: q } }
      ]
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: SUBMISSION_SELECT
    })

    return res.json({
      message: 'Daftar pengajuan berhasil dimuat',
      total: users.length,
      submissions: users.map(presentSubmission)
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * GET /submissions/:id
 * Detail satu pengajuan berdasarkan id (uuid) atau submissionCode (VR-xxxx).
 */
adminUsersRouter.get('/submissions/:id', async (req, res, next) => {
  try {
    const submission = await findSubmission(req.params.id)

    if (!submission) {
      return res.status(404).json({
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Pengajuan tidak ditemukan' }
      })
    }

    return res.json({
      message: 'Detail pengajuan berhasil dimuat',
      submission: presentSubmission(submission)
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /submissions/:id/approve
 * Setujui KYC:
 * 1. Update User: verificationStatus = 'DISETUJUI', verifiedAt = NOW(), verifiedById = admin.id.
 * 2. Update/Upsert TenantProfile (jika pemilik / profil ada): set ktpVerified, nibVerified, bankAccountVerified, npwpVerified = true.
 * 3. Catat AdminAuditLog: APPROVE_KYC.
 */
adminUsersRouter.patch('/submissions/:id/approve', async (req, res, next) => {
  try {
    const submission = await findSubmission(req.params.id)

    if (!submission) {
      return res.status(404).json({
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Pengajuan tidak ditemukan' }
      })
    }

    const adminId = req.admin?.id || req.userId
    const now = new Date()

    const [updatedUser] = await prisma.$transaction(async (tx) => {
      // 1. Update status KYC & audit trail pada User
      const userRes = await tx.user.update({
        where: { id: submission.id },
        data: {
          verificationStatus: 'DISETUJUI',
          revisionSteps: Prisma.DbNull,
          adminNote: null,
          verifiedAt: now,
          verifiedById: adminId
        },
        select: SUBMISSION_SELECT
      })

      // 2. Sinkronkan verifikasi granular ke TenantProfile (jika Pemilik atau profil sudah ada)
      const existingTp = await tx.tenantProfile.findUnique({
        where: { userId: submission.id }
      })

      if (existingTp || submission.role === 'PEMILIK') {
        await tx.tenantProfile.upsert({
          where: { userId: submission.id },
          create: {
            userId: submission.id,
            ktpVerified: true,
            nibVerified: true,
            bankAccountVerified: true,
            npwpVerified: true
          },
          update: {
            ktpVerified: true,
            nibVerified: true,
            bankAccountVerified: true,
            npwpVerified: true
          }
        })
      }

      // 3. Catat jejak audit admin
      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: 'APPROVE_KYC',
          targetType: 'USER',
          targetId: submission.id,
          metadata: {
            submissionCode: submission.submissionCode,
            role: submission.role,
            email: submission.email
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })

      return [userRes]
    })

    return res.json({
      message: `Pengajuan ${updatedUser.submissionCode ?? updatedUser.id} disetujui`,
      submission: presentSubmission(updatedUser)
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /submissions/:id/revision
 * Minta perbaikan step tertentu pada pengajuan.
 */
adminUsersRouter.patch('/submissions/:id/revision', async (req, res, next) => {
  try {
    const submission = await findSubmission(req.params.id)

    if (!submission) {
      return res.status(404).json({
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Pengajuan tidak ditemukan' }
      })
    }

    const { selectedSteps, note } = req.body ?? {}

    if (!Array.isArray(selectedSteps) || selectedSteps.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SELECTED_STEPS',
          message: 'Pilih minimal satu step yang perlu diperbaiki'
        }
      })
    }

    const steps = selectedSteps
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5)

    if (steps.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SELECTED_STEPS',
          message: 'Nomor step harus berupa angka antara 1 sampai 5'
        }
      })
    }

    const adminNote = typeof note === 'string' ? note.trim() : ''
    const adminId = req.admin?.id || req.userId
    const uniqueSteps = [...new Set(steps)].sort((a, b) => a - b)

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: submission.id },
        data: {
          verificationStatus: 'PERLU_PERBAIKAN',
          revisionSteps: uniqueSteps,
          adminNote: adminNote.length > 0 ? adminNote : null
        },
        select: SUBMISSION_SELECT
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'REQUEST_KYC_REVISION',
          targetType: 'USER',
          targetId: submission.id,
          metadata: {
            submissionCode: submission.submissionCode,
            selectedSteps: uniqueSteps,
            note: adminNote
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Permintaan perbaikan dikirim untuk step ${uniqueSteps.join(', ')}`,
      submission: presentSubmission(updatedUser)
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /submissions/:id/reject
 * Tolak pengajuan KYC permanen.
 */
adminUsersRouter.patch('/submissions/:id/reject', async (req, res, next) => {
  try {
    const submission = await findSubmission(req.params.id)

    if (!submission) {
      return res.status(404).json({
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Pengajuan tidak ditemukan' }
      })
    }

    const { reason, note } = req.body ?? {}
    const reasonText = typeof reason === 'string' ? reason.trim() : ''
    const noteText = typeof note === 'string' ? note.trim() : ''

    if (reasonText.length === 0 && noteText.length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REASON',
          message: 'Alasan penolakan wajib diisi'
        }
      })
    }

    const adminNote = [reasonText, noteText].filter(Boolean).join(' — ')
    const adminId = req.admin?.id || req.userId

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: submission.id },
        data: {
          verificationStatus: 'DITOLAK',
          revisionSteps: Prisma.DbNull,
          adminNote
        },
        select: SUBMISSION_SELECT
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'REJECT_KYC',
          targetType: 'USER',
          targetId: submission.id,
          metadata: {
            submissionCode: submission.submissionCode,
            reason: adminNote
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Pengajuan ${updatedUser.submissionCode ?? updatedUser.id} ditolak`,
      submission: presentSubmission(updatedUser)
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * GET /users/public
 * Mengambil seluruh user dengan role publik: PENYEWA dan PEMILIK (mengecualikan role admin).
 * Mendukung filter query: role, status (verificationStatus), search, isSuspended.
 */
adminUsersRouter.get('/users/public', async (req, res, next) => {
  try {
    const { role, status, search, isSuspended } = req.query ?? {}

    const where = {
      role: { in: ['PENYEWA', 'PEMILIK'] }
    }

    if (role && ['PENYEWA', 'PEMILIK'].includes(String(role).toUpperCase())) {
      where.role = String(role).toUpperCase()
    }

    if (status) {
      where.verificationStatus = String(status).toUpperCase()
    }

    if (isSuspended !== undefined && isSuspended !== '') {
      where.isSuspended = String(isSuspended) === 'true'
    }

    if (search && String(search).trim()) {
      const q = String(search).trim()
      where.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { submissionCode: { contains: q } }
      ]
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        submissionCode: true,
        verificationStatus: true,
        isSuspended: true,
        suspendedReason: true,
        suspendedAt: true,
        suspendedById: true,
        walletBalance: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            equipments: true
          }
        }
      }
    })

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      submissionCode: user.submissionCode,
      verificationStatus: user.verificationStatus,
      isSuspended: Boolean(user.isSuspended),
      suspendedReason: user.suspendedReason ?? null,
      suspendedAt: user.suspendedAt ?? null,
      suspendedById: user.suspendedById ?? null,
      walletBalance: user.walletBalance ?? 0,
      totalOrders: user._count?.orders ?? 0,
      totalEquipments: user._count?.equipments ?? 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))

    return res.json({
      message: 'Daftar pengguna publik berhasil dimuat',
      total: formattedUsers.length,
      users: formattedUsers
    })
  } catch (error) {
    return next(error)
  }
})

// Alias GET /users -> mengarahkan ke daftar user publik
adminUsersRouter.get('/users', async (req, res, next) => {
  req.url = '/users/public'
  return adminUsersRouter.handle(req, res, next)
})

/**
 * PATCH /users/:id/suspend
 * Menangguhkan akun pengguna (isSuspended = true).
 * Body: { reason: string }
 */
adminUsersRouter.patch('/users/:id/suspend', async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body ?? {}

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true, role: true, isSuspended: true }
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({
        error: { code: 'CANNOT_SUSPEND_ADMIN', message: 'Akun administrator tidak dapat ditangguhkan' }
      })
    }

    if (user.isSuspended) {
      return res.status(400).json({
        error: { code: 'ALREADY_SUSPENDED', message: 'Akun ini sudah dalam status ditangguhkan' }
      })
    }

    const suspendedReason = typeof reason === 'string' && reason.trim().length > 0
      ? reason.trim()
      : 'Pelanggaran syarat dan ketentuan layanan MyRent'

    const adminId = req.admin?.id || req.userId
    const now = new Date()

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          isSuspended: true,
          suspendedReason,
          suspendedAt: now,
          suspendedById: adminId
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isSuspended: true,
          suspendedReason: true,
          suspendedAt: true,
          suspendedById: true
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'SUSPEND_USER',
          targetType: 'USER',
          targetId: user.id,
          metadata: {
            userEmail: user.email,
            userRole: user.role,
            reason: suspendedReason
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Akun ${updatedUser.fullName} (${updatedUser.email}) berhasil ditangguhkan`,
      user: updatedUser
    })
  } catch (error) {
    return next(error)
  }
})

/**
 * PATCH /users/:id/unsuspend
 * Memulihkan akun pengguna yang ditangguhkan (isSuspended = false).
 */
adminUsersRouter.patch('/users/:id/unsuspend', async (req, res, next) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true, role: true, isSuspended: true }
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }

    if (!user.isSuspended) {
      return res.status(400).json({
        error: { code: 'NOT_SUSPENDED', message: 'Akun ini tidak sedang dalam status ditangguhkan' }
      })
    }

    const adminId = req.admin?.id || req.userId

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          isSuspended: false,
          suspendedReason: null,
          suspendedAt: null,
          suspendedById: null
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isSuspended: true,
          suspendedReason: true,
          suspendedAt: true,
          suspendedById: true
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'UNSUSPEND_USER',
          targetType: 'USER',
          targetId: user.id,
          metadata: {
            userEmail: user.email,
            userRole: user.role
          },
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          userAgent: req.get('user-agent') || null
        }
      })
    ])

    return res.json({
      message: `Penangguhan akun ${updatedUser.fullName} (${updatedUser.email}) berhasil dicabut`,
      user: updatedUser
    })
  } catch (error) {
    return next(error)
  }
})

