import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  ChevronRight,
  Inbox,
  ArrowLeft,
  Layers,
  RefreshCw,
  AlertCircle,
  Scale,
  Eye
} from 'lucide-react'
import AdminSidebar from '../../components/adminDashboard/AdminSidebar'
import { logoutAdmin } from '../../components/adminAuth/adminSession'
import { fetchDisputes } from '../../components/adminDashboard/adminApi'
import ModalArbitraseSengketa from '../../components/adminDashboard/ModalArbitraseSengketa'

const TAB_MEDIASI = [
  { key: 'AKTIF', label: 'Aktif' },
  { key: 'SELESAI', label: 'Selesai' }
]

const formatRupiah = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val || 0)
}

export default function AdminSengketa({ onLogout }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeMenu = searchParams.get('tab') || 'mediasi'

  const [tab, setTab] = useState('AKTIF')
  const [keyword, setKeyword] = useState('')
  const [disputes, setDisputes] = useState([])
  const [counts, setCounts] = useState({ aktif: 0, selesai: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal Arbitrase
  const [selectedDisputeId, setSelectedDisputeId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    logoutAdmin(navigate)
  }

  const loadDisputes = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchDisputes(tab, keyword)
      setDisputes(Array.isArray(data.disputes) ? data.disputes : [])
      if (data.counts) {
        setCounts(data.counts)
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar sengketa.')
    } finally {
      setIsLoading(false)
    }
  }, [tab, keyword])

  useEffect(() => {
    loadDisputes()
  }, [loadDisputes])

  const daftarTersaring = useMemo(() => {
    const lowered = keyword.trim().toLowerCase()
    return disputes.filter((item) => {
      const isAktif = ['OPEN', 'INVESTIGATING', 'ESCALATED_LEGAL', 'AKTIF'].includes(item.status)
      const cocokTab = tab === 'AKTIF' ? isAktif : !isAktif

      const haystack = [
        item.id,
        item.ticketNumber,
        item.order?.invoiceNumber,
        item.order?.equipment?.name,
        item.order?.equipment?.owner?.fullName,
        item.owner?.fullName,
        item.renter?.fullName,
        item.disputeReason,
        item.description
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const cocokKata = !lowered || haystack.includes(lowered)
      return cocokTab && cocokKata
    })
  }, [disputes, tab, keyword])

  const handleOpenModal = (disputeId) => {
    setSelectedDisputeId(disputeId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDisputeId(null)
  }

  const handleSuccessResolution = () => {
    loadDisputes()
  }

  const renderStatusBadge = (status) => {
    if (['OPEN', 'INVESTIGATING', 'ESCALATED_LEGAL', 'AKTIF'].includes(status)) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          Aktif
        </span>
      )
    }
    if (status === 'RESOLVED_OWNER_WIN') {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Pemilik Menang
        </span>
      )
    }
    if (status === 'RESOLVED_RENTER_WIN') {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-800">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
          Penyewa Menang
        </span>
      )
    }
    if (status === 'RESOLVED_SPLIT') {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs font-semibold text-purple-800">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5" />
          Bagi Adil (Split)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
        {status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row items-stretch">
      <AdminSidebar
        activeKey={activeMenu}
        onNavigate={(key) => {
          if (key === 'verifikasi') navigate('/portal-internal-hq/dashboard')
          if (key === 'pencairan') navigate('/portal-internal-hq/pencairan-dana')
          if (key === 'mediasi') navigate('/portal-internal-hq/mediasi-sengketa')
        }}
        counts={{ mediasi: counts.aktif }}
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
            <ArrowLeft className="w-4 h-4" />
            <Layers className="w-5 h-5 text-blue-600" />
            MyRent HQ
          </button>
          <div className="flex items-center gap-2">
            <select
              value={activeMenu}
              onChange={(e) => setSearchParams({ tab: e.target.value })}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
            >
              <option value="verifikasi">Verifikasi Akun</option>
              <option value="pencairan">Pencairan Dana</option>
              <option value="mediasi">Mediasi Sengketa</option>
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
            <span className="text-xs font-semibold text-slate-900">Mediasi Sengketa</span>
          </div>

          {/* Heading & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
                Mediasi Sengketa
              </h1>
              <p className="text-sm text-slate-500">
                {counts.aktif} sengketa aktif · admin memutuskan sengketa berdasarkan perbandingan bukti kondisi awal & akhir
              </p>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-[380px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari kode sengketa, nama pihak..."
                  className="w-full h-11 pl-11 pr-4 rounded-[10px] bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={loadDisputes}
                disabled={isLoading}
                title="Muat ulang data"
                className="shrink-0 h-11 w-11 rounded-[10px] bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabs Filter */}
          <div className="flex flex-wrap items-center gap-1 p-1 w-fit bg-white rounded-xl border border-slate-200">
            {TAB_MEDIASI.map((item) => {
              const isActive = tab === item.key
              const countBadge = item.key === 'AKTIF' ? counts.aktif : counts.selesai

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`px-4 py-2 rounded-[9px] text-sm font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  <span className={`ml-2 tabular-nums text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-slate-800 text-blue-300' : 'bg-slate-100 text-slate-600'}`}>
                    {countBadge}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Error Banner */}
          {error ? (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={loadDisputes}
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
                <p className="text-sm font-semibold text-slate-600">Memuat daftar sengketa...</p>
              </div>
            ) : (
              <>
                {daftarTersaring.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr className="text-xs font-bold tracking-wider uppercase">
                          <th className="py-3.5 px-6">Tiket Sengketa</th>
                          <th className="py-3.5 px-6">Alat & Pesanan</th>
                          <th className="py-3.5 px-6">Pihak Terkait</th>
                          <th className="py-3.5 px-6">Klaim & Deposit</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daftarTersaring.map((row) => {
                          const isAktif = ['OPEN', 'INVESTIGATING', 'ESCALATED_LEGAL', 'AKTIF'].includes(row.status)
                          const ownerName = row.order?.equipment?.owner?.fullName || row.owner?.fullName || '—'
                          const renterName = row.renter?.fullName || row.order?.user?.fullName || '—'
                          const equipmentName = row.order?.equipment?.name || 'Alat Disewa'
                          const deposit = row.order?.depositAmount || 0

                          return (
                            <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* Tiket */}
                              <td className="py-4 px-6 align-top">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-mono font-bold text-slate-900">
                                    {row.ticketNumber || row.id.slice(0, 8)}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(row.createdAt).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </td>

                              {/* Alat & Pesanan */}
                              <td className="py-4 px-6 align-top max-w-[240px]">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-bold text-slate-900 truncate" title={equipmentName}>
                                    {equipmentName}
                                  </span>
                                  <span className="text-xs text-slate-500 font-mono">
                                    {row.order?.invoiceNumber || '—'}
                                  </span>
                                  <p className="text-xs text-slate-600 line-clamp-1 italic mt-0.5">
                                    &ldquo;{row.disputeReason || row.description || 'Tidak ada catatan'}&rdquo;
                                  </p>
                                </div>
                              </td>

                              {/* Pihak Terkait */}
                              <td className="py-4 px-6 align-top">
                                <div className="flex flex-col gap-1.5 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                      Pemilik
                                    </span>
                                    <span className="font-semibold text-slate-800 truncate">{ownerName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                      Penyewa
                                    </span>
                                    <span className="font-semibold text-slate-800 truncate">{renterName}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Klaim & Deposit */}
                              <td className="py-4 px-6 align-top">
                                <div className="flex flex-col gap-1 text-xs">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-400">Klaim:</span>
                                    <span className="font-bold text-red-600">{formatRupiah(row.claimAmount)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-400">Deposit:</span>
                                    <span className="font-semibold text-slate-700">{formatRupiah(deposit)}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-4 px-6 align-top">
                                {renderStatusBadge(row.status)}
                              </td>

                              {/* Aksi */}
                              <td className="py-4 px-6 align-top text-right">
                                {isAktif ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModal(row.id)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-colors"
                                  >
                                    <Scale className="w-3.5 h-3.5" />
                                    <span>Putuskan</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModal(row.id)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Lihat Putusan</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {daftarTersaring.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-base font-bold text-slate-800">
                      {disputes.length === 0
                        ? 'Belum ada sengketa'
                        : 'Tidak ada sengketa pada tab ini'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {disputes.length === 0
                        ? 'Sengketa kerusakan alat antara pemilik dan penyewa akan muncul di sini untuk dimediasi oleh admin.'
                        : 'Coba ubah kata kunci pencarian atau buka tab status yang lain.'}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal Arbitrase Sengketa */}
      <ModalArbitraseSengketa
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        disputeId={selectedDisputeId}
        onSuccess={handleSuccessResolution}
      />
    </div>
  )
}
