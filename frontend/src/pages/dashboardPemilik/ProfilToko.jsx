import React, { useState, useEffect } from 'react'
import {
  Store,
  Check,
  Eye,
  Pencil,
  MapPin,
  Star,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  CreditCard,
  Landmark,
  Percent,
  Bell,
  RefreshCw,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { fetchUserProfile, updateUserProfile } from '../../lib/profileApi'

export default function ProfilToko({ currentUser, onSwitchTab, setToastMessage }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showNpwpModal, setShowNpwpModal] = useState(false)
  const [npwpInput, setNpwpInput] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    storeCategory: 'Kuliner & Kopi',
    whatsappNumber: '',
    address: '',
    city: 'Bandung, Jawa Barat',
    serviceRadius: 15,
    operatingHours: {
      weekdays: { open: '08.00', close: '17.00', closed: false },
      saturday: { open: '09.00', close: '15.00', closed: false },
      sunday: { open: '', close: '', closed: true }
    },
    ktpVerified: true,
    nibVerified: true,
    bankAccountVerified: true,
    npwpVerified: false,
    notifPesananBaru: true,
    notifPengembalianAlat: true,
    notifInspeksiDeposit: false,
    notifRingkasanMingguan: true
  })

  // Real-time metadata dari backend
  const [meta, setMeta] = useState({
    equipmentCount: 0,
    storeRating: { average: 5.0, count: 0 },
    joinYear: new Date().getFullYear(),
    bankAccountDisplay: 'BCA · 4471'
  })

  // Load profil toko dari API saat pertama kali mount
  useEffect(() => {
    let isMounted = true
    async function loadProfile() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchUserProfile()
        if (!isMounted) return

        const tp = res.tenantProfile || res.profile?.tenantProfile || {}
        setFormData({
          storeName: tp.storeName || res.profile?.businessName || currentUser?.fullName || 'Kopi Senja',
          storeDescription:
            tp.storeDescription ||
            res.profile?.businessDesc ||
            'Penyedia mesin kopi komersial, grinder espresso, dan peralatan barista untuk kafe, hotel, dan event.',
          storeCategory: tp.storeCategory || res.profile?.businessSector || 'Kuliner & Kopi',
          whatsappNumber: tp.whatsappNumber || res.profile?.phone || currentUser?.phone || '0812-3456-7890',
          address: tp.address || res.profile?.address || 'Jl. Cilandak Tengah No. 12',
          city: tp.city || res.profile?.city || 'Bandung, Jawa Barat',
          serviceRadius: tp.serviceRadius ?? 15,
          operatingHours: tp.operatingHours || {
            weekdays: { open: '08.00', close: '17.00', closed: false },
            saturday: { open: '09.00', close: '15.00', closed: false },
            sunday: { open: '', close: '', closed: true }
          },
          ktpVerified: tp.ktpVerified ?? true,
          nibVerified: tp.nibVerified ?? true,
          bankAccountVerified: tp.bankAccountVerified ?? true,
          npwpVerified: tp.npwpVerified ?? false,
          notifPesananBaru: tp.notifPesananBaru ?? true,
          notifPengembalianAlat: tp.notifPengembalianAlat ?? true,
          notifInspeksiDeposit: tp.notifInspeksiDeposit ?? false,
          notifRingkasanMingguan: tp.notifRingkasanMingguan ?? true
        })

        // Rekening bank display
        const primaryAcc =
          (res.withdrawalAccounts && res.withdrawalAccounts[0]) ||
          (res.profile?.withdrawalAccounts && res.profile?.withdrawalAccounts[0])
        const bankDisplay = primaryAcc
          ? `${primaryAcc.bankName} · ${primaryAcc.accountNumber.replace(/\s/g, '').slice(-4)}`
          : 'BCA · 4471'

        setMeta({
          equipmentCount: res.equipmentCount ?? res.profile?.equipmentCount ?? 0,
          storeRating: res.storeRating ?? res.profile?.storeRating ?? { average: 5.0, count: 0 },
          joinYear: res.joinYear ?? res.profile?.joinYear ?? new Date().getFullYear(),
          bankAccountDisplay: bankDisplay
        })
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Gagal memuat profil toko')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [currentUser])

  // Hitung kelengkapan KYC (x/4)
  const completedKycCount = [
    formData.ktpVerified,
    formData.nibVerified,
    formData.bankAccountVerified,
    formData.npwpVerified
  ].filter(Boolean).length

  // Ambil inisial 2 huruf untuk logo toko
  const storeInitials = (formData.storeName || 'KS')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'KS'

  // Simpan perubahan ke backend
  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = {
        tenantProfile: formData,
        businessName: formData.storeName,
        businessDesc: formData.storeDescription,
        businessSector: formData.storeCategory,
        phone: formData.whatsappNumber,
        address: formData.address,
        city: formData.city
      }

      await updateUserProfile(payload)
      if (setToastMessage) {
        setToastMessage('Perubahan profil toko berhasil disimpan!')
        setTimeout(() => setToastMessage(''), 3500)
      }
    } catch (err) {
      alert(`Gagal menyimpan: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Lengkapi NPWP Modal Submit
  const handleSaveNpwp = async () => {
    if (!npwpInput.trim()) {
      alert('Nomor NPWP wajib diisi.')
      return
    }
    const updated = {
      ...formData,
      npwpVerified: true
    }
    setFormData(updated)
    setShowNpwpModal(false)
    setNpwpInput('')

    // Simpan langsung ke backend
    try {
      setSaving(true)
      await updateUserProfile({
        tenantProfile: updated
      })
      if (setToastMessage) {
        setToastMessage('NPWP berhasil diverifikasi dan disimpan!')
        setTimeout(() => setToastMessage(''), 3500)
      }
    } catch (err) {
      alert(`Gagal menyimpan NPWP: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] space-y-3 font-sans">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Memuat profil toko &amp; verifikasi legalitas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 font-sans animate-in fade-in duration-200">
      {/* ── TOPBAR: HEADER & ACTION BUTTONS ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Profil toko
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            Tampilan publik, legalitas, dan preferensi operasional toko Anda
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tombol Lihat Etalase */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Lihat etalase</span>
          </button>

          {/* Tombol Simpan Perubahan */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── ROW 1: STORE CARD & KYC VERIFICATION CARD ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* STORE CARD (LEFT / 2 COLS) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo Inisial Toko */}
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xs ring-4 ring-blue-50">
                  {storeInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {formData.storeName || 'Nama Toko'}
                    </h2>
                  </div>
                  <p className="text-xs font-bold text-blue-600 mt-0.5">
                    {formData.storeCategory}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="#form-informasi-toko"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit profil</span>
                </a>
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Toko Terverifikasi</span>
                </div>
              </div>
            </div>

            {/* Deskripsi Toko */}
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {formData.storeDescription}
            </p>
          </div>

          {/* Badges Info Toko */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 mt-4 text-[11px] font-semibold text-slate-600">
            {/* Rating Bintang Toko */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-amber-800 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>
                {meta.storeRating.count > 0 ? (
                  <>
                    {meta.storeRating.average} ({meta.storeRating.count} ulasan)
                  </>
                ) : (
                  'Belum ada ulasan'
                )}
              </span>
            </div>

            {/* Lokasi Gudang & Radius */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {formData.city} (Radius {formData.serviceRadius} km)
              </span>
            </div>

            {/* Jumlah Alat Aktif */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-700">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>{meta.equipmentCount} alat aktif</span>
            </div>

            {/* Tahun Bergabung */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Bergabung {meta.joinYear}</span>
            </div>
          </div>
        </div>

        {/* VERIFIKASI & LEGALITAS (KYC) CARD (RIGHT / 1 COL) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Verifikasi &amp; Legalitas
              </h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-full border border-blue-100">
                {completedKycCount}/4 lengkap
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-700 mt-2.5">
              {completedKycCount === 4
                ? 'Toko Anda telah terverifikasi penuh dengan lencana Trusted.'
                : 'Satu langkah lagi menuju lencana Trusted.'}
            </p>

            {/* Daftar Status Dokumen Legalitas */}
            <div className="space-y-2.5 mt-3 text-xs">
              {/* KTP */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    formData.ktpVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800">Identitas pemilik (KTP)</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {currentUser?.fullName || 'Budi Santoso'} · {formData.ktpVerified ? 'terverifikasi' : 'belum'}
                  </div>
                </div>
              </div>

              {/* NIB Usaha */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    formData.nibVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800">NIB usaha</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {formData.nibVerified ? '9120 4471 8830 · terverifikasi' : 'Belum diverifikasi'}
                  </div>
                </div>
              </div>

              {/* Rekening Bank */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    formData.bankAccountVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800">Rekening bank</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {meta.bankAccountDisplay} · aktif
                  </div>
                </div>
              </div>

              {/* NPWP Pemilik */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    formData.npwpVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800">NPWP pemilik</div>
                  <div
                    className={`text-[10px] ${
                      formData.npwpVerified ? 'text-slate-500' : 'text-amber-600 font-bold'
                    }`}
                  >
                    {formData.npwpVerified ? 'Terverifikasi' : 'Belum diunggah'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!formData.nibVerified ? (
            <button
              type="button"
              onClick={() => alert('Fitur lengkapi NIB akan segera tersedia.')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Lengkapi NIB
            </button>
          ) : !formData.npwpVerified ? (
            <button
              type="button"
              onClick={() => setShowNpwpModal(true)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Lengkapi NPWP
            </button>
          ) : null}
        </div>
      </div>

      {/* ── ROW 2: FORM INFORMASI TOKO & PREFERENSI ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* COLUMN LEFT (2 COLS): FORM TOKO & JAM OPERASIONAL */}
        <div className="lg:col-span-2 space-y-5">
          {/* KARTU INFORMASI TOKO */}
          <div id="form-informasi-toko" className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                <span>Informasi toko</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Dapat diedit &amp; tampil di etalase publik
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Toko */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Nama toko
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    placeholder="Contoh: Kopi Senja Roastery"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Kategori Usaha */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Kategori usaha
                </label>
                <select
                  value={formData.storeCategory}
                  onChange={(e) => setFormData({ ...formData, storeCategory: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Kuliner & Kopi">Kuliner &amp; Kopi</option>
                  <option value="Fotografi & Video">Fotografi &amp; Video</option>
                  <option value="Konstruksi & Tukang">Konstruksi &amp; Tukang</option>
                  <option value="Elektronik & Kelistrikan">Elektronik &amp; Kelistrikan</option>
                  <option value="Percetakan & Event">Percetakan &amp; Event</option>
                  <option value="Pertanian & Perkebunan">Pertanian &amp; Perkebunan</option>
                </select>
              </div>

              {/* Nomor WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="+62 812 3456 7890"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Jarak Layanan (Radius) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Jarak layanan
                </label>
                <select
                  value={formData.serviceRadius}
                  onChange={(e) => setFormData({ ...formData, serviceRadius: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer"
                >
                  <option value={5}>Radius 5 km</option>
                  <option value={10}>Radius 10 km</option>
                  <option value={15}>Radius 15 km</option>
                  <option value={25}>Radius 25 km</option>
                  <option value={50}>Radius 50 km</option>
                </select>
              </div>

              {/* Alamat Gudang */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Alamat gudang
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Cilandak Tengah No. 12"
                  className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              {/* Kota / Provinsi */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Kota / provinsi
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Bandung, Jawa Barat"
                  className="w-full px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Deskripsi Toko Textarea */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Deskripsi Toko (Tentang Kami)
              </label>
              <textarea
                rows={3}
                value={formData.storeDescription}
                onChange={(e) => setFormData({ ...formData, storeDescription: e.target.value })}
                placeholder="Tuliskan spesialisasi alat, jaminan perawatan, dan layanan ekstra toko Anda..."
                className="w-full p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* KARTU JAM OPERASIONAL & PENGAMBILAN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Jam operasional &amp; pengambilan</span>
              </h3>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Buka sekarang
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Senin - Jumat */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500">Senin – Jumat</div>
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="text"
                    value={formData.operatingHours?.weekdays?.open || '08.00'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          weekdays: { ...formData.operatingHours?.weekdays, open: e.target.value }
                        }
                      })
                    }
                    className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-center font-bold text-slate-900"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="text"
                    value={formData.operatingHours?.weekdays?.close || '17.00'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          weekdays: { ...formData.operatingHours?.weekdays, close: e.target.value }
                        }
                      })
                    }
                    className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-center font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Sabtu */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500">Sabtu</div>
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="text"
                    value={formData.operatingHours?.saturday?.open || '09.00'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          saturday: { ...formData.operatingHours?.saturday, open: e.target.value }
                        }
                      })
                    }
                    className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-center font-bold text-slate-900"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="text"
                    value={formData.operatingHours?.saturday?.close || '15.00'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          saturday: { ...formData.operatingHours?.saturday, close: e.target.value }
                        }
                      })
                    }
                    className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-center font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Minggu */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Minggu</span>
                  <label className="flex items-center gap-1 text-[10px] text-slate-500 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.operatingHours?.sunday?.closed)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          operatingHours: {
                            ...formData.operatingHours,
                            sunday: {
                              ...formData.operatingHours?.sunday,
                              closed: e.target.checked
                            }
                          }
                        })
                      }
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Tutup</span>
                  </label>
                </div>

                {formData.operatingHours?.sunday?.closed ? (
                  <div className="text-xs font-bold text-rose-600 py-1">Tutup seharian</div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs">
                    <input
                      type="text"
                      value={formData.operatingHours?.sunday?.open || '10.00'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          operatingHours: {
                            ...formData.operatingHours,
                            sunday: { ...formData.operatingHours?.sunday, open: e.target.value }
                          }
                        })
                      }
                      className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-center font-bold text-slate-900"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="text"
                      value={formData.operatingHours?.sunday?.close || '16.00'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          operatingHours: {
                            ...formData.operatingHours,
                            sunday: { ...formData.operatingHours?.sunday, close: e.target.value }
                          }
                        })
                      }
                      className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-center font-bold text-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN RIGHT (1 COL): PEMBAYARAN/REKENING & PREFERENSI NOTIFIKASI */}
        <div className="space-y-5">
          {/* KARTU PEMBAYARAN & REKENING (TANPA ASURANSI SESUAI AUDIT) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Pembayaran &amp; Rekening</span>
              </h3>
              <button
                type="button"
                onClick={() => onSwitchTab && onSwitchTab('dompet')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
              >
                Kelola
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* QRIS & VA */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-600">QRIS &amp; Virtual Account</span>
                </div>
                <span className="font-bold text-emerald-600">Aktif</span>
              </div>

              {/* Rekening Pencairan */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <Landmark className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-600">Rekening pencairan</span>
                </div>
                <span className="font-bold text-slate-900">{meta.bankAccountDisplay}</span>
              </div>

              {/* Biaya Layanan */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-600">Biaya layanan</span>
                </div>
                <span className="font-bold text-slate-900">5% per sewa</span>
              </div>

              {/* Baris Asuransi alat Rp 2.500/hari telah DIHAPUS sesuai audit backend */}
            </div>
          </div>

          {/* KARTU PREFERENSI NOTIFIKASI */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                <span>Preferensi notifikasi</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Toggle 1: Pesanan Baru */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Pesanan baru</div>
                  <div className="text-[10px] text-slate-500">Langsung via WhatsApp</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, notifPesananBaru: !formData.notifPesananBaru })
                  }
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    formData.notifPesananBaru ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.notifPesananBaru ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Pengembalian Alat */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Pengembalian alat</div>
                  <div className="text-[10px] text-slate-500">Reminder H-1</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      notifPengembalianAlat: !formData.notifPengembalianAlat
                    })
                  }
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    formData.notifPengembalianAlat ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.notifPengembalianAlat ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Inspeksi & Deposit */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Inspeksi &amp; deposit</div>
                  <div className="text-[10px] text-slate-500">Setiap ada perubahan</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      notifInspeksiDeposit: !formData.notifInspeksiDeposit
                    })
                  }
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    formData.notifInspeksiDeposit ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.notifInspeksiDeposit ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: Ringkasan Mingguan */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Ringkasan mingguan</div>
                  <div className="text-[10px] text-slate-500">Email tiap Senin</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      notifRingkasanMingguan: !formData.notifRingkasanMingguan
                    })
                  }
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    formData.notifRingkasanMingguan ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.notifRingkasanMingguan ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL LENGKAPI NPWP ────────────────────────────────────────────── */}
      {showNpwpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Lengkapi NPWP Pemilik</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNpwpModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Masukkan 15 atau 16 digit Nomor Pokok Wajib Pajak (NPWP) sesuai identitas pemilik atau badan usaha.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">Nomor NPWP</label>
              <input
                type="text"
                value={npwpInput}
                onChange={(e) => setNpwpInput(e.target.value)}
                placeholder="Contoh: 01.234.567.8-901.000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNpwpModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNpwp}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Simpan NPWP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRATINJAU ETALASE TOKO ───────────────────────────────────── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Pratinjau Etalase Publik
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                  {storeInitials}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {formData.storeName || 'Nama Toko'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>{formData.storeCategory}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      Terverifikasi
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {formData.storeDescription}
              </p>

              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1 text-amber-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{meta.storeRating.average} ({meta.storeRating.count} ulasan)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formData.city}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Begini tampilan toko Anda bagi penyewa di katalog MyRent.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false)
                  if (onSwitchTab) onSwitchTab('alat')
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Lihat Alat Saya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

