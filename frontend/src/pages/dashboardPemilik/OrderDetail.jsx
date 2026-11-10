import React, { useState, useEffect } from 'react'
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
  AlertCircle,
  PackageCheck,
  KeyRound,
  Loader2
} from 'lucide-react'
import { confirmReturnReceipt } from '../../lib/ordersApi'
import ModalKonfirmasiSerahTerima from '../../components/owner/ModalKonfirmasiSerahTerima'
import ModalVerifikasiInspeksi from '../../components/owner/ModalVerifikasiInspeksi'

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
 * Komponen OrderTimeline Dinamis & Reaktif
 * Mengikuti 4 tahap hierarki chip UI:
 * - Step 1: Pengajuan Dikirim (Aktif saat MENUNGGU_KONFIRMASI).
 * - Step 2: Disetujui & Menunggu Pembayaran (Aktif saat MENUNGGU_PEMBAYARAN).
 * - Step 3: Sedang Disewa / Serah Terima (Aktif saat status DIKIRIM atau SEWA_AKTIF).
 * - Step 4: Inspeksi & Penyelesaian (Aktif saat INSPEKSI atau klaim sengketa).
 */
export function OrderTimeline({ status: propStatus, history, order = {} }) {
  const currentStatus = String(propStatus || order.status || 'MENUNGGU_KONFIRMASI').trim().toUpperCase()
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
  const isMenungguKonfirmasi = ['MENUNGGU_KONFIRMASI', 'PENDING'].includes(currentStatus)
  const isMenungguPembayaran = currentStatus === 'MENUNGGU_PEMBAYARAN'
  const isSedangDisewa = ['DIKIRIM', 'SEWA_AKTIF', 'PENGIRIMAN', 'SIAP_DIAMBIL', 'BERJALAN', 'AKTIF'].includes(currentStatus)
  const isInspeksi = currentStatus === 'INSPEKSI'
  const isDispute = ['DISPUTE', 'CLAIM', 'KLAIM'].includes(currentStatus)
  const isDitolak = ['DITOLAK', 'DIBATALKAN', 'BATAL'].includes(currentStatus)

  // Step 1: Pengajuan Dikirim (Aktif saat MENUNGGU_KONFIRMASI)
  let step1
  if (isMenungguKonfirmasi) {
    step1 = {
      title: 'Pengajuan Dikirim',
      subtitle: `${createdFormatted} · oleh ${tenantName} (Menunggu respons Anda)`,
      state: 'current-amber'
    }
  } else {
    step1 = {
      title: 'Pengajuan Dikirim',
      subtitle: `${createdFormatted} · oleh ${tenantName}`,
      state: isSelesai ? 'success' : 'completed'
    }
  }

  // Step 2: Disetujui & Menunggu Pembayaran (Aktif saat MENUNGGU_PEMBAYARAN)
  let step2
  if (isMenungguKonfirmasi) {
    step2 = {
      title: 'Disetujui & Menunggu Pembayaran',
      subtitle: 'Menunggu konfirmasi persetujuan dari pemilik alat',
      state: 'pending'
    }
  } else if (isMenungguPembayaran) {
    step2 = {
      title: 'Disetujui & Menunggu Pembayaran',
      subtitle: 'Penyewa sedang memproses pembayaran.',
      state: 'current-amber'
    }
  } else if (isDitolak) {
    step2 = {
      title: currentStatus === 'DIBATALKAN' || currentStatus === 'BATAL' ? 'Pesanan Dibatalkan' : 'Pengajuan Ditolak',
      subtitle: 'Pesanan tidak diproses ke tahap pembayaran',
      state: 'rejected'
    }
  } else {
    step2 = {
      title: 'Disetujui & Pembayaran Lunas',
      subtitle: 'Pembayaran terverifikasi dan dana aman di escrow',
      state: isSelesai ? 'success' : 'completed'
    }
  }

  // Step 3: Sedang Disewa / Serah Terima (Aktif saat status DIKIRIM atau SEWA_AKTIF)
  let step3
  if (isMenungguKonfirmasi || isMenungguPembayaran || isDitolak) {
    step3 = {
      title: 'Sedang Disewa / Serah Terima',
      subtitle: 'Alat diserahkan dan masa sewa berjalan setelah pembayaran tuntas',
      state: 'pending'
    }
  } else if (isSedangDisewa) {
    step3 = {
      title: 'Sedang Disewa / Serah Terima',
      subtitle: 'Alat diserahkan dan masa sewa sedang berjalan.',
      state: currentStatus === 'DIKIRIM' ? 'current-blue' : 'current-emerald'
    }
  } else {
    step3 = {
      title: 'Sedang Disewa / Serah Terima Tuntas',
      subtitle: 'Masa sewa telah selesai dan unit dikembalikan',
      state: isSelesai ? 'success' : 'completed'
    }
  }

  // Step 4: Inspeksi & Penyelesaian (Aktif saat INSPEKSI atau masa sewa habis)
  let step4
  if (isInspeksi) {
    step4 = {
      title: 'Inspeksi & Penyelesaian',
      subtitle: 'Pemeriksaan fisik (Inspeksi BAST) untuk pelepasan deposit jaminan',
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
      title: 'Inspeksi & Penyelesaian',
      subtitle: order.isResolvedByAdmin
        ? 'Diputus via mediasi admin, deposit dan saldo sewa telah dicairkan'
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
                      ? 'bg-blue-400'
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
  onConfirmHandover,
  onRefreshOrders,
  isLoading = false
}) {
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false)
  const [isHandoverLoading] = useState(false)
  const [inspectionModalConfig, setInspectionModalConfig] = useState({ isOpen: false, mode: 'APPROVE' })
  const [handoverPinInput, setHandoverPinInput] = useState('')
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinSuccessMsg, setPinSuccessMsg] = useState('')
  const [verifiedReturnData, setVerifiedReturnData] = useState(null)

  useEffect(() => {
    setHandoverPinInput('')
    setPinError('')
    setPinSuccessMsg('')
    setVerifiedReturnData(null)
    setIsHandoverModalOpen(false)
  }, [order?.id])

  if (!order) return null

  const handleOpenInspection = (mode = 'APPROVE') => {
    if (onInspectOrder) {
      onInspectOrder(order, mode)
    } else {
      setInspectionModalConfig({ isOpen: true, mode })
    }
  }

  const handleHandoverSuccess = async (updatedData) => {
    if (onConfirmHandover) {
      await onConfirmHandover(order.id, updatedData?.initialBast || {})
    }
    if (onRefreshOrders) {
      await onRefreshOrders()
    }
  }

  const handleVerifyReturnPin = async (e) => {
    e.preventDefault()
    const pinClean = handoverPinInput.replace(/\D/g, '').slice(0, 6)
    if (pinClean.length !== 6) {
      setPinError('Masukkan 6 digit kode PIN serah terima dari penyewa.')
      return
    }
    setIsVerifyingPin(true)
    setPinError('')
    setPinSuccessMsg('')
    try {
      const res = await confirmReturnReceipt(order.id, pinClean)
      const nextReturnData = res?.data?.returnData || {
        ...(order.returnData || {}),
        unitReceivedAt: new Date().toISOString()
      }
      setVerifiedReturnData(nextReturnData)
      setPinSuccessMsg(res?.message || 'Serah terima fisik terverifikasi! Timer inspeksi 2x24 jam dimulai.')
      setHandoverPinInput('')
      if (onRefreshOrders) {
        await onRefreshOrders()
      }
    } catch (err) {
      setPinError(err?.message || 'Kode PIN tidak sesuai. Periksa kembali kode dari penyewa.')
    } finally {
      setIsVerifyingPin(false)
    }
  }

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

  const statusUpper = String(order.status || '').trim().toUpperCase()
  const isStep3Active = ['DIKIRIM', 'SEWA_AKTIF', 'PENGIRIMAN', 'SIAP_DIAMBIL', 'BERJALAN', 'AKTIF'].includes(statusUpper)
  const isBelumDiterima =
    statusUpper === 'DIKIRIM' ||
    statusUpper === 'PENGIRIMAN' ||
    statusUpper === 'SIAP_DIAMBIL' ||
    (statusUpper === 'SEWA_AKTIF' && !order.initialBast?.signedAt && !order.unitTaken && !order.unitReceivedAt)

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

        {/* 4B. VERIFIKASI KODE PIN SERAH TERIMA PENGEMBALIAN (FASE 5) */}
        {statusUpper === 'INSPEKSI' && (() => {
          const activeReturnData = verifiedReturnData || order.returnData || {}
          const isPhysicalReceived = Boolean(activeReturnData.unitReceivedAt)
          const returnMethodLabel =
            activeReturnData.returnMethod === 'STORE_DROPOFF'
              ? 'Diantar Sendiri ke Gudang'
              : 'Dijemput Kurir Toko'

          return isPhysicalReceived ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Serah Terima Pengembalian Terverifikasi</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {returnMethodLabel}
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed m-0">
                Unit fisik diterima pada{' '}
                <strong>
                  {new Date(activeReturnData.unitReceivedAt).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </strong>
                . Silakan periksa kondisi fisik alat dan pilih <strong>Alat Aman</strong> atau{' '}
                <strong>Ajukan Klaim Kerusakan</strong> di bawah sebelum batas inspeksi 48 jam berakhir
                {activeReturnData.inspectionDeadline
                  ? ` (${new Date(activeReturnData.inspectionDeadline).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })})`
                  : ''}.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleVerifyReturnPin}
              className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 m-0">
                      Validasi Kode Serah Terima Pengembalian
                    </h4>
                    <p className="text-[11px] text-slate-600 m-0">
                      Metode: <strong>{returnMethodLabel}</strong>
                      {activeReturnData.handedOverAt
                        ? ' · Penyewa menandai unit sudah diserahkan'
                        : ' · Menunggu input PIN 6-digit dari penyewa'}
                    </p>
                  </div>
                </div>
              </div>

              {pinError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={handoverPinInput}
                  onChange={(e) => {
                    setHandoverPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                    if (pinError) setPinError('')
                  }}
                  placeholder="Masukkan 6-digit PIN penyewa"
                  aria-label="Kode PIN Serah Terima Pengembalian"
                  className="flex-1 bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono font-bold tracking-widest text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={isVerifyingPin || handoverPinInput.length !== 6}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  {isVerifyingPin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memvalidasi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Validasi PIN &amp; Terima Unit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )
        })()}

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

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
          {/* Step 4 CTA: Inspeksi (Alat Aman & Ajukan Klaim Kerusakan) */}
          {statusUpper === 'INSPEKSI' && (
            <>
              {/* Tombol Alat Aman (Setujui & Kembalikan Deposit) */}
              <button
                type="button"
                onClick={() => handleOpenInspection('APPROVE')}
                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Alat Aman</span>
              </button>

              {/* Tombol Ajukan Klaim Kerusakan (Dispute) */}
              <button
                type="button"
                onClick={() => handleOpenInspection('DISPUTE')}
                className="flex-1 sm:flex-initial px-4 py-2 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Ajukan Klaim Kerusakan</span>
              </button>
            </>
          )}

          {/* Step 3 CTA: Sedang Disewa / Serah Terima */}
          {/* Tampilkan tombol solid biru "Konfirmasi Serah Terima" (HANYA JIKA alat belum ditandai sudah diambil/diterima oleh penyewa) */}
          {isStep3Active && isBelumDiterima && (
            <button
              type="button"
              disabled={isLoading || isHandoverLoading}
              onClick={() => setIsHandoverModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Konfirmasi Serah Terima</span>
            </button>
          )}

          {/* Step 3: Keterangan jika unit sudah diserahterimakan */}
          {isStep3Active && !isBelumDiterima && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unit telah diserahterimakan (Masa sewa aktif)</span>
            </span>
          )}

          {/* Step 2: Info Menunggu Pembayaran Penyewa */}
          {statusUpper === 'MENUNGGU_PEMBAYARAN' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Penyewa sedang memproses pembayaran</span>
            </span>
          )}

          {/* Step 1 CTA: Tolak & Terima untuk Status Menunggu Konfirmasi */}
          {(!order.status || ['MENUNGGU_KONFIRMASI', 'PENDING'].includes(statusUpper)) && (
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

              {/* Tombol Terima Pesanan (Wajib Mesitra Blue) */}
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

      {/* ── MODAL KONFIRMASI SERAH TERIMA (BAST AWAL) ──────────────────── */}
      <ModalKonfirmasiSerahTerima
        isOpen={isHandoverModalOpen}
        order={order}
        onClose={() => setIsHandoverModalOpen(false)}
        onHandoverSuccess={handleHandoverSuccess}
      />

      {/* ── MODAL INSPEKSI INTERNAL (FALLBACK JIKA TANPA ONINSPECTORDER) ──── */}
      {inspectionModalConfig.isOpen && (
        <ModalVerifikasiInspeksi
          isOpen={inspectionModalConfig.isOpen}
          order={{ ...order, initialMode: inspectionModalConfig.mode }}
          initialMode={inspectionModalConfig.mode}
          onClose={() => setInspectionModalConfig({ isOpen: false, mode: 'APPROVE' })}
          onInspectionCompleted={() => {
            setInspectionModalConfig({ isOpen: false, mode: 'APPROVE' })
            onRefreshOrders?.()
          }}
        />
      )}
    </div>
  )
}
