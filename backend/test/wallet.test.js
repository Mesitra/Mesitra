import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before } from 'node:test'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { config } from '../src/config.js'

const TEST_OWNER_EMAIL = 'owner_wallet_test@myrent.id'
const TEST_RENTER_EMAIL = 'renter_wallet_test@myrent.id'

let server
let baseUrl
let ownerToken
let renterToken
let ownerId
let renterId
let equipmentId
let completedOrderId
let activeOrderId

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
      fullName: 'Kopi Senja Roastery Test',
      phone: '081299990099',
      verificationStatus: 'DISETUJUI',
      kycData: {
        businessName: 'Kopi Senja Roastery Test'
      }
    }
  })
  ownerId = owner.id
  ownerToken = jwt.sign({ userId: owner.id, role: owner.role }, config.jwtSecret, { expiresIn: '1h' })

  const renter = await prisma.user.upsert({
    where: { email: TEST_RENTER_EMAIL },
    update: {},
    create: {
      email: TEST_RENTER_EMAIL,
      password: 'Password123!',
      role: 'PENYEWA',
      fullName: 'Penyewa Dompet Test',
      phone: '081299990098',
      verificationStatus: 'DISETUJUI'
    }
  })
  renterId = renter.id
  renterToken = jwt.sign({ userId: renter.id, role: renter.role }, config.jwtSecret, { expiresIn: '1h' })

  // Buat peralatan uji untuk pemilik
  const equipment = await prisma.equipment.create({
    data: {
      ownerId,
      name: 'Oven Deck Bakery Test',
      category: 'Oven & Bakery',
      description: 'Oven deck untuk pengujian dompet',
      pricePerDay: 200000,
      deposit: 500000,
      powerWatt: 2000,
      maintenanceBufferDays: 2
    }
  })
  equipmentId = equipment.id

  const now = new Date()

  // 1. Pesanan Selesai (Menghasilkan pendapatan bersih cair)
  const completedOrder = await prisma.order.create({
    data: {
      invoiceNumber: `INV-TEST-WAL-01-${Date.now()}`,
      userId: renterId,
      equipmentId,
      startDate: new Date(now.getTime() - 10 * 86400000),
      endDate: new Date(now.getTime() - 5 * 86400000),
      rentalDays: 5,
      deliveryMethod: 'PICKUP',
      rentalCost: 1000000,
      shippingCost: 0,
      depositAmount: 500000,
      totalPaid: 1500000,
      status: 'SELESAI'
    }
  })
  completedOrderId = completedOrder.id

  // 2. Pesanan Aktif (Menghasilkan dana escrow)
  const activeOrder = await prisma.order.create({
    data: {
      invoiceNumber: `INV-TEST-WAL-02-${Date.now()}`,
      userId: renterId,
      equipmentId,
      startDate: new Date(now.getTime() + 1 * 86400000),
      endDate: new Date(now.getTime() + 4 * 86400000),
      rentalDays: 3,
      deliveryMethod: 'COURIER',
      rentalCost: 600000,
      shippingCost: 50000,
      depositAmount: 500000,
      totalPaid: 1150000,
      status: 'SEWA_AKTIF'
    }
  })
  activeOrderId = activeOrder.id

  // 3. Rekening pencairan awal
  await prisma.withdrawalAccount.create({
    data: {
      userId: ownerId,
      bankName: 'BCA',
      accountNumber: '4471 8820 04',
      accountHolder: 'Budi Santoso',
      isPrimary: true
    }
  })
})

after(async () => {
  if (completedOrderId) {
    await prisma.order.deleteMany({ where: { id: { in: [completedOrderId, activeOrderId] } } }).catch(() => {})
  }
  if (equipmentId) {
    await prisma.equipment.deleteMany({ where: { id: equipmentId } }).catch(() => {})
  }
  await prisma.withdrawalAccount.deleteMany({ where: { userId: ownerId } }).catch(() => {})
  await prisma.walletTransaction.deleteMany({ where: { userId: ownerId } }).catch(() => {})
  await prisma.user.deleteMany({ where: { email: { in: [TEST_OWNER_EMAIL, TEST_RENTER_EMAIL] } } }).catch(() => {})
  await prisma.$disconnect().catch(() => {})

  if (server) {
    server.close()
  }
})

