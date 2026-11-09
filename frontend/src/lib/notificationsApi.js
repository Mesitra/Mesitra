/**
 * Client HTTP untuk endpoint In-App Notifications (MyRent API).
 */

import { API_BASE } from './equipmentsApi'
import { getUserToken } from './userSession'
import { getAdminToken } from '../components/adminAuth/adminSession'

function authHeaders() {
  const isPortalAdmin = typeof window !== 'undefined' && (window.location.pathname.startsWith('/portal-internal-hq') || window.location.pathname.startsWith('/admin'))
  const token = isPortalAdmin ? (getAdminToken() || getUserToken()) : (getUserToken() || getAdminToken())
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

/**
 * Mengambil daftar notifikasi milik user yang sedang login.
 */
export async function listNotifications() {
  const res = await fetch(`${API_BASE}/notifications?_t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store'
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memuat notifikasi')
  return body?.data ?? []
}

/**
 * Menandai satu notifikasi sebagai telah dibaca.
 */
export async function markNotificationAsRead(id) {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders()
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal menandai notifikasi')
  return body?.data ?? null
}

/**
 * Menandai seluruh notifikasi sebagai telah dibaca.
 */
export async function markAllNotificationsAsRead() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders()
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal menandai seluruh notifikasi')
  return body?.data ?? null
}
