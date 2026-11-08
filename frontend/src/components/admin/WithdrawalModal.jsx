import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertTriangle, Loader2, Upload } from 'lucide-react'
import { apiRequest, API_ENDPOINTS } from '../../lib/apiClient'

export default function WithdrawalModal({ withdrawalId, onClose }) {
  const [withdrawal, setWithdrawal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [bankReference, setBankReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchDetail()
  }, [withdrawalId])

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const data = await apiRequest(API_ENDPOINTS.adminWithdrawal(withdrawalId))
      setWithdrawal(data.withdrawal)
    } catch (err) {
      console.error('Error:', err)
      showToast('Gagal memuat detail penarikan')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const handleApprove = async () => {
    if (!bankReference.trim()) {
      alert('Nomor referensi bank wajib diisi')
      return
    }
    setActionLoading(true)
    try {
      await apiRequest(API_ENDPOINTS.adminWithdrawalApprove(withdrawalId), {
        method: 'PATCH',
        body: JSON.stringify({ 
          bankReference,
          proofUrl: proofUrl.trim() || undefined
        })
      })
      showToast('Penarikan berhasil disetujui!')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Error:', err)
      showToast('Gagal menyetujui penarikan')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Alasan penolakan wajib diisi')
      return
    }
    setActionLoading(true)
    try {
      await apiRequest(API_ENDPOINTS.adminWithdrawalReject(withdrawalId), {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason })
      })
      showToast('Penarikan ditolak, saldo dikembalikan')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Error:', err)
      showToast('Gagal menolak penarikan')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-slate-600 mt-3">Memuat detail penarikan...</p>
        </div>
      </div>
    )
  }

  if (!withdrawal) {
    return null
  }

  const netAmount = withdrawal.amount - (withdrawal.adminFee || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {toast && (
        <div className="fixed top-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg z-[60]">
          {toast}
        </div>
      )}

      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Detail Penarikan Dana</h3>
            <p className="text-sm text-slate-500 mt-0.5">ID: {withdrawal.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - 2 Column Layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-200">
            {/* Left Side - Data Instruksi Transfer */}
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-4">Instruksi Transfer</h4>
                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <span className="text-xs text-slate-500 font-semibold">Nama Bank</span>
                    <p className="font-bold text-slate-900 mt-1 text-lg">{withdrawal.bankName}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <span className="text-xs text-slate-500 font-semibold">Nomor Rekening</span>
                    <p className="font-mono font-bold text-slate-900 mt-1 text-lg">{withdrawal.accountNumber}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <span className="text-xs text-slate-500 font-semibold">Atas Nama</span>
                    <p className="font-bold text-slate-900 mt-1 text-lg">{withdrawal.accountName}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Rincian Nominal</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Nominal Kotor</span>
                    <span className="font-bold text-slate-900">{formatCurrency(withdrawal.amount)}</span>
                  </div>
                  {withdrawal.adminFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Biaya Admin</span>
                      <span className="font-semibold text-rose-600">-{formatCurrency(withdrawal.adminFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900">Nominal Bersih Transfer</span>
                    <span className="font-bold text-blue-600 text-lg">{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-2">Info Pemohon</h4>
                <div className="text-sm space-y-1">
                  <p className="text-slate-600">Nama: <span className="font-semibold text-slate-900">{withdrawal.ownerName}</span></p>
                  <p className="text-slate-600">Email: <span className="font-semibold text-slate-900">{withdrawal.ownerEmail}</span></p>
                </div>
              </div>
            </div>

            {/* Right Side - Form Aksi */}
            <div className="p-6">
              {!showApproveForm && !showRejectForm && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Pilih Tindakan</h4>
                  <button
                    onClick={() => setShowApproveForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Setujui & Transfer Dana
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition shadow-sm"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Tolak & Rollback Saldo
                  </button>
                </div>
              )}

              {showApproveForm && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Form Approval Transfer</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Nomor Referensi Bank *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: TRF202611080001234"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      URL Bukti Transfer (Opsional)
                    </label>
                    <div className="relative">
                      <Upload className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="https://..."
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Memproses...' : 'Konfirmasi Setujui'}
                    </button>
                    <button
                      onClick={() => setShowApproveForm(false)}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {showRejectForm && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Form Penolakan</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Alasan Penolakan *
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Jelaskan alasan penolakan..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <p className="font-semibold">⚠️ Perhatian:</p>
                    <p>Saldo akan dikembalikan ke dompet pemilik dan status penarikan dibatalkan.</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      {actionLoading ? 'Memproses...' : 'Konfirmasi Tolak'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
