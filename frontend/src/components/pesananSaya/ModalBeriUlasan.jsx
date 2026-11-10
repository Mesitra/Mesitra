import React, { useState } from 'react'
import { X, Star, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { submitReview } from '../../lib/ordersApi'

const RATING_DESCRIPTIONS = {
  1: 'Sangat Buruk',
  2: 'Kurang Memuaskan',
  3: 'Cukup Baik',
  4: 'Sangat Bagus',
  5: 'Luar Biasa Memuaskan'
}

const QUICK_TAGS = [
  'Unit sangat bersih & steril',
  'Kondisi mesin prima terawat',
  'Pemilik ramah & responsif',
  'Serah terima tepat waktu',
  'Suhu & daya listrik stabil'
]

export default function ModalBeriUlasan({ isOpen, onClose, order, onSuccess }) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen || !order) return null

  const equipment = order.equipment || {}
  const activeRating = hoverRating || rating

  const handleTagClick = (tag) => {
    if (comment.includes(tag)) return
    setComment((prev) => (prev ? `${prev}. ${tag}` : tag))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!comment.trim()) {
      setError('Harap tuliskan sedikit ulasan atau pengalaman Anda.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const res = await submitReview(order.id, {
        rating,
        comment: comment.trim()
      })
      onSuccess?.(order.id, res)
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal mengirimkan ulasan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 m-0">Beri Ulasan &amp; Rating</h3>
              <p className="text-[11px] text-slate-500 m-0">{order.invoiceNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          {/* Equipment brief preview */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0">
              <img
                src={equipment.images?.[0] || equipment.imageUrl || 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=400&q=80'}
                alt={equipment.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {equipment.name || 'Peralatan UMKM'}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {equipment.category || 'Alat Produksi'} · Pemilik: {equipment.owner?.fullName || 'Mitra Mesitra'}
              </div>
            </div>
          </div>

          {/* Star selector */}
          <div className="flex flex-col items-center justify-center gap-2 py-3 bg-blue-50/40 rounded-xl border border-blue-100/70">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Kualitas Alat &amp; Pengalaman Sewa
            </span>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-slate-300 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title={`${star} Bintang`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      star <= activeRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <span className="text-xs font-extrabold text-blue-700">
              {RATING_DESCRIPTIONS[activeRating]} ({activeRating} / 5)
            </span>
          </div>

          {/* Quick tags */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500">
              Pilih tanggapan cepat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-[11px] font-medium text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-700">
              Ulasan &amp; Cerita Pengalaman Anda <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ceritakan kondisi alat, kemudahan komunikasi dengan pemilik, ketepatan waktu serah terima..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kirim Ulasan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
