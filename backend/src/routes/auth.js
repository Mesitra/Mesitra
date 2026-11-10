import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'
import { buildKycData, extractFormPayload, resolvePowerLimit, normalizeFileValue } from '../lib/kyc.js'
import { generateSubmissionCode } from '../lib/submissionCode.js'
import {
  findUserByPhone,
  findUserByNik,
  findUserByBankAccount,
  normalizePhone,
  normalizeNik,
  normalizeBankAccount
} from '../lib/userValidation.js'
import { authLimiter } from '../middleware/rateLimiter.js'

export const authRouter = Router()
authRouter.use(authLimiter)

/**
 * Normalisasi role ke ENUM Prisma: PENYEWA | PEMILIK
 */
function normalizeRole(role) {
  if (!role) return 'PENYEWA'
  const upper = String(role).toUpperCase().trim()
  if (upper === 'PEMILIK') return 'PEMILIK'
  return 'PENYEWA'
}

/**
 * Bentuk objek user yang dikembalikan ke frontend.
 * Termasuk data status verifikasi supaya frontend bisa melakukan gatekeeping.
 *
 * `kycData` yang dikembalikan sengaja dibuat ringkas (hanya data daya
 * listrik) supaya aman disimpan di localStorage browser — data form lengkap
 * berisi foto base64 & NIK tetap hanya tersedia lewat endpoint admin.
 *
 * @param {object} user - baris user dari Prisma
 * @returns {object}
 */
function presentUser(user) {
  const kycData = user.kycData && typeof user.kycData === 'object' ? user.kycData : {}

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    walletBalance: user.walletBalance ?? 0,
    submissionCode: user.submissionCode ?? null,
    verificationStatus: user.verificationStatus ?? 'MENUNGGU',
    revisionSteps: Array.isArray(user.revisionSteps) ? user.revisionSteps : [],
    adminNote: user.adminNote ?? null,
    kycData: {
      // Daya listrik usaha dalam watt (null bila belum diisi di form registrasi).
      dayaListrik: resolvePowerLimit(kycData),
      powerCapacity: kycData.powerCapacity ?? null,
      customPower: kycData.customPower ?? null,
      // Data tambahan untuk halaman Pesanan Saya & wizard Kembalikan Alat.
      businessName: kycData.businessName ?? null,
      namaLokasi: (kycData.namaLokasi || kycData.locationName) ?? null,
      address: (kycData.address || kycData.alamat) ?? null,
      city: (kycData.city || kycData.kota) ?? null,
      district: (kycData.district || kycData.kecamatan) ?? null,
      landmark: kycData.landmark ?? null,
      bankName: kycData.bankName ?? null,
      bankAccountNumber: kycData.bankAccountNumber ?? null,
      bankAccountName: kycData.bankAccountName ?? null
    },
    createdAt: user.createdAt
  }
}

/**
 * Nilai default / fallback untuk TenantProfile pemilik bila record belum ada di DB.
 */
function buildTenantProfileFallback(user) {
  const kyc = user?.kycData && typeof user.kycData === 'object' ? user.kycData : {}
  const rawKtp = Boolean(user?.verificationStatus === 'DISETUJUI' || kyc.ktpFile || kyc.nik || kyc.nikKtp)
  const rawNib = Boolean(kyc.nib)
  const hasBank = Boolean(
    (user?.withdrawalAccounts && user.withdrawalAccounts.length > 0) ||
    kyc.bankAccount ||
    kyc.bankAccountNumber
  )

  return {
    storeName: kyc.businessName || user?.fullName || 'Toko Alat Mesitra',
    storeDescription: kyc.businessDesc || 'Penyedia rental alat dan mesin produksi terpercaya.',
    storeCategory: kyc.businessSector || 'Kuliner & Kopi',
    whatsappNumber: user?.phone || '',
    address: kyc.address || 'Jl. Cilandak Tengah No. 12',
    city: kyc.city || 'Bandung, Jawa Barat',
    serviceRadius: 15,
    operatingHours: {
      weekdays: { open: '08.00', close: '17.00', closed: false },
      saturday: { open: '09.00', close: '15.00', closed: false },
      sunday: { open: '', close: '', closed: true }
    },
    ktpVerified: rawKtp,
    nibVerified: rawNib,
    bankAccountVerified: hasBank,
    npwpVerified: false,
    notifPesananBaru: true,
    notifPengembalianAlat: true,
    notifInspeksiDeposit: false,
    notifRingkasanMingguan: true
  }
}

/**
 * Format TenantProfile agar aman dan konsisten dikembalikan ke frontend.
 */
