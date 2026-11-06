import React from 'react'
import {
  ArrowLeft,
  X,
  UserCheck,
  MoreHorizontal,
  CheckCircle2,
  Package,
  Calendar,
  Building2,
  Lock,
  MessageSquare,
  Check,
  Star,
  Clock,
  ShieldCheck,
  Truck,
  AlertCircle
} from 'lucide-react'

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`

// Helper konfigurasi visual status badge
function getStatusBadgeConfig(status) {
  const s = String(status || '').toUpperCase()
  switch (s) {
    case 'SELESAI':
      return {
        label: 'Selesai',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconClass: 'text-emerald-600'
      }
    case 'SEWA_AKTIF':
      return {
        label: 'Sedang Disewa',
        icon: Package,
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconClass: 'text-emerald-600'
      }
    case 'DIKIRIM':
      return {
        label: 'Dikirim',
        icon: Truck,
        className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        iconClass: 'text-indigo-600'
      }
    case 'INSPEKSI':
      return {
        label: 'Perlu Inspeksi',
        icon: AlertCircle,
        className: 'bg-amber-50 text-amber-800 border-amber-300',
        iconClass: 'text-amber-600'
      }
    case 'DISPUTE':
    case 'CLAIM':
    case 'KLAIM':
      return {
        label: 'Sengketa Mediasi',
        icon: AlertCircle,
        className: 'bg-rose-50 text-rose-800 border-rose-300',
        iconClass: 'text-rose-600'
      }
    case 'DITOLAK':
    case 'DIBATALKAN':
      return {
        label: 'Ditolak',
        icon: X,
        className: 'bg-red-50 text-red-800 border-red-200',
        iconClass: 'text-red-600'
      }
    default:
      return {
        label: 'Menunggu konfirmasi',
        icon: Clock,
        className: 'bg-amber-50 text-amber-800 border-amber-200/80',
        iconClass: 'text-amber-600'
      }
  }
}

/**
 * Komponen OrderTimeline Dinamis & Reaktif (Task 3)
 * Menggunakan progressive switch logic untuk status siklus hidup sewa:
 * - MENUNGGU_KONFIRMASI: aktifkan titik/warna "Menunggu konfirmasi Anda".
 * - SEWA_AKTIF: aktifkan titik sampai "Pembayaran & escrow" dan tandai "Sedang disewa".
 * - SELESAI: hijaukan seluruh timeline.
 */
export function OrderTimeline({ status: propStatus, history, order = {} }) {
  const currentStatus = String(propStatus || order.status || 'MENUNGGU_KONFIRMASI').toUpperCase()
  const tenantName =
    order.user?.kycData?.businessName ||
    order.user?.fullName ||
    order.tenant?.fullName ||
    'Penyewa UMKM'

  // Format tanggal pengajuan riil
  const createdFormatted = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '10 Jun · 08.12'

  // Status flags
  const isSelesai = currentStatus === 'SELESAI'
  const isSewaAktif = ['SEWA_AKTIF', 'DIKIRIM'].includes(currentStatus)
  const isInspeksi = currentStatus === 'INSPEKSI'
  const isDispute = ['DISPUTE', 'CLAIM', 'KLAIM'].includes(currentStatus)
  const isDitolak = ['DITOLAK', 'DIBATALKAN', 'BATAL'].includes(currentStatus)
  const isMenunggu = ['MENUNGGU_KONFIRMASI', 'MENUNGGU_PEMBAYARAN', 'PENDING'].includes(currentStatus)

  // Step 1: Pengajuan Dikirim
  const step1 = {
    title: 'Pengajuan dikirim',
    subtitle: `${createdFormatted} · oleh ${tenantName}`,
    state: isSelesai ? 'success' : 'completed'
  }

  // Step 2: Konfirmasi Pemilik
  let step2
  if (isMenunggu) {
    step2 = {
      title: 'Menunggu konfirmasi Anda',
      subtitle: 'Batas respons 1×24 jam agar tingkat respons toko tetap tinggi',
      state: 'current-amber'
    }
  } else if (isDitolak) {
    step2 = {
      title: 'Pengajuan Ditolak',
      subtitle: 'Pesanan telah ditolak oleh pemilik alat',
      state: 'rejected'
    }
  } else {
    step2 = {
      title: 'Pengajuan Disetujui',
      subtitle: 'Ketersediaan alat telah dikonfirmasi pemilik',
      state: isSelesai ? 'success' : 'completed'
    }
  }

  // Step 3: Pembayaran & Escrow / Sedang Disewa
  let step3
  if (isMenunggu || isDitolak) {
    step3 = {
      title: 'Pembayaran & escrow',
      subtitle: 'Aktif setelah Anda menyetujui pesanan',
      state: 'pending'
    }
  } else if (currentStatus === 'DIKIRIM') {
    step3 = {
      title: 'Unit Dikirim / Siap Diambil',
      subtitle: order.deliveryMethod === 'COURIER' ? 'Kurir toko mengantarkan unit' : 'Menunggu serah terima di gudang',
      state: isSelesai ? 'success' : 'current-blue'
    }
  } else if (isSewaAktif) {
    step3 = {
      title: 'Sedang disewa (Sewa Aktif)',
      subtitle: `Masa sewa berjalan hingga ${
        order.endDate
          ? new Date(order.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'selesai'
      }`,
      state: isSelesai ? 'success' : 'current-emerald'
    }
  } else {
    // Inspeksi / Dispute / Selesai
    step3 = {
      title: 'Pembayaran & Masa Sewa Tuntas',
      subtitle: 'Dana sewa aman di escrow, masa pakai alat telah selesai',
      state: isSelesai ? 'success' : 'completed'
    }
  }

  // Step 4: Inspeksi & Pengembalian Deposit
  let step4
  if (isInspeksi) {
    step4 = {
      title: 'Pemeriksaan Fisik (Inspeksi BAST)',
      subtitle: 'Penyewa telah submit BAST pengembalian. Menunggu verifikasi fisik pemilik.',
      state: 'current-amber'
    }
  } else if (isDispute) {
    step4 = {
      title: 'Sengketa Mediasi (Dispute)',
      subtitle: order.disputeReason || 'Ada klaim kendala/kerusakan, dalam proses mediasi tim admin',
      state: 'dispute'
    }
  } else if (isSelesai) {
    step4 = {
      title: 'Sewa Selesai & Deposit Dicairkan',
      subtitle: order.isResolvedByAdmin
        ? 'Diputus via mediasi admin, dana telah didistribusikan'
        : 'Inspeksi BAST tuntas, deposit dan saldo sewa telah dicairkan ke dompet',
      state: 'success'
    }
  } else {
    step4 = {
      title: 'Inspeksi & Penyelesaian',
      subtitle: 'Dilakukan setelah masa sewa berakhir dan unit alat dikembalikan',
      state: 'pending'
    }
  }

  const steps = [step1, step2, step3, step4]

  return (
    <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
          Riwayat Pesanan
        </h4>
        {isSelesai && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Semua Tahap Selesai
          </span>
        )}
      </div>

      <div className="space-y-4 pl-1 relative">
        {steps.map((st, idx) => {
          let dotClass = 'bg-slate-300'
          let titleClass = 'text-slate-500 font-medium'
          let subClass = 'text-slate-400 font-normal'

          if (st.state === 'success') {
            dotClass = 'bg-emerald-600 ring-4 ring-emerald-100'
            titleClass = 'text-emerald-950 font-bold'
            subClass = 'text-slate-500 font-medium'
          } else if (st.state === 'completed') {
            dotClass = 'bg-blue-600 ring-4 ring-blue-100'
            titleClass = 'text-slate-900 font-bold'
            subClass = 'text-slate-500 font-medium'
          } else if (st.state === 'current-amber') {
            dotClass = 'bg-amber-500 ring-4 ring-amber-100 animate-pulse'
            titleClass = 'text-amber-950 font-bold'
            subClass = 'text-slate-600 font-medium'
          } else if (st.state === 'current-blue') {
            dotClass = 'bg-blue-600 ring-4 ring-blue-100 animate-pulse'
            titleClass = 'text-blue-950 font-bold'
            subClass = 'text-slate-600 font-medium'
          } else if (st.state === 'current-emerald') {
            dotClass = 'bg-emerald-600 ring-4 ring-emerald-100 animate-pulse'
            titleClass = 'text-emerald-950 font-bold'
            subClass = 'text-slate-600 font-medium'
          } else if (st.state === 'rejected' || st.state === 'dispute') {
            dotClass = 'bg-rose-500 ring-4 ring-rose-100'
            titleClass = 'text-rose-950 font-bold'
            subClass = 'text-rose-700 font-medium'
          }

          const isLast = idx === steps.length - 1

          return (
            <div key={idx} className="flex items-start gap-3 relative">
              {/* Garis Penghubung Vertikal */}
              {!isLast && (
                <div
                  className={`absolute left-[5px] top-[14px] w-0.5 h-[calc(100%+8px)] ${
                    isSelesai
                      ? 'bg-emerald-400'
                      : st.state.includes('completed') || st.state === 'success'
                      ? 'bg-blue-200'
                      : 'bg-slate-200'
                  }`}
                />
              )}

              {/* Titik Status */}
              <div className={`w-3 h-3 rounded-full mt-1 shrink-0 z-10 transition-colors ${dotClass}`} />

              {/* Deskripsi Step */}
              <div className="min-w-0 flex-1">
                <p className={`text-xs ${titleClass}`}>{st.title}</p>
                <p className={`text-[11px] mt-0.5 leading-relaxed ${subClass}`}>{st.subtitle}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrderDetail({
  order,
  onClose,
  onAccept,
  onReject,
  onOpenChat,
  onInspectOrder,
  isLoading = false
}) {
  if (!order) return null

  const user = order.user || order.tenant || {}
  const equipment = order.equipment || {}
  const initials =
    user.initials ||
    (user.fullName ? user.fullName.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase() : 'UM')

  const imageUrl =
    (order?.equipment?.images?.length > 0 ? order.equipment.images[0] : null) ||
    (typeof order?.equipment?.images === 'string' && order.equipment.images ? order.equipment.images : null) ||
    order?.equipment?.imageUrl ||
    order?.equipment?.image ||
    null

  const badgeConfig = getStatusBadgeConfig(order.status)
  const BadgeIcon = badgeConfig.icon

  const rentalCost = order.rentalCost || 0
  const depositAmount = order.depositAmount || 0
  const shippingCost = order.shippingCost || 0
  const serviceFee = order.serviceFee || Math.round(rentalCost * 0.05) || 25000
  const totalPaid = order.totalPaid || (rentalCost + depositAmount + shippingCost)
  const netEarnings = order.netEarnings || (rentalCost + shippingCost)

  const startDateFormatted = order.startDate
    ? new Date(order.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'
  const endDateFormatted = order.endDate
    ? new Date(order.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'

  const deliveryText =
    order.deliveryMethod === 'COURIER'
      ? 'Diantar via kurir'
      : (order.deliveryType || 'Ambil di gudang')

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl flex flex-col overflow-hidden shadow-xs transition-all duration-300">
      {/* ── HEADER PANEL DETAIL ────────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-100 bg-white">
        {/* Kiri: Tombol Kembali (Mobile) + Invoice + Badge Status */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Tombol Kembali khusus Mobile */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>

          <span className="text-xs sm:text-sm font-extrabold font-mono text-slate-900 tracking-tight">
            {order.invoiceNumber}
          </span>

          {/* Badge Status Reaktif */}
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeConfig.className}`}>
            <BadgeIcon className={`w-3 h-3 ${badgeConfig.iconClass}`} />
            <span>{badgeConfig.label}</span>
          </span>
        </div>

        {/* Kanan: Profil UMKM, More, Tombol Close X */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChat && onOpenChat(order)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Profil UMKM</span>
          </button>

          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Opsi lainnya"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Tombol X (Close) untuk Desktop & Tablet */}
          <button
            type="button"
            onClick={onClose}
            title="Tutup Detail (Reset pilihan)"
            aria-label="Tutup detail pesanan"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[640px]">
        {/* 1. KARTU PENYEWA / UMKM */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">
                  {user.kycData?.businessName || user.fullName || 'Penyewa UMKM'}
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Terverifikasi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                NIB {user.kycData?.nib || user.nib || '9120 4471 8830'} · {user.power || 'Daya usaha 1300 W'} · {user.kycData?.city || user.city || 'Bandung'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:text-right shrink-0">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span className="text-xs font-extrabold text-slate-800">
                {user.rating || 4.9}
              </span>
            </div>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500 font-medium">
              {user.completedRentals || 38} sewa selesai
            </span>
          </div>
        </div>

        {/* 2. KARTU UNIT ALAT & BIAYA */}
        <div className="p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={order?.equipment?.name || equipment.name || 'Unit Alat Sewa'}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-400 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {equipment.name || 'Unit Alat Sewa'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {order.rentalDays || 1} hari sewa · {deliveryText}
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <div className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">
              {formatRupiah(totalPaid)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {formatRupiah(order.dailyRate || Math.round(rentalCost / (order.rentalDays || 1)))} / hari
            </div>
          </div>
        </div>

        {/* 3. INFO GRID SEWA (Mulai, Selesai, Lokasi) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Mulai Sewa
              </span>
              <span className="text-xs font-extrabold text-slate-900 truncate block">
                {startDateFormatted}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Selesai Sewa
              </span>
              <span className="text-xs font-extrabold text-slate-900 truncate block">
                {endDateFormatted}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <Building2 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Lokasi Ambil
              </span>
              <span className="text-xs font-extrabold text-slate-900 truncate block">
                {order.location || equipment.location || 'Gudang Cilandak'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. RINCIAN PEMBAYARAN & ESCROW */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Rincian Pembayaran
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
              <Lock className="w-3 h-3 text-emerald-700" />
              Dana ditahan escrow
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Biaya sewa ({order.rentalDays || 1} hari)</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatRupiah(rentalCost)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Deposit jaminan</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatRupiah(depositAmount)}
            </span>
          </div>

          {shippingCost > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Ongkir pengiriman</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {formatRupiah(shippingCost)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Biaya layanan</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatRupiah(serviceFee)}
            </span>
          </div>

          <div className="h-px bg-slate-200 my-1" />

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs font-bold text-slate-900">
              Diterima setelah selesai
            </span>
            <span className="text-sm sm:text-base font-extrabold text-blue-600 tabular-nums">
              {formatRupiah(netEarnings)}
            </span>
          </div>
        </div>

        {/* 5. RIWAYAT PESANAN / TIMELINE DINAMIS (TASK 3) */}
        <OrderTimeline
          order={order}
          status={order.status}
          history={order.history || order.returnData}
        />
      </div>

      {/* ── FOOTER ACTIONS BAR ─────────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenChat && onOpenChat(order)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors cursor-pointer group"
        >
          <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span>Ada pertanyaan untuk penyewa?</span>
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {order.status === 'INSPEKSI' && onInspectOrder && (
            <button
              type="button"
              onClick={() => onInspectOrder(order)}
              className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verifikasi BAST</span>
            </button>
          )}

          {/* Tombol Tolak & Terima untuk Status Menunggu Konfirmasi */}
          {(!order.status || ['MENUNGGU_KONFIRMASI', 'PENDING'].includes(order.status)) && (
            <>
              {/* Tombol Tolak */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onReject && onReject(order.id)}
                className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Tolak
              </button>

              {/* Tombol Terima Pesanan (Wajib MyRent Blue) */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onAccept && onAccept(order.id)}
                className="flex-1 sm:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isLoading ? 'Memproses...' : 'Terima pesanan'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
