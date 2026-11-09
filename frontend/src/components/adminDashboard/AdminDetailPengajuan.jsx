import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  X,
  PencilLine,
  Mail,
  MapPin,
  Clock,
  Image as ImageIcon,
  Maximize2,
  Zap,
  Store,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import ModalTolakPengajuan from './ModalTolakPengajuan'
import ModalMintaPerbaikan from './ModalMintaPerbaikan'
import StatusBadge from './StatusBadge'
import { logoutAdmin } from '../adminAuth/adminSession'
import {
  approveSubmission,
  fetchSubmission,
  fetchSubmissions,
  rejectSubmission,
  requestRevision
} from './adminApi'
import { formatDateTime, formatRelativeTime } from '../../lib/registration'
import {
  CHECKLIST_VERIFIKASI,
  STATUS_MENUNGGU,
  buildRiwayatPengajuan,
  buildStepsFromKycData
} from './adminDashboardData'

/**
 * Halaman detail pengajuan admin HQ.
 *
 * Data diambil dari backend:
 *  - `GET /api/admin/submissions/:id`  → detail pengajuan + `kycData`
 *  - `GET /api/admin/submissions`      → daftar pengajuan (posisi & navigasi)
 *
 * `kycData` dipetakan menjadi 5 kartu langkah sesuai alur registrasi MyRent:
 *  1. Akun & Kredensial
 *  2. Identitas & KTP
 *  3. Profil UMKM & Daya Listrik (Penyewa) / Lokasi & Gudang Operasional (Pemilik)
 *  4. Alamat & Rekening (Penyewa) / Rekening Pencairan (Pemilik)
 *  5. Review & Persetujuan
 *
 * @param {function} props.onLogout - callback logout opsional
 */
const CHECKLIST_STORAGE_PREFIX = 'myrent_admin_checklist_'

function readChecklistFromStorage(keys) {
  const keyList = (Array.isArray(keys) ? keys : [keys]).filter(Boolean)
  for (const k of keyList) {
    try {
      const raw = localStorage.getItem(`${CHECKLIST_STORAGE_PREFIX}${k}`)
      if (raw !== null) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // abaikan error storage
    }
  }
  return []
}

function writeChecklistToStorage(keys, items) {
  const keyList = (Array.isArray(keys) ? keys : [keys]).filter(Boolean)
  for (const k of keyList) {
    try {
      localStorage.setItem(`${CHECKLIST_STORAGE_PREFIX}${k}`, JSON.stringify(items))
    } catch {
      // abaikan error storage
    }
  }
}

