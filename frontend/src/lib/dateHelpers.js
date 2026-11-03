/**
 * Helper tanggal ringkas untuk kalender sewa & panel checkout.
 *
 * Semua tanggal dinormalisasi ke tengah malam waktu lokal supaya:
 *  - perbandingan hari selalu akurat (tidak terkena efek jam 3 pagi / DST),
 *  - selisih hari dihitung dengan benar,
 *  - string ISO `YYYY-MM-DD` dari `<input type="date">` tidak bergeser
 *    satu hari ke belakang (string ISO di-parse sebagai UTC oleh browser).
 */

export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des'
]

export const DAY_SHORT_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/**
 * Ubah nilai apa pun menjadi Date pada tengah malam waktu lokal.
 *
 * @param {Date|string|number|null} value
 * @returns {Date|null}
 */
export function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null

  // String tanggal saja (YYYY-MM-DD) → parse manual, bukan `new Date(string)`.
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    }
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Tambah (atau kurangi) sejumlah hari.
 *
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const next = normalizeDate(date)
  next.setDate(next.getDate() + days)
  return next
}

/**
 * Selisih hari antara dua tanggal (tanggal awal = 0).
 *
 * @param {Date|string} start
 * @param {Date|string} end
 * @returns {number}
 */
export function diffDays(start, end) {
  const from = normalizeDate(start)
  const to = normalizeDate(end)
  if (!from || !to) return 0

  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

/**
 * Format tanggal pendek: `12 Jun`.
 *
 * @param {Date|string|null} value
 * @returns {string}
 */
export function formatShortDate(value) {
  const date = normalizeDate(value)
  if (!date) return '-'

  return `${date.getDate()} ${MONTH_SHORT_NAMES[date.getMonth()]}`
}

/**
 * Format tanggal panjang: `Kam, 12 Jun 2025`.
 *
 * @param {Date|string|null} value
 * @returns {string}
 */
export function formatLongDate(value) {
  const date = normalizeDate(value)
  if (!date) return '-'

  const day = DAY_SHORT_NAMES[date.getDay()]
  const month = MONTH_SHORT_NAMES[date.getMonth()]

  return `${day}, ${date.getDate()} ${month} ${date.getFullYear()}`
}

/**
 * Format bulan & tahun: `Juni 2025`.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatMonthYear(date) {
  if (!date) return '-'

  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Jumlah hari dalam satu bulan.
 *
 * @param {number} year
 * @param {number} month (0-indexed, 0 = Januari)
 * @returns {number}
 */
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Status ketersediaan default (kosong: bebas disewa kecuali ada pesanan aktif).
 */
export const DEFAULT_DAYS_STATUS = {}

/**
 * Dapatkan status ketersediaan alat pada suatu tanggal.
 *
 * @param {object} [equipment]
 * @param {Date|string|number} date
 * @returns {'tersedia'|'terisi'|'buffer'}
 */
export function getEquipmentDayStatus(equipment, date) {
  const d = normalizeDate(date)
  if (!d) return 'tersedia'

  const schedule = equipment?.dayStatus || equipment?.availability || DEFAULT_DAYS_STATUS

  // Cek kunci string ISO 'YYYY-MM-DD' dari jadwal pesanan aktual
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const dayNum = d.getDate()
  const dayStr = String(dayNum).padStart(2, '0')
  const isoKey = `${year}-${month}-${dayStr}`

  if (schedule[isoKey] !== undefined) {
    return schedule[isoKey]
  }

  return 'tersedia'
}

/**
 * Validasi ketat ketersediaan alat untuk setiap hari di dalam rentang tanggal.
 * Mengembalikan false jika SALAH SATU HARI saja berstatus 'terisi' atau 'buffer'.
 *
 * @param {object} [equipment]
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {boolean} true jika seluruh hari tersedia, false jika ada yang terisi/buffer
 */
export function isEquipmentAvailableInRange(equipment, startDate, endDate) {
  const start = normalizeDate(startDate)
  const end = normalizeDate(endDate) || start

  if (!start) return true

  const fromTime = Math.min(start.getTime(), end.getTime())
  const toTime = Math.max(start.getTime(), end.getTime())

  const current = new Date(fromTime)
  const finish = new Date(toTime)

  while (current <= finish) {
    const status = getEquipmentDayStatus(equipment, current)
    if (status === 'terisi' || status === 'buffer') {
      return false
    }
    current.setDate(current.getDate() + 1)
  }

  return true
}

/**
 * Format angka mata uang rupiah (contoh: 450.000).
 *
 * @param {number|string} value
 * @returns {string}
 */
export function formatRupiah(value) {
  const num = Number(value) || 0
  return num.toLocaleString('id-ID')
}
