import { useEffect } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

export default function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Pemberitahuan',
  message = '',
  type = 'error', // 'error' | 'warning' | 'info' | 'success'
  confirmText = 'Saya Mengerti',
  secondaryAction = null // { label: string, onClick: () => void }
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const typeConfig = {
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50 text-red-600 border-red-100',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
    },
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
    }
  }

  const currentType = typeConfig[type] || typeConfig.error
  const IconComponent = currentType.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
        {/* Close Icon Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dynamic Badge Icon */}
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${currentType.bg} shadow-xs`}
        >
          <IconComponent className="w-7 h-7" strokeWidth={2.2} />
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-1.5 px-2">
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {title}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed break-words">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm()
              else onClose?.()
            }}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md active:scale-[0.99] ${currentType.btnBg}`}
          >
            {confirmText}
          </button>

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
