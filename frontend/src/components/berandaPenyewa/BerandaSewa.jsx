import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Loader2, MapPin, TriangleAlert } from 'lucide-react'
import NavbarPenyewa from '../common/NavbarPenyewa'
import SidebarFilter from './SidebarFilter'
import ProductCard from './ProductCard'
import { listEquipments } from '../../lib/equipmentsApi'
import { getSessionUser, getUserPowerLimit } from '../../lib/userSession'
import { formatShortDate, isEquipmentAvailableInRange } from '../../lib/dateHelpers'
import { useSEO } from '../../lib/useSEO'

const ALL_CATEGORY = 'Semua Alat'
const NEAREST_CATEGORY = 'Terdekat'

// Opsi dropdown "Urutkan".
const SORT_OPTIONS = [
  { value: 'terdekat', label: 'Terdekat' },
  { value: 'termurah', label: 'Termurah' },
  { value: 'termahal', label: 'Termahal' }
]

// Filter sidebar: rentang tanggal + batas security deposit.
const FILTER_STORAGE_KEY = 'myrent_beranda_filters'
const POWER_STORAGE_KEY = 'filter_sesuai_listrik'
const MAX_PRICE_STORAGE_KEY = 'myrent_filter_max_price'
const DELIVERY_STORAGE_KEY = 'myrent_filter_delivery_methods'
const DEFAULT_MAX_PRICE = 10000000
const DEFAULT_DELIVERY_METHODS = { selfPickup: false, courier: false }

const DEFAULT_FILTERS = {
  dateRange: { start: null, end: null },
  maxDeposit: 'semua',
  sortRating: ''
}

const parseDeliveryQuery = (val) => {
  if (!val) return null
  const tokens = String(val).toLowerCase().split(',').map((t) => t.trim())
  const selfPickup = tokens.includes('gudang') || tokens.includes('pickup') || tokens.includes('self_pickup')
  const courier = tokens.includes('kurir') || tokens.includes('courier')
  return { selfPickup, courier }
}

const formatDeliveryQuery = (delivery) => {
  const parts = []
  if (delivery?.selfPickup) parts.push('gudang')
  if (delivery?.courier) parts.push('kurir')
  return parts.join(',')
}

const createInitialFilters = () => {
  let initialSortRating = ''
  try {
    const params = new URLSearchParams(window.location.search)
    const urlRating = params.get('sortRating')
    if (urlRating === 'desc' || urlRating === 'asc') {
      initialSortRating = urlRating
    }
  } catch {}

  try {
    const saved = sessionStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object') {
        return {
          dateRange: {
            start: parsed.dateRange?.start ?? null,
            end: parsed.dateRange?.end ?? null
          },
          maxDeposit: parsed.maxDeposit ?? 'semua',
          sortRating: initialSortRating || parsed.sortRating || ''
        }
      }
    }
  } catch {
    // Abaikan jika parsing gagal, gunakan nilai awal default
  }

  return {
    ...DEFAULT_FILTERS,
    sortRating: initialSortRating
  }
}

const createInitialPowerMatch = () => {
  // 1. Cek query parameter URL (?powerFilter=true/false)
  try {
    const params = new URLSearchParams(window.location.search)
    const urlVal = params.get('powerFilter')
    if (urlVal !== null) {
      return urlVal === 'true' || urlVal === '1'
    }
  } catch {
    // Abaikan jika tidak tersedia window / URLSearchParams
  }

  // 2. Cek localStorage ('filter_sesuai_listrik')
  try {
    const saved = localStorage.getItem(POWER_STORAGE_KEY)
    if (saved !== null) {
      return saved === 'true'
    }
  } catch {
    // Abaikan jika localStorage diblokir/gagal
  }

  // 3. Nilai default awal: aktif (true)
  return true
}

const createInitialMaxPrice = () => {
  // 1. Cek query parameter URL (?maxPrice=...)
  try {
    const params = new URLSearchParams(window.location.search)
    const urlVal = params.get('maxPrice')
    if (urlVal !== null) {
      const parsed = Number(urlVal)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.min(parsed, DEFAULT_MAX_PRICE)
      }
    }
  } catch {
    // Abaikan jika tidak tersedia window / URLSearchParams
  }

  // 2. Cek localStorage ('myrent_filter_max_price')
  try {
    const saved = localStorage.getItem(MAX_PRICE_STORAGE_KEY)
    if (saved !== null) {
      const parsed = Number(saved)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.min(parsed, DEFAULT_MAX_PRICE)
      }
    }
  } catch {
    // Abaikan jika localStorage diblokir/gagal
  }

  // 3. Nilai default awal: Rp 10.000.000 (10 juta)
  return DEFAULT_MAX_PRICE
}

