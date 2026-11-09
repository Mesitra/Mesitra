import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Layers,
  X,
  Info,
  BadgeCheck,
  ExternalLink,
  ChevronDown,
  Filter
} from 'lucide-react'
import AdminSidebar from '../../components/adminDashboard/AdminSidebar'
import { logoutAdmin } from '../../components/adminAuth/adminSession'
import {
  fetchPublicUsers,
  suspendUser,
  unsuspendUser
} from '../../components/adminDashboard/adminApi'

const ADMIN_PATHS = {
  verifikasi: '/portal-internal-hq/dashboard',
  'manajemen-pengguna': '/portal-internal-hq/manajemen-pengguna',
  pencairan: '/portal-internal-hq/pencairan-dana',
  mediasi: '/portal-internal-hq/mediasi-sengketa',
  moderasi: '/portal-internal-hq/moderasi',
  'manajemen-tim': '/portal-internal-hq/manajemen-tim'
}

const PRESET_SUSPEND_REASONS = [
  'Pelanggaran Syarat & Ketentuan Layanan',
  'Aktivitas Penipuan / Transaksi Mencurigakan',
  'Identitas / Dokumen KYC Tidak Sah atau Palsu',
  'Laporan Sengketa Berulang & Tidak Kooperatif'
]

/**
 * Standard ModalShell dengan backdrop blur, header konsisten, dan body scroll-lock.
 */
