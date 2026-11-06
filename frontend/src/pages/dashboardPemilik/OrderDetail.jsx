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
  ShieldCheck
} from 'lucide-react'

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`

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

  const user = order.user || {}
  const equipment = order.equipment || {}
  const initials = user.initials || user.fullName?.substring(0, 2).toUpperCase() || 'UM'

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

          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Menunggu konfirmasi</span>
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
                  {user.fullName || 'Dapur Roti Andini'}
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Terverifikasi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                NIB {user.nib || '9120 4471 8830'} · {user.power || 'Daya usaha 1300 W'} · {user.city || 'Bandung'}
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
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {equipment.name || 'Oven Deck Bakery 2 Pintu'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {order.rentalDays || 4} hari sewa · {order.deliveryType || 'Ambil di gudang'}
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <div className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">
              {formatRupiah(order.totalPaid || order.rentalCost)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {formatRupiah(order.dailyRate || 375000)} / hari
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
                {order.startDate ? new Date(order.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '18 Jun 2025'}
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
                {order.endDate ? new Date(order.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '21 Jun 2025'}
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
                {order.location || 'Gudang Cilandak'}
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
            <span>Biaya sewa ({order.rentalDays || 4} hari)</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatRupiah(order.rentalCost || 1500000)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Deposit jaminan</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatRupiah(order.depositAmount || 500000)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Biaya layanan</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatRupiah(order.serviceFee || 25000)}
            </span>
          </div>

          <div className="h-px bg-slate-200 my-1" />

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs font-bold text-slate-900">
              Diterima setelah selesai
            </span>
            <span className="text-sm sm:text-base font-extrabold text-blue-600 tabular-nums">
              {formatRupiah(order.netEarnings || order.rentalCost || 1550000)}
            </span>
          </div>
        </div>

        {/* 5. RIWAYAT PESANAN / TIMELINE */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
            Riwayat Pesanan
          </h4>

          <div className="space-y-3 pl-1">
            <div className="flex items-start gap-3 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0 ring-4 ring-blue-100" />
              <div>
                <p className="text-xs font-bold text-slate-900">Pengajuan dikirim</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  10 Jun · 08.12 · oleh {user.fullName || 'Dapur Roti Andini'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0 ring-4 ring-amber-100" />
              <div>
                <p className="text-xs font-bold text-slate-900">Menunggu konfirmasi Anda</p>
                <p className="text-[11px] text-slate-500 font-medium">Batas respons 1×24 jam</p>
              </div>
            </div>

            <div className="flex items-start gap-3 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mt-1 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-500">Pembayaran & escrow</p>
                <p className="text-[11px] text-slate-400 font-medium">Aktif setelah Anda menyetujui</p>
              </div>
            </div>
          </div>
        </div>
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
