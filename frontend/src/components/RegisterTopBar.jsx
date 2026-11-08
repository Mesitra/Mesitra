import { Sparkles, ArrowLeft, Layers } from 'lucide-react'
import { hasAdminSession } from './adminAuth/adminSession'

/**
 * Komponen Navbar atas terpadu untuk halaman registrasi (Penyewa UMKM & Pemilik Alat).
 *
 * Sesuai panduan:
 * - Menyediakan akses navigasi kembali ke Halaman Login dan Beranda secara bersamaan.
 * - Menggunakan struktur isi dari navbar penyewa (Logo MyRent, divider, judul role pendaftaran,
 *   tombol cepat Isi Data Demo, tombol Kembali ke Beranda, dan Ke Halaman Login).
 * - Layout responsif untuk mobile, tablet, dan desktop.
 */
export default function RegisterTopBar({
  roleTitle = 'Daftar sebagai Penyewa UMKM',
  onBackToLogin,
  onLoginClick,
  onBackToHome,
  onHomeClick,
  onFillDemoData,
  loginText = 'Masuk di sini',
  rightContent
}) {
  const handleHome = onBackToHome || onHomeClick || (() => { window.location.href = '/' })
  const handleLogin = onBackToLogin || onLoginClick || (() => { window.location.href = '/login' })

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-16 flex flex-row items-center justify-between">
        {/* Sisi Kiri: Logo + Garis Pemisah + Keterangan Role */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleHome}
          className="text-lg text-blue-600 font-extrabold tracking-[-0.3px] select-none hover:opacity-90 cursor-pointer transition-opacity"
          title="Ke Beranda MyRent"
        >
          MyRent
        </button>
        {roleTitle && (
          <>
            <div className="w-px h-4 bg-slate-200 hidden sm:block" />
            <span className="text-xs text-slate-600 font-semibold hidden sm:inline-block">
              {roleTitle}
            </span>
          </>
        )}
      </div>

      {/* Sisi Kanan: Kustom rightContent ATAU Tombol Kembali ke Beranda & Ke Login Bersamaan */}
      {rightContent ? (
        <div className="flex items-center gap-2 sm:gap-4">
          {rightContent}
        </div>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3">
          {onFillDemoData && (
            <button
              type="button"
              onClick={onFillDemoData}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              title="Isi form otomatis untuk peninjauan cepat"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Isi Data Demo</span>
            </button>
          )}

          {/* Tombol Kembali ke Beranda */}
          <button
            type="button"
            onClick={handleHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer shadow-2xs"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Kembali ke Beranda</span>
            <span className="sm:hidden">Beranda</span>
          </button>

          {/* Tombol Ke Halaman Login atau Kembali ke MyRent HQ */}
          {hasAdminSession() ? (
            <button
              type="button"
              onClick={() => { window.location.href = '/portal-internal-hq/dashboard' }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Kembali ke Dashboard MyRent HQ"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Kembali ke MyRent HQ</span>
              <span className="sm:hidden">MyRent HQ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/70 border border-blue-200 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Ke Halaman Login"
            >
              <span className="hidden sm:inline">Ke Halaman Login</span>
              <span className="sm:hidden">Masuk</span>
            </button>
          )}
        </div>
      )}
      </div>
    </header>
  )
}
