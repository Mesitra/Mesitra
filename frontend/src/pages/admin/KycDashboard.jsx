import { useState, useEffect } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import KycDocumentModal from '../../components/admin/KycDocumentModal'
import { apiRequest, API_ENDPOINTS } from '../../lib/apiClient'

const STATUS_TABS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'MENUNGGU', label: 'Menunggu' },
  { id: 'PERLU_PERBAIKAN', label: 'Perlu Perbaikan' },
  { id: 'DISETUJUI', label: 'Disetujui' }
]

const STATUS_BADGES = {
  MENUNGGU: 'bg-amber-50 text-amber-700 border-amber-200',
  PERLU_PERBAIKAN: 'bg-rose-50 text-rose-700 border-rose-200',
  DISETUJUI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DITOLAK: 'bg-slate-100 text-slate-700 border-slate-300'
}

export default function KycDashboard() {
  const [activeTab, setActiveTab] = useState('ALL')
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const fetchSubmissions = async (status = null) => {
    setLoading(true)
    try {
      const endpoint = status && status !== 'ALL' 
        ? `${API_ENDPOINTS.adminSubmissions}?status=${status}`
        : API_ENDPOINTS.adminSubmissions
      
      const data = await apiRequest(endpoint)
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Error fetch submissions:', err)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Antrean Verifikasi KYC</h2>
          <p className="text-sm text-slate-500 mt-1">
            Tinjau dokumen identitas dan legalitas UMKM
          </p>
        </div>
        <button
          onClick={() => fetchSubmissions(activeTab)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">Memuat data...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm">Tidak ada pengajuan pada status ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Nama Lengkap
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Tipe Akun
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Waktu Pengajuan
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.fullName || '-'}</p>
                        <p className="text-xs text-slate-500">{item.email || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700 font-medium">
                        {item.role === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa UMKM'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                          STATUS_BADGES[item.verificationStatus] || STATUS_BADGES.MENUNGGU
                        }`}
                      >
                        {item.verificationStatus === 'MENUNGGU' && 'Menunggu'}
                        {item.verificationStatus === 'PERLU_PERBAIKAN' && 'Perlu Perbaikan'}
                        {item.verificationStatus === 'DISETUJUI' && 'Disetujui'}
                        {item.verificationStatus === 'DITOLAK' && 'Ditolak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTinjauClick(item.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Tinjau Dokumen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedSubmissionId && (
        <KycDocumentModal
          submissionId={selectedSubmissionId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
