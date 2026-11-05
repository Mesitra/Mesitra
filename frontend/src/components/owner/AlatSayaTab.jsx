import React, { useState, useMemo } from 'react'
import {
  Search,
  SlidersHorizontal,
  Plus,
  Settings2,
  Package,
  Coffee,
  Flame,
  Scissors,
  Layers,
  Sparkles,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react'
import { formatRupiah } from '../../lib/equipmentsApi'

// Helper icon berdasarkan kategori
function getCategoryIcon(category = '') {
  const cat = String(category).toLowerCase()
  if (cat.includes('kopi') || cat.includes('barista')) return Coffee
  if (cat.includes('oven') || cat.includes('bakery')) return Flame
  if (cat.includes('konveksi') || cat.includes('jahit')) return Scissors
  if (cat.includes('kemas') || cat.includes('vakum') || cat.includes('dapur')) return Package
  return Layers
}

export default function AlatSayaTab({
  equipments = [],
  onOpenAddModal,
  onOpenManageModal,
  loading = false
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'TERSEDIA' | 'DISEWA' | 'INSPEKSI' | 'NONAKTIF'
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('newest') // 'newest' | 'price_desc' | 'price_asc' | 'power_desc' | 'name_asc'
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)

  // Hitung jumlah alat per status
  const counts = useMemo(() => {
    let all = 0
    let tersedia = 0
    let disewa = 0
    let inspeksi = 0
    let nonaktif = 0

    equipments.forEach((eq) => {
      all++
      const st = String(eq.status || '').toUpperCase()
      if (eq.isDeleted || st === 'NONAKTIF') {
        nonaktif++
      } else if (st === 'TERSEDIA') {
        tersedia++
      } else if (st === 'DISEWA') {
        disewa++
      } else if (st === 'INSPEKSI' || st === 'MAINTENANCE') {
        inspeksi++
      } else {
        tersedia++
      }
    })

    return { all, tersedia, disewa, inspeksi, nonaktif }
  }, [equipments])

  // Ambil daftar unik kategori yang ada di data
  const availableCategories = useMemo(() => {
    const set = new Set()
    equipments.forEach((eq) => {
      if (eq.category) set.add(eq.category)
    })
    return Array.from(set)
  }, [equipments])

  // Filter & Pengurutan
  const filteredEquipments = useMemo(() => {
    return equipments
      .filter((eq) => {
        const isInactive = eq.isDeleted || String(eq.status).toUpperCase() === 'NONAKTIF'
        const st = String(eq.status || '').toUpperCase()

        // Filter Status Chip
        if (statusFilter === 'TERSEDIA') {
          if (isInactive || st !== 'TERSEDIA') return false
        } else if (statusFilter === 'DISEWA') {
          if (isInactive || st !== 'DISEWA') return false
        } else if (statusFilter === 'INSPEKSI') {
          if (isInactive || (st !== 'INSPEKSI' && st !== 'MAINTENANCE')) return false
        } else if (statusFilter === 'NONAKTIF') {
          if (!isInactive) return false
        }

        // Filter Kategori Dropdown
        if (selectedCategory !== 'ALL' && eq.category !== selectedCategory) {
          return false
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const nameMatch = eq.name?.toLowerCase().includes(q)
          const catMatch = eq.category?.toLowerCase().includes(q)
          const descMatch = eq.description?.toLowerCase().includes(q)
          if (!nameMatch && !catMatch && !descMatch) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        }
        if (sortOrder === 'price_desc') {
          return (b.pricePerDay || 0) - (a.pricePerDay || 0)
        }
        if (sortOrder === 'price_asc') {
          return (a.pricePerDay || 0) - (b.pricePerDay || 0)
        }
        if (sortOrder === 'power_desc') {
          return (b.powerWatt || 0) - (a.powerWatt || 0)
        }
        if (sortOrder === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '')
        }
        return 0
      })
  }, [equipments, statusFilter, selectedCategory, searchQuery, sortOrder])

  return (
    <div className="space-y-4 animate-in fade-in duration-200 font-sans">
      {/* ── HEADER HALAMAN & KONTROL ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Alat Saya
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Kelola ketersediaan, harga, dan detail alat sewaan Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama alat…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-xs rounded-xl pl-9 pr-3.5 py-2 border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter Dropdown Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                selectedCategory !== 'ALL'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{selectedCategory === 'ALL' ? 'Filter' : selectedCategory}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-30 animate-in fade-in">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Kategori Alat
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL')
                    setIsFilterDropdownOpen(false)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                    selectedCategory === 'ALL' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua Kategori</span>
                  {selectedCategory === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat)
                      setIsFilterDropdownOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      selectedCategory === cat ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tombol Tambah Alat */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah alat</span>
          </button>
        </div>
      </div>

      {/* ── DERETAN CHIP FILTER STATUS ─────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
            statusFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span>Semua alat</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              statusFilter === 'ALL' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('TERSEDIA')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
            statusFilter === 'TERSEDIA'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Tersedia</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              statusFilter === 'TERSEDIA' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {counts.tersedia}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('DISEWA')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
            statusFilter === 'DISEWA'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>Sedang disewa</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              statusFilter === 'DISEWA' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {counts.disewa}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('INSPEKSI')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
            statusFilter === 'INSPEKSI'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Inspeksi</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              statusFilter === 'INSPEKSI' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {counts.inspeksi}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('NONAKTIF')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
            statusFilter === 'NONAKTIF'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Nonaktif</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              statusFilter === 'NONAKTIF' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {counts.nonaktif}
          </span>
        </button>
      </div>

      {/* ── BAR INFORMASI INVENTARIS & DROPDOWN PENGURUTAN ────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="text-xs text-slate-600 font-medium">
          <span className="font-bold text-slate-900">{counts.all}</span> alat terdaftar ·{' '}
          <span className="font-bold text-emerald-600">{counts.tersedia}</span> tersedia untuk disewa
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] text-slate-400 font-medium">Urutkan:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer border-0"
          >
            <option value="newest">Terbaru ↓</option>
            <option value="price_desc">Harga Tertinggi</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="power_desc">Daya Tertinggi</option>
            <option value="name_asc">Nama A-Z</option>
          </select>
        </div>
      </div>

      {/* ── DAFTAR KARTU HORIZONTAL ALAT ──────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Memuat inventaris alat Anda…</p>
        </div>
      ) : filteredEquipments.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {searchQuery || statusFilter !== 'ALL' || selectedCategory !== 'ALL'
                ? 'Tidak ada alat yang cocok dengan filter'
                : 'Belum ada alat yang didaftarkan'}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== 'ALL' || selectedCategory !== 'ALL'
                ? 'Coba ganti kata kunci pencarian atau reset filter untuk melihat daftar lengkap.'
                : 'Mulai tawarkan peralatan produksi Anda kepada mitra UMKM untuk menghasilkan pendapatan sewa rutin.'}
            </p>
          </div>
          <div>
            {searchQuery || statusFilter !== 'ALL' || selectedCategory !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                  setSelectedCategory('ALL')
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Alat Pertama</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEquipments.map((eq) => {
            const isInactive = eq.isDeleted || String(eq.status).toUpperCase() === 'NONAKTIF'
            const statusUpper = String(eq.status || 'TERSEDIA').toUpperCase()

            // Status Badge Config
            let statusBadge = {
              label: 'Tersedia',
              bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              dotClass: 'bg-emerald-500'
            }

            if (isInactive) {
              statusBadge = {
                label: 'Nonaktif',
                bgClass: 'bg-slate-100 text-slate-600 border-slate-200',
                dotClass: 'bg-slate-400'
              }
            } else if (statusUpper === 'DISEWA') {
              statusBadge = {
                label: 'Sedang disewa',
                bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
                dotClass: 'bg-blue-500'
              }
            } else if (statusUpper === 'INSPEKSI' || statusUpper === 'MAINTENANCE') {
              statusBadge = {
                label: 'Inspeksi',
                bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
                dotClass: 'bg-amber-500'
              }
            }

            const photoCount = Array.isArray(eq.images) && eq.images.length > 0 ? eq.images.length : 1
            const mainPhoto =
              Array.isArray(eq.images) && eq.images.length > 0
                ? eq.images[0]
                : 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'

            const CategoryIcon = getCategoryIcon(eq.category)

            return (
              <div
                key={eq.id}
                className="bg-white border border-slate-200/90 hover:border-blue-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
              >
                {/* Sisi Kiri: Foto & Kategori */}
                <div className="flex items-center gap-3.5">
                  <div className="relative w-32 h-24 sm:w-36 sm:h-24 rounded-xl bg-slate-100 border border-slate-200/90 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    <img
                      src={mainPhoto}
                      alt={eq.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />

                    {/* Fallback Icon jika gambar gagal */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-slate-400 pointer-events-none -z-0">
                      <CategoryIcon className="w-8 h-8 opacity-40 text-slate-600" />
                    </div>

                    {/* Kategori Badge Top-Left */}
                    <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200/80 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-700 tracking-wide uppercase">
                        {eq.category || 'Alat'}
                      </span>
                    </div>

                    {/* Photo count indicator Bottom */}
                    <div className="absolute bottom-1.5 left-1.5 bg-slate-900/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 shadow-xs">
                      <span>▧</span>
                      <span>{photoCount} foto</span>
                    </div>
                  </div>

                  {/* Sisi Tengah: Detail Spesifikasi */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
                        {eq.name}
                      </h3>
                      <span className="text-xs text-slate-400 font-normal">·</span>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-0.5">
                        <Zap className="w-3 h-3 text-blue-600" />
                        {eq.powerWatt || 0} W
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bgClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClass}`} />
                        <span>{statusBadge.label}</span>
                      </span>

                      {eq.location && (
                        <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
                          📍 {eq.location}
                        </span>
                      )}
                    </div>

                    {/* Ringkasan Spek Singkat */}
                    <div className="text-[11px] text-slate-500 font-medium">
                      Kondisi {eq.condition || 'Prima'} · Minimal sewa {eq.minRentDays || 1} hari · Jeda perawatan{' '}
                      {eq.maintenanceBufferDays || 1} hari
                    </div>

                    {/* Accessories pills preview */}
                    {Array.isArray(eq.accessories) && eq.accessories.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {eq.accessories.slice(0, 3).map((acc, i) => {
                          const label = typeof acc === 'object' && acc !== null ? acc.name : acc
                          return (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                            >
                              {typeof acc === 'object' && acc?.photo && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Ada foto bukti" />
                              )}
                              <span>{label}</span>
                            </span>
                          )
                        })}
                        {eq.accessories.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            +{eq.accessories.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sisi Kanan: Harga & Tombol Aksi */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 shrink-0 gap-2 sm:gap-1.5">
                  <div className="text-left sm:text-right">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      HARGA SEWA / HARI
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-blue-600">
                      {formatRupiah(eq.pricePerDay)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Deposit {formatRupiah(eq.deposit)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenManageModal(eq)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Kelola alat</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
