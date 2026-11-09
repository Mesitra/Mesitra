import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldCheck,
  Shield,
  LogOut,
  Layers,
  DollarSign,
  Scale
} from 'lucide-react'
import { getAdminUser } from '../adminAuth/adminSession'

/**
 * Navigasi samping portal admin HQ.
 * Konversi dari bagian "Sidebar" pada `frontend/assetAdmin/AdminPanel-export.html`.
 */

const MENU = [
  {
    key: 'verifikasi',
    path: '/portal-internal-hq/dashboard',
    label: 'Verifikasi Akun',
    icon: ShieldCheck,
    badgeKey: 'verifikasi'
  },
  {
    key: 'pencairan',
    path: '/portal-internal-hq/pencairan-dana',
    label: 'Pencairan Dana',
    icon: DollarSign,
    badgeKey: 'pencairan'
  },
  {
    key: 'mediasi',
    path: '/portal-internal-hq/mediasi-sengketa',
    label: 'Mediasi Sengketa',
    icon: Scale,
    badgeKey: 'mediasi'
  },
  {
    key: 'moderasi',
    path: '/portal-internal-hq/moderasi',
    label: 'Moderasi Platform',
    icon: Shield,
    badgeKey: 'moderasi'
  }
]

/**
 * @param {object} props
 * @param {string} props.activeKey - menu yang sedang aktif
 * @param {function} props.onNavigate - callback saat menu diklik
 * @param {object} props.counts - jumlah antrean per menu
 * @param {function} props.onLogout - aksi keluar sesi
 */
export default function AdminSidebar({ activeKey, onNavigate, counts = {}, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const adminUser = getAdminUser()
  const namaAdmin = adminUser?.fullName || adminUser?.name || 'Rani Admin'
  const emailAdmin = adminUser?.email || 'admin@myrent.com'
  const inisial = (namaAdmin || 'RA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const handleItemClick = (item) => {
    if (onNavigate) {
      onNavigate(item.key)
    }
    navigate(item.path)
  }

  const isItemActive = (item) => {
    if (activeKey) {
      return activeKey === item.key || activeKey === item.path
    }
    if (location.pathname === item.path) return true
    if (item.key === 'verifikasi' && location.pathname.startsWith('/portal-internal-hq/dashboard')) return true
    return false
  }

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-[248px] shrink-0 flex-col gap-1 p-[22px_16px] bg-white border-r border-slate-200">
      {/* Brand */}
      <div className="flex items-center gap-2.5 pb-4 px-2">
        <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Layers className="w-5 h-5 text-blue-600" />
          <span className="whitespace-nowrap">MyRent HQ</span>
        </div>
        <span className="rounded-md bg-slate-900 px-[7px] py-[3px] text-[8px] font-extrabold tracking-[0.6px] text-white">
          ADMIN
        </span>
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-1">
        {MENU.map((item) => {
          const Icon = item.icon
          const isActive = isItemActive(item)
          const badge = item.badgeKey ? counts[item.badgeKey] : null

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left transition-colors cursor-pointer ${
                isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-500'
                }`}
              />
              <span
                className={`text-[13px] whitespace-nowrap ${
                  isActive ? 'text-blue-700 font-bold' : 'text-slate-600 font-medium'
                }`}
              >
                {item.label}
              </span>
              <span className="flex-1 h-px" />
              {badge ? (
                <span className="rounded-full bg-red-50 px-2.5 py-[5px] text-[11px] font-semibold text-red-700 whitespace-nowrap">
                  {badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      {/* Blok user + logout — mt-auto menjaga blok ini menempel di dasar sidebar */}
      <div className="mt-auto flex flex-col gap-2.5 border-t border-slate-200 px-1.5 pt-3">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] shrink-0 rounded-full bg-slate-900 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{inisial}</span>
          </div>
          <div className="flex-1 flex flex-col gap-px min-w-0">
            <span className="text-xs font-bold text-slate-900 truncate">{namaAdmin}</span>
            <span className="text-[10px] text-slate-400 truncate">{emailAdmin}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </aside>
  )
}
