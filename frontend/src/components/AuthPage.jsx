import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Layers
} from 'lucide-react'
import AuthNavbar from './AuthNavbar'
import { clearPending, writePending } from '../lib/registration'
import { clearUserSession } from '../lib/userSession'
import { hasAdminSession } from './adminAuth/adminSession'

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000'

export default function AuthPage({ onLoginSuccess, onNavigateRegister, onBackToLanding }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Proteksi Route Guard: Bila terdeteksi ada sesi Admin yang aktif di browser,
  // langsung arahkan kembali ke Dashboard Admin HQ agar admin tidak kebingungan
  // melihat formulir login akun reguler (Penyewa / Pemilik).
  useEffect(() => {
    if (hasAdminSession()) {
      navigate('/admin/kyc', { replace: true })
      return
    }
    clearUserSession()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, [navigate])
  const [prevLocationKey, setPrevLocationKey] = useState(location.key)
  const [role, setRole] = useState(location.state?.defaultRole || location.state?.role || 'penyewa')

  if (location.key !== prevLocationKey) {
    setPrevLocationKey(location.key)
    setRole(location.state?.defaultRole || location.state?.role || 'penyewa')
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  const isPenyewa = role === 'penyewa'

  const handleNotify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3500)
  }

  // Penggantian peran hanya sebagai preferensi visual awal (single login flow) tanpa menghapus input email
  const handleRoleChange = (newRole) => {
    setRole(newRole)
    if (error) setError('')
  }

  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Harap masukkan alamat email Anda.')
      return
    }

    // Validasi format email standar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Format email tidak valid. Gunakan format nama@domain.com')
      return
    }

    if (!password) {
      setError('Harap masukkan kata sandi Anda.')
      return
    }

    if (password.length < 6) {
      setError('Kata sandi minimal terdiri dari 6 karakter.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Email atau kata sandi tidak valid')
      }

      const userRole = String(data.user?.role || '').toUpperCase()

      // ── Validasi Kesesuaian Tab Peran yang Dipilih ─────────────────────────
      // Mencegah login akun penyewa pada tab pemilik atau sebaliknya.
      if (role === 'pemilik' && userRole === 'PENYEWA') {
        setError("Akun ini terdaftar sebagai Penyewa Alat. Silakan pilih tab 'Penyewa UMKM' untuk masuk.")
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsLoading(false)
        return
      }

      if (role === 'penyewa' && userRole === 'PEMILIK') {
        setError("Akun ini terdaftar sebagai Pemilik Alat. Silakan pilih tab 'Pemilik Alat' untuk masuk.")
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsLoading(false)
        return
      }

      const verificationStatus = String(data.user?.verificationStatus || 'DISETUJUI').toUpperCase()
      const isPenyewaOrPemilik = userRole === 'PENYEWA' || userRole === 'PEMILIK'

      // ── Gatekeeper verifikasi KYC ────────────────────────────────────────
      // Akun yang belum diverifikasi admin tidak boleh masuk ke beranda sewa.
      if (isPenyewaOrPemilik && (verificationStatus === 'MENUNGGU' || verificationStatus === 'PERLU_PERBAIKAN')) {
        writePending(userRole, {
          userId: data.user?.id,
          email: data.user?.email,
          submissionCode: data.user?.submissionCode,
          verificationStatus
        })

        // Sesi lama dibersihkan supaya tidak ada data akun lain yang tertinggal.
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        handleNotify(
          verificationStatus === 'PERLU_PERBAIKAN'
            ? 'Ada data yang perlu diperbaiki sebelum akun bisa aktif.'
            : 'Akun Anda sedang menunggu verifikasi admin.'
        )

        navigate(userRole === 'PEMILIK' ? '/register/pemilik' : '/register/penyewa', { replace: true })
        return
      }

      // Pengajuan ditolak permanen → stays di form login dengan pesan jelas.
      if (isPenyewaOrPemilik && verificationStatus === 'DITOLAK') {
        const alasan = data.user?.adminNote ? ` Alasan dari admin: ${data.user.adminNote}` : ''
        setError(
          `Pengajuan verifikasi akun Anda ditolak secara permanen dan tidak dapat diperbaiki lagi.${alasan}`
        )
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        return
      }

      // Akun sudah disetujui → bebaskan lock anti-spam.
      if (isPenyewaOrPemilik) {
        clearPending(userRole)
      }

      // Simpan JWT token dan data user ke localStorage
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      const roleLabel = userRole === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa UMKM'
      handleNotify(`Berhasil masuk! Mengalihkan ke akun ${roleLabel}...`)

      // Role-Based Routing.
      // Catatan: bila `onLoginSuccess` tersedia, navigasi dilakukan oleh parent
      // (App.jsx). Navigasi ganda di sini membuat `/dashboard-pemilik` masuk
      // history stack dua kali, sehingga tombol Back browser masih bisa
      // kembali ke dashboard SEDAN PADA setelah logout.
      if (onLoginSuccess) {
        onLoginSuccess(data.user)
      } else if (userRole === 'PEMILIK') {
        navigate('/dashboard-pemilik', { replace: true })
      } else {
        navigate('/beranda-sewa', { replace: true })
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        setError(`Gagal menghubungi server (${API_BASE_URL}). Pastikan server backend sedang aktif berjalan.`)
      } else {
        setError(err.message || 'Gagal terhubung ke server autentikasi.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterRedirect = (targetRole) => {
    if (onNavigateRegister) {
      onNavigateRegister(targetRole)
    } else {
      if (targetRole === 'pemilik') {
        navigate('/register/pemilik')
      } else {
        navigate('/register/penyewa')
      }
    }
  }

  const handleBack = () => {
    if (onBackToLanding) {
      onBackToLanding()
    } else {
      navigate('/')
    }
  }


  if (hasAdminSession()) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-start items-center text-slate-800 font-sans">
        <AuthNavbar onBackToHome={handleBack} />
        <div className="flex-1 w-full max-w-md mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sesi Administrator HQ Aktif</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Anda terdeteksi sedang memiliki sesi aktif sebagai Administrator Internal HQ. Sedang mengalihkan Anda ke Dashboard Admin...
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/kyc', { replace: true })}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Kembali ke MyRent HQ</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between items-center text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* Toast Notifikasi Global */}
      {notification && (
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-medium border border-slate-700/60 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[90vw]">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Navbar Atas Terpadu (Mobile, Tablet, Desktop) */}
      <AuthNavbar onBackToHome={handleBack} />

      {/* Main Body */}
      <main className="w-full max-w-[1440px] flex-1 flex items-center justify-center px-4 sm:px-10 py-4 sm:py-8 lg:py-12">
        <div className="w-full max-w-[1080px] flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-[72px]">

          {/* Panel Kiri: Hero & Value Proposition
              Responsif: DISEMBUNYIKAN di layar mobile (hidden), HANYA TAMPIL di layar besar (lg:flex) */}
          <div className="hidden lg:flex w-full lg:w-[480px] shrink-0 flex-col gap-5 text-left">
            {/* Headline Dinamis */}
            <h1 className="text-3xl sm:text-4xl sm:leading-[44px] text-slate-900 font-extrabold tracking-[-0.9px]">
              {isPenyewa
                ? 'Masuk dan lanjutkan sewa alat Anda.'
                : 'Kelola dan sewakan alat produksi Anda.'}
            </h1>

            {/* Deskripsi Dinamis dengan kontras teruji WCAG */}
            <p className="text-sm leading-[22px] text-slate-600 max-w-[480px]">
              {isPenyewa
                ? 'Pantau pengajuan sewa, masa sewa berjalan, dan status refund deposit Anda dalam satu tempat.'
                : 'Pantau status unit disewa, jadwal pengembalian, dan pencairan dana sewa langsung ke rekening Anda.'}
            </p>

            {/* 3 Checklist Keunggulan Transaksi */}
            <div className="w-full flex flex-col gap-3.5 pt-2">
              {isPenyewa ? (
                <>
                  <div className="flex flex-row items-start gap-2.5">
                    <CheckCircle2
                      className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5"
                      strokeWidth={2.4}
                    />
                    <span className="text-[13px] leading-5 text-slate-700 font-medium">
                      Ajukan sewa &amp; bayar dengan QRIS atau Virtual Account
                    </span>
                  </div>
                  <div className="flex flex-row items-start gap-2.5">
                    <CheckCircle2
                      className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5"
                      strokeWidth={2.4}
                    />
                    <span className="text-[13px] leading-5 text-slate-700 font-medium">
                      Deposit ditahan escrow, refund otomatis setelah inspeksi
                    </span>
                  </div>
                  <div className="flex flex-row items-start gap-2.5">
                    <CheckCircle2
                      className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5"
                      strokeWidth={2.4}
                    />
                    <span className="text-[13px] leading-5 text-slate-700 font-medium">
                      Kontrak dan BAST tersimpan rapi di akun Anda
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-row items-start gap-2.5">
                    <CheckCircle2
                      className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5"
                      strokeWidth={2.4}
                    />
                    <span className="text-[13px] leading-5 text-slate-700 font-medium">
                      Penyewa terverifikasi identitas KTP &amp; NIB resmi
                    </span>
                  </div>
                  <div className="flex flex-row items-start gap-2.5">
                    <CheckCircle2
                      className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5"
                      strokeWidth={2.4}
                    />
                    <span className="text-[13px] leading-5 text-slate-700 font-medium">
                      Dana sewa dan deposit diamankan di escrow sebelum alat dikirim
                    </span>
                  </div>
                  <div className="flex flex-row items-start gap-2.5">
                    <CheckCircle2
                      className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5"
                      strokeWidth={2.4}
                    />
                    <span className="text-[13px] leading-5 text-slate-700 font-medium">
                      BAST serah terima digital lengkap dengan bukti dokumentasi foto
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Panel Kanan: Kartu Form Login
              Elevasi: Bayangan halus berdimensi (shadow-md shadow-slate-200/50 dengan border slate-200/80)
              Di mobile: Otomatis full-width dan menjadi fokus utama tanpa logo internal redundan */}
          <div className="w-full max-w-[440px] shrink-0 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-md shadow-slate-200/50">
            {/* Header Kartu: Judul & Subjudul Berkontras Tinggi (Tanpa Logo MyRent Redundan) */}
            <div>
              <h2 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight">
                Masuk ke akun Anda
              </h2>
              <p className="text-[13px] leading-5 text-slate-600 mt-1">
                Pilih preferensi akun, lalu masuk dengan email dan kata sandi Anda.
              </p>
            </div>

            {/* Pemilih Role (Single Entrance Flow: sebagai preferensi visual awal, tidak memblokir pengguna) */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-bold tracking-wider uppercase">
                  Masuk Sebagai
                </span>
              </div>

              {/* Tab Switcher Pemilihan Role (tanpa ikon toko / kunci) */}
              <RoleTabSwitcher activeRole={role} onRoleChange={handleRoleChange} />

              {/* Info Pemilihan Peran */}
              <p className="text-[11px] text-slate-500 leading-tight pt-0.5">
                Pastikan tab peran yang dipilih sesuai dengan jenis akun Anda saat mendaftar.
              </p>
            </div>

            {/* Error Message Box (Bila Validasi Gagal) */}
            {error && (
              <div className="w-full flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Form Input Autentikasi */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
              {/* Field Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder={isPenyewa ? 'nama@umkm.com' : 'nama@pemilikalat.com'}
                    className="w-full h-[46px] bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-normal"
                  />
                </div>
              </div>

              {/* Field Kata Sandi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="••••••••"
                    className="w-full h-[46px] bg-white border border-slate-300 rounded-xl pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-500 hover:text-slate-800 p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Baris Opsi: Checkbox Ingat Saya & Tautan Lupa Sandi */}
              <div className="flex flex-row justify-between items-center pt-0.5">
                <label
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex flex-row items-center gap-2 cursor-pointer select-none"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                      rememberMe
                        ? 'bg-blue-600 border border-blue-600'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {rememberMe && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-xs text-slate-700 font-medium">Ingat saya</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleNotify('Tautan pemulihan kata sandi telah dikirim ke email Anda.')}
                  className="text-xs text-blue-600 font-bold hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                >
                  Lupa sandi?
                </button>
              </div>

              {/* Tombol Utama (Primary CTA): Masuk */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[46px] bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs mt-1 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>

              {/* Opsi Registrasi Baru: Tautan Teks Bersih Menggantikan Tombol Outline Sekunder */}
              <div className="pt-2 text-center text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                <span>Belum punya akun? </span>
                <div className="inline-flex flex-wrap justify-center gap-1.5 mt-1 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => handleRegisterRedirect('penyewa')}
                    className="font-bold text-blue-600 hover:text-slate-900 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Daftar sebagai Penyewa
                  </button>
                  <span className="text-slate-400">atau</span>
                  <button
                    type="button"
                    onClick={() => handleRegisterRedirect('pemilik')}
                    className="font-bold text-blue-600 hover:text-slate-900 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Daftar sebagai Pemilik
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>
      </main>

      {/* Global Footer */}
      <footer className="w-full py-5 text-center text-xs text-slate-600 font-medium">
        © 2026 MyRent. Platform Sewa Alat Terverifikasi untuk UMKM Indonesia.
      </footer>
    </div>
  )
}

/**
 * Komponen Tab Switcher untuk pemilihan preferensi role akun (Penyewa UMKM / Pemilik Alat).
 * Dilengkapi animated sliding background indicator yang bergeser mulus saat role berganti.
 */
function RoleTabSwitcher({ activeRole, onRoleChange }) {
  const isPenyewa = activeRole === 'penyewa'

  return (
    <div
      role="tablist"
      aria-label="Pilih Preferensi Role Akun"
      className="relative w-full p-1 bg-slate-100 rounded-xl border border-slate-200/80 grid grid-cols-2 select-none"
    >
      {/* Animated Sliding Indicator */}
      <div
        aria-hidden="true"
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-xs border border-slate-200/70 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
          isPenyewa ? 'left-1 translate-x-0' : 'left-1 translate-x-full'
        }`}
      />

      {/* Tab 1: Penyewa UMKM */}
      <button
        type="button"
        role="tab"
        aria-selected={isPenyewa}
        onClick={() => onRoleChange('penyewa')}
        className={`relative z-10 w-full py-2.5 px-3 rounded-lg text-[13px] font-bold text-center transition-colors duration-200 cursor-pointer ${
          isPenyewa ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Penyewa UMKM
      </button>

      {/* Tab 2: Pemilik Alat */}
      <button
        type="button"
        role="tab"
        aria-selected={!isPenyewa}
        onClick={() => onRoleChange('pemilik')}
        className={`relative z-10 w-full py-2.5 px-3 rounded-lg text-[13px] font-bold text-center transition-colors duration-200 cursor-pointer ${
          !isPenyewa ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Pemilik Alat
      </button>
    </div>
  )
}


