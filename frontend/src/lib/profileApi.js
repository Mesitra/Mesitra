import { getUserToken, setUserSession, getSessionUser } from './userSession'
import { API_BASE_URL } from './apiClient'

const API_BASE = `${API_BASE_URL}/api`

/**
 * Mengambil profil lengkap user penyewa termasuk data KYC dan data registrasi awal.
 * @returns {Promise<{ profile: object, user: object }>}
 */
export async function fetchUserProfile() {
  const token = getUserToken()
  if (!token) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk terlebih dahulu.')
  }

  const response = await fetch(`${API_BASE}/auth/profile`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memuat profil pengguna')
  }

  return data
}

/**
 * Menyimpan pembaruan data profil yang dapat diedit oleh penyewa.
 * Otomatis memperbarui sesi user di localStorage dan memicu event 'mesitra:user-updated'.
 *
 * @param {object} payload
 * @returns {Promise<{ message: string, profile: object, user: object }>}
 */
export async function updateUserProfile(payload) {
  const token = getUserToken()
  if (!token) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk terlebih dahulu.')
  }

  const response = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal menyimpan pembaruan profil')
  }

  // Perbarui data user di localStorage agar sinkron di seluruh komponen aplikasi
  if (data.user) {
    setUserSession(token, data.user)
    try {
      window.dispatchEvent(
        new CustomEvent('mesitra:user-updated', {
          detail: { user: data.user, profile: data.profile }
        })
      )
    } catch {
      // Abaikan bila di luar environment window
    }
  }

  return data
}

