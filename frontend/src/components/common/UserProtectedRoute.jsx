import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LOGIN_PATH, getSessionUser, getUserToken, isPenyewa } from '../../lib/userSession'
import { hasAdminSession } from '../adminAuth/adminSession'

/**
 * Pelindung rute khusus Penyewa UMKM.
 *
 * Aturan akses:
 *  - Token JWT harus ada di localStorage (artinya sudah login).
 *  - Role user harus `PENYEWA`.
 *
 * Jika sesi admin HQ aktif, dialihkan langsung ke dashboard admin HQ.
 * Jika salah satu tidak terpenuhi, pengguna diarahkan ke halaman login
 * (`/login` → AuthPage) memakai `replace` supaya halaman yang baru saja
 * ditinggalkan tidak bisa dibuka kembali lewat tombol Back browser.
 *
 * @param {object} props.children - konten rute yang dilindungi
 */
export default function UserProtectedRoute({ children }) {
  const location = useLocation()
  const token = getUserToken()
  const user = getSessionUser()

  const isAllowed = Boolean(token) && isPenyewa(user)

  if (!isAllowed) {
    if (hasAdminSession()) {
      return <Navigate to="/portal-internal-hq/dashboard" replace />
    }
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />
  }

  return children
}
