import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  AlarmClock,
  CheckCircle2,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react'
import NavbarPenyewa from '../common/NavbarPenyewa'
import Step1JadwalKembali from './Step1JadwalKembali'
import Step2KondisiAlat from './Step2KondisiAlat'
import Step3FotoBAST from './Step3FotoBAST'
import Step4RefundDeposit from './Step4RefundDeposit'
import ReturnSidebarSummary from './ReturnSidebarSummary'
import { getOrder, saveReturnDraft, submitReturn } from '../../lib/ordersApi'
import { formatLongDate, normalizeDate } from '../../lib/dateHelpers'
import { getSessionUser } from '../../lib/userSession'

export default function KembalikanAlatWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getSessionUser()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Current wizard step: 1, 2, 3, or 4
  const [step, setStep] = useState(1)

  // Maximum step reached (allows going back to previous steps)
  const [maxStepReached, setMaxStepReached] = useState(1)

  // Step 2 & 3 declaration checkbox
  const [agreementChecked, setAgreementChecked] = useState(false)

  // Submitting final return
  const [submitting, setSubmitting] = useState(false)

  // Live countdown timer
  const [timeLeft, setTimeLeft] = useState('')

  // Draft state for Step 1 - 4
  const [returnData, setReturnData] = useState({
    returnMethod: 'COURIER_PICKUP',
    returnDate: null,
    returnSlot: '09:00 – 12:00 WIB',
    daysLate: 0,
    lateFee: 0,
    pickupAddress: '',
    pickupLandmark: '',
    pickupPhone: '',
    checklist: {
      mesinMenyala: true,
      bodiUtuh: true,
      komponenLengkap: true,
      kebersihanOk: true,
      adaKendala: false
    },
    accessories: [
      { id: 'portafilter', name: 'Portafilter double + single', returned: 2, total: 2 },
      { id: 'tamper', name: 'Tamper kayu / stainless', returned: 1, total: 1 },
      { id: 'pitcher', name: 'Pitcher susu 600 ml', returned: 2, total: 2 },
      { id: 'kabel', name: 'Kabel power industri', returned: 1, total: 1 }
    ],
    cleanliness: {
      backflush: true,
      driptray: true,
      tangkiAir: true
    },
    conditionNotes: '',
    photos: {
      front: null,
      side: null,
      panel: null,
      back: null,
      extra: []
    },
    signature: null,
    signedAt: null
  })

  // Load Order Data & Draft Persistence
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const orderData = await getOrder(id)
        if (!orderData) throw new Error('Pesanan tidak ditemukan')
        setOrder(orderData)

        // Jika status sudah INSPEKSI, SELESAI, atau DISPUTE, langsung buka Step 4
        if (orderData.status === 'INSPEKSI' || orderData.status === 'SELESAI' || orderData.status === 'DISPUTE') {
          setStep(4)
          setMaxStepReached(4)
        }

        // Cek draft dari localStorage atau dari database order.returnData
        const storageKey = `mesitra_return_draft_${orderData.id}`
        let savedDraft = null
        try {
          const raw = localStorage.getItem(storageKey)
          if (raw) savedDraft = JSON.parse(raw)
        } catch {
          // ignore
        }

        const initialDraft = savedDraft || orderData.returnData || {}
        const defaultMethod = orderData.deliveryMethod === 'PICKUP' ? 'STORE_DROPOFF' : 'COURIER_PICKUP'

        setReturnData((prev) => ({
          ...prev,
          ...initialDraft,
          returnMethod: initialDraft.returnMethod || defaultMethod,
          returnDate: initialDraft.returnDate ? new Date(initialDraft.returnDate) : new Date(orderData.endDate),
          pickupAddress: initialDraft.pickupAddress || user?.kycData?.address || '',
          pickupLandmark: initialDraft.pickupLandmark || user?.kycData?.landmark || '',
          pickupPhone: initialDraft.pickupPhone || user?.phone || ''
        }))
      } catch (err) {
        setError(err.message || 'Gagal memuat pesanan')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  // Save to localStorage whenever returnData changes
  useEffect(() => {
    if (!order) return
    try {
      const storageKey = `mesitra_return_draft_${order.id}`
      localStorage.setItem(storageKey, JSON.stringify(returnData))
    } catch {
      // ignore
    }
  }, [returnData, order])

  // Countdown timer for rental deadline
  useEffect(() => {
    if (!order) return

    const calculateTime = () => {
      const deadline = new Date(order.endDate)
      deadline.setHours(20, 0, 0, 0)
      const diff = deadline.getTime() - Date.now()

      if (diff <= 0) {
        setTimeLeft('Waktu sewa berakhir')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [order])

  // Simpan draf & keluar ke halaman Pesanan Saya
  const handleSaveDraftAndExit = async () => {
    try {
      if (order?.id) {
        await saveReturnDraft(order.id, returnData)
      }
      navigate('/pesanan-saya', {
        state: { successMessage: 'Draf pengembalian berhasil disimpan!' }
      })
    } catch (err) {
      alert(err.message || 'Gagal menyimpan draf di server, draf lokal tersimpan.')
      navigate('/pesanan-saya')
    }
  }

  // Validasi tombol "Lanjut" per Step
  const isNextDisabled = () => {
    if (step === 1) {
      return false
    }
    if (step === 2) {
      if (!agreementChecked) return true
      const hasIssue = returnData.checklist?.fungsiNormal === false || returnData.checklist?.adaKendala === true
      if (hasIssue && !returnData.conditionNotes?.trim()) {
        return true
      }
      return false
    }
    if (step === 3) {
      if (!agreementChecked) return true
      const p = returnData.photos || {}
      const has4Photos = !!(p.front && p.side && p.panel && p.back)
      const hasSignature = !!returnData.signature
      return !(has4Photos && hasSignature) || submitting
    }
    return false
  }

  const handleNextStep = async () => {
    if (isNextDisabled()) return

    if (step === 3) {
      try {
        setSubmitting(true)
        const updatedOrder = await submitReturn(order.id, returnData)
        if (updatedOrder) {
          setOrder(updatedOrder)
          if (updatedOrder.returnData) {
            setReturnData((prev) => ({ ...prev, ...updatedOrder.returnData }))
          }
        }
        // Bersihkan draf localStorage setelah sukses kirim BAST
        try {
          localStorage.removeItem(`mesitra_return_draft_${order.id}`)
        } catch {
          // ignore
        }
        setStep(4)
        setMaxStepReached(4)
        setAgreementChecked(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (err) {
        alert(err.message || 'Gagal mengirim BAST Akhir')
      } finally {
        setSubmitting(false)
      }
      return
    }

    const next = Math.min(4, step + 1)
    setStep(next)
    setMaxStepReached((prev) => Math.max(prev, next))
    setAgreementChecked(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stepTitles = [
    { num: 1, label: 'Jadwal kembali' },
    { num: 2, label: 'Kondisi & kelengkapan' },
    { num: 3, label: 'Foto & BAST' },
    { num: 4, label: 'Refund deposit' }
  ]

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col justify-center items-center bg-slate-50 gap-2">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Memuat formulir pengembalian alat…</span>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="w-full min-h-screen flex flex-col justify-center items-center bg-slate-50 p-4">
        <div className="p-6 bg-white ring-1 ring-slate-200 rounded-2xl max-w-md w-full text-center flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900 m-0">{error || 'Pesanan Tidak Ditemukan'}</h3>
          <p className="text-xs text-slate-500 m-0">Pastikan ID pesanan benar atau hubungi admin.</p>
          <button
            type="button"
            onClick={() => navigate('/pesanan-saya')}
            className="mt-2 py-2 px-4 bg-blue-600 text-white font-bold text-xs rounded-xl"
          >
            Kembali ke Pesanan Saya
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="box-border w-full min-h-screen flex flex-col justify-start items-start bg-slate-50 font-sans">
      {/* Global Navbar */}
      <NavbarPenyewa
        activeTab="pesanan"
        onNavigateTab={(tab) => {
          if (tab === 'jelajahi') navigate('/beranda-sewa')
          else if (tab === 'pesanan') navigate('/pesanan-saya')
          else if (tab === 'pesan') navigate('/pesan')
          else if (tab === 'dompet') navigate('/dompet')
        }}
      />

      {/* Main Container */}
      <main className="box-border w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-fit flex flex-col gap-4 py-6 pb-20">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/pesanan-saya"
              className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors no-underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Pesanan Saya</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-400 font-medium">{order.invoiceNumber}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-blue-700 font-bold">Pengembalian Alat</span>
          </div>

          {/* Tombol Simpan Draf & Keluar */}
          <button
            type="button"
            onClick={handleSaveDraftAndExit}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-50 ring-1 ring-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs"
          >
            <Save className="w-3.5 h-3.5 text-blue-600" />
            <span>Simpan draf &amp; keluar</span>
          </button>
        </div>

        {/* Page Head with Live Countdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pb-1">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              {step === 1 && 'Atur jadwal pengembalian alat'}
              {step === 2 && 'Laporkan kondisi & kelengkapan alat'}
              {step === 3 && 'Unggah foto kondisi & tanda tangan BAST'}
              {step === 4 && 'Status pengembalian & refund deposit'}
            </h1>
            <p className="text-xs text-slate-500 m-0 mt-1">
              {step === 1 && 'Pilih cara dan waktu pengembalian. Kurir toko bisa menjemput, atau antar ke gudang.'}
              {step === 2 && 'Centang yang sesuai. Ketidaksesuaian akan dibahas bersama pemilik saat inspeksi.'}
              {step === 3 && 'Dokumentasikan 4 sudut unit dan bubuhkan tanda tangan digital Anda.'}
              {step === 4 && 'Pantau proses verifikasi fisik dan penerusan refund deposit ke dompet.'}
            </p>
          </div>

          {timeLeft && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-full text-amber-800 text-xs font-bold shrink-0">
              <AlarmClock className="w-3.5 h-3.5 text-amber-600" />
              <span>Sisa {timeLeft}</span>
            </div>
          )}
        </div>

        {/* Top Stepper 1 - 4 */}
        <div className="w-full bg-white ring-1 ring-slate-200 rounded-xl p-3 flex items-center justify-between overflow-x-auto shadow-2xs">
          {stepTitles.map((s, index) => {
            const isCompleted = step > s.num
            const isCurrent = step === s.num
            const canClick = s.num <= maxStepReached

            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && setStep(s.num)}
                  className={`flex items-center gap-2 p-1 bg-transparent border-0 cursor-pointer transition-all ${
                    canClick ? 'hover:opacity-80' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-xs font-bold whitespace-nowrap ${
                      isCurrent ? 'text-blue-700' : isCompleted ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>

                {index < stepTitles.length - 1 && (
                  <div className="flex-1 h-0.5 mx-3 bg-slate-200 min-w-4 hidden sm:block"></div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Wizard Main Content (Two Columns: Step Form on Left, ReturnSidebarSummary on Right) */}
        <div className="w-full flex flex-col lg:flex-row gap-5 items-start mt-1">
          {/* Left Form Column */}
          {step === 1 && (
            <Step1JadwalKembali
              order={order}
              returnData={returnData}
              onChange={setReturnData}
            />
          )}

          {step === 2 && (
            <Step2KondisiAlat
              order={order}
              returnData={returnData}
              onChange={setReturnData}
            />
          )}

          {step === 3 && (
            <Step3FotoBAST
              order={order}
              returnData={returnData}
              onChange={setReturnData}
            />
          )}

          {step === 4 && (
            <Step4RefundDeposit
              order={order}
              returnData={returnData}
              onOrderUpdated={(updated) => {
                if (!updated) return
                setOrder(updated)
                if (updated.returnData) {
                  setReturnData((prev) => ({ ...prev, ...updated.returnData }))
                }
              }}
            />
          )}

          {/* Right Summary Sidebar (Shared across steps 1 - 3) */}
          {step < 4 && (
            <ReturnSidebarSummary
              order={order}
              step={step}
              returnData={returnData}
              onNext={handleNextStep}
              isNextDisabled={isNextDisabled()}
              submitting={submitting}
              nextLabel={
                step === 1
                  ? 'Lanjut: Cek Kondisi Alat →'
                  : step === 2
                  ? 'Lanjut: Foto & BAST →'
                  : 'Kirim BAST & Selesaikan Sewa →'
              }
              agreementChecked={agreementChecked}
              onAgreementChange={setAgreementChecked}
            />
          )}
        </div>
      </main>
    </div>
  )
}
