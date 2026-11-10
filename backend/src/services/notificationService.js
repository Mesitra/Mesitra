/**
 * Notification Service — Mesitra
 *
 * Menyimpan in-app notification ke tabel Notification.
 * Cek preferensi notifikasi pemilik (TenantProfile) sebelum insert.
 */
import { prisma } from '../lib/prisma.js'
import { realtimeService } from './realtimeService.js'

// ─── Helper: ambil TenantProfile pemilik alat ───────────────────────────────

async function getOwnerProfile(tenantId) {
  return prisma.tenantProfile.findUnique({
    where: { userId: tenantId },
    select: {
      notifPesananBaru: true,
      notifPengembalianAlat: true,
      notifInspeksiDeposit: true
    }
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Notifikasi pesanan baru ke pemilik alat.
 * Dicek preferensi `notifPesananBaru` sebelum insert (default true).
 *
 * @param {string} tenantId - userId pemilik alat (equipment.ownerId)
 * @param {{ orderId?: string, invoiceNumber: string, equipmentName: string, renterName: string }} orderData
 */
export async function sendNewOrderNotif(tenantId, orderData) {
  const profile = await getOwnerProfile(tenantId)
  if (profile && profile.notifPesananBaru === false) return

  const { orderId, invoiceNumber, equipmentName, renterName } = orderData
  const notif = await prisma.notification.create({
    data: {
      userId: tenantId,
      type: 'ORDER_NEW',
      title: `Pesanan Baru: ${equipmentName}`,
      message: `Invoice ${invoiceNumber} dari ${renterName}. Silakan konfirmasi di dashboard.`,
      referenceId: orderId ?? null
    }
  })
  realtimeService.sendToUser(tenantId, 'notification:new', notif)
  return notif
}

/**
 * Notifikasi pengingat pengembalian alat ke pemilik.
 * Dicek preferensi `notifPengembalianAlat` sebelum insert.
 *
 * @param {string} tenantId
 * @param {{ orderId?: string, invoiceNumber: string, equipmentName: string, endDate: string }} orderData
 */
export async function sendReturnReminder(tenantId, orderData) {
  const profile = await getOwnerProfile(tenantId)
  if (profile && profile.notifPengembalianAlat === false) return

  const { orderId, invoiceNumber, equipmentName, endDate } = orderData
  const notif = await prisma.notification.create({
    data: {
      userId: tenantId,
      type: 'RETURN_REMINDER',
      title: `Pengembalian: ${equipmentName}`,
      message: `Alat "${equipmentName}" (${invoiceNumber}) dijadwalkan kembali ${endDate}. Pastikan siap menerima unit.`,
      referenceId: orderId ?? null
    }
  })
  realtimeService.sendToUser(tenantId, 'notification:new', notif)
  return notif
}

/**
 * Notifikasi inspeksi/deposit saat status INSPEKSI atau DISPUTE.
 * Dicek preferensi `notifInspeksiDeposit`.
 *
 * @param {string} tenantId
 * @param {{ orderId?: string, invoiceNumber: string, status: string }} orderData
 */
export async function sendInspectionNotif(tenantId, orderData) {
  const profile = await getOwnerProfile(tenantId)
  if (profile && profile.notifInspeksiDeposit === false) return

  const { orderId, invoiceNumber, status } = orderData
  const isDispute = status === 'DISPUTE'
  const notif = await prisma.notification.create({
    data: {
      userId: tenantId,
      type: isDispute ? 'DISPUTE' : 'INSPECTION',
      title: isDispute ? `Klaim Dispute: ${invoiceNumber}` : `Inspeksi Unit: ${invoiceNumber}`,
      message: isDispute
        ? `Penyewa mengajukan klaim dispute untuk pesanan ${invoiceNumber}. Selesaikan dalam 2×24 jam.`
        : `Unit masuk tahap inspeksi untuk pesanan ${invoiceNumber}. Selesaikan untuk melepas escrow deposit.`,
      referenceId: orderId ?? null
    }
  })
  realtimeService.sendToUser(tenantId, 'notification:new', notif)
  return notif
}
