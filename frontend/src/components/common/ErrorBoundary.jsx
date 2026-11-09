import React from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Global ErrorBoundary Component
 *
 * Menangkap unhandled JavaScript exception di seluruh tree komponen React.
 * Menghindari "White Screen of Death" dan menyajikan fallback recovery UI
 * yang elegan dan konsisten dengan sistem desain MyRent.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary] React render error caught:', error, errorInfo)

    // BLUEPRINT OBSERVABILITY INTEGRATION (Sentry / LogRocket / Datadog)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo })
    // }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 flex flex-col items-center text-center gap-5 animate-in zoom-in-95 duration-200">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Terjadi Kesalahan Tampilan
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                Aplikasi mengalami kendala tak terduga saat memuat halaman ini.
                Silakan muat ulang atau kembali ke halaman beranda.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border border-slate-200"
              >
                <Home className="w-4 h-4" />
                <span>Ke Beranda</span>
              </button>
            </div>

            {/* Collapsible Developer Details */}
            <div className="w-full border-t border-slate-100 pt-3 text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span>Rincian Diagnostik Teknis</span>
                {showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showDetails && (
                <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl text-[10.5px] font-mono overflow-x-auto max-h-48 leading-relaxed">
                  <div className="text-red-400 font-bold mb-1">
                    {error?.toString() || 'Unknown Error'}
                  </div>
                  {errorInfo?.componentStack && (
                    <pre className="text-slate-400 whitespace-pre-wrap text-[10px]">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

