import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, RefreshCw, AlertCircle, Inbox, DollarSign, Layers } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import StatusBadgeWithdrawal from './StatusBadgeWithdrawal'
import ModalApproveWithdrawal from './ModalApproveWithdrawal'
import ModalRejectWithdrawal from './ModalRejectWithdrawal'
import { logoutAdmin } from '../adminAuth/adminSession'
import { fetchWithdrawals } from './adminApi'

const TAB_WITHDRAWALS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'MENUNGGU', label: 'Menunggu' },
  { key: 'DIPROSES', label: 'Diproses' },
  { key: 'SELESAI', label: 'Selesai' },
  { key: 'DITOLAK', label: 'Ditolak' }
]

const ADMIN_PATHS = {
  verifikasi: '/admin/kyc',
  'manajemen-pengguna': '/admin/manajemen-pengguna',
  pencairan: '/admin/pencairan-dana',
  mediasi: '/admin/mediasi-sengketa',
  moderasi: '/admin/moderasi',
  'manajemen-tim': '/admin/manajemen-tim'
}

export default function AdminPencairanDana({ onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isInsideAdminLayout = location.pathname.startsWith('/admin')

  const [tab, setTab] = useState('MENUNGGU')
  const [keyword, setKeyword] = useState('')
  const [withdrawals, setWithdrawals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [modalApprove, setModalApprove] = useState(false)
  const [modalReject, setModalReject] = useState(false)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    logoutAdmin(navigate)
  }

  const loadWithdrawals = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchWithdrawals(tab === 'ALL' ? '' : tab, keyword)
      setWithdrawals(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar pencairan dana.')
    } finally {
      setIsLoading(false)
    }
  }, [tab, keyword])

  useEffect(() => {
    loadWithdrawals()
  }, [loadWithdrawals])

  const daftarTersaring = useMemo(() => {
    const lowered = keyword.trim().toLowerCase()
    return withdrawals.filter((item) => {
      const cocokTab = tab === 'ALL' || item.status === tab
      const haystack = [
        item.withdrawalCode,
        item.user?.fullName,
        item.user?.email,
        item.bankName,
        item.accountNumber,
        item.accountHolder
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const cocokKata = !lowered || haystack.includes(lowered)
      return cocokTab && cocokKata
    })
  }, [withdrawals, tab, keyword])

  const jumlahMenunggu = withdrawals.filter((item) => item.status === 'MENUNGGU').length
  const jumlahPerTab = (key) =>
    key === 'ALL' ? withdrawals.length : withdrawals.filter((row) => row.status === key).length

  const handleOpenApprove = (item) => {
    setSelectedItem(item)
    setModalApprove(true)
  }

  const handleOpenReject = (item) => {
    setSelectedItem(item)
    setModalReject(true)
  }

  const handleSuccess = () => {
    setModalApprove(false)
    setModalReject(false)
    setSelectedItem(null)
    loadWithdrawals()
  }

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const mainContent = (
    <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Portal Admin</span>
        <span className="text-xs text-slate-400">/</span>
        <span className="text-xs font-semibold text-slate-900">Pencairan Dana</span>
      </div>

      {/* 2. Header & Toolbar Pencarian */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700">
            <DollarSign className="w-3.5 h-3.5" />
            Finansial &amp; Pencairan Saldo
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
            Pencairan Dana
          </h1>
          <p className="text-sm text-slate-500">
            {jumlahMenunggu} pengajuan menunggu pemrosesan · target respons 1 × 24 jam
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[260px] md:w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari kode, nama, bank..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={loadWithdrawals}
            disabled={isLoading}
            title="Muat ulang data"
            className="shrink-0 h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Filter Tabs (Pill Rounded) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {TAB_WITHDRAWALS.map((item) => {
            const isActive = tab === item.key
            const jumlah = jumlahPerTab(item.key)

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
                <span
                  className={`ml-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {jumlah}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            type="button"
            onClick={loadWithdrawals}
            className="text-xs font-bold underline cursor-pointer hover:text-red-950"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 4. Tabel Pencairan Dana */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Kode Penarikan</th>
                <th className="py-3.5 px-6">Pemohon</th>
                <th className="py-3.5 px-6">Nominal</th>
                <th className="py-3.5 px-6">Tujuan Transfer</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-slate-500">Memuat daftar pencairan dana...</p>
                    </div>
                  </td>
                </tr>
              ) : daftarTersaring.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {keyword ? 'Tidak ada pencairan yang cocok' : 'Belum ada pengajuan pencairan'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {keyword
                          ? `Tidak ditemukan pencairan dana dengan kata kunci "${keyword}". Coba kata kunci lain.`
                          : 'Pengajuan penarikan dana dari pemilik alat akan muncul di sini untuk diverifikasi.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                daftarTersaring.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Kode Penarikan */}
                    <td className="py-4 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono font-bold tabular-nums text-slate-900">
                          {row.withdrawalCode}
                        </span>
                        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
                      </div>
                    </td>

                    {/* Pemohon */}
                    <td className="py-4 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-slate-900 leading-tight">
                          {row.user?.fullName || '—'}
                        </span>
                        <span className="text-xs text-slate-500">{row.user?.email || '—'}</span>
                      </div>
                    </td>

                    {/* Nominal */}
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold tabular-nums text-slate-900">
                          {formatRupiah(row.amount)}
                        </span>
                      </div>
                    </td>

                    {/* Tujuan Transfer */}
                    <td className="py-4 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-slate-900">{row.bankName}</span>
                        <span className="text-xs font-mono text-slate-500">{row.accountNumber}</span>
                        <span className="text-xs text-slate-400">{row.accountHolder}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 align-middle">
                      <StatusBadgeWithdrawal status={row.status} />
                    </td>

                    {/* Aksi */}
                    <td className="py-4 px-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === 'MENUNGGU' || row.status === 'DIPROSES' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenReject(row)}
                              className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                            >
                              Tolak
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenApprove(row)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                            >
                              Cairkan
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            {row.status === 'SELESAI' ? 'Sudah dicairkan' : 'Ditolak'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )

  return (
    <>
      {isInsideAdminLayout ? (
        <div className="w-full">{mainContent}</div>
      ) : (
        <div className="min-h-screen bg-slate-50 flex">
          <AdminSidebar
            activeKey="pencairan"
            counts={{ pencairan: jumlahMenunggu }}
            onLogout={handleLogout}
          />

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
                  value="pencairan"
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
      )}

      {selectedItem && (
        <>
          <ModalApproveWithdrawal
            isOpen={modalApprove}
            onClose={() => setModalApprove(false)}
            withdrawal={selectedItem}
            onSuccess={handleSuccess}
          />
          <ModalRejectWithdrawal
            isOpen={modalReject}
            onClose={() => setModalReject(false)}
            withdrawal={selectedItem}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </>
  )
}
