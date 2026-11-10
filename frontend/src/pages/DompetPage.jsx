import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  History,
  RotateCw,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Plus,
  ArrowLeft
} from 'lucide-react'
import NavbarPenyewa from '../components/common/NavbarPenyewa'
import TopUpView from '../components/dompet/TopUpView'
import TarikSaldoView from '../components/dompet/TarikSaldoView'
import KelolaRekeningView from '../components/dompet/KelolaRekeningView'
import { getWalletInfo } from '../lib/walletApi'
import { useCountUp } from '../lib/useCountUp'

export default function DompetPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'topup' | 'withdraw' | 'accounts'
  const [walletData, setWalletData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/beranda-sewa')
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getWalletInfo()
      setWalletData(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat data dompet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleWalletUpdated = () => {
      loadData()
    }
    window.addEventListener('mesitra:wallet-updated', handleWalletUpdated)
    return () => window.removeEventListener('mesitra:wallet-updated', handleWalletUpdated)
  }, [loadData])

  const walletBalance = walletData?.walletBalance ?? 0
  const escrowHold = walletData?.escrowHold ?? 0
  const accounts = walletData?.accounts ?? []
  const transactions = walletData?.transactions ?? []
  const primaryAccount = accounts.find((a) => a.isPrimary) || accounts[0]

  // Animasi count-up memuat dari Rp 0 ke saldo dan escrow terkini
  const animatedBalance = useCountUp(walletBalance, 1200, !loading && walletData !== null)
  const animatedEscrow = useCountUp(escrowHold, 1200, !loading && walletData !== null)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <NavbarPenyewa activeTab="dompet" />

      <main className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 py-8 pb-28 md:pb-14 flex flex-col gap-6 flex-1">
        {/* Header Breadcrumbs / Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleBack}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors w-fit cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Kembali</span>
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              Dompet &amp; Rekening Pencairan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 m-0">
              Kelola saldo, pengisian top up, penarikan dana, dan daftar rekening pencairan usaha Anda.
            </p>
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Segarkan Saldo</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="font-bold text-red-700 underline cursor-pointer"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Ringkasan Dompet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('topup')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'topup'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Top Up Saldo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('withdraw')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'withdraw'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Tarik Saldo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'accounts'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Rekening Pencairan ({accounts.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          {activeTab === 'topup' && (
            <TopUpView
              onBack={() => setActiveTab('overview')}
              onSuccess={() => loadData()}
            />
          )}

          {activeTab === 'withdraw' && (
            <TarikSaldoView
              currentBalance={walletBalance}
              accounts={accounts}
              onBack={() => setActiveTab('overview')}
              onNavigateAddAccount={() => setActiveTab('accounts')}
              onSuccess={() => loadData()}
            />
          )}

          {activeTab === 'accounts' && (
            <KelolaRekeningView
              accounts={accounts}
              onBack={() => setActiveTab('overview')}
              onRefresh={() => loadData()}
            />
          )}

          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8">
              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Saldo Tersedia */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-blue-200 font-medium">Saldo Dompet Tersedia</span>
                    <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight tabular-nums">
                      Rp {animatedBalance.toLocaleString('id-ID')}
                    </h2>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('topup')}
                      className="flex-1 py-2 px-3 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Top Up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('withdraw')}
                      className="flex-1 py-2 px-3 bg-blue-900/60 hover:bg-blue-900/80 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-colors cursor-pointer shadow-xs"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Tarik</span>
                    </button>
                  </div>
                </div>

                {/* Escrow Ditahan */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Dana Ditahan Escrow</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight tabular-nums">
                      Rp {animatedEscrow.toLocaleString('id-ID')}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      Jaminan keamanan pesanan sewa aktif yang otomatis dikembalikan setelah BAST selesai.
                    </p>
                  </div>
                </div>

                {/* Rekening Utama */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Rekening Pencairan Utama</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('accounts')}
                        className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                      >
                        Kelola
                      </button>
                    </div>
                    {primaryAccount ? (
                      <div className="mt-3">
                        <div className="font-extrabold text-slate-900 text-sm">{primaryAccount.bankName}</div>
                        <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">{primaryAccount.accountNumber}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">a.n. {primaryAccount.accountHolder}</div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col items-start gap-2">
                        <p className="text-xs text-slate-400 m-0">Belum ada rekening penarikan terdaftar.</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('accounts')}
                          className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          + Tambah Rekening
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Riwayat Mutasi Dompet */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <History className="w-4 h-4 text-slate-400" />
                    <span>Riwayat Mutasi Saldo &amp; Transaksi</span>
                  </div>
                  <span className="text-xs text-slate-400">{transactions.length} mutasi tercatat</span>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Belum ada riwayat transaksi dompet digital Anda.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {transactions.map((tx) => {
                      const isTopUp = tx.type === 'TOPUP' || tx.type === 'DEPOSIT_REFUND'
                      return (
                        <div
                          key={tx.id}
                          className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl flex items-center justify-between transition-colors text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isTopUp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isTopUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-xs truncate m-0">
                                {tx.description}
                              </h4>
                              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                                {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {tx.reference ? ` • Ref: ${tx.reference}` : ''}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`font-extrabold text-sm tabular-nums shrink-0 ml-3 ${
                              isTopUp ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {isTopUp ? '+' : '-'}Rp {Number(tx.amount).toLocaleString('id-ID')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
