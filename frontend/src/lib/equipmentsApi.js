import { getUserToken } from './userSession'

/**
 * Client HTTP untuk katalog alat (MyRent API).
 *
 * Semua request memakai base URL absolut `http://localhost:3000/api` agar
 * halaman katalog tetap bisa dipanggil langsung dari dev server Vite.
 */

export const API_BASE = 'http://localhost:3000/api'

/**
 * Ambil daftar alat yang tersedia disewa.
 *
 * @param {object} [params] - query string opsional (category, search, ownerId, sortRating)
 * @returns {Promise<object[]>} daftar alat
 */
export async function listEquipments(params = {}) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : ''
  const response = await fetch(`${API_BASE}/equipments${suffix}`)

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body?.error?.message || 'Gagal memuat katalog alat')
  }

  return Array.isArray(body?.data) ? body.data : []
}

/**
 * Ambil detail satu alat.
 *
 * @param {string} id - UUID alat
 * @returns {Promise<object>} detail alat
 */
export async function getEquipment(id) {
  const response = await fetch(`${API_BASE}/equipments/${encodeURIComponent(id)}`)

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body?.error?.message || 'Gagal memuat detail alat')
  }

  return body?.data
}

/**
 * Tambah alat baru ke katalog (Owner side).
 *
 * @param {object} data - data alat baru
 * @returns {Promise<object>}
 */
export async function createEquipment(data) {
  const token = getUserToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(`${API_BASE}/equipments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.message || 'Gagal menambahkan alat')
  }

  return body?.data
}

/**
 * Perbarui data alat (Owner side).
 *
 * @param {string} id - UUID alat
 * @param {object} data - data pembaruan
 * @returns {Promise<object>}
 */
export async function updateEquipment(id, data) {
  const token = getUserToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(`${API_BASE}/equipments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.message || 'Gagal memperbarui alat')
  }

  return body?.data
}

/**
 * Hapus alat (Owner side - dengan dukungan soft delete).
 *
 * @param {string} id - UUID alat
 * @returns {Promise<object>}
 */
export async function deleteEquipment(id) {
  const token = getUserToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(`${API_BASE}/equipments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.message || 'Gagal menghapus alat')
  }

  return body
}

/**
 * Ambil daftar inventaris alat milik pemilik yang sedang login beserta kalkulasi status real-time.
 *
 * @returns {Promise<object[]>}
 */
export async function getMyEquipments() {
  const token = getUserToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(`${API_BASE}/equipments/me`, {
    method: 'GET',
    headers
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.message || 'Gagal memuat inventaris alat saya')
  }

  return Array.isArray(body?.data) ? body.data : []
}

/**
 * Format angka Rupiah ke gaya tampilan lokal.
 * @param {number|string} value
 * @returns {string}
 */
export function formatRupiah(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 'Rp 0'
  return `Rp ${number.toLocaleString('id-ID')}`
}



