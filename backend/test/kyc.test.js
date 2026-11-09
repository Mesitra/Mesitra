import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

/**
 * Test alur verifikasi KYC:
 *  registrasi → antrean admin → setujui / minta perbaikan / tolak
 *  → status pengajuan → gatekeeper login.
 */

const EMAIL = 'kyc_flow_test_user@myrent.id'
const PASSWORD = 'Password123!'

const FORM_DATA = {
  fullName: 'Budi KYC',
  email: EMAIL,
  phone: '081288990011',
  businessName: 'Kopi Senja',
  businessSector: 'Kuliner & Kopi',
  nik: '3174092188450003',
  ktpName: 'Budi KYC',
  birthPlace: 'Jakarta',
  birthDate: '1991-04-12',
  // Tiga bentuk berkas berbeda: metadata, nama file, dan data URL.
  ktpFile: { name: 'ktp.jpg', size: 2048, type: 'image/jpeg' },
  selfieFile: 'selfie.jpg',
  frontPhoto: { name: 'toko.png', size: 4096, type: 'image/png', preview: 'data:image/png;base64,AAAA' },
  powerCapacity: '2200 W',
  city: 'Jakarta Selatan',
  address: 'Jl. Kemang No. 1',
  bankName: 'BCA',
  bankAccount: '1234567890',
  bankAccountHolder: 'Budi KYC',
  agreeTruth: true,
  agreeTerms: true
}

