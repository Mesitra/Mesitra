import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { config } from '../config.js'

export const equipmentsRouter = Router()

/**
 * Ekstrak foto profil pemilik dari data akun atau kycData.
 * Mendukung string URL langsung atau objek file { url, preview, dataUrl }.
 * Prioritas: profilePhoto > avatarUrl > photo > selfieFile > frontPhoto.
 *
 * @param {object|null} owner
 * @returns {string|null} URL foto atau data URL, atau null jika tidak ada
 */
function extractOwnerPhoto(owner) {
  if (!owner) return null
  const kyc = owner.kycData && typeof owner.kycData === 'object' ? owner.kycData : {}
  const candidates = [
    owner.profilePhoto,
    owner.avatarUrl,
    owner.photo,
    kyc.profilePhoto,
    kyc.avatarUrl,
    kyc.photo,
    kyc.selfieFile,
    kyc.frontPhoto
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
    if (typeof candidate === 'object') {
      const url = candidate.preview || candidate.url || candidate.dataUrl
      if (url && typeof url === 'string' && url.trim()) {
        return url.trim()
      }
    }
  }
  return null
}

/**
 * Bentuk alat yang dikembalikan ke frontend.
 *
 * `images` disimpan di database sebagai JSON array string, tetapi bisa juga
 * berisi objek / null depending on input. Yang dipakai frontend hanya URL
 * gambar, jadi sisanya dibuang.
 *
 * @param {object} equipment - baris equipment dari Prisma (lengkap dengan owner)
 * @param {Array} [bookedRanges] - array rentang tanggal yang sudah dipesan
 * @returns {object}
 */
function presentEquipment(equipment, bookedRanges = []) {
  const rawImages = Array.isArray(equipment.images) ? equipment.images : []
  const images = rawImages
    .map((image) => (typeof image === 'string' ? image : image?.url ?? image?.src ?? null))
    .filter((url) => typeof url === 'string' && url.length > 0)

  const rawAccessories = Array.isArray(equipment.accessories) ? equipment.accessories : []
  const accessories = rawAccessories.map((item) => (typeof item === 'string' ? item : item?.name ?? String(item)))

  const rawDelivery = Array.isArray(equipment.deliveryMethods) ? equipment.deliveryMethods : []
  const deliveryMethods = rawDelivery.length > 0 ? rawDelivery : ['PICKUP', 'COURIER']
  const deliveryFee = equipment.deliveryFee !== undefined && equipment.deliveryFee !== null
    ? Number(equipment.deliveryFee)
    : 45000

  const ownerKyc = equipment.owner?.kycData && typeof equipment.owner.kycData === 'object'
    ? equipment.owner.kycData
    : {}
  const ownerBusinessName = ownerKyc.businessName || null
  const ownerPhoto = extractOwnerPhoto(equipment.owner)
  const ownerDisplayName = ownerBusinessName || equipment.owner?.fullName || 'Pemilik Alat'
  const ownerShopLocation =
    [ownerKyc.district, ownerKyc.city].filter(Boolean).join(', ') ||
    ownerKyc.address ||
    equipment.location

  return {
    id: equipment.id,
    name: equipment.name,
    category: equipment.category,
    description: equipment.description,
    pricePerDay: equipment.pricePerDay,
    deposit: equipment.deposit,
    powerWatt: equipment.powerWatt,
    weightKg: equipment.weightKg,
    dimensions: equipment.dimensions,
    minRentDays: equipment.minRentDays ?? 1,
    maintenanceBufferDays: equipment.maintenanceBufferDays ?? 1,
    location: equipment.location,
    distance: equipment.distance,
    status: equipment.status,
    condition: equipment.condition || 'Prima',
    accessories,
    deliveryMethods,
    deliveryFee,
    isDeleted: Boolean(equipment.isDeleted),
    images,
    stock: equipment.stock,
    createdAt: equipment.createdAt,
    updatedAt: equipment.updatedAt,
    owner: equipment.owner
      ? {
          id: equipment.owner.id,
          name: equipment.owner.fullName,
          fullName: equipment.owner.fullName,
          businessName: ownerBusinessName,
          displayName: ownerDisplayName,
          email: equipment.owner.email,
          phone: equipment.owner.phone,
          role: equipment.owner.role,
          verificationStatus: equipment.owner.verificationStatus,
          photo: ownerPhoto,
          address: ownerKyc.address || null,
          city: ownerKyc.city || null,
          district: ownerKyc.district || null,
          landmark: ownerKyc.landmark || null,
          businessSector: ownerKyc.businessSector || null,
          shopLocation: ownerShopLocation
        }
      : null,
    // Rentang tanggal yang sudah terisi oleh pesanan aktif/bayar
    bookedRanges
  }
}

