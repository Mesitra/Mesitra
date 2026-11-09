/**
 * Helper bersama untuk alur registrasi + verifikasi KYC.
 *
 * Bertanggung jawab atas:
 *  1. Checkpoint draft di localStorage (form + step terakhir)
 *  2. Lock anti-spam selama pengajuan berstatus MENUNGGU / PERLU_PERBAIKAN
 *  3. Unggahan berkas (nama file, ukuran, tipe, dan pratinjau base64 ringan)
 *  4. Pemanggilan endpoint status pengajuan dari backend
 */

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000'
export const API_BASE = `${API_BASE_URL}/api`

/** Key localStorage draft (checkpoint) per peran. */
export const DRAFT_KEYS = {
  PENYEWA: 'myrent_draft_penyewa',
  PEMILIK: 'myrent_draft_pemilik'
}

/** Key localStorage lock pengajuan (anti-spam) per peran. */
export const PENDING_KEYS = {
  PENYEWA: 'myrent_pending_penyewa',
  PEMILIK: 'myrent_pending_pemilik'
}

/** Key draft lama (tombol "Simpan Draf" versi sebelumnya) — tetap dipertahankan. */
export const LEGACY_DRAFT_KEYS = {
  PENYEWA: 'myrent_register_penyewa_draft',
  PEMILIK: 'myrent_register_pemilik_draft'
}

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const removeKey = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // abaikan error storage
  }
}

/**
 * Baca checkpoint draft (step terakhir + data form).
 * @param {'PENYEWA'|'PEMILIK'} role
 * @returns {{ currentStep: number, formData: object, savedAt: string|null }|null}
 */
export function readDraft(role) {
  const draft = readJson(DRAFT_KEYS[role])
  if (draft && typeof draft === 'object') {
    return {
      currentStep: Number(draft.currentStep) || 1,
      formData: draft.formData && typeof draft.formData === 'object' ? draft.formData : {},
      savedAt: draft.savedAt ?? null
    }
  }

  // Fallback ke draft lama yang hanya berisi formData.
  const legacy = readJson(LEGACY_DRAFT_KEYS[role])
  if (legacy && typeof legacy === 'object') {
    return { currentStep: 1, formData: legacy, savedAt: null }
  }

  return null
}

/**
 * Simpan checkpoint draft secara otomatis.
 * @param {'PENYEWA'|'PEMILIK'} role
 * @param {number} currentStep
 * @param {object} formData
 */
export function writeDraft(role, currentStep, formData) {
  const payload = {
    currentStep,
    formData,
    savedAt: new Date().toISOString()
  }
  writeJson(DRAFT_KEYS[role], payload)
  // Sinkronkan dengan key draft lama supaya tidak ada data yang nyasar.
  writeJson(LEGACY_DRAFT_KEYS[role], formData)
}

/**
 * Hapus checkpoint draft.
 * @param {'PENYEWA'|'PEMILIK'} role
 */
export function clearDraft(role) {
  removeKey(DRAFT_KEYS[role])
  removeKey(LEGACY_DRAFT_KEYS[role])
}

/**
 * Baca lock pengajuan (anti-spam).
 * @param {'PENYEWA'|'PEMILIK'} role
 * @returns {{ userId?: string, email?: string, submissionCode?: string, verificationStatus?: string }|null}
 */
export function readPending(role) {
  const pending = readJson(PENDING_KEYS[role])
  if (!pending || typeof pending !== 'object') return null
  if (!pending.email && !pending.userId && !pending.submissionCode) return null
  return pending
}

/**
 * Simpan lock pengajuan.
 * @param {'PENYEWA'|'PEMILIK'} role
 * @param {object} payload
 */
export function writePending(role, payload) {
  writeJson(PENDING_KEYS[role], {
    userId: payload.userId ?? null,
    email: payload.email ?? null,
    submissionCode: payload.submissionCode ?? null,
    verificationStatus: payload.verificationStatus ?? 'MENUNGGU',
    updatedAt: new Date().toISOString()
  })
}

