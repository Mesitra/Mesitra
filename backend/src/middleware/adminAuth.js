import { requireAuth, requireAdmin } from './authMiddleware.js'

/**
 * Middleware JWT khusus Admin HQ.
 *
 * Semua endpoint di bawah `/api/admin` memakai middleware ini.
 * Memanggil requireAuth untuk memverifikasi token & status suspensi akun,
 * lalu memastikan role akun adalah ADMIN.
 */
export { requireAuth, requireAdmin }
