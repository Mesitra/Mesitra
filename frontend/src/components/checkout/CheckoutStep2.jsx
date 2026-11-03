/**
 * CheckoutStep2.jsx — Kontrak Sewa Digital
 *
 * Fitur:
 *  - Ringkasan alat & jadwal dari Step 1 (dengan tombol "Ubah jadwal" kembali ke Step 1)
 *  - Textarea catatan untuk pemilik (sinkronisasi dua arah dengan wizard state)
 *  - Kontrak Sewa Digital Interaktif (ModalKontrakSewa.jsx)
 *  - Badge status kontrak: kuning "Wajib disetujui" → hijau "Kontrak Disetujui ✓"
 *  - Tombol "Bayar Sekarang": validasi kontrak, POST /api/orders, arahkan ke Step 3
 */

import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Loader2, TriangleAlert, MapPin, Zap, ChevronLeft,
  ScrollText, CheckCircle2, FileText, Clock, AlertCircle
} from 'lucide-react'
import ModalKontrakSewa from './ModalKontrakSewa'
import { getEquipment } from '../../lib/equipmentsApi'
import { createOrder } from '../../lib/ordersApi'
import { getSessionUser } from '../../lib/userSession'
import { formatLongDate, normalizeDate } from '../../lib/dateHelpers'

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
              <div className={`w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-400'
              }`}>
                {isDone ? '✓' : stepNum}
              </div>
              <span className={`text-[12px] font-${isActive ? 'bold' : 'medium'} ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function CheckoutStep2({ wizardData, updateWizard, onBack, onNext }) {
  const navigate = useNavigate()
  const params = useParams()
  const user = getSessionUser()
  const equipmentId = wizardData.equipmentId || params.equipmentId

  const [equipment, setEquipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [renterNotes, setRenterNotes] = useState(() => {
    if (wizardData.renterNotes) return wizardData.renterNotes
    const targetId = wizardData.equipmentId || params.equipmentId
    if (targetId) {
      try {
        const raw = sessionStorage.getItem(`checkout_draft_${targetId}`)
        if (raw) return JSON.parse(raw).renterNotes || ''
      } catch {}
    }
    return ''
  })
  const [showKontrak, setShowKontrak] = useState(false)

  // State persetujuan kontrak digital (Lifting State Up - Task 1 & Task 3)
  const [isAgreed, setIsAgreed] = useState(() => {
    if (wizardData.isAgreed) return true
    if (wizardData.contractAgreedAt) return true
    const targetId = wizardData.equipmentId || params.equipmentId
    if (targetId) {
      try {
        const raw = sessionStorage.getItem(`checkout_draft_${targetId}`)
        if (raw) {
          const draft = JSON.parse(raw)
          if (draft.isAgreed || draft.contractAgreedAt) return true
        }
      } catch {}
    }
    return false
  })

  const [contractAgreedAt, setContractAgreedAt] = useState(() => {
    if (wizardData.contractAgreedAt) return wizardData.contractAgreedAt
    const targetId = wizardData.equipmentId || params.equipmentId
    if (targetId) {
      try {
        const raw = sessionStorage.getItem(`checkout_draft_${targetId}`)
        if (raw) {
          const draft = JSON.parse(raw)
          return draft.contractAgreedAt || null
        }
      } catch {}
    }
    return null
  })

  const [contractError, setContractError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Sinkronisasi renterNotes dan isAgreed ke sessionStorage draft (Task 3)
  useEffect(() => {
    const targetId = equipmentId
    if (!targetId) return
    try {
      const draftKey = `checkout_draft_${targetId}`
      const raw = sessionStorage.getItem(draftKey)
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.renterNotes = renterNotes
      parsed.isAgreed = isAgreed
      if (isAgreed) {
        parsed.contractAgreedAt = contractAgreedAt || parsed.contractAgreedAt || new Date().toISOString()
      } else {
        parsed.contractAgreedAt = null
      }
      sessionStorage.setItem(draftKey, JSON.stringify(parsed))
    } catch {}
  }, [renterNotes, isAgreed, contractAgreedAt, equipmentId])

  // Hapus state peringatan merah (error) secara otomatis saat isAgreed bernilai true (Task 2)
  useEffect(() => {
    if (isAgreed) {
      setContractError(false)
      setSubmitError('')
    }
  }, [isAgreed])

  useEffect(() => {
    const targetId = equipmentId
    if (!targetId) { setError('ID alat tidak ditemukan'); setLoading(false); return }
    let active = true
    getEquipment(targetId)
      .then(data => { if (active) setEquipment(data) })
      .catch(err => { if (active) setError(err.message || 'Gagal memuat data alat') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [equipmentId])

  const kycData = user?.kycData || {}
  const renterName = user?.fullName || 'Penyewa'
  const businessName = kycData.businessName || renterName

  // Data untuk modal kontrak
  const contractData = useMemo(() => ({
    ownerName: equipment?.owner?.fullName || 'Pemilik Alat',
    renterName,
    businessName,
    equipmentName: equipment?.name || 'Unit Alat',
    startDate: wizardData.selectionStart ? formatLongDate(normalizeDate(wizardData.selectionStart)) : '-',
    endDate: wizardData.selectionEnd ? formatLongDate(normalizeDate(wizardData.selectionEnd)) : '-',
    rentalDays: wizardData.selectionStart && wizardData.selectionEnd
      ? Math.max(1, Math.round((new Date(wizardData.selectionEnd) - new Date(wizardData.selectionStart)) / 86400000) + 1)
      : 1,
    totalPaid: wizardData.totalPaid || 0,
    depositAmount: wizardData.depositAmount || 0,
    pricePerDay: equipment?.pricePerDay || 0,
    agreedAt: contractAgreedAt
  }), [equipment, wizardData, renterName, businessName, contractAgreedAt])

  const handleAgreeContract = (timestamp) => {
    const agreedTime = typeof timestamp === 'string' ? timestamp : new Date().toISOString()
    setIsAgreed(true)
    setContractAgreedAt(agreedTime)
    setContractError(false)
    setSubmitError('')
    setShowKontrak(false)
    updateWizard({ isAgreed: true, contractAgreedAt: agreedTime })
  }

  const handleBayarSekarang = async () => {
    // Validasi kontrak wajib disetujui (Task 2)
    if (!isAgreed) {
      setContractError(true)
      setSubmitError('Setujui kontrak sewa terlebih dahulu')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      updateWizard({ renterNotes, isAgreed: true })

      const effectiveAgreedAt = contractAgreedAt || new Date().toISOString()

      const payload = {
        equipmentId: equipmentId,
        startDate: wizardData.selectionStart,
        endDate: wizardData.selectionEnd || wizardData.selectionStart,
        rentalDays: contractData.rentalDays,
        deliveryMethod: wizardData.deliveryMethod || 'PICKUP',
        rentalCost: wizardData.rentalCost || (equipment?.pricePerDay || 0) * contractData.rentalDays,
        shippingCost: wizardData.shippingCost || 0,
        depositAmount: wizardData.depositAmount || equipment?.deposit || 0,
        totalPaid: wizardData.totalPaid || 0,
        // Checkout metadata
        addons: wizardData.addons || [],
        addonsCost: wizardData.addonsCost || 0,
        promoCode: wizardData.promoCode || '',
        discountAmount: wizardData.discountAmount || 0,
        renterNotes,
        contractAgreedAt: effectiveAgreedAt
      }

      const order = await createOrder(payload)
      // Hapus draft form dari sessionStorage setelah pesanan berhasil terbuat di database
      if (equipmentId) {
        try {
          sessionStorage.removeItem(`checkout_draft_${equipmentId}`)
        } catch {
          // ignore error
        }
      }
      updateWizard({ orderId: order.id, invoiceNumber: order.invoiceNumber })
      onNext(order.id)
    } catch (err) {
      setSubmitError(err.message || 'Gagal membuat pesanan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      <span className="text-sm text-slate-600">Memuat data…</span>
    </div>
  )

  if (error || !equipment) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4 text-center">
      <TriangleAlert className="w-6 h-6 text-amber-600" />
      <p className="text-xs text-slate-600">{error || 'Alat tidak ditemukan'}</p>
      <button onClick={() => navigate('/beranda-sewa')} className="text-sm text-blue-600 font-semibold hover:underline">Kembali ke Katalog</button>
    </div>
  )

  const totalAddons = (wizardData.addons || []).reduce((s, a) => s + (a.price || 0), 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Bar */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button onClick={() => navigate('/beranda-sewa')} className="text-[18px] text-blue-600 font-extrabold tracking-[-0.3px] cursor-pointer">
              SewaAlat
            </button>
            <div className="w-px h-[18px] bg-slate-200" />
            <span className="text-[13px] font-semibold text-slate-900">Checkout · Kontrak Digital</span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">Langkah 2 dari 3</span>
        </div>
      </header>

      <main className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 flex flex-col gap-5 py-7 pb-12">
        <WizardSteps current={2} />

        {/* Tombol Kembali */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-blue-600 font-semibold hover:underline cursor-pointer w-fit"
        >
          <ChevronLeft className="w-4 h-4" /> Ubah rincian sewa (Step 1)
        </button>

        <div className="w-full flex flex-col lg:flex-row gap-5 items-stretch lg:items-start">
          {/* ── Left Column ────────────────────────────────────────────────── */}
          <div className="w-full flex-1 min-w-0 flex flex-col gap-4.5">

            {/* Ringkasan Alat & Jadwal */}
            <div className="box-border w-full bg-white ring-1 ring-slate-200 rounded-[14px] p-4 sm:p-5 flex flex-col gap-4">
              <h2 className="text-[14px] font-bold text-slate-900">Ringkasan pesanan</h2>
              <div className="flex gap-3.5 items-center p-3.5 bg-slate-50 rounded-xl">
                {equipment.images?.[0] && (
                  <img src={equipment.images[0]} alt={equipment.name} className="w-[72px] h-[56px] rounded-[10px] object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-blue-600 font-bold uppercase">{equipment.category}</div>
                  <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">{equipment.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <MapPin className="w-3 h-3" /> {equipment.location}
                  </div>
                </div>
              </div>

              {/* Jadwal & metode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-3 bg-blue-50 rounded-xl">
                  <div className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide flex items-center gap-1"><Clock className="w-3 h-3" /> Periode Sewa</div>
                  <div className="text-[12px] font-bold text-slate-900">
                    {wizardData.selectionStart ? formatLongDate(normalizeDate(wizardData.selectionStart)) : '-'}
                  </div>
                  <div className="text-[11px] text-slate-500">s.d. {wizardData.selectionEnd ? formatLongDate(normalizeDate(wizardData.selectionEnd)) : '-'}</div>
                  <div className="text-[11px] font-semibold text-blue-700">{contractData.rentalDays} hari · 09:00–20:00 WIB</div>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Serah Terima</div>
                  <div className="text-[12px] font-bold text-slate-900">
                    {wizardData.deliveryMethod === 'COURIER' ? '🚚 Kurir Toko' : '🏪 Ambil Sendiri'}
                  </div>
                  {wizardData.addons?.length > 0 && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      +{wizardData.addons.length} layanan tambahan
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Catatan untuk Pemilik */}
            <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-3">
              <div>
                <h2 className="text-[14px] font-bold text-slate-900">Catatan untuk pemilik alat</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Opsional — informasi lokasi, kebutuhan spesifik, atau pertanyaan teknis</p>
              </div>
              <textarea
                value={renterNotes}
                onChange={e => { setRenterNotes(e.target.value); updateWizard({ renterNotes: e.target.value }) }}
                rows={4}
                placeholder="Contoh: Lokasi usaha di Jl. Sudirman No.12, akses parkir dari belakang. Tolong tiba sebelum pukul 10 pagi..."
                className="w-full px-3.5 py-3 text-[12px] bg-slate-50 ring-1 ring-slate-200 focus:ring-blue-500 rounded-xl outline-none resize-none leading-relaxed transition-all placeholder:text-slate-400"
              />
              <p className="text-[10px] text-slate-400">{renterNotes.length}/500 karakter</p>
            </div>

            {/* Kontrak Sewa Digital */}
            <div className={`bg-white ring-1 rounded-[14px] p-5 flex flex-col gap-4 transition-all ${
              contractError ? 'ring-red-400 bg-red-50/20' : isAgreed ? 'ring-emerald-300' : 'ring-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className={`w-5 h-5 ${isAgreed ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <div>
                    <h2 className="text-[14px] font-bold text-slate-900">Kontrak Sewa Digital</h2>
                    <p className="text-[11px] text-slate-500">Harus dibaca dan disetujui sebelum pembayaran</p>
                  </div>
                </div>
                {isAgreed ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 ring-1 ring-emerald-300 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-emerald-700 font-semibold">Kontrak Disetujui ✓</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 ring-1 ring-amber-300 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] text-amber-700 font-semibold">Wajib disetujui</span>
                  </div>
                )}
              </div>

              {isAgreed ? (
                <div className="flex flex-col gap-2 p-3.5 bg-emerald-50 ring-1 ring-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[12px] font-semibold text-emerald-800">
                      Kontrak disetujui oleh {renterName} ({businessName})
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-600">
                    Waktu persetujuan: {contractAgreedAt ? new Date(contractAgreedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Hari ini'}
                  </p>
                  <button onClick={() => setShowKontrak(true)} className="text-[11px] text-blue-600 font-semibold hover:underline text-left cursor-pointer">
                    Lihat detail kontrak →
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] text-slate-600 leading-relaxed">
                    Dokumen Kontrak Sewa Digital berisi ketentuan periode sewa, tanggung jawab penyewa, skema deposit escrow, dan denda keterlambatan. Bacalah dengan seksama sebelum menyetujui.
                  </p>
                  {contractError && (
                    <div className="flex items-center gap-2 p-2.5 bg-red-50 ring-1 ring-red-300 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-[11px] text-red-700 font-semibold">Setujui kontrak sewa terlebih dahulu</p>
                    </div>
                  )}
                  <button
                    onClick={() => { setContractError(false); setShowKontrak(true) }}
                    className="flex items-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-xl transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <ScrollText className="w-4 h-4" />
                    Baca &amp; Setujui Kontrak Sewa
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Ringkasan & CTA ─────────────────────────────── */}
          <div className="w-full lg:w-[340px] shrink-0 sticky top-24 flex flex-col gap-4">
            {/* Ringkasan Biaya */}
            <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-3">
              <h2 className="text-[14px] font-bold text-slate-900">Ringkasan biaya</h2>
              <div className="flex flex-col gap-2 text-[12px]">
                <div className="flex justify-between text-slate-600">
                  <span>Sewa alat ({contractData.rentalDays} hari)</span>
                  <span className="font-semibold text-slate-900">Rp {(wizardData.rentalCost || 0).toLocaleString('id-ID')}</span>
                </div>
                {(wizardData.shippingCost || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Ongkir kurir</span>
                    <span className="font-semibold text-slate-900">Rp {wizardData.shippingCost.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {(wizardData.addons || []).map(addon => (
                  <div key={addon.id} className="flex justify-between text-slate-600">
                    <span>{addon.icon || ''} {addon.label}</span>
                    <span className="font-semibold text-slate-900">Rp {addon.price.toLocaleString('id-ID')}</span>
                  </div>
                ))}
                {(wizardData.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Diskon ({wizardData.promoCode})</span>
                    <span>− Rp {wizardData.discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="h-px bg-slate-100 my-1" />
                <div className="flex justify-between text-slate-600">
                  <span>Deposit escrow</span>
                  <span className="font-semibold text-slate-900">Rp {(wizardData.depositAmount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-slate-900 font-extrabold text-[14px]">
                  <span>Total Bayar</span>
                  <span className="text-blue-600">Rp {(wizardData.totalPaid || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Nomor Invoice Preview */}
            <div className="bg-slate-900 rounded-[14px] p-4 flex flex-col gap-2">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pembayaran ke Escrow</div>
              <div className="text-[22px] font-extrabold text-white tracking-tight">
                Rp {(wizardData.totalPaid || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-400">
                Setelah klik Bayar, nomor invoice resmi akan digenerate dan Anda diarahkan ke halaman pembayaran escrow.
              </div>
            </div>

            {/* Error Submit */}
            {submitError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 ring-1 ring-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 font-semibold">{submitError}</p>
              </div>
            )}

            {/* CTA: Bayar Sekarang */}
            <button
              onClick={handleBayarSekarang}
              disabled={submitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-[14px] rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Membuat pesanan…</>
              ) : (
                `Bayar Rp ${(wizardData.totalPaid || 0).toLocaleString('id-ID')} →`
              )}
            </button>
            {!isAgreed && (
              <p className="text-[10px] text-red-600 text-center font-semibold">
                ⚠ Setujui kontrak sewa terlebih dahulu
              </p>
            )}
            <p className="text-[10px] text-slate-400 text-center">
              Dana Anda aman di escrow MyRent hingga sewa selesai
            </p>
          </div>
        </div>
      </main>

      {/* Modal Kontrak Sewa */}
      <ModalKontrakSewa
        isOpen={showKontrak}
        onClose={() => setShowKontrak(false)}
        isAgreed={isAgreed}
        setIsAgreed={setIsAgreed}
        onAgree={handleAgreeContract}
        alreadyAgreed={isAgreed}
        contractData={contractData}
      />
    </div>
  )
}
