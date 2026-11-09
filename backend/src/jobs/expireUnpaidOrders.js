/**
 * Auto-Expire Job: Batalkan pesanan MENUNGGU_PEMBAYARAN yang melewati paymentDeadline.
 * Berjalan setiap 5 menit untuk membersihkan pesanan yang tidak dibayar.
 */

import { prisma } from '../lib/prisma.js'

/**
 * Jalankan job untuk expire pesanan yang belum dibayar.
 * @returns {Promise<number>} Jumlah pesanan yang dibatalkan
 */
export async function expireUnpaidOrders() {
  try {
    const now = new Date()

    // Cari pesanan MENUNGGU_PEMBAYARAN yang paymentDeadline sudah lewat
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'MENUNGGU_PEMBAYARAN',
        paymentDeadline: {
          lt: now
        }
      },
      select: {
        id: true,
        invoiceNumber: true,
        userId: true,
        equipmentId: true,
        paymentDeadline: true
      }
    })

    if (expiredOrders.length === 0) {
      return 0
    }

    // Batch update: ubah status ke DIBATALKAN
    const orderIds = expiredOrders.map((o) => o.id)
    const result = await prisma.order.updateMany({
      where: {
        id: { in: orderIds }
      },
      data: {
        status: 'DIBATALKAN'
      }
    })

    console.log(
      `[ExpireJob] ${result.count} pesanan expired dan dibatalkan otomatis:`,
      expiredOrders.map((o) => o.invoiceNumber).join(', ')
    )

    return result.count
  } catch (error) {
    console.error('[ExpireJob] Error saat expire pesanan:', error)
    return 0
  }
}
