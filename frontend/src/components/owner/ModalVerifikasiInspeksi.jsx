import React, { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Check,
  Store,
  DollarSign,
  FileText,
  Camera,
  Plus,
  Trash2
} from 'lucide-react'
import { completeInspection } from '../../lib/ordersApi'
import { formatLongDate } from '../../lib/dateHelpers'

export default function ModalVerifikasiInspeksi({
  isOpen,
  onClose,
  order,
  onInspectionCompleted,
  initialMode = 'APPROVE'
}) {
  if (!isOpen || !order) return null

  const defaultDecision = order.initialMode || initialMode || 'APPROVE'
  const [decisionMode, setDecisionMode] = useState(defaultDecision) // 'APPROVE' | 'DISPUTE'

  useEffect(() => {
    const activeDecision = order?.initialMode || initialMode || 'APPROVE'
    setDecisionMode(activeDecision)
  }, [order?.initialMode, initialMode, isOpen])
  const [ownerNotes, setOwnerNotes] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [damageFee, setDamageFee] = useState(
    order.damageFee || order.returnData?.damageFeeClaimed || Math.round((order.depositAmount || 0) * 0.5)
  )
  const [damagePhotos, setDamagePhotos] = useState(
    order.ownerInspectionPhotos && Array.isArray(order.ownerInspectionPhotos)
      ? order.ownerInspectionPhotos
      : [
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
        ]
  )
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const formatRupiah = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`
  const equipment = order.equipment || {}
  const renter = order.user || {}
  const renterName = renter.kycData?.businessName || renter.fullName || renter.email || 'Penyewa UMKM'

  // Ekstraksi Foto BAST Awal
  const initialBast = order.initialBast || {}
  const initialPhotosObj = initialBast.photos || {}
  const initialPhotos = Array.isArray(initialPhotosObj)
    ? initialPhotosObj
    : [initialPhotosObj.front, initialPhotosObj.side, initialPhotosObj.panel, ...(initialPhotosObj.extra || [])].filter(Boolean)

  // Ekstraksi Foto BAST Akhir (Penyewa)
  const returnData = order.returnData || {}
  const returnPhotosObj = returnData.photos || {}
  const returnPhotos = Array.isArray(returnPhotosObj)
    ? returnPhotosObj
    : [returnPhotosObj.front, returnPhotosObj.side, returnPhotosObj.panel, ...(returnPhotosObj.extra || [])].filter(Boolean)

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return
    setDamagePhotos((prev) => [...prev, newPhotoUrl.trim()])
    setNewPhotoUrl('')
  }

  const handleRemovePhoto = (index) => {
    setDamagePhotos((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      if (decisionMode === 'APPROVE') {
        const res = await completeInspection(order.id, {
          approveRefund: true,
          ownerNotes
        })
        if (onInspectionCompleted) {
          onInspectionCompleted(res.data, 'Inspeksi disetujui. Dana deposit telah diteruskan ke penyewa dan dana sewa dicairkan ke saldo Anda.')
        }
        onClose()
      } else {
        // DISPUTE
        if (!disputeReason.trim()) {
          setErrorMsg('Alasan klaim kerusakan wajib diisi.')
          setIsSubmitting(false)
          return
        }

        const feeNum = Number(damageFee) || 0
        if (feeNum <= 0) {
          setErrorMsg('Nominal tuntutan ganti rugi harus lebih dari Rp 0.')
          setIsSubmitting(false)
          return
        }

        if (feeNum > (order.depositAmount || 0)) {
          setErrorMsg(`Nominal tuntutan ganti rugi maksimal sebesar deposit (${formatRupiah(order.depositAmount)}).`)
          setIsSubmitting(false)
          return
        }

        const res = await completeInspection(order.id, {
          approveRefund: false,
          ownerNotes,
          disputeReason: disputeReason.trim(),
          damageFee: feeNum,
          ownerInspectionPhotos: damagePhotos
        })

        if (onInspectionCompleted) {
          onInspectionCompleted(res.data, 'Klaim sengketa berhasil diajukan. Status pesanan diubah ke DISPUTE untuk mediasi Admin HQ.')
        }
        onClose()
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses inspeksi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 m-0">
                  Verifikasi Inspeksi Fisik BAST Unit
                </h3>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Status: INSPEKSI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                Invoice: <span className="font-mono font-bold text-slate-700">{order.invoiceNumber}</span> · Penyewa: <strong className="text-slate-800">{renterName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Unit & Escrow Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unit Alat Produksi</span>
              <p className="text-xs font-bold text-slate-900 m-0 truncate">{equipment.name || 'Alat'}</p>
              <span className="text-[10px] text-slate-500">{equipment.category || 'Peralatan'} · {order.rentalDays || 1} hari sewa</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Biaya Sewa Bersih</span>
              <p className="text-sm font-black text-blue-700 m-0 tabular-nums">
                {formatRupiah((order.rentalCost || 0) + (order.shippingCost || 0))}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">Cair ke saldo pemilik</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Deposit (Escrow)</span>
              <p className="text-sm font-black text-slate-900 m-0 tabular-nums">
                {formatRupiah(order.depositAmount)}
              </p>
              <span className="text-[10px] text-slate-500">Ditahan aman di escrow</span>
            </div>
          </div>

          {/* Side-by-Side Visual Comparison (BAST Awal vs BAST Akhir) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Komparasi Visual BAST Awal vs BAST Akhir
              </span>
              <span className="text-[11px] text-slate-400">Tinjau foto sebelum memutuskan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Kolom Kiri: BAST Awal */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    BAST Awal (Sebelum Sewa)
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded">
                    Serah Terima Awal
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Foto Kondisi Awal:</span>
                  {initialPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {initialPhotos.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-slate-200 border border-slate-300 hover:opacity-90 transition block"
                        >
                          <img src={url} alt={`Awal ${idx}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-slate-400 text-[11px]">
                      Foto dari katalog terverifikasi pemilik saat serah terima.
                    </div>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  <strong className="block text-[10px] text-slate-400 uppercase font-bold">Catatan Serah Terima:</strong>
                  <span>{initialBast.notes || 'Unit diserahkan dalam kondisi siap pakai, aksesoris lengkap.'}</span>
                </div>
              </div>

              {/* Kolom Kanan: BAST Akhir (Pengembalian Penyewa) */}
              <div className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    BAST Akhir (Pengembalian Penyewa)
                  </span>
                  <span className="text-[10px] text-blue-700 bg-blue-100 font-semibold px-2 py-0.5 rounded">
                    Kondisi Kembali
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Foto yang Diunggah Penyewa:</span>
                  {returnPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {returnPhotos.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-slate-200 border border-slate-300 hover:opacity-90 transition block"
                        >
                          <img src={url} alt={`Kembali ${idx}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-slate-400 text-[11px]">
                      Belum ada foto yang diunggah penyewa.
                    </div>
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-blue-200 text-[11px] text-slate-600">
                  <strong className="block text-[10px] text-slate-400 uppercase font-bold">Catatan Pengembalian:</strong>
                  <span>{returnData.conditionNotes || returnData.notes || 'Penyewa telah menyerahkan kembali unit fisik sesuai jadwal.'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Form Keputusan Pemilik */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Pilihan Keputusan Hasil Inspeksi
            </span>

            {/* Toggle Tab Keputusan */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecisionMode('APPROVE')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  decisionMode === 'APPROVE'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  decisionMode === 'APPROVE' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                }`}>
                  {decisionMode === 'APPROVE' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Setujui &amp; Kembalikan Deposit</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Unit dalam kondisi baik. 100% deposit ({formatRupiah(order.depositAmount)}) dikembalikan ke penyewa, dan biaya sewa cair ke saldo Anda.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecisionMode('DISPUTE')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  decisionMode === 'DISPUTE'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  decisionMode === 'DISPUTE' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
                }`}>
                  {decisionMode === 'DISPUTE' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Ajukan Klaim Kerusakan (Dispute)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Tolak BAST akhir karena unit rusak/cacat/kurang kelengkapan. Dana dibekukan di escrow untuk dimediasi Admin MyRent.
                  </p>
                </div>
              </button>
            </div>

            {/* Input Tambahan Jika Setuju */}
            {decisionMode === 'APPROVE' && (
              <div className="space-y-1.5 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <label className="text-[11px] font-bold text-emerald-950 block">
                  Catatan Inspeksi untuk Penyewa (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Misal: Unit diterima sangat bersih dan tepat waktu, terima kasih!"
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Form Klaim Jika Dispute */}
            {decisionMode === 'DISPUTE' && (
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Form Pengajuan Klaim Kerusakan Unit</span>
                </div>

                {/* Input Alasan Klaim */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 block">
                    Alasan Klaim Kerusakan / Ketidaksesuaian <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Jelaskan secara spesifik kerusakan fisik, komponen yang hilang, atau fungsi mesin yang rusak..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:border-rose-500 leading-relaxed"
                  />
                </div>

                {/* Input Nominal Ganti Rugi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800">
                      Tuntutan Estimasi Biaya Ganti Rugi (Maksimal {formatRupiah(order.depositAmount)}) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-black text-rose-700 tabular-nums">
                      {formatRupiah(damageFee)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={order.depositAmount}
                      step={50000}
                      value={damageFee}
                      onChange={(e) => setDamageFee(Number(e.target.value))}
                      className="w-40 text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-rose-500 tabular-nums"
                    />
                    <input
                      type="range"
                      min={0}
                      max={order.depositAmount}
                      step={25000}
                      value={damageFee}
                      onChange={(e) => setDamageFee(Number(e.target.value))}
                      className="flex-1 accent-rose-600 cursor-pointer"
                    />
                  </div>

                  {/* Preset Tombol Cepat */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">Preset:</span>
                    <button
                      type="button"
                      onClick={() => setDamageFee(Math.round((order.depositAmount || 0) * 0.25))}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:border-slate-400 cursor-pointer"
                    >
                      25% Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDamageFee(Math.round((order.depositAmount || 0) * 0.5))}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:border-slate-400 cursor-pointer"
                    >
                      50% Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDamageFee(order.depositAmount || 0)}
                      className="px-2 py-0.5 rounded bg-rose-100 border border-rose-200 text-[10px] text-rose-700 font-bold hover:bg-rose-200 cursor-pointer"
                    >
                      100% Deposit
                    </button>
                  </div>
                </div>

                {/* Upload / Input Foto Bukti Kerusakan Pemilik */}
                <div className="space-y-2 pt-1 border-t border-rose-200/60">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span>Foto Bukti Kerusakan dari Sisi Pemilik:</span>
                    <span className="text-[10px] font-normal text-slate-400">URL Foto atau Bukti Faktur</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Tempel URL foto bukti kerusakan (mis. https://...)"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  {damagePhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {damagePhotos.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-rose-300 group">
                          <img src={url} alt={`Bukti ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {decisionMode === 'APPROVE'
              ? 'Pencairan dana langsung dieksekusi secara otomatis.'
              : 'Status diubah ke DISPUTE untuk peninjauan admin.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>

            {decisionMode === 'APPROVE' ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="py-2.5 px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Memproses...' : 'Setujui & Kembalikan Deposit'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="py-2.5 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{isSubmitting ? 'Mengirim Klaim...' : 'Ajukan Klaim Kerusakan (Dispute)'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