function presentTenantProfile(tenantProfile, user) {
  const fallback = buildTenantProfileFallback(user)
  if (!tenantProfile) return fallback

  return {
    id: tenantProfile.id,
    userId: tenantProfile.userId,
    storeName: tenantProfile.storeName || fallback.storeName,
    storeDescription: tenantProfile.storeDescription !== null && tenantProfile.storeDescription !== undefined
      ? tenantProfile.storeDescription
      : fallback.storeDescription,
    storeCategory: tenantProfile.storeCategory || fallback.storeCategory,
    whatsappNumber: tenantProfile.whatsappNumber || fallback.whatsappNumber,
    address: tenantProfile.address || fallback.address,
    city: tenantProfile.city || fallback.city,
    serviceRadius: tenantProfile.serviceRadius !== null && tenantProfile.serviceRadius !== undefined
      ? tenantProfile.serviceRadius
      : fallback.serviceRadius,
    operatingHours: tenantProfile.operatingHours || fallback.operatingHours,
    ktpVerified: typeof tenantProfile.ktpVerified === 'boolean' ? tenantProfile.ktpVerified : fallback.ktpVerified,
    nibVerified: typeof tenantProfile.nibVerified === 'boolean' ? tenantProfile.nibVerified : fallback.nibVerified,
    bankAccountVerified: typeof tenantProfile.bankAccountVerified === 'boolean' ? tenantProfile.bankAccountVerified : fallback.bankAccountVerified,
    npwpVerified: typeof tenantProfile.npwpVerified === 'boolean' ? tenantProfile.npwpVerified : false,
    notifPesananBaru: typeof tenantProfile.notifPesananBaru === 'boolean' ? tenantProfile.notifPesananBaru : true,
    notifPengembalianAlat: typeof tenantProfile.notifPengembalianAlat === 'boolean' ? tenantProfile.notifPengembalianAlat : true,
    notifInspeksiDeposit: typeof tenantProfile.notifInspeksiDeposit === 'boolean' ? tenantProfile.notifInspeksiDeposit : false,
    notifRingkasanMingguan: typeof tenantProfile.notifRingkasanMingguan === 'boolean' ? tenantProfile.notifRingkasanMingguan : true,
    createdAt: tenantProfile.createdAt,
    updatedAt: tenantProfile.updatedAt
  }
}

/**
 * Bentuk profil lengkap pengguna untuk halaman penyesuaian / edit profil.
 * Memuat seluruh data registrasi (Step 1-5):
 *  - Data penting/legal yang terkunci (NIK, Nama KTP, Dokumen KYC)
 *  - Data yang dapat disesuaikan (Profil UMKM, Daya Listrik, Alamat, Rekening Refund)
 *
 * @param {object} user - baris user dari Prisma
 * @returns {object}
 */
function presentUserProfile(user) {
  const kycData = user.kycData && typeof user.kycData === 'object' ? user.kycData : {}

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    submissionCode: user.submissionCode ?? null,
    verificationStatus: user.verificationStatus ?? 'MENUNGGU',
    walletBalance: user.walletBalance ?? 0,
    adminNote: user.adminNote ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,

    // 🔒 Identitas Kependudukan Resmi (Terkunci & Dilindungi)
    nik: kycData.nik || kycData.nikKtp || '',
    ktpName: kycData.ktpName || kycData.namaKtp || user.fullName || '',
    birthPlace: kycData.birthPlace || kycData.tempatLahir || '',
    birthDate: kycData.birthDate || kycData.tanggalLahir || '',
    ktpFile: kycData.ktpFile || null,
    selfieFile: kycData.selfieFile || null,

    // ✏️ Profil Usaha / UMKM (Dapat Disesuaikan)
    businessName: kycData.businessName || '',
    businessSector: kycData.businessSector || 'Kuliner & Kopi',
    customSector: kycData.customSector || '',
    startYear: kycData.startYear || '',
    nib: kycData.nib || '',
    powerCapacity: kycData.powerCapacity || '1300 W',
    customPower: kycData.customPower || '',
    isManualPower: Boolean(kycData.isManualPower),
    dayaListrik: resolvePowerLimit(kycData),
    frontPhoto: kycData.frontPhoto || null,
    productionPhoto: kycData.productionPhoto || null,
    businessDesc: kycData.businessDesc || '',

    // ✏️ Alamat Usaha & Operasional Pengiriman (Dapat Disesuaikan)
    address: kycData.address || '',
    city: kycData.city || '',
    district: kycData.district || '',
    postalCode: kycData.postalCode || '',
    landmark: kycData.landmark || '',
    gpsCoords: kycData.gpsCoords || '-6.2601, 106.8135',

    // ✏️ Rekening Refund Deposit & Pencairan (Dapat Disesuaikan)
    bankName: kycData.bankName || 'BCA — Bank Central Asia',
    bankAccount: kycData.bankAccount || kycData.bankAccountNumber || '',
    bankAccountHolder: kycData.bankAccountHolder || kycData.bankAccountName || user.fullName || ''
  }
}

