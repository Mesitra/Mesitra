import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestId, requestLogger } from './middleware/requestLogger.js'
import { categoriesRouter } from './routes/categories.js'
import { healthRouter } from './routes/health.js'
import { rentalsRouter } from './routes/rentals.js'
import { statsRouter } from './routes/stats.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import { equipmentsRouter } from './routes/equipments.js'
import { ordersRouter } from './routes/orders.js'
import { reviewsRouter } from './routes/reviews.js'
import { chatsRouter } from './routes/chats.js'
import { walletRouter } from './routes/wallet.js'
import { notificationsRouter } from './routes/notifications.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ENDPOINTS = [
  'GET /api/health',
  'POST /api/auth/register',
  'POST /api/auth/check-unique',
  'POST /api/auth/login',
  'GET /api/auth/me',
  'GET /api/auth/submission-status/:emailOrId',
  'GET /api/admin/submissions',
  'GET /api/admin/submissions/:id',
  'PATCH /api/admin/submissions/:id/approve',
  'PATCH /api/admin/submissions/:id/revision',
  'PATCH /api/admin/submissions/:id/reject',
  'PATCH /api/admin/users/:id/suspend',
  'PATCH /api/admin/users/:id/unsuspend',
  'GET /api/admin/withdrawals',
  'GET /api/admin/withdrawals/:id',
  'PATCH /api/admin/withdrawals/:id/approve',
  'PATCH /api/admin/withdrawals/:id/reject',
  'GET /api/rentals',
  'POST /api/rentals',
  'GET /api/rentals/:id',
  'PATCH /api/rentals/:id',
  'DELETE /api/rentals/:id',
  'GET /api/equipments',
  'GET /api/equipments/:id',
  'GET /api/categories',
  'GET /api/orders',
  'GET /api/orders/:id',
  'POST /api/orders',
  'POST /api/orders/:id/review',
  'PATCH /api/orders/:id/cancel',
  'PATCH /api/orders/:id/confirm-delivery',
  'PATCH /api/orders/:id/initial-bast',
  'PATCH /api/orders/:id/extend',
  'PATCH /api/orders/:id/return-draft',
  'POST /api/orders/:id/return-submit',
  'PATCH /api/orders/:id/complete-inspection',
  'PATCH /api/orders/:id/dispute',
  'PATCH /api/orders/:id/resolve-dispute',
  'GET /api/reviews',
  'POST /api/reviews',
  'GET /api/chats',
  'GET /api/chats/unread-count',
  'GET /api/chats/by-partner/:partnerId',
  'GET /api/chats/:conversationId/messages',
  'POST /api/chats/messages',
  'GET /api/stats',
  'GET /api/notifications',
  'PATCH /api/notifications/:id/read',
  'GET /openapi.yaml'
]

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(requestId)
  app.use(requestLogger)
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (config.corsOrigins.includes(origin)) return callback(null, true)
        if (config.nodeEnv === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true)
        }
        return callback(null, false)
      },
      credentials: true
    })
  )
  // Batas body 12mb supaya unggahan foto (data URL base64) tetap diterima utuh.
  app.use(express.json({ limit: '12mb' }))

  app.get('/', (req, res) => {
    res.json({ name: 'MyRent API', version: config.version, docs: '/openapi.yaml', endpoints: ENDPOINTS })
  })

  app.get('/openapi.yaml', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'openapi.yaml'), {
      headers: { 'Content-Type': 'application/yaml; charset=utf-8' }
    })
  })

  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/rentals', rentalsRouter)
  app.use('/api/equipments', equipmentsRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/reviews', reviewsRouter)
  app.use('/api/chats', chatsRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/wallet', walletRouter)
  app.use('/api/notifications', notificationsRouter)



  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
