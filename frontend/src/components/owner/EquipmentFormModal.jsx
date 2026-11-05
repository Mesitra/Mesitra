import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Wrench,
  UploadCloud,
  ImageIcon,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Star,
  Camera,
  CheckCircle2
} from 'lucide-react'
import { createEquipment, updateEquipment, deleteEquipment, formatRupiah } from '../../lib/equipmentsApi'

export const CATEGORY_OPTIONS = [
  'Mesin Kopi',
  'Oven & Bakery',
  'Mesin Kemasan',
  'Konveksi',
  'Kelengkapan Usaha',
  'Kamera & Audio'
]

export const CONDITION_OPTIONS = [
  'Prima',
  'Terawat',
  'Sangat Baik',
  'Normal'
]

/**
 * Normalisasi data aksesoris dari backend / state menjadi struktur objek konsisten:
 * { name: string, photo: string | null }
 */
export function normalizeAccessories(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList
    .map((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        return trimmed ? { name: trimmed, photo: null } : null
      }
      if (item && typeof item === 'object') {
        const name = String(item.name || '').trim()
        if (!name) return null
        const photo = typeof item.photo === 'string' && item.photo.trim() ? item.photo.trim() : null
        return { name, photo }
      }
      return null
    })
    .filter(Boolean)
}

/**
 * Kompresi dan konversi file foto galeri menjadi Base64 data URL
 * dengan resolusi maksimum 1200px dan kualitas JPEG 0.8 agar ringan dan tajam.
 */
