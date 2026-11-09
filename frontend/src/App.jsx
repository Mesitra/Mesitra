import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import RegisterPenyewaAlat from './components/registerPenyewaAlat'
import RegisterPemilikAlat from './components/registerPemilikAlat/RegisterPemilikAlat'
import BerandaSewa from './components/berandaPenyewa/BerandaSewa'
import DetailAlat from './components/detailAlat/DetailAlat'
import HalamanCheckoutSewa from './components/detailAlat/HalamanCheckoutSewa'
import Pesan from './pages/Pesan'
import PesananSaya from './pages/PesananSaya'
import KembalikanAlatWizard from './components/kembalikanAlat/KembalikanAlatWizard'
import DompetPage from './pages/DompetPage'
import ProfilSaya from './pages/ProfilSaya'
import AdminAuthWrapper from './components/adminAuth/AdminAuthWrapper'
import AdminDashboardPlaceholder from './components/adminAuth/AdminDashboardPlaceholder'
import AdminDetailPengajuan from './components/adminDashboard/AdminDetailPengajuan'
import AdminProtectedRoute from './components/adminAuth/AdminProtectedRoute'
import AdminSengketa from './pages/admin/AdminSengketa'
import AdminModerasi from './pages/admin/AdminModerasi'
import AdminPencairanDana from './components/adminDashboard/AdminPencairanDana'
import AdminManajemenTim from './pages/admin/AdminManajemenTim'
import ManajemenPengguna from './pages/admin/ManajemenPengguna'
import AdminRoute from './components/auth/AdminRoute'
import AdminLayout from './layouts/AdminLayout'
import KycDashboard from './pages/admin/KycDashboard'
import UserProtectedRoute from './components/common/UserProtectedRoute'
import PemilikProtectedRoute from './components/common/PemilikProtectedRoute'
import CheckoutWizard from './components/checkout/CheckoutWizard'
import CheckoutStep3 from './components/checkout/CheckoutStep3'
import OwnerDashboard from './pages/OwnerDashboard'
import { logoutUser, clearUserSession, getUserToken } from './lib/userSession'
import { hasAdminSession } from './components/adminAuth/adminSession'
import NotificationBell from './components/common/NotificationBell'
import {
  Building2,
  KeyRound,
  TrendingUp,
  Users,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  DollarSign,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Star,
  Factory,
  Layers
} from 'lucide-react'

const initialRentals = [
  {
    id: 1,
    title: 'Mesin Espresso La Marzocco Linea Mini 1-Group',
    category: 'Mesin Kopi',
    price: 'Rp 450.000',
    period: '/hari',
    status: 'Tersedia',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tenant: 'Belum Tersewa',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=600&q=80',
    tags: ['Daya 1820W', 'Rotary Pump', 'Deposit Rp 2jt']
  },
  {
    id: 2,
    title: 'Mesin Sealing Kemasan Otomatis Continuous Band',
    category: 'Packaging',
    price: 'Rp 175.000',
    period: '/hari',
    status: 'Disewa',
    statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
    tenant: 'Kripik Bu Sari (s/d 22 Okt)',
    rating: '5.0',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    tags: ['Daya 500W', 'Kecepatan Tinggi', 'Solid Ink Coder']
  },
  {
    id: 3,
    title: 'Mesin Jahit Jarum 1 High Speed Industri Jack F4',
    category: 'Konveksi',
    price: 'Rp 65.000',
    period: '/hari',
    status: 'Tersedia',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tenant: 'Belum Tersewa',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1528458876885-5b6eacdd3671?auto=format&fit=crop&w=600&q=80',
    tags: ['Hemat Listrik 70%', 'Direct Drive', 'Lampu LED']
  },
  {
    id: 4,
    title: 'Deck Oven Gas 1 Deck 2 Loyang Crown Horeca',
    category: 'Bakery',
    price: 'Rp 220.000',
    period: '/hari',
    status: 'Tersedia',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tenant: 'Belum Tersewa',
    rating: '4.95',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    tags: ['Gas LPG + Listrik 60W', 'Digital Timer', 'Loyang 40x60']
  }
]

