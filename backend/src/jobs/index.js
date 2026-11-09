/**
 * Background Jobs Registry
 * Menjalankan cron jobs untuk otomasi backend.
 */

import cron from 'node-cron'
import { expireUnpaidOrders } from './expireUnpaidOrders.js'

/**
 * Inisialisasi semua background jobs.
 * Dipanggil saat server start.
 */
export function startBackgroundJobs() {
  // Job 1: Auto-expire pesanan belum dibayar setiap 5 menit
  cron.schedule('*/5 * * * *', async () => {
    await expireUnpaidOrders()
  })

  console.log('[Jobs] Background jobs started: expireUnpaidOrders (every 5 min)')
}
