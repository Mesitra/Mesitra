import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Search,
  RefreshCw,
  AlertCircle,
  Inbox,
  CheckCircle2,
  X,
  Star,
  Ban,
  RotateCcw,
  Trash2,
  Store,
  MessageSquare,
  Loader2,
  Eye,
  ImageOff,
  Mail,
  Phone,
  User,
  CalendarDays,
  BadgeCheck
} from 'lucide-react'
import AdminSidebar from '../../components/adminDashboard/AdminSidebar'
import { logoutAdmin } from '../../components/adminAuth/adminSession'
import {
  fetchAdminEquipments,
  fetchAdminReviews,
  takedownEquipment,
  restoreEquipment,
  deleteReview
} from '../../components/adminDashboard/adminApi'

const TABS = [
  { key: 'katalog', label: 'Katalog Alat', icon: Store },
  { key: 'ulasan', label: 'Ulasan Pengguna', icon: MessageSquare }
]

const ADMIN_PATHS = {
  verifikasi: '/portal-internal-hq/dashboard',
  pencairan: '/portal-internal-hq/pencairan-dana',
  mediasi: '/portal-internal-hq/mediasi-sengketa',
  moderasi: '/portal-internal-hq/moderasi'
}

const STATUS_EQUIPMENT = {
  TERSEDIA: {
    label: 'Tersedia',
    className: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-500'
  },
  DISEWA: {
    label: 'Disewa',
    className: 'bg-blue-50 border-blue-200 text-blue-700',
    dot: 'bg-blue-500'
  },
  NONAKTIF: {
    label: 'Nonaktif',
    className: 'bg-slate-100 border-slate-200 text-slate-600',
    dot: 'bg-slate-400'
  },
  MAINTENANCE: {
    label: 'Perawatan',
    className: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-500'
  },
  INSPEKSI: {
    label: 'Inspeksi',
    className: 'bg-purple-50 border-purple-200 text-purple-700',
    dot: 'bg-purple-500'
  }
}

const VERIFICATION_STATUS = {
  MENUNGGU: {
    label: 'Menunggu Verifikasi',
    className: 'bg-amber-50 border-amber-200 text-amber-700'
  },
  PERLU_PERBAIKAN: {
    label: 'Perlu Perbaikan',
    className: 'bg-orange-50 border-orange-200 text-orange-700'
  },
  DISETUJUI: {
    label: 'Terverifikasi',
    className: 'bg-emerald-50 border-emerald-200 text-emerald-700'
  },
  DITOLAK: {
    label: 'Ditolak',
    className: 'bg-red-50 border-red-200 text-red-700'
  }
}

const ROLE_LABEL = {
  PENYEWA: 'Penyewa',
  PEMILIK: 'Pemilik Alat',
  ADMIN: 'Admin'
}

const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value || 0)
}

const formatDate = (value, withTime = false) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}

const normalizeImageList = (images) => {
  if (!images) return []

  let list = images
  if (typeof list === 'string') {
    try {
      const parsed = JSON.parse(list)
      list = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      list = [list]
    }
  }

  if (!Array.isArray(list)) list = [list]

  return list
    .map((item) => (typeof item === 'string' ? item : item?.url || item?.imageUrl || ''))
    .filter(Boolean)
}

const shortId = (id) => (id ? `${id.slice(0, 8)}…` : '—')

