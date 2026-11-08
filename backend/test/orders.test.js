import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before } from 'node:test'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { config } from '../src/config.js'

const TEST_RENTER_EMAIL = 'renter_orders_test@myrent.id'
const TEST_OWNER_EMAIL = 'owner_orders_test@myrent.id'
const TEST_ADMIN_EMAIL = 'admin_orders_test@myrent.id'
const TEST_EQUIPMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

let server
let baseUrl
let renterToken
let ownerToken
let adminToken
let renterId
let ownerId
let equipmentId
let createdOrderId

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const renter = await prisma.user.upsert({
    where: { email: TEST_RENTER_EMAIL },
    update: {},
    create: {
      email: TEST_RENTER_EMAIL,
      password: 'Password123!',
      role: 'PENYEWA',
      fullName: 'Penyewa Uji Coba',
      phone: '081299990001',
      verificationStatus: 'DISETUJUI'
    }
  })
  renterId = renter.id
  renterToken = jwt.sign({ userId: renter.id, role: renter.role }, config.jwtSecret, { expiresIn: '1h' })

  const owner = await prisma.user.upsert({
    where: { email: TEST_OWNER_EMAIL },
    update: {},
    create: {
      email: TEST_OWNER_EMAIL,
      password: 'Password123!',
      role: 'PEMILIK',
      fullName: 'Pemilik Uji Coba Orders',
      phone: '081299990002',
      verificationStatus: 'DISETUJUI'
    }
  })
  ownerId = owner.id
  ownerToken = jwt.sign({ userId: owner.id, role: owner.role }, config.jwtSecret, { expiresIn: '1h' })

  const admin = await prisma.user.upsert({
    where: { email: TEST_ADMIN_EMAIL },
    update: {},
    create: {
      email: TEST_ADMIN_EMAIL,
      password: 'Password123!',
      role: 'ADMIN',
      fullName: 'Admin Uji Coba Orders',
      phone: '081299990003',
      verificationStatus: 'DISETUJUI'
    }
  })
  adminToken = jwt.sign({ userId: admin.id, role: admin.role }, config.jwtSecret, { expiresIn: '1h' })

  const equipment = await prisma.equipment.upsert({
    where: { id: TEST_EQUIPMENT_ID },
    update: {},
    create: {
      id: TEST_EQUIPMENT_ID,
      ownerId: owner.id,
      name: 'Planetary Mixer Orders Test',
      category: 'Food Processing',
      description: 'Mixer untuk test order checkout.',
      pricePerDay: 75000,
      deposit: 300000,
      powerWatt: 550,
      weightKg: 25,
      dimensions: '40 x 30 x 50 cm',
      maintenanceBufferDays: 1,
      distance: 3.5,
      location: 'Jakarta Barat',
      status: 'TERSEDIA'
    }
  })
  equipmentId = equipment.id
})

after(async () => {
  try {
    if (createdOrderId) {
      await prisma.order.deleteMany({ where: { id: createdOrderId } }).catch(() => {})
    }
    await prisma.equipment.deleteMany({ where: { id: TEST_EQUIPMENT_ID } }).catch(() => {})
    await prisma.walletTransaction.deleteMany({ where: { userId: { in: [renterId, ownerId] } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { email: { in: [TEST_RENTER_EMAIL, TEST_OWNER_EMAIL, TEST_ADMIN_EMAIL] } } }).catch(() => {})
  } catch {
    // ignore
  } finally {
    if (server) {
      server.close()
    }
  }
})

test('POST /api/orders/validate-promo validasi kode promo', async () => {
  const resValid = await fetch(`${baseUrl}/api/orders/validate-promo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({ code: 'UMKMAJU', subtotal: 300000 })
  })
  const jsonValid = await resValid.json()
  assert.equal(resValid.status, 200)
  assert.equal(jsonValid.data.code, 'UMKMAJU')
  assert.equal(jsonValid.data.discountAmount, 50000)

  const resInvalid = await fetch(`${baseUrl}/api/orders/validate-promo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({ code: 'INVALIDCODE', subtotal: 300000 })
  })
  assert.equal(resInvalid.status, 404)
})

