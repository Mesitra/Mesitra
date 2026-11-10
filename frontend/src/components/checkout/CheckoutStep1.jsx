/**
 * CheckoutStep1.jsx — Rincian Sewa
 *
 * Fitur:
 *  - Tombol kembali ke detail alat
 *  - Data alat & pemilik dari backend (GET /api/equipments/:id)
 *  - Jadwal sewa interaktif (bisa ubah via AvailabilityCalendar)
 *  - Metode serah terima tetap mengikuti pilihan di awal (locked / read-only)
 *  - Ringkasan Biaya real-time di sidebar kanan
 */

import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, TriangleAlert, MapPin, Zap, ChevronRight,
  MessageCircle, Clock, ArrowLeft, Lock, Check, Truck, Store
} from 'lucide-react'
import AvailabilityCalendar from '../detailAlat/AvailabilityCalendar'
import { getEquipment, formatRupiah } from '../../lib/equipmentsApi'
import {
  diffDays, formatLongDate, normalizeDate
} from '../../lib/dateHelpers'

// ── Progress Steps ──────────────────────────────────────────────────────────
function WizardSteps({ current }) {
  const steps = ['Rincian Sewa', 'Kontrak Digital', 'Pembayaran Escrow']
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isDone = stepNum < current
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white ring-1 ring-slate-200 text-slate-400'
                }`}
              >
                {isDone ? <Check className="w-3 h-3" /> : stepNum}
              </div>
              <span
                className={`text-[12px] font-${isActive ? 'bold' : 'medium'} ${
                  isActive ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Helper Session Storage Draft ──────────────────────────────────────────────
function getDraft(equipmentId) {
  if (!equipmentId) return null
  try {
    const raw = sessionStorage.getItem(`checkout_draft_${equipmentId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function CheckoutStep1({ wizardData, updateWizard, onNext }) {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Baca draft form dari sessionStorage jika ada
  const draft = useMemo(() => getDraft(wizardData.equipmentId), [wizardData.equipmentId])

  // Kalender
  const [selectionStart, setSelectionStart] = useState(() => {
    const val = wizardData.selectionStart || draft?.selectionStart
    return val ? normalizeDate(val) : null
  })
  const [selectionEnd, setSelectionEnd] = useState(() => {
    const val = wizardData.selectionEnd || draft?.selectionEnd
    return val ? normalizeDate(val) : null
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [dateWarning, setDateWarning] = useState(false)

  // Metode serah terima tetap mengikuti pilihan di awal dari DetailAlat (wizardData.deliveryMethod)
  const initialMethod = wizardData.deliveryMethod || draft?.deliveryMethod || 'PICKUP'
  const [deliveryMethod, setDeliveryMethod] = useState(initialMethod)

  useEffect(() => {
    if (wizardData.deliveryMethod && wizardData.deliveryMethod !== deliveryMethod) {
      setDeliveryMethod(wizardData.deliveryMethod)
    }
  }, [wizardData.deliveryMethod, deliveryMethod])

  // Chat owner modal
  const [showChat, setShowChat] = useState(false)

  // Ambil data alat
  useEffect(() => {
    if (!wizardData.equipmentId) {
      setError('ID alat tidak ditemukan')
      setLoading(false)
      return
    }
    let active = true
    getEquipment(wizardData.equipmentId)
      .then((data) => {
        if (active) setEquipment(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat data alat')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [wizardData.equipmentId])

  // Hitung jumlah hari
  const rentalDays = useMemo(() => {
    if (selectionStart && selectionEnd) return Math.max(1, diffDays(selectionStart, selectionEnd) + 1)
    if (selectionStart && !selectionEnd) return 1
    return 0
  }, [selectionStart, selectionEnd])

  // Ongkos kirim kurir toko (dari kustom pemilik alat, default 45000)
  const courierCost =
    equipment?.deliveryFee !== undefined && equipment?.deliveryFee !== null
      ? Number(equipment.deliveryFee)
      : 45000

  const effectiveShippingCost = deliveryMethod === 'COURIER' ? courierCost : 0

  // Subtotal sewa
  const rentalCost = (equipment?.pricePerDay || 0) * rentalDays
  const subtotal = rentalCost + effectiveShippingCost

  // Total bayar (termasuk deposit yang ditahan escrow)
  const totalPayment = subtotal + (equipment?.deposit || 0)

  // Lanjut ke Step 2
  const handleNext = () => {
    if (rentalDays === 0) {
      setDateWarning(true)
      return
    }
    setDateWarning(false)

    const patch = {
      selectionStart: selectionStart?.toISOString().slice(0, 10),
      selectionEnd: selectionEnd?.toISOString().slice(0, 10),
      deliveryMethod,
      addons: [],
      addonsCost: 0,
      promoCode: '',
      discountAmount: 0,
      rentalCost,
      shippingCost: effectiveShippingCost,
      depositAmount: equipment?.deposit || 0,
      subtotal,
      totalPaid: totalPayment
    }
    updateWizard(patch)
    onNext(patch)
  }

  // Simpan draft form ke sessionStorage
  useEffect(() => {
    if (!wizardData.equipmentId) return
    const draftKey = `checkout_draft_${wizardData.equipmentId}`
    const draftData = {
      equipmentId: wizardData.equipmentId,
      selectionStart: selectionStart ? selectionStart.toISOString().slice(0, 10) : null,
      selectionEnd: selectionEnd ? selectionEnd.toISOString().slice(0, 10) : null,
      deliveryMethod,
      addons: [],
      addonsCost: 0,
      promoCode: '',
      discountAmount: 0,
      rentalCost,
      shippingCost: effectiveShippingCost,
      depositAmount: equipment?.deposit || 0,
      totalPaid: totalPayment
    }
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draftData))
    } catch {
      // ignore storage error
    }
  }, [
    wizardData.equipmentId,
    selectionStart,
    selectionEnd,
    deliveryMethod,
    rentalCost,
    effectiveShippingCost,
    equipment?.deposit,
    totalPayment
  ])

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm text-slate-600">Memuat rincian sewa…</span>
      </div>
    )

  if (error || !equipment)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <TriangleAlert className="w-6 h-6 text-amber-600" />
        <h1 className="text-base font-bold text-slate-900">Gagal memuat data alat</h1>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={() => navigate('/beranda-sewa')}
          className="text-sm text-blue-600 font-semibold hover:underline mt-1 cursor-pointer"
        >
          Kembali ke Katalog
        </button>
      </div>
    )

  const minRentDays = equipment.maintenanceBufferDays || 1
  const calYear = new Date().getFullYear()
  const calMonth = new Date().getMonth()

  const targetEquipmentId = wizardData.equipmentId || equipment.id

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Bar */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate(`/alat/${targetEquipmentId}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
              title="Kembali ke Detail Alat"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
            <div className="w-px h-[18px] bg-slate-200" />
            <button
              onClick={() => navigate('/beranda-sewa')}
              className="text-[18px] text-blue-600 font-extrabold tracking-[-0.3px] cursor-pointer"
            >
              SewaAlat
            </button>
            <div className="hidden sm:block w-px h-[18px] bg-slate-200" />
            <span className="hidden sm:inline text-[13px] font-semibold text-slate-900">
              Checkout · Rincian sewa
            </span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
            Langkah 1 dari 3
          </span>
        </div>
      </header>

      <main className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 flex flex-col gap-5 py-6 pb-12">
        {/* Tombol Navigasi Kembali ke Detail Alat (Breadcrumb Action) */}
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={() => navigate(`/alat/${targetEquipmentId}`)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer group w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-blue-600" />
            <span>Kembali ke Detail Alat</span>
          </button>
        </div>

        {/* Wizard Steps */}
        <WizardSteps current={1} />

        <div className="w-full flex flex-col lg:flex-row gap-5 items-stretch lg:items-start">
          {/* ── Left Column ────────────────────────────────────────────────── */}
          <div className="w-full flex-1 min-w-0 flex flex-col gap-4.5">
            {/* Alat & Jadwal Sewa */}
            <div className="box-border w-full bg-white ring-1 ring-slate-200 rounded-[14px] p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-slate-900">Alat &amp; jadwal sewa</h2>
                <button
                  onClick={() => setShowCalendar((v) => !v)}
                  className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  {showCalendar ? 'Tutup kalender' : 'Ubah jadwal'}
                </button>
              </div>

              {/* Kartu alat mini */}
              <div className="flex gap-3.5 items-center w-full justify-between">
                <div className="flex gap-3.5 items-center flex-1 min-w-0">
                  {equipment.images?.[0] && (
                    <img
                      src={equipment.images[0]}
                      alt={equipment.name}
                      className="w-[84px] h-[68px] sm:w-[92px] sm:h-[72px] rounded-[10px] object-cover shrink-0"
                    />
                  )}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wide">
                      {equipment.category}
                    </span>
                    <span className="text-[13px] font-bold text-slate-900 leading-tight">
                      {equipment.name}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{equipment.location}</span>
                      <span className="text-slate-300">·</span>
                      <Zap className="w-3 h-3 shrink-0" /> <span>{equipment.powerWatt} W</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <div className="text-[14px] font-extrabold text-slate-900">
                    Rp {equipment.pricePerDay.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-slate-400">/hari</div>
                </div>
              </div>

              {/* Jadwal banner */}
              <div className="w-full bg-blue-50/80 ring-1 ring-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[12px] text-slate-700 font-semibold flex-wrap">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {rentalDays > 0 ? (
                      <>
                        <span>{formatLongDate(selectionStart)}</span>
                        <span className="text-slate-400">→</span>
                        <span>{formatLongDate(selectionEnd || selectionStart)}</span>
                      </>
                    ) : (
                      <span className="text-slate-500">Pilih tanggal sewa di kalender</span>
                    )}
                  </div>
                  {rentalDays > 0 && (
                    <div className="text-[11px] text-blue-700 font-semibold">
                      Durasi: {rentalDays} hari · 09:00 – 20:00 WIB
                    </div>
                  )}
                </div>
                {dateWarning && (
                  <div className="text-[11px] text-amber-700 font-semibold bg-amber-50 ring-1 ring-amber-200 px-2 py-1 rounded-lg shrink-0 w-fit">
                    Pilih tanggal dulu!
                  </div>
                )}
              </div>

              {/* Kalender */}
              {showCalendar && (
                <div className="mt-1 w-full">
                  <AvailabilityCalendar
                    monthTitle={`Ketersediaan ${new Date(calYear, calMonth).toLocaleString('id-ID', {
                      month: 'long',
                      year: 'numeric'
                    })}`}
                    year={calYear}
                    month={calMonth}
                    minRentDays={minRentDays}
                    selectionStart={selectionStart}
                    selectionEnd={selectionEnd}
                    equipment={equipment}
                    onSelectionChange={(start, end) => {
                      setSelectionStart(start)
                      setSelectionEnd(end)
                      setDateWarning(false)
                    }}
                  />
                </div>
              )}

              {/* Tombol Tanya Pemilik */}
              <button
                type="button"
                onClick={() => setShowChat(true)}
                className="w-full flex items-center justify-between text-[12px] font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 p-2.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Tanya pemilik sebelum bayar</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </button>
            </div>

            {/* Metode Serah Terima (Terkunci sesuai pilihan di awal) */}
            <div className="box-border w-full bg-white ring-1 ring-slate-200 rounded-[14px] p-4 sm:p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <h2 className="text-[14px] font-bold text-slate-900">Metode serah terima</h2>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 select-none shrink-0">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Sesuai pilihan di detail alat
                </span>
              </div>

              <div className="w-full p-3.5 sm:p-4 rounded-xl ring-2 ring-blue-600 bg-blue-50/70 flex items-center justify-between gap-3 transition-all">
                <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    {deliveryMethod === 'COURIER' ? (
                      <Truck className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Store className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 text-left flex-1 min-w-0">
                    <span className="text-[13px] font-bold text-slate-900 truncate">
                      {deliveryMethod === 'COURIER' ? 'Diantar kurir toko' : 'Ambil di gudang pemilik'}
                    </span>
                    <span className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                      {deliveryMethod === 'COURIER'
                        ? 'Kurir toko mengantar langsung ke alamat usaha Anda'
                        : `${equipment.location} · Ambil & kembalikan mandiri ke lokasi pemilik`}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span
                    className={`text-[13px] font-bold ${
                      deliveryMethod === 'COURIER' ? 'text-slate-900' : 'text-emerald-600'
                    }`}
                  >
                    {deliveryMethod === 'COURIER'
                      ? `+ Rp ${(equipment.deliveryFee ?? 45000).toLocaleString('id-ID')}`
                      : 'Gratis'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Ringkasan Biaya ───────────────────────────────── */}
          <div className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-24">
            <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-4">
              <h2 className="text-[14px] font-bold text-slate-900">Ringkasan biaya</h2>

              {/* Detail baris biaya */}
              <div className="flex flex-col gap-2.5 text-[12px]">
                <div className="flex justify-between text-slate-600">
                  <span>
                    Sewa alat ({rentalDays} hari × Rp {(equipment?.pricePerDay || 0).toLocaleString('id-ID')})
                  </span>
                  <span className="font-semibold text-slate-900">Rp {rentalCost.toLocaleString('id-ID')}</span>
                </div>

                {effectiveShippingCost > 0 ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Ongkir kurir toko</span>
                    <span className="font-semibold text-slate-900">
                      Rp {effectiveShippingCost.toLocaleString('id-ID')}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>Metode serah terima</span>
                    <span className="font-semibold text-emerald-600">Ambil sendiri (Gratis)</span>
                  </div>
                )}

                <div className="h-px bg-slate-100 my-1" />
                <div className="flex justify-between text-slate-600">
                  <span>Deposit (ditahan escrow)</span>
                  <span className="font-semibold text-slate-900">
                    Rp {(equipment?.deposit || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-slate-900 font-extrabold text-[14px]">
                  <span>Total Bayar</span>
                  <span className="text-blue-600">Rp {totalPayment.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleNext}
                disabled={rentalDays === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-[14px] rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                {rentalDays === 0 ? 'Pilih tanggal sewa dulu' : `Lanjut ke Kontrak Sewa →`}
              </button>
              <p className="text-[10px] text-slate-400 text-center m-0">
                Dilindungi escrow Mesitra · 100% aman
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Chat Pemilik (sederhana) */}
      {showChat && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-[15px] font-bold text-slate-900">Hubungi Pemilik Alat</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              {equipment?.owner?.photo ? (
                <img
                  src={equipment.owner.photo}
                  alt={equipment?.owner?.displayName || equipment?.owner?.fullName || 'Pemilik Alat'}
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center shrink-0">
                  {equipment?.owner?.displayName?.charAt(0) || equipment?.owner?.fullName?.charAt(0) || 'P'}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-slate-900 truncate">
                  {equipment?.owner?.displayName || equipment?.owner?.fullName || 'Pemilik Alat'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{equipment?.owner?.email}</div>
              </div>
            </div>
            <p className="text-[12px] text-slate-600">
              Hubungi pemilik alat via WhatsApp untuk pertanyaan seputar alat, jadwal, atau informasi teknis
              sebelum memesan.
            </p>
            {equipment?.owner?.phone && (
              <a
                href={`https://wa.me/${equipment.owner.phone
                  .replace(/[^0-9]/g, '')
                  .replace(/^0/, '62')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-bold rounded-xl text-center transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat via WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => setShowChat(false)}
              className="w-full py-2 text-[12px] text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
