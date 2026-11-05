import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Package,
  Layers,
  Wrench,
  DollarSign,
  Truck,
  Image as ImageIcon,
  Tag,
  Power,
  AlertTriangle,
  Loader2,
  Sparkles,
  Shield,
  Eye,
  EyeOff
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

export const PRESET_IMAGES = [
  { label: 'Mesin Espresso', url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80' },
  { label: 'Oven Bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80' },
  { label: 'Mesin Kemasan', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80' },
  { label: 'Mesin Jahit', url: 'https://images.unsplash.com/photo-1528458876885-5b6eacdd3671?auto=format&fit=crop&w=800&q=80' },
  { label: 'Mixer Planetary', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Grinder Kopi', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80' }
]

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

  // 5. Media & Kelengkapan
  const [images, setImages] = useState([
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80'
  ])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const [accessories, setAccessories] = useState(['Kabel Power'])
  const [newAccessory, setNewAccessory] = useState('')

  // 6. Status Visibilitas & Aksi Bahaya (Edit Mode)
  const [isActive, setIsActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Feedback states
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

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
        setImages(['https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80'])
      }

      if (Array.isArray(equipment.accessories) && equipment.accessories.length > 0) {
        setAccessories(equipment.accessories)
      } else {
        setAccessories(['Kabel Power'])
      }

      const activeFlag =
        equipment.isActive !== undefined
          ? Boolean(equipment.isActive)
          : String(equipment.status || '').toUpperCase() !== 'NONAKTIF' && !equipment.isDeleted
      setIsActive(activeFlag)
    } else {
      // Reset form ke default create mode
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
      setImages(['https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80'])
      setAccessories(['Kabel Power'])
      setIsActive(true)
    }

    setConfirmDelete(false)
    setError('')
  }, [equipment, isEditMode, isOpen])

  // Handlers Media Images
  const handleAddImage = (url) => {
    const trimmed = (url || newImageUrl).trim()
    if (!trimmed) return
    if (!images.includes(trimmed)) {
      setImages([...images, trimmed])
    }
    setNewImageUrl('')
    setShowUrlInput(false)
  }

  const handleRemoveImage = (indexToRemove) => {
    if (images.length <= 1) {
      setError('Minimal sertakan satu foto alat sebagai representasi katalog.')
      return
    }
    setImages(images.filter((_, idx) => idx !== indexToRemove))
  }

  // Handlers Accessories
  const handleAddAccessory = () => {
    const trimmed = newAccessory.trim()
    if (!trimmed) return
    if (!accessories.includes(trimmed)) {
      setAccessories([...accessories, trimmed])
    }
    setNewAccessory('')
  }

  const handleRemoveAccessory = (indexToRemove) => {
    setAccessories(accessories.filter((_, idx) => idx !== indexToRemove))
  }

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validasi Form
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
    if (images.length === 0) {
      setError('Tambahkan minimal satu URL foto alat')
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
      accessories,
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

  // Delete Handler (Edit Mode)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* ── HEADER MODAL ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
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
                  ? 'Perbarui spesifikasi, tarif, logistik, atau arsipkan unit.'
                  : 'Lengkapi 6 seksi formulir agar alat tampil menarik di katalog penyewa.'}
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
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-semibold animate-in fade-in">
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

        {/* ── SCROLLABLE FORM BODY ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
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
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Ambil di Gudang (Self Pickup)</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryCourier}
                    onChange={(e) => setDeliveryCourier(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
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

          {/* ── SEKSI 5: MEDIA & KELENGKAPAN (DYNAMIC LIST) ──────────────────── */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">
                5
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Foto Alat & Kelengkapan Aksesoris
              </h3>
            </div>

            {/* List Foto & Preset */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Foto Alat ({images.length})
                </label>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah URL Custom</span>
                </button>
              </div>

              {/* Form Input Custom URL */}
              {showUrlInput && (
                <div className="flex gap-2 p-2.5 bg-white border border-blue-200 rounded-xl shadow-2xs">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddImage(newImageUrl)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              )}

              {/* Thumbnail Gallery Preview */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {images.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs"
                  >
                    <img
                      src={url}
                      alt={`Foto alat ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Preset Pilihan Cepat */}
              <div className="pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Pilih Cepat Foto Presets:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddImage(preset.url)}
                      className="text-[11px] font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List Kelengkapan / Aksesoris */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60">
              <label className="block text-xs font-bold text-slate-700">
                Kelengkapan & Aksesoris Alat
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: Portafilter 58mm, Kabel Power, Buku Panduan..."
                  value={newAccessory}
                  onChange={(e) => setNewAccessory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddAccessory()
                    }
                  }}
                  className="flex-1 bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddAccessory}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Tambah Tag
                </button>
              </div>

              {/* Tags Container */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {accessories.map((acc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-800 px-3 py-1 rounded-full shadow-2xs"
                  >
                    <span>{acc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAccessory(idx)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Hapus"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
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

          {/* ── STICKY FOOTER ACTIONS ────────────────────────────────────────── */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
              disabled={loading || deleteLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditMode ? 'Simpan Perubahan' : 'Tambah ke Katalog'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
