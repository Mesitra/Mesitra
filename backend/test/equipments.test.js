import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before } from 'node:test'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { config } from '../src/config.js'

/**
 * Test endpoint katalog alat:
 *   GET /api/equipments     → daftar alat TERSEDIA + info pemilik
 *   GET /api/equipments/:id → detail satu alat
 *   POST /api/equipments    → tambah alat baru
 *   PUT /api/equipments/:id → perbarui alat
 *   DELETE /api/equipments/:id → hapus alat (safe soft delete)
 *
 * Data uji dibuat sendiri (bukan mengandalkan seeder) supaya test tetap valid
 * walaupun database sedang berisi data lain.
 */

const OWNER_EMAIL = 'equipments_test_owner@myrent.id'
const EQUIPMENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const HIDDEN_EQUIPMENT_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

let server
let baseUrl
let ownerId
let ownerToken

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      email: OWNER_EMAIL,
      password: 'Password123!',
      role: 'PEMILIK',
      fullName: 'Pemilik Uji Coba',
      phone: '081200000001',
      verificationStatus: 'DISETUJUI'
    }
  })

  ownerId = owner.id
  ownerToken = jwt.sign({ userId: owner.id, role: owner.role }, config.jwtSecret, { expiresIn: '1h' })

  await prisma.equipment.upsert({
    where: { id: EQUIPMENT_ID },
    update: {},
    create: {
      id: EQUIPMENT_ID,
      ownerId,
      name: 'Espresso Machine Uji Coba',
      category: 'Mesin Kopi',
      description: 'Mesin espresso untuk pengujian endpoint katalog.',
      pricePerDay: 150000,
      deposit: 500000,
      powerWatt: 1300,
      weightKg: 45,
      dimensions: '58 x 49 x 41 cm',
      maintenanceBufferDays: 1,
      location: 'Kec. Cilandak, Jakarta Selatan',
      distance: 2.4,
      status: 'TERSEDIA',
      images: ['https://example.test/mesin-kopi.jpg']
    }
  })

  // Alat berstatus DISEWA harus disembunyikan dari daftar katalog.
  await prisma.equipment.upsert({
    where: { id: HIDDEN_EQUIPMENT_ID },
    update: {},
    create: {
      id: HIDDEN_EQUIPMENT_ID,
      ownerId,
      name: 'Oven Uji Coba (Disewa)',
      category: 'Oven & Bakery',
      description: 'Alat status DISEWA, tidak boleh muncul di katalog.',
      pricePerDay: 210000,
      deposit: 750000,
      powerWatt: 2200,
      weightKg: 85,
      dimensions: '90 x 70 x 60 cm',
      maintenanceBufferDays: 2,
      location: 'Kec. Kebayoran Baru, Jakarta Selatan',
      distance: 3.1,
      status: 'DISEWA',
      images: []
    }
  })
})

after(async () => {
  try {
    await prisma.equipment.deleteMany({
      where: { id: { in: [EQUIPMENT_ID, HIDDEN_EQUIPMENT_ID] } }
    })
    await prisma.user.deleteMany({ where: { email: OWNER_EMAIL } })
  } catch {
    // ignore
  } finally {
    server.close()
    await prisma.$disconnect()
  }
})

const api = (path) => fetch(`${baseUrl}${path}`)

test('GET /api/equipments hanya mengembalikan alat berstatus TERSEDIA', async () => {
  const res = await api('/api/equipments')
  assert.equal(res.status, 200)

  const body = await res.json()
  assert.ok(Array.isArray(body.data))

  const ids = body.data.map((item) => item.id)
  assert.ok(ids.includes(EQUIPMENT_ID))
  assert.ok(!ids.includes(HIDDEN_EQUIPMENT_ID))
  assert.ok(body.data.every((item) => item.status === 'TERSEDIA'))
})

