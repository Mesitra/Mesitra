import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, LogOut, DollarSign, Scale, Users, Shield } from 'lucide-react'
import { logoutAdmin, getAdminUser } from '../components/adminAuth/adminSession'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const adminUser = getAdminUser()
  const isSuperadmin = adminUser?.adminRole === 'SUPERADMIN' || adminUser?.role === 'SUPERADMIN'

  const menuItems = [
    { path: '/admin/kyc', label: 'Verifikasi Akun', icon: ShieldCheck },
    { path: '/admin/manajemen-pengguna', label: 'Manajemen Pengguna', icon: Users },
    { path: '/admin/pencairan-dana', label: 'Pencairan Dana', icon: DollarSign },
    { path: '/admin/mediasi-sengketa', label: 'Mediasi Sengketa', icon: Scale },
    { path: '/admin/moderasi', label: 'Moderasi Platform', icon: Shield },
    ...(isSuperadmin
      ? [{ path: '/admin/manajemen-tim', label: 'Manajemen Tim', icon: Users }]
      : [])
  ]

  const BREADCRUMB_MAP = {
    '/admin/kyc': 'Verifikasi Akun',
    '/admin/verifikasi': 'Verifikasi Akun',
    '/admin/manajemen-pengguna': 'Manajemen Pengguna',
    '/admin/mediasi-sengketa': 'Mediasi Sengketa',
    '/admin/pencairan-dana': 'Pencairan Dana',
    '/admin/moderasi': 'Moderasi Platform',
    '/admin/manajemen-tim': 'Manajemen Tim',
    '/portal-internal-hq/dashboard': 'Verifikasi Akun',
    '/portal-internal-hq/manajemen-pengguna': 'Manajemen Pengguna',
    '/portal-internal-hq/pencairan-dana': 'Pencairan Dana',
    '/portal-internal-hq/mediasi-sengketa': 'Mediasi Sengketa',
    '/portal-internal-hq/moderasi': 'Moderasi Platform',
    '/portal-internal-hq/manajemen-tim': 'Manajemen Tim'
  }

  const activeMenu = menuItems.find(m => location.pathname.startsWith(m.path))
  const pageTitle = BREADCRUMB_MAP[location.pathname] || activeMenu?.label || 'Verifikasi Akun'

  const handleLogout = () => {
    logoutAdmin(navigate)
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-blue-600">MyRent</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white uppercase">Admin</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Profile */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {adminUser?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{adminUser?.fullName || 'Admin'}</p>
                <p className="text-[10px] text-slate-500 truncate">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h1 className="text-lg font-bold text-slate-900">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{adminUser?.email || 'admin@myrent.id'}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