test('Owner Wallet API & Finansial Flow', async (t) => {
  let initialBalance = 0

  await t.test('GET /api/wallet/owner/me tanpa token mengembalikan 401', async () => {
    const res = await fetch(`${baseUrl}/api/wallet/owner/me`)
    assert.equal(res.status, 401)
  })

  await t.test('GET /api/wallet/owner/me mengembalikan struktur data lengkap & kalkulasi finansial', async () => {
    const res = await fetch(`${baseUrl}/api/wallet/owner/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()

    // rentalCost 1.000.000 - 5% platform fee (50.000) = 950.000
    assert.ok(typeof body.availableBalance === 'number')
    assert.equal(body.availableBalance, 950000)
    initialBalance = body.availableBalance

    // Dana di escrow: totalPaid active order (1.150.000)
    assert.ok(body.escrowBalance >= 1150000)

    // Escrow items mencakup pesanan aktif dengan daysRemaining (H-x)
    assert.ok(Array.isArray(body.escrowItems))
    assert.ok(body.escrowItems.length >= 1)
    const activeItem = body.escrowItems.find((i) => i.id === activeOrderId)
    assert.ok(activeItem)
    assert.ok(activeItem.daysRemaining.startsWith('H-') || activeItem.daysRemaining === 'Hari ini')

    // Next Payout terisi
    assert.ok(body.nextPayout)
    assert.ok(body.nextPayout.label)

    // Riwayat mutasi lengkap (MASUK, KELUAR, ESCROW)
    assert.ok(Array.isArray(body.mutations))
    assert.ok(body.mutations.length >= 3)
    const masuk = body.mutations.find((m) => m.category === 'MASUK')
    assert.ok(masuk)
    assert.equal(masuk.badgeStatus, 'Selesai')
    assert.equal(masuk.subStatus, 'Cair')

    const fee = body.mutations.find((m) => m.category === 'KELUAR' && m.description.includes('layanan'))
    assert.ok(fee)

    const escrowMut = body.mutations.find((m) => m.category === 'ESCROW')
    assert.ok(escrowMut)
    assert.equal(escrowMut.badgeStatus, 'Escrow')
    assert.equal(escrowMut.subStatus, 'Ditahan')

    // Rekening pencairan
    assert.equal(body.bankAccount.bankName, 'BCA')
    assert.equal(body.bankAccount.accountNumber, '4471 8820 04')
  })

  await t.test('POST /api/wallet/owner/withdraw menolak nominal < Rp 100.000', async () => {
    const res = await fetch(`${baseUrl}/api/wallet/owner/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ amount: 50000 })
    })
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.equal(body.error.code, 'INVALID_AMOUNT')
  })

  await t.test('POST /api/wallet/owner/withdraw menolak nominal melebihi availableBalance', async () => {
    const res = await fetch(`${baseUrl}/api/wallet/owner/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ amount: 50000000 })
    })
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.equal(body.error.code, 'INSUFFICIENT_BALANCE')
  })

  await t.test('POST /api/wallet/owner/withdraw berhasil mencairkan dana dan mencatat mutasi KELUAR', async () => {
    const withdrawAmount = 200000
    const res = await fetch(`${baseUrl}/api/wallet/owner/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ amount: withdrawAmount })
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.newBalance, initialBalance - withdrawAmount)
    assert.ok(body.transaction)
    assert.ok(body.transaction.description.includes('Pencairan ke BCA'))

    // Verifikasi mutasi bertambah di GET /api/wallet/owner/me
    const checkRes = await fetch(`${baseUrl}/api/wallet/owner/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    })
    const checkBody = await checkRes.json()
    assert.equal(checkBody.availableBalance, initialBalance - withdrawAmount)
    const latestWd = checkBody.mutations.find((m) => m.id === `MUT-WD-${body.transaction.id}`)
    assert.ok(latestWd)
    assert.equal(latestWd.category, 'KELUAR')
    assert.equal(latestWd.amount, -withdrawAmount)
  })

  await t.test('PUT /api/wallet/owner/bank-account berhasil mengubah data rekening pencairan', async () => {
    const res = await fetch(`${baseUrl}/api/wallet/owner/bank-account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        bankName: 'Mandiri',
        accountNumber: '1370012345678',
        accountHolder: 'Budi Santoso Perkasa'
      })
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.bankAccount.bankName, 'Mandiri')
    assert.equal(body.bankAccount.accountNumber, '1370012345678')
    assert.equal(body.bankAccount.accountHolder, 'Budi Santoso Perkasa')

    // Cek endpoint GET /api/wallet/owner/bank-account
    const getRes = await fetch(`${baseUrl}/api/wallet/owner/bank-account`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    })
    assert.equal(getRes.status, 200)
    const getBody = await getRes.json()
    assert.equal(getBody.bankAccount.bankName, 'Mandiri')
  })
})