/**
 * POST /api/auth/register
 * Mendaftarkan akun baru (Penyewa UMKM atau Pemilik Alat)
 *
 * Seluruh data Step 1 - Step 5 diterima apa adanya (termasuk metadata file
 * foto dalam berbagai bentuk: nama file, objek { name, size, type }, atau data URL)
 * lalu disimpan pada kolom JSON `kycData`.
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, role, fullName, phone, ktpName, businessName, whatsapp } = req.body ?? {}

    const cleanEmail = email ? String(email).trim().toLowerCase() : ''
    if (!cleanEmail) {
      return res.status(400).json({
        error: { code: 'EMAIL_REQUIRED', message: 'Alamat email wajib diisi' }
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        error: { code: 'INVALID_EMAIL', message: 'Format email tidak valid' }
      })
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Kata sandi wajib diisi dan minimal terdiri dari 6 karakter'
        }
      })
    }

    const targetRole = normalizeRole(role)
    const resolvedName =
      (fullName && String(fullName).trim()) ||
      (ktpName && String(ktpName).trim()) ||
      (businessName && String(businessName).trim()) ||
      (targetRole === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa UMKM')

    const resolvedPhone =
      (phone && String(phone).trim()) ||
      (whatsapp && String(whatsapp).trim()) ||
      '-'

    // Cek apakah email sudah terdaftar sebelumnya
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail }
    })

    // Kumpulkan seluruh detail form Step 1-5 (validasi file dibebaskan).
    const kycData = buildKycData(extractFormPayload(req.body ?? {}))

    // Cek apakah nomor telepon sudah terdaftar pada pengguna lain
    if (resolvedPhone && resolvedPhone !== '-') {
      const existingPhoneUser = await findUserByPhone(resolvedPhone, existingUser?.id)
      if (existingPhoneUser) {
        return res.status(409).json({
          error: {
            code: 'PHONE_ALREADY_EXISTS',
            message: 'Nomor WhatsApp / telepon sudah terdaftar. Silakan gunakan nomor lain.'
          }
        })
      }
    }

    // Cek apakah NIK sudah terdaftar pada pengajuan lain
    if (kycData?.nik) {
      const existingNikUser = await findUserByNik(kycData.nik, existingUser?.id)
      if (existingNikUser) {
        return res.status(409).json({
          error: {
            code: 'NIK_ALREADY_EXISTS',
            message: 'NIK KTP ini sudah terdaftar pada akun/pengajuan lain.'
          }
        })
      }
    }

    // Hash kata sandi dengan bcrypt (saltRounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10)

    // ── Kirim ulang pengajuan ──────────────────────────────────────────────
    // Admin bisa meminta perbaikan (status PERLU_PERBAIKAN). Pada kondisi itu
    // pengguna mengirim ulang formulir dengan email & kata sandi yang sama,
    // sehingga akun diperbarui (bukan didaftarkan ulang) dan status kembali
    // ke MENUNGGU untuk ditinjau admin kembali.
    //
    // Catatan: pengiriman ulang HANYA boleh untuk status PERLU_PERBAIKAN.
    // Pengajuan berstatus MENUNGGU tetap mengembalikan 409 agar tidak bisa
    // dipakai menghindari lock anti-spam di halaman registrasi.
    if (existingUser) {
      const bisaDikirimUlang =
        existingUser.verificationStatus === 'PERLU_PERBAIKAN' &&
        (await bcrypt.compare(password, existingUser.password))

      if (!bisaDikirimUlang) {
        return res.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.'
          }
        })
      }

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: resolvedName,
          phone: resolvedPhone,
          verificationStatus: 'MENUNGGU',
          revisionSteps: Prisma.DbNull,
          adminNote: null,
          kycData
        }
      })

      const token = jwt.sign(
        { userId: updatedUser.id, role: updatedUser.role, email: updatedUser.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      )

      return res.status(200).json({
        message: 'Pengajuan berhasil diperbarui dan masuk antrean verifikasi admin.',
        token,
        user: presentUser(updatedUser)
      })
    }

    // Simpan ke database melalui Prisma (dengan retry bila submissionCode bentrok).
    let newUser = null
    for (let attempt = 0; attempt < 3 && !newUser; attempt += 1) {
      const submissionCode = await generateSubmissionCode(attempt)

      try {
        newUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            password: hashedPassword,
            role: targetRole,
            fullName: resolvedName,
            phone: resolvedPhone,
            submissionCode,
            verificationStatus: 'MENUNGGU',
            kycData
          }
        })
      } catch (createError) {
        if (createError?.code === 'P2002' && attempt < 2) continue
        throw createError
      }
    }

    if (!newUser) {
      return res.status(500).json({
        error: {
          code: 'SUBMISSION_CODE_CONFLICT',
          message: 'Gagal membuat kode pengajuan. Silakan coba lagi.'
        }
      })
    }

    // Auto-create TenantProfile kosong agar relasi siap saat user edit profil nanti.
    // Hanya untuk PEMILIK; PENYEWA tidak butuh TenantProfile.
    if (targetRole === 'PEMILIK') {
      await prisma.tenantProfile.create({
        data: {
          userId: newUser.id,
          storeName: resolvedName
        }
      }).catch(() => {}) // sudah ada = abaikan (idempoten)
    }

    // Buat token JWT
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, email: newUser.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    )

    // Response tanpa mengekspos field password
    return res.status(201).json({
      message: 'Registrasi berhasil. Pengajuan Anda sedang menunggu verifikasi admin.',
      token,
      user: presentUser(newUser)
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/check-unique
 * Pengecekan real-time keunikan email, telepon, NIK, dan rekening
 * untuk validasi pada setiap langkah (step) formulir sebelum lanjut ke step berikutnya.
 */
