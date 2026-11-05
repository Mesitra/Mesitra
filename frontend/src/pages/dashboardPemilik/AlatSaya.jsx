import React, { useState, useMemo } from 'react'
import {
  Search,
  SlidersHorizontal,
  Plus,
  ChevronDown,
  Check,
  Package
} from 'lucide-react'
import InventoryCard from './InventoryCard'

// Re-export InventoryCard agar bisa diimpor dari AlatSaya maupun file terpisah
export { InventoryCard }

// 4 Alat dari Desain Figma HTML HalamanAlatSaya.html
const DUMMY_EQUIPMENTS = [
  {
    id: 'eq-1',
    nama: 'Mesin Kemasan Vakum',
    daya: '900 W',
    powerWatt: 900,
    kategori: 'Peralatan dapur',
    icon: 'package',
    fotoCount: 4,
    status: 'Tersedia',
    deskripsi: 'Kondisi prima · Minimal sewa 1 hari · Jeda perawatan 1 hari',
    harga: 'Rp 85.000',
    hargaNominal: 85000,
    deposit: 'Deposit Rp 500.000',
    depositNominal: 500000
  },
  {
    id: 'eq-2',
    nama: 'Mesin Espresso 2 Grup',
    daya: '2.800 W',
    powerWatt: 2800,
    kategori: 'Kopi & barista',
    icon: 'coffee',
    fotoCount: 4,
    status: 'Sedang disewa',
    deskripsi: 'Kondisi terawat · Minimal sewa 1 hari · Siap dikelola',
    harga: 'Rp 250.000',
    hargaNominal: 250000,
    deposit: 'Deposit Rp 1.500.000',
    depositNominal: 1500000
  },
  {
    id: 'eq-3',
    nama: 'Grinder Kopi Flat Burr',
    daya: '350 W',
    powerWatt: 350,
    kategori: 'Kopi & barista',
    icon: 'settings-2',
    fotoCount: 4,
    status: 'Inspeksi',
    deskripsi: 'Kondisi terawat · Minimal sewa 1 hari · Siap dikelola',
    harga: 'Rp 65.000',
    hargaNominal: 65000,
    deposit: 'Deposit Rp 300.000',
    depositNominal: 300000
  },
  {
    id: 'eq-4',
    nama: 'Oven Deck Bakery',
    daya: '3.200 W',
    powerWatt: 3200,
    kategori: 'Peralatan dapur',
    icon: 'flame',
    fotoCount: 4,
    status: 'Nonaktif',
    deskripsi: 'Kondisi terawat · Minimal sewa 1 hari · Siap dikelola',
    harga: 'Rp 175.000',
    hargaNominal: 175000,
    deposit: 'Deposit Rp 1.000.000',
    depositNominal: 1000000
  }
]

/**
 * Halaman "Alat Saya" untuk Dashboard Pemilik Alat.
 * Dikonversi dari Figma HTML (HalamanAlatSaya.html) dengan penyesuaian tema MyRent:
 * - Background slate/white
 * - Font sans & text slate-900
 * - Tombol aksi primer biru khas MyRent (bg-blue-600 hover:bg-blue-700)
 * - Badge status Tersedia (hijau), Sedang disewa (biru), Inspeksi (kuning), Nonaktif (abu-abu)
 * - Hanya merender konten utama (sebelah kanan) tanpa menduplikasi Sidebar.
 */
