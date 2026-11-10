import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { config } from '../src/config.js'
import { prisma } from '../src/lib/prisma.js'
import { PLATFORM_FEE_RATE } from '../src/lib/settlement.js'
import { realtimeService } from '../src/services/realtimeService.js'

describe('Full End-to-End Lifecycle Verification (Fase 1 s/d Fase 6)', () => {
  let server
  let baseUrl

  const runId = Date.now()
  const ownerEmail = `e2e_owner_${runId}@myrent.test`
  const renterEmail = `e2e_renter_${runId}@myrent.test`
  const adminEmail = `e2e_admin_${runId}@myrent.test`
  const password = 'Password123!'

  let adminUser
  let adminToken
  let ownerUser
  let ownerToken
  let renterUser
  let renterToken
  let equipmentId
  let order1Id
  let order2Id
  let disputeTicketId
  let order1HandoverPin
  let order2HandoverPin

  const createdUserIds = []
  const createdEquipmentIds = []
  const createdOrderIds = []

  const api = async (path, { method = 'GET', token = null, body = undefined } = {}) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    const json = await res.json().catch(() => ({}))
    return { status: res.status, body: json }
  }

  before(async () => {
    const app = createApp()
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${server.address().port}`

    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: 'AdminHashedPlaceholder',
        fullName: 'E2E Arbitrator Admin',
        phone: '081100009999',
        role: 'ADMIN',
        verificationStatus: 'DISETUJUI'
      }
    })
    createdUserIds.push(adminUser.id)
    adminToken = jwt.sign({ userId: adminUser.id, role: 'ADMIN' }, config.jwtSecret, { expiresIn: '1h' })
  })

  after(async () => {
    realtimeService.stopHeartbeat()
    if (typeof server?.closeAllConnections === 'function') {
      server.closeAllConnections()
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }

    // Bersihkan seluruh entitas yang dibuat sesuai urutan dependensi FK
    try {
      if (createdOrderIds.length > 0) {
        await prisma.disputeTicket.deleteMany({ where: { orderId: { in: createdOrderIds } } })
        await prisma.review.deleteMany({ where: { orderId: { in: createdOrderIds } } })
      }
      if (createdUserIds.length > 0) {
        await prisma.walletTransaction.deleteMany({ where: { userId: { in: createdUserIds } } })
        await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } })
      }
      const targetIds = [...createdUserIds, ...createdEquipmentIds, ...createdOrderIds]
      if (createdUserIds.length > 0 || targetIds.length > 0) {
        await prisma.adminAuditLog.deleteMany({
          where: {
            OR: [
              ...(createdUserIds.length > 0 ? [{ adminId: { in: createdUserIds } }] : []),
              ...(targetIds.length > 0 ? [{ targetId: { in: targetIds } }] : [])
            ]
          }
        })
      }
      if (createdOrderIds.length > 0) {
        await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } })
      }
      if (createdEquipmentIds.length > 0) {
        await prisma.equipment.deleteMany({ where: { id: { in: createdEquipmentIds } } })
      }
      if (createdUserIds.length > 0) {
        await prisma.tenantProfile.deleteMany({ where: { userId: { in: createdUserIds } } })
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr)
    }
  })

  it('Fase 1: Registrasi Pemilik & Penyewa beserta KYC, verifikasi KYC Guard, dan Approval Admin', async () => {
    // 1. Registrasi Pemilik Alat dengan dokumen KYC
    const regOwner = await api('/api/auth/register', {
      method: 'POST',
      body: {
        email: ownerEmail,
        password,
        role: 'PEMILIK',
        formData: {
          fullName: 'Pak Hendra Rental Kopi',
          phone: '081234560001',
          nik: '3273010101850001',
          businessName: 'Hendra Mesin Pro',
          businessSector: 'Kuliner & Kopi',
          address: 'Jl. Cilandak Tengah No. 88',
          city: 'Jakarta Selatan',
          bankName: 'BCA',
          bankAccountNumber: '8800112233',
          bankAccountName: 'Hendra Wijaya',
          ktpFile: 'https://example.test/kyc/owner-ktp.jpg',
          selfieFile: 'https://example.test/kyc/owner-selfie.jpg',
          frontPhoto: 'https://example.test/kyc/owner-storefront.jpg'
        }
      }
    })
    assert.equal(regOwner.status, 201)
    assert.ok(regOwner.body.token)
    assert.equal(regOwner.body.user.role, 'PEMILIK')
    assert.equal(regOwner.body.user.verificationStatus, 'MENUNGGU')
    ownerUser = regOwner.body.user
    ownerToken = regOwner.body.token
    createdUserIds.push(ownerUser.id)

    // Guard KYC: Pemilik sebelum disetujui TIDAK boleh posting alat
    const blockedEquip = await api('/api/equipments', {
      method: 'POST',
      token: ownerToken,
      body: {
        name: 'Blocked Tool Before KYC',
        category: 'Mesin Kopi',
        description: 'Seharusnya ditolak',
        pricePerDay: 100000,
        deposit: 200000,
        powerWatt: 1000
      }
    })
    assert.equal(blockedEquip.status, 403)
    assert.equal(blockedEquip.body.error?.code, 'KYC_NOT_VERIFIED')

    // 2. Admin meninjau & menyetujui KYC Pemilik
    const listSub1 = await api('/api/admin/submissions?status=MENUNGGU&role=PEMILIK', {
      token: adminToken
    })
    assert.equal(listSub1.status, 200)
    const foundOwnerSub = listSub1.body.submissions.find((s) => s.id === ownerUser.id)
    assert.ok(foundOwnerSub)

    const detailOwnerSub = await api(`/api/admin/submissions/${ownerUser.id}`, { token: adminToken })
    assert.equal(detailOwnerSub.status, 200)
    assert.equal(detailOwnerSub.body.submission.kycData?.ktpFile?.name, 'https://example.test/kyc/owner-ktp.jpg')

    const approveOwner = await api(`/api/admin/submissions/${ownerUser.id}/approve`, {
      method: 'PATCH',
      token: adminToken
    })
    assert.equal(approveOwner.status, 200)
    assert.equal(approveOwner.body.submission.verificationStatus, 'DISETUJUI')

    // 3. Registrasi Penyewa UMKM dengan dokumen KYC
    const regRenter = await api('/api/auth/register', {
      method: 'POST',
      body: {
        email: renterEmail,
        password,
        role: 'PENYEWA',
        formData: {
          fullName: 'Siti UMKM Bakery',
          phone: '081234560002',
          nik: '3273010202900002',
          businessName: 'Dapur Siti Jaya',
          address: 'Jl. Kemang Selatan No. 19',
          city: 'Jakarta Selatan',
          ktpFile: 'https://example.test/kyc/renter-ktp.jpg',
          selfieFile: 'https://example.test/kyc/renter-selfie.jpg',
          frontPhoto: 'https://example.test/kyc/renter-shop.jpg'
        }
      }
    })
    assert.equal(regRenter.status, 201)
    assert.ok(regRenter.body.token)
    assert.equal(regRenter.body.user.role, 'PENYEWA')
    assert.equal(regRenter.body.user.verificationStatus, 'MENUNGGU')
    renterUser = regRenter.body.user
    renterToken = regRenter.body.token
    createdUserIds.push(renterUser.id)

    // Guard KYC: Penyewa sebelum disetujui TIDAK boleh checkout pesanan
    const blockedOrder = await api('/api/orders', {
      method: 'POST',
      token: renterToken,
      body: {
        equipmentId: '00000000-0000-4000-8000-000000000001',
        startDate: '2030-01-10',
        endDate: '2030-01-12',
        rentalDays: 2
      }
    })
    assert.equal(blockedOrder.status, 403)
    assert.equal(blockedOrder.body.error?.code, 'KYC_NOT_VERIFIED')

    // 4. Admin menyetujui KYC Penyewa
    const approveRenter = await api(`/api/admin/submissions/${renterUser.id}/approve`, {
      method: 'PATCH',
      token: adminToken
    })
    assert.equal(approveRenter.status, 200)
    assert.equal(approveRenter.body.submission.verificationStatus, 'DISETUJUI')

    // Verifikasi login ulang Pemilik & Penyewa
    const ownerLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: ownerEmail, password }
    })
    assert.equal(ownerLogin.status, 200)
    assert.equal(ownerLogin.body.user.verificationStatus, 'DISETUJUI')
    ownerToken = ownerLogin.body.token

    const renterLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: renterEmail, password }
    })
    assert.equal(renterLogin.status, 200)
    assert.equal(renterLogin.body.user.verificationStatus, 'DISETUJUI')
    renterToken = renterLogin.body.token
  })

  it('Fase 2: Publikasi Alat oleh Pemilik, visibilitas katalog publik, dan Moderasi Admin (Takedown & Restore)', async () => {
    const createEquip = await api('/api/equipments', {
      method: 'POST',
      token: ownerToken,
      body: {
        name: `La Marzocco E2E Linea ${runId}`,
        category: 'Mesin Kopi',
        description: 'Mesin espresso komersial 2-group siap pakai untuk UMKM kafe.',
        pricePerDay: 200000,
        deposit: 500000,
        powerWatt: 2600,
        weightKg: 62,
        dimensions: '71 x 56 x 45 cm',
        minRentDays: 1,
        maintenanceBufferDays: 1,
        location: 'Kec. Cilandak, Jakarta Selatan',
        condition: 'Prima',
        deliveryMethods: ['PICKUP', 'COURIER'],
        deliveryFee: 60000,
        accessories: ['Portafilter 2x', 'Tamper Stainless', 'Selang Inlet'],
        images: ['https://example.test/equip/linea-front.jpg']
      }
    })
    assert.equal(createEquip.status, 201)
    equipmentId = createEquip.body.data.id
    createdEquipmentIds.push(equipmentId)
    assert.equal(createEquip.body.data.status, 'TERSEDIA')
    assert.deepEqual(createEquip.body.data.deliveryMethods, ['PICKUP', 'COURIER'])

    // Pastikan muncul di katalog publik penyewa
    const catalogRes1 = await api(`/api/equipments?search=${encodeURIComponent(String(runId))}`)
    assert.equal(catalogRes1.status, 200)
    assert.ok(catalogRes1.body.data.some((eq) => eq.id === equipmentId))

    // Admin melakukan takedown moderasi
    const takedownRes = await api(`/api/admin/equipments/${equipmentId}/takedown`, {
      method: 'PATCH',
      token: adminToken,
      body: { takedownReason: 'Pemeriksaan kelengkapan spesifikasi daya listrik' }
    })
    assert.equal(takedownRes.status, 200)
    assert.equal(takedownRes.body.equipment.isTakedownByAdmin, true)
    assert.equal(takedownRes.body.equipment.status, 'NONAKTIF')

    // Alat yang di-takedown wajib tidak tampil di katalog publik
    const catalogDuringTakedown = await api(`/api/equipments?search=${encodeURIComponent(String(runId))}`)
    assert.equal(catalogDuringTakedown.status, 200)
    assert.equal(catalogDuringTakedown.body.data.some((eq) => eq.id === equipmentId), false)

    // Admin memulihkan (restore) alat agar siap disewa
    const restoreRes = await api(`/api/admin/equipments/${equipmentId}/restore`, {
      method: 'PATCH',
      token: adminToken
    })
    assert.equal(restoreRes.status, 200)
    assert.equal(restoreRes.body.equipment.isTakedownByAdmin, false)
    assert.equal(restoreRes.body.equipment.status, 'TERSEDIA')

    // Pastikan tampil kembali di katalog publik
    const catalogAfterRestore = await api(`/api/equipments?search=${encodeURIComponent(String(runId))}`)
    assert.equal(catalogAfterRestore.status, 200)
    assert.ok(catalogAfterRestore.body.data.some((eq) => eq.id === equipmentId))
  })

  it('Fase 3: Pemesanan (Checkout) 2 skema metode & Pembayaran (QRIS + Topup/WALLET), lalu cek daftar pesanan Pemilik', async () => {
    const start1 = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
    const end1 = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10)

    // 1. Order 1 (COURIER - 2 hari sewa) -> total rental 400.000, ongkir 60.000, deposit 500.000 = 960.000
    const createOrder1 = await api('/api/orders', {
      method: 'POST',
      token: renterToken,
      body: {
        equipmentId,
        startDate: start1,
        endDate: end1,
        rentalDays: 2,
        deliveryMethod: 'COURIER',
        rentalCost: 400000,
        shippingCost: 60000,
        depositAmount: 500000,
        totalPaid: 960000,
        renterNotes: 'Kirim ke area Kemang Pagi hari',
        contractAgreedAt: new Date().toISOString()
      }
    })
    assert.equal(createOrder1.status, 201)
    order1Id = createOrder1.body.data.id
    createdOrderIds.push(order1Id)
    assert.equal(createOrder1.body.data.status, 'MENUNGGU_PEMBAYARAN')
    assert.equal(createOrder1.body.data.deliveryMethod, 'COURIER')
    assert.equal(createOrder1.body.data.shippingCost, 60000)

    // Bayar Order 1 via QRIS
    const payOrder1 = await api(`/api/orders/${order1Id}/mock-pay`, {
      method: 'PATCH',
      token: renterToken,
      body: { paymentMethod: 'QRIS' }
    })
    assert.equal(payOrder1.status, 200)
    assert.equal(payOrder1.body.data.status, 'MENUNGGU_KONFIRMASI')
    assert.equal(payOrder1.body.data.paymentMethod, 'QRIS')

    // 2. Order 2 (PICKUP - 3 hari sewa, tanggal terpisah) -> rental 600.000, ongkir 0, deposit 500.000 = 1.100.000
    const start2 = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10)
    const end2 = new Date(Date.now() + 23 * 86400000).toISOString().slice(0, 10)

    const createOrder2 = await api('/api/orders', {
      method: 'POST',
      token: renterToken,
      body: {
        equipmentId,
        startDate: start2,
        endDate: end2,
        rentalDays: 3,
        deliveryMethod: 'PICKUP',
        rentalCost: 600000,
        shippingCost: 0,
        depositAmount: 500000,
        totalPaid: 1100000,
        renterNotes: 'Ambil sendiri di gudang Cilandak',
        contractAgreedAt: new Date().toISOString()
      }
    })
    assert.equal(createOrder2.status, 201)
    order2Id = createOrder2.body.data.id
    createdOrderIds.push(order2Id)
    assert.equal(createOrder2.body.data.deliveryMethod, 'PICKUP')
    assert.equal(createOrder2.body.data.shippingCost, 0)

    // Uji bayar via WALLET gagal saat saldo belum mencukupi
    const insufficientWalletPay = await api(`/api/orders/${order2Id}/mock-pay`, {
      method: 'PATCH',
      token: renterToken,
      body: { paymentMethod: 'WALLET' }
    })
    assert.equal(insufficientWalletPay.status, 400)
    assert.equal(insufficientWalletPay.body.error?.code, 'INSUFFICIENT_WALLET_BALANCE')

    // Top-up dompet Penyewa Rp 2.000.000 lalu bayar Order 2 via WALLET
    const topupRes = await api('/api/wallet/topup', {
      method: 'POST',
      token: renterToken,
      body: { amount: 2000000, paymentMethod: 'VA_BCA' }
    })
    assert.equal(topupRes.status, 201)
    assert.equal(topupRes.body.newBalance, 2000000)

    const payOrder2 = await api(`/api/orders/${order2Id}/mock-pay`, {
      method: 'PATCH',
      token: renterToken,
      body: { paymentMethod: 'WALLET' }
    })
    assert.equal(payOrder2.status, 200)
    assert.equal(payOrder2.body.data.status, 'MENUNGGU_KONFIRMASI')
    assert.equal(payOrder2.body.data.paymentMethod, 'WALLET')

    const walletAfterPay = await api('/api/wallet', { token: renterToken })
    assert.equal(walletAfterPay.status, 200)
    assert.equal(walletAfterPay.body.walletBalance, 900000)

    // 3. Pastikan kedua pesanan muncul di daftar pesanan Pemilik (MENUNGGU_KONFIRMASI)
    const ownerOrdersRes = await api('/api/orders/owner/me', { token: ownerToken })
    assert.equal(ownerOrdersRes.status, 200)
    const o1 = ownerOrdersRes.body.data.find((o) => o.id === order1Id)
    const o2 = ownerOrdersRes.body.data.find((o) => o.id === order2Id)
    assert.ok(o1 && o2)
    assert.equal(o1.status, 'MENUNGGU_KONFIRMASI')
    assert.equal(o2.status, 'MENUNGGU_KONFIRMASI')
  })

  it('Fase 4A, 5A, 6A (Order 1 - COURIER -> COURIER_PICKUP -> PIN Validation -> Approve BAST Happy Path)', async () => {
    // ── Fase 4A: Konfirmasi Pemilik & Serah Terima Kurir Toko ──────────────────
    const acceptRes = await api(`/api/orders/${order1Id}/accept`, {
      method: 'PATCH',
      token: ownerToken
    })
    assert.equal(acceptRes.status, 200)
    assert.equal(acceptRes.body.data.status, 'DIKIRIM')

    const confirmDeliveryRes = await api(`/api/orders/${order1Id}/confirm-delivery`, {
      method: 'PATCH',
      token: ownerToken,
      body: {
        initialBast: {
          notes: 'Unit dikirim kurir toko kondisi mulus terkalibrasi',
          checklist: { mesinMenyala: true, bodiMulus: true, aksesorisLengkap: true },
          signedAt: new Date().toISOString(),
          confirmedBy: 'OWNER',
          photos: ['https://example.test/bast/awal-o1.jpg']
        }
      }
    })
    assert.equal(confirmDeliveryRes.status, 200)
    assert.equal(confirmDeliveryRes.body.data.status, 'SEWA_AKTIF')
    assert.ok(confirmDeliveryRes.body.data.initialBast?.signedAt)

    // ── Fase 5A: Pengembalian Penjemputan Kurir & Validasi Kode PIN ────────────
    const submitReturnRes = await api(`/api/orders/${order1Id}/return-submit`, {
      method: 'POST',
      token: renterToken,
      body: {
        returnData: {
          returnMethod: 'COURIER_PICKUP',
          returnDate: new Date().toISOString(),
          pickupAddress: 'Jl. Kemang Selatan No. 19',
          pickupPhone: '081234560002',
          checklist: { mesinMenyala: true, bodiUtuh: true, komponenLengkap: true, kebersihanOk: true, adaKendala: false },
          photos: {
            front: 'https://example.test/bast/akhir-o1-front.jpg',
            side: 'https://example.test/bast/akhir-o1-side.jpg',
            panel: 'https://example.test/bast/akhir-o1-panel.jpg',
            back: 'https://example.test/bast/akhir-o1-back.jpg'
          },
          signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      }
    })
    assert.equal(submitReturnRes.status, 200)
    assert.equal(submitReturnRes.body.data.status, 'INSPEKSI')
    order1HandoverPin = submitReturnRes.body.data.returnData?.handoverPin
    assert.match(String(order1HandoverPin), /^\d{6}$/)

    // Penyewa menandai barang telah diserahkan ke kurir penjemputan
    const markHandedRes = await api(`/api/orders/${order1Id}/mark-handed-over`, {
      method: 'PATCH',
      token: renterToken
    })
    assert.equal(markHandedRes.status, 200)
    assert.ok(markHandedRes.body.data.returnData?.handedOverAt)

    // Uji PIN salah harus ditolak
    const wrongPin = order1HandoverPin === '111111' ? '222222' : '111111'
    const invalidPinRes = await api(`/api/orders/${order1Id}/confirm-return-receipt`, {
      method: 'PATCH',
      token: ownerToken,
      body: { handoverPin: wrongPin }
    })
    assert.equal(invalidPinRes.status, 400)
    assert.equal(invalidPinRes.body.error?.code, 'INVALID_HANDOVER_PIN')

    // Kurir/Pemilik memvalidasi PIN serah terima yang benar
    const validPinRes = await api(`/api/orders/${order1Id}/confirm-return-receipt`, {
      method: 'PATCH',
      token: ownerToken,
      body: { handoverPin: order1HandoverPin }
    })
    assert.equal(validPinRes.status, 200)
    assert.ok(validPinRes.body.data.returnData?.unitReceivedAt)
    assert.ok(validPinRes.body.data.returnData?.inspectionDeadline)

    // ── Fase 6A: Inspeksi BAST Normal (Approve & Release Escrow) ───────────────
    const renterBefore = await prisma.user.findUnique({ where: { id: renterUser.id }, select: { walletBalance: true } })
    const ownerBefore = await prisma.user.findUnique({ where: { id: ownerUser.id }, select: { walletBalance: true } })

    const approveBastRes = await api(`/api/orders/${order1Id}/complete-inspection`, {
      method: 'PATCH',
      token: ownerToken,
      body: {
        approveRefund: true,
        ownerNotes: 'Mesin berfungsi normal, kelengkapan komplit, kebersihan terjaga'
      }
    })
    assert.equal(approveBastRes.status, 200)
    assert.equal(approveBastRes.body.data.status, 'SELESAI')
    assert.equal(approveBastRes.body.data.damageFee, 0)

    const expectedFee1 = Math.round(400000 * PLATFORM_FEE_RATE) // 20.000
    const expectedOwnerPayout1 = 400000 - expectedFee1 + 60000 // 440.000
    const expectedRenterRefund1 = 500000

    assert.equal(approveBastRes.body.data.platformFee, expectedFee1)
    assert.equal(approveBastRes.body.data.netOwnerPayout, expectedOwnerPayout1)

    // Guard cegah double-settlement pada complete-inspection ulang
    const doubleInspect = await api(`/api/orders/${order1Id}/complete-inspection`, {
      method: 'PATCH',
      token: ownerToken,
      body: { approveRefund: true }
    })
    assert.equal(doubleInspect.status, 400)
    assert.equal(doubleInspect.body.error?.code, 'INVALID_STATUS')

    // Cek saldo dompet Penyewa (+100% deposit) & Pemilik (+sewa bersih & ongkir)
    const renterAfter = await prisma.user.findUnique({ where: { id: renterUser.id }, select: { walletBalance: true } })
    const ownerAfter = await prisma.user.findUnique({ where: { id: ownerUser.id }, select: { walletBalance: true } })
    assert.equal(renterAfter.walletBalance - renterBefore.walletBalance, expectedRenterRefund1)
    assert.equal(ownerAfter.walletBalance - ownerBefore.walletBalance, expectedOwnerPayout1)

    const ownerWalletApi = await api('/api/wallet/owner/me', { token: ownerToken })
    assert.equal(ownerWalletApi.status, 200)
    assert.equal(ownerWalletApi.body.availableBalance, expectedOwnerPayout1)

    // Pastikan peralatan kembali TERSEDIA
    const equipAfter6A = await prisma.equipment.findUnique({ where: { id: equipmentId } })
    assert.equal(equipAfter6A.status, 'TERSEDIA')
  })

  it('Fase 4B, 5B, 6B (Order 2 - Self-Pickup -> Store Dropoff -> PIN Validation -> Dispute & Arbitrase Admin)', async () => {
    // ── Fase 4B: Ambil Sendiri di Gudang (Self-Pickup) ─────────────────────────
    const accept2Res = await api(`/api/orders/${order2Id}/accept`, {
      method: 'PATCH',
      token: ownerToken
    })
    assert.equal(accept2Res.status, 200)
    assert.equal(accept2Res.body.data.status, 'DIKIRIM')

    // Penyewa mengambil unit di lokasi pemilik dan menyelesaikan serah terima
    const pickupDeliveryRes = await api(`/api/orders/${order2Id}/confirm-delivery`, {
      method: 'PATCH',
      token: renterToken,
      body: {
        initialBast: {
          notes: 'Unit diambil langsung di gudang pemilik dalam kondisi baik',
          conditionChecklist: { mesinMenyala: true, bodiUtuh: true, aksesorisLengkap: true },
          signedAt: new Date().toISOString(),
          confirmedBy: 'RENTER',
          photos: ['https://example.test/bast/awal-o2.jpg']
        }
      }
    })
    assert.equal(pickupDeliveryRes.status, 200)
    assert.equal(pickupDeliveryRes.body.data.status, 'SEWA_AKTIF')

    // ── Fase 5B: Diantar Sendiri ke Gudang (STORE_DROPOFF) + Validasi PIN ──────
    const return2Res = await api(`/api/orders/${order2Id}/return-submit`, {
      method: 'POST',
      token: renterToken,
      body: {
        returnData: {
          returnMethod: 'STORE_DROPOFF',
          returnDate: new Date().toISOString(),
          checklist: { mesinMenyala: true, bodiUtuh: true, komponenLengkap: true, kebersihanOk: true, adaKendala: false },
          photos: {
            front: 'https://example.test/bast/akhir-o2-front.jpg',
            side: 'https://example.test/bast/akhir-o2-side.jpg',
            panel: 'https://example.test/bast/akhir-o2-panel.jpg',
            back: 'https://example.test/bast/akhir-o2-back.jpg'
          },
          signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      }
    })
    assert.equal(return2Res.status, 200)
    assert.equal(return2Res.body.data.status, 'INSPEKSI')
    order2HandoverPin = return2Res.body.data.returnData?.handoverPin
    assert.match(String(order2HandoverPin), /^\d{6}$/)

    const handed2Res = await api(`/api/orders/${order2Id}/mark-handed-over`, {
      method: 'PATCH',
      token: renterToken
    })
    assert.equal(handed2Res.status, 200)

    const verifyPin2Res = await api(`/api/orders/${order2Id}/confirm-return-receipt`, {
      method: 'PATCH',
      token: ownerToken,
      body: { handoverPin: order2HandoverPin }
    })
    assert.equal(verifyPin2Res.status, 200)
    assert.ok(verifyPin2Res.body.data.returnData?.unitReceivedAt)

    // ── Fase 6B: Klaim Kerusakan Pemilik -> DisputeTicket -> Sanggahan -> Arbitrase Admin
    const rejectBastRes = await api(`/api/orders/${order2Id}/complete-inspection`, {
      method: 'PATCH',
      token: ownerToken,
      body: {
        approveRefund: false,
        damageFee: 300000,
        disputeReason: 'Nozzle steam wand bengkok dan pressure gauge retak saat diterima kembali',
        ownerNotes: 'Perlu penggantian sparepart steam wand',
        ownerInspectionPhotos: ['https://example.test/dispute/owner-damage-1.jpg']
      }
    })
    assert.equal(rejectBastRes.status, 200)
    assert.equal(rejectBastRes.body.data.status, 'DISPUTE')
    assert.ok(rejectBastRes.body.disputeTicket)
    disputeTicketId = rejectBastRes.body.disputeTicket.id

    // Verifikasi fix B1: DisputeTicket.ownerId wajib berisi ID pemilik alat, BUKAN equipmentId
    assert.equal(rejectBastRes.body.disputeTicket.ownerId, ownerUser.id)
    assert.equal(rejectBastRes.body.disputeTicket.renterId, renterUser.id)
    assert.equal(rejectBastRes.body.disputeTicket.status, 'OPEN')

    // Verifikasi saldo escrow hold Penyewa mencakup deposit Order 2 saat DISPUTE
    const walletDuringDispute = await api('/api/wallet', { token: renterToken })
    assert.equal(walletDuringDispute.status, 200)
    assert.equal(walletDuringDispute.body.escrowHold, 500000)

    // Penyewa membuka klaim & mengirim nota sanggahan beserta bukti foto tandingan
    const defenseRes = await api(`/api/orders/${order2Id}/initiate-defense`, {
      method: 'PATCH',
      token: renterToken,
      body: {
        renterDefenseNote: 'Saat diserahkan ke gudang pemilik, pressure gauge berfungsi normal. Lihat foto BAST akhir.',
        renterCounterPhotos: [
          'https://example.test/dispute/renter-counter-1.jpg',
          'https://example.test/dispute/renter-counter-2.jpg'
        ]
      }
    })
    assert.equal(defenseRes.status, 200)
    assert.equal(defenseRes.body.data.status, 'OPEN')
    assert.ok(defenseRes.body.data.defendedAt)

    // Admin membuka tiket mediasi sengketa & memeriksa seluruh bukti kedua belah pihak
    const disputeDetailRes = await api(`/api/admin/disputes/${disputeTicketId}`, {
      token: adminToken
    })
    assert.equal(disputeDetailRes.status, 200)
    const ticket = disputeDetailRes.body.dispute
    assert.equal(ticket.status, 'OPEN')
    assert.equal(ticket.claimAmount, 300000)
    assert.equal(ticket.ownerPhotos.length, 1)
    assert.equal(ticket.renterCounterPhotos.length, 2)
    assert.ok(ticket.order?.initialBast?.photos)
    assert.ok(ticket.order?.returnData?.photos)

    // Snapshot saldo Penyewa & Pemilik sebelum putusan arbitrase
    const renterBeforeResolve = await prisma.user.findUnique({ where: { id: renterUser.id }, select: { walletBalance: true } })
    const ownerBeforeResolve = await prisma.user.findUnique({ where: { id: ownerUser.id }, select: { walletBalance: true } })

    // Admin menjatuhkan putusan arbitrase RESOLVED_SPLIT: ganti rugi Rp 180.000
    const resolveRes = await api(`/api/admin/disputes/${disputeTicketId}/resolve`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        status: 'RESOLVED_SPLIT',
        finalDamageFee: 180000,
        adminArbitrageNote: 'Dari foto komparasi BAST Awal & Akhir, kerusakan sebagian terverifikasi pada steam nozzle (Rp 180.000).'
      }
    })
    assert.equal(resolveRes.status, 200)
    assert.equal(resolveRes.body.dispute.status, 'RESOLVED_SPLIT')
    assert.equal(resolveRes.body.dispute.finalDamageFee, 180000)
    assert.equal(resolveRes.body.order.status, 'SELESAI')
    assert.equal(resolveRes.body.order.isResolvedByAdmin, true)

    // Verifikasi distribusi dana escrow akurat 100% (konservasi saldo + platform fee 5%)
    const expectedFee2 = Math.round(600000 * PLATFORM_FEE_RATE) // 30.000
    const expectedRenterRefund2 = 500000 - 180000 // 320.000
    const expectedOwnerPayout2 = 600000 - expectedFee2 + 180000 // 750.000

    assert.equal(resolveRes.body.financialDistribution.refundToRenter, expectedRenterRefund2)
    assert.equal(resolveRes.body.financialDistribution.payoutToOwner, expectedOwnerPayout2)
    assert.equal(resolveRes.body.financialDistribution.platformFee, expectedFee2)
    assert.equal(
      expectedRenterRefund2 + expectedOwnerPayout2 + expectedFee2,
      600000 + 500000 // Total sewa + deposit Order 2 terkonservasi 100%
    )

    const ownerWalletAfter6B = await api('/api/wallet/owner/me', { token: ownerToken })
    assert.equal(ownerWalletAfter6B.status, 200)
    assert.equal(ownerWalletAfter6B.body.availableBalance, 440000 + expectedOwnerPayout2)

    const renterAfterResolve = await prisma.user.findUnique({ where: { id: renterUser.id }, select: { walletBalance: true } })
    const ownerAfterResolve = await prisma.user.findUnique({ where: { id: ownerUser.id }, select: { walletBalance: true } })
    assert.equal(renterAfterResolve.walletBalance - renterBeforeResolve.walletBalance, expectedRenterRefund2)
    assert.equal(ownerAfterResolve.walletBalance - ownerBeforeResolve.walletBalance, expectedOwnerPayout2)

    // Escrow hold penyewa kembali 0 dan alat kembali TERSEDIA
    const walletAfterResolve = await api('/api/wallet', { token: renterToken })
    assert.equal(walletAfterResolve.status, 200)
    assert.equal(walletAfterResolve.body.escrowHold, 0)

    const equipAfter6B = await prisma.equipment.findUnique({ where: { id: equipmentId } })
    assert.equal(equipAfter6B.status, 'TERSEDIA')
  })
})
