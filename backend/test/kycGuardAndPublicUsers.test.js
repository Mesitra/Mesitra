import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before } from 'node:test'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { config } from '../src/config.js'

let server
let baseUrl
let unverifiedRenterToken
let verifiedRenterToken
let unverifiedOwnerToken
let verifiedOwnerToken
let adminToken
let publicRenterId
let publicOwnerId
let testEquipmentId

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`

  // 1. Unverified Renter (KYC status = MENUNGGU)
  const unverifiedRenter = await prisma.user.upsert({
    where: { email: 'unverified_renter@test.id' },
    update: { verificationStatus: 'MENUNGGU' },
    create: {
      email: 'unverified_renter@test.id',
      password: 'Password123!',
      role: 'PENYEWA',
      fullName: 'Penyewa Belum KYC',
      phone: '081234567891',
      verificationStatus: 'MENUNGGU'
    }
  })
  unverifiedRenterToken = jwt.sign(
    { userId: unverifiedRenter.id, role: unverifiedRenter.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  )

  // 2. Verified Renter (KYC status = DISETUJUI)
  const verifiedRenter = await prisma.user.upsert({
    where: { email: 'verified_renter@test.id' },
    update: { verificationStatus: 'DISETUJUI' },
    create: {
      email: 'verified_renter@test.id',
      password: 'Password123!',
      role: 'PENYEWA',
      fullName: 'Penyewa Terverifikasi',
      phone: '081234567892',
      verificationStatus: 'DISETUJUI'
    }
  })
  verifiedRenterToken = jwt.sign(
    { userId: verifiedRenter.id, role: verifiedRenter.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  )
  publicRenterId = verifiedRenter.id

  // 3. Unverified Owner (KYC status = MENUNGGU)
  const unverifiedOwner = await prisma.user.upsert({
    where: { email: 'unverified_owner@test.id' },
    update: { verificationStatus: 'MENUNGGU' },
    create: {
      email: 'unverified_owner@test.id',
      password: 'Password123!',
      role: 'PEMILIK',
      fullName: 'Pemilik Belum KYC',
      phone: '081234567893',
      verificationStatus: 'MENUNGGU'
    }
  })
  unverifiedOwnerToken = jwt.sign(
    { userId: unverifiedOwner.id, role: unverifiedOwner.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  )

  // 4. Verified Owner (KYC status = DISETUJUI)
  const verifiedOwner = await prisma.user.upsert({
    where: { email: 'verified_owner@test.id' },
    update: { verificationStatus: 'DISETUJUI' },
    create: {
      email: 'verified_owner@test.id',
      password: 'Password123!',
      role: 'PEMILIK',
      fullName: 'Pemilik Terverifikasi',
      phone: '081234567894',
      verificationStatus: 'DISETUJUI'
    }
  })
  verifiedOwnerToken = jwt.sign(
    { userId: verifiedOwner.id, role: verifiedOwner.role },
    config.jwtSecret,
    { expiresIn: '1h' }
  )
  publicOwnerId = verifiedOwner.id

  // 5. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin_kyc_test@myrent.id' },
    update: { verificationStatus: 'DISETUJUI' },
    create: {
      email: 'admin_kyc_test@myrent.id',
      password: 'Password123!',
      role: 'ADMIN',
      fullName: 'Admin Tester',
      phone: '081234567895',
      verificationStatus: 'DISETUJUI'
    }
  })
  adminToken = jwt.sign(
    { userId: admin.id, role: 'ADMIN', adminRole: 'SUPERADMIN', adminUserId: admin.id },
    config.jwtSecret,
    { expiresIn: '1h' }
  )

  // 6. Siapkan alat untuk testing order
  await prisma.order.deleteMany({ where: { equipmentId: '77777777-7777-4777-8777-777777777777' } }).catch(() => {})
  const eq = await prisma.equipment.upsert({
    where: { id: '77777777-7777-4777-8777-777777777777' },
    update: {},
    create: {
      id: '77777777-7777-4777-8777-777777777777',
      name: 'Alat Test KYC',
      category: 'Konstruksi & Perkakas',
      description: 'Deskripsi alat untuk testing KYC guard',
      pricePerDay: 150000,
      deposit: 200000,
      powerWatt: 500,
      ownerId: verifiedOwner.id,
      status: 'TERSEDIA',
      stock: 5,
      deliveryMethods: ['PICKUP', 'COURIER']
    }
  })
  testEquipmentId = eq.id
})

after(async () => {
  try {
    await prisma.order.deleteMany({ where: { equipmentId: '77777777-7777-4777-8777-777777777777' } }).catch(() => {})
    await prisma.equipment.deleteMany({ where: { id: '77777777-7777-4777-8777-777777777777' } }).catch(() => {})
  } catch {}
  if (server) {
    server.close()
  }
})

test('KYC Guard: POST /api/orders menolak penyewa yang belum diverifikasi KYC (403)', async () => {
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${unverifiedRenterToken}`
    },
    body: JSON.stringify({
      equipmentId: testEquipmentId,
      startDate: '2027-01-10T00:00:00.000Z',
      endDate: '2027-01-12T00:00:00.000Z',
      rentalDays: 2,
      deliveryMethod: 'PICKUP',
      rentalCost: 300000,
      shippingCost: 0,
      depositAmount: 200000,
      totalPaid: 500000
    })
  })

  assert.equal(res.status, 403)
  const data = await res.json()
  assert.equal(data.error?.message || data.message, 'Akun Anda belum diverifikasi')
})

