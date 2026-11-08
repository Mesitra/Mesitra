import React, { useState } from 'react'
import { X, Scale } from 'lucide-react'
import { resolveDispute } from '../../lib/ordersApi'

export default function DisputeResolverModal({ isOpen, onClose, disputeId, onSuccess }) {
  const [winner, setWinner] = useState('')
  const [fee, setFee] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!winner) return
    setIsSubmitting(true)
    try {
      await resolveDispute(disputeId, {
        winner,
        fee: fee ? parseFloat(fee) : 0,
        note: note.trim()
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      alert(err.message || 'Gagal menyelesaikan sengketa. Periksa backend.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold">Selesaikan Sengketa</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: BAST Photos */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-widest">BAST - Pemilik</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">Foto BAST</div>
              <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">Foto Kerusakan</div>
            </div>
          </div>

          {/* Right Column: Inspection + Form */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-widest">Inspeksi Pemilik</h4>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">Foto Inspeksi</div>
              <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">Deskripsi</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pemenang Sengketa</label>
                <select
                  value={winner}
                  onChange={(e) => setWinner(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Pilih pemenang</option>
                  <option value="owner">Menangkan Pemilik</option>
                  <option value="renter">Menangkan Penyewa</option>
                  <option value="split">Split</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fee (max deposit)</label>
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="Rp 0"
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 focus:outline-none focus:border-blue-600"
                />
                <p className="text-xs text-slate-400 mt-1">Fee capped at deposit value</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:border-blue-600"
                  placeholder="Catatan tambahan..."
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!winner || isSubmitting}
                className="w-full h-11 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSubmitting ? 'Menyelesaikan...' : 'Selesaikan Sengketa'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}