test('POST /api/orders membuat order dengan status MENUNGGU_PEMBAYARAN dan metadata lengkap', async () => {
  const startDate = new Date()
  const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  const payload = {
    equipmentId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    rentalDays: 3,
    deliveryMethod: 'COURIER',
    rentalCost: 225000,
    shippingCost: 45000,
    depositAmount: 300000,
    totalPaid: 525000,
    addons: [{ id: 'insurance', label: 'Asuransi Kerusakan', price: 45000 }],
    addonsCost: 45000,
    promoCode: 'UMKMAJU',
    discountAmount: 50000,
    renterNotes: 'Mohon dikirim pagi hari jam 10.',
    contractAgreedAt: new Date().toISOString()
  }

  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify(payload)
  })

  const json = await res.json()
  assert.equal(res.status, 201)
  assert.ok(json.data.id)
  assert.ok(json.data.invoiceNumber.startsWith('INV-'))
  assert.equal(json.data.status, 'MENUNGGU_PEMBAYARAN')
  assert.equal(json.data.renterNotes, payload.renterNotes)
  assert.equal(json.data.promoCode, 'UMKMAJU')
  assert.equal(json.data.discountAmount, 50000)
  assert.ok(json.data.paymentDeadline)

  createdOrderId = json.data.id
})

test('GET /api/orders/:id mengambil detail order', async () => {
  const res = await fetch(`${baseUrl}/api/orders/${createdOrderId}`, {
    headers: { Authorization: `Bearer ${renterToken}` }
  })
  const json = await res.json()
  assert.equal(res.status, 200)
  assert.equal(json.data.id, createdOrderId)
  assert.equal(json.data.status, 'MENUNGGU_PEMBAYARAN')
  assert.ok(json.data.equipment)
})

test('PATCH /api/orders/:id/mock-pay simulasi mock payment', async () => {
  const res = await fetch(`${baseUrl}/api/orders/${createdOrderId}/mock-pay`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({ paymentMethod: 'QRIS' })
  })

  const json = await res.json()
  assert.equal(res.status, 200)
  assert.equal(json.data.status, 'MENUNGGU_KONFIRMASI')
  assert.equal(json.data.paymentMethod, 'QRIS')
  assert.ok(json.data.paidAt)

  // Coba bayar ulang harus ditolak karena status bukan MENUNGGU_PEMBAYARAN lagi
  const resRetry = await fetch(`${baseUrl}/api/orders/${createdOrderId}/mock-pay`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({ paymentMethod: 'VA_BCA' })
  })
  assert.equal(resRetry.status, 400)
})

