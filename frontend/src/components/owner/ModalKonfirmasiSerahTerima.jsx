import React, { useState, useEffect } from 'react'
import {
  X,
  PackageCheck,
  CheckCircle2,
  Calendar,
  User,
  Package,
  Truck,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { confirmDelivery } from '../../lib/ordersApi'

export default function ModalKonfirmasiSerahTerima({
  isOpen,
  onClose,
  order,
  onHandoverSuccess
}) {
  const [checklist, setChecklist] = useState({
    mesinMenyala: true,
    bodiMulus: true,
    aksesorisLengkap: true
  })
  const [notes, setNotes] = useState('Unit diserahkan dalam kondisi baik dan siap pakai, aksesoris lengkap.')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen && order?.id) {
      setChecklist({
        mesinMenyala: true,
        bodiMulus: true,
        aksesorisLengkap: true
      })
      setNotes('Unit diserahkan dalam kondisi baik dan siap pakai, aksesoris lengkap.')
      setErrorMessage('')
    }
  }, [isOpen, order?.id])

  if (!isOpen || !order) return null

  const tenant = order.user || order.tenant || {}
  const equipment = order.equipment || {}
  const renterName = tenant.kycData?.businessName || tenant.fullName || 'Penyewa UMKM'

  const handleToggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setErrorMessage('')

    if (!checklist.mesinMenyala || !checklist.bodiMulus || !checklist.aksesorisLengkap) {
      setErrorMessage('Harap centang seluruh checklist verifikasi kondisi unit sebelum serah terima.')
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()
      const initialBast = {
        notes: notes.trim() || 'Unit diserahkan dalam kondisi baik dan siap pakai.',
        checklist,
        signedAt: now,
        confirmedBy: 'OWNER',
        photos: equipment.images || [equipment.imageUrl].filter(Boolean)
      }

      const res = await confirmDelivery(order.id, initialBast)
      if (onHandoverSuccess) {
        onHandoverSuccess(res, 'Serah terima berhasil dikonfirmasi! Masa sewa resmi aktif.')
      }
      onClose()
    } catch (err) {
      setErrorMessage(err.message || 'Gagal mengonfirmasi serah terima unit.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startDateFormatted = order.startDate
    ? new Date(order.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'
  const endDateFormatted = order.endDate
    ? new Date(order.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-'

  const deliveryText =
    order.deliveryMethod === 'COURIER'
      ? 'Diantar via kurir toko'
      : (order.deliveryType || 'Ambil langsung di gudang/toko')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Konfirmasi Serah Terima Unit
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Penerbitan Berita Acara Serah Terima (BAST Awal) Digital
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Ringkasan Pesanan */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 border-b border-slate-200/60 pb-1.5">
              <span>{order.invoiceNumber}</span>
              <span className="font-sans font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Tahap: Sedang Disewa
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>{equipment.name || 'Unit Alat'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{renterName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{deliveryText}</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Masa Sewa: {startDateFormatted} – {endDateFormatted} ({order.rentalDays || 1} hari)</span>
              </div>
            </div>
          </div>

          {/* Checklist Verifikasi Fisik Unit */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wide block">
              Checklist Kondisi Awal Unit
            </label>
            <div className="space-y-2">
              {[
                { key: 'mesinMenyala', label: 'Unit dalam kondisi prima, bersih, dan mesin berfungsi normal' },
                { key: 'bodiMulus', label: 'Bodi fisik utuh, tidak ada kerusakan/retak di luar aus wajar' },
                { key: 'aksesorisLengkap', label: 'Aksesoris, kabel, dan kelengkapan unit telah diperiksa lengkap' }
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    checklist[item.key]
                      ? 'bg-blue-50/50 border-blue-200 text-slate-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={() => handleToggleCheck(item.key)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[11px] leading-snug">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Catatan Serah Terima */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wide block">
              Catatan Serah Terima (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan khusus kondisi awal alat jika ada..."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Banner Informasi Keamanan */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Dengan mengonfirmasi, <strong>Berita Acara Serah Terima (BAST Awal)</strong> resmi diterbitkan dan status pesanan beralih ke <strong>Sewa Aktif</strong>.
            </p>
          </div>

          {/* Pesan Kesalahan jika ada */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Memproses BAST...' : 'Konfirmasi & Terbitkan BAST Awal'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
