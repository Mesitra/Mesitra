import React, { useState, useEffect } from 'react'
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
 * Fungsi ekstraksi URL foto yang robust untuk berbagai format payload backend:
 * - JSON string array (misal: '["url1", "url2"]') -> di-parse dengan JSON.parse & try-catch
 * - Array of strings (misal: ['url1', 'url2'])
 * - Array of objects (misal: [{ url: 'url1' }, { src: 'url2' }])
 * - Single string URL (misal: 'https://...')
 * - Menangani kandidat: photos, images, photo, image, foto, imageUrl
 */
export function extractEquipmentPhotos(itemData = {}, photosProp = null, imagesProp = null) {
  const candidates = [
    photosProp,
    imagesProp,
    itemData.photos,
    itemData.images,
    itemData.foto,
    itemData.photo,
    itemData.image,
    itemData.imageUrl
  ]

  const rawList = []

  for (const candidate of candidates) {
    if (!candidate) continue

    // Jika kandidat bertipe string
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (!trimmed) continue

      // Cek apakah string merupakan JSON array / object yang di-stringify
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            rawList.push(...parsed)
            continue
          } else if (parsed && typeof parsed === 'object') {
            rawList.push(parsed)
            continue
          }
        } catch {
          // Gagal parse JSON, perlakukan sebagai string URL biasa
        }
      }

      rawList.push(trimmed)
      continue
    }

    // Jika kandidat bertipe array
    if (Array.isArray(candidate)) {
      rawList.push(...candidate)
      continue
    }

    // Jika kandidat bertipe object tunggal
    if (typeof candidate === 'object' && candidate !== null) {
      rawList.push(candidate)
      continue
    }
  }

  // Normalisasi seluruh item menjadi array string URL yang bersih
  const validUrls = []
  for (const item of rawList) {
    if (!item) continue

    if (typeof item === 'string') {
      const s = item.trim()
      // Tangani kasus stringified array bersarang (nested stringified JSON)
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const inner = JSON.parse(s)
          if (Array.isArray(inner)) {
            for (const sub of inner) {
              const subUrl = typeof sub === 'string' ? sub.trim() : (sub?.url || sub?.src || null)
              if (subUrl && typeof subUrl === 'string' && subUrl.trim()) {
                validUrls.push(subUrl.trim())
              }
            }
            continue
          }
        } catch {}
      }
      if (s && !s.startsWith('[') && !s.startsWith('{')) {
        validUrls.push(s)
      }
    } else if (typeof item === 'object') {
      const url = item.url || item.src || item.preview || item.dataUrl || item.path
      if (url && typeof url === 'string' && url.trim()) {
        validUrls.push(url.trim())
      }
    }
  }

  return validUrls
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
  fotoCount,
  onKelola,
  // Alias bahasa Inggris untuk kompatibilitas ekstra
  name,
  power,
  price,
  category,
  description,
  onManage,
  rawItem,
  item,
  photos,
  images,
  foto,
  photo,
  image
}) {
  const [imageError, setImageError] = useState(false)

  const itemData = rawItem || item || {}
  const itemNama = nama || name || itemData.nama || itemData.name || 'Alat Tanpa Nama'
  const itemDaya = daya || power || (itemData.powerWatt ? `${itemData.powerWatt} W` : (itemData.daya || '0 W'))
  const itemStatus = status || itemData.status || 'Tersedia'
  const itemHarga = harga ?? price ?? itemData.harga ?? itemData.pricePerDay ?? 'Rp 0'
  const itemDeposit = deposit ?? itemData.deposit ?? 'Deposit Rp 0'
  const itemKategori = kategori || category || itemData.kategori || itemData.category || 'Peralatan'
  const itemDeskripsi = deskripsi || description || itemData.deskripsi || itemData.description || 'Kondisi prima · Siap disewa'

  // Ekstraksi foto secara robust dari array / object / stringified JSON
  const photoList = extractEquipmentPhotos(itemData, photos, images)
  const mainPhoto = photoList.length > 0 ? photoList[0] : null
  const itemFotoCount = fotoCount ?? (photoList.length > 0 ? photoList.length : 1)
  const handleKelola = onKelola || onManage

  // Reset status error ketika URL foto utama berubah
  useEffect(() => {
    setImageError(false)
  }, [mainPhoto])

  const statusConfig = getStatusBadgeConfig(itemStatus)
  const renderedIcon = getEquipmentIcon(icon || itemData.icon, itemKategori)

  return (
    <div className="bg-white border border-slate-200/90 hover:border-blue-200 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Kolom Kiri: Foto / Pictogram Preview */}
      <div className="flex items-center gap-3.5">
        <div className="relative w-32 h-24 sm:w-36 sm:h-24 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
          {/* Mutually exclusive: jika mainPhoto valid & tidak error, render <img> SAJA. Fallback ke icon jika !mainPhoto atau imageError */}
          {mainPhoto && !imageError ? (
            <img
              src={mainPhoto}
              alt={itemNama}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center justify-center">
              {renderedIcon}
            </div>
          )}

          {/* Indikator Jumlah Foto */}
          <div className="absolute bottom-1.5 left-1.5 text-[9px] font-medium text-slate-500 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-200/60 shadow-2xs flex items-center gap-1 z-10">
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

