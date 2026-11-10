import React, { useState, useMemo, useRef } from 'react'
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Receipt,
  Lock,
  Check,
  RefreshCw,
  Hourglass,
  Download,
  Calendar,
  ChevronDown,
  ArrowRight,
  Building2,
  AlertCircle,
  X
} from 'lucide-react'
import {
  withdrawOwnerWallet,
  updateOwnerBankAccount
} from '../../lib/walletApi'
import { formatRupiah } from '../../lib/equipmentsApi'
import { useWallet } from '../../context/WalletContext'

/**
 * Modal Cairkan Dana (Withdrawal)
 */
function WithdrawModal({
  isOpen,
  onClose,
  availableBalance,
  bankAccount,
  onSuccess
}) {
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const numericAmount = Number(amount.replace(/[^0-9]/g, '')) || 0
  const minAmount = 100000

  const handleQuickAll = () => {
    setAmount(availableBalance.toString())
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (numericAmount < minAmount) {
      setError(`Nominal penarikan minimal ${formatRupiah(minAmount)}`)
      return
    }

    if (numericAmount > availableBalance) {
      setError(`Saldo tidak mencukupi. Saldo tersedia saat ini: ${formatRupiah(availableBalance)}`)
      return
    }

    try {
      setSubmitting(true)
      const res = await withdrawOwnerWallet({ amount: numericAmount })
      if (onSuccess) {
        onSuccess(res)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal memproses penarikan dana')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Cairkan Saldo</h2>
            <p className="text-xs text-slate-500">Pencairan langsung ke rekening terdaftar</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Saldo Tersedia */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Saldo Tersedia
              </span>
              <div className="text-base font-extrabold text-slate-900">
                {formatRupiah(availableBalance)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickAll}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline px-2.5 py-1 bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              Tarik Semua
            </button>
          </div>

          {/* Rekening Tujuan */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Rekening Tujuan
            </span>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {bankAccount?.bankName || 'BCA'} · {bankAccount?.accountNumber || '4471 8820 04'}
                </div>
                <div className="text-[11px] text-slate-500">
                  a.n. {bankAccount?.accountHolder || 'Budi Santoso'}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Terverifikasi
              </span>
            </div>
          </div>

          {/* Input Nominal Penarikan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nominal Penarikan
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={numericAmount > 0 ? numericAmount.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  setAmount(raw)
                  setError(null)
                }}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-0.5">
              <span>Minimal penarikan {formatRupiah(minAmount)}</span>
              <span>Biaya transfer: Sesuai kebijakan bank</span>
            </div>
          </div>

          {/* Catatan / SLA */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11.5px] text-blue-900 leading-relaxed">
            <p className="font-semibold">Info Pencairan:</p>
            Dana akan diproses secara instan melalui sistem pembayaran real-time BI-FAST (estimasi 5-15 menit).
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || numericAmount < minAmount || numericAmount > availableBalance}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Konfirmasi Pencairan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Modal Ubah Rekening Pencairan
 */
function BankAccountModal({
  isOpen,
  onClose,
  initialAccount,
  onSuccess
}) {
  const [bankName, setBankName] = useState(initialAccount?.bankName || 'BCA')
  const [accountNumber, setAccountNumber] = useState(initialAccount?.accountNumber || '')
  const [accountHolder, setAccountHolder] = useState(initialAccount?.accountHolder || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const BANK_OPTIONS = [
    'BCA',
    'Mandiri',
    'BRI',
    'BNI',
    'CIMB Niaga',
    'Permata',
    'Bank Syariah Indonesia (BSI)',
    'Bank Jago',
    'Jenius (BTPN)',
    'Danamon',
    'GoPay',
    'OVO',
    'DANA'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!bankName.trim()) {
      setError('Pilih nama bank atau e-wallet')
      return
    }
    if (!accountNumber.trim() || accountNumber.trim().length < 5) {
      setError('Nomor rekening minimal 5 digit')
      return
    }
    if (!accountHolder.trim() || accountHolder.trim().length < 3) {
      setError('Nama pemilik rekening minimal 3 karakter')
      return
    }

    try {
      setSubmitting(true)
      const res = await updateOwnerBankAccount({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim()
      })
      if (onSuccess) {
        onSuccess(res.bankAccount || res.account)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal memperbarui rekening pencairan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Ubah Rekening Pencairan</h2>
            <p className="text-xs text-slate-500">Digunakan untuk transfer hasil sewa alat Anda</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Bank / Dompet Digital
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              {BANK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nomor Rekening / Virtual Account
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Contoh: 4471 8820 04"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Pemilik Rekening
            </label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Sesuai nama di buku tabungan / rekening"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Nama pemilik wajib sesuai dengan identitas pemilik terverifikasi.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Rekening</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

/**
 * Komponen Utama: DompetPemilik
 * Terintegrasi penuh dengan WalletContext (Shared Layout Sidebar & Dompet),
 * kalkulasi escrow mutlak dari array pesanan aktif (H-x),
 * filter tanggal dinamis berdasarkan data aktual, dan ekspor CSV.
 */
export default function DompetPemilik() {
  const {
    walletData,
    loading,
    error,
    refreshWallet,
    escrowBalance,
    availableBalance,
    escrowItems,
    mutations,
    bankAccount: contextBankAccount,
    setWalletData
  } = useWallet()

  // Filter & Pagination States
  const [statusFilter, setStatusFilter] = useState('Semua') // 'Semua' | 'Masuk' | 'Keluar' | 'Escrow'
  const [selectedMonthKey, setSelectedMonthKey] = useState('ALL')
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Modals
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  // Ref untuk smooth scroll ke tabel mutasi
  const tableRef = useRef(null)

  // Ekstrak daftar bulan unik dari data mutasi secara dinamis
  const monthOptions = useMemo(() => {
    const map = new Map()

    mutations.forEach((m) => {
      const d = new Date(m.rawDate)
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear()
        const month = d.getMonth()
        const key = `${year}-${String(month + 1).padStart(2, '0')}`
        if (!map.has(key)) {
          const lastDay = new Date(year, month + 1, 0).getDate()
          map.set(key, {
            key,
            year,
            month,
            name: `${MONTH_NAMES[month]} ${year}`,
            label: `1 – ${lastDay} ${MONTH_NAMES[month]} ${year}`
          })
        }
      }
    })

    const sorted = Array.from(map.values()).sort((a, b) => {
      return b.year !== a.year ? b.year - a.year : b.month - a.month
    })

    return [
      { key: 'ALL', name: 'Semua Waktu', label: 'Semua Periode' },
      ...sorted
    ]
  }, [mutations])

  // Cari opsi bulan yang aktif
  const selectedMonthOption = useMemo(() => {
    return monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0]
  }, [monthOptions, selectedMonthKey])

  const selectedMonthName = selectedMonthOption?.name || 'Semua Waktu'
  const periodLabel = selectedMonthOption?.label || selectedMonthOption?.name || 'Semua Periode'

  // Filter mutations secara reaktif
  const filteredMutations = useMemo(() => {
    let list = [...mutations]

    // 1. Filter Kategori: 'Semua' | 'Masuk' | 'Keluar' | 'Escrow'
    if (statusFilter !== 'Semua') {
      const cat = statusFilter.toUpperCase()
      list = list.filter((m) => m.category === cat)
    }

    // 2. Filter Rentang Bulan berdasarkan Dropdown Kanan Atas
    if (selectedMonthKey !== 'ALL') {
      const [filterYear, filterMonth] = selectedMonthKey.split('-').map(Number)
      list = list.filter((m) => {
        const d = new Date(m.rawDate)
        return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth
      })
    }

    return list
  }, [mutations, statusFilter, selectedMonthKey])

  // Mutasi yang tampil di tabel (default 6 baris, atau semua jika expanded)
  const visibleMutations = useMemo(() => {
    if (isExpanded) return filteredMutations
    return filteredMutations.slice(0, 6)
  }, [filteredMutations, isExpanded])

  // Smooth scroll ke tabel mutasi
  const scrollToTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Unduh Mutasi ke CSV
  const handleExportCSV = () => {
    if (!filteredMutations || filteredMutations.length === 0) return

    const headers = ['ID', 'Tanggal', 'Keterangan', 'Kategori', 'Status', 'Jumlah']
    const rows = filteredMutations.map((m) => [
      `"${m.id}"`,
      `"${m.date}"`,
      `"${(m.description || '').replace(/"/g, '""')}"`,
      `"${m.category}"`,
      `"${m.badgeStatus} - ${m.subStatus}"`,
      `"${m.amount >= 0 ? '+' : ''}${m.amount}"`
    ])

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `mutasi-dompet-mesitra-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Metadata pendukung
  const monthlyGrowthText = walletData?.monthlyGrowthText || '+ Rp 2,15 jt bulan ini'
  const nextPayoutLabel = walletData?.nextPayout?.label || '14 Jun · Rp 1,2 jt'
  const bankAccount = contextBankAccount || {
    bankName: 'BCA',
    accountNumber: '4471 8820 04',
    accountHolder: 'Budi Santoso',
    title: 'Kopi Senja · 4471 8820 04'
  }

  if (loading && !walletData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3 font-sans">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Memuat data dompet & kalkulasi escrow...</p>
      </div>
    )
  }

  if (error && !walletData) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-3 font-sans shadow-sm">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-extrabold text-slate-800">Gagal Memuat Data Dompet</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => refreshWallet()}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      {/* ── TOPBAR: HEADER, FILTER BULAN & UNDUH CSV ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dompet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Saldo, escrow, dan riwayat pencairan dana sewa Anda
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Dropdown Rentang Periode Dinamis */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen((prev) => !prev)}
              className="h-[38px] px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{periodLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                {monthOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSelectedMonthKey(opt.key)
                      setIsPeriodDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedMonthKey === opt.key
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tombol Unduh Mutasi (CSV) */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-[38px] px-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
            title="Unduh file spreadsheet riwayat mutasi"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Unduh mutasi</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: KARTU SALDO TERSEDIA & DANA ESCROW ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Kartu Utama: Saldo Tersedia (Slate 900 Gradient + Blue Accent) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col justify-between min-h-[196px]">
          {/* Header Kartu Saldo */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                SALDO TERSEDIA
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums">
                {formatRupiah(availableBalance)}
              </div>
            </div>

            {/* Pill Pertumbuhan Bulan Ini */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{monthlyGrowthText}</span>
            </div>
          </div>

          {/* Footer Kartu Saldo: Tombol Aksi & Info Pencairan Berikutnya */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 mt-auto border-t border-white/10">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsWithdrawOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Cairkan dana</span>
              </button>

              <button
                type="button"
                onClick={scrollToTable}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-slate-300" />
                <span>Lihat mutasi</span>
              </button>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-[10px] font-semibold text-slate-400">
                Pencairan berikutnya
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
                {nextPayoutLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Kartu Sekunder: Dana di Escrow (Kalkulasi Mutlak .reduce dari escrowItems) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3 min-h-[196px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Dana di escrow
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 tabular-nums">
              {formatRupiah(escrowBalance)}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-0.5 leading-tight">
              Dari {escrowItems.length} pesanan aktif · cair otomatis setelah inspeksi
            </p>
          </div>

          <div className="border-t border-slate-100 pt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
            {escrowItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center font-medium">Tidak ada pesanan escrow aktif</p>
            ) : (
              escrowItems.map((item, idx) => {
                const itemAmt = Number(item.amount ?? item.payoutAmount) || 0
                const amountStr =
                  itemAmt >= 1000000
                    ? `Rp ${(itemAmt / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} jt`
                    : formatRupiah(itemAmt)

                return (
                  <div key={item.id || idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-slate-700 font-semibold truncate text-[11px]" title={item.equipmentName}>
                        {item.equipmentName} · {item.formattedDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="font-extrabold text-slate-900 text-[11px] tabular-nums"
                        title={formatRupiah(itemAmt)}
                      >
                        {amountStr}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {item.daysRemaining}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 2: TABEL MUTASI DOMPET & KARTU REKENING PENCAIRAN ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
        {/* Kolom Kiri: Tabel Mutasi Dompet */}
        <div
          ref={tableRef}
          className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col"
        >
          {/* Header Tabel & Filter Pills */}
          <div className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Mutasi dompet
            </h2>

            {/* Filter Pills: Semua, Masuk, Keluar, Escrow */}
            <div className="flex items-center gap-1.5">
              {['Semua', 'Masuk', 'Keluar', 'Escrow'].map((chip) => {
                const isActive = statusFilter === chip
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setStatusFilter(chip)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4 sm:px-5 w-24">TANGGAL</th>
                  <th className="py-2.5 px-4">KETERANGAN</th>
                  {/* Kolom STATUS: Dirapikan menggunakan flex container */}
                  <th className="py-2.5 px-4 w-40">STATUS</th>
                  <th className="py-2.5 px-4 sm:px-5 text-right w-36">JUMLAH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleMutations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-xs">Belum ada riwayat mutasi pada filter ini</p>
                    </td>
                  </tr>
                ) : (
                  visibleMutations.map((item) => {
                    const isPositive = item.amount >= 0
                    const isEscrow = item.category === 'ESCROW'

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        <td className="py-3 px-4 sm:px-5 font-semibold text-slate-500 whitespace-nowrap text-[11px]">
                          {item.date}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span className="line-clamp-1">{item.description}</span>
                        </td>
                        {/* ── PERBAIKAN BUG VISUAL KOLOM STATUS ── */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                isEscrow
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {item.badgeStatus}
                            </span>
                            <span
                              className={`text-[11px] font-bold ${
                                item.subStatus === 'Ditahan'
                                  ? 'text-amber-700'
                                  : item.subStatus === 'Cair'
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {item.subStatus}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`py-3 px-4 sm:px-5 text-right font-extrabold tabular-nums whitespace-nowrap ${
                            isPositive
                              ? isEscrow
                                ? 'text-blue-700'
                                : 'text-emerald-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {isPositive ? `+ ${formatRupiah(item.amount)}` : `- ${formatRupiah(Math.abs(item.amount))}`}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Tabel Mutasi: Teks Paginasi Dinamis */}
          <div className="p-3.5 px-4 sm:px-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-slate-500">
              Menampilkan {filteredMutations.length} dari {mutations.length} mutasi pada {selectedMonthName}
            </span>

            {filteredMutations.length > 6 && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isExpanded ? 'Tampilkan ringkas' : 'Lihat semua mutasi'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Rekening Pencairan & Info Kebijakan */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Header Rekening */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">
              Rekening pencairan
            </h2>
            <button
              type="button"
              onClick={() => setIsBankModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Ubah
            </button>
          </div>

          {/* Card Bank Terdaftar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center font-black text-xs shrink-0 tracking-wider">
              {bankAccount.bankName.slice(0, 4).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-extrabold text-slate-900 truncate">
                {bankAccount.title}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Atas nama {bankAccount.accountHolder}
              </div>
            </div>
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Meta Informasi Kebijakan Penarikan */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11.5px] font-medium text-slate-500">Minimum pencairan</span>
              </div>
              <span className="font-extrabold text-slate-900 text-[11.5px]">Rp 100.000</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11.5px] font-medium text-slate-500">Biaya transfer</span>
              </div>
              <span className="font-extrabold text-slate-900 text-[11.5px]">Sesuai kebijakan bank</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-2">
                <Hourglass className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11.5px] font-medium text-slate-500">Dana tertahan</span>
              </div>
              <span className="font-extrabold text-slate-900 text-[11.5px]">Rp 0</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        availableBalance={availableBalance}
        bankAccount={bankAccount}
        onSuccess={() => {
          refreshWallet()
        }}
      />

      <BankAccountModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        initialAccount={bankAccount}
        onSuccess={(updated) => {
          setWalletData((prev) => (prev ? { ...prev, bankAccount: updated } : prev))
          refreshWallet()
        }}
      />
    </div>
  )
}
