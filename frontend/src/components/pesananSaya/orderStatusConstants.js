/**
 * Konstanta dan helper pengelompokan status pesanan untuk modul Pesanan Saya.
 */

export const ORDER_STATUS = {
  MENUNGGU_PEMBAYARAN: 'MENUNGGU_PEMBAYARAN',
  MENUNGGU_KONFIRMASI: 'MENUNGGU_KONFIRMASI',
  DIKIRIM: 'DIKIRIM',
  SEWA_AKTIF: 'SEWA_AKTIF',
  INSPEKSI: 'INSPEKSI',
  SELESAI: 'SELESAI',
  DISPUTE: 'DISPUTE',
  CLAIM: 'CLAIM',
  KLAIM: 'KLAIM',
  DITOLAK: 'DITOLAK',
  DIBATALKAN: 'DIBATALKAN'
}

// Daftar status yang tergolong dalam sengketa atau klaim kerusakan
export const DISPUTE_STATUSES = [
  'DISPUTE',
  'CLAIM',
  'KLAIM',
  'DISPUTE / KLAIM',
  'DISPUTE (KLAIM)',
  'SENGKETA',
  'KLAIM SENGKETA'
]

// Daftar status penolakan atau pembatalan
export const REJECTED_OR_CANCELLED_STATUSES = [
  'DITOLAK',
  'DIBATALKAN',
  'BATAL',
  'REJECTED',
  'CANCELLED'
]

// Status yang masuk ke dalam kategori / filter tab "Ditolak"
// Mencakup status penolakan, pembatalan, dan dispute/klaim
export const TAB_DITOLAK_STATUSES = [
  ...REJECTED_OR_CANCELLED_STATUSES,
  ...DISPUTE_STATUSES
]

/**
 * Cek apakah status merupakan sengketa / klaim (Dispute / Klaim)
 */
export const isDisputeStatus = (status) => {
  const s = String(status || '').trim().toUpperCase()
  return (
    DISPUTE_STATUSES.includes(s) ||
    s.includes('DISPUTE') ||
    s.includes('KLAIM') ||
    s.includes('CLAIM')
  )
}

/**
 * Cek apakah status merupakan ditolak atau dibatalkan
 */
export const isRejectedOrCancelledStatus = (status) => {
  const s = String(status || '').trim().toUpperCase()
  return (
    REJECTED_OR_CANCELLED_STATUSES.includes(s) ||
    s.includes('TOLAK') ||
    s.includes('BATAL')
  )
}

/**
 * Cek apakah status masuk ke dalam tab filter 'Ditolak'
 * (mencakup penolakan, pembatalan, serta dispute / klaim)
 */
export const isDitolakTabStatus = (status) => {
  return isRejectedOrCancelledStatus(status) || isDisputeStatus(status)
}

/**
 * Helper pencocokan status pesanan dengan activeTab pada modul Pesanan Saya
 */
export const matchOrderWithTab = (status, activeTab) => {
  const s = String(status || '').trim().toUpperCase()
  if (!activeTab || activeTab === 'Semua') return true

  switch (activeTab) {
    case 'Menunggu':
      return s === 'MENUNGGU_KONFIRMASI' || s === 'MENUNGGU_PEMBAYARAN'
    case 'Sedang Disewa':
      return s === 'DIKIRIM' || s === 'SEWA_AKTIF' || s === 'INSPEKSI'
    case 'Selesai':
      return s === 'SELESAI'
    case 'Ditolak':
      return isDitolakTabStatus(s)
    default:
      return true
  }
}

/**
 * Helper visual badge dan metadata deskripsi untuk tiap status pesanan
 */
export const getOrderStatusBadge = (status) => {
  const s = String(status || '').trim().toUpperCase()
  if (isDisputeStatus(s)) {
    return {
      label: 'Dispute / Klaim',
      color: 'bg-rose-50 text-rose-700 ring-rose-300',
      description: 'Pemilik mengajukan klaim kerusakan atau sengketa mediasi.'
    }
  }
  if (isRejectedOrCancelledStatus(s)) {
    const isCancelled = s.includes('BATAL') || s.includes('CANCEL')
    return {
      label: isCancelled ? 'Dibatalkan' : 'Ditolak',
      color: 'bg-red-50 text-red-700 ring-red-200',
      description: isCancelled
        ? 'Pesanan telah dibatalkan. Dana deposit/sewa dikembalikan ke dompet.'
        : 'Pengajuan sewa ditolak oleh pemilik alat.'
    }
  }
  switch (s) {
    case 'MENUNGGU_PEMBAYARAN':
      return {
        label: 'Menunggu Pembayaran',
        color: 'bg-amber-50 text-amber-700 ring-amber-200',
        description: 'Menunggu penyelesaian pembayaran escrow oleh penyewa.'
      }
    case 'MENUNGGU_KONFIRMASI':
      return {
        label: 'Menunggu Konfirmasi',
        color: 'bg-blue-50 text-blue-700 ring-blue-200',
        description: 'Pengajuan telah dikirim. Menunggu persetujuan ketersediaan pemilik alat.'
      }
    case 'DIKIRIM':
      return {
        label: 'Dikirim',
        color: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
        description: 'Unit alat sedang dalam proses pengiriman kurir atau siap diambil.'
      }
    case 'SEWA_AKTIF':
      return {
        label: 'Sewa Aktif',
        color: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        description: 'Masa sewa berjalan. Harap rawat alat sesuai panduan operasional.'
      }
    case 'INSPEKSI':
      return {
        label: 'Inspeksi',
        color: 'bg-amber-50 text-amber-700 ring-amber-300',
        description: 'Unit telah dikembalikan. Menunggu verifikasi fisik BAST akhir dari pemilik.'
      }
    case 'SELESAI':
      return {
        label: 'Selesai',
        color: 'bg-slate-100 text-slate-700 ring-slate-200',
        description: 'Transaksi sewa berhasil diselesaikan dan dana deposit dicairkan.'
      }
    default:
      return {
        label: status || 'Pesanan',
        color: 'bg-slate-100 text-slate-700 ring-slate-200',
        description: 'Status pesanan aktif.'
      }
  }
}
