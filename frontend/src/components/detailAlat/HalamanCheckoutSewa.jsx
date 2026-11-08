import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  Zap
} from 'lucide-react'
import NavbarPenyewa from '../common/NavbarPenyewa'
import CheckoutPanel from './CheckoutPanel'
import AvailabilityCalendar from './AvailabilityCalendar'
import { getEquipment, formatRupiah } from '../../lib/equipmentsApi'
import {
  diffDays,
  formatShortDate,
  normalizeDate
} from '../../lib/dateHelpers'
import { getUserInitials } from '../../lib/userSession'
import fallbackImage from '../../assets/beranda/item_1.jpg'

export default function HalamanCheckoutSewa() {
  const { equipmentId: paramEquipmentId, id: paramId } = useParams()
  const equipmentId = paramEquipmentId || paramId
  const navigate = useNavigate()
  const location = useLocation()

  // Ambil state yang dioper dari DetailAlat (jika ada)
  const navState = location.state || {}
  const passedEquipment = navState.equipment || null

  const [equipment, setEquipment] = useState(passedEquipment)
  const [loading, setLoading] = useState(!passedEquipment)
  const [error, setError] = useState(null)

  // State kalender & tanggal sewa
  const [selectionStart, setSelectionStart] = useState(() => {
    if (navState.selectionStart) return normalizeDate(navState.selectionStart)
    return null
  })
  const [selectionEnd, setSelectionEnd] = useState(() => {
    if (navState.selectionEnd) return normalizeDate(navState.selectionEnd)
    return null
  })
  // State kalender & tanggal sewa (buka otomatis jika tanggal belum lengkap)
  const [isCalendarOpen, setIsCalendarOpen] = useState(() => {
    return !navState.selectionStart || !navState.selectionEnd
  })
  const [dateWarning, setDateWarning] = useState(false)

  // Ambil data alat dari backend jika belum tersedia
  useEffect(() => {
    if (!equipmentId) return
    let isCancelled = false

    const fetchDetail = async () => {
      try {
        if (!equipment) setLoading(true)
        setError(null)
        const data = await getEquipment(equipmentId)
        if (!isCancelled) {
          setEquipment(data)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err?.message || 'Gagal memuat detail alat')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    fetchDetail()

    return () => {
      isCancelled = true
    }
  }, [equipmentId])

  // Tangani pemilihan tanggal dari AvailabilityCalendar (mendukung parameter start, end maupun {start, end})
  const handleSelectionChange = (arg1, arg2) => {
    let start = arg1
    let end = arg2
    if (arg1 && typeof arg1 === 'object' && !(arg1 instanceof Date) && ('start' in arg1 || 'end' in arg1)) {
      start = arg1.start
      end = arg1.end
    }
    setSelectionStart(start)
    setSelectionEnd(end)
    if (start) {
      setDateWarning(false)
    }
  }

  // Format teks tanggal sewa & hitung durasi hari
  const startDateFormatted = selectionStart ? formatShortDate(selectionStart) : 'Pilih tanggal'
  const isSingleDayValid = selectionStart && !selectionEnd && (equipment?.minRentDays ?? 1) <= 1
  const endDateFormatted = selectionEnd
    ? formatShortDate(selectionEnd)
    : isSingleDayValid
    ? formatShortDate(selectionStart)
    : 'Pilih tanggal'

  const rentalDays =
    selectionStart && selectionEnd
      ? diffDays(selectionStart, selectionEnd) + 1
      : isSingleDayValid
      ? 1
      : 0

  // Resolusi data pemilik
  const ownerDisplayName =
    equipment?.owner?.tenantProfile?.storeName ||
    equipment?.owner?.businessName ||
    equipment?.owner?.fullName ||
    equipment?.owner?.name ||
    'Pemilik Alat'

  const ownerPhoto = equipment?.owner?.photo || null
  const ownerInitials = equipment?.owner ? getUserInitials(equipment.owner) : 'PA'

  const ownerFullAddress =
    equipment?.owner?.tenantProfile?.address ||
    equipment?.owner?.shopLocation ||
    equipment?.owner?.address ||
    equipment?.location ||
    'Jakarta'

  const resolvedImage =
    (Array.isArray(equipment?.images) && equipment.images.length > 0 && equipment.images[0]) ||
    equipment?.imageUrl ||
    equipment?.image ||
    fallbackImage

  // Tombol kembali langsung ke halaman detail alat (tidak logout / merusak sesi)
  const handleBack = () => {
    navigate(`/alat/${equipmentId}`)
  }

  // Hubungi pemilik (Chat)
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
          image: resolvedImage,
          pricePerDay: equipment.pricePerDay,
          deposit: equipment.deposit,
          powerWatt: equipment.powerWatt,
          location: equipment.location
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="box-border w-full min-h-screen flex flex-col justify-center items-center gap-3 bg-slate-50">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-600">Memuat data checkout sewa…</p>
      </div>
    )
  }

  if (error || !equipment) {
    return (
      <div className="box-border w-full min-h-screen flex flex-col justify-center items-center gap-3 bg-slate-50 px-4 text-center">
        <TriangleAlert className="w-8 h-8 text-amber-600" />
        <h1 className="text-base font-bold text-slate-900">Alat tidak dapat ditemukan</h1>
        <p className="text-xs text-slate-600">{error || 'Data alat tidak tersedia.'}</p>
        <button
          type="button"
          onClick={() => navigate('/beranda-sewa')}
          className="mt-2 text-xs font-semibold text-blue-600 hover:underline bg-transparent border-0 cursor-pointer"
        >
          Kembali ke Beranda Sewa
        </button>
      </div>
    )
  }

  return (
    <div className="box-border w-full min-h-screen flex flex-col justify-start items-start bg-slate-50 pb-16">
      {/* 1. Global Navigation Bar — Dock floating mobile dinonaktifkan agar fokus checkout */}
      <NavbarPenyewa
        activeTab="jelajahi"
        dateRange="12 – 15 Jun"
        onNavigateHome={() => navigate('/beranda-sewa')}
        hideBottomNav={true}
      />

      {/* 2. Main Content Checkout Container */}
      <main className="box-border w-full max-w-2xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
        {/* Header Kembali & Judul Halaman */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Kembali ke Detail Alat"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 m-0 leading-tight">
              Atur &amp; Ajukan Sewa
            </h1>
            <p className="text-xs text-slate-500 m-0">
              Konfigurasi tanggal sewa dan pengiriman alat
            </p>
          </div>
        </div>

        {/* Ringkasan Singkat Kartu Alat */}
        <div className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <img
            src={resolvedImage}
            alt={equipment.name}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = fallbackImage
            }}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-slate-100"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {equipment.category || 'Alat'}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1 mb-0.5" title={equipment.name}>
              {equipment.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              {equipment.powerWatt > 0 && (
                <span className="flex items-center gap-0.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {equipment.powerWatt} Watt
                </span>
              )}
              {equipment.location && (
                <span className="flex items-center gap-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {equipment.location.split(',')[0]}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-blue-600 mt-1">
              {formatRupiah(equipment.pricePerDay)}
              <span className="text-[11px] text-slate-500 font-normal"> / hari</span>
            </div>
          </div>
        </div>

        {/* Peringatan: rentang tanggal belum lengkap */}
        {dateWarning && (
          <div className="box-border w-full flex flex-row gap-2.5 p-3.5 justify-start items-start bg-amber-50 ring-1 ring-amber-200 rounded-xl animate-in fade-in duration-200">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs text-amber-800">
              <span className="font-semibold">Tanggal sewa belum dipilih. </span>
              Silakan tentukan tanggal mulai dan tanggal selesai sewa pada kalender di bawah.
            </div>
          </div>
        )}

        {/* Panel Pemilihan Kalender (Expandable / Interaktif) */}
        <div id="calendar-container" className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {selectionStart && (selectionEnd || isSingleDayValid)
                    ? `${startDateFormatted} – ${endDateFormatted} (${rentalDays} hari)`
                    : 'Pilih Tanggal di Kalender'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isCalendarOpen ? 'Klik untuk menutup kalender' : 'Klik untuk mengubah atau memilih tanggal sewa'}
                </div>
              </div>
            </div>
            {isCalendarOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isCalendarOpen && (
            <div className="p-4 pt-0 border-t border-slate-100 animate-in fade-in duration-200">
              <AvailabilityCalendar
                minRentDays={equipment.minRentDays ?? 1}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
                onSelectionChange={handleSelectionChange}
                dayStatus={equipment.dayStatus}
                equipment={equipment}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Selesai Memilih Tanggal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1 Frame: Panel Checkout & Profil Pemilik Terpadu (Sesuai Foto Tengah) */}
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
          onDateClick={() => {
            setIsCalendarOpen(true)
            const el = document.getElementById('calendar-container')
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }}
          onChatOwner={handleChatOwner}
          onAjukanSewa={(checkoutData) => {
            const isReady = (selectionStart && selectionEnd) || isSingleDayValid
            if (!isReady) {
              setDateWarning(true)
              setIsCalendarOpen(true)
              window.scrollTo({ top: 120, behavior: 'smooth' })
              return
            }

            setDateWarning(false)
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
      </main>
    </div>
  )
}

