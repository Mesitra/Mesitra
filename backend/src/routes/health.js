import { Router } from 'express'
import { config } from '../config.js'
import { prisma } from '../lib/prisma.js'
import { realtimeService } from '../services/realtimeService.js'

export const healthRouter = Router()

/**
 * GET /api/health
 * Endpoint pemeriksaan kesehatan dan observabilitas sistem (System Observability).
 * Memantau uptime, penggunaan RAM/heap, status koneksi database Prisma,
 * serta koneksi stream SSE real-time yang sedang aktif.
 */
healthRouter.get('/', async (req, res) => {
  const startTime = Date.now()
  let dbStatus = 'connected'
  let dbLatencyMs = null

  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbStart
  } catch (err) {
    dbStatus = 'disconnected'
    console.error('[HealthCheck] Database connection error:', err?.message)
  }

  const mem = process.memoryUsage()
  const uptimeSeconds = Math.round(process.uptime())

  const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

  const isHealthy = dbStatus === 'connected'

  const payload = {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'mesitra-api',
    version: config.version,
    environment: config.env || process.env.NODE_ENV || 'development',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rss: formatBytes(mem.rss),
        heapUsed: formatBytes(mem.heapUsed),
        heapTotal: formatBytes(mem.heapTotal),
        external: formatBytes(mem.external)
      }
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    realtime: realtimeService.getActiveStats()
  }

  const statusCode = isHealthy ? 200 : 503
  res.status(statusCode).json(payload)
})
