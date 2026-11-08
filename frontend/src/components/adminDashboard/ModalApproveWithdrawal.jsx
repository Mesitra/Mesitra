import React, { useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { approveWithdrawal } from './adminApi'

export default function ModalApproveWithdrawal({ isOpen, onClose, withdrawal, onSuccess }) {
  const [bankReference, setBankReference] = useState('')
  const [transferProofUrl, setTransferProofUrl] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !withdrawal) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await approveWithdrawal(withdrawal.id, {
        bankReference: bankReference.trim() || undefined,
        transferProofUrl: transferProofUrl.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined
      })
      
      setBankReference('')
      setTransferProofUrl('')
      setAdminNotes('')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Gagal menyetujui pencairan dana')
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
          <h2 className="text-lg font-bold text-slate-900">Setujui Pencairan Dana</h2>
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
              <span className="text-lg font-bold text-green-700">
                {formatRupiah(withdrawal.amount)}
              </span>
            </div>
            <div className="w-full h-px bg-slate-200" />
            <div className="flex flex-col gap-1">
              <span className="text-sm text-slate-500">Tujuan Transfer</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-slate-900">{withdrawal.bankName}</span>
                <span className="text-sm font-mono text-slate-700">{withdrawal.accountNumber}</span>
                <span className="text-sm text-slate-600">{withdrawal.accountHolder}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="bankReference" className="text-sm font-semibold text-slate-900">
              Referensi Bank <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="bankReference"
              type="text"
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="Nomor referensi transfer dari bank"
              className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="transferProofUrl" className="text-sm font-semibold text-slate-900">
              URL Bukti Transfer <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="transferProofUrl"
              type="url"
              value={transferProofUrl}
              onChange={(e) => setTransferProofUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="adminNotes" className="text-sm font-semibold text-slate-900">
              Catatan Admin <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Catatan internal untuk audit trail..."
              className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div className="p-4 rounded-[10px] bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Konfirmasi:</strong> Dana sebesar {formatRupiah(withdrawal.amount)} akan dicatat 
              sebagai telah ditransfer ke rekening {withdrawal.accountHolder}. Pastikan transfer bank 
              sudah berhasil sebelum menyetujui.
            </p>
          </div>
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
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-[10px] bg-green-700 text-sm font-bold text-white hover:bg-green-800 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Cairkan Dana</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
