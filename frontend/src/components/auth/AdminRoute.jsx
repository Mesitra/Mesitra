import { Navigate, Outlet } from 'react-router-dom'
import { hasAdminSession } from '../adminAuth/adminSession'

/**
 * Route guard admin.
 * Cek sesi admin dari localStorage. Jika tidak valid, redirect ke /unauthorized atau /.
 */
export default function AdminRoute() {
  if (!hasAdminSession()) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
