import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

test('Auth API Flow', async (t) => {
  const app = createApp()
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  const testEmail = 'auth_test_user@myrent.id'

  t.after(async () => {
    try {
      await prisma.user.deleteMany({ where: { email: testEmail } })
    } catch {
      // ignore
    } finally {
      server.close()
      await prisma.$disconnect()
    }
  })

  // Clean initial
  try {
    await prisma.user.deleteMany({ where: { email: testEmail } })
  } catch {
    // ignore
  }

  await t.test('POST /api/auth/register menolak email kosong', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Password123!', role: 'PENYEWA' })
    })
    assert.equal(res.status, 400)
    const data = await res.json()
    assert.equal(data.error?.code, 'EMAIL_REQUIRED')
  })

  await t.test('POST /api/auth/register menolak password < 6 karakter', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: '123', role: 'PENYEWA' })
    })
    assert.equal(res.status, 400)
    const data = await res.json()
    assert.equal(data.error?.code, 'INVALID_PASSWORD')
  })

  await t.test('POST /api/auth/register berhasil mendaftarkan user baru dan me-return token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        role: 'PENYEWA',
        fullName: 'Budi Test Penyewa',
        phone: '081299887766'
      })
    })
    assert.equal(res.status, 201)
    const data = await res.json()
    assert.ok(data.token)
    assert.equal(data.user.email, testEmail)
    assert.equal(data.user.role, 'PENYEWA')
    assert.equal(data.user.fullName, 'Budi Test Penyewa')
  })

  await t.test('POST /api/auth/register menolak email duplikat', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        role: 'PENYEWA'
      })
    })
    assert.equal(res.status, 409)
    const data = await res.json()
    assert.equal(data.error?.code, 'EMAIL_ALREADY_EXISTS')
  })

  await t.test('POST /api/auth/login menolak password salah', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!'
      })
    })
    assert.equal(res.status, 401)
    const data = await res.json()
    assert.equal(data.error?.code, 'INVALID_CREDENTIALS')
  })

  await t.test('POST /api/auth/login berhasil dengan kredensial benar', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!'
      })
    })
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.token)
    assert.equal(data.user.email, testEmail)
    assert.equal(data.user.role, 'PENYEWA')
  })

  await t.test('POST /api/auth/login untuk role ADMIN mengembalikan OTP_REQUIRED tanpa JWT token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@myrent.com',
        password: 'Admin#Sewa2026'
      })
    })
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.step, 'OTP_REQUIRED')
    assert.equal(data.token, undefined)
    assert.equal(data.email, 'admin@myrent.com')
  })

  await t.test('POST /api/auth/verify-admin-otp menolak OTP yang salah', async () => {
    const res = await fetch(`${baseUrl}/api/auth/verify-admin-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@myrent.com',
        otp: '000000'
      })
    })
    assert.equal(res.status, 400)
    const data = await res.json()
    assert.equal(data.error?.code, 'INVALID_OTP')
  })

  await t.test('POST /api/auth/verify-admin-otp menerima OTP 123456 dan mengembalikan token JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/verify-admin-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@myrent.com',
        otp: '123456'
      })
    })
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.token)
    assert.equal(data.user.email, 'admin@myrent.com')
    assert.equal(data.user.role, 'ADMIN')
  })

  await t.test('GET /api/auth/profile mengembalikan data profil lengkap termasuk kycData', async () => {
    // Login terlebih dahulu untuk mendapatkan token user penyewa
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    })
    const loginData = await loginRes.json()
    assert.ok(loginData.token)

    const profileRes = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    })
    assert.equal(profileRes.status, 200)
    const profileData = await profileRes.json()
    assert.equal(profileData.profile.email, testEmail)
    assert.equal(profileData.profile.role, 'PENYEWA')
    assert.ok('nik' in profileData.profile)
    assert.ok('powerCapacity' in profileData.profile)
    assert.ok('businessName' in profileData.profile)
    assert.ok('bankAccount' in profileData.profile)
  })

  await t.test('PUT /api/auth/profile memperbarui data UMKM & daya listrik, menjaga field NIK tetap aman', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    })
    const loginData = await loginRes.json()

    const updateRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        fullName: 'Budi Santoso Baru',
        businessName: 'Kopi Nusantara Baru',
        powerCapacity: '2200 W',
        address: 'Jl. Melawai No. 10',
        city: 'Jakarta Selatan',
        district: 'Kebayoran Baru',
        postalCode: '12160',
        bankName: 'Mandiri — Bank Mandiri',
        bankAccount: '1230009988776',
        bankAccountHolder: 'Budi Santoso Baru',
        // Coba injeksi ubah NIK (seharusnya diabaikan / tidak berubah)
        nik: '9999999999999999'
      })
    })

    assert.equal(updateRes.status, 200)
    const updateData = await updateRes.json()
    assert.equal(updateData.profile.fullName, 'Budi Santoso Baru')
    assert.equal(updateData.profile.businessName, 'Kopi Nusantara Baru')
    assert.equal(updateData.profile.powerCapacity, '2200 W')
    assert.equal(updateData.profile.dayaListrik, 2200)
    assert.equal(updateData.profile.city, 'Jakarta Selatan')
    assert.equal(updateData.profile.bankAccount, '1230009988776')
  })

  await t.test('GET & PUT /api/auth/profile mendukung TenantProfile (upsert) & kalkulasi rating/alat', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    })
    const loginData = await loginRes.json()

    // 1. GET profil awal
    const getRes = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    })
    assert.equal(getRes.status, 200)
    const getData = await getRes.json()
    assert.ok(getData.profile.tenantProfile)
    assert.ok('storeName' in getData.profile.tenantProfile)
    assert.ok('operatingHours' in getData.profile.tenantProfile)
    assert.ok('joinYear' in getData.profile)

    // 2. PUT pembaruan TenantProfile
    const updateRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        tenantProfile: {
          storeName: 'Kopi Senja Modern',
          storeDescription: 'Mesin kopi dan grinder espresso terbaik di Bandung',
          storeCategory: 'Kuliner & Kopi',
          whatsappNumber: '081233445566',
          address: 'Jl. Riau No. 45',
          city: 'Bandung',
          serviceRadius: 25,
          npwpVerified: true,
          notifPesananBaru: true,
          notifPengembalianAlat: false
        }
      })
    })
    assert.equal(updateRes.status, 200)
    const updateData = await updateRes.json()
    assert.equal(updateData.profile.tenantProfile.storeName, 'Kopi Senja Modern')
    assert.equal(updateData.profile.tenantProfile.serviceRadius, 25)
    assert.equal(updateData.profile.tenantProfile.npwpVerified, true)
    assert.equal(updateData.profile.tenantProfile.notifPengembalianAlat, false)

    // 3. Verifikasi persistensi via GET ulang
    const verifyRes = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    })
    assert.equal(verifyRes.status, 200)
    const verifyData = await verifyRes.json()
    assert.equal(verifyData.profile.tenantProfile.storeName, 'Kopi Senja Modern')
    assert.equal(verifyData.profile.tenantProfile.city, 'Bandung')
    assert.equal(verifyData.profile.tenantProfile.npwpVerified, true)
  })
})
