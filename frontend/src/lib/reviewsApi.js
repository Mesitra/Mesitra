/**
 * Client HTTP untuk endpoint Ulasan & Rating (Mesitra API).
 */

import { API_BASE } from './equipmentsApi'
import { getUserToken } from './userSession'

function authHeaders() {
  const token = getUserToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Mengambil daftar ulasan toko / alat dengan filter dan kalkulasi metadata.
 * @param {Object} params { ownerId, equipmentId, rating, as }
 */
export async function listReviews(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const res = await fetch(`${API_BASE}/reviews${suffix}`, {
    headers: { ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memuat ulasan')
  return {
    data: body?.data || [],
    totalPages: body?.totalPages || 1,
    currentPage: body?.currentPage || 1,
    totalItems: body?.totalItems || (body?.data?.length || 0),
    meta: body?.meta || { total: 0, averageRating: 5.0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }
}

/**
 * Mengambil ulasan khusus pemilik alat dengan server-side pagination.
 * @param {Object} params { page, limit, rating, ownerId }
 */
export async function listOwnerReviews(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const res = await fetch(`${API_BASE}/reviews/owner${suffix}`, {
    headers: { ...authHeaders() }
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Fallback ke /reviews?as=owner bila route khusus gagal
    return listReviews({ ...params, as: 'owner' })
  }
  return {
    data: body?.data || [],
    totalPages: body?.totalPages || 1,
    currentPage: body?.currentPage || 1,
    totalItems: body?.totalItems || (body?.data?.length || 0),
    meta: body?.meta || { total: 0, averageRating: 5.0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }
}

/**
 * Membalas ulasan penyewa oleh pemilik alat.
 * @param {string} reviewId
 * @param {string} replyText
 */
export async function replyReview(reviewId, replyText) {
  const res = await fetch(`${API_BASE}/reviews/${encodeURIComponent(reviewId)}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reply: replyText })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengirim balasan ulasan')
  return body
}

/**
 * Mengirim ulasan baru untuk pesanan yang sudah SELESAI.
 * @param {string} orderId
 * @param {Object} data { rating, comment }
 */
export async function submitReview(orderId, { rating, comment }) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ rating, comment })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengirim ulasan')
  return body
}