test('Pembayaran pesanan dengan Saldo Dompet (WALLET) - validasi saldo kurang & saldo cukup', async () => {
  // Buat order baru untuk pengujian dompet
  const resOrder = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({
      equipmentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      startDate: '2026-11-20',
      endDate: '2026-11-21',
      rentalDays: 2,
      deliveryMethod: 'PICKUP',
      rentalCost: 100000,
      depositAmount: 50000,
      totalPaid: 150000
    })
  })
  const orderJson = await resOrder.json()
  assert.equal(orderJson.data.totalPaid, 150000)
  const walletOrderId = orderJson.data.id

  // 0. Pastikan saldo dompet 0 terlebih dahulu
  await prisma.user.update({
    where: { id: renterId },
    data: { walletBalance: 0 }
  })

  // 1. Cek pembayaran saat saldo 0 (harus ditolak dengan pesan yang diminta user)
  const resFail = await fetch(`${baseUrl}/api/orders/${walletOrderId}/mock-pay`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({ paymentMethod: 'WALLET' })
  })
  const failJson = await resFail.json()
  assert.equal(resFail.status, 400)
  assert.equal(failJson.error.code, 'INSUFFICIENT_WALLET_BALANCE')
  assert.ok(failJson.error.message.includes('Maaf saldo dompet anda tidak cukup'))

  // 2. Top-up saldo dompet user agar mencukupi
  await prisma.user.update({
    where: { id: renterId },
    data: { walletBalance: 200000 }
  })

  // 3. Bayar kembali menggunakan saldo dompet (harus sukses dan memotong saldo)
  const resSuccess = await fetch(`${baseUrl}/api/orders/${walletOrderId}/mock-pay`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({ paymentMethod: 'WALLET' })
  })
  const successJson = await resSuccess.json()
  assert.equal(resSuccess.status, 200)
  assert.equal(successJson.data.status, 'MENUNGGU_KONFIRMASI')
  assert.equal(successJson.data.paymentMethod, 'WALLET')
  assert.equal(successJson.newWalletBalance, 50000)

  // Pastikan mutasi walletTransaction SEWA_PAYMENT tercatat
  const tx = await prisma.walletTransaction.findFirst({
    where: { reference: successJson.data.invoiceNumber }
  })
  assert.ok(tx)
  assert.equal(tx.amount, 150000)
  assert.equal(tx.type, 'SEWA_PAYMENT')

  // Reset saldo renter kembali ke 0 agar tidak mengganggu test berikutnya
  await prisma.user.update({
    where: { id: renterId },
    data: { walletBalance: 0 }
  })

  // Bersihkan data transaksi dan pesanan pengujian dompet
  await prisma.walletTransaction.deleteMany({ where: { userId: renterId } })
  await prisma.order.deleteMany({ where: { id: walletOrderId } })
})

test('Siklus alur SEWA_AKTIF -> INSPEKSI -> DISPUTE dengan disputeReason', async () => {
  // 1. Pemilik menyetujui pesanan (MENUNGGU_KONFIRMASI -> DIKIRIM)
  const resAccept = await fetch(`${baseUrl}/api/orders/${createdOrderId}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(resAccept.status, 200)

  // 2. Penyewa konfirmasi terima (DIKIRIM -> SEWA_AKTIF)
  const resConfirmDelivery = await fetch(`${baseUrl}/api/orders/${createdOrderId}/confirm-delivery`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${renterToken}` }
  })
  assert.equal(resConfirmDelivery.status, 200)

  // 3. Penyewa submit pengembalian / BAST Akhir (SEWA_AKTIF -> INSPEKSI)
  const resReturn = await fetch(`${baseUrl}/api/orders/${createdOrderId}/return-submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({
      returnData: {
        notes: 'Penyewa mengembalikan alat dan submit BAST akhir',
        checklist: { bodyClean: true, powerFunctional: true, accessoriesComplete: true }
      }
    })
  })
  const jsonReturn = await resReturn.json()
  assert.equal(resReturn.status, 200)
  assert.equal(jsonReturn.data.status, 'INSPEKSI')
  assert.ok(jsonReturn.data.returnData.handoverPin)

  // 4. Pemilik mengajukan klaim dispute (INSPEKSI -> DISPUTE)
  const disputePayload = {
    disputeReason: 'Kabel power mesin kopi hilang dan bodi samping penyok parah',
    damageFee: 200000,
    ownerInspectionPhotos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80']
  }
  const resDispute = await fetch(`${baseUrl}/api/orders/${createdOrderId}/dispute`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`
    },
    body: JSON.stringify(disputePayload)
  })
  const jsonDispute = await resDispute.json()
  assert.equal(resDispute.status, 200)
  assert.equal(jsonDispute.data.status, 'DISPUTE')
  assert.equal(jsonDispute.data.disputeReason, disputePayload.disputeReason)
  assert.equal(jsonDispute.data.damageFee, 200000)
  assert.ok(jsonDispute.data.ownerInspectionPhotos)

  // 5. Validasi detail order mencakup disputeReason dan ownerInspectionPhotos
  const resDetail = await fetch(`${baseUrl}/api/orders/${createdOrderId}`, {
    headers: { Authorization: `Bearer ${renterToken}` }
  })
  const jsonDetail = await resDetail.json()
  assert.equal(resDetail.status, 200)
  assert.equal(jsonDetail.data.status, 'DISPUTE')
  assert.equal(jsonDetail.data.disputeReason, disputePayload.disputeReason)
  assert.equal(jsonDetail.data.damageFee, 200000)
})

