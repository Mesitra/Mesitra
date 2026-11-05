import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import RegisterTopBar from './RegisterTopBar'
import RegisterStepper from './RegisterStepper'
import Step1BuatAkun from './Step1BuatAkun'
import Step2IdentitasKTP from './Step2IdentitasKTP'
import Step3GudangOperasional from './Step3GudangOperasional'
import Step4RekeningPencairan from './Step4RekeningPencairan'
import Step5ReviewKirim from './Step5ReviewKirim'
import VerifikasiPemilik from './VerifikasiPemilik'
import {
  clearDraft,
  clearPending,
  fetchSubmissionStatus,
  getTokenForUser,
  readDraft,
  readPending,
  writeDraft,
  writePending
} from '../../lib/registration'

const TOTAL_STEPS = 5
const STORAGE_KEY_STEP = 'myrent_register_pemilik_step'
const STORAGE_KEY_FORM = 'myrent_register_pemilik_form'
const ROLE = 'PEMILIK'

const INITIAL_PEMILIK_FORM = {
  email: 'pemilik@kopisenja.id',
  whatsapp: '081288990011',
  password: 'Password123!',
  konfirmasi: 'Password123!',
  agreeTerms: true,
  agreeEscrow: true,
  nik: '3174092188450003',
  namaKtp: 'Budi Santoso',
  tempatLahir: 'Jakarta',
  tanggalLahir: '1991-04-12',
  badanUsaha: 'Perorangan',
  npwp: '09.254.294.3-407.000',
  namaLokasi: 'Lokasi Cilandak',
  alamat: 'Jl. Cilandak Tengah No. 24, RT 04/RW 06, Cilandak Barat, Jakarta Selatan 12430',
  kota: 'Jakarta Selatan',
  kodePos: '12430',
  gps: '(-6.2891, 106.8001)',
  hariOperasional: 'Senin - Sabtu',
  jamBuka: '08:00',
  jamTutup: '18:00',
  fasilitasJaga: true,
  fasilitasParkir: true,
  fasilitasDalamRuangan: true,
  bank: 'BCA — Bank Central Asia',
  nomorRekening: '44718890221',
  namaRekening: 'Budi Santoso',
  konfirmasiKepemilikan: true,
  konfirmasiKomisi: true,
  agreeTruth: true
}