export default function AdminModerasi({ onLogout }) {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('katalog')
  const [keyword, setKeyword] = useState('')
  const [equipments, setEquipments] = useState([])
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modal preview alat
  const [equipmentToPreview, setEquipmentToPreview] = useState(null)
  const [equipmentPhotoIndex, setEquipmentPhotoIndex] = useState(0)

  // Modal takedown alat
  const [equipmentToTakedown, setEquipmentToTakedown] = useState(null)
  const [takedownReason, setTakedownReason] = useState('')
  const [takedownError, setTakedownError] = useState('')
  const [isSubmittingTakedown, setIsSubmittingTakedown] = useState(false)
  const [restoringId, setRestoringId] = useState(null)

  // Modal hapus ulasan
  const [reviewToDelete, setReviewToDelete] = useState(null)
  const [moderationNote, setModerationNote] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  // Modal detail ulasan
  const [reviewToView, setReviewToView] = useState(null)
  const [reviewPhotoIndex, setReviewPhotoIndex] = useState(0)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    logoutAdmin(navigate)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      if (activeTab === 'katalog') {
        const data = await fetchAdminEquipments()
        setEquipments(Array.isArray(data.equipments) ? data.equipments : [])
      } else {
        const data = await fetchAdminReviews()
        setReviews(Array.isArray(data.reviews) ? data.reviews : [])
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data moderasi.')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTabChange = (key) => {
    if (key === activeTab) return
    setActiveTab(key)
    setKeyword('')
    setError('')
    setSuccessMessage('')
  }

  const filteredEquipments = useMemo(() => {
    const lowered = keyword.trim().toLowerCase()
    if (!lowered) return equipments
    return equipments.filter((item) => {
      const haystack = [
        item.id,
        item.name,
        item.category,
        item.status,
        item.owner?.fullName,
        item.owner?.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(lowered)
    })
  }, [equipments, keyword])

  const filteredReviews = useMemo(() => {
    const lowered = keyword.trim().toLowerCase()
    if (!lowered) return reviews
    return reviews.filter((item) => {
      const haystack = [
        item.order?.invoiceNumber,
        item.order?.id,
        item.orderId,
        item.user?.fullName,
        item.user?.email,
        item.equipment?.name,
        item.comment,
        item.rating
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(lowered)
    })
  }, [reviews, keyword])

  const openPreviewModal = (equipment) => {
    setEquipmentToPreview(equipment)
    setEquipmentPhotoIndex(0)
  }

  const closePreviewModal = () => {
    setEquipmentToPreview(null)
    setEquipmentPhotoIndex(0)
  }

  const openTakedownModal = (equipment) => {
    setEquipmentToTakedown(equipment)
    setTakedownReason('')
    setTakedownError('')
    setSuccessMessage('')
  }

  const handleTakedownFromPreview = () => {
    const equipment = equipmentToPreview
    closePreviewModal()
    if (equipment) openTakedownModal(equipment)
  }

  const closeTakedownModal = () => {
    if (isSubmittingTakedown) return
    setEquipmentToTakedown(null)
    setTakedownReason('')
    setTakedownError('')
  }

  const handleTakedownSubmit = async (event) => {
    event.preventDefault()
    if (!equipmentToTakedown) return

    const reason = takedownReason.trim()
    if (!reason) {
      setTakedownError('Alasan takedown wajib diisi.')
      return
    }

    setIsSubmittingTakedown(true)
    setTakedownError('')
    try {
      await takedownEquipment(equipmentToTakedown.id, reason)
      setSuccessMessage(
        `Alat "${equipmentToTakedown.name}" berhasil ditakedown dan disembunyikan dari katalog publik.`
      )
      setEquipmentToTakedown(null)
      setTakedownReason('')
      await loadData()
    } catch (err) {
      setTakedownError(err.message || 'Gagal melakukan takedown alat.')
    } finally {
      setIsSubmittingTakedown(false)
    }
  }

  const handleRestore = async (equipment) => {
    setRestoringId(equipment.id)
    setError('')
    setSuccessMessage('')
    try {
      await restoreEquipment(equipment.id)
      setSuccessMessage(`Status takedown alat "${equipment.name}" berhasil dicabut.`)
      await loadData()
    } catch (err) {
      setError(err.message || 'Gagal memulihkan alat.')
    } finally {
      setRestoringId(null)
    }
  }

  const handleRestoreFromPreview = () => {
    const equipment = equipmentToPreview
    closePreviewModal()
    if (equipment) handleRestore(equipment)
  }

  const openDetailModal = (review) => {
    setReviewToView(review)
    setReviewPhotoIndex(0)
  }

  const closeDetailModal = () => {
    setReviewToView(null)
    setReviewPhotoIndex(0)
  }

  const openDeleteModal = (review) => {
    setReviewToDelete(review)
    setModerationNote('')
    setDeleteError('')
    setSuccessMessage('')
  }

  const handleDeleteFromDetail = () => {
    const review = reviewToView
    closeDetailModal()
    if (review) openDeleteModal(review)
  }

  const closeDeleteModal = () => {
    if (isSubmittingDelete) return
    setReviewToDelete(null)
    setModerationNote('')
    setDeleteError('')
  }

  const handleDeleteSubmit = async (event) => {
    event.preventDefault()
    if (!reviewToDelete) return

    setIsSubmittingDelete(true)
    setDeleteError('')
    try {
      await deleteReview(reviewToDelete.id, moderationNote.trim())
      setSuccessMessage('Ulasan berhasil dihapus dan disembunyikan dari penilaian publik.')
      setReviewToDelete(null)
      setModerationNote('')
      await loadData()
    } catch (err) {
      setDeleteError(err.message || 'Gagal menghapus ulasan.')
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  const renderEquipmentStatus = (row) => {
    if (row.isTakedownByAdmin) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
          Ditakedown
        </span>
      )
    }

    const meta = STATUS_EQUIPMENT[row.status] || {
      label: row.status || 'Tidak diketahui',
      className: 'bg-slate-100 border-slate-200 text-slate-600',
      dot: 'bg-slate-400'
    }

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${meta.dot}`} />
        {meta.label}
      </span>
    )
  }

  const totalData = activeTab === 'katalog' ? equipments.length : reviews.length

  const detailUser = reviewToView?.user || {}
  const detailEquipment = reviewToView?.equipment || {}
  const detailOrder = reviewToView?.order || {}
  const detailPhotos = normalizeImageList(detailEquipment.images)
  const activeDetailPhotoIndex = detailPhotos[reviewPhotoIndex] ? reviewPhotoIndex : 0
  const activeDetailPhoto = detailPhotos[activeDetailPhotoIndex] || ''
  const detailInitials = (detailUser.fullName || 'Pengguna')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const detailVerification = VERIFICATION_STATUS[detailUser.verificationStatus] || null

  const previewPhotos = normalizeImageList(equipmentToPreview?.images)
  const activePreviewPhotoIndex = previewPhotos[equipmentPhotoIndex] ? equipmentPhotoIndex : 0
  const activePreviewPhoto = previewPhotos[activePreviewPhotoIndex] || ''

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row items-stretch">
      <AdminSidebar
        activeKey="moderasi"
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
            <Shield className="w-5 h-5 text-blue-600" />
            MyRent HQ
          </button>
          <div className="flex items-center gap-2">
            <select
              value="moderasi"
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

        <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Portal Admin</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-semibold text-slate-900">Moderasi Platform</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700">
                <Shield className="w-3.5 h-3.5" />
                Pusat Moderasi
              </div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
                Moderasi Platform
              </h1>
              <p className="text-sm text-slate-500">
                {totalData} data pada tab ini · awasi katalog alat dan ulasan pengguna yang melanggar ketentuan.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-[380px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={
                    activeTab === 'katalog'
                      ? 'Cari nama alat, ID, atau pemilik...'
                      : 'Cari order, penulis, alat, atau isi ulasan...'
                  }
                  className="w-full h-11 pl-11 pr-4 rounded-[10px] bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                title="Muat ulang data"
                className="shrink-0 h-11 w-11 rounded-[10px] bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 w-fit bg-white rounded-xl border border-slate-200">
            {TABS.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.key
              const count = item.key === 'katalog' ? equipments.length : reviews.length

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleTabChange(item.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-300' : 'text-slate-400'}`} />
                  {item.label}
                  <span
                    className={`tabular-nums text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-slate-800 text-blue-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Notifikasi sukses */}
          {successMessage ? (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1">{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={loadData}
                className="text-sm font-semibold underline cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          ) : null}

          {/* Table Container */}
          <div className="w-full bg-white rounded-[14px] border border-slate-200 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-600">
                  Memuat {activeTab === 'katalog' ? 'katalog alat' : 'ulasan pengguna'}...
                </p>
              </div>
            ) : (
              <>
                {activeTab === 'katalog' && filteredEquipments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr className="text-xs font-bold tracking-wider uppercase">
                          <th className="py-3.5 px-6">ID Alat</th>
                          <th className="py-3.5 px-6">Nama</th>
                          <th className="py-3.5 px-6">Pemilik</th>
                          <th className="py-3.5 px-6">Harga</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEquipments.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-6 align-top">
                              <span
                                className="block max-w-[150px] truncate text-[11px] font-mono font-semibold text-slate-500"
                                title={row.id}
                              >
                                {row.id || '—'}
                              </span>
                            </td>

                            <td className="py-4 px-6 align-top max-w-[260px]">
                              <div className="flex flex-col gap-1">
                                <span
                                  className="text-sm font-bold text-slate-900 line-clamp-2"
                                  title={row.name}
                                >
                                  {row.name || 'Tanpa nama'}
                                </span>
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                                  {row.category || 'Tanpa kategori'}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-6 align-top max-w-[220px]">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-slate-800 truncate">
                                  {row.owner?.fullName || 'Pemilik tidak diketahui'}
                                </span>
                                <span className="text-[11px] text-slate-400 truncate">
                                  {row.owner?.email || '—'}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-6 align-top">
                              <div className="text-sm font-bold text-slate-900 tabular-nums">
                                {formatRupiah(row.pricePerDay)}
                              </div>
                              <div className="text-[11px] text-slate-400">per hari</div>
                            </td>

                            <td className="py-4 px-6 align-top">
                              {renderEquipmentStatus(row)}
                              {row.isTakedownByAdmin && row.takedownReason ? (
                                <p
                                  className="mt-1.5 max-w-[190px] text-[11px] text-red-500 line-clamp-2"
                                  title={row.takedownReason}
                                >
                                  {row.takedownReason}
                                </p>
                              ) : null}
                            </td>

                            <td className="py-4 px-6 align-top text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openPreviewModal(row)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Preview</span>
                                </button>

                                {row.isTakedownByAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRestore(row)}
                                    disabled={restoringId === row.id}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {restoringId === row.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                    <span>Pulihkan</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openTakedownModal(row)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Takedown</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {activeTab === 'ulasan' && filteredReviews.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr className="text-xs font-bold tracking-wider uppercase">
                          <th className="py-3.5 px-6">Order ID</th>
                          <th className="py-3.5 px-6">Penulis</th>
                          <th className="py-3.5 px-6">Alat</th>
                          <th className="py-3.5 px-6">Rating</th>
                          <th className="py-3.5 px-6">Isi Ulasan</th>
                          <th className="py-3.5 px-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReviews.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-6 align-top">
                              <span
                                className="text-xs font-mono font-bold text-slate-900"
                                title={row.order?.id || row.orderId}
                              >
                                {row.order?.invoiceNumber || shortId(row.order?.id || row.orderId)}
                              </span>
                            </td>

                            <td className="py-4 px-6 align-top max-w-[220px]">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-slate-900 truncate">
                                  {row.user?.fullName || 'Pengguna'}
                                </span>
                                <span className="text-[11px] text-slate-400 truncate">
                                  {row.user?.email || '—'}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-6 align-top max-w-[220px]">
                              <span
                                className="text-sm font-semibold text-slate-800 line-clamp-2"
                                title={row.equipment?.name}
                              >
                                {row.equipment?.name || '—'}
                              </span>
                            </td>

                            <td className="py-4 px-6 align-top">
                              <div className="inline-flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-sm font-bold text-slate-900 tabular-nums">
                                  {row.rating}
                                </span>
                                <span className="text-xs text-slate-400">/5</span>
                              </div>
                            </td>

                            <td className="py-4 px-6 align-top max-w-[340px]">
                              <p
                                className="text-sm text-slate-700 line-clamp-3"
                                title={row.comment}
                              >
                                {row.comment || '—'}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {row.isDeleted ? (
                                  <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                    Dihapus
                                  </span>
                                ) : null}
                                {row.isFlagged && !row.isDeleted ? (
                                  <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    Ditandai
                                  </span>
                                ) : null}
                              </div>
                              {row.isDeleted && row.moderationNote ? (
                                <p
                                  className="mt-1 text-[11px] text-slate-400 italic line-clamp-1"
                                  title={row.moderationNote}
                                >
                                  {row.moderationNote}
                                </p>
                              ) : null}
                            </td>

                            <td className="py-4 px-6 align-top text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openDetailModal(row)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Detail Ulasan</span>
                                </button>
                                {row.isDeleted ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                    <Ban className="w-3.5 h-3.5" />
                                    Sudah dihapus
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(row)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {(activeTab === 'katalog' ? filteredEquipments.length : filteredReviews.length) === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-base font-bold text-slate-800">
                      {keyword
                        ? 'Tidak ada data yang cocok'
                        : activeTab === 'katalog'
                          ? 'Belum ada alat di katalog'
                          : 'Belum ada ulasan pengguna'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {keyword
                        ? 'Coba ubah kata kunci pencarian Anda.'
                        : activeTab === 'katalog'
                          ? 'Alat yang diunggah pemilik akan muncul di sini untuk diawasi oleh admin.'
                          : 'Ulasan dari penyewa setelah menyelesaikan pesanan akan muncul di sini.'}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal Preview Alat */}
      {equipmentToPreview ? (
        <ModalShell
          title="Preview Alat"
          subtitle={equipmentToPreview.name || 'Detail alat'}
          onClose={closePreviewModal}
          maxWidthClass="max-w-3xl"
        >
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]">
              {/* Galeri foto */}
              <div className="space-y-2">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <EquipmentPhoto
                    src={activePreviewPhoto}
                    alt={equipmentToPreview.name || 'Foto alat'}
                    className="h-full w-full object-cover"
                  />
                </div>

                {previewPhotos.length > 1 ? (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {previewPhotos.map((photo, index) => (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={() => setEquipmentPhotoIndex(index)}
                        className={`h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-colors ${
                          index === activePreviewPhotoIndex
                            ? 'border-blue-600'
                            : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        <EquipmentPhoto
                          src={photo}
                          alt={`Foto alat ${index + 1}`}
                          className="h-full w-full object-cover"
                          compact
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Ringkasan alat */}
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {renderEquipmentStatus(equipmentToPreview)}
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {equipmentToPreview.category || 'Tanpa kategori'}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold leading-tight text-slate-900">
                    {equipmentToPreview.name || 'Alat tanpa nama'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    ID Alat:{' '}
                    <span className="font-mono" title={equipmentToPreview.id}>
                      {equipmentToPreview.id || '—'}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-slate-400">Harga Sewa</span>
                    <p className="mt-0.5 font-bold text-slate-900 tabular-nums">
                      {formatRupiah(equipmentToPreview.pricePerDay)}
                      <span className="ml-1 text-[11px] font-normal text-slate-500">/hari</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-slate-400">Deposit</span>
                    <p className="mt-0.5 font-bold text-slate-900 tabular-nums">
                      {formatRupiah(equipmentToPreview.deposit)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pemilik Alat
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {equipmentToPreview.owner?.fullName || 'Pemilik tidak diketahui'}
                  </p>
                  <p className="truncate text-slate-500" title={equipmentToPreview.owner?.email}>
                    {equipmentToPreview.owner?.email || '—'}
                  </p>
                  {equipmentToPreview.owner?.phone ? (
                    <p className="text-slate-500">{equipmentToPreview.owner.phone}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Deskripsi lengkap */}
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Deskripsi Lengkap
              </h3>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                  {equipmentToPreview.description || 'Belum ada deskripsi alat.'}
                </p>
              </div>
            </section>

            {/* Spesifikasi singkat */}
            <section className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-slate-400">Daya</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {equipmentToPreview.powerWatt ? `${equipmentToPreview.powerWatt} W` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-slate-400">Berat</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {equipmentToPreview.weightKg ? `${equipmentToPreview.weightKg} kg` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-slate-400">Kondisi</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {equipmentToPreview.condition || '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <span className="text-slate-400">Lokasi</span>
                <p className="mt-0.5 truncate font-semibold text-slate-800" title={equipmentToPreview.location}>
                  {equipmentToPreview.location || '—'}
                </p>
              </div>
            </section>

            {equipmentToPreview.isTakedownByAdmin && equipmentToPreview.takedownReason ? (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Alat sedang ditakedown</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words">
                    {equipmentToPreview.takedownReason}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
            <span className="text-[10px] text-slate-400">
              Katalog Alat · Moderasi Platform
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closePreviewModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {equipmentToPreview.isTakedownByAdmin ? (
                <button
                  type="button"
                  onClick={handleRestoreFromPreview}
                  disabled={restoringId === equipmentToPreview.id}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {restoringId === equipmentToPreview.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  <span>Pulihkan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTakedownFromPreview}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Takedown Alat</span>
                </button>
              )}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* Modal Takedown Alat */}
      {equipmentToTakedown ? (
        <ModalShell
          title="Takedown Alat"
          subtitle={equipmentToTakedown.name}
          onClose={closeTakedownModal}
        >
          <form onSubmit={handleTakedownSubmit}>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Alat akan disembunyikan dari katalog publik dan statusnya diubah menjadi{' '}
                  <strong>NONAKTIF</strong>. Tindakan ini tercatat pada audit log admin.
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">
                  Alasan takedown <span className="text-red-500">*</span>
                </span>
                <textarea
                  value={takedownReason}
                  onChange={(e) => setTakedownReason(e.target.value)}
                  rows={4}
                  placeholder="Contoh: Alat tidak sesuai deskripsi dan berpotensi membahayakan penyewa."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
              </label>

              {takedownError ? (
                <p className="text-xs font-semibold text-red-600">{takedownError}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeTakedownModal}
                disabled={isSubmittingTakedown}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingTakedown || !takedownReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingTakedown ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                <span>{isSubmittingTakedown ? 'Memproses...' : 'Takedown Alat'}</span>
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {/* Modal Hapus Ulasan */}
      {reviewToDelete ? (
        <ModalShell
          title="Hapus Ulasan"
          subtitle={`${reviewToDelete.user?.fullName || 'Pengguna'} · ${reviewToDelete.equipment?.name || 'Alat'}`}
          onClose={closeDeleteModal}
        >
          <form onSubmit={handleDeleteSubmit}>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`w-3.5 h-3.5 ${
                        index < reviewToDelete.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs font-bold text-slate-700">
                    {reviewToDelete.rating}/5
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700 line-clamp-4">
                  &ldquo;{reviewToDelete.comment || 'Tanpa isi ulasan'}&rdquo;
                </p>
              </div>

              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Ulasan akan dihapus secara lunak (soft-delete) dan disembunyikan dari penilaian
                  publik. Data tetap tersimpan untuk kebutuhan audit.
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">
                  Catatan moderasi <span className="font-normal text-slate-400">(opsional)</span>
                </span>
                <textarea
                  value={moderationNote}
                  onChange={(e) => setModerationNote(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Mengandung ujaran kebencian dan spam."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
              </label>

              {deleteError ? (
                <p className="text-xs font-semibold text-red-600">{deleteError}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isSubmittingDelete}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDelete ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isSubmittingDelete ? 'Menghapus...' : 'Hapus Ulasan'}</span>
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {/* Modal Detail Ulasan */}
      {reviewToView ? (
        <ModalShell
          title="Detail Ulasan"
          subtitle={`${detailOrder.invoiceNumber || shortId(detailOrder.id)} · ${detailEquipment.name || 'Alat'}`}
          onClose={closeDetailModal}
          maxWidthClass="max-w-3xl"
        >
          <div className="space-y-5 px-6 py-5">
            {/* Informasi penulis ulasan */}
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Informasi Penulis Ulasan
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900">
                    <span className="text-sm font-bold text-white">{detailInitials}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {detailUser.fullName || 'Pengguna'}
                      </span>
                      {detailUser.role ? (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {ROLE_LABEL[detailUser.role] || detailUser.role}
                        </span>
                      ) : null}
                      {detailVerification ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${detailVerification.className}`}
                        >
                          <BadgeCheck className="h-3 w-3" />
                          {detailVerification.label}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-x-5 gap-y-1.5 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate" title={detailUser.email}>
                          {detailUser.email || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{detailUser.phone || '—'}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate font-mono text-[11px]" title={detailUser.id}>
                          {detailUser.id || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>Bergabung {formatDate(detailUser.createdAt)}</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </section>

            {/* Barang yang disewa */}
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Barang yang Disewa
              </h3>
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <EquipmentPhoto
                      src={activeDetailPhoto}
                      alt={detailEquipment.name || 'Foto alat'}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {detailPhotos.length > 1 ? (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      {detailPhotos.map((photo, index) => (
                        <button
                          key={`${photo}-${index}`}
                          type="button"
                          onClick={() => setReviewPhotoIndex(index)}
                          className={`h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-colors ${
                            index === activeDetailPhotoIndex
                              ? 'border-blue-600'
                              : 'border-transparent hover:border-slate-300'
                          }`}
                        >
                          <EquipmentPhoto
                            src={photo}
                            alt={`Foto alat ${index + 1}`}
                            className="h-full w-full object-cover"
                            compact
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 space-y-2.5">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {detailEquipment.name || 'Alat tidak diketahui'}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                      {detailEquipment.category || 'Tanpa kategori'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Tarif Sewa</span>
                      <p className="mt-0.5 font-bold text-slate-900 tabular-nums">
                        {formatRupiah(detailEquipment.pricePerDay)}
                        <span className="ml-1 text-[11px] font-normal text-slate-500">/hari</span>
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400">Pemilik</span>
                      <p
                        className="mt-0.5 truncate font-semibold text-slate-800"
                        title={detailEquipment.owner?.fullName}
                      >
                        {detailEquipment.owner?.fullName || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                    <p>
                      Order:{' '}
                      <span className="font-mono font-semibold text-slate-700">
                        {detailOrder.invoiceNumber || shortId(detailOrder.id)}
                      </span>
                    </p>
                    <p>
                      Periode:{' '}
                      <span className="font-semibold text-slate-700">
                        {formatDate(detailOrder.startDate)} — {formatDate(detailOrder.endDate)}
                      </span>
                      {detailOrder.rentalDays ? (
                        <span className="text-slate-400"> · {detailOrder.rentalDays} hari</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Isi ulasan utuh */}
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Isi Ulasan
              </h3>
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index < reviewToView.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="ml-1.5 text-sm font-bold text-slate-900">
                      {reviewToView.rating}/5
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(reviewToView.createdAt, true)}
                  </span>
                </div>

                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                  {reviewToView.comment || 'Tanpa isi ulasan.'}
                </p>

                {reviewToView.isDeleted || reviewToView.isFlagged ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {reviewToView.isDeleted ? (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        Dihapus
                      </span>
                    ) : null}
                    {reviewToView.isFlagged ? (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Ditandai
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {reviewToView.isDeleted && reviewToView.moderationNote ? (
                  <div className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-[11px] text-red-700">
                    <span className="font-bold">Catatan moderasi: </span>
                    <span className="whitespace-pre-wrap break-words">
                      {reviewToView.moderationNote}
                    </span>
                  </div>
                ) : null}

                {reviewToView.ownerReply ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] text-blue-800">
                    <span className="font-bold">Balasan pemilik: </span>
                    <span className="whitespace-pre-wrap break-words">{reviewToView.ownerReply}</span>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
            <span className="text-[10px] text-slate-400">
              Review ID: <span className="font-mono">{reviewToView.id}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeDetailModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {!reviewToView.isDeleted ? (
                <button
                  type="button"
                  onClick={handleDeleteFromDetail}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Ulasan</span>
                </button>
              ) : null}
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

function EquipmentPhoto({ src, alt, className = '', compact = false }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const hasSrc = typeof src === 'string' && src.trim().length > 0
  const isFailed = hasSrc && failedSrc === src

  if (!hasSrc || isFailed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 ${className}`}
      >
        <ImageOff className={compact ? 'h-3.5 w-3.5' : 'h-6 w-6'} />
        <span className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-semibold leading-tight`}>
          Tidak ada foto
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  )
}

function ModalShell({ title, subtitle, onClose, children, maxWidthClass = 'max-w-lg' }) {
  // Cegah halaman di belakang modal ikut ter-scroll selama modal terbuka.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow || 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-slate-100 bg-white px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-slate-500" title={subtitle}>
                {subtitle}
              </p>
            ) : null}
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