/**
 * Bangun map dayStatus dari daftar pesanan aktif pada alat ini.
 * Status 'terisi' akan ditandai untuk setiap hari dalam rentang sewa,
 * ditambah buffer maintenance setelah selesai.
 *
 * @param {Array} orders - daftar order dengan startDate, endDate
 * @param {number} bufferDays - jeda perawatan setelah sewa selesai
 * @returns {object} { 'YYYY-MM-DD': 'terisi'|'buffer' }
 */
function buildDayStatusFromOrders(orders, bufferDays = 1) {
  const dayStatus = {}

  for (const order of orders) {
    const start = new Date(order.startDate)
    const end = new Date(order.endDate)

    // Tandai hari sewa sebagai 'terisi'
    const cur = new Date(start)
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      dayStatus[key] = 'terisi'
      cur.setDate(cur.getDate() + 1)
    }

    // Tandai hari buffer setelah sewa sebagai 'buffer'
    const bufStart = new Date(end)
    bufStart.setDate(bufStart.getDate() + 1)
    for (let i = 0; i < bufferDays; i++) {
      const key = bufStart.toISOString().slice(0, 10)
      if (!dayStatus[key]) dayStatus[key] = 'buffer'
      bufStart.setDate(bufStart.getDate() + 1)
    }
  }

  return dayStatus
}

/**
 * GET /api/equipments
 *
 * Daftar alat yang siap disewa beserta info pemiliknya.
 * Didukung filter sederhana lewat query string:
 *  - `category`       → filter kategori (case-insensitive)
 *  - `search`         → cari pada nama / kategori / deskripsi
 *  - `ownerId`        → filter berdasarkan pemilik tertentu
 *  - `status`         → filter status spesifik (TERSEDIA, DISEWA, INSPEKSI, NONAKTIF)
 *  - `allStatus`      → jika 'true', kembalikan semua status
 *  - `includeDeleted` → jika 'true', ikut sertakan item yang di-soft-delete
 *  - `sortRating`     → 'desc' untuk rating tertinggi, 'asc' untuk rating terendah
 */
equipmentsRouter.get('/', async (req, res, next) => {
  try {
    const { category, search, ownerId, status, allStatus, includeDeleted, sortRating } = req.query ?? {}

    const where = {}

    if (includeDeleted !== 'true') {
      where.isDeleted = false
    }

    if (status) {
      where.status = String(status)
    } else if (allStatus !== 'true' && !ownerId) {
      where.status = 'TERSEDIA'
    }

    if (category) {
      where.category = String(category)
    }

    if (ownerId) {
      where.ownerId = String(ownerId)
    }

    if (search) {
      const keyword = String(search).trim()
      if (keyword) {
        where.OR = [
          { name: { contains: keyword } },
          { category: { contains: keyword } },
          { description: { contains: keyword } }
        ]
      }
    }

    const orderBy = ownerId
      ? [{ createdAt: 'desc' }]
      : [{ distance: 'asc' }, { createdAt: 'desc' }]

    const equipments = await prisma.equipment.findMany({
      where,
      include: {
        owner: true,
        reviews: {
          select: { id: true, rating: true }
        },
        orders: {
          where: {
            status: {
              in: ['MENUNGGU_PEMBAYARAN', 'MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI']
            }
          },
          select: { id: true, startDate: true, endDate: true, status: true }
        }
      },
      orderBy
    })

    const data = equipments.map((e) => {
      const bookedRanges = (e.orders || []).map((o) => ({
        id: o.id,
        startDate: o.startDate.toISOString().slice(0, 10),
        endDate: o.endDate.toISOString().slice(0, 10),
        status: o.status
      }))

      const dayStatus = buildDayStatusFromOrders(e.orders || [], e.maintenanceBufferDays)

      const revList = e.reviews || []
      const ratingCount = revList.length
      const averageRating =
        ratingCount > 0
          ? Number((revList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / ratingCount).toFixed(1))
          : null

      return {
        ...presentEquipment(e, bookedRanges),
        dayStatus,
        averageRating,
        ratingCount
      }
    })

    if (sortRating === 'desc' || sortRating === 'asc') {
      data.sort((a, b) => {
        const aHas = typeof a.averageRating === 'number' && !isNaN(a.averageRating)
        const bHas = typeof b.averageRating === 'number' && !isNaN(b.averageRating)

        // Null handling: alat tanpa ulasan selalu ditempatkan di paling bawah
        if (!aHas && !bHas) return 0
        if (!aHas) return 1
        if (!bHas) return -1

        if (sortRating === 'desc') {
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating
          }
        } else {
          if (a.averageRating !== b.averageRating) {
            return a.averageRating - b.averageRating
          }
        }

        // Secondary sorting: review terbanyak, lalu jarak terdekat
        if (b.ratingCount !== a.ratingCount) {
          return b.ratingCount - a.ratingCount
        }
        return (a.distance ?? 0) - (b.distance ?? 0)
      })
    }

    res.json({ data })
  } catch (error) {
    next(error)
  }
})