export default function RegisterPemilikAlat({ onBackToLogin, onFinish }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const handleBack = onBackToLogin || (() => navigate('/login'))

  const [currentStep, setCurrentStep] = useState(() => {
    const stepQuery = parseInt(searchParams.get('step'), 10)
    if (stepQuery >= 1 && stepQuery <= TOTAL_STEPS) {
      return stepQuery
    }

    // Checkpoint draft: user kembali dari halaman login → lanjut di step terakhir.
    const draft = readDraft(ROLE)
    if (draft?.currentStep >= 1 && draft?.currentStep <= TOTAL_STEPS) {
      return draft.currentStep
    }

    try {
      const savedStep = sessionStorage.getItem(STORAGE_KEY_STEP)
      if (savedStep) {
        const parsed = parseInt(savedStep, 10)
        if (parsed >= 1 && parsed <= TOTAL_STEPS) return parsed
      }
    } catch (e) {
      console.warn('Gagal membaca step pemilik alat dari sessionStorage:', e)
    }
    return 1
  })

  const [formData, setFormData] = useState(() => {
    const base = { ...INITIAL_PEMILIK_FORM }
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_FORM)
      if (saved) return { ...base, ...JSON.parse(saved) }
    } catch (e) {
      console.warn('Gagal membaca form pemilik:', e)
    }

    const draft = readDraft(ROLE)
    if (draft?.formData && Object.keys(draft.formData).length > 0) {
      return { ...base, ...draft.formData }
    }

    return base
  })

  const [notification, setNotification] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Lock anti-spam + status verifikasi
  const [pending, setPending] = useState(() => readPending(ROLE))
  const [statusInfo, setStatusInfo] = useState(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [isFormUnlocked, setIsFormUnlocked] = useState(false)

  const clearRegistrationSession = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_STEP)
      sessionStorage.removeItem(STORAGE_KEY_FORM)
    } catch (e) {
      console.warn('Gagal membersihkan session pemilik alat:', e)
    }
  }

  // Checkpoint draft otomatis (step terakhir + data form)
  useEffect(() => {
    try {
      writeDraft(ROLE, currentStep, formData)
    } catch {
      console.warn('Gagal menyimpan checkpoint draft pemilik.')
    }
  }, [currentStep, formData])

  const loadStatus = useCallback(async (identifier, ownerId) => {
    if (!identifier) return

    setIsCheckingStatus(true)
    try {
      // Token hanya dikirim bila memang milik pemilik pengajuan ini.
      const token = getTokenForUser(ownerId)

      const status = await fetchSubmissionStatus(identifier, token)
      setStatusInfo(status)

      setPending((prev) =>
        prev
          ? {
              ...prev,
              submissionCode: status.submissionCode ?? prev.submissionCode,
              verificationStatus: status.verificationStatus ?? prev.verificationStatus
            }
          : prev
      )

      if (status.verificationStatus === 'DISETUJUI') {
        setIsApproved(true)
        clearPending(ROLE)
      }
    } catch (err) {
      setNotification(err.message || 'Gagal memuat status pengajuan.')
      setTimeout(() => setNotification(''), 3500)
    } finally {
      setIsCheckingStatus(false)
    }
  }, [])

  useEffect(() => {
    if (!pending) return
    loadStatus(
      pending.email || pending.submissionCode || pending.userId,
      pending.userId
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_STEP, String(currentStep))
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('step', String(currentStep))
          return next
        },
        { replace: true }
      )
    } catch (e) {
      console.warn('Gagal menyimpan step pemilik alat:', e)
    }
  }, [currentStep, setSearchParams])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formData))
    } catch (e) {
      console.warn('Gagal menyimpan formData pemilik:', e)
    }
  }, [formData])

  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3500)
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStepSubmit = (stepData) => {
    const updated = { ...formData, ...stepData }
    setFormData(updated)

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((step) => step + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleFinalRegister(updated)
    }
  }

  const handleFinalRegister = async (finalData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: finalData.email,
          password: finalData.password,
          role: 'PEMILIK',
          fullName: finalData.namaKtp || finalData.namaRekening || 'Pemilik Alat',
          phone: finalData.whatsapp || '-',
          // Seluruh data Step 1-5 (termasuk metadata file foto) dikirim apa adanya.
          formData: { ...finalData, konfirmasi: undefined }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal melakukan pendaftaran akun pemilik.')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      // Draft selesai dipakai → hapus, lalu pasang lock anti-spam.
      clearDraft(ROLE)
      clearRegistrationSession()

      const lock = {
        userId: data.user?.id ?? null,
        email: data.user?.email ?? finalData.email,
        submissionCode: data.user?.submissionCode ?? null,
        verificationStatus: data.user?.verificationStatus ?? 'MENUNGGU'
      }
      writePending(ROLE, lock)
      setPending(lock)

      setStatusInfo({
        id: lock.userId,
        email: lock.email,
        submissionCode: lock.submissionCode,
        verificationStatus: lock.verificationStatus,
        revisionSteps: data.user?.revisionSteps ?? [],
        adminNote: data.user?.adminNote ?? null,
        kycData: {}
      })

      notify('Pendaftaran pemilik alat berhasil! Pengajuan Anda masuk antrean verifikasi admin.')
      setIsSubmitting(false)
      setIsSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setIsSubmitting(false)
      notify(err.message || 'Pendaftaran gagal.')
      alert(`Pendaftaran Gagal: ${err.message}`)
    }
  }

  const handleStatusPrimaryAction = () => {
    const status = statusInfo?.verificationStatus || pending?.verificationStatus || 'MENUNGGU'

    if (status === 'DISETUJUI') {
      clearPending(ROLE)
      if (onFinish) {
        onFinish()
      } else {
        navigate('/dashboard-pemilik')
      }
      return
    }

    if (status === 'PERLU_PERBAIKAN') {
      const kycData = statusInfo?.kycData
      if (kycData && typeof kycData === 'object') {
        setFormData((prev) => ({ ...prev, ...kycData }))
      }

      const steps = Array.isArray(statusInfo?.revisionSteps) ? statusInfo.revisionSteps : []
      const targetStep = steps.length > 0 ? Math.min(...steps) : 1

      setIsFormUnlocked(true)
      setCurrentStep(targetStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    navigate('/login')
  }

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((step) => step - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      clearRegistrationSession()
      handleBack()
    }
  }

  const saveDraft = () => {
    writeDraft(ROLE, currentStep, formData)
    notify('Draf pendaftaran tersimpan.')
  }

  const stepProps = {
    formData,
    onChange: handleFieldChange,
    onBack: goBack,
    onNext: handleStepSubmit,
    onSaveDraft: saveDraft,
    onNotify: notify,
    isSubmitting
  }

  // Mulai pendaftaran baru (dipakai ketika pengajuan ditolak permanen)
  const handleStartNewRegistration = () => {
    clearPending(ROLE)
    clearDraft(ROLE)
    clearRegistrationSession()
    setPending(null)
    setStatusInfo(null)
    setIsApproved(false)
    setIsSubmitted(false)
    setIsFormUnlocked(true)
    setFormData(INITIAL_PEMILIK_FORM)
    setCurrentStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const statusViewAktif =
    isSubmitted ||
    isApproved ||
    (pending && !isFormUnlocked) ||
    statusInfo?.verificationStatus === 'DITOLAK'

  if (statusViewAktif) {
    const status = statusInfo?.verificationStatus || pending?.verificationStatus || 'MENUNGGU'

    return (
      <VerifikasiPemilik
        formData={{
          ...formData,
          fullName: formData.fullName || statusInfo?.fullName || '',
          email: formData.email || statusInfo?.email || ''
        }}
        status={status}
        submissionCode={statusInfo?.submissionCode || pending?.submissionCode || null}
        revisionSteps={statusInfo?.revisionSteps || pending?.revisionSteps || []}
        adminNote={statusInfo?.adminNote ?? pending?.adminNote ?? null}
        isRefreshing={isCheckingStatus}
        onRefreshStatus={() =>
          loadStatus(
            statusInfo?.email || pending?.email || statusInfo?.submissionCode || pending?.submissionCode,
            statusInfo?.id || pending?.userId
          )
        }
        onFinish={handleStatusPrimaryAction}
        onEditData={
          status === 'PERLU_PERBAIKAN'
            ? () => {
                setIsFormUnlocked(true)
                setCurrentStep(
                  Array.isArray(statusInfo?.revisionSteps) && statusInfo.revisionSteps.length > 0
                    ? Math.min(...statusInfo.revisionSteps)
                    : 1
                )
              }
            : undefined
        }
        onStartNewRegistration={status === 'DITOLAK' ? handleStartNewRegistration : undefined}
        onBackToHome={() => navigate('/')}
        onBackToLogin={handleBack}
      />
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* Toast Notifikasi */}
      {notification && (
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-medium border border-slate-700/60 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[90vw]">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <RegisterTopBar
        roleTitle="Daftar sebagai Pemilik Alat"
        onLoginClick={handleBack}
        onHomeClick={() => navigate('/')}
        onBackToLogin={handleBack}
        onBackToHome={() => navigate('/')}
      />

      {/* Body: panel stepper (kiri) + kartu form (kanan) */}
      <main className="w-full max-w-[1140px] flex-1 flex flex-col lg:flex-row gap-9 pt-8 pb-11 px-4 sm:px-6">
        <RegisterStepper currentStep={currentStep} />

        <div className="flex-1 min-w-0 flex flex-col items-center lg:items-start">
          {currentStep === 1 && <Step1BuatAkun {...stepProps} />}
          {currentStep === 2 && <Step2IdentitasKTP {...stepProps} />}
          {currentStep === 3 && <Step3GudangOperasional {...stepProps} />}
          {currentStep === 4 && <Step4RekeningPencairan {...stepProps} />}
          {currentStep === 5 && <Step5ReviewKirim {...stepProps} />}
        </div>
      </main>
    </div>
  )
}
