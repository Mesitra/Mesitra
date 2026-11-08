import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before } from 'node:test'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { config } from '../src/config.js'
import { sendNewOrderNotif, sendReturnReminder, sendInspectionNotif } from '../src/services/notificationService.js'

const TEST_OWNER_EMAIL = 'notif_owner_test@myrent.id'

let server
let baseUrl
let ownerToken
let ownerId

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const owner = await prisma.user.upsert({
    where: { email: TEST_OWNER_EMAIL },
    update: {},
    create: {
      email: TEST_OWNER_EMAIL,
      password: 'Password123!',
      role: 'PEMILIK',
      fullName: 'Owner Notif Tester',
      phone: '081299991122',
      verificationStatus: 'DISETUJUI'
    }
  })
  ownerId = owner.id
  ownerToken = jwt.sign({ userId: owner.id, role: owner.role }, config.jwtSecret, { expiresIn: '1h' })

  // Bersihkan notifikasi tester
  await prisma.notification.deleteMany({ where: { userId: ownerId } })
})

after(async () => {
  if (ownerId) {
    await prisma.notification.deleteMany({ where: { userId: ownerId } })
    await prisma.tenantProfile.deleteMany({ where: { userId: ownerId } })
    await prisma.user.deleteMany({ where: { id: ownerId } })
  }
  if (server) {
    server.close()
  }
})

test('notificationService.js inserts in-app notification to database', async () => {
  await sendNewOrderNotif(ownerId, {
    orderId: 'test-order-123',
    invoiceNumber: 'INV-TEST-001',
    equipmentName: 'Mesin Kopi Test',
    renterName: 'Penyewa Andi'
  })

  const notifs = await prisma.notification.findMany({ where: { userId: ownerId } })
  assert.equal(notifs.length, 1)
  assert.equal(notifs[0].type, 'ORDER_NEW')
  assert.equal(notifs[0].title, 'Pesanan Baru: Mesin Kopi Test')
  assert.equal(notifs[0].referenceId, 'test-order-123')
  assert.equal(notifs[0].isRead, false)
})

test('notificationService respects TenantProfile toggle when notifPesananBaru is false', async () => {
  await prisma.tenantProfile.upsert({
    where: { userId: ownerId },
    update: { notifPesananBaru: false },
    create: {
      userId: ownerId,
      notifPesananBaru: false
    }
  })

  await sendNewOrderNotif(ownerId, {
    orderId: 'test-order-456',
    invoiceNumber: 'INV-TEST-002',
    equipmentName: 'Mesin Jahit Test',
    renterName: 'Penyewa Budi'
  })

  const notifs = await prisma.notification.findMany({
    where: { userId: ownerId, referenceId: 'test-order-456' }
  })
  assert.equal(notifs.length, 0)

  // Reset toggle ke true
  await prisma.tenantProfile.update({
    where: { userId: ownerId },
    data: { notifPesananBaru: true }
  })
})

test('GET /api/notifications returns list of user notifications', async () => {
  const res = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.ok(Array.isArray(json.data))
  assert.ok(json.data.length >= 1)
  assert.equal(json.data[0].userId, ownerId)
})

test('PATCH /api/notifications/:id/read updates isRead status', async () => {
  const notif = await prisma.notification.findFirst({
    where: { userId: ownerId, isRead: false }
  })
  assert.ok(notif)

  const res = await fetch(`${baseUrl}/api/notifications/${notif.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.data.isRead, true)

  const reloaded = await prisma.notification.findUnique({ where: { id: notif.id } })
  assert.equal(reloaded.isRead, true)
})

test('E2E: Checkout pesanan baru oleh penyewa memicu notifikasi ORDER_NEW untuk pemilik dan dapat ditandai dibaca', async () => {
  // 1. Setup Penyewa
  const renter = await prisma.user.upsert({
    where: { email: 'e2e_renter@myrent.id' },
    update: {},
    create: {
      email: 'e2e_renter@myrent.id',
      password: 'Password123!',
      role: 'PENYEWA',
      fullName: 'Budi Penyewa E2E',
      phone: '081299993344',
      verificationStatus: 'DISETUJUI'
    }
  })
  const renterToken = jwt.sign({ userId: renter.id, role: renter.role }, config.jwtSecret, { expiresIn: '1h' })

  // 2. Setup Alat milik Pemilik
  const equipment = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Oven Konveksi E2E',
      category: 'Oven & Bakery',
      description: 'Oven untuk pengujian E2E',
      pricePerDay: 150000,
      deposit: 300000,
      powerWatt: 1200,
      status: 'TERSEDIA'
    }
  })

  // 3. Penyewa melakukan checkout via POST /api/orders
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${renterToken}`
    },
    body: JSON.stringify({
      equipmentId: equipment.id,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      rentalDays: 3,
      deliveryMethod: 'PICKUP',
      rentalCost: 450000,
      depositAmount: 300000,
      totalPaid: 750000
    })
  })
  assert.equal(orderRes.status, 201)
  const orderJson = await orderRes.json()
  const createdOrder = orderJson.data
  assert.ok(createdOrder?.id)

  // 4. Pemilik memanggil GET /api/notifications
  const notifRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(notifRes.status, 200)
  const notifJson = await notifRes.json()
  const orderNotif = notifJson.data.find((n) => n.referenceId === createdOrder.id)
  assert.ok(orderNotif, 'Notifikasi pesanan baru harus ditemukan di list pemilik')
  assert.equal(orderNotif.type, 'ORDER_NEW')
  assert.ok(orderNotif.title.includes('Oven Konveksi E2E'))
  assert.equal(orderNotif.isRead, false)

  // 5. Pemilik klik notifikasi -> PATCH /api/notifications/:id/read
  const readRes = await fetch(`${baseUrl}/api/notifications/${orderNotif.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` }
  })
  assert.equal(readRes.status, 200)
  const readJson = await readRes.json()
  assert.equal(readJson.data.isRead, true)

  // Cleanup
  await prisma.order.deleteMany({ where: { id: createdOrder.id } })
  await prisma.equipment.deleteMany({ where: { id: equipment.id } })
  await prisma.user.deleteMany({ where: { id: renter.id } })
})
