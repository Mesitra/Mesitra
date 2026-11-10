import React, { useState, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Store,
  Calendar,
  FileText,
  DollarSign,
  MessageCircle,
  CheckCircle2,
  Image as ImageIcon,
  Check,
  ArrowRight,
  UploadCloud,
  Trash2,
  Loader2,
  Send,
  FileCheck,
  AlertCircle
} from 'lucide-react'
import { formatLongDate } from '../../lib/dateHelpers'
import { submitRenterDefense } from '../../lib/ordersApi'

export default function ModalDetailKlaim({ isOpen, onClose, order, onChatOwner, onDefenseSubmitted }) {
  const [activeTab, setActiveTab] = useState('komparasi') // 'komparasi' | 'sanggahan'

  // Form Pembelaan / Sanggahan State
  const initialExistingNote = order?.disputeTicket?.renterDefenseNote || order?.renterDefenseNote || ''
  const initialExistingPhotos = Array.isArray(order?.disputeTicket?.renterCounterPhotos)
    ? order.disputeTicket.renterCounterPhotos
    : (Array.isArray(order?.renterCounterPhotos) ? order.renterCounterPhotos : [])

  const [defenseNote, setDefenseNote] = useState('')
  const [counterPhotos, setCounterPhotos] = useState([])
  const [isSubmittingDefense, setIsSubmittingDefense] = useState(false)
  const [defenseError, setDefenseError] = useState('')
  const [defenseSuccess, setDefenseSuccess] = useState(false)
  const [submittedData, setSubmittedData] = useState(
    initialExistingNote ? { note: initialExistingNote, photos: initialExistingPhotos } : null
  )

  useEffect(() => {
    if (!isOpen || !order) return
    const existingNote = order.disputeTicket?.renterDefenseNote || order.renterDefenseNote || ''
    const existingPhotos = Array.isArray(order.disputeTicket?.renterCounterPhotos)
      ? order.disputeTicket.renterCounterPhotos
      : (Array.isArray(order.renterCounterPhotos) ? order.renterCounterPhotos : [])
    setActiveTab('komparasi')
    setDefenseNote('')
    setCounterPhotos([])
    setDefenseError('')
    setDefenseSuccess(false)
    setSubmittedData(existingNote ? { note: existingNote, photos: existingPhotos } : null)
  }, [isOpen, order?.id])

  if (!isOpen || !order) return null

  const formatRupiah = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`
  const reason = order.disputeReason || order.disputeNote || order.returnData?.ownerNotes || 'Tidak ada keterangan klaim terperinci.'
  const initialDemand = order.damageFee || order.returnData?.damageFeeClaimed || 0
  const equipment = order.equipment || {}
  const owner = equipment.owner || {}

  const isResolved = order.isResolvedByAdmin || (order.status === 'SELESAI' && order.finalDamageFee !== null && order.finalDamageFee !== undefined)
  const finalDamageFee = isResolved ? (order.finalDamageFee ?? 0) : null
  const renterRefund = isResolved ? Math.max(0, (order.depositAmount || 0) - (order.finalDamageFee || 0)) : null

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

  // Ekstraksi Foto Bukti Kerusakan (Pemilik)
  const ownerPhotos = Array.isArray(order.ownerInspectionPhotos)
    ? order.ownerInspectionPhotos
    : (order.ownerInspectionPhotos ? [order.ownerInspectionPhotos] : [])

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (counterPhotos.length + files.length > 4) {
      setDefenseError('Maksimal 4 foto bukti tandingan yang diperbolehkan.')
      return
    }

    setDefenseError('')
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setDefenseError('Hanya berkas gambar (JPG, PNG, WebP) yang didukung.')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        setCounterPhotos((prev) => [...prev, event.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemovePhoto = (index) => {
    setCounterPhotos((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmitDefense = async (e) => {
    e.preventDefault()
    if (!defenseNote.trim() || defenseNote.trim().length < 10) {
      setDefenseError('Alasan sanggahan wajib diisi minimal 10 karakter.')
      return
    }

    setIsSubmittingDefense(true)
    setDefenseError('')

    try {
      await submitRenterDefense(order.id, {
        renterDefenseNote: defenseNote.trim(),
        renterCounterPhotos: counterPhotos
      })

      setSubmittedData({
        note: defenseNote.trim(),
        photos: counterPhotos
      })
      setDefenseSuccess(true)
      if (onDefenseSubmitted) {
        onDefenseSubmitted()
      }
    } catch (err) {
      setDefenseError(err.message || 'Gagal mengirim nota sanggahan. Silakan coba lagi.')
    } finally {
      setIsSubmittingDefense(false)
    }
  }

  const hasSubmittedDefense = Boolean(submittedData || initialExistingNote)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isResolved ? 'bg-emerald-50/70 border-emerald-100' : 'bg-rose-50/70 border-rose-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isResolved ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 m-0">
                  {isResolved ? 'Putusan Mediasi Sengketa Selesai' : 'Detail Klaim Sengketa & Mediasi'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isResolved ? 'Selesai Putusan' : 'Mediasi Aktif'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 m-0 font-medium mt-0.5">
                Invoice: <span className="font-mono font-bold text-slate-700">{order.invoiceNumber}</span> · Unit: {equipment.name || 'Alat'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigasi Modal */}
        <div className="flex border-b border-slate-200 px-5 pt-3 bg-slate-50 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('komparasi')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'komparasi'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>1. Bukti &amp; Klaim Pemilik</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sanggahan')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sanggahan'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Nota Sanggahan Penyewa</span>
            {hasSubmittedDefense ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sanggahan terkirim" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Perlu sanggahan" />
            )}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* TAB 1: KOMPARASI BUKTI & KLAIM */}
          {activeTab === 'komparasi' && (
            <>
              {/* Box Putusan Admin Jika Sudah Selesai */}
              {isResolved && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Hasil Putusan Resmi Admin Mesitra</span>
                    </div>
                    {order.resolvedAt && (
                      <span className="text-[10px] text-emerald-700 font-medium">
                        Diputuskan pada {formatLongDate(order.resolvedAt)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white/90 rounded-lg border border-emerald-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Ganti Rugi Disetujui Pemilik
                      </span>
                      <p className="text-sm font-black text-rose-600 mt-0.5 tabular-nums">
                        {formatRupiah(finalDamageFee)}
                      </p>
                      <span className="text-[10px] text-slate-400">Dipotong dari deposit</span>
                    </div>
                    <div className="p-3 bg-white/90 rounded-lg border border-emerald-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Sisa Deposit Dikembalikan
                      </span>
                      <p className="text-sm font-black text-emerald-600 mt-0.5 tabular-nums">
                        {formatRupiah(renterRefund)}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-semibold">Telah cair ke dompet Anda</span>
                    </div>
                  </div>

                  {order.adminResolutionNote && (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-900 block mb-1">
                        Pertimbangan &amp; Catatan Mediasi Admin:
                      </span>
                      <p className="text-xs text-emerald-950 font-medium leading-relaxed italic m-0 bg-white/60 p-2.5 rounded-lg border border-emerald-100">
                        "{order.adminResolutionNote}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Ringkasan Klaim Pemilik */}
              <div className="p-4 bg-rose-50/70 border border-rose-200/90 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-rose-900 font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Klaim Kerusakan &amp; Tuntutan Pemilik</span>
                  </div>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-mono font-bold px-2 py-0.5 rounded">
                    Tuntutan: {formatRupiah(initialDemand)}
                  </span>
                </div>
                <p className="text-xs text-rose-950 font-semibold leading-relaxed bg-white/80 p-3 rounded-lg border border-rose-200/70 m-0">
                  "{reason}"
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Total Security Deposit Ditahan di Escrow:</span>
                  <strong className="text-slate-900">{formatRupiah(order.depositAmount)}</strong>
                </div>
              </div>

              {/* Grid Komparasi BAST Awal vs BAST Akhir */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Komparasi Dokumentasi BAST (Visual Evidence)
                  </span>
                  <span className="text-[11px] text-slate-400">Bukti penentu keputusan mediasi</span>
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
                        Kondisi Awal
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Foto Serah Terima Awal:</span>
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
                              <img src={url} alt={`BAST Awal ${idx + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-slate-400 text-[11px]">
                          Foto BAST awal tersimpan otomatis dari profil inspeksi katalog pemilik.
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                      <strong className="block text-[10px] text-slate-400 uppercase font-bold">Catatan Serah Terima:</strong>
                      <span>{initialBast.notes || 'Unit diserahkan dalam kondisi siap pakai, aksesoris lengkap terverifikasi.'}</span>
                    </div>
                  </div>

                  {/* Kolom Kanan: BAST Akhir & Bukti Klaim */}
                  <div className="p-3.5 bg-rose-50/40 border border-rose-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-rose-200">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        BAST Akhir &amp; Bukti Kerusakan
                      </span>
                      <span className="text-[10px] text-rose-700 bg-rose-100 font-semibold px-2 py-0.5 rounded">
                        Saat Pengembalian
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Foto Pengembalian &amp; Bukti Kerusakan:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {returnPhotos.slice(0, 2).map((url, idx) => (
                          <a
                            key={`ret-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-square rounded-lg overflow-hidden bg-slate-200 border border-slate-300 relative group block"
                            title="Foto dari Penyewa"
                          >
                            <img src={url} alt={`Return ${idx}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 left-0 right-0 bg-slate-900/70 text-[9px] text-white text-center py-0.5">
                              Penyewa
                            </span>
                          </a>
                        ))}
                        {ownerPhotos.map((url, idx) => (
                          <a
                            key={`own-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-square rounded-lg overflow-hidden bg-rose-100 border-2 border-rose-400 relative group block"
                            title="Foto Bukti Kerusakan dari Pemilik"
                          >
                            <img src={url} alt={`Klaim Kerusakan ${idx}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 left-0 right-0 bg-rose-700 text-[9px] text-white font-bold text-center py-0.5">
                              Bukti Klaim
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-rose-200/80 text-[11px] text-slate-600">
                      <strong className="block text-[10px] text-slate-400 uppercase font-bold">Catatan Pengembalian Penyewa:</strong>
                      <span>{returnData.conditionNotes || returnData.notes || 'Penyewa telah menyerahkan kembali unit fisik.'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: NOTA SANGGAHAN & PEMBELAAN PENYEWA */}
          {activeTab === 'sanggahan' && (
            <div className="space-y-4">
              {/* Banner Panduan Hak Sanggahan */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Hak Pembelaan Mediasi Independen Mesitra
                </span>
                <p className="text-[11px] text-blue-800 m-0 leading-relaxed">
                  Sebagai Penyewa UMKM, Anda berhak memberikan klarifikasi faktual dan melampirkan foto bukti tandingan bila klaim kerusakan pemilik tidak sesuai kenyataan. Mediator Admin Mesitra akan memutus pembagian escrow secara adil berdasarkan fakta kedua belah pihak.
                </p>
              </div>

              {/* Sanggahan Sudah Terkirim */}
              {hasSubmittedDefense ? (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Nota Sanggahan Anda Telah Diterima Mediator
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 font-semibold px-2 py-0.5 rounded">
                      Tersimpan di Tiket Mediasi
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Klarifikasi / Argumen Pembelaan Anda:
                    </span>
                    <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-emerald-100 font-medium leading-relaxed m-0 whitespace-pre-wrap">
                      {submittedData?.note || initialExistingNote}
                    </p>
                  </div>

                  {/* Foto Bukti Tandingan */}
                  {((submittedData?.photos && submittedData.photos.length > 0) || initialExistingPhotos.length > 0) && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Foto Bukti Tandingan Penyewa:
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {(submittedData?.photos || initialExistingPhotos).map((photo, idx) => (
                          <a
                            key={idx}
                            href={photo}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:opacity-90 block"
                          >
                            <img src={photo} alt={`Bukti Tandingan ${idx + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-emerald-700 bg-emerald-100/60 p-2.5 rounded-lg flex items-center gap-2">
                    <FileCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Nota sanggahan ini telah tersinkronisasi dan tampil di layar arbitrase Administrator HQ.</span>
                  </div>
                </div>
              ) : (
                /* Form Pengajuan Sanggahan Baru */
                <form onSubmit={handleSubmitDefense} className="space-y-4">
                  {/* Alert Error */}
                  {defenseError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{defenseError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Nota Sanggahan &amp; Kronologi Kejadian <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={defenseNote}
                      onChange={(e) => setDefenseNote(e.target.value)}
                      placeholder="Jelaskan secara terperinci mengapa Anda menolak klaim kerusakan tersebut (contoh: kondisi baret sudah ada sejak serah terima awal, unit bekerja normal saat diserahkan kembali, dsb)..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition resize-none"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                      <span>Minimal 10 karakter</span>
                      <span>{defenseNote.length} karakter</span>
                    </div>
                  </div>

                  {/* Upload Foto Bukti Tandingan */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 block">
                        Unggah Foto Bukti Tandingan (Maks. 4 Foto)
                      </label>
                      <span className="text-[10px] text-slate-400">{counterPhotos.length}/4 Foto</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {counterPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                          <img src={photo} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg opacity-90 hover:opacity-100 transition cursor-pointer shadow-xs"
                            title="Hapus foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {counterPhotos.length < 4 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-slate-500 hover:text-blue-600">
                          <UploadCloud className="w-5 h-5 text-slate-400" />
                          <span className="text-[10px] font-semibold">Tambah Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Tombol Kirim Form */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingDefense || !defenseNote.trim() || defenseNote.trim().length < 10}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      {isSubmittingDefense ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mengirim Sanggahan ke Mediator...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Kirim Nota Sanggahan &amp; Bukti ke Admin</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Edukasi Keamanan Escrow */}
          {!isResolved && (
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Jaminan Perlindungan Escrow Mesitra
              </span>
              <p className="text-[11px] text-blue-800 m-0 leading-relaxed">
                Deposit Anda sebesar <strong>{formatRupiah(order.depositAmount)}</strong> aman ditahan di rekening penampungan resmi. Admin HQ bertindak sebagai mediator netral independen dan tidak akan melepaskan dana sebelum kesepakatan atau putusan faktual selesai.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <div className="text-[11px] text-slate-500">
            {isResolved
              ? 'Status pesanan telah diselesaikan.'
              : hasSubmittedDefense
              ? 'Sanggahan terkirim. Menunggu keputusan mediasi Admin.'
              : 'Silakan isi nota sanggahan jika klaim tidak sesuai.'}
          </div>
          <div className="flex items-center gap-2">
            {onChatOwner && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onChatOwner(order)
                }}
                className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 ring-1 ring-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Hubungi Pemilik</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
