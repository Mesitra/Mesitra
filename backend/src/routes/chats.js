import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'
import { ApiError } from '../lib/errors.js'

export const chatsRouter = Router()

/**
 * Middleware: ambil userId dan userRole dari JWT token.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token otentikasi wajib disertakan' }
    })
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret)
    req.userId = decoded.userId
    req.userRole = String(decoded.role || '').toUpperCase()
    next()
  } catch {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
    })
  }
}

chatsRouter.use(authenticate)

/**
 * Helper: format objek partner percakapan
 */
function formatPartner(conversation, currentUserId) {
  const isRenter = conversation.renterId === currentUserId
  const partnerUser = isRenter ? conversation.owner : conversation.renter
  const partnerRole = isRenter ? 'PEMILIK' : 'PENYEWA'

  const kyc = partnerUser?.kycData && typeof partnerUser.kycData === 'object' ? partnerUser.kycData : {}
  const rawPhoto = kyc.profilePhoto || kyc.avatarUrl || kyc.photo || kyc.selfieFile || kyc.frontPhoto || null
  const photo = typeof rawPhoto === 'string' ? rawPhoto : rawPhoto?.preview || rawPhoto?.url || null

  return {
    id: partnerUser?.id,
    fullName: partnerUser?.fullName || (partnerRole === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa UMKM'),
    name: partnerUser?.fullName,
    email: partnerUser?.email,
    phone: partnerUser?.phone,
    role: partnerRole,
    verificationStatus: partnerUser?.verificationStatus || 'DISETUJUI',
    businessName: kyc.businessName || null,
    photo
  }
}

/**
 * GET /api/chats/unread-count
 * Mengembalikan total pesan belum dibaca untuk user yang login.
 */
chatsRouter.get('/unread-count', async (req, res, next) => {
  try {
    const count = await prisma.message.count({
      where: {
        conversation: {
          OR: [{ renterId: req.userId }, { ownerId: req.userId }]
        },
        senderId: { not: req.userId },
        isRead: false
      }
    })
    res.json({ data: { unreadCount: count } })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/chats/by-partner/:partnerId
 * Cek apakah sudah ada percakapan tersimpan dengan partnerId tertentu.
 * Jika belum ada, kembalikan { data: null, isDraft: true } tanpa membuat record di DB (Mendukung Lazy Session).
 */
chatsRouter.get('/by-partner/:partnerId', async (req, res, next) => {
  try {
    const partnerId = String(req.params.partnerId || '').trim()
    if (!partnerId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'partnerId wajib diisi' } })
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { renterId: req.userId, ownerId: partnerId },
          { renterId: partnerId, ownerId: req.userId }
        ]
      },
      include: {
        renter: {
          select: { id: true, fullName: true, email: true, phone: true, role: true, verificationStatus: true, kycData: true }
        },
        owner: {
          select: { id: true, fullName: true, email: true, phone: true, role: true, verificationStatus: true, kycData: true }
        }
      }
    })

    if (!conversation) {
      return res.json({ data: null, isDraft: true })
    }

    const partner = formatPartner(conversation, req.userId)
    return res.json({
      data: {
        id: conversation.id,
        renterId: conversation.renterId,
        ownerId: conversation.ownerId,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        partner,
        isDraft: false
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/chats
 * Mengambil daftar percakapan milik user yang sedang login (baik sebagai Penyewa maupun Pemilik),
 * diurutkan berdasarkan lastMessageAt terbaru lengkap dengan partner profile, pesan terakhir, dan unreadCount.
 */
chatsRouter.get('/', async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ renterId: req.userId }, { ownerId: req.userId }]
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        renter: {
          select: { id: true, fullName: true, email: true, phone: true, role: true, verificationStatus: true, kycData: true }
        },
        owner: {
          select: { id: true, fullName: true, email: true, phone: true, role: true, verificationStatus: true, kycData: true }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    // Hitung unread count per percakapan
    const data = await Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: req.userId },
            isRead: false
          }
        })

        const partner = formatPartner(c, req.userId)
        const lastMessage = c.messages[0] || null

        return {
          id: c.id,
          renterId: c.renterId,
          ownerId: c.ownerId,
          lastMessageAt: c.lastMessageAt,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          partner,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                contextType: lastMessage.contextType,
                isRead: lastMessage.isRead,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt
              }
            : null,
          unreadCount
        }
      })
    )

    res.json({ data })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/chats/:conversationId/messages
 * Mengambil seluruh riwayat pesan dalam satu ruang obrolan sekaligus menandai pesan lawan bicara sebagai isRead: true.
 */
