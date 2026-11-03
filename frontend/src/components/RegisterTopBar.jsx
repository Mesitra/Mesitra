import { Sparkles } from 'lucide-react'

/**
 * Komponen Navbar atas terpadu untuk halaman registrasi (Penyewa UMKM & Pemilik Alat).
 *
 * Sesuai panduan:
 * - Menggunakan struktur isi dari navbar penyewa (Logo MyRent, divider, judul role pendaftaran,
 *   tombol cepat Isi Data Demo, serta teks 'Sudah punya akun? Masuk di sini').
 * - Menggunakan acuan layout dari pemilik alat (edge-to-edge w-full h-16 px-4 sm:px-8 tanpa batas max-width di navbar).
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
  const handleHome = onBackToHome || onHomeClick || onBackToLogin || onLoginClick
  const handleLogin = onBackToLogin || onLoginClick

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-16 flex flex-row items-center justify-between">
        {/* Sisi Kiri: Logo + Garis Pemisah + Keterangan Role */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleHome}
          className="text-lg text-blue-600 font-extrabold tracking-[-0.3px] select-none hover:opacity-90 cursor-pointer transition-opacity"
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

      {/* Sisi Kanan: Kustom rightContent ATAU Tombol Isi Data Demo & Tautan Masuk */}
      {rightContent ? (
        <div className="flex items-center gap-2 sm:gap-4">
          {rightContent}
        </div>
      ) : (
        <div className="flex items-center gap-2 sm:gap-4">
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

          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
            <span className="text-slate-600 hidden sm:inline">Sudah punya akun?</span>
            <button
              type="button"
              onClick={handleLogin}
              className="text-blue-600 font-bold hover:underline cursor-pointer transition-colors"
            >
              {loginText}
            </button>
          </div>
        </div>
      )}
      </div>
    </header>
  )
}
