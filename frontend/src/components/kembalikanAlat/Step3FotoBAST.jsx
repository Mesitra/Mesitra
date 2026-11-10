import React, { useRef, useState, useEffect } from 'react'
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ZoomIn,
  X,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import ModalDokumenBAST from './ModalDokumenBAST'
import { formatLongDate } from '../../lib/dateHelpers'
import { getSessionUser } from '../../lib/userSession'

export default function Step3FotoBAST({ order, returnData, onChange }) {
  const user = getSessionUser()
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)

  // Zoom photo modal state
  const [zoomedPhoto, setZoomedPhoto] = useState(null)

  // BAST document modal preview
  const [isBastModalOpen, setIsBastModalOpen] = useState(false)

  const photos = returnData.photos || {
    front: null,
    side: null,
    panel: null,
    back: null,
    extra: []
  }

  // Count uploaded required photos
  const requiredCount = [photos.front, photos.side, photos.panel, photos.back].filter(Boolean).length

  // Helper to compress image to base64 via canvas
  const processImageFile = (file, callback) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72)
        callback(compressedBase64)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const handlePhotoUpload = (slot, file) => {
    if (!file) return
    processImageFile(file, (base64) => {
      if (slot === 'extra') {
        onChange((prev) => ({
          ...prev,
          photos: {
            ...prev.photos,
            extra: [...(prev.photos.extra || []), base64]
          }
        }))
      } else {
        onChange((prev) => ({
          ...prev,
          photos: {
            ...prev.photos,
            [slot]: base64
          }
        }))
      }
    })
  }

  const handleRemovePhoto = (slot, index = null) => {
    if (slot === 'extra') {
      onChange((prev) => ({
        ...prev,
        photos: {
          ...prev.photos,
          extra: (prev.photos.extra || []).filter((_, i) => i !== index)
        }
      }))
    } else {
      onChange((prev) => ({
        ...prev,
        photos: {
          ...prev.photos,
          [slot]: null
        }
      }))
    }
  }

  // ================= SIGNATURE PAD =================
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'

    // If signature already exists in returnData, draw it onto canvas
    if (returnData.signature) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = returnData.signature
    }
  }, [])

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX || (e.touches && e.touches[0].clientX)
    const clientY = e.clientY || (e.touches && e.touches[0].clientY)
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    isDrawing.current = true
    const { x, y } = getCanvasCoords(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing.current) return
    e.preventDefault()
    const { x, y } = getCanvasCoords(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const canvas = canvasRef.current
    const signatureDataUrl = canvas.toDataURL('image/png')
    onChange((prev) => ({
      ...prev,
      signature: signatureDataUrl,
      signedAt: new Date().toISOString()
    }))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange((prev) => ({
      ...prev,
      signature: null,
      signedAt: null
    }))
  }

  // Generate stylized auto signature using user's name
  const handleAutoGenerateSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const fullName = user?.fullName || 'Penyewa SewaAlat'
    const nameParts = fullName.split(' ')
    const displayName = nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[1][0]}.`
      : fullName

    ctx.save()
    ctx.font = 'italic 600 36px "Caveat", "Brush Script MT", cursive, sans-serif'
    ctx.fillStyle = '#0f172a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(displayName, canvas.width / 2, canvas.height / 2 - 4)

    // Underline flourish
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2 - 70, canvas.height / 2 + 16)
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 24, canvas.width / 2 + 75, canvas.height / 2 + 14)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#2563eb'
    ctx.stroke()
    ctx.restore()

    const signatureDataUrl = canvas.toDataURL('image/png')
    onChange((prev) => ({
      ...prev,
      signature: signatureDataUrl,
      signedAt: new Date().toISOString()
    }))
  }

  // Photo slots config
  const photoSlots = [
    { key: 'front', title: 'Tampak Depan', note: 'Unit keseluruhan dari depan' },
    { key: 'side', title: 'Tampak Samping', note: 'Sisi kiri/kanan & bodi mesin' },
    { key: 'panel', title: 'Panel Kontrol', note: 'Tombol, layar & gauge meter' },
    { key: 'back', title: 'Tampak Belakang', note: 'Kabel power & bagian belakang' }
  ]

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5">
      {/* 1. Card: Foto Kondisi Akhir */}
      <section className="bg-white ring-1 ring-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">
              Foto kondisi akhir unit
            </h2>
            <p className="text-xs text-slate-500 m-0">
              Unggah 4 sudut alat dalam kondisi terang sebagai bukti fisik sah sebelum diserahkan.
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
              requiredCount === 4
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            }`}
          >
            {requiredCount} dari 4 foto wajib
          </div>
        </div>

        {/* 4 Required Slots Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photoSlots.map((slot) => {
            const photoUrl = photos[slot.key]
            return (
              <div
                key={slot.key}
                className="relative flex flex-col items-center justify-center h-44 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 overflow-hidden transition-all group"
              >
                {photoUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={photoUrl}
                      alt={slot.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto(photoUrl)}
                        className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm transition-all"
                        title="Perbesar foto"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(slot.key)}
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 backdrop-blur-2xs px-2 py-1 flex items-center justify-between text-[10px] text-white font-medium">
                      <span className="truncate">{slot.title}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-3 text-center">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{slot.title}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{slot.note}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(slot.key, e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
            )
          })}
        </div>

        {/* Extra Optional Photos */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {photos.extra && photos.extra.map((pic, idx) => (
            <div
              key={idx}
              className="relative w-16 h-16 rounded-lg ring-1 ring-slate-200 overflow-hidden group"
            >
              <img src={pic} alt={`Extra ${idx}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemovePhoto('extra', idx)}
                className="absolute inset-0 bg-red-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
            <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Tambah Foto Lainnya</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoUpload('extra', e.target.files?.[0])}
            />
          </label>
        </div>
      </section>

      {/* 2. Card: Tanda Tangan & Pernyataan */}
      <section className="bg-white ring-1 ring-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">
              Tanda tangan &amp; pengesahan BAST
            </h2>
            <p className="text-xs text-slate-500 m-0">
              Tanda tangan digital ini mengesahkan kondisi alat sesuai checklist yang sudah Anda laporkan.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-xs font-bold">
            Wajib
          </span>
        </div>

        {/* Interactive Canvas Signature Pad */}
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-md h-36 bg-slate-50 ring-1 ring-slate-300 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={460}
              height={144}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full touch-none cursor-crosshair"
            />

            {!returnData.signature && (
              <div className="absolute pointer-events-none text-center text-slate-400 select-none">
                <p className="text-xs font-medium m-0">Bubuhkan tanda tangan Anda di area ini</p>
                <p className="text-[10px] text-slate-400 m-0 mt-0.5">Gunakan mouse, stylus, atau jari Anda</p>
              </div>
            )}
          </div>

          {/* Action Tools for Signature */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 w-full max-w-md">
            <button
              type="button"
              onClick={handleAutoGenerateSignature}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100/80 text-blue-700 ring-1 ring-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Tanda Tangan Otomatis</span>
            </button>
            <button
              type="button"
              onClick={clearSignature}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200 rounded-xl text-xs font-semibold transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Gambar ulang</span>
            </button>
          </div>
        </div>

        {/* Signature Metadata Row */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <span className="text-slate-500">Ditandatangani oleh:</span>
            <span className="font-bold text-slate-900">
              {user?.fullName || 'Penyewa Terdaftar'} · Penyewa
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <span className="text-slate-500">Metode &amp; Status:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {returnData.signature ? 'Terverifikasi secara digital' : 'Menunggu tanda tangan'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Card: Dokumen BAST Preview Card (Matching Mockup) */}
      <section className="bg-white ring-1 ring-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">
            Dokumen BAST akhir
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 text-xs font-semibold">
            1 dokumen resmi
          </span>
        </div>

        <div className="p-4 bg-slate-50/80 ring-1 ring-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900">
                BAST AKHIR · {order.invoiceNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsBastModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Lihat dokumen lengkap →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
            <div className="flex justify-between">
              <span className="text-slate-500">Penyewa:</span>
              <span className="font-semibold text-slate-900">
                {user?.fullName || 'Penyewa'} {user?.kycData?.businessName ? `· ${user.kycData.businessName}` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pemilik alat:</span>
              <span className="font-semibold text-slate-900">
                {order.equipment?.owner?.fullName || order.equipment?.ownerName || 'Pemilik Alat Mitra Mesitra'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Periode sewa:</span>
              <span className="font-semibold text-slate-900">
                {formatLongDate(order.startDate)} – {formatLongDate(order.endDate)} ({order.rentalDays} hari)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kondisi kembali:</span>
              <span className="font-semibold text-emerald-700">
                Checklist {Object.values(returnData.checklist || {}).filter(Boolean).length}/5 terisi
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 m-0">
          BAST akhir ini diteruskan ke pemilik alat untuk dikonfirmasi. Dana security deposit dilepas kembali ke dompet Anda segera setelah inspeksi unit disetujui.
        </p>
      </section>

      {/* Modal Zoom Foto */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-4 right-4 p-2 text-white bg-slate-800/80 hover:bg-slate-700 rounded-full cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={zoomedPhoto} alt="Zoom" className="max-h-[80vh] w-auto rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* Modal BAST Preview */}
      <ModalDokumenBAST
        isOpen={isBastModalOpen}
        onClose={() => setIsBastModalOpen(false)}
        order={order}
        returnData={returnData}
      />
    </div>
  )
}
