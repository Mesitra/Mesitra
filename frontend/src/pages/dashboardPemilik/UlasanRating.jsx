import React, { useState, useEffect, useMemo } from 'react'
import {
  Star,
  BadgeCheck,
  CheckCircle2,
  Search,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Store,
  X,
  Send,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { listOwnerReviews, replyReview } from '../../lib/reviewsApi'
import { getSessionUser, getUserInitials } from '../../lib/userSession'
import { formatShortDate } from '../../lib/dateHelpers'
import { fetchUserProfile } from '../../lib/profileApi'

export default function UlasanRating({ tenantProfile: propTenantProfile, currentUser: propCurrentUser }) {
  const [currentUser, setCurrentUser] = useState(propCurrentUser || getSessionUser() || null)
  const [tenantProfile, setTenantProfile] = useState(propTenantProfile || null)
  
  const [reviews, setReviews] = useState([])
  const [reviewsMeta, setReviewsMeta] = useState({
    total: 0,
    averageRating: 5.0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })
  
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [starFilter, setStarFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal Balas Ulasan State
  const [replyModalOpen, setReplyModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Fetch profil toko jika belum ada prop
  useEffect(() => {
    if (!propTenantProfile) {
      fetchUserProfile()
        .then((res) => {
          if (res?.tenantProfile || res?.profile?.tenantProfile) {
            setTenantProfile(res.tenantProfile || res.profile?.tenantProfile)
          }
          if (res?.user) {
            setCurrentUser(res.user)
          }
        })
        .catch(() => {})
    }
  }, [propTenantProfile])

  // Fetch ulasan dengan pagination server-side
  const loadReviews = async (page = 1, star = starFilter) => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 10
      }
      if (star !== 'ALL') {
        params.rating = star
      }

      const res = await listOwnerReviews(params)
      setReviews(res.data || [])
      setTotalPages(res.totalPages || 1)
      setCurrentPage(res.currentPage || page)
      if (res.meta) {
        setReviewsMeta(res.meta)
      }
    } catch (err) {
      console.error('Gagal memuat ulasan pemilik:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews(currentPage, starFilter)
  }, [currentPage, starFilter])

  // Search filter di client-side untuk pencarian cepat kata kunci / nama penyewa / alat
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews
    const q = searchQuery.toLowerCase().trim()
    return reviews.filter((r) => {
      const renterName = (r.user?.fullName || r.user?.email || '').toLowerCase()
      const businessName = (r.user?.kycData?.businessName || '').toLowerCase()
      const equipmentName = (r.equipment?.name || '').toLowerCase()
      const comment = (r.comment || '').toLowerCase()
      const invoice = (r.order?.invoiceNumber || '').toLowerCase()
      return (
        renterName.includes(q) ||
        businessName.includes(q) ||
        equipmentName.includes(q) ||
        comment.includes(q) ||
        invoice.includes(q)
      )
    })
  }, [reviews, searchQuery])

  // Handler Balas Ulasan
  const handleOpenReplyModal = (review) => {
    setSelectedReview(review)
    setReplyText(review.ownerReply || '')
    setReplyError(null)
    setReplyModalOpen(true)
  }

  const handleCloseReplyModal = () => {
    setReplyModalOpen(false)
    setSelectedReview(null)
    setReplyText('')
    setReplyError(null)
  }

  const handleSubmitReply = async (e) => {
    e?.preventDefault()
    if (!replyText.trim()) {
      setReplyError('Teks balasan ulasan tidak boleh kosong')
      return
    }

    try {
      setReplySubmitting(true)
      setReplyError(null)
      const res = await replyReview(selectedReview.id, replyText.trim())
      
      // Update review di list lokal
      setReviews((prev) =>
        prev.map((r) =>
          r.id === selectedReview.id
            ? {
                ...r,
                ownerReply: replyText.trim(),
                repliedAt: res?.data?.repliedAt || new Date().toISOString()
              }
            : r
        )
      )

      setToastMessage('Balasan ulasan berhasil dikirim!')
      setTimeout(() => setToastMessage(null), 3000)
      handleCloseReplyModal()
    } catch (err) {
      setReplyError(err.message || 'Gagal mengirim balasan ulasan')
    } finally {
      setReplySubmitting(false)
    }
  }

  const storeName =
    tenantProfile?.storeName ||
    currentUser?.tenantProfile?.storeName ||
    currentUser?.kycData?.businessName ||
    currentUser?.fullName ||
    'Toko Anda'

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans">
      {/* ── HEADER HALAMAN ULASAN & RATING (Task 1: Refactor Konteks Header UI) ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ulasan &amp; Rating
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            {`Menampilkan ulasan pelanggan untuk seluruh alat di ${tenantProfile?.storeName || storeName}`}
          </p>
        </div>

        {toastMessage && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </header>

      {/* ── HEADER SUMMARY BOX (STATISTIK RATING) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Big Score Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-2">
            <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              {reviewsMeta.averageRating ? reviewsMeta.averageRating.toFixed(1).replace('.', ',') : '5,0'}
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(reviewsMeta.averageRating || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-xs font-bold text-slate-600">
              {reviewsMeta.total} Ulasan Pelanggan
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <BadgeCheck className="w-3 h-3" />
              100% Terverifikasi
            </span>
          </div>

          {/* Rating Distribution Breakdown Bars */}
          <div className="md:col-span-2 space-y-2">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Distribusi Penilaian Bintang
            </div>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviewsMeta.distribution?.[star] || 0
              const total = reviewsMeta.total || 1
              const percentage = Math.round((count / total) * 100)

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-16 text-slate-600 font-semibold shrink-0">
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    />
                  </div>
                  <div className="w-12 text-right text-[11px] font-semibold text-slate-400 tabular-nums shrink-0">
                    {count} ({percentage}%)
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── FILTER CHIPS & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setStarFilter('ALL')
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              starFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua ({reviewsMeta.total})
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setStarFilter(star)
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                starFilter === star
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{star} Bintang</span>
              <span className="text-[10px] opacity-80">
                ({reviewsMeta.distribution?.[star] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ulasan atau alat..."
            className="w-full bg-white text-xs rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* ── DAFTAR ULASAN (TASK 2 & TASK 3) ── */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-2">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <div className="text-xs font-semibold text-slate-500">Memuat ulasan pelanggan...</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-2">
            <Star className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              Tidak ada ulasan ditemukan
            </div>
            <div className="text-xs text-slate-500">
              Coba sesuaikan filter bintang atau kata kunci pencarian Anda.
            </div>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const renterName = rev.user?.fullName || rev.user?.email || 'Penyewa Terverifikasi'
            const businessName = rev.user?.kycData?.businessName || null
            const equipmentName = rev.equipment?.name || 'Alat Produksi UMKM'
            const hasReply = Boolean(rev.ownerReply && rev.ownerReply.trim())

            return (
              <div
                key={rev.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Review Top Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {getUserInitials(rev.user)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {renterName}
                        </span>
                        {businessName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {businessName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                        {equipmentName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatShortDate(rev.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Comment Body */}
                <blockquote className="text-xs text-slate-700 leading-relaxed font-normal">
                  “{rev.comment}”
                </blockquote>

                {/* Task 3: Jika sudah ada balasan, render kotak abu-abu di bawah komentar penyewa */}
                {hasReply && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-blue-600" />
                        Respon Pemilik Toko
                      </span>
                      <span className="text-slate-400 font-medium">
                        {rev.repliedAt ? formatShortDate(rev.repliedAt) : 'Baru saja'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pl-5 border-l-2 border-blue-500 font-normal">
                      {rev.ownerReply}
                    </p>
                  </div>
                )}

                {/* Footer Review: Transaksi Status & Tombol Balas Ulasan */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Transaksi Sewa Selesai</span>
                    {rev.order?.invoiceNumber && (
                      <span className="text-slate-400">· {rev.order.invoiceNumber}</span>
                    )}
                  </div>

                  {/* Task 3: Tombol "Balas Ulasan" jika ownerReply masih null */}
                  {!hasReply && (
                    <button
                      type="button"
                      onClick={() => handleOpenReplyModal(rev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Balas Ulasan</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── KOMPONEN NAVIGASI PAGINASI SERVER-SIDE (Task 2) ── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 font-medium">
            Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{' '}
            <span className="font-bold text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL BALAS ULASAN (Task 3: UI Skeleton & Modal Sederhana) ── */}
      {replyModalOpen && selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Balas Ulasan Penyewa
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReplyModal}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuplikan ulasan asli */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  {selectedReview.user?.fullName || selectedReview.user?.email || 'Penyewa'}
                </span>
                <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                  ★ {selectedReview.rating}
                </span>
              </div>
              <p className="text-xs text-slate-600 italic">
                “{selectedReview.comment}”
              </p>
            </div>

            {replyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{replyError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Teks Balasan Anda
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Tuliskan ucapan terima kasih atau tanggapan Anda atas ulasan penyewa..."
                  className="w-full bg-slate-50/50 text-xs rounded-xl p-3 text-slate-800 border border-slate-200 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseReplyModal}
                  disabled={replySubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={replySubmitting || !replyText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  {replySubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Balasan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