test('Alur verifikasi KYC', async (t) => {
  const app = createApp()
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  const json = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    })
    const body = await res.json().catch(() => ({}))
    return { res, body }
  }

  const cleanup = async () => {
    try {
      await prisma.user.deleteMany({ where: { email: EMAIL } })
    } catch {
      // ignore
    }
  }

  t.after(async () => {
    await cleanup()
    server.close()
    await prisma.$disconnect()
  })

  await cleanup()

  // ── Registrasi ───────────────────────────────────────────────────────────
  await t.test('POST /api/auth/register menyimpan seluruh data KYC & status MENUNGGU', async () => {
    const { res, body } = await json('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        role: 'PENYEWA',
        fullName: 'Budi KYC',
        phone: '081288990011',
        formData: FORM_DATA
      })
    })

    assert.equal(res.status, 201)
    assert.equal(body.user.verificationStatus, 'MENUNGGU')
    assert.ok(body.user.submissionCode, 'submissionCode harus dibuat')
    assert.match(body.user.submissionCode, /^VR-\d+$/)
  })

  await t.test('GET /api/auth/submission-status/:email mengembalikan data KYC', async () => {
    const { res, body } = await json(`/api/auth/submission-status/${EMAIL}`)

    assert.equal(res.status, 200)
    assert.equal(body.status.verificationStatus, 'MENUNGGU')
    assert.equal(body.status.kycData.nik, '3174092188450003')
    // Berkas dinormalisasi ke bentuk seragam.
    assert.equal(body.status.kycData.ktpFile.name, 'ktp.jpg')
    assert.equal(body.status.kycData.selfieFile.name, 'selfie.jpg')
    assert.equal(body.status.kycData.frontPhoto.preview, 'data:image/png;base64,AAAA')
  })

  await t.test('Registrasi ulang saat MENUNGGU ditolak (anti-spam)', async () => {
    const { res, body } = await json('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, role: 'PENYEWA', formData: FORM_DATA })
    })

    assert.equal(res.status, 409)
    assert.equal(body.error.code, 'EMAIL_ALREADY_EXISTS')
  })

  // ── Token admin (Superadmin Login) ───────────────────────────────────────
  const adminLogin = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@myrent.com', password: 'admin123' })
  })
  const adminToken = adminLogin.body.token
  const adminHeaders = { Authorization: `Bearer ${adminToken}` }

  await t.test('GET /api/admin/submissions menolak akses tanpa token admin', async () => {
    const { res, body } = await json('/api/admin/submissions')
    assert.equal(res.status, 401)
    assert.equal(body.error.code, 'UNAUTHORIZED')
  })

  let submissionId = null
  let submissionCode = null

  await t.test('GET /api/admin/submissions menampilkan pengajuan dari database', async () => {
    const { res, body } = await json('/api/admin/submissions', { headers: adminHeaders })

    assert.equal(res.status, 200)
    assert.ok(body.total >= 1)

    const found = body.submissions.find((row) => row.email === EMAIL)
    assert.ok(found, 'pengajuan test harus muncul di daftar admin')
    assert.equal(found.verificationStatus, 'MENUNGGU')
    assert.equal(found.kycData.nik, '3174092188450003')

    submissionId = found.id
    submissionCode = found.submissionCode
  })

  await t.test('GET /api/admin/submissions/:id menerima id maupun submissionCode', async () => {
    const byId = await json(`/api/admin/submissions/${submissionId}`, { headers: adminHeaders })
    assert.equal(byId.res.status, 200)
    assert.equal(byId.body.submission.email, EMAIL)

    const byCode = await json(`/api/admin/submissions/${submissionCode}`, { headers: adminHeaders })
    assert.equal(byCode.res.status, 200)
    assert.equal(byCode.body.submission.id, submissionId)
  })

  await t.test('PATCH /api/admin/submissions/:id/revision menyimpan step & catatan', async () => {
    const { res, body } = await json(`/api/admin/submissions/${submissionId}/revision`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ selectedSteps: [2, 3], note: 'Foto KTP buram, unggah ulang.' })
    })

    assert.equal(res.status, 200)
    assert.equal(body.submission.verificationStatus, 'PERLU_PERBAIKAN')
    assert.deepEqual(body.submission.revisionSteps, [2, 3])
    assert.equal(body.submission.adminNote, 'Foto KTP buram, unggah ulang.')
  })

  await t.test('PATCH /api/admin/submissions/:id/revision menolak step tidak valid', async () => {
    const { res, body } = await json(`/api/admin/submissions/${submissionId}/revision`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ selectedSteps: [] })
    })

    assert.equal(res.status, 400)
    assert.equal(body.error.code, 'INVALID_SELECTED_STEPS')
  })

  await t.test('Pengguna dapat mengirim ulang pengajuan saat PERLU_PERBAIKAN', async () => {
    const { res, body } = await json('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        role: 'PENYEWA',
        fullName: 'Budi KYC',
        phone: '081288990011',
        formData: { ...FORM_DATA, ktpFile: { name: 'ktp-baru.jpg', size: 999, type: 'image/jpeg' } }
      })
    })

    assert.equal(res.status, 200)
    assert.equal(body.user.verificationStatus, 'MENUNGGU')
    assert.equal(body.user.submissionCode, submissionCode)
    assert.deepEqual(body.user.revisionSteps, [])
    assert.equal(body.user.adminNote, null)
  })

  await t.test('PATCH /api/admin/submissions/:id/reject menyimpan alasan', async () => {
    const { res, body } = await json(`/api/admin/submissions/${submissionId}/reject`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ reason: 'Data identitas tidak valid', note: 'NIK tidak ditemukan.' })
    })

    assert.equal(res.status, 200)
    assert.equal(body.submission.verificationStatus, 'DITOLAK')
    assert.match(body.submission.adminNote, /Data identitas tidak valid/)
  })

  await t.test('Login mengembalikan status DITOLAK beserta catatan admin', async () => {
    const { res, body } = await json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    })

    assert.equal(res.status, 200)
    assert.equal(body.user.verificationStatus, 'DITOLAK')
    assert.match(body.user.adminNote, /Data identitas tidak valid/)
  })

  await t.test('PATCH /api/admin/submissions/:id/approve mengaktifkan akun', async () => {
    const { res, body } = await json(`/api/admin/submissions/${submissionId}/approve`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({})
    })

    assert.equal(res.status, 200)
    assert.equal(body.submission.verificationStatus, 'DISETUJUI')
    assert.equal(body.submission.adminNote, null)
    assert.deepEqual(body.submission.revisionSteps, [])
  })

  await t.test('Login setelah disetujui mengembalikan DISETUJUI', async () => {
    const { res, body } = await json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    })

    assert.equal(res.status, 200)
    assert.equal(body.user.verificationStatus, 'DISETUJUI')
    assert.equal(body.user.submissionCode, submissionCode)
  })
})