authRouter.post('/check-unique', async (req, res, next) => {
  try {
    const { email, phone, whatsapp, nik, bankAccount, excludeUserId } = req.body ?? {}
    const errors = {}

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(cleanEmail)) {
        const existing = await prisma.user.findUnique({
          where: { email: cleanEmail }
        })
        if (existing && existing.id !== excludeUserId) {
          errors.email = 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.'
        }
      }
    }

    const targetPhone = phone || whatsapp
    if (targetPhone) {
      const cleanPhone = normalizePhone(targetPhone)
      if (cleanPhone.length >= 9) {
        const existing = await findUserByPhone(targetPhone, excludeUserId)
        if (existing) {
          errors.phone = 'Nomor WhatsApp / telepon sudah terdaftar. Gunakan nomor lain.'
          errors.whatsapp = 'Nomor WhatsApp / telepon sudah terdaftar. Gunakan nomor lain.'
        }
      }
    }

    if (nik) {
      const cleanNik = normalizeNik(nik)
      if (cleanNik.length === 16) {
        const existing = await findUserByNik(cleanNik, excludeUserId)
        if (existing) {
          errors.nik = 'NIK KTP ini sudah terdaftar pada akun/pengajuan lain.'
        }
      }
    }

    if (bankAccount) {
      const cleanAcc = normalizeBankAccount(bankAccount)
      if (cleanAcc.length >= 5) {
        const existing = await findUserByBankAccount(cleanAcc, excludeUserId)
        if (existing) {
          errors.bankAccount = 'Nomor rekening ini sudah terdaftar pada akun lain.'
          errors.nomorRekening = 'Nomor rekening ini sudah terdaftar pada akun lain.'
        }
      }
    }

    return res.json({
      available: Object.keys(errors).length === 0,
      errors
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/login
 * Masuk dengan email & password, mengembalikan JWT token dan info user
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    const cleanEmail = email ? String(email).trim().toLowerCase() : ''
    if (!cleanEmail || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email dan kata sandi wajib diisi'
        }
      })
    }

    // Cari user di database
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    })

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email atau kata sandi tidak valid'
        }
      })
    }

    // Verifikasi password menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email atau kata sandi tidak valid'
        }
      })
    }

    // Khusus role ADMIN: Cek AdminUser table untuk multi-role support
    if (user.role === 'ADMIN') {
      // Cari di AdminUser table
      const adminUser = await prisma.adminUser.findUnique({
        where: { email: cleanEmail }
      })

      if (!adminUser || !adminUser.isActive) {
        return res.status(403).json({
          error: {
            code: 'ADMIN_NOT_FOUND',
            message: 'Akun admin tidak ditemukan atau tidak aktif'
          }
        })
      }

      // Verifikasi password AdminUser
      const isAdminPasswordValid = await bcrypt.compare(password, adminUser.passwordHash)
      if (!isAdminPasswordValid) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email atau kata sandi tidak valid'
          }
        })
      }

      // SUPERADMIN: langsung issue JWT
      if (adminUser.role === 'SUPERADMIN') {
        const token = jwt.sign(
          { userId: user.id, role: user.role, email: user.email, adminRole: 'SUPERADMIN', adminUserId: adminUser.id },
          config.jwtSecret,
          { expiresIn: config.jwtExpiresIn }
        )

        return res.json({
          message: 'Login superadmin berhasil',
          token,
          user: {
            ...presentUser(user),
            adminRole: 'SUPERADMIN',
            adminUserId: adminUser.id
          }
        })
      }

      // STAFF: cek apakah sudah set PIN
      if (adminUser.role === 'STAFF') {
        if (!adminUser.securityPinHash) {
          // Staff belum set PIN, perlu setup PIN dulu
          return res.json({
            message: 'PIN keamanan belum diatur. Silakan atur PIN 6 digit Anda.',
            step: 'SETUP_PIN_REQUIRED',
            email: adminUser.email,
            adminUserId: adminUser.id
          })
        }

        // Staff sudah punya PIN, minta verifikasi PIN
        return res.json({
          message: 'Kredensial valid. Masukkan PIN keamanan 6 digit Anda.',
          step: 'PIN_REQUIRED',
          email: adminUser.email,
          adminUserId: adminUser.id
        })
      }
    }

    // Generate JWT token untuk role selain ADMIN (PENYEWA, PEMILIK)
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    )

    return res.json({
      message: 'Login berhasil',
      token,
      user: presentUser(user)
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/admin/setup-pin
 * Staff pertama kali setup PIN 6 digit
 */
authRouter.post('/admin/setup-pin', async (req, res, next) => {
  try {
    const { email, pin } = req.body

    const cleanEmail = email ? String(email).trim().toLowerCase() : ''
    const cleanPin = pin ? String(pin).trim() : ''

    if (!cleanEmail || !cleanPin) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Email dan PIN wajib diisi' }
      })
    }

    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      return res.status(400).json({
        error: { code: 'INVALID_PIN', message: 'PIN harus 6 digit angka' }
      })
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: cleanEmail }
    })

    if (!adminUser || adminUser.role !== 'STAFF') {
      return res.status(403).json({
        error: { code: 'ACCESS_DENIED', message: 'Akun staff tidak ditemukan' }
      })
    }

    if (adminUser.securityPinHash) {
      return res.status(400).json({
        error: { code: 'PIN_ALREADY_SET', message: 'PIN sudah diatur sebelumnya' }
      })
    }

    // Hash PIN dan simpan
    const pinHash = await bcrypt.hash(cleanPin, 10)
    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { securityPinHash: pinHash }
    })

    return res.json({
      message: 'PIN berhasil diatur. Silakan login kembali.'
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/admin/verify-pin
 * Staff verifikasi PIN untuk mendapatkan JWT token
 */
authRouter.post('/admin/verify-pin', async (req, res, next) => {
  try {
    const { email, pin } = req.body

    const cleanEmail = email ? String(email).trim().toLowerCase() : ''
    const cleanPin = pin ? String(pin).trim() : ''

    if (!cleanEmail || !cleanPin) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Email dan PIN wajib diisi' }
      })
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: cleanEmail }
    })

    if (!adminUser || !adminUser.isActive) {
      return res.status(403).json({
        error: { code: 'ACCESS_DENIED', message: 'Akun tidak ditemukan atau tidak aktif' }
      })
    }

    if (!adminUser.securityPinHash) {
      return res.status(400).json({
        error: { code: 'PIN_NOT_SET', message: 'PIN belum diatur' }
      })
    }

    // Verifikasi PIN
    const isPinValid = await bcrypt.compare(cleanPin, adminUser.securityPinHash)
    if (!isPinValid) {
      return res.status(400).json({
        error: { code: 'INVALID_PIN', message: 'PIN tidak valid' }
      })
    }

    // Cari user ADMIN terkait
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    })

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'ACCESS_DENIED', message: 'User admin tidak ditemukan' }
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, adminRole: adminUser.role, adminUserId: adminUser.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    )

    return res.json({
      message: 'Verifikasi PIN berhasil',
      token,
      user: {
        ...presentUser(user),
        adminRole: adminUser.role,
        adminUserId: adminUser.id
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/auth/me
 * Memeriksa profil user saat ini dari JWT token
 */
authRouter.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token tidak disertakan' }
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch (jwtErr) {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }

    return res.json({
      user: presentUser(user)
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/auth/profile
 * Memuat profil lengkap pengguna termasuk data KYC untuk halaman edit profil.
 */
authRouter.get('/profile', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token tidak disertakan' }
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenantProfile: true,
        withdrawalAccounts: true
      }
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }

    let equipmentCount = 0
    let storeRating = { average: 5.0, count: 0 }
    if (user.role === 'PEMILIK') {
      equipmentCount = await prisma.equipment.count({
        where: { ownerId: user.id, isDeleted: false }
      })
      const reviewAgg = await prisma.review.aggregate({
        where: { equipment: { ownerId: user.id } },
        _avg: { rating: true },
        _count: { rating: true }
      })
      storeRating = {
        average: reviewAgg._count.rating > 0 ? Number((reviewAgg._avg.rating ?? 0).toFixed(1)) : 5.0,
        count: reviewAgg._count.rating
      }
    }
    const joinYear = new Date(user.createdAt).getFullYear()
    const presentedTp = presentTenantProfile(user.tenantProfile, user)

    return res.json({
      profile: {
        ...presentUserProfile(user),
        tenantProfile: presentedTp,
        equipmentCount,
        storeRating,
        joinYear,
        withdrawalAccounts: user.withdrawalAccounts || []
      },
      tenantProfile: presentedTp,
      equipmentCount,
      storeRating,
      joinYear,
      withdrawalAccounts: user.withdrawalAccounts || [],
      user: presentUser(user)
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/auth/profile
 * Memperbarui data profil yang diizinkan untuk diubah oleh penyewa.
 * Data legal / KYC (NIK, Nama KTP, Dokumen KTP, Status Verifikasi) dilindungi dan tidak dapat diubah di sini.
 */
authRouter.put('/profile', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token tidak disertakan' }
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }

    const body = req.body ?? {}

    // Validasi nomor telepon bila diubah
    const phoneToSet = body.phone !== undefined ? String(body.phone).trim() : user.phone
    if (phoneToSet && phoneToSet !== user.phone && phoneToSet !== '-') {
      const existingPhoneUser = await findUserByPhone(phoneToSet, user.id)
      if (existingPhoneUser) {
        return res.status(409).json({
          error: {
            code: 'PHONE_ALREADY_EXISTS',
            message: 'Nomor WhatsApp / telepon sudah terdaftar pada akun lain.'
          }
        })
      }
    }

    // Validasi nomor rekening bila diubah
    const bankAccountToSet = body.bankAccount !== undefined ? String(body.bankAccount).trim() : null
    const currentKyc = (user.kycData && typeof user.kycData === 'object') ? user.kycData : {}
    const currentAccount = currentKyc.bankAccount || currentKyc.bankAccountNumber || ''

    if (bankAccountToSet && bankAccountToSet !== currentAccount) {
      const cleanAcc = normalizeBankAccount(bankAccountToSet)
      if (cleanAcc.length >= 5) {
        const existingAccUser = await findUserByBankAccount(cleanAcc, user.id)
        if (existingAccUser) {
          return res.status(409).json({
            error: {
              code: 'BANK_ACCOUNT_ALREADY_EXISTS',
              message: 'Nomor rekening bank ini sudah terdaftar pada akun lain.'
            }
          })
        }
      }
    }

    // Validasi perubahan kata sandi (opsional)
    let hashedPassword = null
    if (body.newPassword) {
      if (!body.currentPassword) {
        return res.status(400).json({
          error: {
            code: 'CURRENT_PASSWORD_REQUIRED',
            message: 'Kata sandi saat ini wajib diisi untuk mengubah kata sandi'
          }
        })
      }
      const isCurrentValid = await bcrypt.compare(body.currentPassword, user.password)
      if (!isCurrentValid) {
        return res.status(400).json({
          error: {
            code: 'PASSWORD_MISMATCH',
            message: 'Kata sandi saat ini tidak cocok'
          }
        })
      }
      if (String(body.newPassword).length < 6) {
        return res.status(400).json({
          error: {
            code: 'INVALID_NEW_PASSWORD',
            message: 'Kata sandi baru minimal terdiri dari 6 karakter'
          }
        })
      }
      hashedPassword = await bcrypt.hash(body.newPassword, 10)
    }

    // Bangun payload kycData baru dengan menjaga ketat integritas field yang terkunci
    const updatedKyc = {
      ...currentKyc,

      // 🔒 Field yang WAJIB TERKUNCI (tidak boleh diubah sembarangan oleh penyewa)
      nik: currentKyc.nik,
      ktpName: currentKyc.ktpName,
      birthPlace: currentKyc.birthPlace,
      birthDate: currentKyc.birthDate,
      ktpFile: currentKyc.ktpFile,
      selfieFile: currentKyc.selfieFile,
      agreeTruth: currentKyc.agreeTruth,
      agreeTerms: currentKyc.agreeTerms,

      // ✏️ Field yang DAPAT DIUBAH (profil usaha, alamat, rekening refund)
      businessName: body.businessName !== undefined ? String(body.businessName).trim() : currentKyc.businessName,
      businessSector: body.businessSector !== undefined ? String(body.businessSector).trim() : currentKyc.businessSector,
      customSector: body.customSector !== undefined ? String(body.customSector).trim() : currentKyc.customSector,
      startYear: body.startYear !== undefined ? String(body.startYear).trim() : currentKyc.startYear,
      nib: body.nib !== undefined ? String(body.nib).trim() : currentKyc.nib,
      powerCapacity: body.powerCapacity !== undefined ? String(body.powerCapacity).trim() : currentKyc.powerCapacity,
      customPower: body.customPower !== undefined ? String(body.customPower).trim() : currentKyc.customPower,
      isManualPower: body.isManualPower !== undefined ? Boolean(body.isManualPower) : currentKyc.isManualPower,
      businessDesc: body.businessDesc !== undefined ? String(body.businessDesc).trim() : currentKyc.businessDesc,

      address: body.address !== undefined ? String(body.address).trim() : currentKyc.address,
      city: body.city !== undefined ? String(body.city).trim() : currentKyc.city,
      district: body.district !== undefined ? String(body.district).trim() : currentKyc.district,
      postalCode: body.postalCode !== undefined ? String(body.postalCode).trim() : currentKyc.postalCode,
      landmark: body.landmark !== undefined ? String(body.landmark).trim() : currentKyc.landmark,
      gpsCoords: body.gpsCoords !== undefined ? String(body.gpsCoords).trim() : currentKyc.gpsCoords,

      bankName: body.bankName !== undefined ? String(body.bankName).trim() : currentKyc.bankName,
      bankAccount: bankAccountToSet !== null ? bankAccountToSet : currentKyc.bankAccount,
      bankAccountHolder: body.bankAccountHolder !== undefined ? String(body.bankAccountHolder).trim() : currentKyc.bankAccountHolder
    }

    // Tangani unggahan foto usaha (frontPhoto & productionPhoto) bila dikirim baru
    if (body.frontPhoto !== undefined) {
      updatedKyc.frontPhoto = normalizeFileValue(body.frontPhoto)
    }
    if (body.productionPhoto !== undefined) {
      updatedKyc.productionPhoto = normalizeFileValue(body.productionPhoto)
    }

    // Recalculate batas daya listrik (Watt)
    const dayaListrik = resolvePowerLimit(updatedKyc)
    if (dayaListrik !== null) {
      updatedKyc.dayaListrik = dayaListrik
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: body.fullName ? String(body.fullName).trim() : user.fullName,
        phone: phoneToSet,
        ...(hashedPassword ? { password: hashedPassword } : {}),
        kycData: updatedKyc
      }
    })

    // Upsert TenantProfile bila ada perubahan profil toko atau untuk pemilik akun
    const tpPayload = body.tenantProfile && typeof body.tenantProfile === 'object' ? body.tenantProfile : body
    const fallbackTp = buildTenantProfileFallback(user)
    const existingTp = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })

    const hasTpUpdate = [
      'storeName', 'storeDescription', 'storeCategory', 'whatsappNumber',
      'address', 'city', 'serviceRadius', 'operatingHours',
      'ktpVerified', 'nibVerified', 'bankAccountVerified', 'npwpVerified',
      'notifPesananBaru', 'notifPengembalianAlat', 'notifInspeksiDeposit', 'notifRingkasanMingguan'
    ].some((k) => tpPayload[k] !== undefined)

    if (hasTpUpdate || user.role === 'PEMILIK') {
      const dataToSave = {
        storeName: tpPayload.storeName !== undefined ? String(tpPayload.storeName).trim() : (existingTp?.storeName ?? fallbackTp.storeName),
        storeDescription: tpPayload.storeDescription !== undefined ? String(tpPayload.storeDescription).trim() : (existingTp?.storeDescription ?? fallbackTp.storeDescription),
        storeCategory: tpPayload.storeCategory !== undefined ? String(tpPayload.storeCategory).trim() : (existingTp?.storeCategory ?? fallbackTp.storeCategory),
        whatsappNumber: tpPayload.whatsappNumber !== undefined ? String(tpPayload.whatsappNumber).trim() : (existingTp?.whatsappNumber ?? fallbackTp.whatsappNumber),
        address: tpPayload.address !== undefined ? String(tpPayload.address).trim() : (existingTp?.address ?? fallbackTp.address),
        city: tpPayload.city !== undefined ? String(tpPayload.city).trim() : (existingTp?.city ?? fallbackTp.city),
        serviceRadius: tpPayload.serviceRadius !== undefined && tpPayload.serviceRadius !== null ? Number(tpPayload.serviceRadius) : (existingTp?.serviceRadius ?? fallbackTp.serviceRadius),
        operatingHours: tpPayload.operatingHours !== undefined ? tpPayload.operatingHours : (existingTp?.operatingHours ?? fallbackTp.operatingHours),
        ktpVerified: tpPayload.ktpVerified !== undefined ? Boolean(tpPayload.ktpVerified) : (existingTp?.ktpVerified ?? fallbackTp.ktpVerified),
        nibVerified: tpPayload.nibVerified !== undefined ? Boolean(tpPayload.nibVerified) : (existingTp?.nibVerified ?? fallbackTp.nibVerified),
        bankAccountVerified: tpPayload.bankAccountVerified !== undefined ? Boolean(tpPayload.bankAccountVerified) : (existingTp?.bankAccountVerified ?? fallbackTp.bankAccountVerified),
        npwpVerified: tpPayload.npwpVerified !== undefined ? Boolean(tpPayload.npwpVerified) : (existingTp?.npwpVerified ?? false),
        notifPesananBaru: tpPayload.notifPesananBaru !== undefined ? Boolean(tpPayload.notifPesananBaru) : (existingTp?.notifPesananBaru ?? true),
        notifPengembalianAlat: tpPayload.notifPengembalianAlat !== undefined ? Boolean(tpPayload.notifPengembalianAlat) : (existingTp?.notifPengembalianAlat ?? true),
        notifInspeksiDeposit: tpPayload.notifInspeksiDeposit !== undefined ? Boolean(tpPayload.notifInspeksiDeposit) : (existingTp?.notifInspeksiDeposit ?? false),
        notifRingkasanMingguan: tpPayload.notifRingkasanMingguan !== undefined ? Boolean(tpPayload.notifRingkasanMingguan) : (existingTp?.notifRingkasanMingguan ?? true)
      }

      await prisma.tenantProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...dataToSave
        },
        update: dataToSave
      })
    }

    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        tenantProfile: true,
        withdrawalAccounts: true
      }
    })

    let equipmentCount = 0
    let storeRating = { average: 5.0, count: 0 }
    if (freshUser.role === 'PEMILIK') {
      equipmentCount = await prisma.equipment.count({
        where: { ownerId: freshUser.id, isDeleted: false }
      })
      const reviewAgg = await prisma.review.aggregate({
        where: { equipment: { ownerId: freshUser.id } },
        _avg: { rating: true },
        _count: { rating: true }
      })
      storeRating = {
        average: reviewAgg._count.rating > 0 ? Number((reviewAgg._avg.rating ?? 0).toFixed(1)) : 5.0,
        count: reviewAgg._count.rating
      }
    }
    const joinYear = new Date(freshUser.createdAt).getFullYear()
    const presentedTp = presentTenantProfile(freshUser.tenantProfile, freshUser)

    return res.json({
      message: 'Profil berhasil diperbarui',
      profile: {
        ...presentUserProfile(freshUser),
        tenantProfile: presentedTp,
        equipmentCount,
        storeRating,
        joinYear,
        withdrawalAccounts: freshUser.withdrawalAccounts || []
      },
      tenantProfile: presentedTp,
      equipmentCount,
      storeRating,
      joinYear,
      withdrawalAccounts: freshUser.withdrawalAccounts || [],
      user: presentUser(freshUser)
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/auth/submission-status/:emailOrId
 * Mengecek status terkini pengajuan verifikasi (KYC).
 *
 * Bisa dipanggil tanpa login (frontend memakainya di layar "tunggu verifikasi"),
 * namun bila header Authorization tersedia, data yang sama hanya dikembalikan
 * untuk akun yang sedang login.
 *
 * Response memuat: verificationStatus, submissionCode, revisionSteps,
 * adminNote, dan kycData (seluruh data Step 1-5).
 */
authRouter.get('/submission-status/:emailOrId', async (req, res, next) => {
  try {
    const identifier = String(req.params.emailOrId ?? '').trim()
    if (!identifier) {
      return res.status(400).json({
        error: { code: 'IDENTIFIER_REQUIRED', message: 'Email atau id pengajuan wajib diisi' }
      })
    }

    // Bila ada token, pastikan user yang login adalah pemilik pengajuan ini.
    // Admin boleh melihat pengajuan siapa pun.
    let authenticatedUserId = null
    let authenticatedRole = null
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice('Bearer '.length).trim(), config.jwtSecret)
        authenticatedUserId = decoded.userId
        authenticatedRole = String(decoded.role || '').toUpperCase()
      } catch {
        // Token tidak valid → tetap boleh melihat status publik (endpoint ini publik).
      }
    }

    const lowered = identifier.toLowerCase()
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: lowered },
          { id: identifier },
          { submissionCode: identifier.toUpperCase() }
        ]
      }
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'SUBMISSION_NOT_FOUND', message: 'Pengajuan tidak ditemukan' }
      })
    }

    if (authenticatedUserId && authenticatedRole !== 'ADMIN' && authenticatedUserId !== user.id) {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Pengajuan ini bukan milik akun yang sedang login'
        }
      })
    }

    return res.json({
      message: 'Status pengajuan berhasil dimuat',
      status: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        submissionCode: user.submissionCode ?? null,
        verificationStatus: user.verificationStatus ?? 'MENUNGGU',
        revisionSteps: Array.isArray(user.revisionSteps) ? user.revisionSteps : [],
        adminNote: user.adminNote ?? null,
        kycData: user.kycData ?? {},
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    next(error)
  }
})
