import { getAdminToken } from '../adminAuth/adminSession'

/**
 * Client helper untuk endpoint verifikasi admin (`/api/admin`).
 *
 * Semua request memakai token sesi admin (`admin_token`) sehingga kredensial
 * penyewa yang tersimpan di `token` tidak pernah terpakai di sini.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const ADMIN_API_BASE = `${API_BASE}/api/admin`

/**
 * Request generik ke backend admin.
 *
 * @param {string} path - path relatif, mis. '/submissions/VR-2001'
 * @param {object} [options] - opsi fetch
 * @returns {Promise<object>} body respons
 */
export async function adminRequest(path, options = {}) {
  const token = getAdminToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  }

  const response = await fetch(`${ADMIN_API_BASE}${path}`, { ...options, headers })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || 'Gagal menghubungi server verifikasi admin. Silakan coba lagi.'
    )
    error.code = data?.error?.code
    error.status = response.status
    throw error
  }

  return data
}

/** Daftar seluruh pengajuan (terbaru lebih dulu). */
export async function fetchSubmissions() {
  const data = await adminRequest('/submissions')
  return data.submissions ?? []
}

/** Detail satu pengajuan (berdasarkan id atau submissionCode). */
export async function fetchSubmission(identifier) {
  const data = await adminRequest(`/submissions/${encodeURIComponent(identifier)}`)
  return data.submission ?? null
}

/** Setujui pengajuan. */
export async function approveSubmission(identifier) {
  const data = await adminRequest(`/submissions/${encodeURIComponent(identifier)}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({})
  })
  return data.submission ?? null
}

/** Minta perbaikan pada step tertentu. */
export async function requestRevision(identifier, selectedSteps, note) {
  const data = await adminRequest(`/submissions/${encodeURIComponent(identifier)}/revision`, {
    method: 'PATCH',
    body: JSON.stringify({ selectedSteps, note })
  })
  return data.submission ?? null
}

/** Tolak pengajuan secara permanen. */
export async function rejectSubmission(identifier, reason, note) {
  const data = await adminRequest(`/submissions/${encodeURIComponent(identifier)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason, note })
  })
  return data.submission ?? null
}

// ── Withdrawals (Pencairan Dana) ────────────────────────────────────────────

/** Daftar pengajuan penarikan dana. */
export async function fetchWithdrawals(status = 'MENUNGGU', search = '') {
  const params = new URLSearchParams()
  if (status && status !== 'ALL') params.set('status', status)
  if (search) params.set('search', search)
  const query = params.toString()
  const data = await adminRequest(`/withdrawals${query ? `?${query}` : ''}`)
  return data.withdrawals ?? []
}

/** Detail satu pengajuan penarikan dana. */
export async function fetchWithdrawal(id) {
  const data = await adminRequest(`/withdrawals/${encodeURIComponent(id)}`)
  return data.withdrawal ?? null
}

/** Setujui pencairan dana. */
export async function approveWithdrawal(id, payload) {
  const data = await adminRequest(`/withdrawals/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
  return data.withdrawal ?? null
}

/** Tolak pencairan dana (rollback saldo ke user). */
export async function rejectWithdrawal(id, rejectionReason) {
  const data = await adminRequest(`/withdrawals/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejectionReason })
  })
  return data.withdrawal ?? null
}

// ── Disputes (Mediasi Sengketa) ──────────────────────────────────────────

/** Daftar tiket sengketa. */
export async function fetchDisputes(status = 'AKTIF', search = '') {
  const params = new URLSearchParams()
  if (status && status !== 'ALL') params.set('status', status)
  if (search) params.set('search', search)
  const query = params.toString()
  const data = await adminRequest(`/disputes${query ? `?${query}` : ''}`)
  return {
    disputes: data.disputes ?? [],
    total: data.total ?? 0,
    counts: data.counts ?? { aktif: 0, selesai: 0 }
  }
}

/** Detail satu tiket sengketa. */
export async function fetchDispute(id) {
  const data = await adminRequest(`/disputes/${encodeURIComponent(id)}`)
  return data.dispute ?? null
}

/** Putuskan mediasi sengketa oleh admin. */
export async function resolveDispute(id, payload) {
  const data = await adminRequest(`/disputes/${encodeURIComponent(id)}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
  return data.dispute ?? null
}

// ── Moderation (Moderasi Katalog & Ulasan) ────────────────────────────────

/** Daftar katalog alat untuk pengawasan admin. */
export async function fetchAdminEquipments(params = {}) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.isTakedown !== undefined) query.set('isTakedown', String(params.isTakedown))
  if (params.search) query.set('search', params.search)
  const qs = query.toString()
  const data = await adminRequest(`/equipments${qs ? `?${qs}` : ''}`)
  return {
    equipments: data.equipments ?? [],
    total: data.total ?? 0
  }
}

/** Takedown alat (menyembunyikan dari katalog publik). */
export async function takedownEquipment(id, takedownReason) {
  const data = await adminRequest(`/equipments/${encodeURIComponent(id)}/takedown`, {
    method: 'PATCH',
    body: JSON.stringify({ takedownReason })
  })
  return data.equipment ?? null
}

/** Pulihkan alat yang sebelumnya di-takedown. */
export async function restoreEquipment(id) {
  const data = await adminRequest(`/equipments/${encodeURIComponent(id)}/restore`, {
    method: 'PATCH',
    body: JSON.stringify({})
  })
  return data.equipment ?? null
}

/** Daftar ulasan pengguna untuk audit moderasi. */
export async function fetchAdminReviews(params = {}) {
  const query = new URLSearchParams()
  if (params.isDeleted !== undefined) query.set('isDeleted', String(params.isDeleted))
  if (params.isFlagged !== undefined) query.set('isFlagged', String(params.isFlagged))
  if (params.rating) query.set('rating', String(params.rating))
  if (params.search) query.set('search', params.search)
  const qs = query.toString()
  const data = await adminRequest(`/reviews${qs ? `?${qs}` : ''}`)
  return {
    reviews: data.reviews ?? [],
    total: data.total ?? 0
  }
}

/**
 * Hapus (soft-delete) ulasan toksik.
 * Backend memakai PATCH /reviews/:id/delete agar audit trail tetap terjaga.
 */
export async function deleteReview(id, moderationNote = '') {
  const data = await adminRequest(`/reviews/${encodeURIComponent(id)}/delete`, {
    method: 'PATCH',
    body: JSON.stringify({ moderationNote })
  })
  return data.review ?? null
}

/** Daftar akun admin & staff tim (superadmin only). */
export async function fetchStaffUsers() {
  const data = await adminRequest('/staff')
  return data.users ?? []
}

/** Buat akun staff baru (superadmin only). */
export async function createStaffUser(payload) {
  const data = await adminRequest('/staff', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data
}

/** Nonaktifkan akun staff (superadmin only). */
export async function deactivateStaffUser(id) {
  const data = await adminRequest(`/staff/${encodeURIComponent(id)}/deactivate`, {
    method: 'PATCH'
  })
  return data
}

/** Aktifkan kembali akun staff (superadmin only). */
export async function activateStaffUser(id) {
  const data = await adminRequest(`/staff/${encodeURIComponent(id)}/activate`, {
    method: 'PATCH'
  })
  return data
}

/** Reset security PIN staff (superadmin only). */
export async function resetStaffPin(id) {
  const data = await adminRequest(`/staff/${encodeURIComponent(id)}/reset-pin`, {
    method: 'PATCH'
  })
  return data
}