test('GET /api/equipments menyertakan data field database dan info pemilik', async () => {
  const res = await api('/api/equipments')
  const body = await res.json()

  const equipment = body.data.find((item) => item.id === EQUIPMENT_ID)
  assert.ok(equipment)

  assert.equal(equipment.name, 'Espresso Machine Uji Coba')
  assert.equal(equipment.category, 'Mesin Kopi')
  assert.equal(equipment.pricePerDay, 150000)
  assert.equal(equipment.deposit, 500000)
  assert.equal(equipment.powerWatt, 1300)
  assert.equal(equipment.weightKg, 45)
  assert.equal(equipment.maintenanceBufferDays, 1)
  assert.equal(equipment.location, 'Kec. Cilandak, Jakarta Selatan')
  assert.equal(equipment.distance, 2.4)
  assert.deepEqual(equipment.images, ['https://example.test/mesin-kopi.jpg'])

  assert.equal(equipment.owner.id, ownerId)
  assert.equal(equipment.owner.email, OWNER_EMAIL)
  assert.equal(equipment.owner.role, 'PEMILIK')
})

test('GET /api/equipments/:id mengembalikan detail satu alat', async () => {
  const res = await api(`/api/equipments/${EQUIPMENT_ID}`)
  assert.equal(res.status, 200)

  const body = await res.json()
  assert.equal(body.data.id, EQUIPMENT_ID)
  assert.equal(body.data.powerWatt, 1300)
  assert.equal(body.data.owner.id, ownerId)
})

test('GET /api/equipments/:id tetap bisa mengambil alat berstatus DISEWA', async () => {
  const res = await api(`/api/equipments/${HIDDEN_EQUIPMENT_ID}`)
  assert.equal(res.status, 200)

  const body = await res.json()
  assert.equal(body.data.status, 'DISEWA')
})

test('GET /api/equipments/:id mengembalikan 404 untuk id yang tidak dikenal', async () => {
  const res = await api('/api/equipments/00000000-0000-4000-8000-000000000000')
  assert.equal(res.status, 404)

  const body = await res.json()
  assert.equal(body.error.code, 'EQUIPMENT_NOT_FOUND')
})

test('POST /api/equipments dapat menambahkan alat baru lengkap dengan field sinkronisasi', async () => {
  const payload = {
    name: 'Mesin Segel Cup Presisi',
    category: 'Mesin Kemasan',
    description: 'Mesin cup sealer otomatis untuk UMKM minuman.',
    pricePerDay: 85000,
    deposit: 300000,
    powerWatt: 450,
    minRentDays: 2,
    maintenanceBufferDays: 1,
    condition: 'Prima',
    accessories: ['Kabel Power', 'Ring Cup 9cm', 'Ring Cup 9.5cm'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    images: ['https://example.test/cup-sealer.jpg']
  }

  const res = await fetch(`${baseUrl}/api/equipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`
    },
    body: JSON.stringify(payload)
  })

  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.data.name, payload.name)
  assert.equal(body.data.minRentDays, 2)
  assert.equal(body.data.maintenanceBufferDays, 1)
  assert.equal(body.data.condition, 'Prima')
  assert.deepEqual(body.data.accessories, payload.accessories)
  assert.deepEqual(body.data.deliveryMethods, payload.deliveryMethods)

  // Bersihkan data uji yang baru dibuat
  await prisma.equipment.delete({ where: { id: body.data.id } })
})