/**
 * Hapus lock pengajuan.
 * @param {'PENYEWA'|'PEMILIK'} role
 */
export function clearPending(role) {
  removeKey(PENDING_KEYS[role])
}

/**
 * Ambil token JWT milik pengguna tertentu saja.
 *
 * Dipakai saat memanggil endpoint status pengajuan supaya token milik akun
 * lain (mis. sisa sesi di browser yang sama) tidak dikirim dan memicu 403.
 *
 * @param {string|null} userId - id pengguna pemilik pengajuan
 * @returns {string|null}
 */
export function getTokenForUser(userId) {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null

    const raw = localStorage.getItem('user')
    const user = raw ? JSON.parse(raw) : null

    if (userId && user?.id && user.id !== userId) return null

    return token
  } catch {
    return null
  }
}

/**
 * Ambil status pengajuan terbaru dari backend.
 * @param {string} identifier - email, id, atau submissionCode
 * @param {string|null} token - JWT user (opsional)
 * @returns {Promise<object>} objek status pengajuan
 */
export async function fetchSubmissionStatus(identifier, token = null) {
  const response = await fetch(
    `${API_BASE}/auth/submission-status/${encodeURIComponent(identifier)}`,
    {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gagal memuat status pengajuan')
  }

  return data.status ?? data
}

/**
 * Baca berkas gambar & hasilkan pratinjau base64 ringan.
 *
 * Pratinjau dikompres (maks 900 px & kualitas 0.7) supaya draft di localStorage
 * tidak langsung penuh oleh file mentah. Kalau kompresi gagal, data URL asli
 * tetap dipakai sebagai cadangan.
 *
 * @param {File} file
 * @returns {Promise<string|null>} data URL pratinjau
 */
export function fileToPreviewDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null)
      return
    }

    const reader = new FileReader()

    reader.onerror = () => resolve(null)
    reader.onload = () => {
      const dataUrl = String(reader.result || '')

      if (!dataUrl.startsWith('data:')) {
        resolve(null)
        return
      }

      const image = new Image()

      image.onerror = () => resolve(dataUrl)
      image.onload = () => {
        try {
          const maxSize = 900
          const scale = Math.min(1, maxSize / Math.max(image.width || 1, image.height || 1))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round((image.width || 1) * scale))
          canvas.height = Math.max(1, Math.round((image.height || 1) * scale))

          const context = canvas.getContext('2d')
          context.drawImage(image, 0, 0, canvas.width, canvas.height)

          resolve(canvas.toDataURL('image/jpeg', 0.7))
        } catch {
          resolve(dataUrl)
        }
      }

      image.src = dataUrl
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Ubah ukuran berkas menjadi label yang mudah dibaca.
 * @param {number|null|undefined} size
 * @returns {string}
 */
export function formatFileSize(size) {
  const bytes = Number(size)
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format waktu relatif sederhana ("2 jam lalu").
 * @param {string|number|Date} value
 * @returns {string}
 */
export function formatRelativeTime(value) {
  if (!value) return '-'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (diffSeconds < 60) return 'Baru saja'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit lalu`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} jam lalu`
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} hari lalu`

  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Format tanggal lengkap untuk detail pengajuan.
 * @param {string|number|Date} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return '-'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Periksa keunikan data form (email, nomor telepon, NIK, bankAccount) ke backend.
 * Digunakan untuk validasi per-step formulir registrasi.
 *
 * @param {object} params
 * @param {string} [params.email]
 * @param {string} [params.phone]
 * @param {string} [params.whatsapp]
 * @param {string} [params.nik]
 * @param {string} [params.bankAccount]
 * @param {string} [params.excludeUserId]
 * @returns {Promise<{ available: boolean, errors: Record<string, string> }>}
 */
export async function checkUniqueness(params) {
  try {
    const res = await fetch(`${API_BASE}/auth/check-unique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    if (!res.ok) {
      return { available: true, errors: {} }
    }
    return await res.json()
  } catch (e) {
    console.warn('Gagal memverifikasi keunikan data:', e)
    return { available: true, errors: {} }
  }
}

