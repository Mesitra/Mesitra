import { useState, useEffect } from 'react'

/**
 * Helper aksesiblitas sesi Administrator HQ.
 * Dipakai bersama oleh AdminProtectedRoute, sidebar dashboard admin, dan halaman detail pengajuan.
 */

export const ADMIN_LOGIN_PATH = '/admin/login'
export const ADMIN_DASHBOARD_PATH = '/admin/kyc'

/**
 * Key localStorage khusus sesi admin.
 *
 * Sengaja dipisah dari `token` / `user` milik Penyewa & Pemilik supaya
 * menguji portal admin di browser yang sama tidak menimpa sesi pengguna.
 */
export const ADMIN_TOKEN_KEY = 'admin_token'
export const ADMIN_USER_KEY = 'admin_user'

/**
 * Ambil token admin dari localStorage.
 * Mendukung key standar 'admin_token' serta 'adminToken'.
 * @returns {string|null}
 */
export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem('adminToken')
  } catch {
    // localStorage tidak tersedia (mis. mode privat / SSR)
    return null
  }
}

/**
 * Ambil data user admin dari localStorage.
 * Mendukung key standar 'admin_user' serta 'adminUser'.
 * @returns {object|null}
 */
export function getAdminUser() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY) || localStorage.getItem('adminUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Simpan token & data user admin ke localStorage.
 * Menembakkan event sinkronisasi 'mesitra:admin-session-updated'.
 * @param {string} token
 * @param {object} user
 */
export function setAdminSession(token, user) {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token)
      localStorage.setItem('adminToken', token)
    }
    if (user) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user))
      localStorage.setItem('adminUser', JSON.stringify(user))
    }
    window.dispatchEvent(new Event('mesitra:admin-session-updated'))
  } catch {
    // abaikan error storage
  }
}

/**
 * Cek apakah user yang tersimpan berperan sebagai admin.
 * @param {object|null} user
 * @returns {boolean}
 */
export function isAdminRole(user) {
  const role = String(user?.role || '').toUpperCase()
  const adminRole = String(user?.adminRole || '').toUpperCase()
  return (
    role === 'ADMIN' ||
    role === 'SUPERADMIN' ||
    role === 'SUPER_ADMIN' ||
    adminRole === 'SUPERADMIN' ||
    adminRole === 'STAFF'
  )
}

/**
 * Sesi admin dianggap valid bila token tersedia.
 * Bila data user ikut tersimpan, perannya juga wajib admin.
 * @returns {boolean}
 */
export function hasAdminSession() {
  if (!getAdminToken()) return false

  const user = getAdminUser()
  if (user && user.role && !isAdminRole(user)) return false

  return true
}

/**
 * Custom React Hook untuk memantau status autentikasi Admin secara reaktif.
 * Sinkron dengan perubahan localStorage di tab yang sama maupun antar-tab.
 * @returns {{ isAdmin: boolean, adminUser: object|null, hasAdminSession: boolean }}
 */
export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(() => hasAdminSession())
  const [adminUser, setAdminUser] = useState(() => getAdminUser())

  useEffect(() => {
    const syncAdminSession = () => {
      setIsAdmin(hasAdminSession())
      setAdminUser(getAdminUser())
    }

    syncAdminSession()
    window.addEventListener('storage', syncAdminSession)
    window.addEventListener('mesitra:admin-session-updated', syncAdminSession)
    return () => {
      window.removeEventListener('storage', syncAdminSession)
      window.removeEventListener('mesitra:admin-session-updated', syncAdminSession)
    }
  }, [])

  return { isAdmin, adminUser, hasAdminSession: isAdmin }
}

/**
 * Hapus seluruh kredensial admin dari localStorage.
 * Key `token` / `user` milik penyewa tidak disentuh.
 */
export function clearAdminSession() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    window.dispatchEvent(new Event('mesitra:admin-session-updated'))
  } catch {
    // abaikan error storage, token sudah dianggap tidak berlaku
  }
}

/**
 * Logout aman untuk portal admin.
 *
 * 1. Hapus token & data user dari localStorage.
 * 2. Navigasi memakai `replace: true` agar entri dashboard ditimpa oleh halaman login.
 *    Dengan begitu tombol Back browser tidak bisa membuka kembali halaman dashboard.
 *
 * @param {function} navigate - navigate dari react-router-dom
 */
export function logoutAdmin(navigate) {
  clearAdminSession()
  navigate(ADMIN_LOGIN_PATH, { replace: true })
}