/**
 * Middleware untuk memastikan request memiliki token JWT valid dan role PEMILIK atau ADMIN.
 */
function requireOwnerAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token otentikasi wajib disertakan' }
    })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret)
    const role = String(decoded.role || '').toUpperCase()

    if (role !== 'PEMILIK' && role !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Akses khusus untuk akun pemilik alat' }
      })
    }

    req.user = { id: decoded.userId, ...decoded }
    req.userId = decoded.userId
    req.userRole = role
    next()
  } catch {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau kedaluwarsa' }
    })
  }
}

/**
 * GET /api/equipments/me
 *
 * Endpoint privat untuk akun pemilik alat (autentikasi JWT).
 * Menampilkan daftar alat milik akun yang sedang login dengan status ketersediaan
 * yang dikalkulasi secara real-time berdasarkan pesanan (Order) aktif:
 * - Order aktif berstatus DISEWA / SEWA_AKTIF / DIKIRIM -> "Sedang disewa"
 * - Order aktif berstatus INSPEKSI / DISPUTE            -> "Inspeksi"
 * - Tidak ada order pengunci dan isActive true         -> "Tersedia"
 * - isActive false (atau NONAKTIF/soft-delete)          -> "Nonaktif"
 */
equipmentsRouter.get('/me', requireOwnerAuth, async (req, res, next) => {
  try {
    const ownerId = req.user.id

    const equipments = await prisma.equipment.findMany({
      where: {
        ownerId
      },
      include: {
        owner: true,
        orders: {
          where: {
            status: {
              in: [
                'MENUNGGU_PEMBAYARAN',
                'MENUNGGU_KONFIRMASI',
                'DIKIRIM',
                'SEWA_AKTIF',
                'INSPEKSI',
                'DISPUTE'
              ]
            }
          },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            rentalCost: true,
            depositAmount: true,
            totalPaid: true
          }
        },
        reviews: {
          select: { id: true, rating: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const data = equipments.map((eq) => {
      const orders = eq.orders || []

      // Order aktif dengan status sewa aktif
      const hasDisewa = orders.some((o) => {
        const st = String(o.status || '').toUpperCase()
        return st === 'DISEWA' || st === 'SEWA_AKTIF' || st === 'DIKIRIM'
      })

      // Order aktif dengan status inspeksi atau sengketa klaim
      const hasInspeksi = orders.some((o) => {
        const st = String(o.status || '').toUpperCase()
        return st === 'INSPEKSI' || st === 'DISPUTE'
      })

      // Cek apakah alat berstatus aktif
      const isActive =
        (eq.isActive !== undefined ? Boolean(eq.isActive) : true) &&
        !eq.isDeleted &&
        String(eq.status || '').toUpperCase() !== 'NONAKTIF'

      // Kalkulasi status ketersediaan real-time
      let calculatedStatus = 'Tersedia'
      let statusCode = 'TERSEDIA'

      if (hasDisewa) {
        calculatedStatus = 'Sedang disewa'
        statusCode = 'DISEWA'
      } else if (hasInspeksi) {
        calculatedStatus = 'Inspeksi'
        statusCode = 'INSPEKSI'
      } else if (!isActive) {
        calculatedStatus = 'Nonaktif'
        statusCode = 'NONAKTIF'
      } else {
        calculatedStatus = 'Tersedia'
        statusCode = 'TERSEDIA'
      }

      const bookedRanges = orders.map((o) => ({
        id: o.id,
        startDate: o.startDate.toISOString().slice(0, 10),
        endDate: o.endDate.toISOString().slice(0, 10),
        status: o.status
      }))

      const presented = presentEquipment(eq, bookedRanges)

      return {
        ...presented,
        status: calculatedStatus,
        statusCode,
        rawStatus: eq.status,
        isActive,
        nama: eq.name,
        name: eq.name,
        daya: `${eq.powerWatt || 0} W`,
        powerWatt: eq.powerWatt || 0,
        kategori: eq.category,
        category: eq.category,
        deskripsi: eq.description,
        description: eq.description,
        harga: eq.pricePerDay,
        pricePerDay: eq.pricePerDay,
        deposit: eq.deposit,
        fotoCount: Array.isArray(presented.images) && presented.images.length > 0 ? presented.images.length : 1
      }
    })

    res.json({ data })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/equipments
 *
 * Tambah alat baru oleh pemilik (autentikasi JWT).
 */
equipmentsRouter.post('/', requireOwnerAuth, async (req, res, next) => {
  try {
    const ownerId = req.user.id

    const {
      name,
      category,
      description = '',
      pricePerDay,
      deposit,
      powerWatt = 0,
      weightKg = 10,
      dimensions = '40 × 30 × 30 cm',
      minRentDays = 1,
      maintenanceBufferDays = 1,
      location = 'Jakarta Selatan',
      distance = 2.0,
      status = 'TERSEDIA',
      condition = 'Prima',
      accessories = [],
      deliveryMethods = ['PICKUP', 'COURIER'],
      deliveryFee = 45000,
      stock = 1,
      images = []
    } = req.body ?? {}

    if (!name || !category || pricePerDay === undefined || deposit === undefined) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Nama, kategori, tarif sewa, dan deposit wajib diisi' }
      })
    }

    const formattedAccessories = Array.isArray(accessories)
      ? accessories.map((a) => (typeof a === 'string' ? a.trim() : a?.name?.trim())).filter(Boolean)
      : []

    const formattedDelivery =
      Array.isArray(deliveryMethods) && deliveryMethods.length > 0
        ? deliveryMethods.map((m) => String(m).trim().toUpperCase()).filter(Boolean)
        : ['PICKUP', 'COURIER']

    if (formattedDelivery.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Pilih minimal satu metode pengiriman' }
      })
    }

    const formattedImages =
      Array.isArray(images) && images.length > 0
        ? images
            .map((url) => (typeof url === 'string' ? url.trim() : url?.url?.trim()))
            .filter((url) => typeof url === 'string' && url.length > 0)
        : []

    const ownerUser = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { kycData: true }
    })
    const ownerKycData = ownerUser?.kycData && typeof ownerUser.kycData === 'object' ? ownerUser.kycData : {}
    const ownerDistrictCity = [ownerKycData.district, ownerKycData.city].filter(Boolean).join(', ')
    const resolvedLocation =
      location && location !== 'Jakarta Selatan'
        ? String(location).trim()
        : ownerDistrictCity || ownerKycData.address || String(location || 'Jakarta Selatan').trim()

    const created = await prisma.equipment.create({
      data: {
        ownerId,
        name: String(name).trim(),
        category: String(category).trim(),
        description: String(description).trim(),
        pricePerDay: Math.max(0, Math.round(Number(pricePerDay)) || 0),
        deposit: Math.max(0, Math.round(Number(deposit)) || 0),
        powerWatt: Math.max(0, Math.round(Number(powerWatt)) || 0),
        weightKg: Math.max(0, parseFloat(weightKg) || 10),
        dimensions: String(dimensions || '40 × 30 × 30 cm').trim(),
        minRentDays: Math.max(1, Math.round(Number(minRentDays)) || 1),
        maintenanceBufferDays: Math.max(0, Math.round(Number(maintenanceBufferDays)) || 0),
        location: resolvedLocation,
        distance: Number(distance) || 2.0,
        status: status || 'TERSEDIA',
        condition: String(condition || 'Prima').trim(),
        accessories: formattedAccessories,
        deliveryMethods: formattedDelivery,
        deliveryFee: Math.max(0, Math.round(Number(deliveryFee)) || 0),
        stock: Math.max(1, Math.round(Number(stock)) || 1),
        isDeleted: false,
        images: formattedImages
      },
      include: { owner: true }
    })

    return res.status(201).json({
      data: presentEquipment(created),
      message: 'Alat berhasil ditambahkan ke katalog.'
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT/PATCH /api/equipments/:id
 *
 * Perbarui detail alat oleh pemiliknya.
 */
async function handleUpdateEquipment(req, res, next) {
  try {
    const userId = req.user.id
    const userRole = req.userRole

    const id = String(req.params.id ?? '').trim()
    if (!id) {
      throw new ApiError(400, 'INVALID_ID', 'ID alat wajib diisi')
    }

    const existing = await prisma.equipment.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new ApiError(404, 'EQUIPMENT_NOT_FOUND', `Alat dengan id '${id}' tidak ditemukan`)
    }

    if (existing.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses untuk mengubah alat ini' }
      })
    }

    const {
      name,
      category,
      description,
      pricePerDay,
      deposit,
      powerWatt,
      weightKg,
      dimensions,
      minRentDays,
      maintenanceBufferDays,
      location,
      distance,
      status,
      condition,
      accessories,
      deliveryMethods,
      deliveryFee,
      stock,
      images,
      isActive,
      isDeleted
    } = req.body ?? {}

    // Proteksi status pesanan aktif jika menonaktifkan alat
    const willDeactivate =
      (isActive !== undefined && !isActive) ||
      (status !== undefined && String(status).toUpperCase() === 'NONAKTIF') ||
      (isDeleted !== undefined && Boolean(isDeleted))

    if (willDeactivate) {
      const activeOrdersCount = await prisma.order.count({
        where: {
          equipmentId: id,
          status: {
            in: ['MENUNGGU_PEMBAYARAN', 'MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI', 'DISPUTE']
          }
        }
      })

      if (activeOrdersCount > 0) {
        return res.status(400).json({
          error: {
            code: 'ACTIVE_ORDERS_EXIST',
            message: 'Alat tidak dapat dinonaktifkan karena sedang memiliki pesanan atau transaksi aktif.'
          }
        })
      }
    }

    const data = {}
    if (name !== undefined) data.name = String(name).trim()
    if (category !== undefined) data.category = String(category).trim()
    if (description !== undefined) data.description = String(description).trim()
    if (pricePerDay !== undefined) data.pricePerDay = Math.max(0, Math.round(Number(pricePerDay)) || 0)
    if (deposit !== undefined) data.deposit = Math.max(0, Math.round(Number(deposit)) || 0)
    if (powerWatt !== undefined) data.powerWatt = Math.max(0, Math.round(Number(powerWatt)) || 0)
    if (weightKg !== undefined) data.weightKg = Math.max(0, parseFloat(weightKg) || 10)
    if (dimensions !== undefined) data.dimensions = String(dimensions).trim()
    if (minRentDays !== undefined) data.minRentDays = Math.max(1, Math.round(Number(minRentDays)) || 1)
    if (maintenanceBufferDays !== undefined) {
      data.maintenanceBufferDays = Math.max(0, Math.round(Number(maintenanceBufferDays)) || 0)
    }
    if (location !== undefined) data.location = String(location).trim()
    if (distance !== undefined) data.distance = Number(distance) || 2.0
    if (condition !== undefined) data.condition = String(condition).trim()
    if (stock !== undefined) data.stock = Math.max(1, Math.round(Number(stock)) || 1)
    if (isDeleted !== undefined) data.isDeleted = Boolean(isDeleted)

    if (deliveryFee !== undefined && !isNaN(Number(deliveryFee))) {
      data.deliveryFee = Math.max(0, Math.round(Number(deliveryFee)) || 0)
    }

    if (status !== undefined) {
      data.status = status
    } else if (isActive !== undefined) {
      data.status = isActive ? 'TERSEDIA' : 'NONAKTIF'
    }

    if (accessories !== undefined && Array.isArray(accessories)) {
      data.accessories = accessories
        .map((a) => (typeof a === 'string' ? a.trim() : a?.name?.trim()))
        .filter(Boolean)
    }

    if (deliveryMethods !== undefined && Array.isArray(deliveryMethods)) {
      const sanitizedDelivery = deliveryMethods.map((m) => String(m).trim().toUpperCase()).filter(Boolean)
      if (sanitizedDelivery.length === 0) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Pilih minimal satu metode pengiriman' }
        })
      }
      data.deliveryMethods = sanitizedDelivery
    }

    if (images !== undefined && Array.isArray(images)) {
      data.images = images
        .map((url) => (typeof url === 'string' ? url.trim() : url?.url?.trim()))
        .filter((url) => typeof url === 'string' && url.length > 0)
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data,
      include: { owner: true }
    })

    return res.json({
      data: presentEquipment(updated),
      message: 'Alat berhasil diperbarui.'
    })
  } catch (error) {
    next(error)
  }
}

