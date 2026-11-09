/**
 * Rate Limiter Middleware — MyRent API Protection
 *
 * Mengamankan endpoint sensitif terhadap serangan brute-force, DDoS, dan abuse:
 * - Auth (Login, Register, OTP)
 * - Orders (Checkout, Transaksi)
 * - Wallet (Penarikan Dana / Payout)
 *
 * BLUEPRINT PRODUCTION WITH REDIS:
 * -------------------------------------------------------------
 * Untuk multi-instance / horizontal scaling di production, gunakan RedisStore:
 * import RedisStore from 'rate-limit-redis'
 * import { Redis } from 'ioredis'
 * const redisClient = new Redis(process.env.REDIS_URL)
 * const store = new RedisStore({ sendCommand: (...args) => redisClient.call(...args) })
 * -------------------------------------------------------------
 * Di environment lokal & test, MemoryStore default digunakan secara aman tanpa
 * mewajibkan server Redis aktif.
 */
import rateLimit from 'express-rate-limit'

const isTestEnv = process.env.NODE_ENV === 'test'

/**
 * Standard handler respon saat batas request terlampaui (HTTP 429).
 */
const rateLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    error: {
      code: 'TOO_MANY_REQUESTS',
      message,
      retryAfterSeconds: Math.ceil((req.rateLimit?.resetTime?.getTime?.() - Date.now()) / 1000) || 60
    }
  })
}

/**
 * 1. Auth Rate Limiter
 * Melindungi /api/auth/login, register, check-unique dari brute-force.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: isTestEnv ? 10000 : 60, // 60 request per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Terlalu banyak percobaan autentikasi. Silakan coba kembali dalam 15 menit.'),
  skip: (req) => isTestEnv && !req.headers['x-test-rate-limit']
})

/**
 * 2. Order Rate Limiter
 * Melindungi /api/orders dari spam order atau manipulasi inventaris alat.
 */
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10000 : 120, // 120 request per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Batas pembuatan dan modifikasi pesanan terlampaui. Silakan tunggu sejenak.'),
  skip: (req) => isTestEnv && !req.headers['x-test-rate-limit']
})

/**
 * 3. Wallet Rate Limiter
 * Melindungi /api/wallet/owner/withdraw dari penarikan bertubi-tubi.
 */
export const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10000 : 30, // 30 request per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Batas frekuensi permintaan penarikan dana tercapai. Silakan coba beberapa saat lagi.'),
  skip: (req) => isTestEnv && !req.headers['x-test-rate-limit']
})

