import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import {
  Info,
  Loader2,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  Star,
  CheckCircle2,
  MessageSquare,
  Truck,
  Wrench,
  Camera,
  X
} from 'lucide-react'
import NavbarPenyewa from '../common/NavbarPenyewa'
import ImageGallery from './ImageGallery'
import SpecGrid from './SpecGrid'
import WarningBanner from './WarningBanner'
import AvailabilityCalendar from './AvailabilityCalendar'
import CheckoutPanel from './CheckoutPanel'
import { formatRupiah, getEquipment } from '../../lib/equipmentsApi'
import { getSessionUser, getUserInitials, getUserPowerLimit } from '../../lib/userSession'
import {
  MONTH_NAMES,
  diffDays,
  formatLongDate,
  isEquipmentAvailableInRange,
  normalizeDate
} from '../../lib/dateHelpers'

const STATUS_LABEL = {
  TERSEDIA: 'Tersedia',
  DISEWA: 'Disewa',
  MAINTENANCE: 'Pemeliharaan'
}

export default function DetailAlat({
  onBack,
  onNavigateHome,
  onAjukanSewa
}) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Ambil kandidat tanggal dari navigasi (state) atau sessionStorage filter beranda
  const getCandidateDateRange = () => {
    const fromState = location?.state?.dateRange
    if (fromState?.start || fromState?.end) {
      return fromState
    }
    try {
      const saved = sessionStorage.getItem('myrent_beranda_filters')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.dateRange?.start || parsed?.dateRange?.end) {
          return parsed.dateRange
        }
      }
    } catch {
      // Abaikan jika parse gagal
    }
    return null
  }

  // Validasi ketersediaan jadwal SEBELUM auto-fill kalender
  const getValidatedInitialRange = (equipmentData = null) => {
    const candidate = getCandidateDateRange()
    if (!candidate?.start && !candidate?.end) {
      return { start: null, end: null }
    }

    const start = normalizeDate(candidate.start || candidate.end)
    const end = normalizeDate(candidate.end || candidate.start)

    // JIKA rentang tanggal menabrak hari terisi atau buffer (mis. tgl 16),
    // GAGALKAN auto-fill dan set rentang menjadi null (kalender tetap kosong).
    if (!isEquipmentAvailableInRange(equipmentData, start, end)) {
      return { start: null, end: null }
    }

    return {
      start,
      end: candidate.end ? end : null
    }
  }

  const [equipment, setEquipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  // ── Seleksi tanggal sewa (dikendalikan dari AvailabilityCalendar) ──────
  const [selectionStart, setSelectionStart] = useState(() => getValidatedInitialRange(null).start)
  const [selectionEnd, setSelectionEnd] = useState(() => getValidatedInitialRange(null).end)
  const [dateWarning, setDateWarning] = useState(false)
  const [showPowerModal, setShowPowerModal] = useState(false)
  const [selectedAccessoryPhoto, setSelectedAccessoryPhoto] = useState(null)

  // Kapasitas daya listrik usaha penyewa (dari sesi login di localStorage).
  const user = getSessionUser()
  const userPowerLimit = getUserPowerLimit(user)

  // ── Ambil detail alat dari backend ──────────────────────────────────────
  useEffect(() => {
    let isActive = true

    const loadEquipment = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getEquipment(id)
        if (isActive) {
          setEquipment(data)
          // Validasi ulang ketersediaan tanggal terhadap data detail alat
          setSelectionStart((currentStart) => {
            if (!currentStart) return null
            const isAvailable = isEquipmentAvailableInRange(
              data,
              currentStart,
              selectionEnd || currentStart
            )
            if (!isAvailable) {
              setSelectionEnd(null)
              return null
            }
            return currentStart
          })
        }
      } catch (err) {
        if (isActive) {
          setEquipment(null)
          setError(err.message || 'Gagal memuat detail alat')
        }
      } finally {
        if (isActive) setLoading(false)
      }
    }

    if (id) {
      loadEquipment()
    } else {
      setError('ID alat tidak ditemukan pada URL')
      setLoading(false)
    }

    return () => {
      isActive = false
    }
  }, [id])

  const minRentDays = equipment?.minRentDays || equipment?.maintenanceBufferDays || 1
  const isSingleDayValid = minRentDays === 1 && selectionStart && !selectionEnd

  // Rentang sewa terpilih → jumlah hari & teks tanggal untuk panel checkout.
  const rentalDays =
    selectionStart && selectionEnd
      ? Math.max(1, diffDays(selectionStart, selectionEnd) + 1)
      : isSingleDayValid
      ? 1
      : 0

  const startDateFormatted = selectionStart ? formatLongDate(selectionStart) : 'Pilih tanggal'
  const endDateFormatted = selectionEnd
    ? formatLongDate(selectionEnd)
    : isSingleDayValid
    ? formatLongDate(selectionStart)
    : startDateFormatted

  // Kalender memberi tahu perubahan rentang (termasuk reset saat klik ulang).
  const handleSelectionChange = (start, end) => {
    setSelectionStart(start)
    setSelectionEnd(end)
    setDateWarning(false)
  }

  const ownerDisplayName =
    equipment?.owner?.tenantProfile?.storeName ||
    equipment?.owner?.displayName ||
    equipment?.owner?.businessName ||
    equipment?.owner?.fullName ||
    equipment?.owner?.name ||
    'Pemilik Alat'

  const ownerShopLocation =
    equipment?.owner?.tenantProfile?.city ||
    equipment?.owner?.shopLocation ||
    equipment?.location ||
    'Jakarta Selatan'

  const equipmentDistanceStr = `${Number(equipment?.distance ?? 2.5).toLocaleString('id-ID')} km`
  const ownerFullAddress = equipment?.owner?.address
    ? `${equipment.owner.address} (${equipmentDistanceStr})`
    : `${ownerShopLocation} (${equipmentDistanceStr})`

  const { calendarYear, calendarMonth } = useMemo(() => {
    const candidate = getCandidateDateRange()
    const target = normalizeDate(candidate?.start) || normalizeDate(candidate?.end) || normalizeDate(selectionStart)
    if (target) {
      return { calendarYear: target.getFullYear(), calendarMonth: target.getMonth() }
    }
    const now = new Date()
    return { calendarYear: now.getFullYear(), calendarMonth: now.getMonth() }
  }, [selectionStart])

  const ownerPhoto = !avatarLoadFailed && equipment?.owner?.photo ? equipment.owner.photo : null
  const ownerInitials = equipment?.owner ? getUserInitials(equipment.owner) : '?'

  const handleChatOwner = () => {
    const ownerId = equipment?.ownerId || equipment?.owner?.id
    if (!ownerId) return

    navigate('/pesan', {
      state: {
        partnerId: ownerId,
        partnerName: ownerDisplayName,
        contextType: 'EQUIPMENT',
        contextData: {
          id: equipment.id,
          name: equipment.name,
          category: equipment.category,
          image: Array.isArray(equipment.images) && equipment.images.length > 0 ? equipment.images[0] : null,
          pricePerDay: equipment.pricePerDay,
          deposit: equipment.deposit,
          powerWatt: equipment.powerWatt,
          location: equipment.location
        }
      }
    })
  }

  // Alat membutuhkan daya lebih besar dari kapasitas listrik usaha penyewa.
  const isPowerExceeded =
    Boolean(equipment) &&
    userPowerLimit !== null &&
    equipment.powerWatt > userPowerLimit

  if (loading) {
    return (
      <div className="box-border w-full min-h-screen flex flex-col justify-center items-center gap-3 bg-slate-50">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-600">Memuat detail alat…</p>
      </div>
    )
  }

  if (error || !equipment) {
    return (
      <div className="box-border w-full min-h-screen flex flex-col justify-center items-center gap-3 bg-slate-50 px-4 text-center">
        <TriangleAlert className="w-6 h-6 text-amber-600" />
        <h1 className="text-base font-bold text-slate-900">Detail alat tidak dapat dimuat</h1>
        <p className="text-xs text-slate-600">{error || 'Alat tidak ditemukan'}</p>
        <button
          type="button"
          onClick={onBack || onNavigateHome}
          className="mt-2 text-xs font-semibold text-blue-600 hover:underline bg-transparent border-0 cursor-pointer"
        >
          Kembali ke Jelajahi Alat
        </button>
      </div>
    )
  }

  const statusLabel = STATUS_LABEL[equipment.status] || equipment.status

  return (
    <div className="box-border w-full min-h-screen flex flex-col justify-start items-start bg-slate-50">
      {/* 1. Global Navigation Bar */}
      <NavbarPenyewa
        activeTab="jelajahi"
        dateRange="12 – 15 Jun"
        onNavigateHome={onNavigateHome}
      />

      {/* 2. Main Detail Page Layout: Two Columns */}
      <main className="box-border w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-fit flex flex-col lg:flex-row gap-6 py-7 pb-12 justify-start items-start">
        {/* Left Column: Media, Specs, Warning, Calendar, Description */}
        <section className="box-border flex-1 min-w-0 w-full h-fit flex flex-col gap-5.5 justify-start items-start">
          {/* Breadcrumb Navigation */}
          <nav className="box-border w-fit h-fit shrink-0 flex flex-row gap-2 justify-start items-center text-[11px]">
            <button
              type="button"
              onClick={onBack || onNavigateHome}
              className="text-slate-600 font-normal hover:text-blue-600 cursor-pointer bg-transparent border-0 p-0"
            >
              Jelajahi Alat
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 font-normal">{equipment.category}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-50 sm:max-w-none">
              {equipment.name}
            </span>
          </nav>

          {/* Image Gallery */}
          <ImageGallery
            images={equipment.images}
            status={statusLabel}
            distance={`${Number(equipment.distance).toLocaleString('id-ID')} km`}
          />

          {/* Title and Meta Header */}
          <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2.5 justify-start items-start bg-white ring-1 ring-slate-200 rounded-2xl p-5">
            <div className="box-border w-full h-fit shrink-0 flex flex-col sm:flex-row gap-4 justify-between items-start">
              {/* Left Info */}
              <div className="box-border flex-1 h-fit flex flex-col gap-1.5 justify-start items-start">
                <span className="text-[11px] text-blue-600 font-bold tracking-[0.4px] uppercase whitespace-nowrap">
                  {equipment.category}
                </span>

                <h1 className="text-[22px] sm:text-[28px] leading-tight text-slate-900 font-extrabold tracking-[-0.8px] text-left m-0">
                  {equipment.name}
                </h1>

                {/* Meta details: status, lokasi, verifikasi */}
                <div className="box-border w-full h-fit shrink-0 flex flex-wrap gap-3.5 items-center pt-1 text-xs">
                  {/* Status */}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-semibold">{statusLabel}</span>
                  </div>

                  <span className="text-slate-300">•</span>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-slate-600 tabular-nums">
                    <MapPin className="w-3.25 h-3.25 text-slate-400" />
                    <span>
                      {Number(equipment.distance).toLocaleString('id-ID')} km · {ownerShopLocation}
                    </span>
                  </div>

                  <span className="text-slate-300">•</span>

                  {/* Verified Owner */}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <ShieldCheck className="w-3.25 h-3.25 text-blue-600" />
                    <span>Pemilik terverifikasi</span>
                  </div>
                </div>
              </div>

              {/* Price Box */}
              <div className="box-border w-fit shrink-0 h-fit flex flex-col gap-0.5 justify-start sm:items-end">
                <div className="box-border w-fit h-fit shrink-0 flex flex-row gap-1 justify-start items-end">
                  <span className="text-2xl sm:text-[26px] text-slate-900 font-extrabold tracking-tight tabular-nums whitespace-nowrap">
                    {formatRupiah(equipment.pricePerDay)}
                  </span>
                  <span className="text-xs text-slate-500 font-normal pb-1 whitespace-nowrap">
                    /hari
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium tabular-nums whitespace-nowrap">
                  Deposit {formatRupiah(equipment.deposit)}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications Grid */}
          <SpecGrid
            power={`${equipment.powerWatt} W`}
            rawPower={equipment.powerWatt}
            userPowerLimit={userPowerLimit ?? 0}
            weight={`${equipment.weightKg} kg`}
            dimensions={equipment.dimensions}
            maintenanceBuffer={`${equipment.maintenanceBufferDays} Hari`}
          />

          {/* Warning Banner (Shown when tool power exceeds user's power) */}
          {isPowerExceeded && (
            <WarningBanner
              requiredWatt={equipment.powerWatt}
              userWatt={userPowerLimit}
              onActionClick={() => setShowPowerModal(true)}
            />
          )}

          {/* Highlight Peringatan Minimal Sewa */}
          <div className="box-border w-full flex flex-row gap-2.5 p-3.5 justify-start items-center bg-blue-50/80 ring-1 ring-blue-200 rounded-[12px]">
            <Info className="w-4 h-4 shrink-0 text-blue-600" />
            <p className="text-xs text-blue-900 font-medium m-0">
              Pilih tanggal sewa di kalender. Minimal sewa:{' '}
              <span className="font-bold">{minRentDays} Hari</span>
            </p>
          </div>

          {/* Availability Calendar */}
          <AvailabilityCalendar
            monthTitle={`Ketersediaan ${MONTH_NAMES[calendarMonth]} ${calendarYear}`}
            year={calendarYear}
            month={calendarMonth}
            minRentDays={minRentDays}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            onSelectionChange={handleSelectionChange}
            dayStatus={equipment.dayStatus}
          />

          {/* Deskripsi Alat Card */}
          <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2.5 p-5 justify-start items-start bg-white ring-1 ring-slate-200 rounded-[14px]">
            <h2 className="text-sm text-slate-900 font-bold text-left whitespace-nowrap m-0">
              Deskripsi Alat
            </h2>
            <p className="text-xs leading-5 w-full text-slate-600 font-normal text-left m-0 whitespace-pre-line">
              {equipment.description}
            </p>
          </div>

          {/* Kelengkapan Aksesoris Unit */}
          {Array.isArray(equipment.accessories) && equipment.accessories.length > 0 ? (
            <div className="box-border w-full h-fit shrink-0 flex flex-col gap-3 p-5 justify-start items-start bg-white ring-1 ring-slate-200 rounded-[14px]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm text-slate-900 font-bold m-0">Kelengkapan Aksesoris Termasuk</h2>
              </div>
              <p className="text-xs text-slate-500 m-0">
                Unit diserahkan lengkap sesuai daftar aksesoris berikut dan diverifikasi melalui BAST digital:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
                {equipment.accessories.map((item, idx) => {
                  const accName = typeof item === 'string' ? item : item?.name || String(item)
                  const accPhoto = typeof item === 'object' && item?.photo ? item.photo : null

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{accName}</span>
                      </div>
                      {accPhoto && (
                        <button
                          type="button"
                          onClick={() => setSelectedAccessoryPhoto({ name: accName, photo: accPhoto })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-[10px] font-bold text-slate-700 hover:text-blue-600 shadow-2xs transition-colors shrink-0 cursor-pointer"
                          title="Lihat foto bukti fisik aksesoris"
                        >
                          <Camera className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>Bukti Foto</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-5 justify-start items-start bg-white ring-1 ring-slate-200 rounded-[14px]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm text-slate-900 font-bold m-0">Kelengkapan Aksesoris Termasuk</h2>
              </div>
              <p className="text-xs text-slate-500 m-0 italic">
                Unit standar tanpa aksesoris tambahan yang ditentukan pemilik.
              </p>
            </div>
          )}

          {/* Kebijakan Pengiriman & Jeda Rawat */}
          <div className="box-border w-full h-fit shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 bg-white ring-1 ring-slate-200 rounded-[14px] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 m-0 mb-1">Metode Pengiriman</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(equipment.deliveryMethods || ['PICKUP', 'COURIER']).map((method, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md"
                    >
                      {method === 'PICKUP'
                        ? 'Ambil Sendiri'
                        : `Kurir Toko (Rp ${(equipment.deliveryFee ?? 45000).toLocaleString('id-ID')})`}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white ring-1 ring-slate-200 rounded-[14px] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 m-0 mb-1">Jeda Perawatan Rutin</h4>
                <p className="text-xs text-slate-600 m-0">
                  Dialokasikan <strong>{equipment.maintenanceBufferDays || 1} hari</strong> jeda kalibrasi &amp; servis setelah unit kembali.
                </p>
              </div>
            </div>
          </div>

          {/* Ulasan & Rating Penyewa */}
          <div className="box-border w-full h-fit shrink-0 flex flex-col gap-4 p-5 justify-start items-start bg-white ring-1 ring-slate-200 rounded-[14px]">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h2 className="text-sm text-slate-900 font-bold m-0">Ulasan &amp; Rating Penyewa</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <span>{equipment.averageRating || '5.0'}</span>
                <span className="text-slate-400 font-normal">/ 5.0</span>
                <span className="text-slate-400 font-normal">
                  ({equipment.ratingCount || equipment.reviews?.length || 0} ulasan)
                </span>
              </div>
            </div>

            {Array.isArray(equipment.reviews) && equipment.reviews.length > 0 ? (
              <div className="flex flex-col gap-3 w-full divide-y divide-slate-100">
                {equipment.reviews.map((rev) => (
                  <div key={rev.id} className="pt-3 first:pt-0 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {rev.user?.photo ? (
                          <img
                            src={rev.user.photo}
                            alt={rev.user?.fullName || 'Penyewa'}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                            {(rev.user?.fullName || 'P')[0]}
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {rev.user?.fullName || 'Penyewa Terverifikasi'}
                          </span>
                          {rev.user?.businessName && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({rev.user.businessName})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < rev.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed m-0 italic">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic m-0">
                Belum ada ulasan untuk unit alat ini.
              </p>
            )}
          </div>
        </section>

        {/* Right Column: 1 Frame Card (Checkout + Profil Pemilik)
            Tampil dalam 1 frame terpadu tanpa ruang kosong berlebih di bawahnya,
            dan sticky secara dinamis di desktop agar scrolling mengalir alami. */}
        <section className="box-border w-full lg:w-105 shrink-0 flex flex-col justify-start items-start">
          <div className="box-border lg:sticky lg:top-24 w-full h-fit flex flex-col gap-3 justify-start items-start">
            {/* Peringatan: rentang tanggal belum lengkap */}
            {dateWarning && (
              <div className="box-border w-full flex flex-row gap-2 p-3 justify-start items-start bg-amber-50 ring-1 ring-amber-200 rounded-[10px]">
                <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-4 text-amber-700 font-normal text-left m-0">
                  Pilih tanggal mulai &amp; selesai sewa di kalender sebelum mengajukan sewa.
                </p>
              </div>
            )}

            {/* 1 Frame: Panel Checkout & Profil Pemilik Terpadu */}
            <CheckoutPanel
              dailyPrice={equipment.pricePerDay}
              depositAmount={equipment.deposit}
              rentalDays={rentalDays}
              startDateText={startDateFormatted}
              endDateText={endDateFormatted}
              ownerAddress={ownerFullAddress}
              deliveryMethods={equipment.deliveryMethods}
              courierFee={equipment.deliveryFee ?? 45000}
              owner={equipment.owner}
              ownerPhoto={ownerPhoto}
              ownerDisplayName={ownerDisplayName}
              ownerInitials={ownerInitials}
              onChatOwner={handleChatOwner}
              onAjukanSewa={(checkoutData) => {
                // Tanggal belum lengkap → jangan lanjutkan.
                const isReady = (selectionStart && selectionEnd) || isSingleDayValid
                if (!isReady) {
                  setDateWarning(true)
                  return
                }

                setDateWarning(false)
                if (onAjukanSewa) {
                  onAjukanSewa(checkoutData)
                  return
                }

                // Navigasi ke Checkout Wizard (Step 1) dengan membawa state pilihan
                const isCourier = checkoutData?.selectedDelivery === 'courier'
                const customFee = equipment.deliveryFee ?? 45000
                navigate(`/checkout/${equipment.id}`, {
                  state: {
                    equipmentId: equipment.id,
                    selectionStart: selectionStart?.toISOString().slice(0, 10),
                    selectionEnd: (selectionEnd || selectionStart)?.toISOString().slice(0, 10),
                    deliveryMethod: isCourier ? 'COURIER' : 'PICKUP',
                    shippingCost: isCourier ? customFee : 0
                  }
                })
              }}
            />
          </div>
        </section>
      </main>

      {/* Lightbox Pratinjau Foto Bukti Aksesoris */}
      {selectedAccessoryPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedAccessoryPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Bukti Fisik Aksesoris: {selectedAccessoryPhoto.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAccessoryPhoto(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-900/5 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={selectedAccessoryPhoto.photo}
                alt={selectedAccessoryPhoto.name}
                className="max-h-[55vh] w-auto max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Foto bukti autentik dari pemilik untuk BAST</span>
              <button
                type="button"
                onClick={() => setSelectedAccessoryPhoto(null)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional: Update Power Modal Demo */}
      {showPowerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Perbarui Daya Listrik UMKM</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Daya terdaftar saat ini: <strong>{userPowerLimit} W</strong>. Anda dapat mengajukan penyesuaian daya listrik tempat usaha atau sewa genset tambahan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPowerModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Data kapasitas listrik telah diperbarui!')
                  setShowPowerModal(false)
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Simpan Penyesuaian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
