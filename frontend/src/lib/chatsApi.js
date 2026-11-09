/**
 * Client HTTP untuk endpoint chat / percakapan kontekstual (MyRent API).
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
 * Mengambil daftar percakapan milik user yang sedang login.
 */
export async function listChats() {
  const res = await fetch(`${API_BASE}/chats?_t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store'
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memuat daftar obrolan')
  return body?.data ?? []
}

/**
 * Mengambil total pesan belum dibaca.
 */
export async function getUnreadCount() {
  const isPortalAdmin = typeof window !== 'undefined' && (window.location.pathname.startsWith('/portal-internal-hq') || window.location.pathname.startsWith('/admin'))
  const token = isPortalAdmin ? (getAdminToken() || getUserToken()) : (getUserToken() || getAdminToken())
  if (!token) return 0

  const res = await fetch(`${API_BASE}/chats/unread-count?_t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store'
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return 0
  return body?.data?.unreadCount ?? 0
}

/**
 * Mengecek apakah percakapan dengan partnerId sudah tersimpan di database.
 * Jika belum ada, mengembalikan { data: null, isDraft: true } (Mendukung Lazy Session).
 */
export async function checkPartnerChat(partnerId) {
  const res = await fetch(`${API_BASE}/chats/by-partner/${encodeURIComponent(partnerId)}?_t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store'
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memeriksa status obrolan')
  return body
}

/**
 * Mengambil seluruh riwayat pesan dalam satu ruang obrolan dan menandai pesan lawan bicara sudah dibaca.
 */
export async function getChatMessages(conversationId) {
  const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(conversationId)}/messages?_t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store'
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal memuat riwayat pesan')
  return body
}

/**
 * Mengirim pesan (atau menginisialisasi Lazy Session jika percakapan belum pernah ada).
 */
export async function sendMessage({ recipientId, conversationId, content, contextType, contextData }) {
  const res = await fetch(`${API_BASE}/chats/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      recipientId,
      conversationId,
      content,
      contextType,
      contextData
    })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || 'Gagal mengirim pesan')
  return body
}