test('KYC Guard: POST /api/orders mengizinkan penyewa yang sudah diverifikasi (201)', async () => {
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${verifiedRenterToken}`
    },
    body: JSON.stringify({
      equipmentId: testEquipmentId,
      startDate: '2027-02-10T00:00:00.000Z',
      endDate: '2027-02-12T00:00:00.000Z',
      rentalDays: 2,
      deliveryMethod: 'PICKUP',
      rentalCost: 300000,
      shippingCost: 0,
      depositAmount: 200000,
      totalPaid: 500000
    })
  })

  assert.equal(res.status, 201)
  const data = await res.json()
  assert.ok(data.data?.id || data.order?.id)
})

test('KYC Guard: POST /api/equipments menolak pemilik yang belum diverifikasi KYC (403)', async () => {
  const res = await fetch(`${baseUrl}/api/equipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${unverifiedOwnerToken}`
    },
    body: JSON.stringify({
      name: 'Mesin Bor Unverified',
      category: 'Konstruksi & Perkakas',
      pricePerDay: 75000,
      deposit: 100000
    })
  })

  assert.equal(res.status, 403)
  const data = await res.json()
  assert.equal(data.error?.message || data.message, 'Akun Anda belum diverifikasi')
})

test('KYC Guard: POST /api/equipments mengizinkan pemilik yang sudah diverifikasi (201)', async () => {
  const res = await fetch(`${baseUrl}/api/equipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${verifiedOwnerToken}`
    },
    body: JSON.stringify({
      name: 'Mesin Bor Verified',
      category: 'Konstruksi & Perkakas',
      pricePerDay: 75000,
      deposit: 100000
    })
  })

  assert.equal(res.status, 201)
  const data = await res.json()
  assert.ok(data.data?.id || data.equipment?.id)
})

test('Admin Users API: GET /api/admin/users/public hanya me-return PENYEWA dan PEMILIK tanpa ADMIN', async () => {
  const res = await fetch(`${baseUrl}/api/admin/users/public`, {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  })

  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.users))
  assert.ok(data.total >= 4)

  // Pastikan tidak ada akun dengan role ADMIN di dalam daftar
  const adminUsers = data.users.filter((u) => u.role === 'ADMIN')
  assert.equal(adminUsers.length, 0)

  // Pastikan user penyewa dan pemilik ada
  const hasRenter = data.users.some((u) => u.id === publicRenterId)
  const hasOwner = data.users.some((u) => u.id === publicOwnerId)
  assert.ok(hasRenter)
  assert.ok(hasOwner)
})

test('Admin Users API: Suspend & Unsuspend user publik berfungsi dengan benar', async () => {
  // 1. Suspend public user
  const suspendRes = await fetch(`${baseUrl}/api/admin/users/${publicRenterId}/suspend`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ reason: 'Uji coba penangguhan akun' })
  })

  assert.equal(suspendRes.status, 200)
  const suspendData = await suspendRes.json()
  assert.equal(suspendData.user?.isSuspended, true)
  assert.equal(suspendData.user?.suspendedReason, 'Uji coba penangguhan akun')

  // 2. Unsuspend public user
  const unsuspendRes = await fetch(`${baseUrl}/api/admin/users/${publicRenterId}/unsuspend`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  })

  assert.equal(unsuspendRes.status, 200)
  const unsuspendData = await unsuspendRes.json()
  assert.equal(unsuspendData.user?.isSuspended, false)
  assert.equal(unsuspendData.user?.suspendedReason, null)
})
