import { getAdminToken } from '../adminAuth/adminSession'

/**
 * Client helper untuk endpoint verifikasi admin (`/api/admin`).
 *
 * Semua request memakai token sesi admin (`admin_token`) sehingga kredensial
 * penyewa yang tersimpan di `token` tidak pernah terpakai di sini.
 */

export const ADMIN_API_BASE = 'http://localhost:5000/api/admin'

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
