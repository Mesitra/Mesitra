import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Search,
  Wallet,
  LogOut,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Rocket,
  ShoppingBag,
  UserCog
} from 'lucide-react'
import ModalDompet from '../pesananSaya/ModalDompet'
import NotificationBell from './NotificationBell'
import { getUnreadCount } from '../../lib/chatsApi'
import { getWalletInfo } from '../../lib/walletApi'
import {
  getSessionUser,
  getUserInitials,
  getUserPowerLimit,
  logoutUser
} from '../../lib/userSession'

export default function NavbarPenyewa({
  activeTab = 'jelajahi',
  searchQuery = '',
  onSearchChange,
  dateRange: _dateRange,
  walletBalance: propWalletBalance,
  onNavigateTab,
  onNavigateHome: _onNavigateHome,
  hideBottomNav = false
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [walletInitialView, setWalletInitialView] = useState('OVERVIEW')
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef(null)

  // Resolusi tab aktif yang presisi (hindari bug startsWith('/pesan') pada URL /pesanan-saya)
  const resolvedActiveTab = activeTab || (
    location.pathname === '/pesan' || location.pathname.startsWith('/pesan/')
      ? 'pesan'
      : location.pathname.startsWith('/pesanan-saya')
      ? 'pesanan'
      : location.pathname.startsWith('/dompet')
      ? 'dompet'
      : location.pathname.startsWith('/profil')
      ? 'profil'
      : (location.pathname === '/beranda-sewa' || location.pathname === '/')
      ? 'jelajahi'
      : ''
  )

  const handleNavJelajahi = () => {
    if (onNavigateTab) onNavigateTab('jelajahi')
    navigate('/beranda-sewa')
  }

  const handleNavPesanan = () => {
    if (onNavigateTab) onNavigateTab('pesanan')
    navigate('/pesanan-saya')
  }

  const handleNavPesan = () => {
    if (onNavigateTab) onNavigateTab('pesan')
    navigate('/pesan')
  }

  const handleNavDompet = () => {
    if (onNavigateTab) {
      onNavigateTab('dompet')
    } else {
      navigate('/dompet')
    }
  }

  // Saldo live terhubung langsung ke backend database
  const [liveBalance, setLiveBalance] = useState(() => {
    const u = getSessionUser()
    return u?.walletBalance ?? 0
  })

  useEffect(() => {
    let isMounted = true
    getWalletInfo()
      .then((data) => {
        if (isMounted && data?.walletBalance !== undefined) {
          setLiveBalance(data.walletBalance)
        }
      })
      .catch(() => {})

    const handleWalletUpdated = (e) => {
      if (e.detail?.newBalance !== undefined) {
        setLiveBalance(e.detail.newBalance)
      }
    }
    window.addEventListener('mesitra:wallet-updated', handleWalletUpdated)

    return () => {
      isMounted = false
      window.removeEventListener('mesitra:wallet-updated', handleWalletUpdated)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    getUnreadCount()
      .then((count) => {
        if (isMounted) setUnreadCount(count)
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [activeTab])

  // Data pengguna dibaca dari localStorage & disinkronkan saat profil diperbarui
  const [user, setUser] = useState(() => getSessionUser())

  useEffect(() => {
    const handleUserUpdated = (e) => {
      if (e.detail?.user) {
        setUser(e.detail.user)
      } else {
        setUser(getSessionUser())
      }
    }
    window.addEventListener('mesitra:user-updated', handleUserUpdated)
    return () => window.removeEventListener('mesitra:user-updated', handleUserUpdated)
  }, [])

  const userInitials = getUserInitials(user)
  const powerLimit = getUserPowerLimit(user)
  const userPower = powerLimit ? `${powerLimit} W` : 'Daya belum diisi'

  // Tutup menu profil saat klik di luar area menu.
  useEffect(() => {
    if (!isMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isMenuOpen])

  const handleSearch = (e) => {
    setLocalSearch(e.target.value)
    if (onSearchChange) {
      onSearchChange(e.target.value)
    }
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    logoutUser(navigate)
  }

  return (
    <header className="box-border w-full bg-white border-b border-slate-200 sticky top-0 z-40 transition-all">
      <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-[68px] flex flex-row gap-4 lg:gap-7 items-center justify-between">
        {/* Wordmark Logo */}
        <Link
          to="/beranda-sewa"
          className="text-lg text-blue-600 font-extrabold tracking-tight text-left whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity bg-transparent border-0 p-0 no-underline"
        >
          Mesitra
        </Link>

      {/* NavLinks */}
      <nav className="box-border w-fit shrink-0 h-fit hidden md:flex flex-row gap-2 lg:gap-5 justify-start items-center">
        <button
          type="button"
          onClick={handleNavJelajahi}
          className={`box-border w-fit shrink-0 h-fit flex flex-col gap-1.5 py-[7px] px-3 justify-start items-center rounded-lg cursor-pointer transition-all border-0 ${
            resolvedActiveTab === 'jelajahi'
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'bg-transparent text-slate-600 hover:bg-slate-50 font-medium'
          }`}
        >
          <span className="text-[13px] whitespace-nowrap">Jelajahi Alat</span>
        </button>

        <button
          type="button"
          onClick={handleNavPesanan}
          className={`box-border w-fit shrink-0 h-fit flex flex-col gap-1.5 py-[7px] px-3 justify-start items-center rounded-lg cursor-pointer transition-all border-0 ${
            resolvedActiveTab === 'pesanan'
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'bg-transparent text-slate-600 hover:bg-slate-50 font-medium'
          }`}
        >
          <span className="text-[13px] whitespace-nowrap">Pesanan Saya</span>
        </button>

        <button
          type="button"
          onClick={handleNavPesan}
          className={`box-border w-fit shrink-0 h-fit flex flex-col gap-1.5 py-[7px] px-3 justify-start items-center rounded-lg cursor-pointer transition-all border-0 ${
            resolvedActiveTab === 'pesan'
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'bg-transparent text-slate-600 hover:bg-slate-50 font-medium'
          }`}
        >
          <div className="relative flex items-center">
            <span className="text-[13px] whitespace-nowrap">Pesan</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-full min-w-3.5 text-center leading-tight">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={handleNavDompet}
          className={`box-border w-fit shrink-0 h-fit flex flex-col gap-1.5 py-[7px] px-3 justify-start items-center rounded-lg cursor-pointer transition-all border-0 ${
            resolvedActiveTab === 'dompet'
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'bg-transparent text-slate-600 hover:bg-slate-50 font-medium'
          }`}
        >
          <span className="text-[13px] whitespace-nowrap">Dompet</span>
        </button>
      </nav>

      {/* Search Bar with Power Badge */}
      <div className="box-border flex-1 h-10 flex flex-row gap-2.5 px-3 justify-start items-center bg-slate-50 ring-1 ring-slate-200 rounded-[10px] focus-within:ring-2 focus-within:ring-blue-600 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={onSearchChange ? searchQuery : localSearch}
          onChange={handleSearch}
          placeholder="Cari mesin kopi, oven, mesin kemasan…"
          className="text-[13px] text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none w-full font-normal"
        />
        <div
          title="Kapasitas daya listrik usaha"
          className="box-border w-fit shrink-0 h-fit flex flex-row gap-0 py-[5px] px-2.5 justify-start items-center bg-blue-50 rounded-full select-none"
        >
          <span className="text-[11px] text-blue-700 font-semibold tabular-nums whitespace-nowrap">
            {userPower}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 sm:gap-3 justify-start items-center">
        {/* Lonceng Notifikasi Interaktif */}
        <NotificationBell />

        {/* User Profile Button with Integrated Wallet Indicator */}
        <div ref={menuRef} className="relative box-border w-fit shrink-0 h-fit flex flex-row justify-start items-center">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Buka menu profil dan dompet"
            aria-expanded={isMenuOpen}
            className="box-border flex flex-row items-center gap-2 py-1 px-1.5 sm:px-2 rounded-full bg-slate-100/90 hover:bg-slate-200/80 ring-1 ring-slate-200/90 cursor-pointer transition-all border-0 select-none shadow-2xs"
          >
            <div className="w-[30px] h-[30px] rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-[11px] shadow-2xs">
              {userInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none pr-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Dompet</span>
              <span className="text-xs text-blue-700 font-extrabold tabular-nums mt-0.5">
                {propWalletBalance || `Rp ${Number(liveBalance).toLocaleString('id-ID')}`}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-[46px] z-50 w-[270px] box-border flex flex-col gap-2 p-3 bg-white ring-1 ring-slate-200 rounded-[14px] shadow-xl animate-in fade-in zoom-in-95 duration-100">
              {/* 1. Header Profil (Nama & Email) */}
              <Link
                to="/profil"
                onClick={() => setIsMenuOpen(false)}
                className="box-border flex flex-col gap-0.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors justify-start items-start no-underline cursor-pointer group"
                title="Buka Pengaturan Profil"
              >
                <span className="text-xs text-slate-900 group-hover:text-blue-600 font-bold truncate w-full transition-colors flex items-center justify-between">
                  <span>{user?.fullName || user?.name || 'Penyewa UMKM'}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                </span>
                <span className="text-[10px] text-slate-500 truncate w-full">
                  {user?.email || '-'}
                </span>
              </Link>

              <div className="box-border w-full h-px bg-slate-100"></div>

              {/* 2. Tombol "Edit Profil & Usaha" */}
              <Link
                to="/profil"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-2 px-2.5 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-100 text-blue-800 font-bold rounded-xl flex items-center justify-between text-xs no-underline transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserCog className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Edit Profil &amp; Usaha</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              </Link>

              {/* 3. Tombol "Dompet & Escrow" */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  setWalletInitialView('OVERVIEW')
                  setIsWalletModalOpen(true)
                }}
                className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50/70 hover:from-blue-100/80 hover:to-indigo-100/80 text-slate-900 rounded-xl transition-all border border-blue-100 cursor-pointer text-left shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 leading-tight">Dompet &amp; Escrow</span>
                    <span className="text-[10px] text-blue-700 font-extrabold tabular-nums">
                      {propWalletBalance || `Rp ${Number(liveBalance).toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              </button>

              <div className="box-border w-full h-px bg-slate-100"></div>

              {/* 4. Tombol "Keluar Akun" (Logout) */}
              <button
                type="button"
                onClick={handleLogout}
                className="box-border w-full flex flex-row gap-2 py-2 px-2.5 justify-start items-center bg-transparent hover:bg-red-50 text-red-600 font-semibold text-xs rounded-lg cursor-pointer border-0 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Global Wallet Modal */}
      <ModalDompet
        isOpen={isWalletModalOpen}
        initialView={walletInitialView}
        onClose={() => setIsWalletModalOpen(false)}
      />

      {/* Floating Mobile Bottom Navigation Dock */}
      {!hideBottomNav && (
        <div className="fixed bottom-5 inset-x-0 flex justify-center z-40 md:hidden pointer-events-none px-4 animate-in fade-in duration-200">
          <nav
            aria-label="Navigasi Menu Mobile"
            className="pointer-events-auto flex items-center gap-1.5 p-1.5 bg-white/60 hover:bg-white/80 border border-white/70 backdrop-blur-xl shadow-xl shadow-slate-900/15 rounded-full transition-all"
          >
            {/* 1. Jelajahi Alat (Simbol Roket) */}
            <button
              type="button"
              onClick={handleNavJelajahi}
              title="Jelajahi Alat"
              aria-label="Jelajahi Alat"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border-0 select-none ${
                resolvedActiveTab === 'jelajahi'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-white/80 active:scale-95'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 active:scale-90'
              }`}
            >
              <Rocket className="w-5 h-5" />
            </button>

            {/* 2. Pesanan Saya (Simbol Keranjang) */}
            <button
              type="button"
              onClick={handleNavPesanan}
              title="Pesanan Saya"
              aria-label="Pesanan Saya"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border-0 select-none ${
                resolvedActiveTab === 'pesanan'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-white/80 active:scale-95'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 active:scale-90'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
            </button>

            {/* 3. Pesan (Simbol Logo Chat) */}
            <button
              type="button"
              onClick={handleNavPesan}
              title="Pesan"
              aria-label="Pesan"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border-0 select-none relative ${
                resolvedActiveTab === 'pesan'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-white/80 active:scale-95'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 active:scale-90'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-1.5 ring-white" />
              )}
            </button>

            {/* 4. Dompet (Simbol Logo Dompet) */}
            <button
              type="button"
              onClick={handleNavDompet}
              title="Dompet & Saldo"
              aria-label="Dompet & Saldo"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border-0 select-none ${
                resolvedActiveTab === 'dompet'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-white/80 active:scale-95'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 active:scale-90'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
