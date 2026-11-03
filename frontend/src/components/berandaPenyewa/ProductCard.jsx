import React from 'react'
import { MapPin, Star } from 'lucide-react'
import { formatRupiah } from '../../lib/equipmentsApi'
import fallbackImage from '../../assets/beranda/item_1.jpg'

/**
 * Komponen Product Card — Dark Utility Varian B (Desain Baru)
 */
export default function ProductCard({
  id,
  name = '',
  category = '',
  pricePerDay = 0,
  deposit = 0,
  powerWatt = 0,
  minRentDays,
  maintenanceBufferDays = 1,
  images = [],
  imageUrl,
  image: customImage,
  location = '',
  distance,
  userLocation = '',
  averageRating,
  ratingCount,
  onSelectDate,
  onClick
}) {
  const handleCardClick = () => {
    if (onClick) onClick(id)
  }

  const handleButtonClick = (e) => {
    e.stopPropagation()
    if (onSelectDate) onSelectDate(id)
    else if (onClick) onClick(id)
  }

  // Resolusi gambar utama dengan fallback berjenjang
  const resolvedImage =
    (Array.isArray(images) && images.length > 0 && images[0]) ||
    imageUrl ||
    customImage ||
    fallbackImage

  // Perhitungan spesifikasi & format data
  const minHari = minRentDays ?? maintenanceBufferDays ?? 1
  const displayWatt = powerWatt ? `${Number(powerWatt).toLocaleString('id-ID')} Watt` : '0 Watt'
  const displayCategory = (category || 'Alat').toUpperCase()
  const displayDistance =
    distance != null && !isNaN(Number(distance))
      ? `${Number(distance).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} km`
      : null
  const displayUserLocation = userLocation || 'lokasi Anda'
  const locationShort = location ? location.split(',')[0].trim() : ''

  return (
    <div
      onClick={handleCardClick}
      className="group box-border w-full flex flex-col justify-between bg-white rounded-[18px] overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      {/* Foto Alat & Pita Kategori */}
      <div className="box-border w-full h-55 shrink-0 flex flex-row gap-0 justify-start items-start rounded-b-[15px] overflow-hidden relative bg-slate-50">
        <img
          src={resolvedImage}
          alt={name || 'Alat'}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = fallbackImage
          }}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Pita Kategori */}
        <div className="box-border w-fit h-fit absolute left-[12px] top-[12px] flex flex-row gap-0 p-[5px_9px] justify-start items-start bg-white/90 backdrop-blur-xs rounded-[999px] z-10 border border-gray-200/80 shadow-xs">
          <span className="text-[9.5px]/[normal] box-border text-gray-700 font-medium tracking-[0.8px] text-left uppercase whitespace-nowrap">
            {displayCategory}
          </span>
        </div>

        {/* Badge Rating & Ulasan */}
        {averageRating != null && Number(averageRating) > 0 && (
          <div
            title={`Rating: ${Number(averageRating).toFixed(1)} (${ratingCount || 0} ulasan)`}
            className="box-border w-fit h-fit absolute right-[12px] top-[12px] flex flex-row gap-1 items-center px-2 py-1 bg-white/90 backdrop-blur-xs rounded-[999px] z-10 border border-gray-200/80 shadow-xs"
          >
            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
            <span className="text-[10.5px] font-bold text-gray-800 tabular-nums">
              {Number(averageRating).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Konten Informasi Produk */}
      <div className="box-border w-full flex-1 flex flex-col justify-between pt-3 px-[18px] pb-[18px]">
        <div>
          {/* Judul: Nama Alat */}
          <h3
            title={name}
            className="text-[17px]/[20px] box-border w-full text-gray-900 font-semibold text-left line-clamp-1 m-0"
          >
            {name || 'Tanpa Nama'}
          </h3>

          {/* Baris 1: Ikon Petir + Daya Listrik & Lokasi Alat */}
          <div className="box-border w-full h-fit shrink-0 flex flex-row justify-between items-center pt-[6px] pb-[12px] gap-2">
            {/* Daya Listrik */}
            <div className="flex flex-row gap-[5px] items-center text-gray-500 shrink-0">
              <svg
                viewBox="0 0 14 14"
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
                className="box-border w-[12px] shrink-0 h-[12px] text-gray-400"
              >
                <path
                  d="M7.7417 0.60156q-0.16748 0.02734-0.33496 0.1128-0.09912 0.06836-2.81641 2.87109l-2.88135 2.98047q-0.35205 0.36572-0.39306 0.44775l-0.01367 0.01367q-0.09912 0.21191-0.12647 0.44776-0.04102 0.37939 0.14014 0.68701 0.18115 0.30762 0.50244 0.46143l0.04443 0.02734q0.0957 0.04443 0.19483 0.0581 0.12646 0.02734 0.51953 0.02735l3.83496 0.02734-0.57422 1.79102q-0.57422 1.79443-0.57422 1.89013-0.04102 0.25293 0.09912 0.50586 0.14014 0.25293 0.37598 0.37598 0.39307 0.18457 0.77246 0 0.12646-0.06836 0.32129-0.24951l5.59863-5.7832q0.22559-0.22559 0.30762-0.42041 0.08545-0.19482 0.08545-0.4751 0-0.32129-0.16748-0.59473-0.16748-0.27344-0.46143-0.42725l-0.04443-0.01367q-0.0957-0.05811-0.19483-0.07177-0.14014-0.02734-0.51953-0.02735l-3.84863-0.02734 0.57422-1.79102q0.57422-1.79443 0.57422-1.89013 0.04102-0.25293-0.09912-0.50586-0.14014-0.25293-0.39307-0.37598-0.24951-0.12646-0.50244-0.07178z m-0.92285 3.19239q-0.37939 1.20313-0.39307 1.32959-0.02734 0.19482 0.02051 0.3999 0.05127 0.20166 0.16064 0.36914 0.07178 0.09912 0.20508 0.21875 0.1333 0.11963 0.24268 0.17431l0.04443 0.02735q0.10938 0.05811 0.2085 0.07178 0.14014 0.01367 0.51953 0.02734l3.82129 0.01367-2.42334 2.50537q-2.41992 2.4917-2.42676 2.4917-0.00684 0 0.37598-1.20996 0.38623-1.20996 0.3999-1.33643 0.02734-0.19482-0.02393-0.39648-0.04785-0.20508-0.15722-0.35889-0.05811-0.08545-0.16407-0.19482-0.10254-0.11279-0.18798-0.15723-0.16748-0.10938-0.37598-0.16748-0.07178-0.01367-2.19775-0.02734l-2.11573 0 2.42334-2.50537q2.41992-2.4917 2.42676-2.4917 0.00684 0-0.38281 1.2168z"
                  fill="currentColor"
                />
              </svg>
              <div className="text-[11px]/[normal] box-border text-gray-500 font-normal text-left whitespace-nowrap">
                {displayWatt}
              </div>
            </div>

            {/* Lokasi & Jarak Singkat */}
            {(locationShort || displayDistance) && (
              <div
                title={`${location || ''}${displayDistance ? ` • ${displayDistance} dari ${displayUserLocation}` : ''}`}
                className="flex flex-row gap-1 items-center text-gray-500 text-[11px] min-w-0 justify-end"
              >
                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">
                  {locationShort || 'Lokasi'}
                  {displayDistance && (
                    <span className="font-semibold text-gray-700 ml-1">
                      • {displayDistance}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Pembatas 1 */}
          <div className="box-border w-full h-[1px] shrink-0 bg-gray-100" />

          {/* Baris 2: Spesifikasi (Minimal Sewa & Deposit) */}
          <div className="box-border w-full h-fit shrink-0 flex flex-row gap-0 py-[12px] justify-between items-center">
            <div className="box-border w-fit shrink-0 h-fit flex flex-col gap-[3px] justify-start items-start">
              <div className="text-[10.5px]/[normal] box-border text-gray-500 font-normal text-left whitespace-nowrap">
                Minimal
              </div>
              <div className="text-[12.5px]/[normal] box-border text-gray-800 font-medium text-left whitespace-nowrap">
                {minHari} hari
              </div>
            </div>
            <div className="box-border w-fit shrink-0 h-fit flex flex-col gap-[3px] justify-start items-end text-right">
              <div className="text-[10.5px]/[normal] box-border text-gray-500 font-normal text-right whitespace-nowrap">
                Deposit
              </div>
              <div className="text-[12.5px]/[normal] box-border text-gray-800 font-medium text-right whitespace-nowrap tabular-nums">
                {formatRupiah(deposit)}
              </div>
            </div>
          </div>

          {/* Pembatas 2 */}
          <div className="box-border w-full h-[1px] shrink-0 bg-gray-100" />
        </div>

        {/* Baris 3: Footer Kiri (Harga) & Tombol Sewa */}
        <div className="box-border w-full h-fit shrink-0 flex flex-row gap-0 pt-[13px] justify-between items-center">
          <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[5px] justify-start items-center">
            <div className="text-[19px]/[normal] box-border text-gray-900 font-semibold text-left whitespace-nowrap tabular-nums">
              {formatRupiah(pricePerDay)}
            </div>
            <div className="text-[11px]/[normal] box-border text-gray-500 font-normal text-left whitespace-nowrap">
              / hari
            </div>
          </div>
          <button
            type="button"
            onClick={handleButtonClick}
            className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] px-[16px] py-[10px] justify-start items-center bg-blue-600 hover:bg-blue-700 active:scale-[0.96] rounded-[999px] cursor-pointer border-0 transition-all duration-200 shadow-xs"
          >
            <span className="text-[12.5px]/[normal] box-border text-white font-semibold text-left whitespace-nowrap">
              Sewa
            </span>
            <svg
              viewBox="0 0 14 14"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border w-[14px] shrink-0 h-[14px] text-white"
            >
              <path
                d="M3.94775 3.51367q-0.14014 0.04102-0.25976 0.15381-0.11963 0.11279-0.16065 0.25293-0.05469 0.19482 0.02735 0.39307 0.08545 0.19482 0.25293 0.29394 0.08545 0.02734 0.19482 0.04102 0.1709 0.01367 0.65967 0.02734l3.83496 0-2.45068 2.45068q-1.65088 1.65088-2.05762 2.07129-0.40332 0.42041-0.43408 0.4751-0.10938 0.23926-0.01367 0.46485 0.09912 0.22217 0.32128 0.32128 0.22559 0.0957 0.46485-0.01367 0.05469-0.03076 0.4751-0.43408 0.42041-0.40674 2.07129-2.05762l2.45068-2.45068 0 2.21143q0 2.2251 0.02734 2.31054 0.02734 0.18115 0.15381 0.29395 0.19824 0.19482 0.46143 0.17431 0.2666-0.02051 0.42041-0.24609l0.02734-0.02734q0.04443-0.05469 0.05811-0.18116 0.01367-0.15381 0.02734-0.68701l0-5.37646-0.04102-0.09571q-0.02734-0.11279-0.12646-0.21191-0.09912-0.09912-0.21192-0.12646l-0.0957-0.04102-3.01123 0q-2.99414 0-3.06592 0.01367z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
