import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Wallet, Eye, RefreshCw } from 'lucide-react'
import WithdrawalModal from '../../components/admin/WithdrawalModal'
import { apiRequest, API_ENDPOINTS } from '../../lib/apiClient'

const STATUS_BADGES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
}

export default function FinanceDashboard() {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      const data = await apiRequest(API_ENDPOINTS.adminWithdrawals)
      setWithdrawals(data.withdrawals || [])
    } catch (err) {
      console.error('Error fetch withdrawals:', err)
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const handleProsesClick = (withdrawalId) => {
    setSelectedWithdrawalId(withdrawalId)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedWithdrawalId(null)
    fetchWithdrawals()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
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

  // Mock metrik overview
  const mockMetrics = {
    gmv: 125000000,
    platformRevenue: 6250000,
    totalLiability: 42500000
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manajemen Finansial</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pantau GMV, komisi platform, dan proses pencairan dana
          </p>
        </div>
        <button
          onClick={fetchWithdrawals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrik Makro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">GMV Total Transaksi</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(mockMetrics.gmv)}</p>
          <p className="text-xs text-slate-500 mt-1">Gross Merchandise Value</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Pendapatan Platform</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(mockMetrics.platformRevenue)}</p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Komisi 5%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Liabilitas Dompet</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(mockMetrics.totalLiability)}</p>
          <p className="text-xs text-slate-500 mt-1">Dana user yang bisa ditarik</p>
        </div>
      </div>

      {/* Tabel Antrean Penarikan */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">Antrean Penarikan Dana</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">Memuat data...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm">Tidak ada pengajuan penarikan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    ID Penarikan
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Nama Pemilik
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Nominal Kotor
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider">
                    Bank Tujuan
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
                {withdrawals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-700">{item.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.ownerName || '-'}</p>
                        <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.bankName}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.accountNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                          STATUS_BADGES[item.status] || STATUS_BADGES.PENDING
                        }`}
                      >
                        {item.status === 'PENDING' && 'Menunggu'}
                        {item.status === 'APPROVED' && 'Disetujui'}
                        {item.status === 'REJECTED' && 'Ditolak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.status === 'PENDING' && (
                        <button
                          onClick={() => handleProsesClick(item.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Proses Penarikan
                        </button>
                      )}
                      {item.status !== 'PENDING' && (
                        <span className="text-xs text-slate-400">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedWithdrawalId && (
        <WithdrawalModal
          withdrawalId={selectedWithdrawalId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
