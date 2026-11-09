import { useState, useEffect } from 'react'
import { X, AlertTriangle, FileEdit, CheckCircle, Loader2 } from 'lucide-react'
import { apiRequest, API_ENDPOINTS } from '../../lib/apiClient'

export default function KycDocumentModal({ submissionId, onClose }) {
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectPrompt, setShowRejectPrompt] = useState(false)
  const [showRevisionPrompt, setShowRevisionPrompt] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchDetail()
  }, [submissionId])

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const data = await apiRequest(API_ENDPOINTS.adminSubmission(submissionId))
      setSubmission(data.submission)
    } catch (err) {
      console.error('Error:', err)
      showToast('Gagal memuat detail pengajuan')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleApprove = async () => {
    if (!confirm('Setujui pengajuan ini?')) return
    setActionLoading(true)
    try {
      await apiRequest(API_ENDPOINTS.adminSubmissionApprove(submissionId), {
        method: 'PATCH'
      })
      showToast('Pengajuan berhasil disetujui!')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Error:', err)
      showToast('Gagal menyetujui pengajuan')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Alasan penolakan wajib diisi')
      return
    }
    setActionLoading(true)
    try {
      await apiRequest(API_ENDPOINTS.adminSubmissionReject(submissionId), {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason, note: rejectReason })
      })
      showToast('Pengajuan berhasil ditolak')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Error:', err)
      showToast('Gagal menolak pengajuan')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevision = async () => {
    if (!revisionNote.trim()) {
      showToast('Catatan revisi wajib diisi')
      return
    }
    setActionLoading(true)
    try {
      await apiRequest(API_ENDPOINTS.adminSubmissionRevision(submissionId), {
        method: 'PATCH',
        body: JSON.stringify({ note: revisionNote, selectedSteps: [] })
      })
      showToast('Permintaan revisi berhasil dikirim')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Error:', err)
      showToast('Gagal mengirim permintaan revisi')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-slate-600 mt-3">Memuat dokumen...</p>
        </div>
      </div>
    )
  }

  if (!submission) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {toast && (
        <div className="fixed top-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg z-[60]">
          {toast}
        </div>
      )}

      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Detail Dokumen KYC</h3>
            <p className="text-sm text-slate-500 mt-0.5">{submission.fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-xs text-slate-500 font-semibold">Email</span>
                <p className="font-semibold text-slate-900 mt-1">{submission.email}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-xs text-slate-500 font-semibold">Tipe Akun</span>
                <p className="font-semibold text-slate-900 mt-1">
                  {submission.role === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa UMKM'}
                </p>
              </div>
            </div>

            {/* Dokumen Grid */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Dokumen Lampiran</h4>
              <div className="grid grid-cols-2 gap-4">
                {submission.ktpPhotoUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Foto KTP</p>
                    <img
                      src={submission.ktpPhotoUrl}
                      alt="KTP"
                      className="w-full aspect-video object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
                {submission.selfiePhotoUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Foto Selfie + KTP</p>
                    <img
                      src={submission.selfiePhotoUrl}
                      alt="Selfie KTP"
                      className="w-full aspect-video object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
                {submission.nibPhotoUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Foto NIB</p>
                    <img
                      src={submission.nibPhotoUrl}
                      alt="NIB"
                      className="w-full aspect-video object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
                {submission.bankAccountPhotoUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Tangkapan Layar Rekening Bank</p>
                    <img
                      src={submission.bankAccountPhotoUrl}
                      alt="Rekening Bank"
                      className="w-full aspect-video object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          {showRejectPrompt ? (
            <div className="flex-1 flex items-center gap-3">
              <input
                type="text"
                placeholder="Alasan penolakan..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition disabled:opacity-50"
              >
                Konfirmasi Tolak
              </button>
              <button
                onClick={() => setShowRejectPrompt(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-300 transition"
              >
                Batal
              </button>
            </div>
          ) : showRevisionPrompt ? (
            <div className="flex-1 flex items-center gap-3">
              <input
                type="text"
                placeholder="Catatan revisi untuk pemohon..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleRevision}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
              >
                Kirim Revisi
              </button>
              <button
                onClick={() => setShowRevisionPrompt(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-300 transition"
              >
                Batal
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowRejectPrompt(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4" />
                Tolak Permanen
              </button>
              <button
                onClick={() => setShowRevisionPrompt(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
              >
                <FileEdit className="w-4 h-4" />
                Minta Revisi
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Setujui Valid
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
