import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { config } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'

describe('Admin Backoffice API Tests (Pilar 3: Disputes & Pilar 4: Moderation)', () => {
  let app
  let server
  let baseUrl
  let adminToken
  let testAdmin
  let testOwner
  let testRenter
  let testEquipment
  let testOrder
  let testDispute
  let testReview

  before(async () => {
    app = createApp()
    server = app.listen(0)
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`

    // 1. Buat user Admin
    testAdmin = await prisma.user.create({
      data: {
        email: `admin_batch2_${Date.now()}@myrent.test`,
        password: 'password123',
        fullName: 'Admin Batch 2',
        phone: '081299990001',
        role: 'ADMIN',
        verificationStatus: 'DISETUJUI'
      }
    })
    adminToken = jwt.sign({ userId: testAdmin.id, role: 'ADMIN' }, config.jwtSecret)

    // 2. Buat user Pemilik
    testOwner = await prisma.user.create({
      data: {
        email: `owner_batch2_${Date.now()}@myrent.test`,
        password: 'password123',
        fullName: 'Pemilik Alat Batch 2',
        phone: '081299990002',
        role: 'PEMILIK',
        verificationStatus: 'DISETUJUI',
        walletBalance: 0
      }
    })

    // 3. Buat user Penyewa
    testRenter = await prisma.user.create({
      data: {
        email: `renter_batch2_${Date.now()}@myrent.test`,
        password: 'password123',
        fullName: 'Penyewa UMKM Batch 2',
        phone: '081299990003',
        role: 'PENYEWA',
        verificationStatus: 'DISETUJUI',
        walletBalance: 0
      }
    })

    // 4. Buat Equipment
    testEquipment = await prisma.equipment.create({
      data: {
        ownerId: testOwner.id,
        name: 'Mesin Las Inverter Industri 450W',
        category: 'Konstruksi & Perkakas',
        description: 'Mesin las hemat daya untuk bengkel dan fabrikasi.',
        pricePerDay: 100000,
        deposit: 400000,
        powerWatt: 450,
        status: 'INSPEKSI'
      }
    })

    // 5. Buat Order berstatus DISPUTE dengan BAST Awal & Bukti Kerusakan
    testOrder = await prisma.order.create({
      data: {
        invoiceNumber: `INV-DSP-${Date.now().toString().slice(-6)}`,
        userId: testRenter.id,
        equipmentId: testEquipment.id,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        rentalDays: 4,
        deliveryMethod: 'PICKUP',
        rentalCost: 400000, // 4 hari x 100rb
        shippingCost: 0,
        addonsCost: 0,
        depositAmount: 400000,
        totalPaid: 800000,
        status: 'DISPUTE',
        initialBast: {
          signedAt: '2026-11-01T09:00:00Z',
          conditionChecklist: { cableOk: true, bodyScratch: false },
          photos: ['https://storage.myrent.id/bast-awal-1.jpg']
        },
        returnData: {
          returnedAt: '2026-11-05T17:00:00Z',
          renterNotes: 'Kondisi normal saat pemakaian selesai.'
        },
        disputeReason: 'Kabel power putus dan saklar on/off retak.',
        ownerInspectionPhotos: ['https://storage.myrent.id/damage-cable.jpg']
      }
    })

    // 6. Buat DisputeTicket
    testDispute = await prisma.disputeTicket.create({
      data: {
        ticketNumber: `DSP-${Date.now().toString().slice(-6)}`,
        orderId: testOrder.id,
        renterId: testRenter.id,
        ownerId: testOwner.id,
        claimAmount: 250000,
        disputeReason: 'Kabel power putus dan saklar on/off retak.',
        ownerPhotos: ['https://storage.myrent.id/damage-cable.jpg'],
        status: 'OPEN'
      }
    })

    // 7. Buat Review untuk pengujian moderasi
    testReview = await prisma.review.create({
      data: {
        orderId: testOrder.id,
        equipmentId: testEquipment.id,
        userId: testRenter.id,
        rating: 1,
        comment: 'Pemilik penipu! Barang rongsokan jangan disewa!'
      }
    })
  })

  after(async () => {
    if (server) {
      server.close()
    }
    // Cleanup
    if (testReview?.id) {
      await prisma.review.delete({ where: { id: testReview.id } }).catch(() => {})
    }
    if (testDispute?.id) {
      await prisma.disputeTicket.delete({ where: { id: testDispute.id } }).catch(() => {})
    }
    if (testOrder?.id) {
      await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {})
    }
    if (testEquipment?.id) {
      await prisma.equipment.delete({ where: { id: testEquipment.id } }).catch(() => {})
    }
    if (testRenter?.id) {
      await prisma.user.delete({ where: { id: testRenter.id } }).catch(() => {})
    }
    if (testOwner?.id) {
      await prisma.user.delete({ where: { id: testOwner.id } }).catch(() => {})
    }
    if (testAdmin?.id) {
      await prisma.user.delete({ where: { id: testAdmin.id } }).catch(() => {})
    }
  })

  // ─── PILAR 3: DISPUTE MANAGEMENT TESTS ─────────────────────────────────────

  it('GET /api/admin/disputes mengambil daftar tiket sengketa', async () => {
    const res = await fetch(`${baseUrl}/api/admin/disputes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.disputes))
    assert.ok(body.disputes.length >= 1)

    const found = body.disputes.find((d) => d.id === testDispute.id)
    assert.ok(found)
    assert.equal(found.claimAmount, 250000)
    assert.equal(found.status, 'OPEN')
  })

  it('GET /api/admin/disputes/:id memuat detail perbandingan side-by-side BAST', async () => {
    const res = await fetch(`${baseUrl}/api/admin/disputes/${testDispute.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(body.dispute)
    assert.ok(body.dispute.order)

    // Wajib ada initialBast (sebelum sewa)
    assert.ok(body.dispute.order.initialBast)
    assert.equal(body.dispute.order.initialBast.conditionChecklist.cableOk, true)

    // Wajib ada bukti kerusakan klaim pemilik (setelah sewa)
    assert.ok(body.dispute.order.ownerInspectionPhotos)
    assert.equal(body.dispute.order.ownerInspectionPhotos[0], 'https://storage.myrent.id/damage-cable.jpg')

    // Wajib ada data relasi penyewa dan pemilik
    assert.equal(body.dispute.renter.email, testRenter.email)
    assert.equal(body.dispute.order.equipment.owner.email, testOwner.email)
  })

  it('PATCH /api/admin/disputes/:id/resolve mengeksekusi arbitrase & distribusi escrow secara proporsional', async () => {
    // Skenario: RESOLVED_SPLIT dengan ganti rugi Rp 150.000 dari deposit Rp 400.000
    // Biaya sewa: Rp 400.000
    // Platform fee 5%: Rp 20.000
    // Net sewa pemilik: Rp 380.000
    // Total pemilik: Rp 380.000 (sewa) + Rp 150.000 (ganti rugi) = Rp 530.000
    // Sisa deposit penyewa: Rp 400.000 - Rp 150.000 = Rp 250.000
    const res = await fetch(`${baseUrl}/api/admin/disputes/${testDispute.id}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'RESOLVED_SPLIT',
        finalDamageFee: 150000,
        adminArbitrageNote: 'Berdasarkan perbandingan foto, saklar memang rusak saat pemakaian. Ganti rugi ditetapkan Rp 150.000.'
      })
    })
    assert.equal(res.status, 200)
    const body = await res.json()

    assert.equal(body.dispute.status, 'RESOLVED_SPLIT')
    assert.equal(body.dispute.finalDamageFee, 150000)
    assert.equal(body.dispute.refundToRenter, 250000)
    assert.equal(body.dispute.payoutToOwner, 530000)
    assert.equal(body.order.status, 'SELESAI')

    // Cek saldo pemilik di DB
    const updatedOwner = await prisma.user.findUnique({
      where: { id: testOwner.id },
      select: { walletBalance: true }
    })
    assert.equal(updatedOwner.walletBalance, 530000)

    // Cek saldo penyewa di DB
    const updatedRenter = await prisma.user.findUnique({
      where: { id: testRenter.id },
      select: { walletBalance: true }
    })
    assert.equal(updatedRenter.walletBalance, 250000)

    // Cek status alat kembali TERSEDIA
    const updatedEq = await prisma.equipment.findUnique({
      where: { id: testEquipment.id },
      select: { status: true }
    })
    assert.equal(updatedEq.status, 'TERSEDIA')

    // Cek Audit Log arbitrase
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'RESOLVE_DISPUTE',
        targetId: testDispute.id
      }
    })
    assert.ok(log)
    assert.equal(log.targetType, 'DISPUTE')
  })

  // ─── PILAR 4: CONTENT MODERATION TESTS ─────────────────────────────────────

  it('PATCH /api/admin/equipments/:id/takedown menyembunyikan alat dari katalog publik', async () => {
    const res = await fetch(`${baseUrl}/api/admin/equipments/${testEquipment.id}/takedown`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        takedownReason: 'Alat membutuhkan sertifikasi keselamatan industri'
      })
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.equipment.isTakedownByAdmin, true)
    assert.equal(body.equipment.status, 'NONAKTIF')
    assert.equal(body.equipment.takedownReason, 'Alat membutuhkan sertifikasi keselamatan industri')

    // Verifikasi bahwa alat TIDAK MUNCUL di katalog publik GET /api/equipments
    const publicEqRes = await fetch(`${baseUrl}/api/equipments?category=Konstruksi%20%26%20Perkakas`)
    const publicEqBody = await publicEqRes.json()
    const foundInPublic = publicEqBody.data?.find((e) => e.id === testEquipment.id)
    assert.equal(foundInPublic, undefined)

    // Verifikasi Audit Log takedown
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'TAKEDOWN_EQUIPMENT',
        targetId: testEquipment.id
      }
    })
    assert.ok(log)
  })

  it('PATCH /api/admin/equipments/:id/restore mencabut status takedown alat', async () => {
    const res = await fetch(`${baseUrl}/api/admin/equipments/${testEquipment.id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.equipment.isTakedownByAdmin, false)
    assert.equal(body.equipment.status, 'TERSEDIA')

    // Verifikasi Audit Log restore
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'RESTORE_EQUIPMENT',
        targetId: testEquipment.id
      }
    })
    assert.ok(log)
  })

  it('PATCH /api/admin/reviews/:id/delete melakukan soft-delete ulasan toksik', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reviews/${testReview.id}/delete`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        moderationNote: 'Ulasan mengandung pencemaran nama baik tanpa dasar'
      })
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.review.isDeleted, true)
    assert.equal(body.review.isFlagged, true)
    assert.equal(body.review.moderationNote, 'Ulasan mengandung pencemaran nama baik tanpa dasar')

    // Verifikasi bahwa ulasan TIDAK MUNCUL di endpoint publik GET /api/reviews
    const publicRevRes = await fetch(`${baseUrl}/api/reviews?equipmentId=${testEquipment.id}`)
    const publicRevBody = await publicRevRes.json()
    const foundInPublic = publicRevBody.data?.find((r) => r.id === testReview.id)
    assert.equal(foundInPublic, undefined)

    // Verifikasi Audit Log delete review
    const log = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: testAdmin.id,
        action: 'DELETE_REVIEW',
        targetId: testReview.id
      }
    })
    assert.ok(log)
  })
})
