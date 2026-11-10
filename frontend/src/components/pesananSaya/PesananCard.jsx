import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlarmClock,
  ShieldCheck,
  Truck,
  FileText,
  AlertCircle,
  Clock,
  ChevronRight,
  Star,
  KeyRound
} from 'lucide-react'
import { formatShortDate, formatLongDate } from '../../lib/dateHelpers'
import {
  isDisputeStatus,
  isRejectedOrCancelledStatus
} from './orderStatusConstants'

export default function PesananCard({
  order,
  onChatOwner,
  onExtend,
  onConfirmDelivery,
  onCancel,
  onViewDetail,
  onTrack,
  onViewContract,
  onReview,
  onViewDispute
}) {
  const navigate = useNavigate()
  const equipment = order.equipment || {}
  const status = order.status

  const isDispute = isDisputeStatus(status)
  const isRejected = isRejectedOrCancelledStatus(status)

  // Accordion state untuk toggle inline Detail Klaim (jika tidak via modal)
  const [isDisputeExpanded, setIsDisputeExpanded] = useState(false)

  // Live countdown timer untuk SEWA_AKTIF
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (status !== 'SEWA_AKTIF') return

    const calculateTime = () => {
      // Tambah jam 20:00 batas pengembalian
      const deadline = new Date(order.endDate)
      deadline.setHours(20, 0, 0, 0)
      const now = Date.now()
      const diff = deadline.getTime() - now

      if (diff <= 0) {
        setTimeLeft('Waktu sewa berakhir')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [order.endDate, status])

  const formatRupiah = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`

  const getStatusBadge = () => {
    // 1. Badge untuk Dispute / Klaim (tetap menampilkan visual Dispute / Klaim)
    if (isDispute) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-300">
          Dispute / Klaim
        </span>
      )
    }

    // 2. Badge untuk Ditolak / Dibatalkan
    if (isRejected) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">
          Ditolak
        </span>
      )
    }

    const s = String(status || '').trim().toUpperCase()
    switch (s) {
      case 'MENUNGGU_PEMBAYARAN':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            Menunggu Pembayaran
          </span>
        )
      case 'MENUNGGU_KONFIRMASI':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
            Menunggu Konfirmasi
          </span>
        )
      case 'DIKIRIM':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
            Dikirim
          </span>
        )
      case 'SEWA_AKTIF':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            Sewa Aktif
          </span>
        )
      case 'INSPEKSI':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-300">
            Inspeksi
          </span>
        )
      case 'SELESAI':
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
            Selesai
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        )
    }
  }

  const startDateText = formatShortDate(order.startDate)
  const endDateText = formatShortDate(order.endDate)

  return (
    <div className="box-border w-full flex flex-col gap-4 p-4.5 sm:p-5.5 bg-white ring-1 ring-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
      {/* 1. Header: Invoice & Dates & Badge */}
      <div className="flex flex-row justify-between items-center pb-0.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewDetail && onViewDetail(order)}
            className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight hover:text-blue-600 transition-colors cursor-pointer text-left"
            title="Klik untuk melihat Detail Pesanan"
          >
            {order.invoiceNumber}
          </button>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
            {startDateText} – {endDateText} {new Date(order.endDate).getFullYear()}
          </span>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* 2. Mid: Unit Photo & Info & Pricing */}
      <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4.5 items-start sm:items-center">
        {/* Photo */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 shrink-0">
          <img
            src={equipment.imageUrl || 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=400&q=80'}
            alt={equipment.name || 'Alat'}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 truncate m-0">
            {equipment.name || 'Unit Alat'}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500">
            <span>{equipment.category || 'Alat Produksi'}</span>
            <span>·</span>
            <span>Daya {equipment.powerWatt || 0}W</span>
            <span>·</span>
            <span className="text-blue-600 font-medium">{equipment.owner?.fullName || 'Pemilik Alat'}</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">
            {order.deliveryMethod === 'PICKUP' ? 'Ambil di Gudang Pemilik' : 'Diantar Kurir Toko'} · {equipment.location || 'Jakarta'}
          </span>
        </div>

        {/* Pricing breakdown summary */}
        <div className="flex items-baseline sm:items-end flex-row sm:flex-col gap-2 sm:gap-0.5 shrink-0">
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums">
            {formatRupiah(order.totalPaid)}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            Deposit {formatRupiah(order.depositAmount)} · {order.rentalDays} hari
          </span>
        </div>
      </div>

      {/* 3. Conditional Alert / Countdown Banner */}
      {status === 'MENUNGGU_PEMBAYARAN' && (
        <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-amber-900">
              Menunggu pembayaran escrow
            </div>
            <div className="text-[11px] sm:text-xs text-amber-800 mt-0.5 leading-relaxed">
              Selesaikan pembayaran sebelum batas waktu agar pesanan tidak dibatalkan otomatis.
            </div>
          </div>
        </div>
      )}

      {status === 'SEWA_AKTIF' && (
        <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
          <AlarmClock className="w-4 h-4 text-amber-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-amber-900">
              Sisa masa sewa aktif: {timeLeft}
            </div>
            <div className="text-[11px] sm:text-xs text-amber-800 mt-0.5 leading-relaxed">
              Kembalikan sebelum {formatLongDate(order.endDate)} · 20:00 WIB untuk menghindari denda keterlambatan.
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs sm:text-[13px] font-extrabold text-amber-800 tabular-nums">
            {timeLeft}
          </span>
        </div>
      )}

      {status === 'DIKIRIM' && (
        <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl">
          <Truck className="w-4 h-4 text-blue-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-blue-900">
              {order.deliveryMethod === 'PICKUP'
                ? 'Unit siap diambil di gudang pemilik'
                : 'Unit sedang dalam perjalanan oleh kurir toko'}
            </div>
            <div className="text-[11px] sm:text-xs text-blue-800 mt-0.5 leading-relaxed">
              Periksa kondisi fisik dan fungsi kelistrikan sebelum melakukan konfirmasi penerimaan unit.
            </div>
          </div>
        </div>
      )}

      {status === 'INSPEKSI' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-[13px] font-bold text-amber-900">
                {order.returnData?.unitReceivedAt
                  ? 'Unit fisik diterima pemilik — Inspeksi BAST berjalan'
                  : 'Menunggu serah terima & verifikasi inspeksi pemilik'}
              </div>
              <div className="text-[11px] sm:text-xs text-amber-800 mt-0.5 leading-relaxed">
                {order.returnData?.unitReceivedAt
                  ? 'Pemilik sedang melakukan pemeriksaan fisik unit. Deposit akan diteruskan ke dompet Anda setelah inspeksi disetujui.'
                  : 'Berikan PIN serah terima kepada kurir / pemilik alat saat unit fisik diserahkan.'}
              </div>
            </div>
          </div>
          {order.returnData?.handoverPin && !order.returnData?.unitReceivedAt && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-950 shrink-0 self-start sm:self-auto">
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-[10px] font-bold uppercase text-amber-700">PIN:</span>
              <span className="font-mono text-xs font-black tracking-widest">{order.returnData.handoverPin}</span>
            </div>
          )}
        </div>
      )}

      {status === 'SELESAI' && order.isResolvedByAdmin && (
        <div className="flex items-start sm:items-center gap-3 p-3 sm:p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-emerald-900 flex items-center gap-2">
              <span>Pesanan Selesai Melalui Putusan Mediasi Admin</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-200/70 text-emerald-800 rounded">
                Mediasi Selesai
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-emerald-800 mt-0.5 leading-relaxed">
              Ganti rugi Rp {(order.finalDamageFee || 0).toLocaleString('id-ID')} dipotong. Sisa deposit Rp {Math.max(0, (order.depositAmount || 0) - (order.finalDamageFee || 0)).toLocaleString('id-ID')} telah dikembalikan ke dompet.
            </div>
          </div>
        </div>
      )}

      {isDispute && (
        <div className="flex items-start sm:items-center gap-3 p-3 sm:p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-rose-900 flex items-center gap-2">
              <span>Klaim Kerusakan / Sengketa Diajukan Pemilik</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-rose-200/70 text-rose-800 rounded">
                Mediasi
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-rose-800 mt-0.5 line-clamp-2 leading-relaxed">
              {order.disputeReason || order.disputeNote || 'Pemilik alat mengajukan klaim kerusakan atau ketidaksesuaian unit saat inspeksi.'}
            </div>
          </div>
        </div>
      )}

      {status === 'MENUNGGU_KONFIRMASI' && (
        <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-slate-700">
              Menunggu konfirmasi ketersediaan dari pemilik alat
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
              Pemilik alat memiliki waktu maksimal 12 jam untuk menyetujui pengajuan sewa ini.
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="flex items-center gap-3 p-3 sm:p-3.5 bg-red-50/70 border border-red-200/60 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-red-900">
              Pengajuan sewa ditolak pemilik
            </div>
            <div className="text-[11px] sm:text-xs text-red-800 mt-0.5 leading-relaxed">
              {order.disputeNote || 'Dana pembayaran dan security deposit telah dikembalikan ke saldo dompet Anda.'}
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer: Escrow info + Dynamic Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3.5 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Dana ditahan aman di escrow Mesitra</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Action: Hubungi Pemilik */}
          <button
            type="button"
            onClick={() => onChatOwner(order)}
            className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Hubungi Pemilik
          </button>

          {/* Khusus kartu berstatus DISPUTE / Klaim: Tombol Detail Klaim bersebelahan dengan Hubungi Pemilik */}
          {isDispute && (
            <button
              type="button"
              onClick={() => {
                if (onViewDispute) {
                  onViewDispute(order)
                } else {
                  setIsDisputeExpanded((prev) => !prev)
                }
              }}
              className="py-2 px-3.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 ring-1 ring-rose-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Detail Klaim</span>
            </button>
          )}

          {/* Tombol Detail Putusan Mediasi jika pesanan diselesaikan via mediasi */}
          {status === 'SELESAI' && order.isResolvedByAdmin && (
            <button
              type="button"
              onClick={() => onViewDispute && onViewDispute(order)}
              className="py-2 px-3.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hasil Putusan Mediasi</span>
            </button>
          )}

          {/* Tombol Lihat Kontrak Sewa jika sudah disetujui */}
          {order.contractAgreedAt && (
            <button
              type="button"
              onClick={() => onViewContract?.(order)}
              className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Kontrak Sewa</span>
            </button>
          )}

          {/* Status: MENUNGGU_PEMBAYARAN */}
          {status === 'MENUNGGU_PEMBAYARAN' && (
            <>
              <button
                type="button"
                onClick={() => onCancel(order)}
                className="py-2 px-3 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => onViewDetail && onViewDetail(order)}
                className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Detail Pesanan
              </button>
              <button
                type="button"
                onClick={() => navigate(`/checkout/pembayaran/${order.id}`)}
                className="py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lanjutkan Pembayaran</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Status: MENUNGGU_KONFIRMASI */}
          {status === 'MENUNGGU_KONFIRMASI' && (
            <>
              <button
                type="button"
                onClick={() => onCancel(order)}
                className="py-2 px-3 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => onViewDetail && onViewDetail(order)}
                className="py-2 px-3.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition-all cursor-pointer"
              >
                Detail Pesanan
              </button>
            </>
          )}

          {/* Status: DIKIRIM */}
          {status === 'DIKIRIM' && (
            <>
              <button
                type="button"
                onClick={() => onTrack(order)}
                className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Lacak Pengiriman
              </button>
              <button
                type="button"
                onClick={() => onConfirmDelivery(order)}
                className="py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Konfirmasi Terima &amp; BAST Awal
              </button>
            </>
          )}

          {/* Status: SEWA_AKTIF */}
          {status === 'SEWA_AKTIF' && (
            <>
              <button
                type="button"
                onClick={() => onExtend(order)}
                className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Perpanjang
              </button>
              <button
                type="button"
                onClick={() => navigate(`/pesanan-saya/${order.id}/kembalikan`)}
                className="py-2 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Kembalikan Alat &amp; BAST Akhir</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Status: INSPEKSI */}
          {status === 'INSPEKSI' && (
            <button
              type="button"
              onClick={() => navigate(`/pesanan-saya/${order.id}/kembalikan`)}
              className="py-2 px-3.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Lihat Status Inspeksi &amp; Refund</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Status: SELESAI */}
          {status === 'SELESAI' && (
            <>
              {order.review ? (
                <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>Diulas {order.review.rating}/5</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onReview?.(order)}
                  className="py-2 px-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Beri Ulasan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/pesanan-saya/${order.id}/kembalikan`)}
                className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Lihat Dokumen BAST
              </button>
              <button
                type="button"
                onClick={() => navigate(`/detail-alat/${order.equipmentId}`)}
                className="py-2 px-3.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
              >
                Sewa Lagi
              </button>
            </>
          )}

          {/* Status: DITOLAK / DIBATALKAN */}
          {isRejected && (
            <>
              <button
                type="button"
                onClick={() => onViewDetail && onViewDetail(order)}
                className="py-2 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Detail Pesanan
              </button>
              <button
                type="button"
                onClick={() => navigate('/beranda-sewa')}
                className="py-2 px-3.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
              >
                Cari Alat Lain
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5. Expandable Section: Detail Alasan Klaim Pemilik Alat */}
      {isDispute && isDisputeExpanded && (
        <div className="p-3.5 sm:p-4 bg-rose-50/80 border border-rose-200/90 rounded-xl text-xs space-y-2 animate-in fade-in zoom-in-98 duration-150">
          <div className="flex items-center justify-between font-bold text-rose-900">
            <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              Detail Alasan Klaim Pemilik Alat:
            </span>
            <button
              type="button"
              onClick={() => setIsDisputeExpanded(false)}
              className="text-[11px] sm:text-xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
          <p className="p-3 bg-white text-rose-950 font-medium rounded-lg border border-rose-200 m-0 leading-relaxed text-xs shadow-2xs">
            "{order.disputeReason || order.disputeNote || 'Tidak ada catatan klaim terperinci.'}"
          </p>
        </div>
      )}
    </div>
  )
}