test('PATCH /api/orders/:id/resolve-dispute putusan mediasi admin dan pencairan escrow', async () => {
  // Simpan BAST awal terlebih dahulu untuk kelengkapan data komparasi
  const bastAwalPayload = {
    initialBast: {
      photos: {
        front: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=600&q=80',
        side: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
      },
      notes: 'Unit diterima dalam kondisi prima, bodi mulus tanpa cacat.',
      checklist: { kabelLengkap: true, bodiMulus: true, mesinMenyala: true }
    }
  }

  const resBast = await fetch(`${baseUrl}/api/orders/${createdOrderId}/initial-bast`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify(bastAwalPayload)
  })
  assert.equal(resBast.status, 200)

  // Non-admin harus ditolak mengakses endpoint mediasi
  const resForbidden = await fetch(`${baseUrl}/api/orders/${createdOrderId}/resolve-dispute`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({ finalDamageFee: 100000, adminResolutionNote: 'Test non-admin' })
  })
  assert.equal(resForbidden.status, 403)

  // Admin memutuskan sengketa: ganti rugi Rp 120.000 (dari deposit Rp 300.000)
  const resolutionPayload = {
    finalDamageFee: 120000,
    adminResolutionNote: 'Berdasarkan bukti BAST awal dan pengembalian, disepakati kompensasi kabel dan bodi Rp 120.000.'
  }

  const resResolve = await fetch(`${baseUrl}/api/orders/${createdOrderId}/resolve-dispute`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(resolutionPayload)
  })

  const jsonResolve = await resResolve.json()
  assert.equal(resResolve.status, 200)
  assert.equal(jsonResolve.data.status, 'SELESAI')
  assert.equal(jsonResolve.data.isResolvedByAdmin, true)
  assert.equal(jsonResolve.data.finalDamageFee, 120000)
  assert.equal(jsonResolve.data.adminResolutionNote, resolutionPayload.adminResolutionNote)
  assert.equal(jsonResolve.breakdown.depositAmount, 300000)
  assert.equal(jsonResolve.breakdown.finalDamageFee, 120000)
  assert.equal(jsonResolve.breakdown.refundToRenter, 180000) // 300.000 - 120.000

  // Periksa wallet penyewa dan pemilik terupdate secara riil di database
  const renterDb = await prisma.user.findUnique({ where: { id: renterId } })
  const ownerDb = await prisma.user.findUnique({ where: { id: ownerId } })
  assert.equal(renterDb.walletBalance, 180000)
  assert.ok(ownerDb.walletBalance >= 120000)
})

