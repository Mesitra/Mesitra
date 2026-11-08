import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, TriangleAlert, X } from 'lucide-react'
import {
  DEFAULT_DAYS_STATUS,
  MONTH_NAMES,
  diffDays,
  formatShortDate,
  normalizeDate
} from '../../lib/dateHelpers'

export { DEFAULT_DAYS_STATUS }

export default function AvailabilityCalendar({
  monthTitle,
  subTitle,
  year,
  month,
  minRentDays = 1,
  // Tanggal mulai & selesai terpilih (Date | null), dikontrol dari parent.
  selectionStart = null,
  selectionEnd = null,
  onSelectionChange,
  dayStatus: propDayStatus,
  equipment,
  readOnly = false
}) {
  const resolvedSubtitle =
    subTitle !== undefined
      ? subTitle
      : readOnly
      ? 'Jadwal ketersediaan & tanggal yang sudah disewa'
      : 'Pilih tanggal mulai & selesai sewa'
  const now = new Date()
  const initialYear = Number.isInteger(year) ? year : now.getFullYear()
  const initialMonth = Number.isInteger(month) ? month : now.getMonth()

  const dayStatus = propDayStatus || equipment?.dayStatus || equipment?.availability || {}
  const [notice, setNotice] = useState(null)
  const [currentYear, setCurrentYear] = useState(initialYear)
  const [currentMonth, setCurrentMonth] = useState(initialMonth)

  useEffect(() => {
    if (Number.isInteger(year)) setCurrentYear(year)
    if (Number.isInteger(month)) setCurrentMonth(month)
  }, [year, month])

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const minDays = Math.max(1, Number(minRentDays) || 1)

  const toDate = (day) => new Date(currentYear, currentMonth, day)
  const getStatus = (day) => {
    if (!dayStatus) return 'tersedia'
    const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dayStatus[key]) return dayStatus[key]
    return 'tersedia'
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const displayTitle =
    currentYear === year && currentMonth === month && monthTitle
      ? monthTitle
      : `Ketersediaan ${MONTH_NAMES[currentMonth]} ${currentYear}`

  // Validasi bentrok tanggal saat mount / pembaruan props:
  // Jika rentang auto-fill menabrak jadwal 'terisi' atau 'buffer' (misal tgl 16),
  // gagalkan seleksi (reset ke null, null) agar kalender tetap bersih.
  useEffect(() => {
    if (!selectionStart) return

    const start = normalizeDate(selectionStart)
    const end = normalizeDate(selectionEnd) || start

    const fromTime = Math.min(start.getTime(), end.getTime())
    const toTime = Math.max(start.getTime(), end.getTime())
    const current = new Date(fromTime)
    const finish = new Date(toTime)

    let isBlocked = false
    let blockedDay = null
    let blockedStatus = null

    while (current <= finish) {
      const day = current.getDate()
      const isoKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const s = dayStatus?.[isoKey] || 'tersedia'
      if (s === 'terisi' || s === 'buffer') {
        isBlocked = true
        blockedDay = day
        blockedStatus = s
        break
      }
      current.setDate(current.getDate() + 1)
    }

    if (isBlocked) {
      onSelectionChange?.(null, null)
      const statusLabel = blockedStatus === 'terisi' ? 'sudah terisi' : 'buffer perawatan'
      setNotice(
        `Rentang tanggal tidak tersedia karena tanggal ${blockedDay} ${statusLabel}. Silakan pilih tanggal lain di kalender.`
      )
    }
  }, [selectionStart, selectionEnd])

  // Timestamp tanggal terpilih (menormalkan ke tengah malam lokal).
  const startTime = normalizeDate(selectionStart)?.getTime() ?? null
  const endTime = normalizeDate(selectionEnd)?.getTime() ?? null

  const isStart = (day) => startTime !== null && toDate(day).getTime() === startTime
  const isEnd = (day) => endTime !== null && toDate(day).getTime() === endTime
  const isBetween = (day) => {
    if (startTime === null || endTime === null) return false

    const time = toDate(day).getTime()
    return time > startTime && time < endTime
  }

  const isForbiddenDay = (day) => {
    const s = getStatus(day)
    return s === 'terisi' || s === 'buffer'
  }

  const handleDayClick = (day) => {
    // Mode read-only (mis. pada tampilan mobile detail alat) tidak mengizinkan seleksi tanggal
    if (readOnly) return

    // Tanggal terisi atau buffer tidak bisa dipilih
    if (isForbiddenDay(day)) return

    const clicked = toDate(day)

    // ── Kasus 1: Belum ada tanggal terpilih → set tanggal mulai ────────
    if (startTime === null) {
      onSelectionChange?.(clicked, null)
      if (minDays === 1) {
        setNotice(null)
      } else {
        setNotice(`Pilih tanggal selesai (minimal sewa ${minDays} hari).`)
      }
      return
    }

    // ── Kasus 2: Klik ulang tanggal yang sama saat baru 1 tanggal dipilih ──
    // Batalkan pilihan sehingga kembali bersih (null, null)
    if (endTime === null && clicked.getTime() === startTime) {
      onSelectionChange?.(null, null)
      setNotice(null)
      return
    }

    // ── Kasus 3: Rentang sudah lengkap & klik tanggal start atau end → reset
    if (endTime !== null && (isStart(day) || isEnd(day))) {
      onSelectionChange?.(null, null)
      setNotice(null)
      return
    }

    // ── Kasus 4: Rentang sudah lengkap & klik tanggal lain → mulai baru
    if (endTime !== null) {
      onSelectionChange?.(clicked, null)
      if (minDays === 1) {
        setNotice(null)
      } else {
        setNotice(`Pilih tanggal selesai (minimal sewa ${minDays} hari).`)
      }
      return
    }

    // ── Kasus 5: Klik tanggal kedua → tentukan rentang ──────────────────
    let start = normalizeDate(selectionStart)
    let end = clicked

    // Jika yang diklik lebih awal dari start, tukar agar start selalu awal
    if (clicked.getTime() < start.getTime()) {
      start = clicked
      end = normalizeDate(selectionStart)
    }

    // LAKUKAN PENGECEKAN TANGGAL DI ANTARA Start dan End
    let blockedDay = null
    let blockedStatus = null
    const cur = new Date(start.getTime())
    const targetEnd = new Date(end.getTime())
    while (cur <= targetEnd) {
      const d = cur.getDate()
      const isoKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const st = dayStatus?.[isoKey] || 'tersedia'
      if (st === 'terisi' || st === 'buffer') {
        blockedDay = d
        blockedStatus = st
        break
      }
      cur.setDate(cur.getDate() + 1)
    }

    if (blockedDay !== null) {
      // Ada tanggal terisi atau buffer yang ikut terblok:
      // Batalkan pilihan (reset ke Start date saja) dan gagalkan dengan notifikasi
      onSelectionChange?.(selectionStart, null)
      const statusLabel = blockedStatus === 'terisi' ? 'sudah terisi' : 'buffer perawatan'
      setNotice(
        `Rentang tanggal tidak valid: tanggal ${blockedDay} ${statusLabel}. Pilihan dikembalikan ke tanggal mulai.`
      )
      return
    }

    const duration = diffDays(start, end) + 1
    if (duration < minDays) {
      onSelectionChange?.(selectionStart, null)
      setNotice(
        `Minimal sewa untuk alat ini adalah ${minDays} hari (Anda memilih ${duration} hari).`
      )
      return
    }

    onSelectionChange?.(start, end)
    setNotice(null)
  }

  // Jika minRentDays === 1 dan user hanya memilih 1 tanggal, anggap valid sebagai sewa 1 hari.
  const isSingleDayValid = minDays === 1 && selectionStart && !selectionEnd
  const rentalDays =
    selectionStart && selectionEnd
      ? diffDays(selectionStart, selectionEnd) + 1
      : isSingleDayValid
      ? 1
      : 0

  return (
    <div className="box-border w-full h-fit shrink-0 flex flex-col gap-3.5 p-5 justify-start items-start bg-white ring-1 ring-slate-200 rounded-[14px]">
      {/* Calendar Header */}
      <div className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center">
        <div className="box-border w-fit shrink-0 h-fit flex flex-col gap-0.5 justify-start items-start">
          <div className="text-[15px] text-slate-900 font-bold text-left whitespace-nowrap">
            {displayTitle}
          </div>
          <div className="text-xs text-slate-500 font-normal text-left whitespace-nowrap">
            {resolvedSubtitle}
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-1.5 justify-start items-start">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            title="Bulan sebelumnya"
            className="box-border w-7.5 shrink-0 h-7.5 flex flex-row justify-center items-center ring-1 ring-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer border-0"
          >
            <ChevronLeft className="w-3.75 h-3.75 text-slate-600" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            title="Bulan berikutnya"
            className="box-border w-7.5 shrink-0 h-7.5 flex flex-row justify-center items-center ring-1 ring-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer border-0"
          >
            <ChevronRight className="w-3.75 h-3.75 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Days of Week (DOW) */}
      <div className="w-full grid grid-cols-7 gap-1.5">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dow) => (
          <div
            key={dow}
            className="text-[11px] text-slate-500 font-semibold text-center py-1 uppercase tracking-wider"
          >
            {dow}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="w-full grid grid-cols-7 gap-1.5">
        {daysArray.map((day) => {
          const status = getStatus(day)
          const isForbidden = status === 'terisi' || status === 'buffer'
          const selectedStart = !readOnly && isStart(day)
          const selectedEnd = !readOnly && isEnd(day)
          const inRange = !readOnly && isBetween(day)

          let styleClasses = ''
          if (selectedStart || selectedEnd) {
            // Tanggal mulai & selesai → warna primary penuh
            styleClasses = 'bg-blue-600 text-white font-bold shadow-xs cursor-pointer scale-[1.02]'
          } else if (inRange) {
            // Tanggal di tengah rentang → warna primary transparan
            styleClasses = 'bg-blue-100 text-blue-800 font-semibold cursor-pointer hover:bg-blue-200'
          } else if (status === 'terisi') {
            // Terisi: dilarang, merah pudar kontras
            styleClasses = 'bg-red-50 text-red-500 ring-1 ring-red-200/70 pointer-events-none opacity-60 cursor-not-allowed'
          } else if (status === 'buffer') {
            // Buffer: dilarang, abu-abu kontras
            styleClasses = 'bg-slate-100 text-slate-500 ring-1 ring-slate-300 pointer-events-none opacity-60 cursor-not-allowed'
          } else {
            // Tersedia
            styleClasses = readOnly
              ? 'bg-white ring-1 ring-slate-200 text-slate-900 font-medium cursor-default'
              : 'bg-white ring-1 ring-slate-200 text-slate-900 hover:bg-blue-50/50 hover:ring-blue-600 font-medium cursor-pointer'
          }

          return (
            <button
              key={day}
              type="button"
              disabled={isForbidden || readOnly}
              onClick={() => handleDayClick(day)}
              aria-label={`${day} ${status}`}
              aria-pressed={selectedStart || selectedEnd || inRange}
              className={`box-border h-10 flex flex-row justify-center items-center rounded-lg transition-all border-0 text-[13px] font-semibold tabular-nums ${styleClasses}`}
            >
              <span>{day}</span>
            </button>
          )
        })}
      </div>

      {/* Ringkasan seleksi + info minimal sewa */}
      <div className="box-border w-full h-fit shrink-0 flex flex-col gap-1.5 justify-start items-start">
        {readOnly ? (
          <div className="text-[11px] text-slate-500 font-medium text-left">
            Jadwal ketersediaan alat di atas dapat dilihat secara real-time. Pemilihan tanggal sewa dilakukan pada halaman checkout.
          </div>
        ) : (
          <div className="text-[11px] text-slate-600 font-medium tabular-nums text-left whitespace-nowrap">
            {selectionStart ? (
              <>
                Mulai {formatShortDate(selectionStart)}
                {selectionEnd
                  ? ` · Selesai ${formatShortDate(selectionEnd)} · ${rentalDays} hari sewa`
                  : isSingleDayValid
                  ? ` · Selesai ${formatShortDate(selectionStart)} · 1 hari sewa`
                  : ` · pilih tanggal selesai (minimal ${minDays} hari sewa)`}
              </>
            ) : (
              'Belum ada tanggal dipilih'
            )}
          </div>
        )}

        {!readOnly && notice && (
          <div
            role="alert"
            className="box-border w-full flex flex-row gap-3 p-3.5 sm:p-4 justify-between items-start bg-amber-50/95 border border-amber-300 border-l-4 border-l-amber-500 rounded-xl shadow-xs transition-all animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="flex flex-row gap-3 items-start flex-1 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <TriangleAlert className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="flex flex-col gap-0.5 justify-start items-start flex-1 min-w-0 text-left">
                <span className="text-xs sm:text-[13px] font-bold text-amber-950">
                  Perhatian Pilihan Tanggal
                </span>
                <p className="text-xs sm:text-[13px] leading-relaxed text-amber-900 font-medium m-0">
                  {notice}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-1 rounded-lg text-amber-600 hover:text-amber-900 hover:bg-amber-100/80 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
              title="Tutup pemberitahuan"
              aria-label="Tutup pemberitahuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Calendar Legend */}
      <div className="box-border w-full h-fit shrink-0 flex flex-wrap gap-4 pt-3 justify-start items-center border-t border-slate-200">
        {/* Tersedia */}
        <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-1.5 justify-start items-center">
          <div className="box-border w-3 shrink-0 h-3 bg-white ring-1 ring-slate-200 rounded"></div>
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            Tersedia
          </span>
        </div>

        {/* Terisi */}
        <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-1.5 justify-start items-center">
          <div className="box-border w-3 shrink-0 h-3 bg-red-100 ring-1 ring-red-200 rounded"></div>
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            Terisi (tidak dapat dipilih)
          </span>
        </div>

        {/* Buffer Perawatan */}
        <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-1.5 justify-start items-center">
          <div className="box-border w-3 shrink-0 h-3 bg-slate-200 ring-1 ring-slate-300 rounded"></div>
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            Buffer perawatan
          </span>
        </div>

        {/* Dipilih & Dalam rentang hanya bila tidak read-only */}
        {!readOnly && (
          <>
            <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-1.5 justify-start items-center">
              <div className="box-border w-3 shrink-0 h-3 bg-blue-600 rounded"></div>
              <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                Dipilih
              </span>
            </div>

            <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-1.5 justify-start items-center">
              <div className="box-border w-3 shrink-0 h-3 bg-blue-100 rounded"></div>
              <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                Dalam rentang
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
