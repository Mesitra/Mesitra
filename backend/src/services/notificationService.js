/**
 * Notification Service — MyRent
 *
 * Terpusat: sebelum mengirim pesan, cek preferensi notifikasi pemilik (TenantProfile).
 * Saat ini menggunakan console.log sebagai stub.
 * shortcut: console.log stubs, upgrade ke Nodemailer/Wablas/Twilio saat API key tersedia
 */
import { prisma } from '../lib/prisma.js'

// ─── Transport stubs (ganti implementasi nyata di sini) ─────────────────────

async function sendWhatsApp(toPhone, message) {
  // TODO: ganti dengan Wablas/Twilio WhatsApp API
  // contoh: await wablas.send({ phone: toPhone, message })
  console.log(`[WA] → ${toPhone}: ${message}`)
}

async function sendEmail(toEmail, subject, body) {
  // TODO: ganti dengan Nodemailer / SendGrid
  // contoh: await transporter.sendMail({ to: toEmail, subject, text: body })
  console.log(`[EMAIL] → ${toEmail} | ${subject}: ${body}`)
}

// ─── Helper: ambil TenantProfile + kontak pemilik alat ──────────────────────

async function getOwnerProfile(tenantId) {
  return prisma.tenantProfile.findUnique({
    where: { userId: tenantId },
    include: { user: { select: { email: true, phone: true, fullName: true } } }
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Kirim notifikasi pesanan baru ke pemilik alat.
 * Dicek preferensi `notifPesananBaru` sebelum pengiriman.
 *
 * @param {string} tenantId - userId pemilik alat (equipment.ownerId)
 * @param {{ invoiceNumber: string, equipmentName: string, renterName: string }} orderData
 */
export async function sendNewOrderNotif(tenantId, orderData) {
  const profile = await getOwnerProfile(tenantId)
  if (!profile?.notifPesananBaru) return

  const { invoiceNumber, equipmentName, renterName } = orderData
  const msg = `[MyRent] Pesanan baru masuk! Invoice ${invoiceNumber} — Alat: ${equipmentName} — Penyewa: ${renterName}. Silakan konfirmasi di dashboard.`

  await Promise.allSettled([
    profile.user?.phone ? sendWhatsApp(profile.user.phone, msg) : null,
    profile.user?.email ? sendEmail(profile.user.email, `Pesanan Baru: ${invoiceNumber}`, msg) : null
  ])
}

/**
 * Kirim notifikasi pengingat pengembalian alat ke pemilik.
 * Dicek preferensi `notifPengembalianAlat`.
 *
 * @param {string} tenantId
 * @param {{ invoiceNumber: string, equipmentName: string, endDate: string }} orderData
 */
export async function sendReturnReminder(tenantId, orderData) {
  const profile = await getOwnerProfile(tenantId)
  if (!profile?.notifPengembalianAlat) return

  const { invoiceNumber, equipmentName, endDate } = orderData
  const msg = `[MyRent] Pengingat: Pengembalian alat "${equipmentName}" (${invoiceNumber}) dijadwalkan ${endDate}. Pastikan siap menerima fisik unit.`

  await Promise.allSettled([
    profile.user?.phone ? sendWhatsApp(profile.user.phone, msg) : null,
    profile.user?.email ? sendEmail(profile.user.email, `Pengembalian Alat: ${invoiceNumber}`, msg) : null
  ])
}

/**
 * Kirim notifikasi inspeksi/deposit ke pemilik saat status masuk INSPEKSI atau DISPUTE.
 * Dicek preferensi `notifInspeksiDeposit`.
 *
 * @param {string} tenantId
 * @param {{ invoiceNumber: string, status: string }} orderData
 */
export async function sendInspectionNotif(tenantId, orderData) {
  const profile = await getOwnerProfile(tenantId)
  if (!profile?.notifInspeksiDeposit) return

  const { invoiceNumber, status } = orderData
  const label = status === 'DISPUTE' ? 'Klaim dispute diajukan' : 'Unit masuk tahap inspeksi'
  const msg = `[MyRent] ${label} untuk pesanan ${invoiceNumber}. Selesaikan inspeksi dalam 2×24 jam untuk melepas escrow deposit.`

  await Promise.allSettled([
    profile.user?.phone ? sendWhatsApp(profile.user.phone, msg) : null,
    profile.user?.email ? sendEmail(profile.user.email, `Inspeksi Deposit: ${invoiceNumber}`, msg) : null
  ])
}