function ModalShell({ title, subtitle, icon: Icon, onClose, children, maxWidthClass = 'max-w-lg' }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow || 'unset'
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-2xl border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-slate-500" title={subtitle}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Custom Confirmation & Input Modal (pengganti window.confirm).
 */
function ActionUserModal({
  isOpen,
  type, // 'suspend' | 'activate'
  user,
  isProcessing,
  onConfirm,
  onClose
}) {
  const [reason, setReason] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setSelectedPreset('')
    }
  }, [isOpen])

  if (!isOpen || !user) return null

  const isSuspend = type === 'suspend'

  const handleSubmit = (e) => {
    e.preventDefault()
    const finalReason = reason.trim() || selectedPreset || 'Penangguhan akun oleh Admin HQ'
    onConfirm(finalReason)
  }

  return (
    <ModalShell
      title={isSuspend ? 'Tangguhkan Akun Pengguna' : 'Aktifkan Kembali Akun'}
      subtitle={`Pengguna: ${user.fullName} (${user.email})`}
      icon={isSuspend ? ShieldOff : ShieldCheck}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
        {/* Banner Penjelasan */}
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-xs leading-relaxed border ${
            isSuspend
              ? 'bg-red-50/80 border-red-200 text-red-900'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}
        >
          {isSuspend ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            {isSuspend ? (
              <p>
                Akun yang ditangguhkan akan <strong>segera diblokir</strong> dari membuat pesanan baru,
                menambah alat, atau melakukan transaksi platform. Pengguna akan melihat pesan penangguhan saat mencoba mengakses fitur.
              </p>
            ) : (
              <p>
                Mencabut status penangguhan akan mengembalikan hak akses penuh pengguna ke platform MyRent
                sesuai dengan peran dan status verifikasi KYC akun.
              </p>
            )}
          </div>
        </div>

        {/* Ringkasan Profil Singkat */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Nama Lengkap:</span>
            <span className="font-bold text-slate-800">{user.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Email:</span>
            <span className="font-semibold text-slate-800">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Peran:</span>
            <span className="font-semibold text-slate-800">
              {user.role === 'PENYEWA' ? 'Penyewa UMKM' : 'Pemilik Alat'}
            </span>
          </div>
          {user.isSuspended && user.suspendedReason && (
            <div className="flex justify-between pt-1 border-t border-slate-200/60">
              <span className="text-red-500 font-medium">Alasan Sebelumnya:</span>
              <span className="font-medium text-red-700 text-right max-w-[240px] truncate" title={user.suspendedReason}>
                {user.suspendedReason}
              </span>
            </div>
          )}
        </div>

        {/* Input Alasan Suspensi (Khusus Aksi Suspend) */}
        {isSuspend && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Alasan Penangguhan Akun <span className="text-red-500">*</span>
            </label>

            {/* Preset Alasan Cepat */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-400 font-medium">Pilih template alasan cepat:</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SUSPEND_REASONS.map((preset) => {
                  const isSelected = selectedPreset === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(isSelected ? '' : preset)
                        if (!isSelected) setReason(preset)
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setSelectedPreset('')
                }}
                rows={3}
                placeholder="Tulis alasan spesifik penangguhan akun ini untuk catatan audit..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all resize-none"
                required
              />
            </div>
          </div>
        )}

        {/* Tombol Aksi Modal */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isProcessing || (isSuspend && !reason.trim() && !selectedPreset)}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5 ${
              isSuspend ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isProcessing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{isSuspend ? 'Ya, Tangguhkan Akun' : 'Ya, Aktifkan Akun'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

export default function ManajemenPengguna() {
  const navigate = useNavigate()
  const location = useLocation()

  // State Data & Filter
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('SEMUA') // 'SEMUA' | 'PENYEWA' | 'PEMILIK'
  const [statusFilter, setStatusFilter] = useState('SEMUA') // 'SEMUA' | 'DISETUJUI' | 'MENUNGGU' | 'PERLU_PERBAIKAN' | 'DITOLAK'
  const [suspensionFilter, setSuspensionFilter] = useState('SEMUA') // 'SEMUA' | 'AKTIF' | 'SUSPENDED'

  // Notifikasi & Pesan
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // State Modal Aksi
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'suspend', // 'suspend' | 'activate'
    user: null,
    isProcessing: false
  })

  // Fetch data dari endpoint GET /api/admin/users/public
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await fetchPublicUsers({
        role: roleFilter,
        status: statusFilter,
        isSuspended: suspensionFilter === 'SUSPENDED' ? 'true' : suspensionFilter === 'AKTIF' ? 'false' : undefined,
        search: searchQuery.trim() || undefined
      })
      setUsers(data.users || [])
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memuat daftar pengguna publik.')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter, suspensionFilter, searchQuery])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleLogout = () => {
    logoutAdmin(navigate)
  }

  // Handle Eksekusi Suspend atau Unsuspend
  const handleExecuteAction = async (reason) => {
    const { type, user } = actionModal
    if (!user) return

    setActionModal((prev) => ({ ...prev, isProcessing: true }))
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (type === 'suspend') {
        const res = await suspendUser(user.id, reason)
        setSuccessMessage(res.message || `Akun ${user.fullName} berhasil ditangguhkan.`)
      } else {
        const res = await unsuspendUser(user.id)
        setSuccessMessage(res.message || `Penangguhan akun ${user.fullName} berhasil dicabut.`)
      }

      setActionModal({ isOpen: false, type: 'suspend', user: null, isProcessing: false })
      await loadUsers()
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memproses tindakan pada akun pengguna.')
      setActionModal((prev) => ({ ...prev, isProcessing: false }))
    }
  }

  // Statistik Ringkasan Cepat
  const stats = useMemo(() => {
    const total = users.length
    const penyewa = users.filter((u) => u.role === 'PENYEWA').length
    const pemilik = users.filter((u) => u.role === 'PEMILIK').length
    const verified = users.filter(
      (u) => u.verificationStatus === 'DISETUJUI' || u.verificationStatus === 'VERIFIED'
    ).length
    const suspended = users.filter((u) => u.isSuspended).length

    return { total, penyewa, pemilik, verified, suspended }
  }, [users])

  // Helper Render Badge Status Verifikasi KYC
  const renderKycBadge = (status) => {
    const upper = String(status || '').toUpperCase()
    switch (upper) {
      case 'DISETUJUI':
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Disetujui</span>
          </span>
        )
      case 'MENUNGGU':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu</span>
          </span>
        )
      case 'PERLU_PERBAIKAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            <span>Perlu Perbaikan</span>
          </span>
        )
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Ditolak</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span>{status || 'Belum Registrasi'}</span>
          </span>
        )
    }
  }

  // Konten Utama Halaman
  const mainContent = (
    <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Portal Admin</span>
        <span className="text-xs text-slate-400">/</span>
        <span className="text-xs font-semibold text-slate-900">Manajemen Pengguna</span>
      </div>

      {/* Heading & Toolbar Pencarian */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700">
            <Users className="w-3.5 h-3.5" />
            Pengguna Publik Platform
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
            Manajemen Pengguna Publik
          </h1>
          <p className="text-sm text-slate-500">
            Daftar seluruh Penyewa UMKM &amp; Pemilik Alat terdaftar · pantau status KYC dan kontrol penangguhan akun
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, phone..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            title="Muat ulang data"
            className="shrink-0 h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'SEMUA', label: 'Semua Pengguna' },
            { id: 'PENYEWA', label: 'Penyewa UMKM' },
            { id: 'PEMILIK', label: 'Pemilik Alat' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Status KYC */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="SEMUA">Semua Status KYC</option>
            <option value="DISETUJUI">Disetujui (Verified)</option>
            <option value="MENUNGGU">Menunggu Verifikasi</option>
            <option value="PERLU_PERBAIKAN">Perlu Perbaikan</option>
            <option value="DITOLAK">Ditolak</option>
          </select>

          {/* Status Suspensi */}
          <select
            value={suspensionFilter}
            onChange={(e) => setSuspensionFilter(e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="SEMUA">Semua Status Akun</option>
            <option value="AKTIF">Akun Aktif Saja</option>
            <option value="SUSPENDED">Ditangguhkan Saja</option>
          </select>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="flex-1 font-medium">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="flex-1 font-medium">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
            aria-label="Tutup pesan error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Terdaftar</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{stats.total}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Penyewa UMKM</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{stats.penyewa}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Pemilik Alat</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{stats.pemilik}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">KYC Disetujui</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{stats.verified}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Akun Ditangguhkan</p>
          <p className="text-2xl font-black text-red-600 tracking-tight mt-1">{stats.suspended}</p>
        </div>
      </div>

      {/* Tabel Data Pengguna Publik */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Pengguna</th>
                <th className="py-3.5 px-6">Email &amp; Kontak</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Status Verifikasi</th>
                <th className="py-3.5 px-6">Status Akun</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-slate-500">Memuat daftar pengguna...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {searchQuery ? 'Tidak ada pengguna yang cocok' : 'Belum ada pengguna publik terdaftar'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchQuery
                          ? `Tidak ditemukan akun dengan kata kunci "${searchQuery}". Coba kata kunci atau filter lain.`
                          : 'Pengguna yang mendaftar sebagai Penyewa atau Pemilik akan muncul di halaman ini.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isOwner = u.role === 'PEMILIK'
                  const initials = (u.fullName || 'User')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nama & Info Usaha/Kode */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isOwner ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{u.fullName}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {u.submissionCode && (
                                <span className="font-mono text-slate-500 font-semibold">
                                  {u.submissionCode}
                                </span>
                              )}
                              {u.createdAt && (
                                <span>
                                  · Terdaftar{' '}
                                  {new Date(u.createdAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Kontak WhatsApp */}
                      <td className="py-4 px-6 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6 align-middle">
                        {isOwner ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                            Pemilik Alat
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                            Penyewa UMKM
                          </span>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isOwner
                            ? `${u.totalEquipments ?? 0} alat didaftarkan`
                            : `${u.totalOrders ?? 0} transaksi sewa`}
                        </p>
                      </td>

                      {/* Status Verifikasi KYC */}
                      <td className="py-4 px-6 align-middle">
                        {renderKycBadge(u.verificationStatus)}
                      </td>

                      {/* Status Akun (Aktif / Ditangguhkan) */}
                      <td className="py-4 px-6 align-middle">
                        {u.isSuspended ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <ShieldOff className="w-3 h-3 text-red-500" />
                              <span>Ditangguhkan</span>
                            </span>
                            {u.suspendedReason && (
                              <p
                                className="text-[10px] text-red-500 max-w-[180px] truncate mt-0.5"
                                title={u.suspendedReason}
                              >
                                {u.suspendedReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Aktif</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi (Suspend / Aktifkan) */}
                      <td className="py-4 px-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.isSuspended ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  isOpen: true,
                                  type: 'activate',
                                  user: u,
                                  isProcessing: false
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Pulihkan akses pengguna"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Aktifkan</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  isOpen: true,
                                  type: 'suspend',
                                  user: u,
                                  isProcessing: false
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition-colors cursor-pointer"
                              title="Tangguhkan akses akun ini"
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Interaktif Suspend & Aktifkan (Pengganti window.confirm) */}
      <ActionUserModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        user={actionModal.user}
        isProcessing={actionModal.isProcessing}
        onConfirm={handleExecuteAction}
        onClose={() =>
          setActionModal({ isOpen: false, type: 'suspend', user: null, isProcessing: false })
        }
      />
    </main>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Admin Navigasi */}
      <AdminSidebar activeKey="manajemen-pengguna" onLogout={handleLogout} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header Navigasi */}
        <header className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900 cursor-pointer"
          >
            <Layers className="w-5 h-5 text-blue-600" />
            MyRent HQ
          </button>
          <div className="flex items-center gap-2">
            <select
              value="manajemen-pengguna"
              onChange={(e) => {
                const path = ADMIN_PATHS[e.target.value]
                if (path) navigate(path)
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
            >
              <option value="verifikasi">Verifikasi Akun</option>
              <option value="manajemen-pengguna">Manajemen Pengguna</option>
              <option value="pencairan">Pencairan Dana</option>
              <option value="mediasi">Mediasi Sengketa</option>
              <option value="moderasi">Moderasi Platform</option>
              <option value="manajemen-tim">Manajemen Tim</option>
            </select>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {mainContent}
      </div>
    </div>
  )
}

