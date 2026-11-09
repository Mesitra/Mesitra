/**
 * Realtime Event Service (Server-Sent Events / SSE)
 *
 * Mengelola koneksi streaming HTTP searah (Server-Sent Events) untuk
 * pengiriman event instan ke frontend (pesan chat, notifikasi, update pesanan, dll)
 * tanpa polling jeda dan tanpa dependensi server socket eksternal.
 */

class RealtimeService {
  constructor() {
    // Map<userId, Set<express.Response>>
    this.clients = new Map()
    // Heartbeat timer untuk menjaga koneksi tetap aktif di balik proxy
    this.heartbeatInterval = null
    this.startHeartbeat()
  }

  startHeartbeat() {
    if (this.heartbeatInterval) return
    this.heartbeatInterval = setInterval(() => {
      this.broadcastComment('heartbeat')
    }, 25000)
    // Cegah interval menahan proses exit pada pengujian
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref()
    }
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Daftarkan response stream klien yang terotentikasi.
   * @param {string} userId
   * @param {string} role
   * @param {import('express').Response} res
   * @param {import('express').Request} req
   */
  addClient(userId, role, res, req) {
    if (!userId || !res) return

    // Konfigurasi header SSE standar
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })

    // Beri tanda ID dan Role pada stream response
    res.userId = userId
    res.userRole = role

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    const userSockets = this.clients.get(userId)
    userSockets.add(res)

    // Kirim event hand-shake inisial
    res.write(`event: connected\ndata: ${JSON.stringify({ userId, role, connectedAt: new Date().toISOString() })}\n\n`)

    // Bersihkan saat koneksi terputus oleh browser/klien
    req.on('close', () => {
      this.removeClient(userId, res)
    })
    res.on('finish', () => {
      this.removeClient(userId, res)
    })
  }

  /**
   * Hapus koneksi stream yang ditutup.
   * @param {string} userId
   * @param {import('express').Response} res
   */
  removeClient(userId, res) {
    if (!this.clients.has(userId)) return
    const userSockets = this.clients.get(userId)
    userSockets.delete(res)
    if (userSockets.size === 0) {
      this.clients.delete(userId)
    }
  }

  /**
   * Kirim event ke satu pengguna spesifik (ke seluruh tab/perangkat aktifnya).
   * @param {string} userId
   * @param {string} event
   * @param {any} data
   */
  sendToUser(userId, event, data) {
    if (!userId || !this.clients.has(userId)) return false
    const sockets = this.clients.get(userId)
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of sockets) {
      try {
        res.write(payload)
      } catch (err) {
        console.error(`[SSE] Gagal kirim event ${event} ke user ${userId}:`, err?.message)
        sockets.delete(res)
      }
    }
    return true
  }

  /**
   * Kirim event ke kumpulan user.
   * @param {string[]} userIds
   * @param {string} event
   * @param {any} data
   */
  sendToUsers(userIds, event, data) {
    if (!Array.isArray(userIds)) return
    for (const id of userIds) {
      this.sendToUser(id, event, data)
    }
  }

  /**
   * Kirim event ke seluruh user dengan role tertentu (misal: 'ADMIN').
   * @param {string} role
   * @param {string} event
   * @param {any} data
   */
  sendToRole(role, event, data) {
    const targetRole = String(role || '').toUpperCase()
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const [, sockets] of this.clients.entries()) {
      for (const res of sockets) {
        if (String(res.userRole || '').toUpperCase() === targetRole) {
          try {
            res.write(payload)
          } catch {
            sockets.delete(res)
          }
        }
      }
    }
  }

  /**
   * Broadcast event ke semua koneksi aktif tanpa kecuali.
   * @param {string} event
   * @param {any} data
   */
  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const [, sockets] of this.clients.entries()) {
      for (const res of sockets) {
        try {
          res.write(payload)
        } catch {
          sockets.delete(res)
        }
      }
    }
  }

  /**
   * Kirim baris komentar ping untuk menjaga koneksi.
   * @param {string} comment
   */
  broadcastComment(comment) {
    const payload = `: ${comment}\n\n`
    for (const [, sockets] of this.clients.entries()) {
      for (const res of sockets) {
        try {
          res.write(payload)
        } catch {
          sockets.delete(res)
        }
      }
    }
  }

  /**
   * Metrik statistik koneksi real-time untuk observability.
   */
  getActiveStats() {
    let totalConnections = 0
    for (const sockets of this.clients.values()) {
      totalConnections += sockets.size
    }
    return {
      activeUsersCount: this.clients.size,
      totalConnectionsCount: totalConnections
    }
  }
}

export const realtimeService = new RealtimeService()

