import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { rejectWithdrawal } from './adminApi'

const ALASAN_TOLAK = [
  'Data rekening tidak valid',
  'Rekening atas nama berbeda',
  'Saldo tidak mencukupi',
  'Aktivitas mencurigakan',
  'Permintaan penarikan duplikat',
  'Dokumen pendukung tidak lengkap'
]

export default function ModalRejectWithdrawal({ isOpen, onClose, withdrawal, onSuccess }) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !withdrawal) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    const finalReason = rejectionReason === 'custom' 
      ? customReason.trim() 
      : rejectionReason

    if (!finalReason) {
      setError('Alasan penolakan wajib diisi')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await rejectWithdrawal(withdrawal.id, finalReason)
      
      setRejectionReason('')
      setCustomReason('')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Gagal menolak pencairan dana')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-[16px] shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Tolak Pencairan Dana</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div className="p-4 rounded-[10px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Kode Penarikan</span>
              <span className="text-sm font-mono font-bold text-slate-900">
                {withdrawal.withdrawalCode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Pemohon</span>
              <span className="text-sm font-semibold text-slate-900">
                {withdrawal.user?.fullName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Nominal</span>
              <span className="text-lg font-bold text-slate-900">
                {formatRupiah(withdrawal.amount)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-1">
              <p className="text-sm font-semibold text-red-900">Peringatan: Rollback Saldo Otomatis</p>
              <p className="text-sm text-red-700 leading-relaxed">
                Saldo sebesar {formatRupiah(withdrawal.amount)} akan dikembalikan ke dompet{' '}
                {withdrawal.user?.fullName} secara otomatis. Transaksi ini tidak dapat dibatalkan 
                setelah disimpan.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-900">
              Alasan Penolakan <span className="text-red-600">*</span>
            </label>
            <div className="flex flex-col gap-2">
              {ALASAN_TOLAK.map((alasan) => (
                <label key={alasan} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="rejectionReason"
                    value={alasan}
                    checked={rejectionReason === alasan}
                    onChange={(e) => {
                      setRejectionReason(e.target.value)
                      setCustomReason('')
                    }}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-2 focus:ring-blue-600/40 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700">{alasan}</span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rejectionReason"
                  value="custom"
                  checked={rejectionReason === 'custom'}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-2 focus:ring-blue-600/40 cursor-pointer"
                />
                <span className="text-sm text-slate-700">Alasan lainnya (tulis manual)</span>
              </label>
            </div>
          </div>

          {rejectionReason === 'custom' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="customReason" className="text-sm font-semibold text-slate-900">
                Tulis Alasan <span className="text-red-600">*</span>
              </label>
              <textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                placeholder="Jelaskan alasan penolakan secara detail..."
                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          )}
        </form>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-[10px] border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !rejectionReason || (rejectionReason === 'custom' && !customReason.trim())}
            className="flex-1 h-11 rounded-[10px] bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Tolak & Rollback</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