export default function AdminDetailPengajuan({ onLogout }) {
  const navigate = useNavigate()
  const params = useParams()

  const [modalPerbaikan, setModalPerbaikan] = useState(false)
  const [modalTolak, setModalTolak] = useState(false)
  const [toast, setToast] = useState('')
  const [stepTerbuka, setStepTerbuka] = useState(() => [true, true, true, true, true])
  // Checklist verifikasi: tersimpan di localStorage agar saat admin keluar dan masuk lagi,
  // status centang tidak hilang.
  const [checkedItems, setCheckedItems] = useState(() => readChecklistFromStorage([params.id]))

  const [pengajuan, setPengajuan] = useState(null)
  const [daftar, setDaftar] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isActing, setIsActing] = useState(false)
  // Pratinjau dokumen layar penuh (KTP / foto usaha).
  const [zoomedImage, setZoomedImage] = useState(null)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    logoutAdmin(navigate)
  }

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3500)
  }

  const loadPengajuan = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [detail, list] = await Promise.all([
        fetchSubmission(params.id),
        fetchSubmissions()
      ])

      if (!detail) {
        setError('Pengajuan tidak ditemukan.')
        setPengajuan(null)
      } else {
        setPengajuan(detail)
      }

      setDaftar(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err.message || 'Gagal memuat detail pengajuan.')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadPengajuan()
  }, [loadPengajuan])

  // Tutup pratinjau gambar dengan tombol Escape.
  useEffect(() => {
    if (!zoomedImage) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setZoomedImage(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomedImage])

  // Sinkronkan state checklist saat admin berpindah ke pengajuan lain.
  const [idTerpantau, setIdTerpantau] = useState(params.id)
  if (params.id !== idTerpantau) {
    setIdTerpantau(params.id)
    setCheckedItems(readChecklistFromStorage([params.id]))
    setZoomedImage(null)
  }

  // Sinkronkan checklist begitu data pengajuan (ID / submissionCode) selesai dimuat
  useEffect(() => {
    if (pengajuan) {
      const keys = [pengajuan.id, pengajuan.submissionCode, params.id].filter(Boolean)
      const hasStored = keys.some((k) => localStorage.getItem(`${CHECKLIST_STORAGE_PREFIX}${k}`) !== null)
      if (hasStored) {
        setCheckedItems(readChecklistFromStorage(keys))
      }
    }
  }, [pengajuan, params.id])

  const langkah = useMemo(
    () =>
      buildStepsFromKycData(pengajuan?.kycData, pengajuan?.role, {
        fullName: pengajuan?.fullName,
        email: pengajuan?.email,
        phone: pengajuan?.phone,
        whatsapp: pengajuan?.phone
      }),
    [pengajuan]
  )

  const posisi = daftar.findIndex(
    (item) => item.id === pengajuan?.id || item.submissionCode === pengajuan?.submissionCode
  )
  const navigasiSebelumnya = posisi > 0 ? daftar[posisi - 1] : null
  const navigasiBerikutnya =
    posisi > -1 && posisi < daftar.length - 1 ? daftar[posisi + 1] : null

  const statusAktif = pengajuan?.verificationStatus || STATUS_MENUNGGU
  const jumlahMenunggu = daftar.filter((item) => item.verificationStatus === STATUS_MENUNGGU).length
  const riwayat = useMemo(() => buildRiwayatPengajuan(pengajuan), [pengajuan])

  const handleSetujui = async () => {
    if (!pengajuan) return
    setIsActing(true)
    try {
      const updated = await approveSubmission(pengajuan.id)
      if (updated) setPengajuan(updated)
      showToast(
        `Akun ${pengajuan.nama || pengajuan.fullName} disetujui. Pengaju sudah bisa masuk ke beranda.`
      )
    } catch (err) {
      showToast(err.message || 'Gagal menyetujui pengajuan.')
    } finally {
      setIsActing(false)
    }
  }

  const handleMintaPerbaikan = async (payload) => {
    if (!pengajuan) return
    setIsActing(true)
    try {
      const updated = await requestRevision(pengajuan.id, payload.steps, payload.pesan)
      if (updated) setPengajuan(updated)
      const daftarStep = payload.steps.map((nomor) => `Step ${nomor}`).join(', ')
      showToast(`Permintaan perbaikan dikirim ke pengaju untuk ${daftarStep}.`)
    } catch (err) {
      showToast(err.message || 'Gagal mengirim permintaan perbaikan.')
    } finally {
      setIsActing(false)
    }
  }

  const handleTolak = async (payload) => {
    if (!pengajuan) return
    setIsActing(true)
    try {
      const updated = await rejectSubmission(pengajuan.id, payload.alasan, payload.pesan)
      if (updated) setPengajuan(updated)
      showToast(`Pengajuan ditolak permanen · ${payload.alasan}.`)
    } catch (err) {
      showToast(err.message || 'Gagal menolak pengajuan.')
    } finally {
      setIsActing(false)
    }
  }

  const toggleStep = (index) => {
    setStepTerbuka((prev) => prev.map((open, i) => (i === index ? !open : open)))
  }

  const toggleChecklist = (index) => {
    setCheckedItems((prev) => {
      const next = prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
      const keys = [params.id, pengajuan?.id, pengajuan?.submissionCode].filter(Boolean)
      writeChecklistToStorage(keys, next)
      return next
    })
  }

  const checklistSelesai = checkedItems.length

  // ── Tampilan memuat ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-row items-stretch">
        <AdminSidebar activeKey="verifikasi" counts={{ verifikasi: 0 }} onLogout={handleLogout} />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <RefreshCw className="w-5 h-5 text-[#2563EB] animate-spin" />
            <p className="text-sm font-semibold text-[#475569]">Memuat detail pengajuan...</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Tampilan error ──────────────────────────────────────────────────────
  if (error || !pengajuan) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-row items-stretch">
        <AdminSidebar activeKey="verifikasi" counts={{ verifikasi: jumlahMenunggu }} onLogout={handleLogout} />
        <div className="flex-1 min-w-0 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-[14px] p-8 text-center flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">{error || 'Pengajuan tidak ditemukan.'}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={loadPengajuan}
                className="px-4 h-10 rounded-[10px] bg-white border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                Coba lagi
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/kyc')}
                className="px-4 h-10 rounded-[10px] bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Kembali ke daftar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row items-stretch">
      <AdminSidebar
        activeKey="verifikasi"
        counts={{ verifikasi: jumlahMenunggu }}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toast */}
        {toast ? (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700/60 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 max-w-[90vw]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
            <span>{toast}</span>
          </div>
        ) : null}

        {/* Header mobile */}
        <header className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/admin/kyc')}
            className="flex items-center gap-2 text-[13px] font-extrabold text-blue-600 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Verifikasi akun
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 cursor-pointer"
          >
            Keluar Sesi
          </button>
        </header>

        <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col gap-6">
          {/* Breadcrumb + navigasi pengajuan */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/kyc')}
                aria-label="Kembali ke daftar pengajuan"
                className="w-9 h-9 shrink-0 rounded-[9px] bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400">Verifikasi akun</span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-semibold text-slate-900">
                Pengajuan #{pengajuan.submissionCode || pengajuan.id}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Pengajuan {posisi > -1 ? posisi + 1 : '-'} dari {daftar.length}
              </span>
              <button
                type="button"
                disabled={!navigasiSebelumnya}
                onClick={() =>
                  navigate(
                    `/admin/pengajuan/${
                      navigasiSebelumnya?.submissionCode || navigasiSebelumnya?.id
                    }`
                  )
                }
                aria-label="Pengajuan sebelumnya"
                className="w-9 h-9 rounded-[9px] bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!navigasiBerikutnya}
                onClick={() =>
                  navigate(
                    `/admin/pengajuan/${
                      navigasiBerikutnya?.submissionCode || navigasiBerikutnya?.id
                    }`
                  )
                }
                aria-label="Pengajuan berikutnya"
                className="w-9 h-9 rounded-[9px] bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Header pemohon — tanpa avatar inisial, hanya satu badge status */}
          <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-[14px] bg-white border border-slate-200">
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-[-0.5px] text-slate-900">
                  {pengajuan.nama || pengajuan.fullName}
                </h1>
                <StatusBadge status={statusAktif} />
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <Store className="w-4 h-4 shrink-0 text-slate-400" />
                  {pengajuan.tipe}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0 text-slate-400" />
                  {pengajuan.email}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                  {pengajuan.lokasi}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-slate-400" />
                  Diajukan {formatRelativeTime(pengajuan.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalPerbaikan(true)}
                disabled={isActing}
                className="flex items-center gap-2 px-4 h-10 rounded-[10px] bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                <PencilLine className="w-4 h-4" />
                <span>Minta perbaikan</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTolak(true)}
                disabled={isActing}
                className="flex items-center gap-2 px-4 h-10 rounded-[10px] bg-red-50 border border-red-200 text-sm font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                <X className="w-4 h-4" />
                <span>Tolak</span>
              </button>
              <button
                type="button"
                onClick={handleSetujui}
                disabled={isActing}
                className="flex items-center gap-2 px-4 h-10 rounded-[10px] bg-green-700 text-sm font-bold text-white hover:bg-green-800 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                <span>Setujui akun</span>
              </button>
            </div>
          </div>

          {/* Dua kolom: data step + panel samping */}
          <div className="w-full flex flex-col xl:flex-row gap-6 items-start">
            {/* Kolom data 5 step registrasi */}
            <div className="flex-1 w-full min-w-0 flex flex-col gap-5">
              {langkah.map((step, index) => {
                const terbuka = stepTerbuka[index]

                return (
                  <section
                    key={step.nomor}
                    className="w-full flex flex-col gap-6 p-6 rounded-[14px] bg-white border border-slate-200"
                  >
                    <div className="w-full flex items-center gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-green-50 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-700" strokeWidth={2.6} />
                      </div>
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <span className="text-base font-bold text-slate-900">
                          Step {step.nomor} · {step.judul}
                        </span>
                        <span className="text-xs text-slate-400">{step.sub}</span>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          step.tone === 'peringatan' ? 'text-amber-700' : 'text-green-700'
                        }`}
                      >
                        {step.badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStep(index)}
                        aria-label={terbuka ? 'Sembunyikan langkah' : 'Tampilkan langkah'}
                        className="w-4 h-4 shrink-0 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <ChevronUp
                          className={`w-4 h-4 transition-transform ${terbuka ? '' : 'rotate-180'}`}
                        />
                      </button>
                    </div>

                    {terbuka ? (
                      <>
                        <div className="w-full flex flex-col gap-6">
                          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {step.fields.map((field) => {
                              const isNumericField =
                                ['NIK', 'NIB', 'Bank & No. Rekening', 'Tahun Berdiri', 'Kota / Kode Pos'].includes(field.label) ||
                                /\d{4,}/.test(field.value)

                              return (
                                <div key={field.label} className="flex flex-col gap-1.5">
                                  <span className="text-sm text-slate-500">{field.label}</span>
                                  <span
                                    className={`text-base font-medium text-slate-900 break-words ${
                                      isNumericField ? 'font-mono tabular-nums' : ''
                                    }`}
                                  >
                                    {field.value}
                                  </span>
                                </div>
                              )
                            })}
                          </div>

                          {step.daya ? (
                            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] bg-slate-50">
                              <Zap className="w-4 h-4 shrink-0 text-amber-700" />
                              <span className="text-sm text-slate-500">
                                Daya listrik tempat usaha
                              </span>
                              <span className="flex-1 h-px bg-slate-200" />
                              <span className="text-sm font-semibold tabular-nums text-slate-900">
                                {step.daya}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {step.documents?.length ? (
                          <div className="w-full flex flex-col sm:flex-row gap-3">
                            {step.documents.map((doc) => (
                              <div
                                key={doc.nama}
                                className={`flex-1 flex items-center gap-3 p-3 rounded-[10px] bg-slate-50 border border-slate-200 text-left ${
                                  doc.preview
                                    ? 'cursor-pointer hover:border-blue-200 hover:bg-blue-50/50 transition-colors'
                                    : ''
                                }`}
                                onClick={() => {
                                  if (doc.preview) setZoomedImage(doc.preview)
                                }}
                              >
                                <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden">
                                  {doc.preview ? (
                                    <img
                                      src={doc.preview}
                                      alt={doc.nama}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                                  <span className="text-sm font-semibold text-slate-900 truncate">
                                    {doc.nama}
                                  </span>
                                  <span className="text-xs text-slate-400 truncate">{doc.meta}</span>
                                </div>
                                {doc.preview ? (
                                  <Maximize2 className="w-4 h-4 shrink-0 text-slate-400" />
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </section>
                )
              })}
            </div>

            {/* Panel samping: checklist, catatan admin, riwayat */}
            <aside className="w-full xl:w-[320px] shrink-0 flex flex-col gap-5">
              {/* Checklist verifikasi */}
              <section className="w-full flex flex-col gap-4 p-5 rounded-[14px] bg-white border border-slate-200">
                <div className="w-full flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">Checklist verifikasi</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {checklistSelesai} / {CHECKLIST_VERIFIKASI.length}
                  </span>
                </div>
                <div className="w-full flex flex-col gap-3">
                  {CHECKLIST_VERIFIKASI.map((item, index) => (
                    <label key={item.label} className="w-full flex items-start gap-3 cursor-pointer">
                      <span className="relative w-5 h-5 shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={checkedItems.includes(index)}
                          onChange={() => toggleChecklist(index)}
                          className="peer absolute inset-0 w-full h-full m-0 appearance-none rounded-md border-[1.5px] border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                        />
                        <Check className="pointer-events-none absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
                      </span>
                      <span
                        className={`flex-1 text-sm leading-6 ${
                          checkedItems.includes(index) ? 'text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Catatan admin (dari database) */}
              <section className="w-full flex flex-col gap-3 p-5 rounded-[14px] bg-white border border-slate-200">
                <span className="text-sm font-bold text-slate-900">Catatan admin</span>
                {pengajuan.adminNote ? (
                  <div className="w-full p-3 rounded-[10px] bg-amber-50 border border-amber-200/70 text-sm leading-6 text-amber-800 whitespace-pre-line">
                    {pengajuan.adminNote}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Belum ada catatan. Catatan tersimpan otomatis saat admin meminta perbaikan atau
                    menolak pengajuan.
                  </p>
                )}

                {Array.isArray(pengajuan.revisionSteps) && pengajuan.revisionSteps.length > 0 ? (
                  <div className="w-full flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400">Step perlu diperbaiki:</span>
                    {pengajuan.revisionSteps.map((step) => (
                      <span
                        key={step}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                      >
                        Step {step}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="w-full flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Dikirim ke pengaju</span>
                  <span className="text-xs text-slate-400">
                    Diperbarui {formatDateTime(pengajuan.updatedAt)}
                  </span>
                </div>
              </section>

              {/* Riwayat pengajuan */}
              <section className="w-full flex flex-col gap-4 p-5 rounded-[14px] bg-white border border-slate-200">
                <span className="text-sm font-bold text-slate-900">Riwayat pengajuan</span>
                <div className="w-full flex flex-col gap-3">
                  {riwayat.map((item, index) => (
                    <div key={`${item.judul}-${index}`} className="w-full flex items-start gap-3">
                      <span
                        className={`w-2 h-2 mt-2 shrink-0 rounded-full ${
                          item.aktif ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      />
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-sm text-slate-900">{item.judul}</span>
                        <span className="text-xs text-slate-400">{item.waktu}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>

      {/* Alur 1 — minta perbaikan (revisi, pengaju masih bisa memperbaiki) */}
      <ModalMintaPerbaikan
        isOpen={modalPerbaikan}
        onClose={() => setModalPerbaikan(false)}
        onSubmit={handleMintaPerbaikan}
        idPengajuan={pengajuan.submissionCode || pengajuan.id}
        namaPengajuan={pengajuan.nama || pengajuan.fullName}
        tipePengajuan={pengajuan.tipe}
        langkah={langkah}
      />

      {/* Alur 2 — tolak permanen (tanpa opsi perbaikan) */}
      <ModalTolakPengajuan
        isOpen={modalTolak}
        onClose={() => setModalTolak(false)}
        onSubmit={handleTolak}
        idPengajuan={pengajuan.submissionCode || pengajuan.id}
        namaPengajuan={pengajuan.nama || pengajuan.fullName}
        tipePengajuan={pengajuan.tipe}
      />

      {/* Image viewer — pratinjau dokumen layar penuh */}
      {zoomedImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau dokumen"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Pratinjau dokumen"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />

          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            aria-label="Tutup pratinjau"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
