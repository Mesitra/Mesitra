import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, Star, X } from 'lucide-react'
import {
  daysInMonth,
  diffDays,
  formatShortDate,
  normalizeDate,
  MONTH_NAMES
} from '../../lib/dateHelpers'

// Opsi batas security deposit. Nilai `null` berarti tanpa batas.
const DEPOSIT_OPTIONS = [
  { label: '< 300rb', value: 300000 },
  { label: '< 1jt', value: 1000000 },
  { label: 'Semua', value: 'semua' }
]

// Opsi pengurutan rating ulasan pelanggan
const RATING_SORT_OPTIONS = [
  { label: 'Relevansi', value: '', description: 'Default' },
  { label: 'Rating Tertinggi', value: 'desc', badge: '5.0' },
  { label: 'Rating Terendah', value: 'asc', badge: '1.0' }
]

const DEFAULT_FILTERS = {
  dateRange: { start: null, end: null },
  maxDeposit: 'semua',
  sortRating: ''
}

export default function SidebarFilter({
  // Filter bersama dengan parent (BerandaSewa). `onFiltersChange` harus berupa
  // setter React (`setFilters`) supaya bisa menerima updater function.
  filters = DEFAULT_FILTERS,
  onFiltersChange,
  sortRating: externalSortRating,
  onSortRatingChange,
  powerMatch = true,
  onPowerMatchChange,
  powerLimit = 1300,
  maxPrice = 10000000,
  minPrice = 0,
  maxPriceLimit = 10000000,
  priceStep = 100000,
  onMaxPriceChange,
  deliveryMethods = { selfPickup: false, courier: false },
  onDeliveryMethodChange,
  onReset,
  className = '',
  variant = 'desktop'
}) {
  const [internalDelivery, setInternalDelivery] = useState(deliveryMethods)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  // Popover kalender mini: 'start' (Tanggal Sewa) | 'end' (Tanggal Akhir Sewa) | null
  const [activePicker, setActivePicker] = useState(null)
  const sidebarRef = useRef(null)
  const calendarRef = useRef(null)

  // Tutup dropdown mobile saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!isMobileOpen) return undefined

    const handlePointerDown = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsMobileOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activePicker) return
        setIsMobileOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileOpen, activePicker])

  // Sinkronkan state internal jika props deliveryMethods dari parent berubah (mis. saat reset)
  useEffect(() => {
    if (deliveryMethods) {
      setInternalDelivery({
        selfPickup: Boolean(deliveryMethods.selfPickup),
        courier: Boolean(deliveryMethods.courier)
      })
    }
  }, [deliveryMethods])

  const dateRange = filters.dateRange ?? { start: null, end: null }
  const maxDeposit = filters.maxDeposit ?? 'semua'

  // Nilai aktif sortRating (mendukung external prop atau state filters)
  const currentSortRating =
    externalSortRating !== undefined
      ? externalSortRating
      : filters.sortRating ?? ''

  const handleRatingSortChange = (value) => {
    if (onSortRatingChange) {
      onSortRatingChange(value)
    }
    if (onFiltersChange) {
      onFiltersChange((prev) => ({
        ...prev,
        sortRating: value
      }))
    }
  }

  // Inisialisasi tampilan bulan & tahun kalender
  const getInitialView = () => {
    const d = normalizeDate(dateRange.start) || normalizeDate(dateRange.end) || new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  }
  const [viewDate, setViewDate] = useState(getInitialView)

  // Tutup dropdown saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!activePicker) return undefined

    const handlePointerDown = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setActivePicker(null)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActivePicker(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePicker])

  const handlePrevMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  const handleNextMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  const handleRangeChange = (start, end) => {
    if (!onFiltersChange) return
    onFiltersChange((prev) => ({
      ...prev,
      dateRange: { start: start || null, end: end || null }
    }))
  }

  const handleSelectDay = (day) => {
    const m = String(viewDate.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    const clickedStr = `${viewDate.year}-${m}-${d}`

    if (activePicker === 'start') {
      // Jika sudah ada end dan tanggal mulai baru melebihi end, kosongkan end
      if (dateRange.end && clickedStr > dateRange.end) {
        handleRangeChange(clickedStr, null)
      } else {
        handleRangeChange(clickedStr, dateRange.end)
      }

      // Jika belum ada tanggal akhir, otomatis lanjutkan memilih tanggal akhir sewa
      if (!dateRange.end) {
        setActivePicker('end')
      } else {
        setActivePicker(null)
      }
      return
    }

    if (activePicker === 'end') {
      // Jika ada tanggal mulai dan tanggal akhir yang dipilih sebelum tanggal mulai, tukar
      if (dateRange.start && clickedStr < dateRange.start) {
        handleRangeChange(clickedStr, dateRange.start)
      } else {
        handleRangeChange(dateRange.start, clickedStr)
      }
      setActivePicker(null)
      return
    }

    // Fallback jika dibuka tanpa target spesifik
    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      handleRangeChange(clickedStr, null)
      setActivePicker('end')
      return
    }

    if (clickedStr < dateRange.start) {
      handleRangeChange(clickedStr, dateRange.start)
    } else {
      handleRangeChange(dateRange.start, clickedStr)
    }
    setActivePicker(null)
  }

  const totalDays = daysInMonth(viewDate.year, viewDate.month)
  const firstDayOfWeek = new Date(viewDate.year, viewDate.month, 1).getDay()
  // Offset hari Senin = 0, Selasa = 1, ..., Minggu = 6
  const startOffset = (firstDayOfWeek + 6) % 7
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1)

  const handleTogglePower = () => {
    if (onPowerMatchChange) onPowerMatchChange(!powerMatch)
  }

  const handlePriceChange = (e) => {
    const val = Number(e.target.value)
    if (onMaxPriceChange) onMaxPriceChange(val)
  }

  const handleDepositSelect = (value) => {
    if (!onFiltersChange) return

    onFiltersChange((prev) => ({ ...prev, maxDeposit: value }))
  }

  const handleDeliveryToggle = (key) => {
    const next = { ...internalDelivery, [key]: !internalDelivery[key] }
    setInternalDelivery(next)
    if (onDeliveryMethodChange) onDeliveryMethodChange(next)
  }

  const handleReset = () => {
    const defaultDelivery = { selfPickup: false, courier: false }
    setInternalDelivery(defaultDelivery)
    if (onDeliveryMethodChange) onDeliveryMethodChange(defaultDelivery)
    setActivePicker(null)

    if (onFiltersChange) {
      onFiltersChange((prev) => ({
        ...prev,
        dateRange: { start: null, end: null },
        maxDeposit: 'semua'
      }))
    }

    if (onReset) onReset()
  }

  const formatRupiah = (val) => {
    return `Rp ${val.toLocaleString('id-ID')}`
  }

  const rangeDays =
    dateRange.start && dateRange.end ? diffDays(dateRange.start, dateRange.end) + 1 : 0

  const renderFilterSections = () => (
    <>
      {/* Rentang Tanggal Popover Kalender Mini */}
      <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2.5 justify-start items-start">
        <div className="text-xs text-slate-600 font-semibold text-left whitespace-nowrap">
          Rentang Tanggal
        </div>

        {/* Trigger Popover Buttons & Modal */}
        <div className="relative w-full flex flex-col gap-2" ref={calendarRef}>
          {/* 1. Tanggal Sewa (Mulai) */}
          <button
            type="button"
            onClick={() => {
              if (activePicker === 'start') {
                setActivePicker(null)
              } else {
                setActivePicker('start')
                if (dateRange.start) {
                  const d = normalizeDate(dateRange.start)
                  if (d) setViewDate({ year: d.getFullYear(), month: d.getMonth() })
                }
              }
            }}
            aria-expanded={activePicker === 'start'}
            className={`box-border w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 ring-1 rounded-xl transition-all cursor-pointer text-left ${
              activePicker === 'start'
                ? 'ring-2 ring-primary bg-white shadow-xs'
                : 'ring-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tanggal Sewa
                </span>
                <span className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {dateRange.start ? formatShortDate(dateRange.start) : 'Pilih tanggal sewa'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {dateRange.start && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRangeChange(null, dateRange.end)
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                  title="Hapus tanggal sewa"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  activePicker === 'start' ? 'rotate-180 text-primary' : ''
                }`}
              />
            </div>
          </button>

          {/* 2. Tanggal Akhir Sewa */}
          <button
            type="button"
            onClick={() => {
              if (activePicker === 'end') {
                setActivePicker(null)
              } else {
                setActivePicker('end')
                const target = dateRange.end || dateRange.start
                if (target) {
                  const d = normalizeDate(target)
                  if (d) setViewDate({ year: d.getFullYear(), month: d.getMonth() })
                }
              }
            }}
            aria-expanded={activePicker === 'end'}
            className={`box-border w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 ring-1 rounded-xl transition-all cursor-pointer text-left ${
              activePicker === 'end'
                ? 'ring-2 ring-primary bg-white shadow-xs'
                : 'ring-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tanggal Akhir Sewa
                </span>
                <span className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {dateRange.end ? formatShortDate(dateRange.end) : 'Pilih tanggal akhir sewa'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {dateRange.end && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRangeChange(dateRange.start, null)
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                  title="Hapus tanggal akhir sewa"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  activePicker === 'end' ? 'rotate-180 text-primary' : ''
                }`}
              />
            </div>
          </button>

          {/* Absolute Div (Dropdown Modal Kalender Mini) */}
          {activePicker && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[270px] -left-1 sm:left-0 bg-white rounded-2xl shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 p-3.5 flex flex-col gap-2.5">
              {/* Header Switcher Tabs: Tanggal Sewa vs Tanggal Akhir Sewa */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActivePicker('start')}
                  className={`py-1 px-2 rounded-md transition-all text-left border-0 cursor-pointer ${
                    activePicker === 'start'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent font-medium'
                  }`}
                >
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Tgl Sewa</div>
                  <div className="text-xs truncate">
                    {dateRange.start ? formatShortDate(dateRange.start) : 'Pilih...'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePicker('end')}
                  className={`py-1 px-2 rounded-md transition-all text-left border-0 cursor-pointer ${
                    activePicker === 'end'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent font-medium'
                  }`}
                >
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Tgl Akhir</div>
                  <div className="text-xs truncate">
                    {dateRange.end ? formatShortDate(dateRange.end) : 'Pilih...'}
                  </div>
                </button>
              </div>

              {/* Header Kalender Mini */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">
                  {MONTH_NAMES[viewDate.month]} {viewDate.year}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border-0 transition-colors"
                    title="Bulan sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border-0 transition-colors"
                    title="Bulan berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Header Hari (Sen - Min) */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
                  <span key={d} className="text-[10px] font-semibold text-slate-400 py-0.5">
                    {d}
                  </span>
                ))}
              </div>

              {/* Grid 7 Kolom */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Leading blanks */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`blank-${i}`} className="h-7 w-7" />
                ))}

                {/* Day cells */}
                {daysArray.map((day) => {
                  const mStr = String(viewDate.month + 1).padStart(2, '0')
                  const dStr = String(day).padStart(2, '0')
                  const isoStr = `${viewDate.year}-${mStr}-${dStr}`

                  const isStart = dateRange.start === isoStr
                  const isEnd = dateRange.end === isoStr
                  const inRange =
                    dateRange.start &&
                    dateRange.end &&
                    isoStr > dateRange.start &&
                    isoStr < dateRange.end

                  let cellClasses = 'text-slate-700 hover:bg-slate-100 font-medium'
                  if (isStart || isEnd) {
                    cellClasses = 'bg-primary text-primary-foreground font-bold shadow-xs scale-105'
                  } else if (inRange) {
                    cellClasses = 'bg-blue-50 text-blue-700 font-semibold'
                  }

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-7 w-7 mx-auto flex items-center justify-center text-xs rounded-lg transition-all cursor-pointer border-0 ${cellClasses}`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Footer Ringkasan & Aksi Popover */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleRangeChange(null, null)}
                  className="text-slate-400 hover:text-slate-700 font-medium cursor-pointer border-0 bg-transparent p-0"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setActivePicker(null)}
                  className="text-primary hover:text-primary/80 font-bold cursor-pointer border-0 bg-transparent p-0"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ringkasan Durasi Sewa */}
        <div className="text-[11px] text-slate-500 font-normal tabular-nums text-left whitespace-nowrap">
          {rangeDays > 0
            ? `${rangeDays} hari sewa · 1 hari buffer`
            : dateRange.start && !dateRange.end
            ? 'Pilih tanggal akhir sewa'
            : !dateRange.start && dateRange.end
            ? 'Pilih tanggal sewa'
            : 'Pilih tanggal sewa & akhir sewa'}
        </div>
      </div>

      <div className="box-border w-full h-px shrink-0 bg-slate-200"></div>

      {/* Sesuai Listrik Usaha Saya */}
      <div className="box-border w-full h-fit shrink-0 flex flex-row gap-2.5 justify-start items-center">
        <div className="box-border flex-1 h-fit flex flex-col gap-1 justify-start items-start">
          <div className="text-xs text-slate-900 font-bold text-left whitespace-nowrap">
            Sesuai listrik usaha saya
          </div>
          <div className="text-[11px] leading-[15px] w-full text-slate-500 font-normal text-left tabular-nums">
            {`Maks. ${powerLimit || 1300} W · hanya alat yang aman`}
          </div>
        </div>
        <button
          type="button"
          onClick={handleTogglePower}
          aria-label="Saring alat sesuai daya listrik usaha"
          aria-pressed={powerMatch}
          className={`box-border w-9 shrink-0 h-5 flex flex-row p-0.5 items-center rounded-full transition-colors cursor-pointer border-0 ${
            powerMatch ? 'justify-end bg-blue-600' : 'justify-start bg-slate-300'
          }`}
        >
          <div className="box-border w-4 shrink-0 h-4 bg-white rounded-full shadow-xs"></div>
        </button>
      </div>

      <div className="box-border w-full h-px shrink-0 bg-slate-200"></div>

      {/* Harga Harian Maksimal */}
      <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start">
        <div className="flex items-baseline justify-between w-full">
          <div className="text-xs text-slate-600 font-semibold text-left whitespace-nowrap">
            Harga harian maksimal
          </div>
          <div className="text-sm text-blue-600 font-bold tabular-nums tracking-tight text-right whitespace-nowrap">
            {formatRupiah(maxPrice)}
          </div>
        </div>

        {/* Slider */}
        <div className="w-full py-1">
          <input
            type="range"
            min={minPrice}
            max={maxPriceLimit}
            step={priceStep}
            value={maxPrice}
            onChange={handlePriceChange}
            className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
          />
        </div>

        <div className="text-[11px] text-slate-500 font-normal tabular-nums text-left whitespace-nowrap">
          {`${formatRupiah(minPrice)} — ${formatRupiah(maxPriceLimit)}`}
        </div>
      </div>

      <div className="box-border w-full h-px shrink-0 bg-slate-200"></div>

      {/* Batas Security Deposit */}
      <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start">
        <div className="text-xs text-slate-600 font-semibold text-left whitespace-nowrap">
          Batas security deposit
        </div>
        <div className="box-border w-full h-fit shrink-0 flex flex-row gap-2 justify-start items-start">
          {DEPOSIT_OPTIONS.map((opt) => {
            const isSelected = maxDeposit === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleDepositSelect(opt.value)}
                className={`box-border flex-1 h-fit flex flex-row py-1.5 px-0 justify-center items-start rounded-lg cursor-pointer transition-all border-0 ${
                  isSelected
                    ? 'bg-blue-50 ring-1 ring-blue-600 text-blue-700 font-bold'
                    : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                <span className="text-[11px] whitespace-nowrap">{opt.label}</span>
              </button>
            )
          })}
        </div>
        <div className="text-[11px] text-slate-500 font-normal tabular-nums text-left whitespace-nowrap">
          {maxDeposit === 'semua'
            ? 'Tanpa batas deposit'
            : `Deposit maksimal ${formatRupiah(maxDeposit)}`}
        </div>
      </div>

      <div className="box-border w-full h-px shrink-0 bg-slate-200"></div>

      {/* Metode Pengiriman */}
      <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2.5 justify-start items-start">
        <div className="text-xs text-slate-600 font-semibold text-left whitespace-nowrap">
          Metode pengiriman
        </div>

        {/* Option 1: Ambil sendiri di gudang */}
        <label
          role="checkbox"
          aria-checked={Boolean(internalDelivery.selfPickup)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              handleDeliveryToggle('selfPickup')
            }
          }}
          onClick={() => handleDeliveryToggle('selfPickup')}
          className="box-border w-fit h-fit shrink-0 flex flex-row gap-2.5 justify-start items-center cursor-pointer select-none"
        >
          <div
            className={`box-border w-4 shrink-0 h-4 flex flex-row justify-center items-center rounded transition-colors ${
              internalDelivery.selfPickup
                ? 'bg-blue-600'
                : 'bg-white ring-1 ring-slate-300'
            }`}
          >
            {internalDelivery.selfPickup && (
              <Check className="w-[11px] h-[11px] text-white stroke-[3]" />
            )}
          </div>
          <span className="text-xs text-slate-600 font-normal text-left whitespace-nowrap">
            Ambil sendiri di gudang
          </span>
        </label>

        {/* Option 2: Diantar kurir toko */}
        <label
          role="checkbox"
          aria-checked={Boolean(internalDelivery.courier)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              handleDeliveryToggle('courier')
            }
          }}
          onClick={() => handleDeliveryToggle('courier')}
          className="box-border w-fit h-fit shrink-0 flex flex-row gap-2.5 justify-start items-center cursor-pointer select-none"
        >
          <div
            className={`box-border w-4 shrink-0 h-4 flex flex-row justify-center items-center rounded transition-colors ${
              internalDelivery.courier
                ? 'bg-blue-600'
                : 'bg-white ring-1 ring-slate-300'
            }`}
          >
            {internalDelivery.courier && (
              <Check className="w-[11px] h-[11px] text-white stroke-[3]" />
            )}
          </div>
          <span className="text-xs text-slate-600 font-normal text-left whitespace-nowrap">
            Diantar kurir toko
          </span>
        </label>
      </div>

      <div className="box-border w-full h-px shrink-0 bg-slate-200"></div>

      {/* Rating & Ulasan */}
      <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2.5 justify-start items-start">
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-600 font-semibold text-left whitespace-nowrap">
            Rating & Ulasan
          </div>
          {currentSortRating && (
            <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {currentSortRating === 'desc' ? 'Tertinggi' : 'Terendah'}
            </span>
          )}
        </div>

        {/* 3 Opsi: Radio Cards Modern / Selectable Pills */}
        <div className="box-border w-full flex flex-col gap-2 justify-start items-start">
          {RATING_SORT_OPTIONS.map((opt) => {
            const isSelected = (currentSortRating || '') === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleRatingSortChange(opt.value)}
                className={`box-border w-full flex flex-row items-center justify-between py-2 px-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-500 ring-1 ring-blue-500/30 text-blue-900 font-medium shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-normal'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white shadow-2xs" />
                    )}
                  </div>
                  <span className={`text-xs text-left truncate ${isSelected ? 'font-semibold text-blue-900' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                </div>

                {opt.badge && (
                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <Star
                      className={`w-3.5 h-3.5 ${
                        opt.value === 'desc'
                          ? 'text-amber-500 fill-amber-400'
                          : 'text-amber-400 fill-amber-300'
                      }`}
                    />
                    <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                      {opt.badge}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

    </>
  )

  if (variant === 'mobile') {
    return (
      <div ref={sidebarRef} className={`static ${className}`}>
        {/* Head Kontrol Mobile: Filter / Buka Filter / Reset */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-slate-900">Filter</span>
          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-filter-panel"
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border-0 select-none ${
              isMobileOpen
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <span>{isMobileOpen ? 'Tutup Filter' : 'Buka Filter'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isMobileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline bg-transparent border-0 p-0 ml-1"
          >
            Reset
          </button>
        </div>

        {/* Konten Filter — Mobile Overlay Dropdown */}
        <div
          id="mobile-filter-panel"
          className={`w-auto flex-col gap-4 transition-all duration-300 ease-in-out origin-top ${
            isMobileOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto visible'
              : 'opacity-0 -translate-y-2 pointer-events-none invisible'
          } absolute top-[calc(100%+8px)] left-4 right-4 sm:left-6 sm:right-6 md:left-10 md:right-10 z-50 bg-white ring-1 ring-slate-200 rounded-[14px] shadow-xl p-4 max-h-[70vh] overflow-y-auto overflow-x-hidden overscroll-contain flex`}
        >
          {renderFilterSections()}

          {/* Footer aksi mobile untuk menutup filter */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
            >
              Reset Filter
            </button>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer text-center shadow-xs border-0"
            >
              Tutup & Terapkan
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside
      ref={sidebarRef}
      className={`relative box-border w-full shrink-0 h-fit lg:sticky lg:top-[140px] lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:overflow-x-hidden scrollbar-thin flex flex-col gap-4 p-4 justify-start items-start bg-white ring-1 ring-slate-200 rounded-[14px] ${className}`}
    >
      {/* Desktop Head: Filter & Reset */}
      <div className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center">
        <h2 className="text-sm text-slate-900 font-bold text-left whitespace-nowrap m-0">
          Filter
        </h2>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-blue-600 font-semibold text-left whitespace-nowrap bg-transparent border-0 cursor-pointer hover:underline p-0"
        >
          Reset
        </button>
      </div>

      <div className="box-border w-full h-px shrink-0 bg-slate-200"></div>

      {/* Konten Filter Statis Sidebar Desktop */}
      <div className="w-full flex flex-col gap-4">
        {renderFilterSections()}
      </div>
    </aside>
  )
}
