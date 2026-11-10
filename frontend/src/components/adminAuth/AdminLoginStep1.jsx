import React, { useRef, useState } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertCircle
} from 'lucide-react'

export default function AdminLoginStep1({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  isLoading,
  error,
  setError,
  rememberDevice,
  setRememberDevice,
  onBackToHome
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [infoModal, setInfoModal] = useState(null)

  // Input email & password sengaja dibiarkan tanpa atribut `value`/`defaultValue`
  // supaya tidak terisi otomatis. Nilainya tetap disinkronkan ke state wrapper
  // lewat onChange, danreferensi DOM dipakai untuk mengisi kredensial default.
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const isEmailEntered = email && email.trim().length > 0
  const isGmailOrDomain = email && (email.includes('@') && email.length >= 5)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Ambil nilai langsung dari input supaya yang dikirim sama persis dengan isi form.
    const emailValue = emailRef.current ? emailRef.current.value : email
    const passwordValue = passwordRef.current ? passwordRef.current.value : password

    if (!emailValue.trim() || !passwordValue) {
      if (setError) setError('Harap isi alamat email dan kata sandi')
      return
    }
    onSubmit(e, { email: emailValue, password: passwordValue })
  }

  const fillDefaultCredentials = () => {
    if (emailRef.current) emailRef.current.value = 'admin@myrent.com'
    if (passwordRef.current) passwordRef.current.value = 'Admin#Sewa2026'
    setEmail('admin@myrent.com')
    setPassword('Admin#Sewa2026')
    if (setError) setError('')
  }

  return (
    <div className="box-border w-full min-h-screen flex flex-col justify-between items-center bg-slate-50 py-6 px-4">
      {/* TopBar */}
      <div className="box-border w-full max-w-[1440px] px-4 sm:px-12 py-3 flex flex-row justify-between items-center">
        <div className="text-[10px] text-slate-500 font-bold tracking-[1.5px] uppercase">
          PORTAL INTERNAL
        </div>
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
          >
            ← Kembali ke Beranda Publik
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="w-full flex-1 flex flex-col justify-center items-center py-6">
        <form
          onSubmit={handleSubmit}
          className="box-border w-full max-w-[456px] flex flex-col gap-4 p-7 justify-start items-start bg-white outline outline-1 outline-slate-200 -outline-offset-1 rounded-[20px] shadow-sm shadow-slate-200/50"
        >
          {/* Header */}
          <div className="w-full flex flex-col gap-1">
            <h1 className="text-[26px] sm:text-[28px] leading-tight text-slate-900 font-extrabold tracking-tight text-left">
              Masuk sebagai admin
            </h1>
            <p className="text-[13px] leading-5 text-slate-600 font-normal text-left">
              Gunakan email Gmail resmi yang terdaftar pada undangan admin Mesitra.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="w-full flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Form Fields */}
          <div className="box-border w-full flex flex-col gap-3.5">
            {/* Field Email */}
            <div className="box-border w-full flex flex-col gap-1.5">
              <div className="box-border w-full flex flex-row justify-between items-center">
                <label className="text-xs text-slate-600 font-semibold text-left">
                  Email Gmail
                </label>
                {isGmailOrDomain && (
                  <div className="flex flex-row items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-700" />
                    <span className="text-[11px] text-green-700 font-semibold">
                      terdaftar
                    </span>
                  </div>
                )}
              </div>

              <div className="box-border w-full h-[46px] flex flex-row gap-2.5 px-3 items-center bg-white outline outline-1 outline-slate-200 -outline-offset-1 focus-within:outline-2 focus-within:outline-blue-600 rounded-[10px] transition-all">
                <Mail className="w-[15px] h-[15px] text-slate-400 shrink-0" />
                <input
                  ref={emailRef}
                  type="email"
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error && setError) setError('')
                  }}
                  placeholder="admin@myrent.com atau rani.admin@gmail.com"
                  autoComplete="off"
                  required
                  className="w-full bg-transparent border-none outline-none text-[13px] text-slate-900 font-normal placeholder:text-slate-400"
                />
                {isEmailEntered && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                )}
              </div>

              <div className="text-xs text-slate-500 font-normal text-left">
                Domain wajib @gmail.com atau @myrent.com
              </div>
            </div>

            {/* Field Kata Sandi */}
            <div className="box-border w-full flex flex-col gap-1.5">
              <div className="box-border w-full flex flex-row justify-between items-center">
                <label className="text-xs text-slate-600 font-semibold text-left">
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setInfoModal(
                      'Untuk mereset kata sandi admin, silakan hubungi tim DevOps internal HQ di it-support@mesitra.id.'
                    )
                  }
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold text-left cursor-pointer"
                >
                  Lupa kata sandi?
                </button>
              </div>

              <div className="box-border w-full h-[46px] flex flex-row gap-2.5 px-3 items-center bg-white outline outline-1 outline-slate-200 -outline-offset-1 focus-within:outline-2 focus-within:outline-blue-600 rounded-[10px] transition-all">
                <Lock className="w-[15px] h-[15px] text-slate-400 shrink-0" />
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error && setError) setError('')
                  }}
                  placeholder="••••••••••"
                  autoComplete="new-password"
                  required
                  className="w-full bg-transparent border-none outline-none text-[13px] text-slate-900 font-normal placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-[15px] h-[15px]" />
                  ) : (
                    <Eye className="w-[15px] h-[15px]" />
                  )}
                </button>
              </div>

              <div className="text-xs text-slate-500 font-normal text-left">
                Sandi sementara 12 karakter dari email undangan
              </div>
            </div>

            {/* Info Sandi Sementara */}
            <div className="box-border w-full flex flex-row gap-[9px] p-[11px] justify-start items-start bg-amber-50 outline outline-1 outline-amber-200 -outline-offset-1 rounded-[10px]">
              <KeyRound className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col gap-[3px] text-left">
                <div className="text-[11px] text-amber-700 font-bold">
                  Kata sandi sementara aktif
                </div>
                <div className="text-xs leading-[17px] text-amber-800 font-normal flex flex-wrap items-center justify-between gap-1">
                  <span>
                    <strong className="font-mono font-bold tracking-wide">Admin#Sewa2026</strong> — wajib diganti setelah login pertama.
                  </span>
                  <button
                    type="button"
                    onClick={fillDefaultCredentials}
                    className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                  >
                    Gunakan kredensial default
                  </button>
                </div>
              </div>
            </div>

            {/* Opsi: Remember Device */}
            <div className="box-border w-full flex flex-row justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => setRememberDevice(!rememberDevice)}
                className="flex flex-row items-center gap-2 cursor-pointer group text-left"
              >
                <div
                  className={`box-border w-[30px] h-4.5 flex flex-row p-0.5 items-center rounded-full transition-colors ${
                    rememberDevice
                      ? 'bg-blue-600 justify-end'
                      : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-xs"></div>
                </div>
                <span className="text-[11px] text-slate-600 group-hover:text-slate-800 font-normal">
                  Ingat perangkat ini
                </span>
              </button>
            </div>

            {/* Button Lanjut */}
            <button
              type="submit"
              disabled={isLoading}
              className="box-border w-full h-[46px] flex flex-row gap-2 justify-center items-center bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 text-white rounded-[10px] transition-all cursor-pointer shadow-xs mt-1"
            >
              <span className="text-[13px] font-bold">
                {isLoading ? 'Memverifikasi...' : 'Lanjut verifikasi'}
              </span>
              <ArrowRight className="w-[15px] h-[15px] text-white" />
            </button>
          </div>

          {/* Footer Security Notice */}
          <div className="box-border w-full flex flex-row gap-[7px] pt-1 justify-center items-center text-center">
            <ShieldCheck className="w-3 h-3 text-slate-400 shrink-0" />
            <div className="text-xs text-slate-500 font-normal">
              Akses terbatas. 5 percobaan gagal mengunci akun 30 menit.
            </div>
          </div>
        </form>
      </div>

      {/* Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4 text-center">
            <h3 className="font-bold text-slate-900 text-sm">Informasi Keamanan Internal</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{infoModal}</p>
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer Note */}
      <div className="w-full text-center text-[11px] text-slate-400 py-2">
        Mesitra Admin Security Gateway &copy; 2026. All rights reserved.
      </div>
    </div>
  )
}
