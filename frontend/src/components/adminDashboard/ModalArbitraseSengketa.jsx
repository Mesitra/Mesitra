import React, { useEffect, useState, useMemo } from 'react'
import {
  X,
  Scale,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  User,
  ArrowRight,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react'
import { fetchDispute, resolveDispute } from './adminApi'

const formatRupiah = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val || 0)
}

function extractBastPhotos(photosSource) {
  if (!photosSource) return []
  if (Array.isArray(photosSource)) return photosSource.filter(Boolean)
  if (typeof photosSource === 'object') {
    const { front, side, panel, back, extra } = photosSource
    const extraArr = Array.isArray(extra) ? extra : []
    return [front, side, panel, back, ...extraArr].filter(Boolean)
  }
  return []
}

export default function ModalArbitraseSengketa({ isOpen, onClose, disputeId, onSuccess }) {
  const [dispute, setDispute] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED_SPLIT')
  const [damageFee, setDamageFee] = useState('')
  const [adminNote, setAdminNote] = useState('')

  useEffect(() => {
    if (!isOpen || !disputeId) {
      setDispute(null)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setLoadError('')
    setActionError('')

    fetchDispute(disputeId)
      .then((data) => {
        if (!isMounted) return
        setDispute(data)
        if (data) {
          const deposit = data.order?.depositAmount || 0
          const claim = data.claimAmount || 0
          // Default initial selection
          if (data.status?.startsWith('RESOLVED_')) {
            setResolutionStatus(data.status)
            setDamageFee(String(data.finalDamageFee ?? 0))
            setAdminNote(data.adminArbitrageNote || '')
          } else {
            setResolutionStatus('RESOLVED_SPLIT')
            setDamageFee(String(Math.min(claim || deposit, deposit)))
            setAdminNote('')
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setLoadError(err.message || 'Gagal memuat detail sengketa.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, disputeId])

  const depositAmount = dispute?.order?.depositAmount || 0
  const rentalCost = dispute?.order?.rentalCost || 0
  const isResolved = dispute?.status?.startsWith('RESOLVED_')

  // Perhitungan real-time sesuai pilihan putusan
  const calc = useMemo(() => {
    let feeNum = 0
    if (resolutionStatus === 'RESOLVED_RENTER_WIN') {
      feeNum = 0
    } else if (resolutionStatus === 'RESOLVED_OWNER_WIN') {
      const parsed = parseFloat(damageFee)
      feeNum = isNaN(parsed) ? (dispute?.claimAmount || depositAmount) : Math.min(parsed, depositAmount)
    } else {
      const parsed = parseFloat(damageFee)
      feeNum = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, depositAmount))
    }

    const refundRenter = Math.max(0, depositAmount - feeNum)
    const platformFee = Math.round(rentalCost * 0.05)
    const netRentalIncome = Math.max(0, rentalCost - platformFee)
    const shippingAndAddons = (dispute?.order?.shippingCost || 0) + (dispute?.order?.addonsCost || 0)
    const payoutOwner = netRentalIncome + shippingAndAddons + feeNum

    return {
      feeNum,
      refundRenter,
      platformFee,
      payoutOwner
    }
  }, [resolutionStatus, damageFee, depositAmount, rentalCost, dispute])

  const handleSelectStatus = (newStatus) => {
    setResolutionStatus(newStatus)
    if (newStatus === 'RESOLVED_RENTER_WIN') {
      setDamageFee('0')
    } else if (newStatus === 'RESOLVED_OWNER_WIN') {
      setDamageFee(String(Math.min(dispute?.claimAmount || depositAmount, depositAmount)))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!dispute || isResolved) return

    if (!adminNote.trim()) {
      setActionError('Catatan resmi putusan mediasi wajib diisi.')
      return
    }

    setIsSubmitting(true)
    setActionError('')

    try {
      await resolveDispute(dispute.id, {
        status: resolutionStatus,
        finalDamageFee: calc.feeNum,
        adminArbitrageNote: adminNote.trim()
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setActionError(err.message || 'Gagal mengeksekusi putusan arbitrase.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Normalisasi Foto-foto (mendukung array maupun objek front/side/panel/back)
  const initialPhotos = extractBastPhotos(dispute?.order?.initialBast?.photos)
  const returnPhotos = extractBastPhotos(dispute?.order?.returnData?.photos)
  const initialChecklist =
    dispute?.order?.initialBast?.conditionChecklist ||
    dispute?.order?.initialBast?.checklist ||
    null

  const ownerInspectionPhotos = Array.isArray(dispute?.ownerPhotos) && dispute.ownerPhotos.length > 0
    ? dispute.ownerPhotos
    : extractBastPhotos(dispute?.order?.ownerInspectionPhotos)

  const renterCounterPhotos = Array.isArray(dispute?.renterCounterPhotos)
    ? dispute.renterCounterPhotos
    : extractBastPhotos(dispute?.order?.renterCounterPhotos)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Mediasi & Arbitrase Sengketa
                </h2>
                {dispute?.ticketNumber ? (
                  <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {dispute.ticketNumber}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">
                Putusan admin bersifat final, otomatis mendistribusikan escrow & mengembalikan status alat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Memuat detail sengketa & berkas BAST...</p>
            </div>
          ) : loadError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{loadError}</p>
            </div>
          ) : dispute ? (
            <>
              {/* Status Banner jika sudah diputus */}
              {isResolved ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-emerald-900">
                      Sengketa ini telah diputuskan ({dispute.status})
                    </p>
                    <p className="text-emerald-700 text-xs mt-0.5">
                      {dispute.adminArbitrageNote || 'Tidak ada catatan.'}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Ringkasan Pesanan & Pihak Bersengketa */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Alat Sewa
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {dispute.order?.equipment?.name || '—'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {dispute.order?.invoiceNumber}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Pemilik Alat
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {dispute.order?.equipment?.owner?.fullName || dispute.owner?.fullName || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dispute.order?.equipment?.owner?.email || dispute.owner?.email}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Penyewa
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {dispute.renter?.fullName || dispute.order?.user?.fullName || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dispute.renter?.email || dispute.order?.user?.email}
                  </p>
                </div>
              </div>

              {/* Perbandingan Bukti Side-by-Side BAST */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span>Perbandingan Bukti Kondisi Alat</span>
                  <span className="text-xs font-normal text-slate-500">(Sebelum vs Sesudah Sewa)</span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Kiri: Sebelum Sewa (BAST Awal) */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h4 className="font-bold text-sm text-slate-900">BAST Awal (Sebelum Sewa)</h4>
                      </div>
                      <span className="text-xs text-slate-400">Verifikasi Pemilik & Penyewa</span>
                    </div>

                    {/* Foto BAST */}
                    <div>
                      <span className="text-xs text-slate-500 block mb-2 font-medium">Foto Kondisi Awal:</span>
                      {initialPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {initialPhotos.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="aspect-square rounded-lg bg-slate-100 overflow-hidden border border-slate-200 block group relative"
                            >
                              <img
                                src={url}
                                alt={`BAST ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-slate-50 text-center text-xs text-slate-400">
                          Tidak ada lampiran foto BAST awal.
                        </div>
                      )}
                    </div>

                    {/* Checklist BAST */}
                    {initialChecklist ? (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500 block mb-1 font-medium">Checklist:</span>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {Object.entries(initialChecklist).map(([key, ok]) => (
                            <div key={key} className="flex items-center gap-1.5 text-slate-700">
                              <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="font-semibold">{ok ? 'Normal' : 'Bermasalah'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Foto BAST Akhir (Saat Pengembalian oleh Penyewa) */}
                    {returnPhotos.length > 0 ? (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500 block mb-2 font-medium">Foto BAST Akhir (Saat Dikembalikan):</span>
                        <div className="grid grid-cols-3 gap-2">
                          {returnPhotos.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="aspect-square rounded-lg bg-slate-100 overflow-hidden border border-slate-200 block group relative"
                            >
                              <img
                                src={url}
                                alt={`BAST Akhir ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Kanan: Setelah Sewa (Klaim Pemilik vs Sanggahan Penyewa) */}
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-red-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <h4 className="font-bold text-sm text-red-950">Klaim Kerusakan Pemilik</h4>
                      </div>
                      <span className="text-xs font-bold text-red-700">
                        Klaim: {formatRupiah(dispute.claimAmount)}
                      </span>
                    </div>

                    {/* Alasan Klaim */}
                    <div>
                      <span className="text-xs text-slate-500 block font-medium">Keluhan Kerusakan:</span>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        {dispute.disputeReason || dispute.order?.disputeReason || '—'}
                      </p>
                    </div>

                    {/* Foto Kerusakan */}
                    <div>
                      <span className="text-xs text-slate-500 block mb-2 font-medium">Foto Bukti Kerusakan:</span>
                      {ownerInspectionPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {ownerInspectionPhotos.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="aspect-square rounded-lg bg-slate-100 overflow-hidden border border-red-200 block group relative"
                            >
                              <img
                                src={url}
                                alt={`Kerusakan ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-white/70 text-center text-xs text-slate-400">
                          Tidak ada lampiran foto kerusakan.
                        </div>
                      )}
                    </div>

                    {/* Sanggahan Penyewa jika ada */}
                    {dispute.renterDefenseNote || renterCounterPhotos.length > 0 ? (
                      <div className="pt-2 border-t border-red-100 space-y-2">
                        <span className="text-xs text-slate-700 font-bold block">Sanggahan Penyewa:</span>
                        {dispute.renterDefenseNote ? (
                          <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                            {dispute.renterDefenseNote}
                          </p>
                        ) : null}
                        {renterCounterPhotos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {renterCounterPhotos.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="aspect-square rounded-lg bg-slate-100 overflow-hidden border border-slate-200 block"
                              >
                                <img src={url} alt={`Counter ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Form Arbitrase Admin */}
              <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {isResolved ? 'Ringkasan Putusan Arbitrase' : 'Keputusan Mediasi Admin'}
                  </h3>
                </div>

                {/* Pilihan Putusan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    disabled={isResolved}
                    onClick={() => handleSelectStatus('RESOLVED_OWNER_WIN')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-default ${
                      resolutionStatus === 'RESOLVED_OWNER_WIN'
                        ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <span className="font-bold text-sm text-slate-900 block">Menangkan Pemilik</span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      Klaim kerusakan disetujui penuh (maksimal sebatas deposit).
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isResolved}
                    onClick={() => handleSelectStatus('RESOLVED_RENTER_WIN')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-default ${
                      resolutionStatus === 'RESOLVED_RENTER_WIN'
                        ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <span className="font-bold text-sm text-slate-900 block">Menangkan Penyewa</span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      Klaim ditolak, deposit kembali utuh 100% ke penyewa.
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isResolved}
                    onClick={() => handleSelectStatus('RESOLVED_SPLIT')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-default ${
                      resolutionStatus === 'RESOLVED_SPLIT'
                        ? 'border-blue-600 bg-white shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <span className="font-bold text-sm text-slate-900 block">Bagi Proporsional (Split)</span>
                    <span className="text-xs text-slate-500 mt-1 block">
                      Admin menetapkan nominal ganti rugi wajar secara custom.
                    </span>
                  </button>
                </div>

                {/* Input Nominal Ganti Rugi jika Menang Pemilik atau Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nominal Ganti Rugi Kerusakan (Rp)
                    </label>
                    <input
                      type="number"
                      disabled={isResolved || resolutionStatus === 'RESOLVED_RENTER_WIN'}
                      value={damageFee}
                      onChange={(e) => setDamageFee(e.target.value)}
                      placeholder="0"
                      min={0}
                      max={depositAmount}
                      className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Deposit ditahan: <strong className="text-slate-700">{formatRupiah(depositAmount)}</strong>. (Ganti rugi tidak boleh melebihi deposit).
                    </p>
                  </div>

                  {/* Kalkulasi Otomatis Pembagian Escrow */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                      Distribusi Dana Escrow
                    </span>
                    <div className="flex justify-between text-slate-600">
                      <span>Ganti rugi diteruskan ke Pemilik:</span>
                      <strong className="text-amber-700">{formatRupiah(calc.feeNum)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Sisa deposit dikembalikan ke Penyewa:</span>
                      <strong className="text-emerald-700">{formatRupiah(calc.refundRenter)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                      <span>Total pencairan ke dompet Pemilik (Sewa + Ganti Rugi):</span>
                      <strong className="text-blue-700 font-bold">{formatRupiah(calc.payoutOwner)}</strong>
                    </div>
                  </div>
                </div>

                {/* Catatan Mediasi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Resmi Putusan Mediasi Admin <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    disabled={isResolved}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Contoh: Berdasarkan komparasi foto BAST awal dan foto kerusakan soket daya, kerusakan terjadi saat masa sewa. Ganti rugi ditetapkan Rp 150.000."
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-blue-600 disabled:bg-slate-100"
                  />
                </div>

                {actionError ? (
                  <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                ) : null}

                {/* Footer Buttons */}
                {!isResolved ? (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Mengeksekusi...</span>
                        </>
                      ) : (
                        <>
                          <Scale className="w-4 h-4" />
                          <span>Eksekusi Putusan Mediasi</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

