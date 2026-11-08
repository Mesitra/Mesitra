import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { config } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

describe('Admin Backoffice API Tests (Pilar 1: Users/KYC & Pilar 2: Finance/Withdrawals)', () => {
  let app
  let server
  let baseUrl
  let adminToken
  let testAdmin
  let testOwner
  let ownerToken

  before(async () => {
    app = createApp()
    server = app.listen(0)
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`

    // 1. Buat user Admin untuk pengujian
    testAdmin = await prisma.user.create({
      data: {
        email: `admin_api_${Date.now()}@myrent.test`,
        password: 'password123',
        fullName: 'Super Admin Test',
        phone: '081211112222',
        role: 'ADMIN',
        verificationStatus: 'DISETUJUI'
      }
    })
    adminToken = jwt.sign({ userId: testAdmin.id, role: 'ADMIN' }, config.jwtSecret)

    // 2. Buat user Pemilik untuk pengujian KYC & Penarikan
    testOwner = await prisma.user.create({
      data: {
        email: `owner_api_${Date.now()}@myrent.test`,
        password: 'password123',
        fullName: 'Budi Pemilik Alat',
        phone: '081233334444',
        role: 'PEMILIK',
        submissionCode: `VR-${Date.now().toString().slice(-4)}`,
        verificationStatus: 'MENUNGGU',
        walletBalance: 500000,
        kycData: {
          storeName: 'Sentosa Tehnik',
          bankAccount: {
            bankName: 'BCA',
            accountNumber: '1234567890',
            accountHolder: 'Budi Pemilik Alat'
          }
        }
      }
    })
    ownerToken = jwt.sign({ userId: testOwner.id, role: 'PEMILIK' }, config.jwtSecret)
  })

  after(async () => {
    if (server) {
      server.close()
    }
    // Cleanup data pengujian
    if (testOwner?.id) {
      await prisma.user.delete({ where: { id: testOwner.id } }).catch(() => {})
    }
    if (testAdmin?.id) {
      await prisma.user.delete({ where: { id: testAdmin.id } }).catch(() => {})
    }
  })

  // ─── PILAR 1: KYC & USER MANAGEMENT TESTS ───────────────────────────────────

  it('GET /api/admin/submissions memuat daftar pengajuan KYC', async () => {
    const res = await fetch(`${baseUrl}/api/admin/submissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.submissions))
    assert.ok(body.submissions.length >= 1)

    const found = body.submissions.find((s) => s.id === testOwner.id)
    assert.ok(found)
    assert.equal(found.role, 'PEMILIK')
  })

  it('PATCH /api/admin/submissions/:id/approve menyetujui KYC dan sinkronkan TenantProfile', async () => {
    const res = await fetch(`${baseUrl}/api/admin/submissions/${testOwner.id}/approve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.submission.verificationStatus, 'DISETUJUI')
    assert.ok(body.submission.verifiedAt)

    // Cek database: TenantProfile wajib ter-update dengan flag KYC true
    const tp = await prisma.tenantProfile.findUnique({
      where: { userId: testOwner.id }
    })
    assert.ok(tp)
    assert.equal(tp.ktpVerified, true)
    assert.equal(tp.nibVerified, true)
    assert.equal(tp.bankAccountVerified, true)

    // Cek database: AdminAuditLog tercatat
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'APPROVE_KYC',
        targetId: testOwner.id
      }
    })
    assert.ok(log)
    assert.equal(log.targetType, 'USER')
  })

  it('PATCH /api/admin/users/:id/suspend menangguhkan akun user & memblokir akses', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${testOwner.id}/suspend`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Indikasi pelanggaran alat berat' })
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.user.isSuspended, true)
    assert.equal(body.user.suspendedReason, 'Indikasi pelanggaran alat berat')

    // Verifikasi bahwa akun yang disuspend DITOLAK oleh requireAuth (invalidation middleware)
    const testAccessRes = await fetch(`${baseUrl}/api/wallet/owner/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    })
    assert.equal(testAccessRes.status, 403)
    const accessBody = await testAccessRes.json()
    assert.equal(accessBody.error.code, 'ACCOUNT_SUSPENDED')

    // Verifikasi log tercatat
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'SUSPEND_USER',
        targetId: testOwner.id
      }
    })
    assert.ok(log)
  })

  it('PATCH /api/admin/users/:id/unsuspend memulihkan akun user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${testOwner.id}/unsuspend`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.user.isSuspended, false)
    assert.equal(body.user.suspendedReason, null)

    // Verifikasi user bisa akses kembali
    const checkRes = await fetch(`${baseUrl}/api/wallet/owner/me`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    })
    assert.equal(checkRes.status, 200)
  })

  // ─── PILAR 2: FINANCIAL & WITHDRAWALS TESTS ────────────────────────────────

  let testWithdrawal

  it('GET /api/admin/withdrawals memuat daftar antrean penarikan dana', async () => {
    // Buat WithdrawalRequest pengujian
    testWithdrawal = await prisma.withdrawalRequest.create({
      data: {
        withdrawalCode: `WD-${Date.now().toString().slice(-6)}`,
        userId: testOwner.id,
        amount: 250000,
        transferFee: 0,
        netAmount: 250000,
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolder: 'Budi Pemilik Alat',
        status: 'MENUNGGU'
      }
    })

    const res = await fetch(`${baseUrl}/api/admin/withdrawals`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.withdrawals))
    const found = body.withdrawals.find((w) => w.id === testWithdrawal.id)
    assert.ok(found)
    assert.equal(found.amount, 250000)
    assert.equal(found.status, 'MENUNGGU')
    assert.equal(found.user.email, testOwner.email)
  })

  it('PATCH /api/admin/withdrawals/:id/approve menyetujui pencairan dana dengan no ref bank', async () => {
    const res = await fetch(`${baseUrl}/api/admin/withdrawals/${testWithdrawal.id}/approve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bankReference: 'TRX-BCA-987654',
        transferProofUrl: 'https://storage.myrent.id/proof/wd-987.jpg',
        adminNotes: 'Transfer via KlikBCA Bisnis'
      })
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.withdrawal.status, 'SELESAI')
    assert.equal(body.withdrawal.bankReference, 'TRX-BCA-987654')
    assert.equal(body.withdrawal.processedById, testAdmin.id)
    assert.ok(body.withdrawal.processedAt)

    // Verifikasi Audit Log
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'APPROVE_WITHDRAWAL',
        targetId: testWithdrawal.id
      }
    })
    assert.ok(log)
    assert.equal(log.targetType, 'WITHDRAWAL')
  })

  it('PATCH /api/admin/withdrawals/:id/reject menolak pencairan dan me-rollback saldo pemilik', async () => {
    // Siapkan saldo awal pemilik
    const initialUser = await prisma.user.findUnique({
      where: { id: testOwner.id },
      select: { walletBalance: true }
    })
    const startBalance = initialUser.walletBalance

    // Buat pengajuan pencairan baru sebesar 150.000
    const rejectWithdrawal = await prisma.withdrawalRequest.create({
      data: {
        withdrawalCode: `WD-${Date.now().toString().slice(-6)}-REJ`,
        userId: testOwner.id,
        amount: 150000,
        transferFee: 0,
        netAmount: 150000,
        bankName: 'Mandiri',
        accountNumber: '9999888877',
        accountHolder: 'Budi Pemilik',
        status: 'MENUNGGU'
      }
    })

    const res = await fetch(`${baseUrl}/api/admin/withdrawals/${rejectWithdrawal.id}/reject`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rejectionReason: 'Nomor rekening bank tujuan tidak aktif'
      })
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.withdrawal.status, 'DITOLAK')
    assert.equal(body.withdrawal.rejectionReason, 'Nomor rekening bank tujuan tidak aktif')

    // Verifikasi saldo di-rollback (bertambah 150.000)
    assert.equal(body.refundedBalance, startBalance + 150000)

    const updatedUser = await prisma.user.findUnique({
      where: { id: testOwner.id },
      select: { walletBalance: true }
    })
    assert.equal(updatedUser.walletBalance, startBalance + 150000)

    // Verifikasi mutasi dompet GAGAL tercatat
    const tx = await prisma.walletTransaction.findFirst({
      where: {
        userId: testOwner.id,
        reference: rejectWithdrawal.withdrawalCode,
        status: 'GAGAL'
      }
    })
    assert.ok(tx)
    assert.equal(tx.amount, 150000)

    // Verifikasi Audit Log penolakan tercatat
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'REJECT_WITHDRAWAL',
        targetId: rejectWithdrawal.id
      }
    })
    assert.ok(log)
  })
})