equipmentsRouter.put('/:id', requireOwnerAuth, handleUpdateEquipment)
equipmentsRouter.patch('/:id', requireOwnerAuth, handleUpdateEquipment)

/**
 * DELETE /api/equipments/:id
 *
 * Hapus alat oleh pemilik dengan mekanisme Safe Soft-Delete jika alat sudah memiliki riwayat Order.
 * Memblokir penghapusan jika alat sedang memiliki pesanan aktif.
 */
equipmentsRouter.delete('/:id', requireOwnerAuth, async (req, res, next) => {
  try {
    const userId = req.user.id
    const userRole = req.userRole

    const id = String(req.params.id ?? '').trim()
    if (!id) {
      throw new ApiError(400, 'INVALID_ID', 'ID alat wajib diisi')
    }

    const existing = await prisma.equipment.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new ApiError(404, 'EQUIPMENT_NOT_FOUND', `Alat dengan id '${id}' tidak ditemukan`)
    }

    if (existing.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses untuk menghapus alat ini' }
      })
    }

    // Proteksi: Cek pesanan yang sedang aktif/berjalan
    const activeOrdersCount = await prisma.order.count({
      where: {
        equipmentId: id,
        status: {
          in: ['MENUNGGU_PEMBAYARAN', 'MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI', 'DISPUTE']
        }
      }
    })

    if (activeOrdersCount > 0) {
      return res.status(400).json({
        error: {
          code: 'ACTIVE_ORDERS_EXIST',
          message: 'Alat tidak dapat dihapus karena masih memiliki pesanan yang sedang berjalan.'
        }
      })
    }

    const totalOrdersCount = await prisma.order.count({
      where: { equipmentId: id }
    })

    if (totalOrdersCount > 0) {
      // Safe delete: soft delete agar integritas data Order masa lalu tetap utuh
      const updated = await prisma.equipment.update({
        where: { id },
        data: {
          isDeleted: true,
          status: 'NONAKTIF'
        },
        include: { owner: true }
      })

      return res.json({
        data: presentEquipment(updated),
        message: 'Alat berhasil diarsipkan dengan aman karena memiliki riwayat pesanan.',
        softDeleted: true
      })
    } else {
      // Hard delete aman jika belum ada transaksi sama sekali
      await prisma.equipment.delete({
        where: { id }
      })

      return res.json({
        data: { id },
        message: 'Alat berhasil dihapus permanen.',
        softDeleted: false
      })
    }
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/equipments/:id
 *
 * Detail satu alat.
 */
equipmentsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '').trim()
    if (!id) {
      throw new ApiError(400, 'INVALID_ID', 'ID alat wajib diisi')
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        owner: true,
        reviews: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, kycData: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          where: {
            status: {
              in: ['MENUNGGU_PEMBAYARAN', 'MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI']
            }
          },
          select: { id: true, startDate: true, endDate: true, status: true }
        }
      }
    })

    if (!equipment) {
      throw new ApiError(404, 'EQUIPMENT_NOT_FOUND', `Alat dengan id '${id}' tidak ditemukan`)
    }

    const bookedRanges = equipment.orders.map((o) => ({
      id: o.id,
      startDate: o.startDate.toISOString().slice(0, 10),
      endDate: o.endDate.toISOString().slice(0, 10),
      status: o.status
    }))

    const dayStatus = buildDayStatusFromOrders(equipment.orders, equipment.maintenanceBufferDays)

    const reviews = (equipment.reviews || []).map((r) => {
      const userKyc = r.user?.kycData && typeof r.user.kycData === 'object' ? r.user.kycData : {}
      return {
        id: r.id,
        orderId: r.orderId,
        userId: r.userId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: r.user
          ? {
              id: r.user.id,
              fullName: r.user.fullName,
              businessName: userKyc.businessName || null,
              photo: extractOwnerPhoto(r.user)
            }
          : null
      }
    })
    const ratingCount = reviews.length
    const averageRating =
      ratingCount > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount).toFixed(1))
        : 5.0

    const presented = {
      ...presentEquipment(equipment, bookedRanges),
      dayStatus,
      reviews,
      averageRating,
      ratingCount
    }

    res.json({ data: presented })
  } catch (error) {
    next(error)
  }
})