export default function AlatSaya({
  initialEquipments,
  onOpenAddModal,
  onOpenManageModal
}) {
  // State data inventaris awal (berisi 4 alat sesuai desain Figma)
  const [equipments, _setEquipments] = useState(
    Array.isArray(initialEquipments) && initialEquipments.length > 0
      ? initialEquipments
      : DUMMY_EQUIPMENTS
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'TERSEDIA' | 'DISEWA' | 'INSPEKSI' | 'NONAKTIF'
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('newest') // 'newest' | 'price_desc' | 'price_asc' | 'power_desc' | 'name_asc'
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)

  // Hitung jumlah alat per kategori status (sinkron dengan pill badge)
  const counts = useMemo(() => {
    let all = 0
    let tersedia = 0
    let disewa = 0
    let inspeksi = 0
    let nonaktif = 0

    equipments.forEach((item) => {
      all++
      const st = String(item.status || '').toUpperCase()
      if (st === 'TERSEDIA') {
        tersedia++
      } else if (st === 'SEDANG DISEWA' || st === 'DISEWA') {
        disewa++
      } else if (st === 'INSPEKSI' || st === 'MAINTENANCE') {
        inspeksi++
      } else {
        nonaktif++
      }
    })

    return { all, tersedia, disewa, inspeksi, nonaktif }
  }, [equipments])

  // Ambil daftar unik kategori alat untuk filter dropdown
  const categories = useMemo(() => {
    const list = new Set()
    equipments.forEach((item) => {
      if (item.kategori) list.add(item.kategori)
    })
    return Array.from(list)
  }, [equipments])

  // Filter & Pengurutan data
  const filteredEquipments = useMemo(() => {
    return equipments
      .filter((item) => {
        const st = String(item.status || '').toUpperCase()

        // Filter Status Pills
        if (statusFilter === 'TERSEDIA' && st !== 'TERSEDIA') return false
        if (statusFilter === 'DISEWA' && st !== 'SEDANG DISEWA' && st !== 'DISEWA') return false
        if (statusFilter === 'INSPEKSI' && st !== 'INSPEKSI' && st !== 'MAINTENANCE') return false
        if (statusFilter === 'NONAKTIF' && st !== 'NONAKTIF') return false

        // Filter Kategori Dropdown
        if (categoryFilter !== 'ALL' && item.kategori !== categoryFilter) return false

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const nameMatch = item.nama?.toLowerCase().includes(q)
          const catMatch = item.kategori?.toLowerCase().includes(q)
          const descMatch = item.deskripsi?.toLowerCase().includes(q)
          if (!nameMatch && !catMatch && !descMatch) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortOrder === 'price_desc') {
          return (b.hargaNominal || 0) - (a.hargaNominal || 0)
        }
        if (sortOrder === 'price_asc') {
          return (a.hargaNominal || 0) - (b.hargaNominal || 0)
        }
        if (sortOrder === 'power_desc') {
          return (b.powerWatt || 0) - (a.powerWatt || 0)
        }
        if (sortOrder === 'name_asc') {
          return (a.nama || '').localeCompare(b.nama || '')
        }
        return 0
      })
  }, [equipments, statusFilter, categoryFilter, searchQuery, sortOrder])

  // Handler tombol Tambah Alat
  const handleAddClick = () => {
    if (onOpenAddModal) {
      onOpenAddModal()
    } else {
      alert('Formulir Tambah Alat: fitur modal tambah alat dibuka.')
    }
  }

  // Handler tombol Kelola Alat
  const handleManageClick = (item) => {
    if (onOpenManageModal) {
      onOpenManageModal(item)
    } else {
      alert(`Kelola alat: ${item.nama}`)
    }
  }

  return (
    <section className="space-y-4 animate-in fade-in duration-200 font-sans">
      {/* ── HEADER HALAMAN (JUDUL, PENCARIAN, FILTER, TAMBAH ALAT) ──────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Alat Saya
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Kelola ketersediaan, harga, dan detail alat sewaan Anda.
          </p>
        </div>

        {/* Action Controls: Search, Filter, & Tambah Alat */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Kolom Pencarian */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama alat…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-xs rounded-xl pl-9 pr-3.5 py-2 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                aria-label="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>

          {/* Tombol Filter Kategori */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                categoryFilter !== 'ALL'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{categoryFilter === 'ALL' ? 'Filter' : categoryFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-30 animate-in fade-in">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Kategori Alat
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('ALL')
                    setIsCategoryDropdownOpen(false)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                    categoryFilter === 'ALL' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua Kategori</span>
                  {categoryFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(cat)
                      setIsCategoryDropdownOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      categoryFilter === cat ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat}</span>
                    {categoryFilter === cat && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tombol Aksi Primer: Tambah Alat (Biru Khas MyRent) */}
          <button
            type="button"
            onClick={handleAddClick}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah alat</span>
          </button>
        </div>
      </div>

      {/* ── DERETAN PILLS STATUS (SEMUA ALAT, TERSEDIA, SEDANG DISEWA, DLL) ── */}
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
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
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
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
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
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
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
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
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
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              statusFilter === 'NONAKTIF' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {counts.nonaktif}
          </span>
        </button>
      </div>

      {/* ── BAR INFORMASI INVENTARIS & PENGURUTAN ───────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="text-xs text-slate-600 font-medium">
          <span className="font-bold text-slate-900">{counts.all}</span> alat terdaftar ·{' '}
          <span className="font-bold text-emerald-600">{counts.tersedia}</span> tersedia untuk disewa
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label htmlFor="sort-select" className="text-[11px] text-slate-400 font-medium">
            Urutkan:
          </label>
          <select
            id="sort-select"
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

      {/* ── DAFTAR KARTU INVENTARIS (MAPPING INVENTORYCARD) ─────────────── */}
      {filteredEquipments.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tidak ada alat yang sesuai
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1">
              Coba atur ulang kata kunci pencarian atau bersihkan filter status untuk melihat seluruh daftar inventaris.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('ALL')
              setCategoryFilter('ALL')
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEquipments.map((item) => (
            <InventoryCard
              key={item.id}
              nama={item.nama}
              daya={item.daya}
              status={item.status}
              harga={item.harga}
              deposit={item.deposit}
              kategori={item.kategori}
              icon={item.icon}
              deskripsi={item.deskripsi}
              fotoCount={item.fotoCount}
              onKelola={() => handleManageClick(item)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
