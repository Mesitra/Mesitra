import React, { useState, useMemo, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  Search,
  SlidersHorizontal,
  Plus,
  ChevronDown,
  Check,
  Package,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import InventoryCard from './InventoryCard'
import EquipmentFormModal from '../../components/owner/EquipmentFormModal'
import { getUserToken } from '../../lib/userSession'
import { API_BASE } from '../../lib/equipmentsApi'

// Re-export InventoryCard agar bisa diimpor dari AlatSaya maupun file terpisah
export { InventoryCard }

/**
 * Halaman "Alat Saya" untuk Dashboard Pemilik Alat.
 * Mengintegrasikan data inventaris langsung dari database backend (/api/equipments/me)
 * dengan kalkulasi status ketersediaan real-time (Tersedia, Sedang disewa, Inspeksi, Nonaktif).
 */
export default function AlatSaya({
  initialEquipments,
  onOpenAddModal,
  onOpenManageModal,
  refreshSignal = 0
}) {
  const [equipments, setEquipments] = useState(
    Array.isArray(initialEquipments) ? initialEquipments : []
  )
  const [loading, setLoading] = useState(
    !Array.isArray(initialEquipments) || initialEquipments.length === 0
  )
  const [error, setError] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Internal modal states untuk mode standalone (fallback jika modal tidak dikontrol parent)
  const [internalAddOpen, setInternalAddOpen] = useState(false)
  const [internalManageItem, setInternalManageItem] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'TERSEDIA' | 'DISEWA' | 'INSPEKSI' | 'NONAKTIF'
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('newest') // 'newest' | 'price_desc' | 'price_asc' | 'power_desc' | 'name_asc'
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)

  // Mount & refresh effect: ambil data inventaris pemilik dari backend menggunakan Axios & token
  useEffect(() => {
    let isCancelled = false

    const fetchMyEquipments = async () => {
      try {
        setError(null)

        const token = getUserToken()
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }

        const endpoint = `${API_BASE || 'http://localhost:3000/api'}/equipments/me`
        const response = await axios.get(endpoint, { headers })
        const data = Array.isArray(response.data?.data) ? response.data.data : []
        if (!isCancelled) {
          setEquipments(data)
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMsg =
            err?.response?.data?.error?.message ||
            err?.message ||
            'Gagal memuat inventaris alat dari server'
          setError(errorMsg)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchMyEquipments()

    return () => {
      isCancelled = true
    }
  }, [refreshTrigger, refreshSignal])

  // Sinkronisasi saat initialEquipments berubah dari parent
  useEffect(() => {
    if (Array.isArray(initialEquipments) && initialEquipments.length > 0) {
      setEquipments(initialEquipments)
    }
  }, [initialEquipments])

  // Tombol segarkan manual
  const handleRefresh = useCallback(() => {
    setLoading(true)
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  // Hitung jumlah alat per kategori status (sinkron dengan pill badge & status real-time)
  const counts = useMemo(() => {
    let all = 0
    let tersedia = 0
    let disewa = 0
    let inspeksi = 0
    let nonaktif = 0

    equipments.forEach((item) => {
      all++
      const code = String(item.statusCode || '').toUpperCase()
      const st = String(item.status || '').toUpperCase()

      if (code === 'TERSEDIA' || st === 'TERSEDIA') {
        tersedia++
      } else if (
        code === 'DISEWA' ||
        st === 'SEDANG DISEWA' ||
        st === 'DISEWA' ||
        st === 'SEWA_AKTIF' ||
        st === 'DIKIRIM'
      ) {
        disewa++
      } else if (
        code === 'INSPEKSI' ||
        st === 'INSPEKSI' ||
        st === 'MAINTENANCE' ||
        st === 'DISPUTE'
      ) {
        inspeksi++
      } else if (code === 'NONAKTIF' || st === 'NONAKTIF') {
        nonaktif++
      } else {
        tersedia++
      }
    })

    return { all, tersedia, disewa, inspeksi, nonaktif }
  }, [equipments])

  // Ambil daftar unik kategori alat untuk filter dropdown
  const categories = useMemo(() => {
    const list = new Set()
    equipments.forEach((item) => {
      const cat = item.kategori || item.category
      if (cat) list.add(cat)
    })
    return Array.from(list)
  }, [equipments])

  // Filter & Pengurutan data inventaris real-time
  const filteredEquipments = useMemo(() => {
    return equipments
      .filter((item) => {
        const code = String(item.statusCode || '').toUpperCase()
        const st = String(item.status || '').toUpperCase()

        const isTersedia = code === 'TERSEDIA' || st === 'TERSEDIA'
        const isDisewa =
          code === 'DISEWA' ||
          st === 'SEDANG DISEWA' ||
          st === 'DISEWA' ||
          st === 'SEWA_AKTIF' ||
          st === 'DIKIRIM'
        const isInspeksi =
          code === 'INSPEKSI' ||
          st === 'INSPEKSI' ||
          st === 'MAINTENANCE' ||
          st === 'DISPUTE'
        const isNonaktif = code === 'NONAKTIF' || st === 'NONAKTIF'

        // Filter Status Pills
        if (statusFilter === 'TERSEDIA' && !isTersedia) return false
        if (statusFilter === 'DISEWA' && !isDisewa) return false
        if (statusFilter === 'INSPEKSI' && !isInspeksi) return false
        if (statusFilter === 'NONAKTIF' && !isNonaktif) return false

        // Filter Kategori Dropdown
        const itemCat = item.kategori || item.category
        if (categoryFilter !== 'ALL' && itemCat !== categoryFilter) return false

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const nameMatch = (item.nama || item.name || '').toLowerCase().includes(q)
          const catMatch = (itemCat || '').toLowerCase().includes(q)
          const descMatch = (item.deskripsi || item.description || '').toLowerCase().includes(q)
          if (!nameMatch && !catMatch && !descMatch) return false
        }

        return true
      })
      .sort((a, b) => {
        const priceA = Number(a.hargaNominal ?? a.pricePerDay ?? a.harga ?? 0)
        const priceB = Number(b.hargaNominal ?? b.pricePerDay ?? b.harga ?? 0)
        const powerA = Number(a.powerWatt ?? 0)
        const powerB = Number(b.powerWatt ?? 0)
        const nameA = a.nama || a.name || ''
        const nameB = b.nama || b.name || ''

        if (sortOrder === 'price_desc') {
          return priceB - priceA
        }
        if (sortOrder === 'price_asc') {
          return priceA - priceB
        }
        if (sortOrder === 'power_desc') {
          return powerB - powerA
        }
        if (sortOrder === 'name_asc') {
          return nameA.localeCompare(nameB)
        }
        return 0
      })
  }, [equipments, statusFilter, categoryFilter, searchQuery, sortOrder])

  // Handler tombol Tambah Alat
  const handleAddClick = () => {
    if (onOpenAddModal) {
      onOpenAddModal()
    } else {
      setInternalAddOpen(true)
    }
  }

  // Handler tombol Kelola Alat
  const handleManageClick = (item) => {
    if (onOpenManageModal) {
      onOpenManageModal(item)
    } else {
      setInternalManageItem(item)
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
            Kelola ketersediaan, harga, dan detail alat sewaan Anda secara real-time.
          </p>
        </div>

        {/* Action Controls: Search, Filter, Refresh, & Tambah Alat */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Kolom Pencarian */}
          <div className="relative flex-1 sm:w-52">
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

          {/* Tombol Segarkan Data Real-Time */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title="Segarkan data inventaris"
            className="p-2 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            aria-label="Segarkan data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

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

      {/* ── DAFTAR KARTU INVENTARIS / LOADING / ERROR STATE ─────────────── */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memuat inventaris alat Anda dari database…</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-50/70 border border-red-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-800">Gagal Memuat Inventaris</h3>
            <p className="text-xs text-red-600 max-w-sm mx-auto mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      ) : filteredEquipments.length === 0 ? (
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
              item={item}
              nama={item.nama || item.name}
              daya={item.daya || (item.powerWatt ? `${item.powerWatt} W` : '-')}
              status={item.status}
              harga={item.harga ?? item.pricePerDay}
              deposit={item.deposit}
              kategori={item.kategori || item.category}
              icon={item.icon}
              deskripsi={item.deskripsi || item.description}
              images={item.images}
              photos={item.photos}
              fotoCount={item.fotoCount}
              onKelola={() => handleManageClick(item)}
            />
          ))}
        </div>
      )}

      {/* Fallback Internal Modal Tambah Alat jika tidak ditangani parent */}
      {!onOpenAddModal && (
        <EquipmentFormModal
          isOpen={internalAddOpen}
          mode="create"
          onClose={() => setInternalAddOpen(false)}
          onSuccess={() => handleRefresh()}
        />
      )}

      {/* Fallback Internal Modal Kelola Alat jika tidak ditangani parent */}
      {!onOpenManageModal && (
        <EquipmentFormModal
          isOpen={Boolean(internalManageItem)}
          mode="edit"
          equipment={internalManageItem}
          onClose={() => setInternalManageItem(null)}
          onSuccess={() => handleRefresh()}
        />
      )}
    </section>
  )
}
