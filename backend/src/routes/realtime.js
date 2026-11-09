import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { realtimeService } from '../services/realtimeService.js'

export const realtimeRouter = Router()

/**
 * GET /api/realtime/stream
 * Endpoint Server-Sent Events (SSE).
 * Klien terhubung menggunakan EventSource browser atau fetch readable stream.
 * Menerima token otentikasi via Query Param (?token=...) atau header Authorization.
 */
realtimeRouter.get('/stream', (req, res) => {
  let token = req.query.token

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token otentikasi diperlukan untuk stream real-time' }
    })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    const userId = decoded.userId
    const role = String(decoded.role || '').toUpperCase()

    realtimeService.addClient(userId, role, res, req)
  } catch {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau telah kedaluwarsa' }
    })
  }
})

/**
 * GET /api/realtime/status
 * Mengembalikan metrik klien real-time aktif.
 */
realtimeRouter.get('/status', (req, res) => {
  return res.json({
    status: 'ok',
    metrics: realtimeService.getActiveStats()
  })
})

