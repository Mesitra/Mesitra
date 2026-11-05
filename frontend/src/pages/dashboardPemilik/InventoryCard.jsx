import React from 'react'
import {
  Package,
  Coffee,
  Flame,
  Settings2
} from 'lucide-react'

// Helper untuk menampilkan icon kategori atau pictogram alat
function getEquipmentIcon(icon, kategori = '') {
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
    const CustomIcon = icon
    return <CustomIcon className="w-8 h-8 text-blue-600" />
  }

  const str = String(icon || kategori).toLowerCase()
  if (str.includes('coffee') || str.includes('kopi') || str.includes('barista')) {
    return <Coffee className="w-8 h-8 text-blue-600" />
  }
  if (str.includes('flame') || str.includes('oven') || str.includes('heater') || str.includes('bakery')) {
    return <Flame className="w-8 h-8 text-blue-600" />
  }
  if (str.includes('settings') || str.includes('grinder')) {
    return <Settings2 className="w-8 h-8 text-blue-600" />
  }
  return <Package className="w-8 h-8 text-blue-600" />
}

// Helper untuk konfigurasi badge status
function getStatusBadgeConfig(status = '') {
  const st = String(status).toUpperCase()

  if (st === 'TERSEDIA') {
    return {
      label: 'Tersedia',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500'
    }
  }
  if (st === 'SEDANG DISEWA' || st === 'DISEWA') {
    return {
      label: 'Sedang disewa',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotClass: 'bg-blue-500'
    }
  }
  if (st === 'INSPEKSI' || st === 'MAINTENANCE') {
    return {
      label: 'Inspeksi',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500'
    }
  }
  return {
    label: 'Nonaktif',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400'
  }
}

/**
 * Komponen InventoryCard untuk menampilkan satu baris kartu alat sewaan.
 * Mendukung props dalam bahasa Indonesia sesuai spesifikasi mandat:
 * (nama, daya, status, harga, deposit, kategori/icon)
 */
export default function InventoryCard({
  nama,
  daya,
  status,
  harga,
  deposit,
  kategori,
  icon,
  deskripsi,
  fotoCount = 4,
  onKelola,
  // Alias bahasa Inggris untuk kompatibilitas ekstra
  name,
  power,
  price,
  category,
  description,
  onManage,
  rawItem,
  item
}) {
  const itemData = rawItem || item || {}
  const itemNama = nama || name || itemData.nama || itemData.name || 'Alat Tanpa Nama'
  const itemDaya = daya || power || (itemData.powerWatt ? `${itemData.powerWatt} W` : (itemData.daya || '0 W'))
  const itemStatus = status || itemData.status || 'Tersedia'
  const itemHarga = harga ?? price ?? itemData.harga ?? itemData.pricePerDay ?? 'Rp 0'
  const itemDeposit = deposit ?? itemData.deposit ?? 'Deposit Rp 0'
  const itemKategori = kategori || category || itemData.kategori || itemData.category || 'Peralatan'
  const itemDeskripsi = deskripsi || description || itemData.deskripsi || itemData.description || 'Kondisi prima · Siap disewa'
  const itemFotoCount = fotoCount ?? (Array.isArray(itemData.images) && itemData.images.length > 0 ? itemData.images.length : 1)
  const handleKelola = onKelola || onManage

  const statusConfig = getStatusBadgeConfig(itemStatus)
  const renderedIcon = getEquipmentIcon(icon || itemData.icon, itemKategori)

  return (
    <div className="bg-white border border-slate-200/90 hover:border-blue-200 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Kolom Kiri: Foto / Pictogram Preview */}
      <div className="flex items-center gap-3.5">
        <div className="relative w-32 h-24 sm:w-36 sm:h-24 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0 flex flex-col justify-between p-2.5 shadow-2xs">
          {/* Badge Kategori */}
          <div className="bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200/80 shadow-2xs w-fit">
            <span className="text-[9px] font-bold text-slate-700 tracking-wide uppercase">
              {itemKategori}
            </span>
          </div>

          {/* Icon Pictogram */}
          <div className="flex items-center justify-center my-auto">
            {renderedIcon}
          </div>

          {/* Indikator Jumlah Foto */}
          <div className="text-[9px] font-medium text-slate-500 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200/60 shadow-2xs w-fit flex items-center gap-1">
            <span>▧</span>
            <span>{itemFotoCount} foto</span>
          </div>
        </div>

        {/* Kolom Tengah: Informasi & Detail Alat */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
              {itemNama} · {itemDaya}
            </h3>
          </div>

          {/* Badge Status */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
              <span>{statusConfig.label}</span>
            </span>
          </div>

          {/* Deskripsi Singkat */}
          <p className="text-xs text-slate-500 font-medium line-clamp-1">
            {itemDeskripsi}
          </p>
        </div>
      </div>

      {/* Kolom Kanan: Rincian Keuangan & Tombol Aksi */}
      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 shrink-0 gap-3 md:gap-2">
        <div className="text-left md:text-right">
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
            HARGA SEWA / HARI
          </div>
          <div className="text-base sm:text-lg font-extrabold text-blue-600">
            {typeof itemHarga === 'number' ? `Rp ${itemHarga.toLocaleString('id-ID')}` : itemHarga}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {typeof itemDeposit === 'number' ? `Deposit Rp ${itemDeposit.toLocaleString('id-ID')}` : itemDeposit}
          </div>
        </div>

        {/* Tombol Aksi Primer: Kelola Alat (Biru MyRent) */}
        <button
          type="button"
          onClick={() => handleKelola && handleKelola(rawItem || item || { ...itemData, nama: itemNama, status: itemStatus })}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Kelola alat</span>
        </button>
      </div>
    </div>
  )
}

