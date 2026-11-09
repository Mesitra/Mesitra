import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LOGIN_PATH, getSessionUser, getUserToken, isPemilik } from '../../lib/userSession'
import { hasAdminSession } from '../adminAuth/adminSession'

/**
 * Pelindung rute khusus Pemilik Alat.
 *
 * Aturan akses:
 *  - Token JWT harus ada di localStorage (artinya sudah login).
 *  - Role user harus `PEMILIK`.
 *
 * Tanpa guard ini, halaman dashboard pemilik tetap bisa dibuka kembali lewat
 * tombol Back browser atau lewat URL langsung SEJAK logout sudah menghapus
 * token dari localStorage — sehingga session belum benar-benar permanen.
 *
 * Jika sesi admin HQ aktif, dialihkan langsung ke dashboard admin HQ.
 * Jika salah satu tidak terpenuhi, pengguna diarahkan ke halaman login
 * (`/login` → AuthPage) memakai `replace` supaya halaman yang baru saja
 * ditinggalkan tidak bisa dibuka kembali lewat tombol Back browser.
 *
 * @param {object} props.children - konten rute yang dilindungi
 */
export default function PemilikProtectedRoute({ children }) {
  const location = useLocation()
  const token = getUserToken()
  const user = getSessionUser()

  const isAllowed = Boolean(token) && isPemilik(user)

  if (!isAllowed) {
    if (hasAdminSession()) {
      return <Navigate to="/admin/kyc" replace />
    }
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />
  }

  return children
}
