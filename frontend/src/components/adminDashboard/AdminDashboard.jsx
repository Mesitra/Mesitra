import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Search, ChevronRight, Inbox, ArrowLeft, Layers, RefreshCw, AlertCircle } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import StatusBadge from './StatusBadge'
import { logoutAdmin } from '../adminAuth/adminSession'
import { fetchSubmissions } from './adminApi'
import { formatRelativeTime } from '../../lib/registration'
import {
  STATUS_MENUNGGU,
  TAB_PENGAJUAN
} from './adminDashboardData'


/**
 * Dashboard Admin HQ — tabel daftar pengajuan (tab Semua / Menunggu / Perlu
 * perbaikan / Disetujui / Ditolak).
 *
 * Data diambil langsung dari MySQL melalui `GET /api/admin/submissions`
 * (JWT admin), bukan data dummy.
 *
 * @param {function} props.onLogout - callback logout opsional (bila tidak provided dipakai default)
 */
export default function AdminDashboard({ onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeMenu = searchParams.get('tab') || 'verifikasi'

  const [tab, setTab] = useState('SEMUA')
  const [keyword, setKeyword] = useState('')
  const [pengajuan, setPengajuan] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'mediasi') {
      navigate('/portal-internal-hq/mediasi-sengketa', { replace: true })
    } else if (tabParam === 'pencairan') {
      navigate('/portal-internal-hq/pencairan-dana', { replace: true })
    }
  }, [searchParams, navigate])

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    logoutAdmin(navigate)
  }

  const handleNavigateMenu = (menuKey) => {
    if (menuKey === 'verifikasi' || menuKey === '/portal-internal-hq/dashboard') {
      navigate('/portal-internal-hq/dashboard')
    } else if (menuKey === 'pencairan' || menuKey === '/portal-internal-hq/pencairan-dana') {
      navigate('/portal-internal-hq/pencairan-dana')
    } else if (menuKey === 'mediasi' || menuKey === '/portal-internal-hq/mediasi-sengketa') {
      navigate('/portal-internal-hq/mediasi-sengketa')
    } else {
      setSearchParams({ tab: menuKey })
    }
  }

  const BREADCRUMB_TITLES = {
    verifikasi: 'Verifikasi Akun',
    pencairan: 'Pencairan Dana',
    mediasi: 'Mediasi Sengketa',
    '/portal-internal-hq/dashboard': 'Verifikasi Akun',
    '/portal-internal-hq/pencairan-dana': 'Pencairan Dana',
    '/portal-internal-hq/mediasi-sengketa': 'Mediasi Sengketa'
  }

  const loadPengajuan = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchSubmissions()
      setPengajuan(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar pengajuan.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPengajuan()
  }, [loadPengajuan])

  const daftarTersaring = useMemo(() => {
    const lowered = keyword.trim().toLowerCase()

    return pengajuan.filter((item) => {
      const cocokTab = tab === 'SEMUA' || item.verificationStatus === tab
      const haystack = [
        item.nama,
        item.submissionCode,
        item.email,
        item.lokasi,
        item.fullName,
        item.tipe
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const cocokKata = !lowered || haystack.includes(lowered)

      return cocokTab && cocokKata
    })
  }, [pengajuan, tab, keyword])

  const jumlahAntrean = pengajuan.filter((item) => item.verificationStatus === STATUS_MENUNGGU).length

  const jumlahPerTab = (key) =>
    key === 'SEMUA' ? pengajuan.length : pengajuan.filter((row) => row.verificationStatus === key).length

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row items-stretch">
      <AdminSidebar
        activeKey={activeMenu}
        onNavigate={handleNavigateMenu}
        counts={{ verifikasi: jumlahAntrean }}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile (sidebar disembunyikan di layar kecil) */}
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
              onChange={(e) => handleNavigateMenu(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
            >
              <option value="verifikasi">Verifikasi Akun</option>
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
            <span className="text-xs font-semibold text-slate-900">
              {BREADCRUMB_TITLES[location.pathname] || BREADCRUMB_TITLES[activeMenu] || 'Verifikasi Akun'}
            </span>
          </div>

          {activeMenu === 'verifikasi' && (
            <>
              {/* Judul + pencarian */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700">
                <Layers className="w-3.5 h-3.5" />
                Verifikasi Identitas &amp; Dokumen KYC
              </div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
                Verifikasi Akun
              </h1>
              <p className="text-sm text-slate-500">
                {jumlahAntrean} pengajuan menunggu tinjauan · rata-rata respons 1 × 24 jam kerja
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-[260px] md:w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama, kode, atau email..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={loadPengajuan}
                disabled={isLoading}
                title="Muat ulang data"
                className="shrink-0 h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tab filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {TAB_PENGAJUAN.map((item) => {
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
                    <span className={`ml-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {jumlah}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pesan error */}
          {error ? (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={loadPengajuan}
                className="text-sm font-semibold underline cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          ) : null}

          {/* Tabel pengajuan */}
          <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Pengajuan</th>
                    <th className="py-3.5 px-6">Pemohon</th>
                    <th className="py-3.5 px-6">Lokasi</th>
                    <th className="py-3.5 px-6 hidden xl:table-cell">Kelengkapan</th>
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
                          <p className="text-xs font-medium text-slate-500">Memuat daftar pengajuan...</p>
                        </div>
                      </td>
                    </tr>
                  ) : daftarTersaring.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                            <Inbox className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">
                            {pengajuan.length === 0
                              ? 'Belum ada pengajuan masuk'
                              : 'Tidak ada pengajuan pada tab ini'}
                          </p>
                          <p className="text-xs text-slate-500 max-w-sm">
                            {pengajuan.length === 0
                              ? 'Pengajuan dari Penyewa UMKM dan Pemilik Alat akan muncul di sini setelah dikirim.'
                              : 'Ubah kata kunci pencarian atau pilih tab lain.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    daftarTersaring.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono font-bold tabular-nums text-slate-900">
                              {row.submissionCode || row.id}
                            </span>
                            <span className="text-xs text-slate-500 tabular-nums">
                              Diajukan {formatRelativeTime(row.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 align-middle">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-sm font-bold text-slate-900">
                              {row.nama || row.fullName}
                            </span>
                            <span className="truncate text-xs text-slate-500">{row.tipe}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 align-middle">
                          <div className="flex max-w-[220px] flex-col gap-0.5">
                            <span className="truncate text-xs text-slate-700">{row.lokasi}</span>
                            <span className="truncate text-[11px] text-slate-400">{row.email}</span>
                          </div>
                        </td>
                        <td className="hidden py-4 px-6 xl:table-cell align-middle">
                          <span className="text-xs text-slate-600">{row.langkah}</span>
                        </td>
                        <td className="py-4 px-6 align-middle">
                          <StatusBadge status={row.verificationStatus} />
                        </td>
                        <td className="py-4 px-6 align-middle text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/portal-internal-hq/dashboard/pengajuan/${row.submissionCode || row.id}`
                              )
                            }
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600"
                          >
                            <span>Tinjau</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

        </main>
      </div>
    </div>
  )
}
