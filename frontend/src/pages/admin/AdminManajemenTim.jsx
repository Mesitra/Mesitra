import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
  X,
  Info,
  Mail,
  Calendar,
  Layers
} from 'lucide-react'
import AdminSidebar from '../../components/adminDashboard/AdminSidebar'
import { logoutAdmin } from '../../components/adminAuth/adminSession'
import {
  fetchStaffUsers,
  createStaffUser,
  deactivateStaffUser,
  activateStaffUser,
  resetStaffPin
} from '../../components/adminDashboard/adminApi'

const ADMIN_PATHS = {
  verifikasi: '/admin/kyc',
  pencairan: '/admin/pencairan-dana',
  mediasi: '/admin/mediasi-sengketa',
  moderasi: '/admin/moderasi',
  'manajemen-tim': '/admin/manajemen-tim'
}

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
 * Custom Confirmation Modal pengganti window.confirm.
 */
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  isProcessing = false,
  onConfirm,
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow || 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <ShieldOff className="w-6 h-6" />
          </div>
        )
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
        )
      case 'primary':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
        )
    }
  }

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-200'
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-200'
      case 'primary':
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {getIcon()}
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-60 focus:outline-none focus:ring-2 ${getConfirmButtonClasses()}`}
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminManajemenTim({ onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Data & State
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modal Tambah Staff
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Custom Modal Konfirmasi State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    variant: 'danger',
    actionType: null, // 'reset-pin' | 'deactivate' | 'activate'
    targetUser: null,
    isProcessing: false
  })

  const isInsideAdminLayout = location.pathname.startsWith('/admin')

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    logoutAdmin(navigate)
  }

  const fetchStaffList = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const users = await fetchStaffUsers()
      setStaffList(Array.isArray(users) ? users : [])
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar staff admin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaffList()
  }, [fetchStaffList])

  // Filter staff berdasarkan query pencarian
  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return staffList

    return staffList.filter((item) => {
      const name = (item.name || '').toLowerCase()
      const email = (item.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [staffList, searchQuery])

  // Hitung statistik
  const stats = useMemo(() => {
    const total = staffList.length
    const superadminCount = staffList.filter((s) => s.role === 'SUPERADMIN').length
    const activeCount = staffList.filter((s) => s.isActive).length
    return { total, superadminCount, activeCount }
  }, [staffList])

  // Submit Tambah Staff Baru
  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setFormError('')

    const name = formData.name.trim()
    const email = formData.email.trim()
    const password = formData.password.trim()

    if (!name || !email || !password) {
      setFormError('Nama lengkap, email, dan password wajib diisi.')
      return
    }

    if (password.length < 6) {
      setFormError('Password minimal harus terdiri dari 6 karakter.')
      return
    }

    try {
      setSubmitting(true)
      await createStaffUser({ name, email, password })
      setSuccessMessage(`Akun staff baru "${name}" berhasil dibuat.`)
      setShowAddModal(false)
      setFormData({ name: '', email: '', password: '' })
      await fetchStaffList()
    } catch (err) {
      setFormError(err.message || 'Gagal membuat akun staff baru.')
    } finally {
      setSubmitting(false)
    }
  }

  // Buka Modal Konfirmasi Reset PIN
  const handleOpenResetPinDialog = (staff) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Security PIN Staff',
      message: `Apakah Anda yakin ingin mereset PIN untuk ${staff.name}? Staff akan diminta mengatur PIN 6 digit baru saat login berikutnya.`,
      confirmText: 'Ya, Reset PIN',
      cancelText: 'Batal',
      variant: 'warning',
      actionType: 'reset-pin',
      targetUser: staff,
      isProcessing: false
    })
  }

  // Buka Modal Konfirmasi Nonaktifkan / Aktifkan
  const handleOpenToggleActiveDialog = (staff) => {
    if (staff.isActive) {
      setConfirmDialog({
        isOpen: true,
        title: 'Nonaktifkan Akun Staff',
        message: `Apakah Anda yakin ingin menonaktifkan akun ${staff.name}? Staff ini tidak akan dapat mengakses portal admin MyRent sampai diaktifkan kembali.`,
        confirmText: 'Ya, Nonaktifkan',
        cancelText: 'Batal',
        variant: 'danger',
        actionType: 'deactivate',
        targetUser: staff,
        isProcessing: false
      })
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Aktifkan Kembali Akun Staff',
        message: `Apakah Anda yakin ingin mengaktifkan kembali akun ${staff.name}? Staff akan dapat kembali login ke portal admin.`,
        confirmText: 'Ya, Aktifkan',
        cancelText: 'Batal',
        variant: 'primary',
        actionType: 'activate',
        targetUser: staff,
        isProcessing: false
      })
    }
  }

  // Eksekusi Konfirmasi Aksi
  const handleExecuteConfirm = async () => {
    const { actionType, targetUser } = confirmDialog
    if (!targetUser || !actionType) return

    setConfirmDialog((prev) => ({ ...prev, isProcessing: true }))
    setError('')
    setSuccessMessage('')

    try {
      if (actionType === 'reset-pin') {
        const res = await resetStaffPin(targetUser.id)
        setSuccessMessage(res.message || `PIN untuk staff "${targetUser.name}" berhasil direset.`)
      } else if (actionType === 'deactivate') {
        const res = await deactivateStaffUser(targetUser.id)
        setSuccessMessage(res.message || `Akun staff "${targetUser.name}" berhasil dinonaktifkan.`)
      } else if (actionType === 'activate') {
        const res = await activateStaffUser(targetUser.id)
        setSuccessMessage(res.message || `Akun staff "${targetUser.name}" berhasil diaktifkan kembali.`)
      }

      setConfirmDialog((prev) => ({ ...prev, isOpen: false, isProcessing: false, targetUser: null }))
      await fetchStaffList()
    } catch (err) {
      setError(err.message || 'Gagal memproses aksi pada akun staff.')
      setConfirmDialog((prev) => ({ ...prev, isProcessing: false }))
    }
  }

  // Konten Utama Halaman Manajemen Tim
  const mainContent = (
    <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Portal Admin</span>
        <span className="text-xs text-slate-400">/</span>
        <span className="text-xs font-semibold text-slate-900">Manajemen Tim</span>
      </div>

      {/* Heading & Search Bar / Tombol Tambah */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700">
            <Users className="w-3.5 h-3.5" />
            Akses Khusus Superadmin
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
            Manajemen Tim
          </h1>
          <p className="text-sm text-slate-500">
            {stats.total} anggota tim terdaftar · kelola wewenang, status akun, dan PIN staf admin
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={fetchStaffList}
            disabled={loading}
            title="Muat ulang data"
            className="shrink-0 h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({ name: '', email: '', password: '' })
              setFormError('')
              setShowAddModal(true)
            }}
            className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Staff</span>
          </button>
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
      {error && (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            type="button"
            onClick={fetchStaffList}
            className="text-xs font-bold underline cursor-pointer hover:text-red-950"
          >
            Coba lagi
          </button>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Superadmin</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {stats.superadminCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Akun Aktif</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {stats.activeCount}
            </p>
          </div>
        </div>
      </div>

      {/* Table Data Staff */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Anggota Tim</th>
                <th className="py-3.5 px-6">Email Akses</th>
                <th className="py-3.5 px-6">Hak Akses</th>
                <th className="py-3.5 px-6">Status Akun</th>
                <th className="py-3.5 px-6 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-slate-500">Memuat data tim admin...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {searchQuery ? 'Tidak ada staff yang cocok' : 'Belum ada anggota staff'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchQuery
                          ? `Tidak ditemukan akun dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                          : 'Klik tombol "Tambah Staff" di atas untuk menambahkan staf operasional pertama Anda.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isSuper = staff.role === 'SUPERADMIN'
                  const initials = (staff.name || 'Admin')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nama & Avatar */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuper ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{staff.name}</p>
                            {staff.createdAt && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Terdaftar{' '}
                                {new Date(staff.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{staff.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6 align-middle">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                            <Shield className="w-3.5 h-3.5" />
                            Superadmin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                            <Users className="w-3.5 h-3.5" />
                            Staff Operasional
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 align-middle">
                        {staff.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-6 align-middle text-right">
                        {isSuper ? (
                          <span className="text-xs text-slate-400 font-medium italic">Akun Utama</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenResetPinDialog(staff)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Reset security PIN staff"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Reset PIN</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenToggleActiveDialog(staff)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                staff.isActive
                                  ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={staff.isActive ? 'Nonaktifkan akun' : 'Aktifkan kembali akun'}
                            >
                              {staff.isActive ? (
                                <>
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  <span>Nonaktifkan</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Aktifkan</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Staff Baru */}
      {showAddModal && (
        <ModalShell
          title="Tambah Staff Baru"
          subtitle="Daftarkan akun staf admin operasional baru ke sistem"
          icon={UserPlus}
          onClose={() => {
            if (submitting) return
            setShowAddModal(false)
            setFormData({ name: '', email: '', password: '' })
            setFormError('')
          }}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleCreateStaff}>
            <div className="px-6 py-5 space-y-4">
              {/* Info Banner */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <p>
                  Akun staff baru otomatis diberikan peran <strong>STAFF</strong>. Saat pertama kali login, staff akan diminta memasang 6-digit Security PIN pribadi untuk verifikasi transaksi/otorisasi.
                </p>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Input: Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap Staff <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Riko Kurniawan"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  required
                />
              </div>

              {/* Form Input: Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: riko@myrent.id"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  required
                />
              </div>

              {/* Form Input: Password Awal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password Awal Akun <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Password ini digunakan untuk autentikasi tahap awal (Step 1).
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/75 px-6 py-4 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({ name: '', email: '', password: '' })
                  setFormError('')
                }}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Simpan Staff</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Custom Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        isProcessing={confirmDialog.isProcessing}
        onConfirm={handleExecuteConfirm}
        onClose={() => {
          if (!confirmDialog.isProcessing) {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false, targetUser: null }))
          }
        }}
      />
    </main>
  )

  // Jika halaman ini di-render di dalam AdminLayout (misal rute /admin/manajemen-tim),
  // layout utama dan sidebar sudah disediakan oleh AdminLayout.
  if (isInsideAdminLayout) {
    return <div className="w-full">{mainContent}</div>
  }

  // Jika diakses melalui rute langsung portal HQ (/portal-internal-hq/manajemen-tim),
  // bungkus dengan AdminSidebar dan Mobile Header standar portal admin.
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row items-stretch">
      <AdminSidebar
        activeKey="manajemen-tim"
        onNavigate={(key) => {
          const path = ADMIN_PATHS[key]
          if (path) navigate(path)
        }}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
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
              value="manajemen-tim"
              onChange={(e) => {
                const path = ADMIN_PATHS[e.target.value]
                if (path) navigate(path)
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
            >
              <option value="verifikasi">Verifikasi Akun</option>
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
