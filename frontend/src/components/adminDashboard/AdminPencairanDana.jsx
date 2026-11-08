import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, AlertCircle, Inbox, DollarSign } from 'lucide-react'
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

export default function AdminPencairanDana({ onLogout }) {
  const navigate = useNavigate()
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row items-stretch">
      <AdminSidebar
        activeKey="pencairan"
        onNavigate={(key) => {
          if (key === 'verifikasi') navigate('/portal-internal-hq/dashboard')
          if (key === 'pencairan') navigate('/portal-internal-hq/pencairan-dana')
          if (key === 'mediasi') navigate('/portal-internal-hq/mediasi-sengketa')
        }}
        counts={{ verifikasi: 0, pencairan: jumlahMenunggu }}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Portal Admin</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-semibold text-slate-900">Pencairan Dana</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
                Pencairan Dana
              </h1>
              <p className="text-sm text-slate-500">
                {jumlahMenunggu} pengajuan menunggu pemrosesan · target respons 1 × 24 jam
              </p>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-[380px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari kode, nama, bank..."
                  className="w-full h-11 pl-11 pr-4 rounded-[10px] bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={loadWithdrawals}
                disabled={isLoading}
                title="Muat ulang data"
                className="shrink-0 h-11 w-11 rounded-[10px] bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 w-fit bg-white rounded-xl border border-slate-200">
            {TAB_WITHDRAWALS.map((item) => {
              const isActive = tab === item.key
              const jumlah = jumlahPerTab(item.key)

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
                  <span className={`ml-2 tabular-nums ${isActive ? 'text-blue-300' : 'text-slate-500'}`}>
                    {jumlah}
                  </span>
                </button>
              )
            })}
          </div>

          {error ? (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={loadWithdrawals}
                className="text-sm font-semibold underline cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          ) : null}

          <div className="w-full bg-white rounded-[14px] border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Memuat daftar pencairan dana...</p>
              </div>
            ) : (
              <>
                {daftarTersaring.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr className="text-xs font-bold tracking-wider uppercase">
                          <th className="py-3 px-6">Kode Penarikan</th>
                          <th className="py-3 px-6">Pemohon</th>
                          <th className="py-3 px-6">Nominal</th>
                          <th className="py-3 px-6">Tujuan Transfer</th>
                          <th className="py-3 px-6">Status</th>
                          <th className="py-3 px-6 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daftarTersaring.map((row) => (
                          <tr key={row.id} className="hover:bg-[#FAFBFC] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-mono font-bold tabular-nums text-slate-900">
                                  {row.withdrawalCode}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {formatDate(row.createdAt)}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-slate-900">
                                  {row.user?.fullName || '—'}
                                </span>
                                <span className="text-xs text-slate-500">{row.user?.email || '—'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="text-base font-bold tabular-nums text-slate-900">
                                  {formatRupiah(row.amount)}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-slate-900">{row.bankName}</span>
                                <span className="text-xs font-mono text-slate-500">{row.accountNumber}</span>
                                <span className="text-xs text-slate-500">{row.accountHolder}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <StatusBadgeWithdrawal status={row.status} />
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-end gap-2">
                                {row.status === 'MENUNGGU' || row.status === 'DIPROSES' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReject(row)}
                                      className="px-3 py-1.5 rounded-[9px] border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                                    >
                                      Tolak
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenApprove(row)}
                                      className="px-3 py-1.5 rounded-[9px] bg-green-700 text-xs font-bold text-white hover:bg-green-800 transition-colors cursor-pointer"
                                    >
                                      Cairkan
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    {row.status === 'SELESAI' ? 'Sudah dicairkan' : 'Ditolak'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {daftarTersaring.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-14 text-center">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
                      <Inbox className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">
                      {withdrawals.length === 0
                        ? 'Belum ada pengajuan pencairan'
                        : 'Tidak ada data pada tab ini'}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>

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
    </div>
  )
}
