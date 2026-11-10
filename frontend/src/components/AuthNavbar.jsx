import { ArrowLeft, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hasAdminSession } from './adminAuth/adminSession'

/**
 * Komponen Navbar atas untuk halaman Login (AuthPage).
 *
 * Mengikuti prinsip desain:
 * - Minimalist Auth Navbar yang konsisten dengan RegisterTopBar (h-16, bg-white, border-b, sticky top-0, px-4 sm:px-8).
 * - Responsif optimal di layar Mobile (<640px), Tablet (sm/md), dan Desktop (lg/xl).
 * - Sisi kiri: Logo Mesitra + divider & label "Masuk ke Akun" (tampil pada sm ke atas).
 * - Sisi kanan: tombol "Kembali ke Beranda" atau "Kembali ke Mesitra HQ" bila terdeteksi sesi admin.
 */
export default function AuthNavbar({ onBackToHome }) {
  const navigate = useNavigate()
  const isAdmin = hasAdminSession()

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-16 flex flex-row items-center justify-between">
        {/* Sisi Kiri: Logo Brand & Identitas Halaman */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="text-lg text-blue-600 font-extrabold tracking-[-0.3px] select-none hover:opacity-90 cursor-pointer transition-opacity"
            title="Ke Beranda Mesitra"
          >
            Mesitra
          </button>
          <div className="w-px h-4 bg-slate-200 hidden sm:block" />
          <span className="text-xs text-slate-600 font-semibold hidden sm:inline-block">
            {isAdmin ? 'Portal Otentikasi' : 'Masuk ke Akun'}
          </span>
        </div>

        {/* Sisi Kanan: Tombol Kembali ke Mesitra HQ atau Beranda */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => navigate('/admin/kyc')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl border border-slate-800 transition-all cursor-pointer shadow-2xs"
              title="Kembali ke Dashboard Mesitra HQ"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Kembali ke Mesitra HQ</span>
              <span className="sm:hidden">Mesitra HQ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer shadow-2xs"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <span className="hidden sm:inline">Kembali ke Beranda</span>
              <span className="sm:hidden">Beranda</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

