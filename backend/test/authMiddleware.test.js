import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { requireAuth, requireAdmin } from '../src/middleware/authMiddleware.js'
import { config } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

describe('Auth & Admin Guard Middleware Tests', () => {
  it('requireAuth menolak request tanpa header Authorization', async () => {
    let statusCode = null
    let responseData = null

    const req = { headers: {} }
    const res = {
      status(code) {
        statusCode = code
        return {
          json(data) {
            responseData = data
            return data
          }
        }
      }
    }
    let nextCalled = false
    const next = () => { nextCalled = true }

    await requireAuth(req, res, next)

    assert.equal(statusCode, 401)
    assert.equal(responseData.error.code, 'UNAUTHORIZED')
    assert.equal(nextCalled, false)
  })

  it('requireAuth menolak token palsu / tidak valid', async () => {
    let statusCode = null
    let responseData = null

    const req = { headers: { authorization: 'Bearer invalid.token.signature' } }
    const res = {
      status(code) {
        statusCode = code
        return {
          json(data) {
            responseData = data
            return data
          }
        }
      }
    }
    let nextCalled = false
    const next = () => { nextCalled = true }

    await requireAuth(req, res, next)

    assert.equal(statusCode, 401)
    assert.equal(responseData.error.code, 'INVALID_TOKEN')
    assert.equal(nextCalled, false)
  })

  it('requireAuth menolak akun yang berstatus ditangguhkan (isSuspended = true)', async () => {
    // Cari atau buat user yang di-suspend untuk pengujian
    const suspendedEmail = `suspended_test_${Date.now()}@myrent.test`
    const testUser = await prisma.user.create({
      data: {
        email: suspendedEmail,
        password: 'password123',
        fullName: 'Akun Ditangguhkan',
        phone: '081299999999',
        role: 'PENYEWA',
        isSuspended: true,
        suspendedReason: 'Melanggar syarat dan ketentuan sewa platform'
      }
    })

    const token = jwt.sign({ userId: testUser.id, role: testUser.role }, config.jwtSecret)

    let statusCode = null
    let responseData = null
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = {
      status(code) {
        statusCode = code
        return {
          json(data) {
            responseData = data
            return data
          }
        }
      }
    }
    let nextCalled = false
    const next = () => { nextCalled = true }

    try {
      await requireAuth(req, res, next)

      assert.equal(statusCode, 403)
      assert.equal(responseData.error.code, 'ACCOUNT_SUSPENDED')
      assert.equal(responseData.error.message, 'Akun Anda telah ditangguhkan')
      assert.equal(responseData.error.reason, 'Melanggar syarat dan ketentuan sewa platform')
      assert.equal(nextCalled, false)
    } finally {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {})
    }
  })

  it('requireAdmin menolak pengguna dengan role non-ADMIN', async () => {
    const renterEmail = `renter_guard_${Date.now()}@myrent.test`
    const testRenter = await prisma.user.create({
      data: {
        email: renterEmail,
        password: 'password123',
        fullName: 'Penyewa Biasa',
        phone: '081288888888',
        role: 'PENYEWA',
        isSuspended: false
      }
    })

    const token = jwt.sign({ userId: testRenter.id, role: testRenter.role }, config.jwtSecret)

    let statusCode = null
    let responseData = null
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = {
      status(code) {
        statusCode = code
        return {
          json(data) {
            responseData = data
            return data
          }
        }
      }
    }
    let nextCalled = false
    const next = () => { nextCalled = true }

    try {
      await requireAdmin(req, res, next)

      assert.equal(statusCode, 403)
      assert.equal(responseData.error.code, 'ACCESS_DENIED')
      assert.equal(responseData.error.message, 'Akses ditolak. Memerlukan hak akses administrator')
      assert.equal(nextCalled, false)
    } finally {
      await prisma.user.delete({ where: { id: testRenter.id } }).catch(() => {})
    }
  })

  it('requireAdmin mengizinkan pengguna dengan role ADMIN', async () => {
    const adminEmail = `admin_guard_${Date.now()}@myrent.test`
    const testAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: 'password123',
        fullName: 'Admin Utama Mesitra',
        phone: '081277777777',
        role: 'ADMIN',
        isSuspended: false
      }
    })

    const token = jwt.sign({ userId: testAdmin.id, role: testAdmin.role }, config.jwtSecret)

    let statusCode = null
    let responseData = null
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = {
      status(code) {
        statusCode = code
        return {
          json(data) {
            responseData = data
            return data
          }
        }
      }
    }
    let nextCalled = false
    const next = () => { nextCalled = true }

    try {
      await requireAdmin(req, res, next)

      assert.equal(nextCalled, true)
      assert.equal(statusCode, null)
      assert.equal(req.user.id, testAdmin.id)
      assert.equal(req.admin.id, testAdmin.id)
      assert.equal(req.userRole, 'ADMIN')
    } finally {
      await prisma.user.delete({ where: { id: testAdmin.id } }).catch(() => {})
    }
  })
})

