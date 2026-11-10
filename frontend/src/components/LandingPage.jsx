import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle2,
  Coins,
  FileCheck2,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Users,
  Search,
  Menu,
  X,
  CreditCard,
  Coffee,
  Package,
  Scissors,
  Flame,
  BadgeCheck,
  Layers
} from 'lucide-react'
import { useAdminAuth } from './adminAuth/adminSession'
import { hasPenyewaSession, hasPemilikSession } from '../lib/userSession'

export default function LandingPage({
  onNavigateLogin,
  onNavigateRegisterPenyewa,
  onNavigateRegisterPemilik,
  onNavigateCatalog
}) {
  const navigate = useNavigate()
  const { isAdmin } = useAdminAuth()
  const [userAuth, setUserAuth] = useState(() => ({
    isPenyewa: hasPenyewaSession(),
    isPemilik: hasPemilikSession()
  }))

  useEffect(() => {
    const syncUser = () => {
      setUserAuth({
        isPenyewa: hasPenyewaSession(),
        isPemilik: hasPemilikSession()
      })
    }
    syncUser()
    window.addEventListener('storage', syncUser)
    window.addEventListener('myrent:user-updated', syncUser)
    window.addEventListener('popstate', syncUser)
    window.addEventListener('focus', syncUser)
    return () => {
      window.removeEventListener('storage', syncUser)
      window.removeEventListener('myrent:user-updated', syncUser)
      window.removeEventListener('popstate', syncUser)
      window.removeEventListener('focus', syncUser)
    }
  }, [])

  const isUserLoggedIn = userAuth.isPenyewa || userAuth.isPemilik
  const isPemilikUser = userAuth.isPemilik
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [howItWorksRole, setHowItWorksRole] = useState('penyewa') // 'penyewa' | 'pemilik'

  const handleLoginClick = (role = 'penyewa') => {
    setMobileMenuOpen(false)
    if (typeof onNavigateLogin === 'function') {
      onNavigateLogin({ state: { defaultRole: role } })
    } else {
      navigate('/login', { state: { defaultRole: role } })
    }
  }

  const handleRegisterPemilikClick = () => {
    setMobileMenuOpen(false)
    if (typeof onNavigateRegisterPemilik === 'function') {
      onNavigateRegisterPemilik()
    } else {
      navigate('/register/pemilik')
    }
  }

  const handleRegisterPenyewaClick = () => {
    setMobileMenuOpen(false)
    if (typeof onNavigateRegisterPenyewa === 'function') {
      onNavigateRegisterPenyewa()
    } else {
      navigate('/register/penyewa')
    }
  }

  const handleCatalogClick = () => {
    setMobileMenuOpen(false)
    if (typeof onNavigateCatalog === 'function') {
      onNavigateCatalog()
    } else {
      navigate('/dashboard')
    }
  }

  const scrollToSection = (id) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const categoryList = [
    {
      id: 'kopi',
      title: 'Mesin Espresso & Kopi',
      category: 'F&B & Kafe',
      desc: 'Mesin espresso komersial 1-2 group, grinder industri, dan roaster.',
      image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=600&q=80',
      price: 'Mulai Rp 250rb/hr',
      count: '14 Unit Tersedia',
      icon: Coffee,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-700 border-amber-200'
    },
    {
      id: 'packaging',
      title: 'Band Sealer & Packaging',
      category: 'Kemasan & Logistik',
      desc: 'Continuous band sealer, vacuum packaging, dan coding tanggal kadaluarsa.',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      price: 'Mulai Rp 120rb/hr',
      count: '11 Unit Tersedia',
      icon: Package,
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-700 border-blue-200'
    },
    {
      id: 'konveksi',
      title: 'Mesin Jahit Konveksi',
      category: 'Tekstil & Fashion',
      desc: 'High speed direct drive jarum 1, mesin obras 4 benang, & interlock.',
      image: 'https://images.unsplash.com/photo-1528458876885-5b6eacdd3671?auto=format&fit=crop&w=600&q=80',
      price: 'Mulai Rp 50rb/hr',
      count: '16 Unit Tersedia',
      icon: Scissors,
      color: 'from-purple-500/20 to-pink-500/10 text-purple-700 border-purple-200'
    },
    {
      id: 'bakery',
      title: 'Planetary Mixer & Oven',
      category: 'Roti & Pastry',
      desc: 'Deck oven gas 1-2 loyang, spiral mixer 20L, dan proofer roti higienis.',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      price: 'Mulai Rp 180rb/hr',
      count: '9 Unit Tersedia',
      icon: Flame,
      color: 'from-rose-500/20 to-red-500/10 text-rose-700 border-rose-200'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* 1. STICKY HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-200/80 transition-all">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo (Logo Saja) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-[22px] sm:text-2xl text-blue-600 font-extrabold tracking-[-0.5px] select-none cursor-pointer flex items-center group"
            >
              <span>Mesitra</span>
            </button>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('keunggulan')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Fitur &amp; Keunggulan
            </button>
            <button
              onClick={() => scrollToSection('cara-kerja')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Cara Kerja
            </button>
            <button
              onClick={() => scrollToSection('kategori-alat')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Kategori Alat
            </button>
            <button
              onClick={() => scrollToSection('keamanan-escrow')}
              className="hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Keamanan Escrow</span>
            </button>
          </nav>

          {/* Right Action Button: Dynamic CTA */}
          {isAdmin ? (
            <div className="hidden sm:flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/kyc')}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border border-slate-800"
                title="Kembali ke Dashboard Admin HQ"
              >
                <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Kembali ke Mesitra HQ</span>
              </button>
            </div>
          ) : isUserLoggedIn ? (
            <div className="hidden sm:flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(isPemilikUser ? '/dashboard-pemilik' : '/beranda-sewa')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>{isPemilikUser ? 'Dashboard Pemilik' : 'Buka Beranda Sewa'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center">
              <button
                type="button"
                onClick={() => handleLoginClick('penyewa')}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Masuk ke Akun
              </button>
            </div>
          )}

          {/* Mobile Menu & Action Button */}
          {isAdmin ? (
            <div className="flex sm:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/kyc')}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer border border-slate-800"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Mesitra HQ</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          ) : isUserLoggedIn ? (
            <div className="flex sm:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(isPemilikUser ? '/dashboard-pemilik' : '/beranda-sewa')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <div className="flex sm:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoginClick('penyewa')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 bg-white/98 backdrop-blur px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => scrollToSection('keunggulan')}
                className="text-left text-sm font-medium text-slate-700 py-2 hover:text-blue-600"
              >
                Fitur &amp; Keunggulan
              </button>
              <button
                onClick={() => scrollToSection('cara-kerja')}
                className="text-left text-sm font-medium text-slate-700 py-2 hover:text-blue-600"
              >
                Cara Kerja
              </button>
              <button
                onClick={() => scrollToSection('kategori-alat')}
                className="text-left text-sm font-medium text-slate-700 py-2 hover:text-blue-600"
              >
                Kategori Alat Produksi
              </button>
              <button
                onClick={() => scrollToSection('keamanan-escrow')}
                className="text-left text-sm font-medium text-slate-700 py-2 hover:text-blue-600 flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Keamanan Escrow &amp; BAST</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/admin/kyc')
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-center rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Kembali ke Mesitra HQ</span>
                </button>
              ) : isUserLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate(isPemilikUser ? '/dashboard-pemilik' : '/beranda-sewa')
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{isPemilikUser ? 'Dashboard Pemilik' : 'Buka Beranda Sewa'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLoginClick('penyewa')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Masuk ke Akun
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-blue-100/50 via-indigo-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-8">
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 tracking-[-1px] leading-[1.15]">
              Akses Mesin Usaha Berkualitas <span className="text-blue-600">Tanpa Beban Biaya Modal</span> Tinggi.
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Sewa mesin kopi, packaging, konveksi, dan bakery dengan sistem{' '}
              <strong className="text-slate-900 font-semibold">deposit escrow transparan</strong>,{' '}
              <strong className="text-slate-900 font-semibold">kontrak digital resmi</strong>, serta{' '}
              <strong className="text-slate-900 font-semibold">perlindungan BAST terverifikasi</strong>.
            </p>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto pt-2">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate('/admin/kyc')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-md shadow-slate-900/20 hover:shadow-lg transition-all cursor-pointer border border-slate-800"
                >
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Kembali ke Mesitra HQ</span>
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleLoginClick('penyewa')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer group"
                  >
                    <Search className="w-4 h-4" />
                    <span>Cari &amp; Sewa Alat Sekarang</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRegisterPemilikClick}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:scale-98 text-slate-800 font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 shadow-2xs transition-all cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>Daftarkan Alat Anda (Pemilik)</span>
                  </button>
                </>
              )}
            </div>

            {/* Trust Badges / Social Proof Metrics Bar */}
            <div className="pt-8 sm:pt-10 border-t border-slate-200/90 w-full max-w-2xl grid grid-cols-3 gap-4 sm:gap-8 text-center">
              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  120+
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                  UMKM Tergabung
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 tracking-tight tabular-nums">
                  Rp 120jt+
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                  Modal Dihemat
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-blue-600 tracking-tight tabular-nums">
                  100%
                </div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                  Verifikasi KYC &amp; BAST
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VALUE PROPOSITION & KEUNGGULAN (3 PILAR UTAMA) */}
      <section id="keunggulan" className="py-20 bg-white border-y border-slate-200/80">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Mengapa Ekosistem Mesitra Jadi Pilihan Utama UMKM?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Kami menghapus friksi pengadaan aset produksi dengan perlindungan hukum, escrow finansial, dan inspeksi teknis yang adil untuk kedua belah pihak.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pilar 1: Efisiensi Modal */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-7 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Efisiensi Modal UMKM
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sewa fleksibel harian, mingguan, atau bulanan tanpa perlu investasi beli mesin baru. Dana tunai usaha tetap utuh untuk modal bahan baku dan pemasaran.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/60 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sewa fleksibel harian, mingguan, atau bulanan</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tanpa beban depresiasi &amp; biaya servis awal</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Skalakan produksi saat pesanan sedang ramai</span>
                </div>
              </div>
            </div>

            {/* Pilar 2: Keamanan Transaksi Escrow */}
            <div id="keamanan-escrow" className="bg-slate-50 border border-slate-200/90 rounded-2xl p-7 flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Keamanan Transaksi (Escrow Deposit)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Deposit penyewa ditahan di rekening bersama resmi yang aman. Dana sewa dan deposit hanya dicairkan sesuai status penyelesaian serah terima nyata.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/60 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Rekening bersama terproteksi anti-kecurangan</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Refund otomatis tanpa potongan sepihak</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pencairan dana sewa bertahap ke pemilik</span>
                </div>
              </div>
            </div>

            {/* Pilar 3: Kelaikan Mesin & BAST Digital */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-7 flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Kelaikan Mesin &amp; BAST Digital
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Setiap unit diperiksa bersama foto kondisi awal-akhir untuk menghindari sengketa operasional. Berita Acara Serah Terima (BAST) tersimpan sah digital.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/60 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dokumentasi foto kondisi fisik awal &amp; akhir</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Checklist kelistrikan (Watt, Voltase &amp; Kabel)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tanda tangan BAST digital terverifikasi hukum</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. SEKSI CARA KERJA (HOW IT WORKS) DENGAN ROLE TABS */}
      <section id="cara-kerja" className="py-20 bg-slate-50">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bagaimana Mesitra Bekerja?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Pilih peran Anda untuk melihat kemudahan langkah transaksi dari awal hingga selesai.
            </p>

            {/* Role Switcher Tabs */}
            <div className="pt-4 flex items-center justify-center">
              <div className="inline-flex bg-slate-200/80 p-1 rounded-2xl border border-slate-300/70 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setHowItWorksRole('penyewa')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    howItWorksRole === 'penyewa'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Untuk Penyewa UMKM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHowItWorksRole('pemilik')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    howItWorksRole === 'pemilik'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Untuk Pemilik Alat</span>
                </button>
              </div>
            </div>
          </div>

          {/* Workflow Steps Content */}
          <div className="mt-12">
            {howItWorksRole === 'penyewa' ? (
              /* ALUR PENYEWA */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                {/* Step 1 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-blue-100">
                      01
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Pilih Mesin Usaha
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Jelajahi katalog alat produksi sesuai kebutuhan kapasitas, voltase listrik, dan lokasi usaha Anda.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <span>Filter spesifikasi lengkap</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-blue-100">
                      02
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Ajukan &amp; Bayar Escrow
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Tentukan durasi sewa. Bayar tarif sewa &amp; deposit ke rekening escrow bersama via QRIS / Virtual Account.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Deposit aman di escrow</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-blue-100">
                      03
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Serah Terima &amp; BAST
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Alat diantar, lakukan uji fungsi bersama pemilik, lalu upload foto kondisi awal untuk Berita Acara (BAST).
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Dokumentasi foto digital</span>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-blue-100">
                      04
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Mulai Produksi &amp; Refund
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Gunakan mesin untuk produksi bisnis. Setelah masa sewa selesai &amp; unit dicek, deposit otomatis dikembalikan utuh.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Refund deposit instan</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ALUR PEMILIK */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                {/* Step 1 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-indigo-100">
                      01
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Daftarkan Alat &amp; Listrik
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Upload foto mesin yang nganggur di tempat Anda, isi spesifikasi daya (Watt), merek, dan tentukan tarif sewa harian.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                    <span>Hanya 5 menit pendaftaran</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-indigo-100">
                      02
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Verifikasi Kelaikan
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Tim kurator Mesitra memvalidasi kesiapan unit agar langsung tayang dan dapat disewa oleh UMKM yang terverifikasi KYC.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Badge Alat Terverifikasi</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-indigo-100">
                      03
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Terima Permintaan Sewa
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Terima penawaran sewa, review profil penyewa, lalu setujui jadwal serah terima dan BAST digital.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Penyewa beridentitas resmi</span>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold text-sm flex items-center justify-center mb-4 border border-indigo-100">
                      04
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      Pencairan Dana Otomatis
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Dana sewa dicairkan otomatis ke rekening Anda setelah proses BAST selesai tanpa potongan tersembunyi.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pencairan langsung ke rekening</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. PREVIEW KATEGORI ALAT PRODUKSI (SHOWCASE GRID) */}
      <section id="kategori-alat" className="py-20 bg-white border-t border-slate-200/80">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Kategori Alat Produksi Unggulan
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl">
                Temukan mesin yang tepat untuk meningkatkan kapasitas harian bisnis Anda tanpa beban cicilan alat berat.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCatalogClick}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-xs transition-all self-start md:self-auto cursor-pointer"
            >
              <span>Lihat Semua Katalog Mesin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoryList.map((cat) => {
              const IconComp = cat.icon
              return (
                <div
                  key={cat.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Image Header */}
                    <div className="relative h-44 overflow-hidden bg-slate-200">
                      <img
                        src={cat.image}
                        alt={cat.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-800 shadow-xs flex items-center gap-1">
                        <IconComp className="w-3 h-3 text-blue-600" />
                        <span>{cat.category}</span>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-medium tabular-nums text-white">
                        {cat.count}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-xs font-bold tabular-nums text-slate-800">
                        {cat.price}
                      </span>
                      <button
                        type="button"
                        onClick={handleCatalogClick}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Sewa</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6. CALL-TO-ACTION (CTA) BANNER BAWAH */}
      <section className="py-16 sm:py-20 bg-slate-900 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 relative z-10">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-8 sm:p-14 text-white shadow-2xl border border-blue-400/30">
            <div className="max-w-3xl space-y-4">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Siap Melipatgandakan Kapasitas Produksi Usaha Anda?
              </h2>

              <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-2xl">
                Bergabung bersama ratusan pengusaha UMKM lainnya. Sewa alat produksi terpercaya dengan deposit escrow terlindungi atau sewakan mesin nganggur Anda untuk passive income.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleRegisterPenyewaClick}
                  className="flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <span>Daftar Sewa Alat (Penyewa)</span>
                  <ArrowRight className="w-4 h-4 text-blue-700" />
                </button>

                <button
                  type="button"
                  onClick={handleRegisterPemilikClick}
                  className="flex items-center justify-center gap-2 bg-blue-900/60 hover:bg-blue-900 text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl border border-blue-400/30 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Daftarkan Mesin (Pemilik)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCatalogClick}
                  className="text-xs sm:text-sm text-blue-100 hover:text-white underline underline-offset-4 text-center sm:text-left transition-colors cursor-pointer"
                >
                  Coba Jelajahi Katalog Demo →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER LENGKAP */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200">
            {/* Col 1: Brand & Tagline */}
            <div className="lg:col-span-2 space-y-4">
              <div className="text-2xl text-blue-600 font-extrabold tracking-[-0.5px]">
                Mesitra
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
                Ekosistem platform sewa mesin &amp; alat produksi terverifikasi pertama di Indonesia untuk memberdayakan UMKM naik kelas secara efisien dan aman.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Terverifikasi KYC, Escrow Protected &amp; BAST Digital</span>
              </div>
            </div>

            {/* Col 2: Navigasi Cepat */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Navigasi Cepat
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <button
                    onClick={() => scrollToSection('keunggulan')}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Fitur &amp; Keunggulan
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('cara-kerja')}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Cara Kerja Platform
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('kategori-alat')}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Kategori Alat Usaha
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('keamanan-escrow')}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Keamanan Rekening Escrow
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Peran Akun */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Peran Pengguna
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <button
                    onClick={handleRegisterPenyewaClick}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Daftar Penyewa UMKM
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleRegisterPemilikClick}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Daftarkan Alat Mesin
                  </button>
                </li>
                <li>
                  {isAdmin ? (
                    <button
                      onClick={() => navigate('/admin/kyc')}
                      className="text-blue-600 font-bold hover:underline transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Kembali ke Mesitra HQ</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLoginClick('penyewa')}
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      Masuk ke Akun
                    </button>
                  )}
                </li>
                <li>
                  <button
                    onClick={handleCatalogClick}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Katalog Mesin Demo
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Keamanan & Legalitas */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Keamanan &amp; Bantuan
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>
                  <span className="text-slate-700 font-medium">Sistem Escrow Proteksi</span>
                </li>
                <li>
                  <span className="text-slate-700 font-medium">Standar BAST Digital</span>
                </li>
                <li>
                  <span className="text-slate-700 font-medium">Syarat &amp; Ketentuan</span>
                </li>
                <li>
                  <span className="text-slate-700 font-medium">Kebijakan Privasi</span>
                </li>
                <li className="pt-1 text-slate-500">
                  Email: support@mesitra.id
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 Mesitra Indonesia. Seluruh hak cipta dilindungi undang-undang.</p>
            <div className="flex items-center gap-4">
              <span>Jakarta, Indonesia</span>
              <span>•</span>
              <span>Platform Ekosistem UMKM</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
