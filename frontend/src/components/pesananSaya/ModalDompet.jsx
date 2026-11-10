import React, { useEffect, useState, useCallback } from 'react'
import {
  X,
  Wallet,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  History,
  RotateCw,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { getWalletInfo } from '../../lib/walletApi'
import TopUpView from '../dompet/TopUpView'
import TarikSaldoView from '../dompet/TarikSaldoView'
import KelolaRekeningView from '../dompet/KelolaRekeningView'
import { useCountUp } from '../../lib/useCountUp'

export default function ModalDompet({ isOpen, onClose, initialView = 'OVERVIEW' }) {
  const [view, setView] = useState(initialView)
  const [walletData, setWalletData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    if (isOpen) {
      setView(initialView)
      loadData()
    }
  }, [isOpen, initialView, loadData])

  // Dengarkan event update saldo global
  useEffect(() => {
    const handleWalletUpdated = () => {
      loadData()
    }
    window.addEventListener('myrent:wallet-updated', handleWalletUpdated)
    return () => window.removeEventListener('myrent:wallet-updated', handleWalletUpdated)
  }, [loadData])

  const walletBalance = walletData?.walletBalance ?? 0
  const escrowHold = walletData?.escrowHold ?? 0
  const accounts = walletData?.accounts ?? []
  const transactions = walletData?.transactions ?? []
  const primaryAccount = accounts.find((a) => a.isPrimary) || accounts[0]

  // Animasi count-up memuat dari Rp 0 ke saldo dan escrow (dijalankan tanpa melanggar Rules of Hooks)
  const animatedBalance = useCountUp(walletBalance, 1200, Boolean(isOpen && !loading && walletData !== null))
  const animatedEscrow = useCountUp(escrowHold, 1200, Boolean(isOpen && !loading && walletData !== null))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 m-0">Dompet Digital &amp; Escrow</h3>
              <p className="text-[11px] text-slate-500 m-0">Platform manajemen saldo sewa Mesitra</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 text-xs max-h-[80vh] overflow-y-auto">
          {error && view === 'OVERVIEW' && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="text-[11px] font-bold text-red-700 hover:underline"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* VIEW: TOP UP */}
          {view === 'TOPUP' && (
            <TopUpView
              onBack={() => setView('OVERVIEW')}
              onSuccess={() => loadData()}
            />
          )}

          {/* VIEW: TARIK SALDO */}
          {view === 'WITHDRAW' && (
            <TarikSaldoView
              currentBalance={walletBalance}
              accounts={accounts}
              onBack={() => setView('OVERVIEW')}
              onNavigateAddAccount={() => setView('ACCOUNTS')}
              onSuccess={() => loadData()}
            />
          )}

          {/* VIEW: KELOLA REKENING */}
          {view === 'ACCOUNTS' && (
            <KelolaRekeningView
              accounts={accounts}
              onBack={() => setView('OVERVIEW')}
              onRefresh={() => loadData()}
            />
          )}

          {/* VIEW: OVERVIEW */}
          {view === 'OVERVIEW' && (
            <>
              {/* Main Balance Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <div className="flex items-center gap-1.5 text-blue-200 text-[11px] font-medium">
                      <span>Saldo Tersedia</span>
                      <button
                        type="button"
                        onClick={loadData}
                        title="Segarkan Saldo"
                        className="text-blue-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight tabular-nums">
                      Rp {animatedBalance.toLocaleString('id-ID')}
                    </h2>
                  </div>
                  <span className="text-[10px] bg-white/20 backdrop-blur-md text-white px-2.5 py-1 rounded-full font-bold border border-white/20 shadow-2xs">
                    Terhubung Database
                  </span>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/15 flex justify-between items-center text-[11px] relative z-10">
                  <div className="flex items-center gap-1.5 text-blue-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Dana Jaminan Ditahan Escrow:</span>
                  </div>
                  <span className="font-extrabold text-white tabular-nums">
                    Rp {animatedEscrow.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Top Up & Tarik Saldo */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setView('TOPUP')}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-xs"
                >
                  <ArrowDownLeft className="w-4 h-4 text-blue-200" />
                  <span>Top Up Saldo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView('WITHDRAW')}
                  className="py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-xs"
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>Tarik Saldo</span>
                </button>
              </div>

              {/* Rekening Pencairan / Penarikan Utama */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Rekening Utama Pencairan
                  </span>
                  <button
                    type="button"
                    onClick={() => setView('ACCOUNTS')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Kelola Rekening ({accounts.length})</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {primaryAccount ? (
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs m-0">
                          {primaryAccount.bankName} - {primaryAccount.accountNumber}
                        </p>
                        <p className="text-[11px] text-slate-500 m-0">a.n. {primaryAccount.accountHolder}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
                      Aktif
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex justify-between items-center">
                    <span className="text-amber-800 text-[11px]">Belum ada rekening pencairan terdaftar.</span>
                    <button
                      type="button"
                      onClick={() => setView('ACCOUNTS')}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      Daftarkan Sekarang
                    </button>
                  </div>
                )}
              </div>

              {/* Riwayat Mutasi Dompet */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Riwayat Transaksi Terkini</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {transactions.length} mutasi
                  </span>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    Belum ada riwayat transaksi dompet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {transactions.map((tx) => {
                      const isTopUp = tx.type === 'TOPUP' || tx.type === 'DEPOSIT_REFUND'
                      return (
                        <div
                          key={tx.id}
                          className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isTopUp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isTopUp ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate m-0">
                                {tx.description}
                              </p>
                              <p className="text-[10px] text-slate-400 m-0">
                                {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {tx.reference ? ` • ${tx.reference}` : ''}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`font-extrabold text-xs tabular-nums shrink-0 ml-2 ${
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
