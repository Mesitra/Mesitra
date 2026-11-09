import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Eye,
  RefreshCw,
  Search,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers
} from 'lucide-react'
import KycDocumentModal from '../../components/admin/KycDocumentModal'
import AdminSidebar from '../../components/adminDashboard/AdminSidebar'
import { logoutAdmin } from '../../components/adminAuth/adminSession'
import { apiRequest, API_ENDPOINTS } from '../../lib/apiClient'

const STATUS_TABS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'MENUNGGU', label: 'Menunggu' },
  { id: 'PERLU_PERBAIKAN', label: 'Perlu Perbaikan' },
  { id: 'DISETUJUI', label: 'Disetujui' },
  { id: 'DITOLAK', label: 'Ditolak' }
]

const ADMIN_PATHS = {
  verifikasi: '/portal-internal-hq/dashboard',
  'manajemen-pengguna': '/portal-internal-hq/manajemen-pengguna',
  pencairan: '/portal-internal-hq/pencairan-dana',
  mediasi: '/portal-internal-hq/mediasi-sengketa',
  moderasi: '/portal-internal-hq/moderasi',
  'manajemen-tim': '/portal-internal-hq/manajemen-tim'
}

export default function KycDashboard({ onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isInsideAdminLayout = location.pathname.startsWith('/admin')

  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    logoutAdmin(navigate)
  }

  const fetchSubmissions = async (status = null) => {
    setLoading(true)
    setError('')
    try {
      const endpoint =
        status && status !== 'ALL'
          ? `${API_ENDPOINTS.adminSubmissions}?status=${status}`
          : API_ENDPOINTS.adminSubmissions

      const data = await apiRequest(endpoint)
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Error fetch submissions:', err)
      setError(err.message || 'Gagal memuat antrean verifikasi KYC.')
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions(activeTab)
  }, [activeTab])

  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
  }

  const handleTinjauClick = (submissionId) => {
    setSelectedSubmissionId(submissionId)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedSubmissionId(null)
    fetchSubmissions(activeTab) // refresh data
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Client-side search filtering
  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return submissions

    return submissions.filter((item) => {
      const haystack = [
        item.id,
        item.submissionCode,
        item.fullName,
        item.email,
        item.role,
        item.verificationStatus
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [submissions, searchQuery])

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Disetujui</span>
          </span>
        )
      case 'MENUNGGU':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
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
            <span>{status || 'Draft'}</span>
          </span>
        )
    }
  }

  const mainContent = (
    <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Portal Admin</span>
        <span className="text-xs text-slate-400">/</span>
        <span className="text-xs font-semibold text-slate-900">Verifikasi Akun</span>
      </div>

      {/* 2. Header & Toolbar Pencarian */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verifikasi Identitas &amp; Dokumen KYC
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] leading-tight text-slate-900">
            Verifikasi Akun
          </h1>
          <p className="text-sm text-slate-500">
            Tinjau dokumen identitas dan legalitas UMKM · pantau status verifikasi dan persetujuan akun
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[260px] md:w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, tipe..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchSubmissions(activeTab)}
            disabled={loading}
            title="Muat ulang data"
            className="shrink-0 h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Filter Tabs (Pill Rounded) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            type="button"
            onClick={() => fetchSubmissions(activeTab)}
            className="text-xs font-bold underline cursor-pointer hover:text-red-950"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 4. Tabel Pengajuan KYC */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Pemohon</th>
                <th className="py-3.5 px-6">Tipe Akun</th>
                <th className="py-3.5 px-6">Waktu Pengajuan</th>
                <th className="py-3.5 px-6">Status Verifikasi</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-slate-500">Memuat antrean verifikasi...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {searchQuery ? 'Tidak ada pengajuan yang cocok' : 'Belum ada pengajuan verifikasi'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchQuery
                          ? `Tidak ditemukan pengajuan dengan kata kunci "${searchQuery}". Coba kata kunci atau filter lain.`
                          : 'Pengajuan dokumen verifikasi KYC dari pengguna akan muncul di sini.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((item) => {
                  const isOwner = item.role === 'PEMILIK'
                  const initials = (item.fullName || 'User')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Pemohon */}
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
                            <p className="font-bold text-slate-900 leading-tight">
                              {item.fullName || '—'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{item.email || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tipe Akun */}
                      <td className="py-4 px-6 align-middle">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isOwner
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isOwner ? 'Pemilik Alat' : 'Penyewa UMKM'}
                        </span>
                      </td>

                      {/* Waktu Pengajuan */}
                      <td className="py-4 px-6 align-middle text-slate-600 text-xs tabular-nums">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Status Verifikasi */}
                      <td className="py-4 px-6 align-middle">
                        {renderStatusBadge(item.verificationStatus)}
                      </td>

                      {/* Tombol Aksi Tinjau */}
                      <td className="py-4 px-6 align-middle text-right">
                        <button
                          type="button"
                          onClick={() => handleTinjauClick(item.id)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Tinjau</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal KYC Document */}
      {showModal && selectedSubmissionId && (
        <KycDocumentModal submissionId={selectedSubmissionId} onClose={handleCloseModal} />
      )}
    </main>
  )

  if (isInsideAdminLayout) {
    return <div className="w-full">{mainContent}</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar activeKey="verifikasi" onLogout={handleLogout} />

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
              value="verifikasi"
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
