/**
 * Client HTTP untuk endpoint pesanan (MyRent API).
 *
 * Semua request menyertakan token JWT dari localStorage agar
 * backend bisa mengidentifikasi user yang sedang login.
 */

import { API_BASE } from './equipmentsApi'
import { getUserToken } from './userSession'
import { getAdminToken } from '../components/adminAuth/adminSession'

function authHeaders() {
  const token = getAdminToken() || getUserToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Ambil seluruh pesanan milik user yang login (opsional query filter).
 */
export async function listOrders(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const res = await fetch(`${API_BASE}/orders${suffix}`, {
    headers: { ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memuat pesanan')
  return body?.data ?? []
}

/**
 * Ambil daftar pesanan masuk khusus untuk alat milik pemilik yang login.
 */
export async function listOwnerOrders(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const res = await fetch(`${API_BASE}/orders/owner/me${suffix}`, {
    headers: { ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memuat pesanan pemilik')
  return body?.data ?? []
}

/**
 * Ambil detail pesanan berdasarkan id atau invoiceNumber.
 */
export async function getOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memuat detail pesanan')
  return body?.data
}

/**
 * Buat pesanan baru.
 */
export async function createOrder(data) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data)
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal membuat pesanan')
  return body?.data
}

/**
 * Batalkan pesanan.
 */
export async function cancelOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal membatalkan pesanan')
  return body?.data
}

/**
 * Konfirmasi terima barang (DIKIRIM → SEWA_AKTIF).
 */
export async function confirmDelivery(id) {
  const res = await fetch(`${API_BASE}/orders/${id}/confirm-delivery`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengonfirmasi penerimaan')
  return body?.data
}

/**
 * Perpanjang masa sewa.
 */
export async function extendOrder(id, additionalDays) {
  const res = await fetch(`${API_BASE}/orders/${id}/extend`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ additionalDays })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memperpanjang sewa')
  return body
}

/**
 * Simpan draf pengembalian (tanpa ubah status).
 */
export async function saveReturnDraft(id, returnData) {
  const res = await fetch(`${API_BASE}/orders/${id}/return-draft`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ returnData })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal menyimpan draf pengembalian')
  return body?.data
}

/**
 * Submit BAST Akhir (SEWA_AKTIF → INSPEKSI).
 */
export async function submitReturn(id, returnData) {
  const res = await fetch(`${API_BASE}/orders/${id}/return-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ returnData })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengirim BAST Akhir')
  return body?.data
}

/**
 * Tandai unit fisik telah diserahkan oleh penyewa (Penyewa side).
 */
export async function markOrderHandedOver(id) {
  const res = await fetch(`${API_BASE}/orders/${id}/mark-handed-over`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal menandai penyerahan unit')
  return body?.data
}

/**
 * Konfirmasi penerimaan fisik unit oleh Pemilik menggunakan PIN 6-digit (Owner side).
 */
export async function confirmReturnReceipt(id, handoverPin) {
  const res = await fetch(`${API_BASE}/orders/${id}/confirm-return-receipt`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ handoverPin })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengonfirmasi penerimaan fisik unit')
  return body
}

/**
 * Selesaikan inspeksi fisik dan lepas refund deposit (Owner side),
 * atau ajukan klaim kerusakan saat inspeksi.
 */
export async function completeInspection(id, { damageFee = 0, ownerNotes = '', approveRefund = true, disputeReason = '', ownerInspectionPhotos = null } = {}) {
  const res = await fetch(`${API_BASE}/orders/${id}/complete-inspection`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ damageFee, ownerNotes, approveRefund, disputeReason, ownerInspectionPhotos })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal menyelesaikan inspeksi unit')
  return body
}

/**
 * Ajukan dispute / klaim oleh pemilik alat atas pesanan (Owner side).
 */
export async function claimDispute(id, { disputeReason, damageFee = 0, ownerInspectionPhotos = null } = {}) {
  const res = await fetch(`${API_BASE}/orders/${id}/dispute`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ disputeReason, damageFee, ownerInspectionPhotos })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengajukan klaim dispute')
  return body
}

/**
 * Putuskan sengketa mediasi oleh Admin MyRent (Admin side).
 */
export async function resolveDispute(id, { finalDamageFee = 0, adminResolutionNote = '' } = {}) {
  const res = await fetch(`${API_BASE}/orders/${id}/resolve-dispute`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ finalDamageFee, adminResolutionNote })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memutuskan sengketa mediasi')
  return body
}

/**
 * Validasi kode promo.
 */
export async function validatePromo(code, subtotal = 0) {
  const res = await fetch(`${API_BASE}/orders/validate-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ code, subtotal })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Kode promo tidak valid')
  return body?.data
}

/**
 * Mock Payment: ubah status MENUNGGU_PEMBAYARAN → MENUNGGU_KONFIRMASI.
 */
export async function mockPay(id, paymentMethod = 'QRIS') {
  const res = await fetch(`${API_BASE}/orders/${id}/mock-pay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ paymentMethod })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memproses pembayaran')
  return body
}

/**
 * Terima pesanan masuk oleh pemilik alat (MENUNGGU_KONFIRMASI → DIKIRIM).
 */
export async function acceptOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${id}/accept`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal menerima pesanan')
  return body?.data
}

/**
 * Tolak pesanan masuk oleh pemilik alat (MENUNGGU_KONFIRMASI → DITOLAK).
 */
export async function rejectOrder(id) {
  const res = await fetch(`${API_BASE}/orders/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal menolak pesanan')
  return body?.data
}

/**
 * Kirim rating dan ulasan untuk pesanan SELESAI.
 */
export async function submitReview(orderId, { rating, comment }) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ rating, comment })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengirim ulasan')
  return body?.data
}