test('Validasi sinkronisasi metode pengiriman & custom ongkir antara pemilik alat dan penyewa', async () => {
  // 1. Buat alat khusus dengan hanya metode PICKUP yang aktif
  const pickupOnlyEq = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Mesin Kopi Pickup Only Test',
      category: 'Mesin Kopi',
      description: 'Hanya bisa diambil di toko pemilik',
      pricePerDay: 150000,
      deposit: 200000,
      powerWatt: 1100,
      deliveryMethods: ['PICKUP'],
      deliveryFee: 0,
      status: 'TERSEDIA'
    }
  })

  // Penyewa mencoba sewa dengan kurir (COURIER) -> harus ditolak 400
  const resForbiddenCourier = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({
      equipmentId: pickupOnlyEq.id,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      rentalDays: 3,
      deliveryMethod: 'COURIER',
      rentalCost: 450000,
      depositAmount: 200000,
      totalPaid: 650000
    })
  })
  assert.equal(resForbiddenCourier.status, 400)
  const forbiddenCourierJson = await resForbiddenCourier.json()
  assert.equal(forbiddenCourierJson.error.code, 'DELIVERY_METHOD_NOT_ALLOWED')

  // 2. Buat alat khusus dengan hanya metode COURIER dan custom ongkir Rp 65.000
  const courierOnlyEq = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Mesin Kopi Courier Only Custom Ongkir Test',
      category: 'Mesin Kopi',
      description: 'Hanya melayani diantar kurir dengan tarif custom',
      pricePerDay: 200000,
      deposit: 300000,
      powerWatt: 1400,
      deliveryMethods: ['COURIER'],
      deliveryFee: 65000,
      status: 'TERSEDIA'
    }
  })

  // Penyewa mencoba sewa dengan ambil sendiri (PICKUP) -> harus ditolak 400
  const resForbiddenPickup = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({
      equipmentId: courierOnlyEq.id,
      startDate: '2026-11-15',
      endDate: '2026-11-16',
      rentalDays: 2,
      deliveryMethod: 'PICKUP',
      rentalCost: 400000,
      depositAmount: 300000,
      totalPaid: 700000
    })
  })
  assert.equal(resForbiddenPickup.status, 400)
  const forbiddenPickupJson = await resForbiddenPickup.json()
  assert.equal(forbiddenPickupJson.error.code, 'DELIVERY_METHOD_NOT_ALLOWED')

  // Penyewa sewa dengan kurir (COURIER) -> berhasil dengan shippingCost sesuai custom ongkir pemilik (65000)
  const resAllowedCourier = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({
      equipmentId: courierOnlyEq.id,
      startDate: '2026-11-15',
      endDate: '2026-11-16',
      rentalDays: 2,
      deliveryMethod: 'COURIER',
      rentalCost: 400000,
      depositAmount: 300000,
      totalPaid: 765000
    })
  })
  assert.equal(resAllowedCourier.status, 201)
  const allowedCourierJson = await resAllowedCourier.json()
  assert.equal(allowedCourierJson.data.deliveryMethod, 'COURIER')
  assert.equal(allowedCourierJson.data.shippingCost, 65000)

  // Bersihkan data tes
  await prisma.order.deleteMany({
    where: { equipmentId: { in: [pickupOnlyEq.id, courierOnlyEq.id] } }
  })
  await prisma.equipment.deleteMany({
    where: { id: { in: [pickupOnlyEq.id, courierOnlyEq.id] } }
  })
})

test('GET /api/orders/owner/me mengambil daftar pesanan milik peralatan pemilik (owner)', async () => {
  // Buat order untuk alat milik owner
  const testOrder = await prisma.order.create({
    data: {
      userId: renterId,
      equipmentId,
      invoiceNumber: `INV-OWNER-${Date.now()}`,
      startDate: new Date('2026-12-01'),
      endDate: new Date('2026-12-05'),
      rentalDays: 4,
      deliveryMethod: 'PICKUP',
      rentalCost: 300000,
      shippingCost: 0,
      depositAmount: 300000,
      totalPaid: 600000,
      status: 'MENUNGGU_KONFIRMASI'
    }
  })

  const res = await fetch(`${baseUrl}/api/orders/owner/me`, {
    headers: {
      Authorization: `Bearer ${ownerToken}`
    }
  })

  assert.equal(res.status, 200)
  const json = await res.json()
  assert.ok(Array.isArray(json.data))
  const found = json.data.find((o) => o.id === testOrder.id)
  assert.ok(found, 'Pesanan baru harus ditemukan di daftar pesanan milik pemilik')
  assert.equal(found.equipment.ownerId, ownerId)
  assert.ok(found.tenant, 'Field tenant alias dari user harus tersedia')
  assert.equal(found.tenant.id, renterId)

  // Bersihkan order
  await prisma.order.delete({ where: { id: testOrder.id } })
})
