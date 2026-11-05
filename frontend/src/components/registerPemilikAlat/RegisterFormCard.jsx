/**
 * Kerangka kartu form pendaftaran yang dipakai bersama oleh Step 1-5:
 * header (LANGKAH n DARI 5 + judul + subjudul + pil draf), progress bar 5 segmen,
 * area field (children), dan footer navigasi (kembali, simpan draf, lanjut).
 */
export default function RegisterFormCard({
  step,
  title,
  subtitle,
  backLabel,
  nextLabel,
  onBack,
  onNext,
  onSaveDraft,
  children
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onNext?.()
      }}
      className="w-full max-w-[760px] flex flex-col gap-4.5 p-5 sm:p-7 bg-white border border-slate-200 rounded-2xl shadow-sm"
    >
      {/* Kepala kartu */}
      <div className="w-full flex flex-row justify-between items-start gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
          <div className="text-[9px] font-bold tracking-[0.9px] text-blue-600">
            LANGKAH {step} DARI 5
          </div>
          <h2 className="text-[19px] font-bold text-slate-900">{title}</h2>
          <p className="text-[11px] leading-[17px] text-slate-600">{subtitle}</p>
        </div>

        <div className="shrink-0 px-2.5 py-[5px] bg-slate-50 rounded-full">
          <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
            Draf tersimpan
          </span>
        </div>
      </div>

      {/* Progress bar 5 segmen */}
      <div className="w-full flex flex-row gap-1.5">
        {[1, 2, 3, 4, 5].map((segment) => (
          <div
            key={segment}
            className={`flex-1 h-[5px] rounded-full transition-colors ${
              segment <= step ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Konten field per langkah */}
      <div className="w-full flex flex-col gap-3.5">{children}</div>

      {/* Footer navigasi: Kembali ke Login & Beranda Bersamaan */}
      <div className="w-full flex flex-row justify-between items-center gap-3 pt-3.5 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
          >
            {backLabel}
          </button>
          {step === 1 && (
            <button
              type="button"
              onClick={() => { window.location.href = '/' }}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 cursor-pointer transition-colors hidden sm:inline"
            >
              atau ke Beranda
            </button>
          )}
        </div>

        <div className="flex flex-row items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            className="px-4.5 py-[11px] bg-white border border-slate-200 rounded-[10px] text-xs font-semibold text-slate-900 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Simpan Draf
          </button>
          <button
            type="submit"
            className="px-4.5 py-[11px] bg-blue-600 hover:bg-blue-700 active:scale-[0.99] rounded-[10px] text-xs font-semibold text-white cursor-pointer transition-all shadow-xs"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
