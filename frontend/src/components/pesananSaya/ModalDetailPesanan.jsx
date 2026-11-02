import React from 'react'
import {
  X,
  FileText,
  Calendar,
  ShieldCheck,
  Truck,
  Store,
  MapPin,
  Phone,
  Building2,
  User,
  Clock,
  CheckCircle2,
  FileCheck,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Zap,
  Tag
} from 'lucide-react'
import { formatLongDate, formatShortDate } from '../../lib/dateHelpers'
import { getSessionUser } from '../../lib/userSession'
import { getOrderStatusBadge } from './orderStatusConstants'

export default function ModalDetailPesanan({
  isOpen,
  onClose,
  order,
  onViewContract
}) {
  if (!isOpen || !order) return null

  const formatRupiah = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`

  const sessionUser = getSessionUser() || {}
  const equipment = order.equipment || {}
  const owner = equipment.owner || {}
  const user = order.user || {}
  const userKyc = user.kycData || sessionUser.kycData || {}

  // Resolusi data penyewa & usaha UMKM dengan fallback aman
  const renterName =
    user.fullName ||
    user.name ||
    sessionUser.fullName ||
    sessionUser.name ||
    'Penyewa'

  const businessName =
    userKyc.businessName ||
    userKyc.namaUsaha ||
    sessionUser.businessName ||
    '-'

  const renterPhone =
    user.phone ||
    userKyc.phone ||
    userKyc.whatsapp ||
    sessionUser.phone ||
    '-'

  const renterEmail = user.email || sessionUser.email || '-'

  const renterAddress =
    userKyc.businessAddress ||
    userKyc.address ||
    userKyc.alamat ||
    sessionUser.address ||
    order.shippingAddress ||
    '-'

  // Resolusi data alat & durasi
  const equipmentName = equipment.name || 'Unit Alat Produksi'
  const equipmentCategory = equipment.category || 'Alat Produksi'
  const equipmentPower = equipment.powerWatt ? `${equipment.powerWatt}W` : '-'
  const equipmentLocation = equipment.location || 'Indonesia'
  const ownerWarehouseAddress =
    equipment.address ||
    equipment.warehouseAddress ||
    owner.address ||
    equipmentLocation

  const startDateText = order.startDate ? formatLongDate(order.startDate) : '-'
  const endDateText = order.endDate ? formatLongDate(order.endDate) : '-'
  const rentalDays = order.rentalDays || 1
  const pricePerDay =
    equipment.pricePerDay ||
    Math.round((order.rentalCost || 0) / rentalDays) ||
    0

  // Status pesanan
  const statusInfo = getOrderStatusBadge(order.status)

  // Data metode logistik
  const isPickup = order.deliveryMethod === 'PICKUP'

  // Layanan tambahan & diskon
  const addonsList = Array.isArray(order.addons) ? order.addons : []
  const addonsCost = order.addonsCost || 0
  const discountAmount = order.discountAmount || 0
  const promoCode = order.promoCode || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 m-0">
                  Detail Pesanan
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 tracking-tight">
                  {order.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Rincian lengkap pengajuan sewa, tarif escrow, logistik, dan data UMKM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* 1. Status Pesanan & Dokumen Kontrak */}
          <div className="p-4 rounded-xl bg-slate-50 ring-1 ring-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Status Pesanan Saat Ini:
                </span>
                <span
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full ring-1 ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Diajukan pada {formatShortDate(order.createdAt || order.startDate)}
              </span>
            </div>
            <p className="text-xs text-slate-600 m-0 leading-relaxed">
              {statusInfo.description}
            </p>

            {/* Dokumen Kontrak Sewa Digital */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold text-slate-800">
                    Kontrak Sewa Digital Telah Disetujui
                  </span>
                  <p className="text-[10px] text-slate-500 m-0 mt-0.5">
                    {order.contractAgreedAt
                      ? `Disetujui pada ${formatLongDate(order.contractAgreedAt)} WIB`
                      : 'Klausul kontrak elektronik mengikat kedua belah pihak.'}
                  </p>
                </div>
              </div>
              {onViewContract && (
                <button
                  type="button"
                  onClick={() => onViewContract(order)}
                  className="py-1 px-2.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Lihat Klausul Kontrak</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Informasi Alat & Durasi Sewa */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 m-0 flex items-center gap-1.5">
              <span>Informasi Alat &amp; Periode Sewa</span>
            </h4>
            <div className="p-4 rounded-xl ring-1 ring-slate-200 bg-white space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-16 h-14 bg-slate-100 rounded-xl ring-1 ring-slate-200 overflow-hidden shrink-0">
                  <img
                    src={
                      equipment.imageUrl ||
                      (Array.isArray(equipment.images) && equipment.images[0]) ||
                      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={equipmentName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-slate-900 truncate m-0">
                    {equipmentName}
                  </h5>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">
                      {equipmentCategory}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Daya {equipmentPower}
                    </span>
                    <span>·</span>
                    <span>
                      Pemilik: <strong className="text-blue-600">{owner.fullName || 'Pemilik Alat'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Tanggal & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Tanggal Mulai Sewa
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                    {startDateText}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Tanggal Selesai Sewa
                  </span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                    {endDateText}
                  </span>
                </div>
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">
                    Total Durasi
                  </span>
                  <span className="text-xs font-extrabold text-blue-900 mt-0.5 block">
                    {rentalDays} Hari Sewa
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Metode Serah Terima & Logistik */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 m-0">
              Metode Serah Terima &amp; Logistik
            </h4>
            <div className="p-4 rounded-xl ring-1 ring-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isPickup ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isPickup ? (
                      <Store className="w-4 h-4" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {isPickup ? 'Ambil Sendiri di Gudang Pemilik' : 'Diantar Kurir Toko'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isPickup
                        ? 'Penyewa datang mengambil & mengembalikan unit langsung ke gudang mitra.'
                        : 'Unit diantar langsung ke lokasi usaha penyewa oleh armada pengirim.'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-800 shrink-0">
                  {order.shippingCost === 0 ? 'Gratis (Rp 0)' : formatRupiah(order.shippingCost)}
                </span>
              </div>

              {/* Alamat Pengiriman / Lokasi Operasional Usaha */}
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-slate-900 block text-[11px]">
                    {isPickup
                      ? 'Alamat Gudang / Lokasi Pengambilan Alat:'
                      : 'Alamat Pengiriman / Lokasi Operasional Usaha:'}
                  </span>
                  <p className="text-xs text-slate-600 m-0 mt-0.5 leading-relaxed">
                    {isPickup ? ownerWarehouseAddress : renterAddress}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Data Penyewa & Usaha UMKM */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 m-0">
              Data Penyewa &amp; Usaha UMKM
            </h4>
            <div className="p-4 rounded-xl ring-1 ring-slate-200 bg-white space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Nama Penyewa
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {renterName}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Nama Usaha UMKM
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {businessName}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Kontak WhatsApp / HP
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {renterPhone}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Email Akun
                    </span>
                    <span className="font-semibold text-slate-800 text-xs truncate">
                      {renterEmail}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan Khusus Pengajuan */}
              <div className="pt-2.5 border-t border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Catatan Khusus untuk Pemilik Alat:</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 italic border border-slate-200/70">
                  &ldquo;{order.renterNotes || 'Tidak ada catatan khusus pengajuan.'}&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* 5. Rincian Biaya & Rekening Escrow */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 m-0">
              Rincian Biaya &amp; Transaksi Escrow
            </h4>
            <div className="p-4 rounded-xl ring-1 ring-slate-200 bg-white space-y-2.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>
                  Tarif Sewa Harian ({rentalDays} hari × {formatRupiah(pricePerDay)})
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatRupiah(order.rentalCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Biaya Pengiriman &amp; Logistik</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {order.shippingCost === 0 ? 'Gratis' : formatRupiah(order.shippingCost)}
                </span>
              </div>

              {/* Addons jika ada */}
              {addonsCost > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Layanan Tambahan (Add-ons)</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    +{formatRupiah(addonsCost)}
                  </span>
                </div>
              )}

              {/* Diskon / Promo jika ada */}
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Potongan Promo ({promoCode || 'DISKON'})
                  </span>
                  <span className="font-bold tabular-nums">
                    -{formatRupiah(discountAmount)}
                  </span>
                </div>
              )}

              {/* Security Deposit */}
              <div className="flex justify-between items-start text-slate-600 pt-1 border-t border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800">
                    Security Deposit (Jaminan Alat)
                  </span>
                  <span className="block text-[10px] text-emerald-600">
                    Ditahan di escrow · 100% dikembalikan saat inspeksi selesai
                  </span>
                </div>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatRupiah(order.depositAmount)}
                </span>
              </div>

              {/* Total Paid */}
              <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-sm font-extrabold text-slate-900 block">
                    Total Pembayaran
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Metode: {order.paymentMethod ? (order.paymentMethod === 'QRIS' ? 'QRIS Escrow' : order.paymentMethod) : 'Escrow MyRent'}
                  </span>
                </div>
                <span className="text-lg font-black text-blue-600 tabular-nums">
                  {formatRupiah(order.totalPaid)}
                </span>
              </div>
            </div>
          </div>

          {/* Info Banner Escrow Guarantee */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-xl text-blue-900 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="m-0 leading-relaxed">
              Seluruh dana sewa dan security deposit Anda ditahan aman di rekening escrow MyRent. Dana sewa hanya diteruskan ke pemilik setelah konfirmasi penerimaan alat, dan deposit dikembalikan utuh pasca inspeksi akhir.
            </p>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

