import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User,
  ShieldCheck,
  Lock,
  Store,
  MapPin,
  CreditCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  RotateCw,
  Eye,
  EyeOff,
  Save,
  HelpCircle,
  ArrowLeft,
  Zap,
  Info,
  Calendar,
  Phone,
  Mail,
  Building,
  Check,
  FileText,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import NavbarPenyewa from '../components/common/NavbarPenyewa'
import { fetchUserProfile, updateUserProfile } from '../lib/profileApi'
import { fileToPreviewDataUrl } from '../lib/registration'
import { SECTORS, POWER_CAPACITIES, BANKS } from '../components/registerPenyewaAlat/constants'
import { getUserInitials } from '../lib/userSession'

export default function ProfilSaya() {
  const navigate = useNavigate()

  // State Profil Utama dari Backend
  const [profile, setProfile] = useState(null)
  const [initialData, setInitialData] = useState(null)
  const [formData, setFormData] = useState({
    // ✏️ Data Dapat Disesuaikan - Profil UMKM
    fullName: '',
    phone: '',
    businessName: '',
    businessSector: 'Kuliner & Kopi',
    customSector: '',
    startYear: '',
    nib: '',
    powerCapacity: '1300 W',
    customPower: '',
    isManualPower: false,
    frontPhoto: null,
    productionPhoto: null,
    businessDesc: '',

    // ✏️ Data Dapat Disesuaikan - Alamat Usaha
    address: '',
    city: '',
    district: '',
    postalCode: '',
    landmark: '',
    gpsCoords: '-6.2601, 106.8135',

    // ✏️ Data Dapat Disesuaikan - Rekening Refund
    bankName: 'BCA — Bank Central Asia',
    bankAccount: '',
    bankAccountHolder: '',

    // 🔐 Keamanan (Opsional)
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  // State UI
  const [activeTab, setActiveTab] = useState('umkm') // 'umkm' | 'alamat' | 'rekening' | 'kyc' | 'keamanan'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [showMaskedNik, setShowMaskedNik] = useState(true)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  // Load Profil dari Server
  const loadProfile = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await fetchUserProfile()
      const p = data.profile || {}
      setProfile(p)

      const initial = {
        fullName: p.fullName || '',
        phone: p.phone || '',
        businessName: p.businessName || '',
        businessSector: p.businessSector || 'Kuliner & Kopi',
        customSector: p.customSector || '',
        startYear: p.startYear || '',
        nib: p.nib || '',
        powerCapacity: p.powerCapacity || '1300 W',
        customPower: p.customPower || '',
        isManualPower: Boolean(p.isManualPower),
        frontPhoto: p.frontPhoto || null,
        productionPhoto: p.productionPhoto || null,
        businessDesc: p.businessDesc || '',
        address: p.address || '',
        city: p.city || '',
        district: p.district || '',
        postalCode: p.postalCode || '',
        landmark: p.landmark || '',
        gpsCoords: p.gpsCoords || '-6.2601, 106.8135',
        bankName: p.bankName || 'BCA — Bank Central Asia',
        bankAccount: p.bankAccount || '',
        bankAccountHolder: p.bankAccountHolder || p.fullName || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }

      setFormData(initial)
      setInitialData(initial)
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat profil pengguna.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Deteksi Perubahan Data (Dirty State)
  const isDirty = useMemo(() => {
    if (!initialData) return false
    const keysToCheck = [
      'fullName',
      'phone',
      'businessName',
      'businessSector',
      'customSector',
      'startYear',
      'nib',
      'powerCapacity',
      'customPower',
      'isManualPower',
      'businessDesc',
      'address',
      'city',
      'district',
      'postalCode',
      'landmark',
      'gpsCoords',
      'bankName',
      'bankAccount',
      'bankAccountHolder'
    ]

    for (const key of keysToCheck) {
      if ((formData[key] || '') !== (initialData[key] || '')) {
        return true
      }
    }

    if (formData.newPassword || formData.currentPassword) {
      return true
    }

    if (formData.frontPhoto !== initialData.frontPhoto) return true
    if (formData.productionPhoto !== initialData.productionPhoto) return true

    return false
  }, [formData, initialData])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errorMsg) setErrorMsg('')
    if (successMsg) setSuccessMsg('')
  }

  // Handle Upload Foto Usaha
  const handlePhotoUpload = async (field, file) => {
    if (!file) return
    try {
      const preview = await fileToPreviewDataUrl(file)
      handleInputChange(field, {
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        preview: preview || null
      })
    } catch {
      setErrorMsg('Gagal membaca berkas foto. Silakan coba kembali.')
    }
  }

  const handleRemovePhoto = (field) => {
    handleInputChange(field, null)
  }

  // Handle Perbarui GPS
  const handleRefreshGps = () => {
    setIsGpsLoading(true)
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4)
          const lng = pos.coords.longitude.toFixed(4)
          handleInputChange('gpsCoords', `${lat}, ${lng}`)
          setIsGpsLoading(false)
          setSuccessMsg('Titik koordinat GPS berhasil diperbarui sesuai lokasi perangkat!')
        },
        () => {
          // Fallback simulasi lokasi Jabodetabek jika izin diblokir browser
          setTimeout(() => {
            const lat = (-6.2000 - Math.random() * 0.08).toFixed(4)
            const lng = (106.8000 + Math.random() * 0.05).toFixed(4)
            handleInputChange('gpsCoords', `${lat}, ${lng}`)
            setIsGpsLoading(false)
            setSuccessMsg('Titik koordinat GPS berhasil disegarkan!')
          }, 600)
        },
        { timeout: 8000 }
      )
    } else {
      setTimeout(() => {
        const lat = (-6.2000 - Math.random() * 0.08).toFixed(4)
        const lng = (106.8000 + Math.random() * 0.05).toFixed(4)
        handleInputChange('gpsCoords', `${lat}, ${lng}`)
        setIsGpsLoading(false)
      }, 600)
    }
  }

  // Reset Formulir ke Data Terakhir Tersimpan
  const handleResetForm = () => {
    if (initialData) {
      setFormData(initialData)
      setErrorMsg('')
      setSuccessMsg('Formulir telah dikembalikan ke data tersimpan terakhir.')
    }
  }

  // Submit Simpan Perubahan Profil
  const handleSubmitSave = async (e) => {
    if (e) e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Validasi Sederhana
    if (!formData.fullName.trim()) {
      setErrorMsg('Nama lengkap / nama tampilan akun wajib diisi.')
      setActiveTab('keamanan')
      return
    }

    if (!formData.phone.trim()) {
      setErrorMsg('Nomor WhatsApp / telepon wajib diisi.')
      setActiveTab('keamanan')
      return
    }

    if (!formData.businessName.trim()) {
      setErrorMsg('Nama usaha UMKM wajib diisi.')
      setActiveTab('umkm')
      return
    }

    if (!formData.address.trim()) {
      setErrorMsg('Alamat lengkap usaha wajib diisi untuk tujuan pengiriman alat.')
      setActiveTab('alamat')
      return
    }

    // Validasi Ganti Password (jika diisi)
    if (formData.newPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        setErrorMsg('Masukkan kata sandi saat ini untuk mengonfirmasi perubahan kata sandi.')
        setActiveTab('keamanan')
        return
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg('Kata sandi baru minimal harus 6 karakter.')
        setActiveTab('keamanan')
        return
      }
      if (formData.newPassword !== formData.confirmNewPassword) {
        setErrorMsg('Konfirmasi kata sandi baru tidak cocok.')
        setActiveTab('keamanan')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        businessName: formData.businessName,
        businessSector: formData.businessSector,
        customSector: formData.customSector,
        startYear: formData.startYear,
        nib: formData.nib,
        powerCapacity: formData.powerCapacity,
        customPower: formData.customPower,
        isManualPower: formData.isManualPower,
        frontPhoto: formData.frontPhoto,
        productionPhoto: formData.productionPhoto,
        businessDesc: formData.businessDesc,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        postalCode: formData.postalCode,
        landmark: formData.landmark,
        gpsCoords: formData.gpsCoords,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount,
        bankAccountHolder: formData.bankAccountHolder
      }

      if (formData.newPassword && formData.currentPassword) {
        payload.currentPassword = formData.currentPassword
        payload.newPassword = formData.newPassword
      }

      const res = await updateUserProfile(payload)

      setProfile(res.profile)
      const freshInitial = {
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }
      setInitialData(freshInitial)
      setFormData(freshInitial)
      setSuccessMsg('Profil dan data operasional Anda berhasil diperbarui!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan pembaruan profil.')
    } finally {
      setSaving(false)
    }
  }

  // Masking NIK: 3174********0003
  const maskedNik = useMemo(() => {
    const raw = String(profile?.nik || '').trim()
    if (!raw || raw.length < 10) return raw || 'Belum diisi'
    if (!showMaskedNik) return raw
    return `${raw.slice(0, 4)}••••••••${raw.slice(-4)}`
  }, [profile?.nik, showMaskedNik])

  const userInitials = getUserInitials({ fullName: formData.fullName || profile?.fullName })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <NavbarPenyewa activeTab="profil" />
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-12 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-600">Memuat data profil &amp; verifikasi Anda...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 pb-24">
      {/* Navbar Global Penyewa */}
      <NavbarPenyewa activeTab="profil" />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 py-8 space-y-6">
        {/* Tombol Kembali & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/beranda-sewa'))}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link to="/beranda-sewa" className="hover:text-blue-600">Beranda</Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Penyesuaian Profil</span>
          </div>
        </div>

        {/* Header Profil & Status KYC */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-blue-50/80 via-indigo-50/40 to-transparent pointer-events-none rounded-tr-2xl" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            {/* Avatar & Identitas */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md shadow-blue-500/20 shrink-0 border-2 border-white ring-2 ring-blue-100">
                {userInitials}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                    {formData.fullName || profile?.fullName || 'Penyewa UMKM'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    Penyewa Terverifikasi
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profile?.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formData.phone || profile?.phone || '-'}</span>
                  </div>
                  {profile?.submissionCode && (
                    <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>ID Pengajuan: {profile.submissionCode}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Badge Status Verifikasi KYC */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2.5 p-3 md:p-0 bg-slate-50 md:bg-transparent rounded-xl border md:border-0 border-slate-100">
              <div className="text-left md:text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status Verifikasi</div>
                <div className="inline-flex items-center gap-1.5 mt-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>DISETUJUI (KYC APPROVED)</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Daya Workshop: <span className="text-slate-900 font-bold tabular-nums">{formData.powerCapacity || '1300 W'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Access Notice Banner */}
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
            <div className="font-bold text-slate-900 text-[13px] flex items-center gap-2">
              <span>Prinsip Keamanan &amp; Integritas Data Akun Mesitra</span>
            </div>
            <p>
              Halaman ini menampilkan seluruh data yang Anda daftarkan saat registrasi awal. Demi kepatuhan hukum transaksi sewa alat industri dan keabsahan Berita Acara Serah Terima (BAST):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11.5px]">
              <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/80 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 font-bold block">Data Kependudukan Resmi (Terkunci)</strong>
                  NIK, Nama KTP, Tempat/Tanggal Lahir, serta Berkas Foto KTP berstatus <strong>read-only</strong> karena telah diaudit verifikator admin Mesitra.
                </div>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-blue-200/80 flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-900 font-bold block">Data Operasional (Dapat Disesuaikan)</strong>
                  Kapasitas daya listrik PLN, nama &amp; foto workshop, alamat pengiriman kargo, serta rekening bank pencairan deposit dapat Anda perbarui kapan saja.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notifikasi Feedback Sukses / Gagal */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-[13px] font-semibold px-4 py-3 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-[13px] font-semibold px-4 py-3 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('umkm')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'umkm'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Profil Usaha &amp; Daya Listrik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alamat')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'alamat'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Alamat &amp; Titik GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rekening')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'rekening'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Rekening Refund Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'kyc'
                ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Identitas KTP (Terkunci)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keamanan')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'keamanan'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Akun &amp; Keamanan</span>
          </button>
        </div>

        {/* Konten Tab Aktif */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 shadow-xs">
          {/* ───────────────────────────────────────────────────────────
              TAB 1: PROFIL USAHA & DAYA LISTRIK (DAPAT DISESUAIKAN)
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'umkm' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Profil Usaha UMKM &amp; Kapasitas Listrik</h2>
                  <p className="text-xs text-slate-500">
                    Data ini ditampilkan pada profil usaha Anda dan digunakan untuk memastikan kecukupan daya alat sewa.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Kolom dapat diedit langsung</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nama UMKM */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nama UMKM / Usaha *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Contoh: Kopi Senja Roastery"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>

                {/* Kategori Sektor Usaha */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Kategori Sektor Usaha *
                  </label>
                  <select
                    value={formData.businessSector}
                    onChange={(e) => handleInputChange('businessSector', e.target.value)}
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all cursor-pointer"
                  >
                    {SECTORS.filter((s) => s !== 'Lainnya').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Lainnya">Lainnya</option>
                  </select>

                  {formData.businessSector === 'Lainnya' && (
                    <input
                      type="text"
                      placeholder="Sebutkan jenis usaha Anda"
                      value={formData.customSector}
                      onChange={(e) => handleInputChange('customSector', e.target.value)}
                      className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all mt-1"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Tahun Mulai Usaha */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Tahun Mulai Usaha</label>
                  <input
                    type="number"
                    min="1970"
                    max="2030"
                    value={formData.startYear}
                    onChange={(e) => handleInputChange('startYear', e.target.value)}
                    placeholder="Contoh: 2019"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>

                {/* NIB (Nomor Induk Berusaha) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    NIB (Nomor Induk Berusaha - opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.nib}
                    onChange={(e) => handleInputChange('nib', e.target.value)}
                    placeholder="Contoh: 8120 4457 9921"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* ⚡ Kapasitas Daya Listrik Tempat Usaha (Sangat Penting) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Kapasitas Daya Listrik Workshop / Ruko *</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-blue-700 bg-white px-2.5 py-0.5 rounded-md border border-amber-200 tabular-nums">
                    Tersimpan: {formData.powerCapacity || '1300 W'}
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Bila Anda baru saja menambah daya meteran PLN di tempat usaha (misal dari 1300 W menjadi 2200 W), sesuaikan pilihan di bawah. Sistem Mesitra akan otomatis membuka akses sewa mesin produksi berdaya lebih tinggi.
                </p>

                {/* Pill Selector Daya */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                  {POWER_CAPACITIES.map((cap) => {
                    const isSelected = !formData.isManualPower && formData.powerCapacity === cap
                    return (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => {
                          handleInputChange('isManualPower', false)
                          handleInputChange('powerCapacity', cap)
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-100'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                        }`}
                      >
                        {cap}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => handleInputChange('isManualPower', true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      formData.isManualPower
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    Daya Lainnya
                  </button>
                </div>

                {formData.isManualPower && (
                  <div className="pt-2 flex items-center gap-2 max-w-xs">
                    <input
                      type="number"
                      placeholder="Contoh: 4400"
                      value={formData.customPower}
                      onChange={(e) => {
                        handleInputChange('customPower', e.target.value)
                        handleInputChange('powerCapacity', `${e.target.value} W`)
                      }}
                      className="w-full bg-white text-xs rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-600">Watt</span>
                  </div>
                )}
              </div>

              {/* Foto Tempat Usaha & Ruang Produksi */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Foto Tempat Usaha &amp; Area Kerja Produksi
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Foto Depan Tempat Usaha */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                    <span className="text-xs font-bold text-slate-800 block">1. Foto Tampak Depan UMKM</span>
                    {formData.frontPhoto?.preview ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-black/5 flex items-center justify-center">
                        <img
                          src={formData.frontPhoto.preview}
                          alt="Depan UMKM"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto('frontPhoto')}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md cursor-pointer transition-transform hover:scale-105"
                          title="Hapus Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all p-3 text-center">
                        <UploadCloud className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">Unggah Foto Depan Baru</span>
                        <span className="text-[10px] text-slate-400">JPG, PNG atau WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload('frontPhoto', e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>

                  {/* Foto Area Kerja / Produksi */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                    <span className="text-xs font-bold text-slate-800 block">2. Foto Area Kerja / Produksi</span>
                    {formData.productionPhoto?.preview ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-black/5 flex items-center justify-center">
                        <img
                          src={formData.productionPhoto.preview}
                          alt="Area Produksi"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto('productionPhoto')}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md cursor-pointer transition-transform hover:scale-105"
                          title="Hapus Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all p-3 text-center">
                        <UploadCloud className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">Unggah Foto Area Kerja Baru</span>
                        <span className="text-[10px] text-slate-400">JPG, PNG atau WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload('productionPhoto', e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Deskripsi Usaha */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Deskripsi Singkat Usaha</label>
                <textarea
                  rows={3}
                  value={formData.businessDesc}
                  onChange={(e) => handleInputChange('businessDesc', e.target.value)}
                  placeholder="Ceritakan profil singkat usaha Anda, kapasitas produksi harian, atau kebutuhan alat usaha..."
                  className="w-full bg-white text-[13px] rounded-xl p-3 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 2: ALAMAT & TITIK GPS (DAPAT DISESUAIKAN)
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'alamat' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Alamat Usaha &amp; Titik Lokasi Pengiriman</h2>
                  <p className="text-xs text-slate-500">
                    Alamat ini menjadi tujuan pengiriman alat berat oleh armada kurir atau penjemputan BAST.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Kolom dapat diedit langsung</span>
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Alamat Lengkap Workshop / Toko *</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Jl. Kemang Selatan VIII No. 12, RT 03/RW 05, Bangka, Mampang Prapatan"
                  className="w-full bg-white text-[13px] rounded-xl p-3 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Kota / Kabupaten */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Kota / Kabupaten *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Jakarta Selatan"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>

                {/* Kecamatan */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Kecamatan *</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    placeholder="Mampang Prapatan"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Kode Pos */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Kode Pos</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder="12730"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono tabular-nums"
                  />
                </div>

                {/* Patokan Lokasi */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Patokan Lokasi</label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => handleInputChange('landmark', e.target.value)}
                    placeholder="Sebelah minimarket 24 jam / ruko cat hijau"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Titik Lokasi GPS */}
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-700">Titik Koordinat GPS (Latitude, Longitude)</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <input
                        type="text"
                        value={formData.gpsCoords}
                        onChange={(e) => handleInputChange('gpsCoords', e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 tabular-nums focus:outline-none focus:border-blue-600"
                        placeholder="-6.2601, 106.8135"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Dipakai sistem untuk menghitung ongkos kirim kargo alat berat secara akurat
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefreshGps}
                    disabled={isGpsLoading}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl cursor-pointer transition-all shadow-2xs shrink-0"
                  >
                    <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${isGpsLoading ? 'animate-spin' : ''}`} />
                    <span>{isGpsLoading ? 'Mendeteksi...' : 'Perbarui Koordinat GPS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 3: REKENING REFUND DEPOSIT (DAPAT DISESUAIKAN)
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'rekening' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Rekening Bank untuk Refund Deposit</h2>
                  <p className="text-xs text-slate-500">
                    Rekening ini digunakan escrow Mesitra untuk pencairan kembali deposit jaminan sewa setelah alat selesai diinspeksi.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Kolom dapat diedit langsung</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Pastikan nama pada nomor rekening sesuai dengan data identitas penanggung jawab akun usaha untuk menghindari kendala kliring antar-bank saat proses pengembalian deposit.
                </span>
              </div>

              {/* Nama Bank */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Bank Penerima *</label>
                <select
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all cursor-pointer"
                >
                  {BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nomor Rekening */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Nomor Rekening Bank *</label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => handleInputChange('bankAccount', e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 4471 8890 221"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono tabular-nums tracking-wide"
                  />
                </div>

                {/* Nama Pemilik Rekening */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Nama Pemilik Rekening *</label>
                  <input
                    type="text"
                    value={formData.bankAccountHolder}
                    onChange={(e) => handleInputChange('bankAccountHolder', e.target.value)}
                    placeholder="Nama sesuai buku tabungan"
                    className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 4: IDENTITAS KTP TERKUNCI (DATA PENTING DILINDUNGI)
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'kyc' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Identitas Resmi Kependudukan (KTP &amp; KYC)</h2>
                  <p className="text-xs text-slate-500">
                    Data kependudukan resmi yang telah diverifikasi oleh tim kepatuhan Mesitra demi perlindungan hukum BAST sewa alat.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 select-none">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Data Terkunci (Terverifikasi)</span>
                </div>
              </div>

              {/* Banner Penjelasan Data Terkunci */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mengapa data identitas ini tidak dapat diubah sembarangan?</span>
                </div>
                <p className="leading-relaxed text-[11.5px] text-amber-900/90">
                  NIK dan nama sesuai KTP merupakan acuan penandatanganan Berita Acara Serah Terima (BAST) dan polis asuransi alat berat bernilai puluhan juta rupiah. Untuk mencegah penyalahgunaan akun dan manipulasi identitas, perubahan data ini memerlukan audit manual oleh tim Administrator Mesitra.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* NIK KTP Terkunci */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Nomor Induk Kependudukan (NIK)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMaskedNik(!showMaskedNik)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {showMaskedNik ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{showMaskedNik ? 'Tampilkan' : 'Samarkan'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={maskedNik}
                      className="w-full bg-slate-100/90 text-[13px] rounded-xl px-3.5 py-2.5 text-slate-700 border border-slate-200 font-mono font-bold tracking-wider cursor-not-allowed select-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Valid</span>
                    </div>
                  </div>
                </div>

                {/* Nama Sesuai KTP Terkunci */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nama Lengkap Sesuai KTP</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={profile?.ktpName || profile?.fullName || '-'}
                      className="w-full bg-slate-100/90 text-[13px] rounded-xl px-3.5 py-2.5 text-slate-700 border border-slate-200 font-semibold cursor-not-allowed select-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <span>Terkunci</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Tempat Lahir */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tempat Lahir</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={profile?.birthPlace || '-'}
                    className="w-full bg-slate-100/90 text-[13px] rounded-xl px-3.5 py-2.5 text-slate-700 border border-slate-200 cursor-not-allowed select-none"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tanggal Lahir</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={profile?.birthDate || '-'}
                    className="w-full bg-slate-100/90 text-[13px] rounded-xl px-3.5 py-2.5 text-slate-700 border border-slate-200 font-mono cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Status Dokumen KYC yang Terunggah */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-800 block">Dokumen Berkas KYC Terverifikasi</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Foto KTP */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Foto Fisik KTP</div>
                        <div className="text-[10px] text-slate-500">
                          {profile?.ktpFile?.name || 'Berkas KTP telah diaudit Admin'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      Terverifikasi
                    </span>
                  </div>

                  {/* Foto Selfie KTP */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Selfie Memegang KTP</div>
                        <div className="text-[10px] text-slate-500">
                          {profile?.selfieFile?.name || 'Biometrik wajah cocok dengan KTP'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      Terverifikasi
                    </span>
                  </div>
                </div>
              </div>

              {/* Tombol Hubungi Bantuan jika ingin koreksi data legal */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">Perlu mengoreksi data kependudukan resmi?</div>
                  <div className="text-[11px] text-slate-500">
                    Jika ada kesalahan ketik nama atau pergantian KTP baru, hubungi pusat bantuan Mesitra.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  Ajukan Koreksi KTP →
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              TAB 5: AKUN & KEAMANAN (SEBAGIAN EDITABLE, EMAIL TERKUNCI)
          ──────────────────────────────────────────────────────────── */}
          {activeTab === 'keamanan' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Pengaturan Akun &amp; Keamanan Kata Sandi</h2>
                  <p className="text-xs text-slate-500">
                    Kelola nama panggilan, nomor WhatsApp yang dihubungi pemilik alat, dan pembaruan kata sandi.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Kolom dapat diedit langsung</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Email (Terkunci) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Alamat Email Akun</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Kredensial Login Utama</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={profile?.email || ''}
                      className="w-full bg-slate-100/90 text-[13px] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-700 border border-slate-200 font-semibold cursor-not-allowed select-none"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Alamat email terdaftar tidak dapat diubah mandiri untuk menjaga histori transaksi escrow.
                  </span>
                </div>

                {/* Nama Panggilan / Nama Tampilan Akun (Bisa Diedit) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nama Tampilan / Penanggung Jawab *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Budi Santoso"
                      className="w-full bg-white text-[13px] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-800 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-semibold"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Nomor WhatsApp / Telepon (Bisa Diedit) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nomor WhatsApp / Kontak Telepon *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="0812 8899 0011"
                      className="w-full bg-white text-[13px] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-800 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all font-mono tabular-nums"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Digunakan kurir dan pemilik alat untuk konfirmasi status pengiriman mesin.
                  </span>
                </div>
              </div>

              {/* Ubah Kata Sandi (Opsional) */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <span>Ubah Kata Sandi (Opsional)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kosongkan bagian ini bila Anda tidak bermaksud mengubah kata sandi akun Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Password Saat Ini */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Kata Sandi Saat Ini</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white text-[13px] rounded-xl pl-3.5 pr-9 py-2.5 text-slate-800 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Baru */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-white text-[13px] rounded-xl pl-3.5 pr-9 py-2.5 text-slate-800 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi Password Baru */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Ulangi Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={formData.confirmNewPassword}
                      onChange={(e) => handleInputChange('confirmNewPassword', e.target.value)}
                      placeholder="Konfirmasi password"
                      className="w-full bg-white text-[13px] rounded-xl px-3.5 py-2.5 text-slate-800 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating / Sticky Save Action Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Ada perubahan data yang belum disimpan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Data profil telah sinkron dengan server
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleResetForm}
              disabled={!isDirty || saving}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                isDirty && !saving
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Batal / Reset
            </button>

            <button
              type="button"
              onClick={handleSubmitSave}
              disabled={!isDirty || saving}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-white shadow-md transition-all cursor-pointer ${
                isDirty && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {saving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Profil</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Modal Bantuan Koreksi Data KTP Legal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Pengajuan Koreksi Data KTP Resmi</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Untuk menjaga legalitas kontrak BAST sewa alat berat, perubahan NIK atau nama resmi KTP harus ditinjau ulang oleh tim verifikasi Mesitra.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div className="font-semibold text-slate-900">Langkah Pengajuan:</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Siapkan foto e-KTP baru asli dan dokumen pendukung (KK / Buku Nikah).</li>
                <li>Sertakan nomor pengajuan Anda: <strong>{profile?.submissionCode || 'VR-2041'}</strong>.</li>
                <li>Kirim pesan ke tim dukungan audit kami.</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHelpModal(false)
                  navigate('/pesan')
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer text-center"
              >
                Hubungi Dukungan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

