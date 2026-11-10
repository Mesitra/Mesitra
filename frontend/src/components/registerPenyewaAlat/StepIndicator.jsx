import { Check, ShieldCheck } from 'lucide-react'

const STEP_METAS = [
  {
    num: 1,
    title: 'Buat akun & kredensial usaha.',
    desc: 'Lengkapi informasi dasar penanggung jawab dan akun untuk mulai menyewa alat produksi.',
    name: 'Buat Akun'
  },
  {
    num: 2,
    title: 'Verifikasi identitas pemilik usaha.',
    desc: 'Data KTP dipakai untuk kontrak sewa digital dan proses klaim deposit bila terjadi sengketa.',
    name: 'Identitas & KTP'
  },
  {
    num: 3,
    title: 'Profil usaha & daya listrik.',
    desc: 'Daya listrik usaha dipakai untuk memfilter katalog agar Anda hanya melihat alat yang aman dipakai.',
    name: 'Profil UMKM'
  },
  {
    num: 4,
    title: 'Alamat usaha & rekening refund.',
    desc: 'Rekening ini dipakai untuk mengembalikan security deposit Anda setelah alat dikembalikan dengan aman.',
    name: 'Alamat & Rekening'
  },
  {
    num: 5,
    title: 'Cek sekali lagi, lalu kirim verifikasi.',
    desc: 'Setelah dikirim, Admin meninjau data Anda dalam 1 × 24 jam. Anda akan menerima notifikasi WhatsApp.',
    name: 'Review & Kirim'
  }
]

export default function StepIndicator({ currentStep, onSelectStep }) {
  const currentMeta = STEP_METAS[currentStep - 1] || STEP_METAS[0]

  return (
    <aside className="hidden lg:flex w-[300px] shrink-0 flex-col gap-4 pt-1">
      {/* Label Kategori / Context */}
      <div className="text-[10px] text-blue-600 font-bold tracking-[1.1px] uppercase">
        PENDAFTARAN PENYEWA UMKM
      </div>

      {/* Heading Dinamis sesuai Langkah Aktif */}
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-[-0.6px] leading-[1.25]">
        {currentMeta.title}
      </h1>

      {/* Deskripsi Langkah */}
      <p className="text-xs leading-[19px] text-slate-600">
        {currentMeta.desc}
      </p>

      {/* Vertikal Stepper (5 Tahap) */}
      <div className="w-full flex flex-col gap-0 pt-2">
        {STEP_METAS.map((stepItem, idx) => {
          const isCompleted = currentStep > stepItem.num
          const isActive = currentStep === stepItem.num
          const isLast = idx === STEP_METAS.length - 1

          let statusLabel = 'Belum dimulai'
          if (isCompleted) statusLabel = 'Selesai'
          if (isActive) statusLabel = 'Sedang diisi'

          return (
            <div
              key={stepItem.num}
              onClick={() => {
                if (isCompleted && onSelectStep) onSelectStep(stepItem.num)
              }}
              className={`flex flex-row gap-3 items-start ${
                isCompleted ? 'cursor-pointer group' : ''
              }`}
            >
              {/* Marker: Bulat Nomor/Check & Garis Penghubung */}
              <div className="w-6 shrink-0 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isCompleted
                      ? 'bg-green-50 text-green-700 border border-emerald-300'
                      : isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-green-700" strokeWidth={2.8} />
                  ) : (
                    stepItem.num
                  )}
                </div>

                {!isLast && (
                  <div
                    className={`w-0.5 h-[34px] sm:h-[38px] transition-colors ${
                      isCompleted ? 'bg-green-700' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>

              {/* Teks Step & Status */}
              <div className="flex flex-col pt-0.5 pb-2">
                <div
                  className={`text-xs font-bold transition-colors ${
                    isActive
                      ? 'text-slate-900'
                      : isCompleted
                      ? 'text-slate-900 group-hover:text-blue-600'
                      : 'text-slate-500'
                  }`}
                >
                  {stepItem.name}
                </div>
                <div
                  className={`text-[10px] ${
                    isActive
                      ? 'text-blue-600 font-medium'
                      : isCompleted
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  {statusLabel}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Box Bantuan & Keamanan */}
      <div className="mt-4 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-[17px] text-slate-600">
          Semua data Anda dilindungi enkripsi bank-grade dan hanya digunakan untuk kontrak sewa resmi Mesitra.
        </div>
      </div>
    </aside>
  )
}
