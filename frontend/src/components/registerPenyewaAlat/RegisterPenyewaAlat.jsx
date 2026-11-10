import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react'
import { INITIAL_FORM, getStoredDraft } from './constants'
import RegisterTopBar from './RegisterTopBar'
import VerifikasiPenyewa from './VerifikasiPenyewa'
import StepIndicator from './StepIndicator'
import Step1BuatAkun from './Step1BuatAkun'
import Step2IdentitasKTP from './Step2IdentitasKTP'
import Step3ProfilUMKM from './Step3ProfilUMKM'
import Step4AlamatRekening from './Step4AlamatRekening'
import Step5ReviewKirim from './Step5ReviewKirim'
import AlertModal from '../common/AlertModal'
import {
  clearDraft,
  clearPending,
  fetchSubmissionStatus,
  fileToPreviewDataUrl,
  getTokenForUser,
  readDraft,
  readPending,
  writeDraft,
  writePending,
  checkUniqueness
} from '../../lib/registration'

const STORAGE_KEY_STEP = 'myrent_register_penyewa_step'
const STORAGE_KEY_FORM = 'myrent_register_penyewa_form'
const ROLE = 'PENYEWA'
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000'
const API_REGISTER = `${API_BASE_URL}/api/auth/register`

const STEP_HEADER_TITLES = {
  1: {
    title: 'Identitas Akun & Kredensial',
    desc: 'Lengkapi informasi kontak dan kata sandi penanggung jawab usaha.'
  },
  2: {
    title: 'Identitas sesuai KTP',
    desc: 'Pastikan NIK dan nama persis seperti di KTP Anda.'
  },
  3: {
    title: 'Profil UMKM & Kapasitas Daya',
    desc: 'Informasi ini tampil di profil penyewa saat pemilik alat meninjau pengajuan.'
  },
  4: {
    title: 'Alamat Operasional & Rekening Refund',
    desc: 'Deposit dikembalikan ke rekening ini, bukan ke saldo aplikasi.'
  },
  5: {
    title: 'Review Data & Kirim Pendaftaran',
    desc: 'Periksa kembali seluruh data sebelum dikirim ke Admin Mesitra.'
  }
}