/**
 * Route Guard untuk rute otentikasi publik (/login, /register/*).
 * Jika Admin sedang memiliki sesi aktif di browser, langsung dialihkan
 * ke Dashboard HQ agar tidak terjadi kebingungan atau session desync.
 */
function PublicAuthGuard({ children }) {
  if (hasAdminSession()) {
    return <Navigate to="/admin/kyc" replace />
  }
  return children
}

export default function App() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Keamanan Navigasi Browser: Bila pengguna menekan tombol Back bawaan desktop browser
  // mundur hingga ke halaman Login atau Landing page ('/login', '/masuk', '/'),
  // otomatis bersihkan sesi agar tidak dapat kembali masuk ke area akun tanpa autentikasi ulang.
  // Navigasi internal di dalam halaman website (seperti tombol back antar-halaman) tetap menjaga sesi aktif.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      // Hanya bersihkan sesi bila tombol back bawaan browser mundur ke halaman login/landing
      if (path === '/login' || path === '/masuk' || path === '/') {
        const token = getUserToken()
        if (token) {
          clearUserSession()
          setCurrentUser(null)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const categories = ['Semua', 'Mesin Kopi', 'Packaging', 'Konveksi', 'Bakery']

  const filteredRentals = initialRentals.filter((item) => {
    const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    const normalizedRole = String(user?.role || '').toUpperCase()
    if (normalizedRole === 'ADMIN') {
      showToast('Selamat datang Super Administrator HQ!')
      navigate('/admin/kyc', { replace: true })
      return
    }
    showToast(`Selamat datang! Anda masuk sebagai ${normalizedRole === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa UMKM'}`)
    if (normalizedRole === 'PEMILIK') {
      navigate('/dashboard-pemilik', { replace: true })
    } else {
      navigate('/beranda-sewa', { replace: true })
    }
  }

  const handleRegisterPenyewaFinish = (newUser) => {
    handleLoginSuccess({
      email: newUser?.email,
      role: 'PENYEWA',
      name: newUser?.fullName || newUser?.businessName || 'Penyewa UMKM'
    })
  }

  const handleRegisterPemilikFinish = (newUser) => {
    handleLoginSuccess({
      email: newUser?.email,
      role: 'PEMILIK',
      name: newUser?.fullName || 'Pemilik Alat'
    })
  }


  return (
    <div className="relative min-h-screen">
      <Toast message={toastMessage} />

      <Routes>
        {/* Halaman Landing / Beranda */}
        <Route
          path="/"
          element={
            <LandingPage
              onNavigateLogin={(opts) => {
                if (opts && (opts.state || opts.defaultRole)) {
                  navigate('/login', { state: opts.state || opts })
                } else {
                  navigate('/login', { state: { defaultRole: 'penyewa' } })
                }
              }}
              onNavigateRegisterPenyewa={() => navigate('/register/penyewa')}
              onNavigateRegisterPemilik={() => navigate('/register/pemilik')}
              onNavigateCatalog={() => navigate('/dashboard')}
            />
          }
        />

        {/* Halaman Autentikasi / Login */}
        <Route
          path="/login"
          element={
            <PublicAuthGuard>
              <AuthPage
                onLoginSuccess={handleLoginSuccess}
                onBackToLanding={() => navigate('/')}
                onNavigateRegister={(selectedRole) => {
                  if (selectedRole === 'pemilik') {
                    navigate('/register/pemilik')
                  } else {
                    navigate('/register/penyewa')
                  }
                }}
              />
            </PublicAuthGuard>
          }
        />

        {/* Form Register Multi-step: Penyewa Alat */}
        <Route
          path="/register/penyewa"
          element={
            <PublicAuthGuard>
              <RegisterPenyewaAlat
                onNavigateLogin={() => navigate('/login')}
                onBackToLogin={() => navigate('/login')}
                onBackToHome={() => navigate('/')}
                onRegisterSuccess={handleRegisterPenyewaFinish}
                onFinish={handleRegisterPenyewaFinish}
              />
            </PublicAuthGuard>
          }
        />

        {/* Form Register Multi-step: Pemilik Alat */}
        <Route
          path="/register/pemilik"
          element={
            <PublicAuthGuard>
              <RegisterPemilikAlat
                onBackToLogin={() => navigate('/login')}
                onBackToHome={() => navigate('/')}
                onFinish={handleRegisterPemilikFinish}
              />
            </PublicAuthGuard>
          }
        />

        {/* Dashboard Demo / Portal Katalog MyRent */}
        <Route
          path="/dashboard"
          element={
            <DashboardView
              currentUser={currentUser}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              filteredRentals={filteredRentals}
              categories={categories}
              showToast={showToast}
              onNavigateHome={() => navigate('/')}
              onNavigateLogin={() => navigate('/login')}
              onNavigateBerandaSewa={() => navigate('/beranda-sewa')}
              onNavigateDetailAlat={() => navigate('/detail-alat')}
            />
          }
        />

        {/* Beranda Sewa Penyewa (Exported Design)
            Hanya penyewa yang sudah login (role PENYEWA) yang boleh membuka katalog. */}
        <Route
          path="/beranda-sewa"
          element={
            <UserProtectedRoute>
              <BerandaSewa
                onSelectProduct={(product, dateRange) => {
                  navigate(`/alat/${product.id}`, { state: { dateRange } })
                }}
                onNavigateHome={() => navigate('/beranda-sewa')}
              />
            </UserProtectedRoute>
          }
        />

        {/* Detail Alat — Jalur rute resmi /alat/:id dan alias /detail-alat/:id */}
        <Route
          path="/alat/:id"
          element={
            <UserProtectedRoute>
              <DetailAlat
                onBack={() => navigate('/beranda-sewa')}
                onNavigateHome={() => navigate('/beranda-sewa')}
              />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/detail-alat/:id"
          element={
            <UserProtectedRoute>
              <DetailAlat
                onBack={() => navigate('/beranda-sewa')}
                onNavigateHome={() => navigate('/beranda-sewa')}
              />
            </UserProtectedRoute>
          }
        />

        {/* Halaman Baru Khusus Checkout Sewa Alat (Atur Tanggal, Pengiriman, Rincian Biaya) */}
        <Route
          path="/sewa/:equipmentId"
          element={
            <UserProtectedRoute>
              <HalamanCheckoutSewa />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/alat/:id/sewa"
          element={
            <UserProtectedRoute>
              <HalamanCheckoutSewa />
            </UserProtectedRoute>
          }
        />

        {/* Tanpa ID alat → buka alat demo utama (Mesin Kemasan Vakum Otomatis) */}
        <Route path="/alat" element={<Navigate to="/alat/a1000000-0000-4000-8000-000000000003" replace />} />
        <Route path="/detail-alat" element={<Navigate to="/alat/a1000000-0000-4000-8000-000000000003" replace />} />

        {/* Halaman Chat Fullscreen (/pesan) */}
        <Route
          path="/pesan"
          element={
            <UserProtectedRoute>
              <Pesan />
            </UserProtectedRoute>
          }
        />

        {/* ── Checkout Wizard (3 Langkah) ─────────────────────────────────
            Step 1 & 2 berbagi state wizard di URL nested.
            Step 3 menggunakan orderId setelah order dibuat di Step 2. */}
        <Route
          path="/checkout/:equipmentId"
          element={
            <UserProtectedRoute>
              <CheckoutWizard />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/checkout/:equipmentId/kontrak"
          element={
            <UserProtectedRoute>
              <CheckoutWizard />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/checkout/pembayaran/:orderId"
          element={
            <UserProtectedRoute>
              <CheckoutStep3 />
            </UserProtectedRoute>
          }
        />

        {/* Halaman Pesanan Saya & Riwayat Sewa Penyewa */}
        <Route
          path="/pesanan-saya"
          element={
            <UserProtectedRoute>
              <PesananSaya />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/pesanan-saya/:id/kembalikan"
          element={
            <UserProtectedRoute>
              <KembalikanAlatWizard />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/dompet"
          element={
            <UserProtectedRoute>
              <DompetPage />
            </UserProtectedRoute>
          }
        />

        {/* Halaman Penyesuaian / Edit Profil Penyewa */}
        <Route
          path="/profil"
          element={
            <UserProtectedRoute>
              <ProfilSaya />
            </UserProtectedRoute>
          }
        />
        <Route path="/edit-profil" element={<Navigate to="/profil" replace />} />

        {/* Dashboard Pemilik Placeholder
            Dilindungi `PemilikProtectedRoute`: setelah logout, halaman ini
            tidak bisa dibuka lagi lewat tombol Back browser maupun URL langsung. */}
        <Route
          path="/dashboard-pemilik"
          element={
            <PemilikProtectedRoute>
              <OwnerDashboard />
            </PemilikProtectedRoute>
          }
        />
        <Route
          path="/dashboard-pemilik/alat-saya"
          element={
            <PemilikProtectedRoute>
              <Navigate to="/dashboard-pemilik?tab=alat-saya" replace />
            </PemilikProtectedRoute>
          }
        />

        {/* Admin Login Portal */}
        <Route
          path="/admin/login"
          element={<AdminAuthWrapper onAdminLoginSuccess={handleLoginSuccess} />}
        />

        {/* Redirects Otomatis dari Rute Lama /portal-internal-hq ke Rute /admin Baru */}
        <Route path="/portal-internal-hq" element={<Navigate to="/admin/login" replace />} />
        <Route path="/portal-internal-hq/dashboard" element={<Navigate to="/admin/kyc" replace />} />
        <Route path="/portal-internal-hq/dashboard/pengajuan/:id" element={<Navigate to="/admin/kyc" replace />} />
        <Route path="/portal-internal-hq/mediasi-sengketa" element={<Navigate to="/admin/mediasi-sengketa" replace />} />
        <Route path="/portal-internal-hq/pencairan-dana" element={<Navigate to="/admin/pencairan-dana" replace />} />
        <Route path="/portal-internal-hq/moderasi" element={<Navigate to="/admin/moderasi" replace />} />
        <Route path="/portal-internal-hq/manajemen-pengguna" element={<Navigate to="/admin/manajemen-pengguna" replace />} />
        <Route path="/portal-internal-hq/manajemen-tim" element={<Navigate to="/admin/manajemen-tim" replace />} />
        <Route path="/portal-internal-hq/*" element={<Navigate to="/admin/kyc" replace />} />
        <Route path="/dashboard-admin" element={<Navigate to="/admin/kyc" replace />} />

        {/* Shell Admin Tunggal Berbasis AdminLayout */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="kyc" replace />} />
            <Route path="kyc" element={<KycDashboard />} />
            <Route path="verifikasi" element={<KycDashboard />} />
            <Route path="kyc/pengajuan/:id" element={<AdminDetailPengajuan />} />
            <Route path="dashboard/pengajuan/:id" element={<AdminDetailPengajuan />} />
            <Route path="manajemen-pengguna" element={<ManajemenPengguna />} />
            <Route path="pengguna" element={<ManajemenPengguna />} />
            <Route path="mediasi-sengketa" element={<AdminSengketa />} />
            <Route path="pencairan-dana" element={<AdminPencairanDana />} />
            <Route path="moderasi" element={<AdminModerasi />} />
            <Route path="manajemen-tim" element={<AdminManajemenTim />} />
          </Route>
        </Route>

        {/* Fallback jika route tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function DashboardView({
  currentUser,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  filteredRentals,
  categories,
  showToast,
  onNavigateHome,
  onNavigateLogin,
  onNavigateBerandaSewa,
  onNavigateDetailAlat
}) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-slate-200 py-3.5 transition-all">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-lg text-blue-600 font-extrabold tracking-[-0.3px] select-none hover:opacity-90 transition-opacity cursor-pointer"
              title="Kembali ke Beranda MyRent"
            >
              MyRent
            </button>
            <span className="hidden sm:inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {currentUser?.role === 'pemilik' ? 'Mode Pemilik Alat' : 'Mode Penyewa UMKM'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari mesin kopi, oven, packaging, konveksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-sm rounded-xl pl-10 pr-4 py-2 text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <button
              onClick={() => showToast('Form Tambah Alat siap dikembangkan!')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Pasang Sewa Alat</span>
            </button>

            <button
              onClick={onNavigateBerandaSewa}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
              title="Buka Beranda Sewa (Hasil Konversi HTML)"
            >
              <span>Beranda Sewa</span>
            </button>

            <button
              onClick={onNavigateDetailAlat}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
              title="Buka Detail Alat (Hasil Konversi HTML)"
            >
              <span>Detail Alat</span>
            </button>

            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Kembali ke Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </button>

            {hasAdminSession() ? (
              <button
                onClick={() => navigate('/admin/kyc')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Kembali ke Dashboard Admin HQ"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>MyRent HQ</span>
              </button>
            ) : (
              <button
                onClick={onNavigateLogin}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                title="Kembali ke halaman Auth"
              >
                <span>Auth</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 py-8 space-y-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-800 p-6 sm:p-10 text-white shadow-md">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Platform Sewa Alat Produksi UMKM</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Eksplorasi Katalog Alat Usaha Terverifikasi
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Semua transaksi sewa dilindungi escrow resmi. Filter alat sesuai kebutuhan kapasitas dan daya listrik usaha Anda tanpa biaya tak terduga.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Alat Tersedia</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">42 Mesin</div>
              <div className="text-xs text-emerald-600 mt-1 font-medium">Siap kirim ke lokasi usaha</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Sedang Disewa</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">18 Unit</div>
              <div className="text-xs text-slate-500 mt-1">Okupansi 85% bulan ini</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Penghematan Modal</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">Rp 128.5jt</div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Rata-rata 78% vs beli baru</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Penyewa Terverifikasi</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">120 UMKM</div>
              <div className="flex items-center gap-1 text-xs text-blue-600 mt-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% KYC & NIB Valid</span>
              </div>
            </div>
          </div>
        </div>

        {/* Catalog */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Katalog Alat Produksi</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Pilih peralatan sesuai skala produksi harian atau bulanan
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-5">
            {filteredRentals.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-400 hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${item.statusColor}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-600 shadow-xs flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{item.rating}</span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                      {item.category}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {item.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Tarif Sewa</div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums">
                        {item.price}
                        <span className="text-xs font-normal text-slate-500">{item.period}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => showToast(`Mengajukan sewa untuk: ${item.title}`)}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                      title="Sewa Alat"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 MyRent. Platform Sewa Alat Terverifikasi untuk UMKM Indonesia.</p>
      </footer>
    </div>
  )
}

function Toast({ message }) {
  if (!message) return null
  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-blue-400/30 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300">
      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
      <span>{message}</span>
    </div>
  )
}

function DashboardPemilikPlaceholder({ onLogout }) {
  const navigate = useNavigate()

  // Logout permanen:
  // 1. `logoutUser` menghapus token + data user dari localStorage.
  // 2. Navigasi ke /login memakai `replace: true` (di dalam logoutUser) agar
  //    halaman dashboard tidak bisa dibuka lagi lewat tombol Back browser.
  const handleLogout = () => {
    if (onLogout) onLogout()
    logoutUser(navigate)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 font-sans">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-slate-200 py-3.5">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-lg text-blue-600 font-extrabold tracking-[-0.3px] cursor-pointer"
            >
              MyRent
            </button>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Mode Pemilik Alat
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-8 shadow-md shadow-slate-200/50 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <Factory className="w-8 h-8 text-blue-600" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Pemilik
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Dashboard Pemilik dalam tahap pengembangan
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/beranda-sewa')}
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Lihat Katalog Sewa Alat
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 MyRent. Platform Sewa Alat Terverifikasi untuk UMKM Indonesia.
      </footer>
    </div>
  )
}