function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih harus berupa gambar (JPG, PNG, WEBP).'))
      return
    }

    // Batas 10MB per file
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error(`Ukuran file "${file.name}" melebihi batas 10MB.`))
      return
    }

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
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        resolve(compressedBase64)
      }
      img.onerror = () => reject(new Error('Gagal memuat pratinjau gambar.'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Modal Form Komprehensif untuk Tambah Alat Baru dan Kelola / Edit Alat.
 * Membagi formulir ke dalam 6 seksi logis terstruktur dengan tema desain MyRent.
 */
export default function EquipmentFormModal({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'edit'
  equipment = null,
  onSubmit,
  onDelete,
  onSuccess
}) {
  if (!isOpen) return null

  const isEditMode = mode === 'edit' || Boolean(equipment)
  const fileInputRef = useRef(null)
  const newAccFileInputRef = useRef(null)
  const itemAccFileInputRef = useRef(null)
  const activeAccIndexRef = useRef(null)

  // 1. Informasi Dasar & Kategori
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Mesin Kopi')
  const [condition, setCondition] = useState('Prima')
  const [stock, setStock] = useState(1)
  const [location, setLocation] = useState('Jakarta Selatan')
  const [description, setDescription] = useState('')

  // 2. Harga & Aturan Sewa
  const [pricePerDay, setPricePerDay] = useState('')
  const [deposit, setDeposit] = useState('')
  const [minRentDays, setMinRentDays] = useState(1)
  const [maintenanceBufferDays, setMaintenanceBufferDays] = useState(1)

  // 3. Spesifikasi Teknis
  const [powerWatt, setPowerWatt] = useState(0)
  const [weightKg, setWeightKg] = useState(10)
  const [dimensions, setDimensions] = useState('40 × 30 × 30 cm')

  // 4. Logistik & Pengiriman
  const [deliveryPickup, setDeliveryPickup] = useState(true)
  const [deliveryCourier, setDeliveryCourier] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState(45000)

  // 5. Media & Kelengkapan (Hanya Foto Galeri Asli)
  const [images, setImages] = useState([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Kelengkapan & Foto Bukti per Aksesoris
  const [accessories, setAccessories] = useState([{ name: 'Kabel Power', photo: null }])
  const [newAccessoryName, setNewAccessoryName] = useState('')
  const [newAccessoryPhoto, setNewAccessoryPhoto] = useState(null)
  const [isProcessingAccPhoto, setIsProcessingAccPhoto] = useState(false)
  const [previewAccPhoto, setPreviewAccPhoto] = useState(null)

  // 6. Status Visibilitas & Aksi Bahaya (Edit Mode)
  const [isActive, setIsActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Feedback states
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  // ── LOCK SCROLL DI BACKGROUND SAAT MODAL TERBUKA ─────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Hitung lebar scrollbar agar layout tidak bergeser saat scroll dikunci
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [isOpen])

  // Populate data saat mode edit atau saat equipment berubah
  useEffect(() => {
    if (equipment && isEditMode) {
      setName(equipment.name || equipment.nama || '')
      setCategory(equipment.category || equipment.kategori || 'Mesin Kopi')
      setCondition(equipment.condition || 'Prima')
      setStock(equipment.stock || 1)
      setLocation(equipment.location || 'Jakarta Selatan')
      setDescription(equipment.description || equipment.deskripsi || '')

      const priceVal = equipment.pricePerDay ?? equipment.hargaNominal ?? equipment.harga ?? ''
      setPricePerDay(priceVal)

      const depositVal = equipment.deposit ?? ''
      setDeposit(depositVal)

      setMinRentDays(equipment.minRentDays ?? 1)
      setMaintenanceBufferDays(equipment.maintenanceBufferDays ?? 1)

      setPowerWatt(equipment.powerWatt ?? (equipment.daya ? parseInt(equipment.daya, 10) : 0))
      setWeightKg(equipment.weightKg ?? 10)
      setDimensions(equipment.dimensions || '40 × 30 × 30 cm')

      const initialDelivery = Array.isArray(equipment.deliveryMethods)
        ? equipment.deliveryMethods
        : ['PICKUP', 'COURIER']
      setDeliveryPickup(initialDelivery.includes('PICKUP'))
      setDeliveryCourier(initialDelivery.includes('COURIER'))
      setDeliveryFee(equipment.deliveryFee ?? 45000)

      if (Array.isArray(equipment.images) && equipment.images.length > 0) {
        setImages(equipment.images)
      } else {
        setImages([])
      }

      if (Array.isArray(equipment.accessories) && equipment.accessories.length > 0) {
        setAccessories(normalizeAccessories(equipment.accessories))
      } else {
        setAccessories([{ name: 'Kabel Power', photo: null }])
      }

      const activeFlag =
        equipment.isActive !== undefined
          ? Boolean(equipment.isActive)
          : String(equipment.status || '').toUpperCase() !== 'NONAKTIF' && !equipment.isDeleted
      setIsActive(activeFlag)
    } else {
      // Reset form ke default create mode: Foto utama kosong murni
      setName('')
      setCategory('Mesin Kopi')
      setCondition('Prima')
      setStock(1)
      setLocation('Jakarta Selatan')
      setDescription('')
      setPricePerDay('')
      setDeposit('')
      setMinRentDays(1)
      setMaintenanceBufferDays(1)
      setPowerWatt(0)
      setWeightKg(10)
      setDimensions('40 × 30 × 30 cm')
      setDeliveryPickup(true)
      setDeliveryCourier(true)
      setDeliveryFee(45000)
      setImages([]) // KOSONG SECARA DEFAULT
      setAccessories([{ name: 'Kabel Power', photo: null }])
      setIsActive(true)
    }

    setNewAccessoryName('')
    setNewAccessoryPhoto(null)
    setPreviewAccPhoto(null)
    setConfirmDelete(false)
    setError('')
  }, [equipment, isEditMode, isOpen])

  // ── HANDLERS UPLOAD FOTO DARI GALERI ──────────────────────────────────────────
  const handleFilesUpload = async (files) => {
    const fileList = Array.from(files || []).filter((f) => f.type.startsWith('image/'))
    if (fileList.length === 0) return

    setIsUploadingPhoto(true)
    setError('')

    try {
      const uploadPromises = fileList.map((file) => processImageFile(file))
      const base64Results = await Promise.all(uploadPromises)
      setImages((prev) => [...prev, ...base64Results])
    } catch (err) {
      setError(err?.message || 'Gagal memproses unggahan foto galeri.')
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileInputChange = (e) => {
    handleFilesUpload(e.target.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files)
    }
  }

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSetMainImage = (indexToMain) => {
    if (indexToMain === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const [selected] = copy.splice(indexToMain, 1)
      return [selected, ...copy]
    })
  }

  // ── HANDLERS AKSESORIS & FOTO BUKTI ──────────────────────────────────────────
  const handleNewAccPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setIsProcessingAccPhoto(true)
      const base64 = await processImageFile(file)
      setNewAccessoryPhoto(base64)
    } catch (err) {
      setError(err?.message || 'Gagal memproses foto bukti aksesoris.')
    } finally {
      setIsProcessingAccPhoto(false)
      if (newAccFileInputRef.current) newAccFileInputRef.current.value = ''
    }
  }

  const handleItemAccPhotoChange = async (e) => {
    const file = e.target.files?.[0]
    const targetIdx = activeAccIndexRef.current
    if (!file || targetIdx === null || targetIdx === undefined) return
    try {
      setIsProcessingAccPhoto(true)
      const base64 = await processImageFile(file)
      setAccessories((prev) =>
        prev.map((acc, i) => (i === targetIdx ? { ...acc, photo: base64 } : acc))
      )
    } catch (err) {
      setError(err?.message || 'Gagal memproses foto bukti aksesoris.')
    } finally {
      setIsProcessingAccPhoto(false)
      activeAccIndexRef.current = null
      if (itemAccFileInputRef.current) itemAccFileInputRef.current.value = ''
    }
  }

  const handleTriggerItemUpload = (index) => {
    activeAccIndexRef.current = index
    itemAccFileInputRef.current?.click()
  }

  const handleRemoveItemPhoto = (indexToRemove) => {
    setAccessories((prev) =>
      prev.map((acc, i) => (i === indexToRemove ? { ...acc, photo: null } : acc))
    )
  }

  const handleAddAccessory = () => {
    const trimmed = newAccessoryName.trim()
    if (!trimmed) return
    if (!accessories.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      setAccessories((prev) => [...prev, { name: trimmed, photo: newAccessoryPhoto }])
    }
    setNewAccessoryName('')
    setNewAccessoryPhoto(null)
  }

  const handleRemoveAccessory = (indexToRemove) => {
    setAccessories((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  // ── SUBMIT HANDLER ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validasi Foto Asli Wajib
    if (images.length === 0) {
      setError('Wajib mengunggah minimal 1 foto asli alat dari galeri perangkat Anda.')
      return
    }

    if (!name.trim()) {
      setError('Nama alat wajib diisi')
      return
    }
    if (!category.trim()) {
      setError('Pilih kategori alat')
      return
    }
    if (!pricePerDay || Number(pricePerDay) <= 0) {
      setError('Tarif sewa per hari wajib diisi angka lebih dari 0')
      return
    }
    if (deposit === '' || Number(deposit) < 0) {
      setError('Nominal deposit uang jaminan wajib diisi')
      return
    }
    if (!deliveryPickup && !deliveryCourier) {
      setError('Pilih minimal satu metode pengiriman (Ambil Sendiri atau Kurir Toko)')
      return
    }

    const deliveryMethods = []
    if (deliveryPickup) deliveryMethods.push('PICKUP')
    if (deliveryCourier) deliveryMethods.push('COURIER')

    const payload = {
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      condition: condition.trim(),
      stock: Math.max(1, parseInt(stock, 10) || 1),
      location: location.trim() || 'Jakarta Selatan',
      pricePerDay: Math.max(0, parseInt(pricePerDay, 10) || 0),
      deposit: Math.max(0, parseInt(deposit, 10) || 0),
      minRentDays: Math.max(1, parseInt(minRentDays, 10) || 1),
      maintenanceBufferDays: Math.max(0, parseInt(maintenanceBufferDays, 10) || 0),
      powerWatt: Math.max(0, parseInt(powerWatt, 10) || 0),
      weightKg: Math.max(0, parseFloat(weightKg) || 10),
      dimensions: dimensions.trim() || '40 × 30 × 30 cm',
      deliveryMethods,
      deliveryFee: deliveryCourier ? Math.max(0, parseInt(deliveryFee, 10) || 0) : 0,
      images,
      accessories: accessories
        .map((a) => ({
          name: String(a.name || '').trim(),
          photo: typeof a.photo === 'string' && a.photo.trim() ? a.photo.trim() : null
        }))
        .filter((a) => Boolean(a.name)),
      status: isActive ? 'TERSEDIA' : 'NONAKTIF',
      isActive
    }

    try {
      setLoading(true)

      let result
      if (onSubmit) {
        result = await onSubmit(payload)
      } else if (isEditMode && equipment?.id) {
        result = await updateEquipment(equipment.id, payload)
      } else {
        result = await createEquipment(payload)
      }

      if (onSuccess) {
        onSuccess(result, isEditMode ? 'edit' : 'create')
      }

      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        (isEditMode ? 'Gagal memperbarui alat' : 'Gagal menambahkan alat')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── DELETE HANDLER ───────────────────────────────────────────────────────────
  const handleDeleteClick = async () => {
    if (!equipment?.id) return

    try {
      setDeleteLoading(true)
      setError('')

      let result
      if (onDelete) {
        result = await onDelete(equipment.id)
      } else {
        result = await deleteEquipment(equipment.id)
      }

      if (onSuccess) {
        onSuccess(result, 'delete')
      }

      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Gagal menghapus alat. Pastikan tidak ada transaksi sewa yang sedang aktif.'
      setError(msg)
    } finally {
      setDeleteLoading(false)
      setConfirmDelete(false)
    }
  }

  const hasPhotos = images.length > 0
  const isSubmitDisabled = loading || deleteLoading || isUploadingPhoto || !hasPhotos

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overscroll-contain animate-in fade-in duration-200 font-sans"
      onClick={(e) => {
        // Klik di backdrop gelap untuk menutup modal
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* ── CARD CONTAINER MODAL DENGAN LAYOUT TERPISAH (HEADER & FOOTER LOCKED) ── */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        
        {/* ── HEADER MODAL (STICKY / FIXED) ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
              isEditMode ? 'bg-blue-100 text-blue-700' : 'bg-blue-600 text-white'
            }`}>
              {isEditMode ? <Wrench className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {isEditMode ? 'Kelola Detail Alat' : 'Tambah Alat Baru'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEditMode
                  ? 'Perbarui spesifikasi, tarif sewa, foto asli alat, atau arsipkan unit.'
                  : 'Unggah foto asli alat dan lengkapi 6 seksi formulir katalog.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── ERROR BANNER ──────────────────────────────────────────────────── */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-semibold animate-in fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* ── SCROLLABLE FORM BODY (HANYA INI YANG SCROLL, BACKGROUND TERKUNCI) ── */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-5">
            
            {/* ── SEKSI 1: INFORMASI DASAR & KATEGORI ─────────────────────────── */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Informasi Dasar & Kategori
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Alat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Espresso Machine La Marzocco GS3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kategori <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium cursor-pointer"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kondisi Fisik
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium cursor-pointer"
                    >
                      {CONDITION_OPTIONS.map((cond) => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jumlah Stok Unit
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={stock}
                      onChange={(e) => setStock(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi Gudang / Penyimpanan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kec. Cilandak, Jakarta Selatan"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deskripsi Lengkap Alat
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Jelaskan spesifikasi keunggulan, petunjuk pemakaian, dan ketentuan khusus..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* ── SEKSI 2: HARGA & ATURAN SEWA ─────────────────────────────────── */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Harga Sewa & Aturan Pemesanan
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarif Sewa Harian (Rp/hari) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="150000"
                      value={pricePerDay}
                      onChange={(e) => setPricePerDay(e.target.value)}
                      className="w-full bg-white text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-semibold"
                      required
                    />
                  </div>
                  {pricePerDay && !isNaN(Number(pricePerDay)) && (
                    <p className="text-[11px] text-blue-600 font-semibold mt-1">
                      {formatRupiah(Number(pricePerDay))} / hari
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit / Jaminan (Rp) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="500000"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                      className="w-full bg-white text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-semibold"
                      required
                    />
                  </div>
                  {deposit && !isNaN(Number(deposit)) && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Deposit ditahan escrow: {formatRupiah(Number(deposit))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Minimal Durasi Sewa (Hari)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minRentDays}
                    onChange={(e) => setMinRentDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Penyewa tidak dapat memilih durasi sewa di bawah angka ini.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jeda Rawat / Buffer Servis (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maintenanceBufferDays}
                    onChange={(e) => setMaintenanceBufferDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                    Waktu blokir kalender otomatis setelah sewa selesai untuk inspeksi & pembersihan unit.
                  </p>
                </div>
              </div>
            </div>

            {/* ── SEKSI 3: SPESIFIKASI TEKNIS ─────────────────────────────────── */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Spesifikasi Teknis
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Daya Listrik (Watt)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 1300"
                    value={powerWatt}
                    onChange={(e) => setPowerWatt(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Berat (Kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    placeholder="Contoh: 10"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dimensi (P × L × T)
                  </label>
                  <input
                    type="text"
                    placeholder="40 × 30 × 30 cm"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    className="w-full bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* ── SEKSI 4: LOGISTIK & PENGIRIMAN ──────────────────────────────── */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">
                  4
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Logistik & Opsi Serah Terima
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deliveryPickup}
                      onChange={(e) => setDeliveryPickup(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span>Ambil di Gudang (Self Pickup)</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deliveryCourier}
                      onChange={(e) => setDeliveryCourier(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span>Diantar Kurir Toko</span>
                  </label>
                </div>

                {deliveryCourier && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tarif Flat Kurir Toko (Rp)
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-white text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-semibold"
                      />
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-1">
                      Tarif flat pengiriman yang ditagihkan ke penyewa saat checkout.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── SEKSI 5: FOTO ASLI ALAT (HANYA DARI GALERI) & AKSESORIS ────────── */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">
                    5
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Foto Asli Alat & Kelengkapan Aksesoris
                  </h3>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  hasPhotos
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {hasPhotos ? `${images.length} Foto Terunggah` : 'Wajib 1 Foto'}
                </span>
              </div>

              {/* Upload Foto Asli dari Galeri */}
              <div className="space-y-3">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Zona Unggah / Dropzone Utama (jika belum ada foto) */}
                {images.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-blue-600 bg-blue-50/70 scale-[0.99]'
                        : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      {isUploadingPhoto ? (
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      ) : (
                        <UploadCloud className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      Unggah Foto Asli dari Galeri Perangkat
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                      Klik atau seret file gambar langsung dari komputer/ponsel Anda. Tanpa template atau link internet.
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                        JPG, PNG, WEBP
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                        Maks. 10MB/file
                      </span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-md">
                        Wajib Diunggah
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Grid Pratinjau Foto Asli Yang Diunggah */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Foto Asli Unit Terunggah ({images.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Tambah Foto Lain</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {images.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs"
                        >
                          <img
                            src={url}
                            alt={`Foto asli unit ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />

                          {/* Badge Foto Utama */}
                          {idx === 0 ? (
                            <span className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>Foto Utama</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(idx)}
                              className="absolute top-2 left-2 bg-slate-900/70 hover:bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs"
                              title="Jadikan foto utama di katalog"
                            >
                              Jadikan Utama
                            </button>
                          )}

                          {/* Tombol Hapus Foto */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Hapus foto ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Indikator Urutan */}
                          <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-white/90 drop-shadow-md">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}

                      {/* Kartu Tombol Tambah Tambahan */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/30 flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors mb-1.5">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600">
                          Tambah Foto
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Dari Galeri
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* List Kelengkapan / Aksesoris Dengan Bukti Foto Fisik */}
              <div className="space-y-3 pt-3 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Kelengkapan & Aksesoris Alat (Dengan Bukti Foto)
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Lampirkan foto bukti fisik per aksesoris sebagai arsip verifikasi serah terima BAST & perlindungan aju banding jika terjadi klaim hilang.
                    </p>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                    {accessories.length} Aksesoris
                  </span>
                </div>

                {/* Input Tambah Aksesoris Baru + Lampiran Foto */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Nama aksesoris (Contoh: Portafilter 58mm, Kabel Power, Tamper)..."
                      value={newAccessoryName}
                      onChange={(e) => setNewAccessoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddAccessory()
                        }
                      }}
                      className="flex-1 bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                    />

                    <div className="flex items-center gap-2">
                      {/* Hidden File Input untuk Aksesoris Baru */}
                      <input
                        ref={newAccFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleNewAccPhotoChange}
                      />

                      {/* Tombol Lampirkan Foto / Pratinjau Foto Baru */}
                      {newAccessoryPhoto ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                          <img
                            src={newAccessoryPhoto}
                            alt="Pratinjau aksesoris"
                            onClick={() =>
                              setPreviewAccPhoto({
                                name: newAccessoryName || 'Aksesoris Baru',
                                photo: newAccessoryPhoto
                              })
                            }
                            className="w-6 h-6 rounded-lg object-cover cursor-pointer hover:opacity-80"
                            title="Klik untuk zoom foto"
                          />
                          <span className="text-[11px] font-bold text-emerald-700">Foto Siap</span>
                          <button
                            type="button"
                            onClick={() => setNewAccessoryPhoto(null)}
                            className="text-emerald-600 hover:text-red-600 p-0.5 cursor-pointer"
                            title="Hapus foto ini"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => newAccFileInputRef.current?.click()}
                          disabled={isProcessingAccPhoto}
                          className="px-3 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5 border border-slate-200"
                          title="Lampirkan foto bukti fisik untuk aksesoris ini"
                        >
                          {isProcessingAccPhoto ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Camera className="w-3.5 h-3.5" />
                          )}
                          <span>+ Foto Bukti</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAddAccessory}
                        disabled={!newAccessoryName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hidden File Input untuk update foto aksesoris yang sudah ada */}
                <input
                  ref={itemAccFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleItemAccPhotoChange}
                />

                {/* Daftar Aksesoris Terdaftar (Cards) */}
                {accessories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">
                    Belum ada aksesoris yang didaftarkan.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {accessories.map((acc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        {/* Sisi Kiri: Foto Thumbnail + Info Nama */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {acc.photo ? (
                            <div
                              className="relative group shrink-0 cursor-pointer"
                              onClick={() => setPreviewAccPhoto({ name: acc.name, photo: acc.photo })}
                              title="Klik untuk memperbesar foto bukti"
                            >
                              <img
                                src={acc.photo}
                                alt={acc.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {acc.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {acc.photo ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Foto Bukti Terlampir</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  <span>Tanpa Foto Bukti</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sisi Kanan: Aksi Foto & Hapus */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {acc.photo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleTriggerItemUpload(idx)}
                                className="text-[11px] font-bold text-slate-600 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                              >
                                Ganti
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItemPhoto(idx)}
                                className="text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                              >
                                Hapus Foto
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTriggerItemUpload(idx)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg cursor-pointer border border-blue-200"
                            >
                              <Camera className="w-3 h-3" />
                              <span>+ Upload Foto</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveAccessory(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors ml-1"
                            title="Hapus aksesoris ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── SEKSI 6: STATUS VISIBILITAS & AKSI BAHAYA (EDIT MODE) ────────── */}
            {isEditMode && (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">
                    6
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Visibilitas Katalog & Opsi Hapus
                  </h3>
                </div>

                {/* Switch Toggle Status Aktif */}
                <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      {isActive ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                      <span>Status Publikasi Katalog</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {isActive
                        ? 'Alat aktif dan dapat ditemukan oleh penyewa di halaman katalog publik.'
                        : 'Alat disembunyikan sementara (Nonaktif) dari pencarian penyewa.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={isActive}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Danger Zone: Hapus Alat */}
                <div className="p-3.5 bg-red-50/50 border border-red-200/70 rounded-xl">
                  {!confirmDelete ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-red-800">
                          Hapus Alat Ini
                        </div>
                        <p className="text-[10.5px] text-red-600 font-medium">
                          Jika memiliki riwayat transaksi masa lalu, alat akan diarsipkan aman (soft-delete).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="px-3.5 py-1.5 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-red-600 text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                      >
                        Hapus…
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 animate-in fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Konfirmasi: Yakin ingin menghapus unit alat ini?</span>
                      </div>
                      <p className="text-[11px] text-red-700">
                        Tindakan ini tidak dapat dibatalkan jika unit belum pernah disewa. Pastikan tidak ada pesanan aktif yang mengunci alat.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleDeleteClick}
                          disabled={deleteLoading}
                          className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Ya, Hapus Sekarang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleteLoading}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── STICKY FOOTER ACTIONS (PINNED DI BAWAH) ───────────────────────── */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between gap-3">
            {/* Indikator Validasi Foto untuk Mengaktifkan Tombol */}
            <div>
              {!hasPhotos && (
                <div className="text-[11px] text-amber-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Unggah minimal 1 foto asli alat untuk mengaktifkan tombol</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || deleteLoading}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                title={!hasPhotos ? 'Unggah minimal 1 foto asli alat untuk mengaktifkan tombol ini' : ''}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 ${
                  isSubmitDisabled
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white cursor-pointer'
                }`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isEditMode ? 'Simpan Perubahan' : 'Tambah ke Katalog'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── LIGHTBOX PRATINJAU FOTO BUKTI AKSESORIS ───────────────────────── */}
      {previewAccPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewAccPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 truncate">
                  Foto Bukti: {previewAccPhoto.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAccPhoto(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-950/5 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={previewAccPhoto.photo}
                alt={previewAccPhoto.name}
                className="max-h-[55vh] w-auto max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Bukti fisik autentik untuk verifikasi BAST digital</span>
              <button
                type="button"
                onClick={() => setPreviewAccPhoto(null)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
