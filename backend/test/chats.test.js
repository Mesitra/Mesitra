import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { config } from '../src/config.js'

const PENYEWA_ID = '22222222-2222-4222-8222-222222222222'
const PEMILIK_ID = '11111111-1111-4111-8111-111111111111'

test('Chat & Lazy Session API Flow', async (t) => {
  const app = createApp()
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  const renterToken = jwt.sign({ userId: PENYEWA_ID, role: 'PENYEWA' }, config.jwtSecret, { expiresIn: '1h' })
  const ownerToken = jwt.sign({ userId: PEMILIK_ID, role: 'PEMILIK' }, config.jwtSecret, { expiresIn: '1h' })

  // Cari ownerAlt untuk pengujian lazy session
  const ownerAlt = await prisma.user.findUnique({
    where: { email: 'owner@myrent.com' }
  })
  assert.ok(ownerAlt, 'ownerAlt must exist in DB')
  const ownerAltToken = jwt.sign({ userId: ownerAlt.id, role: 'PEMILIK' }, config.jwtSecret, { expiresIn: '1h' })

  // Pastikan percakapan antara penyewa dan ownerAlt belum ada sebelum test lazy session
  await prisma.conversation.deleteMany({
    where: {
      OR: [
        { renterId: PENYEWA_ID, ownerId: ownerAlt.id },
        { renterId: ownerAlt.id, ownerId: PENYEWA_ID }
      ]
    }
  })

  t.after(async () => {
    try {
      await prisma.conversation.deleteMany({
        where: {
          OR: [
            { renterId: PENYEWA_ID, ownerId: ownerAlt.id },
            { renterId: ownerAlt.id, ownerId: PENYEWA_ID }
          ]
        }
      })
    } catch {
      // ignore
    } finally {
      server.close()
      await prisma.$disconnect()
    }
  })

  await t.test('GET /api/chats mengembalikan daftar percakapan aktif penyewa', async () => {
    const res = await fetch(`${baseUrl}/api/chats`, {
      headers: { Authorization: `Bearer ${renterToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.data))
    assert.ok(body.data.length >= 1)

    const disputeChat = body.data.find((c) => c.ownerId === PEMILIK_ID)
    assert.ok(disputeChat)
    assert.equal(disputeChat.partner.id, PEMILIK_ID)
    assert.equal(disputeChat.partner.role, 'PEMILIK')
    assert.ok(disputeChat.lastMessage)
  })

  await t.test('GET /api/chats/unread-count mengembalikan jumlah pesan belum dibaca', async () => {
    // Reset status unread pesan seed dari penyewa agar test selalu deterministik
    await prisma.message.updateMany({
      where: {
        conversation: {
          OR: [
            { renterId: PENYEWA_ID, ownerId: PEMILIK_ID },
            { renterId: PEMILIK_ID, ownerId: PENYEWA_ID }
          ]
        },
        senderId: PENYEWA_ID
      },
      data: { isRead: false }
    })

    // Untuk pemilik, ada pesan belum dibaca dari penyewa
    const res = await fetch(`${baseUrl}/api/chats/unread-count`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(typeof body.data.unreadCount, 'number')
    assert.ok(body.data.unreadCount >= 1)
  })

  await t.test('GET /api/chats/by-partner/:partnerId mendeteksi Sesi Sementara (Draft / Lazy Session)', async () => {
    // Belum ada chat antara penyewa dan ownerAlt
    const res = await fetch(`${baseUrl}/api/chats/by-partner/${ownerAlt.id}`, {
      headers: { Authorization: `Bearer ${renterToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.data, null)
    assert.equal(body.isDraft, true)
  })

  let lazyConversationId = null

  await t.test('POST /api/chats/messages menginisialisasi Lazy Session saat pesan pertama dikirim', async () => {
    // Verifikasi di DB belum ada conversation
    const beforeCount = await prisma.conversation.count({
      where: { renterId: PENYEWA_ID, ownerId: ownerAlt.id }
    })
    assert.equal(beforeCount, 0)

    // Kirim pesan pertama membawa konteks EQUIPMENT
    const res = await fetch(`${baseUrl}/api/chats/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${renterToken}`
      },
      body: JSON.stringify({
        recipientId: ownerAlt.id,
        content: 'Halo Pak, apakah unit Genset 5000W masih tersedia untuk akhir pekan?',
        contextType: 'EQUIPMENT',
        contextData: {
          id: 'a1000000-0000-4000-8000-000000000007',
          name: 'Genset Silent Inverter 5000 Watt',
          pricePerDay: 250000,
          powerWatt: 5000
        }
      })
    })

    assert.equal(res.status, 201)
    const body = await res.json()
    assert.ok(body.data)
    assert.equal(body.data.contextType, 'EQUIPMENT')
    assert.equal(body.data.contextData.name, 'Genset Silent Inverter 5000 Watt')
    assert.equal(body.data.content, 'Halo Pak, apakah unit Genset 5000W masih tersedia untuk akhir pekan?')
    assert.ok(body.conversation)
    assert.ok(body.conversation.id)

    lazyConversationId = body.conversation.id

    // Verifikasi bahwa Conversation sekarang RESMI tersimpan di DB
    const afterConv = await prisma.conversation.findUnique({
      where: { id: lazyConversationId }
    })
    assert.ok(afterConv)
    assert.equal(afterConv.renterId, PENYEWA_ID)
    assert.equal(afterConv.ownerId, ownerAlt.id)
  })

  await t.test('GET /api/chats/:conversationId/messages mengambil riwayat dan menandai pesan dibaca', async () => {
    // OwnerAlt membuka pesan dari penyewa
    const res = await fetch(`${baseUrl}/api/chats/${lazyConversationId}/messages`, {
      headers: { Authorization: `Bearer ${ownerAltToken}` }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.data))
    assert.equal(body.data.length, 1)
    assert.equal(body.data[0].contextType, 'EQUIPMENT')

    // Verifikasi pesan telah ditandai isRead: true di DB
    const readMsg = await prisma.message.findUnique({
      where: { id: body.data[0].id }
    })
    assert.equal(readMsg.isRead, true)
  })

  await t.test('POST /api/chats/messages membalas pesan dari Pemilik ke Penyewa', async () => {
    const res = await fetch(`${baseUrl}/api/chats/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAltToken}`
      },
      body: JSON.stringify({
        conversationId: lazyConversationId,
        content: 'Halo, Genset ready siap kirim lengkap dengan kabel roll 25m.'
      })
    })

    assert.equal(res.status, 201)
    const body = await res.json()
    assert.equal(body.data.content, 'Halo, Genset ready siap kirim lengkap dengan kabel roll 25m.')
    assert.equal(body.data.senderId, ownerAlt.id)
  })

  await t.test('POST /api/chats/messages menolak kirim pesan ke diri sendiri', async () => {
    const res = await fetch(`${baseUrl}/api/chats/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${renterToken}`
      },
      body: JSON.stringify({
        recipientId: PENYEWA_ID,
        content: 'Halo diri sendiri'
      })
    })

    assert.equal(res.status, 400)
    const body = await res.json()
    assert.equal(body.error?.code, 'INVALID_RECIPIENT')
  })
})