test('PUT /api/equipments/:id memperbarui data alat dan toggle status aktif', async () => {
  // Buat alat sementara untuk diuji
  const temp = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Mesin Parut Kelapa Mini',
      category: 'Peralatan Dapur',
      description: 'Mesin parut kelapa operasional.',
      pricePerDay: 50000,
      deposit: 200000,
      powerWatt: 350,
      weightKg: 8,
      dimensions: '30 x 20 x 25 cm',
      status: 'TERSEDIA',
      condition: 'Baik',
      accessories: ['Kabel', 'Wadah Stainless'],
      deliveryMethods: ['PICKUP']
    }
  })

  const updateRes = await fetch(`${baseUrl}/api/equipments/${temp.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      pricePerDay: 60000,
      condition: 'Prima',
      isActive: false // Toggle nonaktif
    })
  })

  assert.equal(updateRes.status, 200)
  const updatedBody = await updateRes.json()
  assert.equal(updatedBody.data.pricePerDay, 60000)
  assert.equal(updatedBody.data.condition, 'Prima')
  assert.equal(updatedBody.data.status, 'NONAKTIF')

  // Bersihkan
  await prisma.equipment.delete({ where: { id: temp.id } })
})

test('DELETE /api/equipments/:id mendukung hard delete jika belum ada order dan safe soft-delete jika ada order', async () => {
  // 1. Uji hard delete pada alat tanpa order
  const tempNoOrder = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Alat Sementara Tanpa Order',
      category: 'Mesin Kemasan',
      description: 'Siap dihapus permanen.',
      pricePerDay: 40000,
      deposit: 150000,
      powerWatt: 200,
      weightKg: 5,
      dimensions: '20 x 20 x 20 cm',
      status: 'TERSEDIA'
    }
  })

  const delRes1 = await fetch(`${baseUrl}/api/equipments/${tempNoOrder.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(delRes1.status, 200)
  const body1 = await delRes1.json()
  assert.equal(body1.softDeleted, false)

  // 2. Uji safe soft-delete pada alat yang memiliki riwayat order
  const tempWithOrder = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Alat Yang Memiliki Riwayat Order',
      category: 'Mesin Kopi',
      description: 'Memiliki riwayat order, tidak boleh di-hard-delete.',
      pricePerDay: 100000,
      deposit: 400000,
      powerWatt: 1000,
      weightKg: 15,
      dimensions: '30 x 30 x 30 cm',
      status: 'TERSEDIA'
    }
  })

  // Pasang dummy order
  await prisma.order.create({
    data: {
      invoiceNumber: `INV-TEST-DEL-${Date.now()}`,
      userId: ownerId,
      equipmentId: tempWithOrder.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      rentalDays: 1,
      deliveryMethod: 'PICKUP',
      rentalCost: 100000,
      shippingCost: 0,
      depositAmount: 400000,
      totalPaid: 500000,
      status: 'SELESAI'
    }
  })

  const delRes2 = await fetch(`${baseUrl}/api/equipments/${tempWithOrder.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(delRes2.status, 200)
  const body2 = await delRes2.json()
  assert.equal(body2.softDeleted, true)

  const checkDb = await prisma.equipment.findUnique({ where: { id: tempWithOrder.id } })
  assert.ok(checkDb)
  assert.equal(checkDb.isDeleted, true)
  assert.equal(checkDb.status, 'NONAKTIF')

  // Bersihkan data uji
  await prisma.order.deleteMany({ where: { equipmentId: tempWithOrder.id } })
  await prisma.equipment.delete({ where: { id: tempWithOrder.id } })
})

test('GET /api/equipments mendukung sorting sortRating=desc dan sortRating=asc dengan null handling', async () => {
  const resDesc = await api('/api/equipments?sortRating=desc')
  assert.equal(resDesc.status, 200)
  const bodyDesc = await resDesc.json()
  assert.ok(Array.isArray(bodyDesc.data))

  // Pastikan field averageRating dan ratingCount ada di response
  const firstWithRating = bodyDesc.data.find((e) => e.averageRating !== null)
  if (firstWithRating) {
    assert.equal(typeof firstWithRating.averageRating, 'number')
    assert.equal(typeof firstWithRating.ratingCount, 'number')
  }

  // Verifikasi urutan desc: rated items muncul lebih dulu, terurut menurun
  const ratedDesc = bodyDesc.data.filter((e) => e.averageRating !== null)
  for (let i = 0; i < ratedDesc.length - 1; i++) {
    assert.ok(
      ratedDesc[i].averageRating >= ratedDesc[i + 1].averageRating,
      `Harus descending: ${ratedDesc[i].averageRating} >= ${ratedDesc[i + 1].averageRating}`
    )
  }

  // Verifikasi null handling: item dengan averageRating === null berada di bagian akhir
  const firstNullIdxDesc = bodyDesc.data.findIndex((e) => e.averageRating === null)
  if (firstNullIdxDesc !== -1) {
    for (let i = firstNullIdxDesc; i < bodyDesc.data.length; i++) {
      assert.equal(bodyDesc.data[i].averageRating, null)
    }
  }

  // Verifikasi urutan asc: rated items terurut menaik, null tetap di akhir
  const resAsc = await api('/api/equipments?sortRating=asc')
  assert.equal(resAsc.status, 200)
  const bodyAsc = await resAsc.json()
  const ratedAsc = bodyAsc.data.filter((e) => e.averageRating !== null)
  for (let i = 0; i < ratedAsc.length - 1; i++) {
    assert.ok(
      ratedAsc[i].averageRating <= ratedAsc[i + 1].averageRating,
      `Harus ascending: ${ratedAsc[i].averageRating} <= ${ratedAsc[i + 1].averageRating}`
    )
  }
  const firstNullIdxAsc = bodyAsc.data.findIndex((e) => e.averageRating === null)
  if (firstNullIdxAsc !== -1) {
    for (let i = firstNullIdxAsc; i < bodyAsc.data.length; i++) {
      assert.equal(bodyAsc.data[i].averageRating, null)
    }
  }
})

test('GET /api/equipments/me menolak request tanpa token atau dengan role bukan pemilik', async () => {
  // Tanpa token -> 401
  const resNoAuth = await api('/api/equipments/me')
  assert.equal(resNoAuth.status, 401)

  // Token penyewa -> 403
  const renterToken = jwt.sign({ userId: 'renter-1', role: 'PENYEWA' }, config.jwtSecret, { expiresIn: '1h' })
  const resForbidden = await fetch(`${baseUrl}/api/equipments/me`, {
    headers: { Authorization: `Bearer ${renterToken}` }
  })
  assert.equal(resForbidden.status, 403)
})

test('GET /api/equipments/me mengembalikan alat milik pemilik login dengan status ketersediaan real-time', async () => {
  const res = await fetch(`${baseUrl}/api/equipments/me`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(res.status, 200)

  const body = await res.json()
  assert.ok(Array.isArray(body.data))

  // Harus memuat EQUIPMENT_ID dan HIDDEN_EQUIPMENT_ID yang dimiliki owner
  const myEq1 = body.data.find((e) => e.id === EQUIPMENT_ID)
  assert.ok(myEq1, 'Equipment milik owner harus ditemukan')
  assert.equal(myEq1.status, 'Tersedia')

  const myEq2 = body.data.find((e) => e.id === HIDDEN_EQUIPMENT_ID)
  assert.ok(myEq2, 'Equipment status non-tersedia milik owner tetap muncul di inventaris pribadi')
})

test('DELETE dan PUT menolak penghapusan atau penonaktifan alat jika memiliki pesanan aktif', async () => {
  const activeEq = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Alat Dengan Pesanan Aktif',
      category: 'Mesin Kopi',
      description: 'Sedang disewa oleh pelanggan aktif.',
      pricePerDay: 150000,
      deposit: 500000,
      powerWatt: 1200,
      weightKg: 20,
      dimensions: '40 x 30 x 30 cm',
      status: 'DISEWA'
    }
  })

  // Pasang pesanan aktif berstatus SEWA_AKTIF
  const activeOrder = await prisma.order.create({
    data: {
      invoiceNumber: `INV-ACTIVE-${Date.now()}`,
      userId: ownerId,
      equipmentId: activeEq.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 3),
      rentalDays: 3,
      deliveryMethod: 'PICKUP',
      rentalCost: 450000,
      shippingCost: 0,
      depositAmount: 500000,
      totalPaid: 950000,
      status: 'SEWA_AKTIF'
    }
  })

  // 1. Coba hapus (DELETE) -> Harus ditolak 400 ACTIVE_ORDERS_EXIST
  const delRes = await fetch(`${baseUrl}/api/equipments/${activeEq.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(delRes.status, 400)
  const delBody = await delRes.json()
  assert.equal(delBody.error?.code, 'ACTIVE_ORDERS_EXIST')

  // 2. Coba nonaktifkan via PUT (isActive: false) -> Harus ditolak 400 ACTIVE_ORDERS_EXIST
  const putRes = await fetch(`${baseUrl}/api/equipments/${activeEq.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`
    },
    body: JSON.stringify({ isActive: false })
  })
  assert.equal(putRes.status, 400)
  const putBody = await putRes.json()
  assert.equal(putBody.error?.code, 'ACTIVE_ORDERS_EXIST')

  // Bersihkan data uji
  await prisma.order.delete({ where: { id: activeOrder.id } })
  await prisma.equipment.delete({ where: { id: activeEq.id } })
})