chatsRouter.get('/:conversationId/messages', async (req, res, next) => {
  try {
    const conversationId = String(req.params.conversationId || '').trim()

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        renter: {
          select: { id: true, fullName: true, email: true, phone: true, role: true, verificationStatus: true, kycData: true }
        },
        owner: {
          select: { id: true, fullName: true, email: true, phone: true, role: true, verificationStatus: true, kycData: true }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Percakapan tidak ditemukan' } })
    }

    if (conversation.renterId !== req.userId && conversation.ownerId !== req.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke percakapan ini' } })
    }

    // Tandai pesan dari lawan bicara sebagai sudah dibaca
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: req.userId },
        isRead: false
      },
      data: { isRead: true }
    })

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true }
        }
      }
    })

    const partner = formatPartner(conversation, req.userId)

    res.json({
      data: messages,
      conversation: {
        id: conversation.id,
        renterId: conversation.renterId,
        ownerId: conversation.ownerId,
        lastMessageAt: conversation.lastMessageAt,
        partner
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/chats/messages
 * Inti Lazy Session:
 * Menerima { recipientId, conversationId, content, contextType, contextData }.
 * HANYA saat endpoint ini dipanggil (saat pesan pertama benar-benar dikirim),
 * backend melakukan upsert/membuat record Conversation baru antara renterId dan ownerId,
 * lalu menyimpan Message dan memperbarui lastMessageAt.
 */
chatsRouter.post('/messages', async (req, res, next) => {
  try {
    const { recipientId, conversationId, content, contextType, contextData } = req.body ?? {}

    const textContent = String(content || '').trim()
    if (!textContent && !contextData) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Isi pesan atau lampiran konteks wajib disertakan' }
      })
    }

    let conversation

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      })

      if (!conversation) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Percakapan tidak ditemukan' } })
      }

      if (conversation.renterId !== req.userId && conversation.ownerId !== req.userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke percakapan ini' } })
      }

      // Perbarui lastMessageAt
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      })
    } else if (recipientId) {
      if (recipientId === req.userId) {
        return res.status(400).json({
          error: { code: 'INVALID_RECIPIENT', message: 'Tidak dapat mengirim pesan ke diri sendiri' }
        })
      }

      const users = await prisma.user.findMany({
        where: { id: { in: [req.userId, recipientId] } },
        select: { id: true, role: true, fullName: true }
      })

      const me = users.find((u) => u.id === req.userId)
      const partner = users.find((u) => u.id === recipientId)

      if (!partner) {
        return res.status(404).json({
          error: { code: 'RECIPIENT_NOT_FOUND', message: 'Penerima pesan tidak ditemukan' }
        })
      }

      let renterId
      let ownerId

      if (me.role === 'PEMILIK') {
        ownerId = me.id
        renterId = partner.id
      } else if (partner.role === 'PEMILIK') {
        renterId = me.id
        ownerId = partner.id
      } else {
        renterId = me.id
        ownerId = partner.id
      }

      // Upsert Lazy Conversation: hanya dibuat saat pesan pertama benar-benar dikirim
      conversation = await prisma.conversation.upsert({
        where: {
          renterId_ownerId: { renterId, ownerId }
        },
        create: {
          renterId,
          ownerId,
          lastMessageAt: new Date()
        },
        update: {
          lastMessageAt: new Date()
        }
      })
    } else {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'conversationId atau recipientId wajib disertakan' }
      })
    }

    // Simpan pesan baru
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: req.userId,
        content: textContent || (contextType === 'ORDER' ? 'Informasi Pesanan' : 'Informasi Produk'),
        contextType: contextType || null,
        contextData: contextData || null,
        isRead: false
      },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true }
        }
      }
    })

    return res.status(201).json({
      data: message,
      conversation: {
        id: conversation.id,
        renterId: conversation.renterId,
        ownerId: conversation.ownerId,
        lastMessageAt: conversation.lastMessageAt
      }
    })
  } catch (error) {
    next(error)
  }
})