const createInitialDeliveryMethods = () => {
  // 1. Cek query parameter URL (?delivery=gudang,kurir)
  try {
    const params = new URLSearchParams(window.location.search)
    const urlVal = params.get('delivery')
    if (urlVal !== null) {
      const parsed = parseDeliveryQuery(urlVal)
      if (parsed) return parsed
    }
  } catch {}

  // 2. Cek localStorage ('myrent_filter_delivery_methods')
  try {
    const saved = localStorage.getItem(DELIVERY_STORAGE_KEY)
    if (saved !== null) {
      try {
        const parsedObj = JSON.parse(saved)
        if (parsedObj && typeof parsedObj === 'object') {
          return {
            selfPickup: Boolean(parsedObj.selfPickup),
            courier: Boolean(parsedObj.courier)
          }
        }
      } catch {
        const parsed = parseDeliveryQuery(saved)
        if (parsed) return parsed
      }
    }
  } catch {}

  // 3. Default: keduanya tidak dicentang (false, false)
  return DEFAULT_DELIVERY_METHODS
}

export default function BerandaSewa({
  onSelectProduct,
  onNavigateHome
}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [maxPrice, setMaxPrice] = useState(createInitialMaxPrice)
  const [powerMatch, setPowerMatch] = useState(createInitialPowerMatch)
  // State metode pengiriman persisten (dibaca dari URL / localStorage / default false)
  const [deliveryMethods, setDeliveryMethods] = useState(createInitialDeliveryMethods)

  // ── Urutkan & Kategori (dropdown) ───────────────────────────────────────
  const [sortBy, setSortBy] = useState('terdekat')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef(null)

  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef(null)

  // ── Filter sidebar ──────────────────────────────────────────────────────
  const [filters, setFilters] = useState(createInitialFilters)

  // SEO dinamis untuk halaman Katalog Sewa Alat UMKM
  useSEO({
    title: 'Katalog Sewa Alat & Mesin Usaha UMKM - Mesitra',
    description: 'Jelajahi katalog lengkap sewa mesin usaha dan alat produksi UMKM: mesin kopi espresso, continuous band sealer, mesin jahit konveksi, hingga deck oven bakery dengan deposit aman.',
    keywords: 'katalog sewa alat, sewa mesin usaha umkm, sewa mesin espresso, sewa continuous sealer, sewa mesin jahit, mesitra'
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // Abaikan bila storage penuh atau diblokir
    }

    try {
      const url = new URL(window.location.href)
      if (filters.sortRating) {
        url.searchParams.set('sortRating', filters.sortRating)
      } else {
        url.searchParams.delete('sortRating')
      }
      window.history.replaceState({}, '', url.toString())
    } catch {
      // Abaikan bila URL update gagal
    }
  }, [filters])

  // Simpan state toggle daya ke localStorage setiap kali berubah
  useEffect(() => {
    try {
      localStorage.setItem(POWER_STORAGE_KEY, String(powerMatch))
    } catch {
      // Abaikan bila storage penuh atau diblokir
    }
  }, [powerMatch])

  const handlePowerMatchChange = (nextValue) => {
    setPowerMatch(nextValue)
    try {
      localStorage.setItem(POWER_STORAGE_KEY, String(nextValue))
    } catch {
      // Abaikan jika storage gagal
    }
  }

  // Simpan state harga maksimal ke localStorage setiap kali berubah
  useEffect(() => {
    try {
      localStorage.setItem(MAX_PRICE_STORAGE_KEY, String(maxPrice))
    } catch {
      // Abaikan bila storage penuh atau diblokir
    }
  }, [maxPrice])

  const handleMaxPriceChange = (nextValue) => {
    const numericVal = Number(nextValue)
    const validVal = Number.isFinite(numericVal) ? numericVal : DEFAULT_MAX_PRICE
    setMaxPrice(validVal)

    try {
      localStorage.setItem(MAX_PRICE_STORAGE_KEY, String(validVal))
    } catch {
      // Abaikan jika storage gagal
    }

    try {
      const url = new URL(window.location.href)
      if (validVal < DEFAULT_MAX_PRICE) {
        url.searchParams.set('maxPrice', String(validVal))
      } else {
        url.searchParams.delete('maxPrice')
      }
      window.history.replaceState({}, '', url.toString())
    } catch {
      // Abaikan jika browser tidak mendukung
    }
  }

  // Handler perubahan metode pengiriman dengan persistensi URL & localStorage
  const handleDeliveryMethodChange = (nextValue) => {
    const nextDelivery = {
      selfPickup: Boolean(nextValue?.selfPickup),
      courier: Boolean(nextValue?.courier)
    }
    setDeliveryMethods(nextDelivery)

    // 1. Simpan ke localStorage
    try {
      if (nextDelivery.selfPickup || nextDelivery.courier) {
        localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(nextDelivery))
      } else {
        localStorage.removeItem(DELIVERY_STORAGE_KEY)
      }
    } catch {
      // Abaikan jika storage gagal
    }

    // 2. Sinkronkan ke URL search params (?delivery=gudang,kurir)
    try {
      const url = new URL(window.location.href)
      const queryVal = formatDeliveryQuery(nextDelivery)
      if (queryVal) {
        url.searchParams.set('delivery', queryVal)
      } else {
        url.searchParams.delete('delivery')
      }
      window.history.replaceState({}, '', url.toString())
    } catch {
      // Abaikan
    }
  }

  // Sinkronkan state deliveryMethods jika searchParams URL berubah (mis. tombol Back / Forward browser)
  useEffect(() => {
    const deliveryParam = searchParams.get('delivery')
    if (deliveryParam !== null) {
      const parsed = parseDeliveryQuery(deliveryParam)
      if (parsed) {
        setDeliveryMethods((prev) => {
          if (prev.selfPickup === parsed.selfPickup && prev.courier === parsed.courier) {
            return prev
          }
          return parsed
        })
      }
    } else {
      // Jika URL tidak memiliki parameter delivery
      const saved = localStorage.getItem(DELIVERY_STORAGE_KEY)
      if (!saved) {
        setDeliveryMethods((prev) => {
          if (!prev.selfPickup && !prev.courier) return prev
          return DEFAULT_DELIVERY_METHODS
        })
      }
    }
  }, [searchParams])

  // Kapasitas daya listrik usaha penyewa (dari sesi login).
  // Menggunakan data KYC pengguna jika ada, atau fallback ke kapasitas standar 1300 W.
  const user = getSessionUser()
  const rawPowerLimit = getUserPowerLimit(user)
  const powerLimit = rawPowerLimit || 1300
  const userLocation =
    user?.kycData?.district ||
    user?.kycData?.city ||
    (user?.kycData?.address ? user.kycData.address.split(',')[0].trim() : '') ||
    'Lokasi Anda'

  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY)

  // Tutup dropdown Urutkan / Kategori saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!sortOpen && !categoryOpen) return undefined

    const handlePointerDown = (event) => {
      if (sortOpen && sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false)
      }
      if (categoryOpen && categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSortOpen(false)
        setCategoryOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [sortOpen, categoryOpen])

  // ── Ambil katalog alat dari backend ─────────────────────────────────────
  useEffect(() => {
    let isActive = true

    const loadEquipments = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = {}
        if (filters.sortRating) {
          params.sortRating = filters.sortRating
        }
        const data = await listEquipments(params)
        if (isActive) setEquipments(data)
      } catch (err) {
        if (isActive) {
          setEquipments([])
          setError(err.message || 'Gagal memuat katalog alat')
        }
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadEquipments()

    return () => {
      isActive = false
    }
  }, [filters.sortRating])

  // Kategori chip dihitung dari data yang benar-benar ada di database.
  const categories = useMemo(() => {
    const fromData = Array.from(
      new Set(equipments.map((item) => item.category).filter(Boolean))
    )

    return [
      ALL_CATEGORY,
      ...fromData,
      NEAREST_CATEGORY
    ]
  }, [equipments])

  // Batas deposit aktif ('semua' = tanpa batas).
  const maxDeposit = filters.maxDeposit === 'semua' ? Infinity : Number(filters.maxDeposit)

  // Filter logic
  const filteredProducts = useMemo(() => {
    return equipments.filter((item) => {
      // Search filter
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Category filter
      if (selectedCategory !== ALL_CATEGORY && selectedCategory !== NEAREST_CATEGORY) {
        if (item.category !== selectedCategory) {
          return false
        }
      }

      // Power toggle filter from sidebar:
      // - Saat AKTIF: Hanya tampilkan alat dengan daya <= kapasitas daya usaha (maks. 1300 W).
      // - Saat MATI: Tampilkan SEMUA alat tanpa batasan daya listrik (termasuk alat industri > 1300 W).
      if (powerMatch) {
        const itemWatt = Number(item.powerWatt ?? item.power ?? 0)
        if (itemWatt > powerLimit) {
          return false
        }
      }

      // Max price
      if (Number(item.pricePerDay) > maxPrice) {
        return false
      }

      // Batas security deposit (filter sidebar)
      if (Number(item.deposit) > maxDeposit) {
        return false
      }

      // Validasi ketat rentang tanggal sewa:
      // Looping ketersediaan untuk setiap hari di antara start dan end.
      // Jika salah satu hari berstatus 'terisi' atau 'buffer', alat dikeluarkan.
      if (filters.dateRange?.start || filters.dateRange?.end) {
        const isAvailable = isEquipmentAvailableInRange(
          item,
          filters.dateRange.start,
          filters.dateRange.end
        )
        if (!isAvailable) {
          return false
        }
      }

      // Filter Metode Pengiriman:
      // - Saat kondisi default (kedua checkbox tidak dicentang) ATAU keduanya dicentang: tampilkan semua alat.
      // - Jika hanya "Ambil sendiri di gudang" yang dicentang: hanya tampilkan alat yang mendukung opsi self-pickup.
      // - Jika hanya "Diantar kurir toko" yang dicentang: hanya tampilkan alat yang mendukung pengiriman kurir.
      const isPickupSelected = Boolean(deliveryMethods?.selfPickup)
      const isCourierSelected = Boolean(deliveryMethods?.courier)

      if (isPickupSelected !== isCourierSelected) {
        const itemMethods = Array.isArray(item.deliveryMethods) && item.deliveryMethods.length > 0
          ? item.deliveryMethods.map((m) => String(m).toUpperCase())
          : ['PICKUP', 'COURIER']

        const supportsPickup = itemMethods.some((m) => m === 'PICKUP' || m.includes('PICKUP') || m.includes('GUDANG') || m.includes('AMBIL'))
        const supportsCourier = itemMethods.some((m) => m === 'COURIER' || m.includes('COURIER') || m.includes('KURIR') || m.includes('ANTAR'))

        if (isPickupSelected && !supportsPickup) {
          return false
        }
        if (isCourierSelected && !supportsCourier) {
          return false
        }
      }

      return true
    })
  }, [
    equipments,
    searchQuery,
    selectedCategory,
    powerMatch,
    powerLimit,
    maxPrice,
    maxDeposit,
    filters.dateRange,
    deliveryMethods
  ])

  // Sorting hasil filter sesuai pilihan dropdown "Urutkan".
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]

    // Jika filter rating di sidebar aktif, pertahankan agregasi sorting dari backend
    // kecuali pengguna memilih sorting harga spesifik di dropdown
    if (filters.sortRating) {
      if (sortBy === 'termurah') {
        return list.sort((a, b) => Number(a.pricePerDay) - Number(b.pricePerDay))
      }
      if (sortBy === 'termahal') {
        return list.sort((a, b) => Number(b.pricePerDay) - Number(a.pricePerDay))
      }
      return list
    }

    if (sortBy === 'termurah') {
      return list.sort((a, b) => Number(a.pricePerDay) - Number(b.pricePerDay))
    }

    if (sortBy === 'termahal') {
      return list.sort((a, b) => Number(b.pricePerDay) - Number(a.pricePerDay))
    }

    // 'terdekat' → jarak (km) terdekat lebih dulu
    return list.sort((a, b) => Number(a.distance) - Number(b.distance))
  }, [filteredProducts, sortBy, filters.sortRating])

  // Label rentang tanggal untuk header & navbar.
  const dateRangeLabel = useMemo(() => {
    const { start, end } = filters.dateRange

    if (start && end) return `${formatShortDate(start)} – ${formatShortDate(end)}`
    if (start) return formatShortDate(start)
    if (end) return formatShortDate(end)

    return 'Semua tanggal'
  }, [filters.dateRange])

  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Terdekat'

  const resetFilters = () => {
    setSelectedCategory(ALL_CATEGORY)
    setSearchQuery('')
    handleMaxPriceChange(DEFAULT_MAX_PRICE)
    handlePowerMatchChange(true)
    handleDeliveryMethodChange(DEFAULT_DELIVERY_METHODS)
    try {
      sessionStorage.removeItem(FILTER_STORAGE_KEY)
      localStorage.removeItem(POWER_STORAGE_KEY)
      localStorage.removeItem(MAX_PRICE_STORAGE_KEY)
      localStorage.removeItem(DELIVERY_STORAGE_KEY)

      const url = new URL(window.location.href)
      url.searchParams.delete('maxPrice')
      url.searchParams.delete('powerFilter')
      url.searchParams.delete('delivery')
      url.searchParams.delete('sortRating')
      window.history.replaceState({}, '', url.toString())
    } catch {
      // Abaikan jika gagal
    }
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="box-border w-full min-h-screen flex flex-col justify-start items-start bg-slate-50">
      {/* 1. Global Navigation Bar */}
      <NavbarPenyewa
        activeTab="jelajahi"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRangeLabel}
        onNavigateHome={onNavigateHome}
      />

      {/* 2. Main Content */}
      <main className="box-border w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 pt-0 pb-6 flex flex-col justify-start items-start">
        {/* Header Halaman (Judul, Jumlah Alat, & Filter/Urutkan) */}
        <div className="box-border w-[calc(100%+3rem)] md:w-[calc(100%+5rem)] lg:w-full -mx-6 md:-mx-10 lg:mx-0 px-6 md:px-10 lg:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 sticky top-[69px] lg:relative lg:top-auto z-30 bg-white/95 backdrop-blur-sm pt-2.5 pb-3.5 border-b border-slate-100 lg:bg-slate-50 lg:backdrop-blur-none lg:border-none lg:h-auto lg:py-4">
          {/* Sisi Kiri: Teks Judul & Jumlah Alat (Rata Kiri, Sejajar Tepi Kiri Sidebar - HANYA Desktop) */}
          <div className="hidden lg:flex box-border flex-col gap-0.5 justify-center items-start text-left min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl text-slate-900 font-bold text-left tracking-tight m-0 leading-tight">
              Alat tersedia untuk <span className="tabular-nums">{dateRangeLabel}</span>
            </h1>
            <div className="text-xs sm:text-sm text-slate-600 font-normal text-left tabular-nums flex items-center gap-1.5 flex-wrap lg:flex-nowrap min-w-0 max-w-full">
              <span className="whitespace-nowrap">{loading ? 'Memuat katalog…' : `${sortedProducts.length} alat · `}</span>
              <span className="whitespace-nowrap">{powerMatch ? `semua sesuai daya ${powerLimit} W` : 'semua kapasitas daya'}</span>
              {userLocation && (
                <>
                  <span className="text-slate-300 shrink-0">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-500 min-w-0 truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">
                      Jarak dihitung dari <strong className="text-slate-700 font-medium">{userLocation}</strong>
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Area Kontrol Mobile & Desktop (Filter Mobile, Kategori, & Urutkan) */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-y-3 sm:gap-y-0 gap-x-2.5 shrink-0">
            {/* Kontrol Filter Mobile: "Filter / Buka Filter / Reset" + Overlay Dropdown */}
            <div className="lg:hidden">
              <SidebarFilter
                variant="mobile"
                filters={filters}
                onFiltersChange={setFilters}
                powerMatch={powerMatch}
                onPowerMatchChange={handlePowerMatchChange}
                powerLimit={powerLimit}
                maxPrice={maxPrice}
                minPrice={0}
                maxPriceLimit={DEFAULT_MAX_PRICE}
                priceStep={100000}
                onMaxPriceChange={handleMaxPriceChange}
                deliveryMethods={deliveryMethods}
                onDeliveryMethodChange={handleDeliveryMethodChange}
                onReset={resetFilters}
              />
            </div>

            {/* Kontainer Dropdown Filter Kategori & Urutkan */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Dropdown Kategori */}
              <div ref={categoryRef} className="relative box-border w-fit shrink-0 h-fit">
                <button
                  type="button"
                  onClick={() => setCategoryOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={categoryOpen}
                  className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 py-2 px-3 justify-start items-center bg-white ring-1 ring-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <span
                    title={`Kategori: ${selectedCategory}`}
                    className="text-xs text-slate-900 font-semibold truncate max-w-[110px] sm:max-w-none"
                  >
                    Kategori: {selectedCategory}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      categoryOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {categoryOpen && (
                  <ul
                    role="listbox"
                    aria-label="Filter kategori"
                    className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[220px] max-h-[320px] overflow-y-auto box-border flex flex-col gap-0.5 p-1.5 bg-white ring-1 ring-slate-200 rounded-[10px] shadow-lg shadow-slate-900/10"
                  >
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat

                      return (
                        <li key={cat}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedCategory(cat)
                              setCategoryOpen(false)
                            }}
                            className={`box-border w-full flex flex-row gap-2 py-2 px-2.5 justify-between items-center rounded-lg cursor-pointer border-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 font-bold'
                                : 'bg-white text-slate-600 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <span className="text-xs whitespace-nowrap">{cat}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Dropdown Urutkan */}
              <div ref={sortRef} className="relative box-border w-fit shrink-0 h-fit">
                <button
                  type="button"
                  onClick={() => setSortOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 py-2 px-3 justify-start items-center bg-white ring-1 ring-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <span
                    title={`Urutkan: ${activeSortLabel}`}
                    className="text-xs text-slate-900 font-semibold truncate max-w-[110px] sm:max-w-none"
                  >
                    Urutkan: {activeSortLabel}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      sortOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {sortOpen && (
                  <ul
                    role="listbox"
                    aria-label="Urutkan alat"
                    className="absolute right-0 top-[calc(100%+6px)] z-50 w-[168px] box-border flex flex-col gap-0.5 p-1.5 bg-white ring-1 ring-slate-200 rounded-[10px] shadow-lg shadow-slate-900/10"
                  >
                    {SORT_OPTIONS.map((option) => {
                      const isSelected = sortBy === option.value

                      return (
                        <li key={option.value}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSortBy(option.value)
                              setSortOpen(false)
                            }}
                            className={`box-border w-full flex flex-row gap-2 py-2 px-2.5 justify-between items-center rounded-lg cursor-pointer border-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 font-bold'
                                : 'bg-white text-slate-600 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <span className="text-xs whitespace-nowrap">{option.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wrapper Utama: Penjajaran Sidebar dan Grid Produk */}
        <div className="box-border w-full flex flex-col lg:flex-row gap-6 lg:gap-7 justify-start items-start">
          {/* Sisi Kiri: Filter Sidebar (HANYA terlihat di Desktop agar tidak duplikat di mobile) */}
          <div className="hidden lg:block w-full lg:w-72 xl:w-[320px] lg:flex-shrink-0 shrink-0 lg:sticky lg:top-[88px] lg:z-10 self-start">
            <SidebarFilter
              filters={filters}
              onFiltersChange={setFilters}
              powerMatch={powerMatch}
              onPowerMatchChange={handlePowerMatchChange}
              powerLimit={powerLimit}
              maxPrice={maxPrice}
              minPrice={0}
              maxPriceLimit={DEFAULT_MAX_PRICE}
              priceStep={100000}
              onMaxPriceChange={handleMaxPriceChange}
              deliveryMethods={deliveryMethods}
              onDeliveryMethodChange={handleDeliveryMethodChange}
              onReset={resetFilters}
            />
          </div>

          {/* Sisi Kanan: Catalog Grid Area */}
          <section className="box-border w-full flex-1 min-w-0 h-fit pb-4 flex flex-col gap-6 justify-start items-start">
            {/* Status pemuatan / error */}
            {loading && (
              <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col gap-3 items-center justify-center text-slate-500">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-sm">Memuat katalog alat dari server…</p>
              </div>
            )}

            {!loading && error && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col gap-3 items-center justify-center text-amber-800">
                <TriangleAlert className="w-6 h-6 text-amber-600" />
                <p className="text-sm font-semibold">Katalog alat gagal dimuat</p>
                <p className="text-xs text-center">{error}</p>
                <p className="text-[11px] text-amber-700/80 text-center">
                  Pastikan backend berjalan di http://localhost:3000
                </p>
              </div>
            )}

            {!loading && !error && sortedProducts.length === 0 ? (
              <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <p className="text-sm">Tidak ada alat yang cocok dengan filter yang dipilih.</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 text-xs text-blue-600 font-semibold hover:underline"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              !loading && !error && (
                <div className="box-border w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5 min-[2200px]:grid-cols-6 gap-5">
                  {sortedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      {...product}
                      userLocation={userLocation}
                      onClick={() => onSelectProduct && onSelectProduct(product, filters.dateRange)}
                      onSelectDate={() => onSelectProduct && onSelectProduct(product, filters.dateRange)}
                    />
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