export default function RegisterPenyewaAlat({
  onNavigateLogin,
  onBackToLogin,
  onRegisterSuccess,
  onFinish
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const handleBack = onBackToLogin || onNavigateLogin || (() => navigate('/login'))
  const handleFinish = onFinish || onRegisterSuccess

  // 0. Lock anti-spam: bila masih ada pengajuan yang menunggu, form dikunci
  //    dan pengguna langsung diarahkan ke layar status verifikasi.
  const [pending, setPending] = useState(() => readPending(ROLE))
  const [statusInfo, setStatusInfo] = useState(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [isFormUnlocked, setIsFormUnlocked] = useState(false)

  // 1. Lazy initialization currentStep dari URL (?step=X), draft localStorage, atau sessionStorage
  const [currentStep, setCurrentStep] = useState(() => {
    const stepQuery = parseInt(searchParams.get('step'), 10)
    if (stepQuery >= 1 && stepQuery <= 5) {
      return stepQuery
    }

    // Checkpoint draft: user kembali dari halaman login → lanjut di step terakhir.
    const draft = readDraft(ROLE)
    if (draft?.currentStep >= 1 && draft?.currentStep <= 5) {
      return draft.currentStep
    }

    try {
      const savedStep = sessionStorage.getItem(STORAGE_KEY_STEP)
      if (savedStep) {
        const parsed = parseInt(savedStep, 10)
        if (parsed >= 1 && parsed <= 5) return parsed
      }
    } catch (e) {
      console.warn('Gagal membaca step dari sessionStorage:', e)
    }
    return 1
  })

  // 2. Lazy initialization formData dari sessionStorage atau localStorage draft
  const [formData, setFormData] = useState(() => {
    const draft = getStoredDraft()
    const draftForm = draft?.formData && typeof draft.formData === 'object' ? draft.formData : draft
    const base = draftForm ? { ...INITIAL_FORM, ...draftForm } : INITIAL_FORM

    try {
      const savedForm = sessionStorage.getItem(STORAGE_KEY_FORM)
      if (savedForm) {
        return { ...base, ...JSON.parse(savedForm) }
      }
    } catch (e) {
      console.warn('Gagal membaca formData dari sessionStorage:', e)
    }
    return base
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState(() => {
    return getStoredDraft() ? 'Draf tersimpan' : 'Baru saja'
  })
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCheckingUnique, setIsCheckingUnique] = useState(false)

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
    secondaryAction: null
  })

  const showAlert = (title, message, type = 'error', secondaryAction = null) => {
    setAlertModal({ isOpen: true, title, message, type, secondaryAction })
  }

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }))
  }

  const showToast = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3500)
  }

  // Membersihkan data sesi form (step + form) tanpa menghapus checkpoint draft
  const clearRegistrationSession = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_STEP)
      sessionStorage.removeItem(STORAGE_KEY_FORM)
    } catch (e) {
      console.warn('Gagal menghapus session form:', e)
    }
  }

  // 3. Checkpoint draft otomatis: step terakhir + data form disimpan ke localStorage
  useEffect(() => {
    try {
      writeDraft(ROLE, currentStep, formData)
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      setDraftSavedAt(`Disimpan pukul ${timeStr}`)
    } catch {
      console.warn('Gagal menyimpan checkpoint draft.')
    }
  }, [currentStep, formData])

  // Sinkronisasi otomatis currentStep ke sessionStorage dan URL Search Params
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
      console.warn('Gagal menyimpan step ke sessionStorage:', e)
    }
  }, [currentStep, setSearchParams])

  // Sinkronisasi otomatis formData ke sessionStorage (termasuk password, agar
  // user tidak perlu mengetik ulang setelah bolak-balik ke halaman login)
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formData))
    } catch (e) {
      console.warn('Gagal menyimpan formData ke sessionStorage:', e)
    }
  }, [formData])

  // 4. Ambil status pengajuan terbaru dari backend
  const loadStatus = useCallback(
    async (identifier, ownerId) => {
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

        // Akun sudah disetujui → aktifkan indikator & bebaskan lock anti-spam.
        if (status.verificationStatus === 'DISETUJUI') {
          setIsApproved(true)
          clearPending(ROLE)
        }
      } catch (err) {
        showToast(err.message || 'Gagal memuat status pengajuan.')
      } finally {
        setIsCheckingStatus(false)
      }
    },
    []
  )

  // Auto-load status begitu halaman dibuka (jika ada lock anti-spam)
  useEffect(() => {
    if (!pending) return
    loadStatus(
      pending.email || pending.submissionCode || pending.userId,
      pending.userId
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleBlurCheck = async (field) => {
    if (field === 'email' && formData.email) {
      const cleanEmail = formData.email.trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        try {
          const check = await checkUniqueness({ email: cleanEmail, excludeUserId: pending?.userId })
          if (check.errors?.email) {
            setErrors((prev) => ({ ...prev, email: check.errors.email }))
          }
        } catch {
          // ignore
        }
      }
    } else if (field === 'phone' && formData.phone) {
      const digits = formData.phone.replace(/\D/g, '')
      if (digits.length >= 9) {
        try {
          const check = await checkUniqueness({ phone: formData.phone, excludeUserId: pending?.userId })
          if (check.errors?.phone) {
            setErrors((prev) => ({ ...prev, phone: check.errors.phone }))
          }
        } catch {
          // ignore
        }
      }
    } else if (field === 'nik' && formData.nik) {
      const digits = formData.nik.replace(/\D/g, '')
      if (digits.length === 16) {
        try {
          const check = await checkUniqueness({ nik: formData.nik, excludeUserId: pending?.userId })
          if (check.errors?.nik) {
            setErrors((prev) => ({ ...prev, nik: check.errors.nik }))
          }
        } catch {
          // ignore
        }
      }
    } else if (field === 'bankAccount' && formData.bankAccount) {
      const digits = formData.bankAccount.replace(/\D/g, '')
      if (digits.length >= 5) {
        try {
          const check = await checkUniqueness({ bankAccount: formData.bankAccount, excludeUserId: pending?.userId })
          if (check.errors?.bankAccount) {
            setErrors((prev) => ({ ...prev, bankAccount: check.errors.bankAccount }))
          }
        } catch {
          // ignore
        }
      }
    }
  }

  const handleSaveDraft = () => {
    try {
      writeDraft(ROLE, currentStep, formData)
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      setDraftSavedAt(`Disimpan pukul ${timeStr}`)
      showToast('Draf pendaftaran Anda berhasil disimpan.')
    } catch {
      showToast('Gagal menyimpan draf secara lokal.')
    }
  }

  // 5. Unggahan berkas: user bebas memilih file gambar apa pun dari komputer.
  //    Backend menerima nama file, metadata { name, size, type } maupun data URL.
  const handleFileUpload = async (field, file) => {
    if (!file) return

    const preview = await fileToPreviewDataUrl(file)

    handleInputChange(field, {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      preview: preview || null,
      lastModified: file.lastModified
    })

    showToast(`Berkas ${file.name} berhasil dipilih.`)
  }

  const handleRemoveUpload = (field, label = 'Berkas') => {
    handleInputChange(field, null)
    showToast(`${label} dihapus.`)
  }

  const handleRefreshGps = () => {
    setIsGpsLoading(true)
    setTimeout(() => {
      const lat = (-6.2000 - Math.random() * 0.1).toFixed(4)
      const lng = (106.8000 + Math.random() * 0.05).toFixed(4)
      handleInputChange('gpsCoords', `${lat}, ${lng}`)
      setIsGpsLoading(false)
      showToast('Koordinat GPS berhasil diperbarui!')
    }, 700)
  }

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.email.trim()) {
        newErrors.email = 'Alamat email wajib diisi'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = 'Format email tidak valid (nama@domain.com)'
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Nomor WhatsApp wajib diisi'
      } else if (formData.phone.replace(/\D/g, '').length < 9) {
        newErrors.phone = 'Nomor WhatsApp minimal 9 digit'
      }
      if (!formData.password) {
        newErrors.password = 'Kata sandi wajib diisi'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Kata sandi minimal 6 karakter'
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok'
      }
    } else if (step === 2) {
      if (!formData.nik.trim()) {
        newErrors.nik = 'NIK wajib diisi'
      } else if (formData.nik.replace(/\D/g, '').length !== 16) {
        newErrors.nik = 'NIK harus tepat 16 digit angka'
      }
      if (!formData.ktpName.trim()) newErrors.ktpName = 'Nama sesuai KTP wajib diisi'
      if (!formData.birthPlace.trim()) newErrors.birthPlace = 'Tempat lahir wajib diisi'
      if (!formData.birthDate) newErrors.birthDate = 'Tanggal lahir wajib diisi'
      if (!formData.ktpFile) newErrors.ktpFile = 'Foto KTP wajib diunggah'
      if (!formData.selfieFile) newErrors.selfieFile = 'Foto selfie bersama KTP wajib diunggah'
    } else if (step === 3) {
      if (!formData.businessName.trim()) newErrors.businessName = 'Nama UMKM wajib diisi'
      if (!formData.powerCapacity) newErrors.powerCapacity = 'Pilih daya listrik usaha'
      if (!formData.frontPhoto) newErrors.frontPhoto = 'Foto tampak depan tempat usaha wajib diunggah'
    } else if (step === 4) {
      if (!formData.address.trim()) newErrors.address = 'Alamat lengkap usaha wajib diisi'
      if (!formData.city.trim()) newErrors.city = 'Kota / Kabupaten wajib diisi'
      if (!formData.district.trim()) newErrors.district = 'Kecamatan wajib diisi'
      if (!formData.postalCode.trim()) newErrors.postalCode = 'Kode pos wajib diisi'
      if (!formData.bankAccount.trim()) newErrors.bankAccount = 'Nomor rekening refund wajib diisi'
      if (!formData.bankAccountHolder.trim()) newErrors.bankAccountHolder = 'Nama pemilik rekening wajib diisi'
      if (!formData.confirmAccountOwner) {
        newErrors.confirmAccountOwner = 'Anda wajib menyatakan bahwa rekening adalah milik sendiri'
      }
      if (!formData.confirmDeduction) {
        newErrors.confirmDeduction = 'Persetujuan kebijakan deposit wajib dicentang'
      }
    } else if (step === 5) {
      if (!formData.agreeTruth) {
        newErrors.agreeTruth = 'Harap konfirmasi kebenaran data Anda'
      }
      if (!formData.agreeTerms) {
        newErrors.agreeTerms = 'Harap setujui Syarat & Ketentuan Layanan Mesitra'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 6. Kirim seluruh data Step 1-5 ke backend
  const handleSubmitFinal = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(API_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: 'PENYEWA',
          fullName: formData.fullName || formData.ktpName || formData.businessName || 'Penyewa UMKM',
          phone: formData.phone,
          // Seluruh data Step 1-5 (termasuk metadata file foto) dikirim apa adanya.
          formData: {
            ...formData,
            confirmPassword: undefined,
            agreeTruth: !!formData.agreeTruth,
            agreeTerms: !!formData.agreeTerms
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Pendaftaran gagal diproses oleh server'
        throw new Error(errorMsg)
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
        email: data.user?.email ?? formData.email,
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

      showToast('Pendaftaran berhasil! Pengajuan Anda masuk antrean verifikasi admin.')
      setIsSubmitting(false)
      setIsSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setIsSubmitting(false)
      const errorMsg = err.message || 'Pendaftaran gagal diproses oleh server'
      const isEmailTaken = errorMsg.toLowerCase().includes('email sudah terdaftar')

      showAlert(
        'Pendaftaran Gagal',
        errorMsg,
        'error',
        isEmailTaken
          ? {
              label: 'Masuk ke Akun Sekarang',
              onClick: () => {
                closeAlert()
                navigate('/login')
              }
            }
          : null
      )
    }
  }

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      showToast('Harap periksa kolom formulir yang masih belum terisi dengan benar.')
      return
    }

    // Step 1: Validasi keunikan Email & Nomor Telepon sebelum lanjut ke Step 2
    if (currentStep === 1) {
      setIsCheckingUnique(true)
      try {
        const check = await checkUniqueness({
          email: formData.email,
          phone: formData.phone,
          excludeUserId: pending?.userId
        })
        if (!check.available && Object.keys(check.errors).length > 0) {
          setErrors((prev) => ({ ...prev, ...check.errors }))
          const firstErr = check.errors.email || check.errors.phone || 'Data sudah digunakan oleh akun lain.'
          showToast(firstErr)
          return
        }
      } catch (err) {
        console.warn('Pengecekan keunikan data Step 1 gagal:', err)
      } finally {
        setIsCheckingUnique(false)
      }
    }

    // Step 2: Validasi keunikan NIK KTP sebelum lanjut ke Step 3
    if (currentStep === 2) {
      setIsCheckingUnique(true)
      try {
        const check = await checkUniqueness({
          nik: formData.nik,
          excludeUserId: pending?.userId
        })
        if (!check.available && check.errors?.nik) {
          setErrors((prev) => ({ ...prev, nik: check.errors.nik }))
          showToast(check.errors.nik)
          return
        }
      } catch (err) {
        console.warn('Pengecekan keunikan NIK Step 2 gagal:', err)
      } finally {
        setIsCheckingUnique(false)
      }
    }

    // Step 4: Validasi keunikan Nomor Rekening sebelum lanjut ke Step 5
    if (currentStep === 4) {
      setIsCheckingUnique(true)
      try {
        const check = await checkUniqueness({
          bankAccount: formData.bankAccount,
          excludeUserId: pending?.userId
        })
        if (!check.available && check.errors?.bankAccount) {
          setErrors((prev) => ({ ...prev, bankAccount: check.errors.bankAccount }))
          showToast(check.errors.bankAccount)
          return
        }
      } catch (err) {
        console.warn('Pengecekan keunikan rekening Step 4 gagal:', err)
      } finally {
        setIsCheckingUnique(false)
      }
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleSubmitFinal()
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Kembali ke login: checkpoint draft di localStorage tetap disimpan
      // supaya data yang sudah diisi tidak hilang saat user kembali lagi.
      clearRegistrationSession()
      if (handleBack) {
        handleBack()
      } else {
        navigate('/login')
      }
    }
  }

  // 7. Aksi utama pada layar status
  const handleStatusPrimaryAction = () => {
    const status = statusInfo?.verificationStatus || pending?.verificationStatus || 'MENUNGGU'

    if (status === 'DISETUJUI') {
      clearPending(ROLE)
      if (handleFinish) {
        handleFinish({
          email: formData.email,
          fullName: formData.fullName || formData.ktpName || 'Penyewa UMKM',
          businessName: formData.businessName,
          role: 'penyewa'
        })
      } else {
        navigate('/beranda-sewa')
      }
      return
    }

    if (status === 'PERLU_PERBAIKAN') {
      // Buka kembali formulir dengan data sebelumnya untuk diperbaiki.
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
    setFormData(INITIAL_FORM)
    setCurrentStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const statusViewAktif =
    isSubmitted || isApproved || (pending && !isFormUnlocked) || statusInfo?.verificationStatus === 'DITOLAK'

  // Tampilan Halaman Verifikasi Admin (Status View / layar tunggu)
  if (statusViewAktif) {
    const status =
      statusInfo?.verificationStatus || pending?.verificationStatus || 'MENUNGGU'

    return (
      <VerifikasiPenyewa
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

  const stepMeta = STEP_HEADER_TITLES[currentStep] || STEP_HEADER_TITLES[1]

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between items-center text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* Toast Notifikasi */}
      {notification && (
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-medium border border-slate-700/60 animate-in fade-in slide-in-from-top-4 duration-300 max-w-[90vw]">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Alert Modal Dinamis di Tengah Layar */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        secondaryAction={alertModal.secondaryAction}
      />

      <RegisterTopBar
        roleTitle="Daftar sebagai Penyewa UMKM"
        onBackToLogin={handleBack}
        onBackToHome={() => navigate('/')}
      />

      {/* Body: 2 Kolom (Stepper Kiri + Form Kanan) */}
      <main className="w-full max-w-[1240px] flex-1 px-4 sm:px-8 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
          {/* Kolom Kiri: Sidebar Stepper (Disembunyikan di Mobile < lg, Muncul di Desktop >= lg) */}
          <StepIndicator currentStep={currentStep} onSelectStep={setCurrentStep} />

          {/* Kolom Kanan: Card Form */}
          <div className="w-full flex-1 max-w-[760px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8 flex flex-col gap-6">
            {/* Card Header */}
            <div className="flex flex-row justify-between items-start gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold tracking-[0.9px] text-blue-600 uppercase">
                  LANGKAH {currentStep} DARI 5
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {stepMeta.title}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-600">
                  {stepMeta.desc}
                </p>
              </div>

              {/* Badge Status Draf */}
              <div className="shrink-0 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-semibold text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{draftSavedAt}</span>
              </div>
            </div>

            {/* Segmented Progress Bar (5 Segmen) */}
            <div className="w-full flex flex-row gap-1.5">
              {[1, 2, 3, 4, 5].map((seg) => (
                <div
                  key={seg}
                  className={`flex-1 h-[5px] rounded-full transition-all duration-300 ${
                    seg <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* FORM KONTEN PER LANGKAH */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleNext()
              }}
              className="flex flex-col gap-5 pt-1"
            >
              {currentStep === 1 && (
                <Step1BuatAkun
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showConfirmPassword={showConfirmPassword}
                  setShowConfirmPassword={setShowConfirmPassword}
                  onBlurCheck={handleBlurCheck}
                />
              )}

              {currentStep === 2 && (
                <Step2IdentitasKTP
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  handleFileUpload={handleFileUpload}
                  handleRemoveUpload={handleRemoveUpload}
                  onBlurCheck={handleBlurCheck}
                />
              )}

              {currentStep === 3 && (
                <Step3ProfilUMKM
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  handleFileUpload={handleFileUpload}
                  handleRemoveUpload={handleRemoveUpload}
                />
              )}

              {currentStep === 4 && (
                <Step4AlamatRekening
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  handleRefreshGps={handleRefreshGps}
                  isGpsLoading={isGpsLoading}
                  onBlurCheck={handleBlurCheck}
                />
              )}

              {currentStep === 5 && (
                <Step5ReviewKirim
                  formData={formData}
                  errors={errors}
                  handleInputChange={handleInputChange}
                  onJumpToStep={setCurrentStep}
                />
              )}

              {/* FOOTER ACTIONS */}
              <div className="pt-4 border-t border-slate-200 flex flex-row items-center justify-between gap-3">
                {/* Tombol Kembali: Ke Halaman Login & Beranda Bersamaan */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title={currentStep === 1 ? 'Kembali ke Halaman Login' : 'Kembali ke Langkah Sebelumnya'}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{currentStep === 1 ? 'Ke Halaman Login' : 'Kembali'}</span>
                  </button>

                  {currentStep === 1 && (
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Kembali ke Beranda"
                    >
                      <span>atau ke Beranda</span>
                    </button>
                  )}
                </div>

                {/* Tombol Aksi Kanan: Simpan Draf & Lanjut */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="hidden sm:inline-flex items-center px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 rounded-[10px] transition-all cursor-pointer shadow-2xs"
                  >
                    Simpan Draf
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isCheckingUnique}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-semibold rounded-[10px] transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengirim Data...</span>
                      </>
                    ) : isCheckingUnique ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Memeriksa Data...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {currentStep === 1 && 'Lanjut ke Verifikasi KTP'}
                          {currentStep === 2 && 'Lanjut ke Profil UMKM'}
                          {currentStep === 3 && 'Lanjut ke Alamat'}
                          {currentStep === 4 && 'Lanjut ke Review'}
                          {currentStep === 5 && 'Kirim Data Verifikasi'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-[11px] text-slate-400">
        © 2026 Mesitra. Platform Sewa Alat Terverifikasi untuk UMKM Indonesia.
      </footer>
    </div>
  )
}
