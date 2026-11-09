import React from 'react'
import { Navigate } from 'react-router-dom'
import { hasAdminSession } from '../adminAuth/adminSession'
import { hasPemilikSession, hasPenyewaSession } from '../../lib/userSession'

/**
 * PublicOnlyRoute (Guest Guard)
 *
 * Mencegah pengguna yang sudah login (Penyewa, Pemilik, atau Admin)
 * mengakses kembali halaman otentikasi (seperti /login, /register/*, /admin/login),
 * baik melalui URL manual maupun melalui tombol "Back" bawaan browser.
 *
 * Bila sesi aktif terdeteksi, guard langsung mengalihkan (replace: true)
 * pengguna ke halaman beranda/dashboard yang sesuai dengan perannya:
 * - Admin HQ   -> /admin/kyc
 * - Pemilik    -> /dashboard-pemilik
 * - Penyewa    -> /beranda-sewa
 */
export default function PublicOnlyRoute({ children }) {
  // 1. Cek sesi Admin HQ
  if (hasAdminSession()) {
    return <Navigate to="/admin/kyc" replace />
  }

  // 2. Cek sesi Pemilik Alat
  if (hasPemilikSession()) {
    return <Navigate to="/dashboard-pemilik" replace />
  }

  // 3. Cek sesi Penyewa UMKM
  if (hasPenyewaSession()) {
    return <Navigate to="/beranda-sewa" replace />
  }

  // Pengguna belum login (guest): izinkan akses ke form otentikasi
  return children
}

