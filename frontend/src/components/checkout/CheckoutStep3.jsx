/**
 * CheckoutStep3.jsx — Pembayaran Escrow (Mock Payment)
 *
 * Fitur:
 *  - Live countdown 24 jam hingga payment deadline
 *  - QR Code QRIS SVG yang tajam dengan payload invoice/nominal
 *  - 4 metode pembayaran: QRIS, Virtual Account BCA, E-wallet, Kartu
 *  - Countdown 15 menit untuk masa berlaku QRIS
 *  - Simulasi Mock Payment: animasi verifikasi → PATCH /mock-pay → redirect ke Pesanan Saya
 *  - Tombol "Saya sudah transfer, cek status" juga memicu mock payment
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Loader2, Clock, Copy, CheckCircle2, AlertCircle,
  CreditCard, Wallet, QrCode, Building2
} from 'lucide-react'
import { getOrder, mockPay } from '../../lib/ordersApi'

// ── QRIS SVG Generator ─────────────────────────────────────────────────────────
function QrisCode({ invoiceNumber, amount }) {
  // Buat pattern QR sederhana berbasis SVG (visual representation)
  const seed = invoiceNumber ? invoiceNumber.charCodeAt(4) + invoiceNumber.charCodeAt(8) : 42
  const modules = 25
  const cellSize = 6
  const size = modules * cellSize

  // Seeded pseudo-random untuk pattern
  const pseudoRandom = (x, y) => {
    const val = (x * 31 + y * 97 + seed * 13) % 256
    return val > 128
  }

  // Finder pattern (kotak sudut)
  const isFinderPattern = (r, c) => {
    const topLeft = r < 7 && c < 7
    const topRight = r < 7 && c >= modules - 7
    const bottomLeft = r >= modules - 7 && c < 7
    if (topLeft || topRight || bottomLeft) {
      const lr = topLeft ? r : topRight ? r : r - (modules - 7)
      const lc = topLeft ? c : topRight ? c - (modules - 7) : c
      const border = lr === 0 || lr === 6 || lc === 0 || lc === 6
      const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4
      return border || inner ? 'dark' : 'light'
    }
    return null
  }

  const cells = []
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      const finder = isFinderPattern(r, c)
      let dark = finder === 'dark' ? true : finder === 'light' ? false : pseudoRandom(r, c)
      cells.push({ r, c, dark })
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-xl">
      <rect width={size} height={size} fill="white" rx="8" />
      {cells.map(({ r, c, dark }) => (
        dark ? (
          <rect
            key={`${r}-${c}`}
            x={c * cellSize + 1}
            y={r * cellSize + 1}
            width={cellSize - 2}
            height={cellSize - 2}
            fill="#0F172A"
            rx="1"
          />
        ) : null
      ))}
      {/* Center logo */}
      <rect x={size/2 - 12} y={size/2 - 12} width={24} height={24} fill="white" rx="4" />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize="14" fill="#2563EB" fontWeight="bold">M</text>
    </svg>
  )
}

// ── Countdown Hook ────────────────────────────────────────────────────────────
function useCountdown(deadlineISO) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!deadlineISO) return
    const deadline = new Date(deadlineISO).getTime()

    const tick = () => {
      const diff = deadline - Date.now()
      setRemaining(Math.max(0, diff))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [deadlineISO])

  const hours = Math.floor(remaining / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const isExpired = remaining === 0 && !!deadlineISO

  return { hours, minutes, seconds, isExpired, remaining }
}

// ── Payment Method Tabs ───────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'QRIS', label: 'QRIS', icon: <QrCode className="w-4 h-4" /> },
  { id: 'VA_BCA', label: 'Virtual Account BCA', icon: <Building2 className="w-4 h-4" /> },
  { id: 'EWALLET', label: 'E-wallet', icon: <Wallet className="w-4 h-4" /> },
  { id: 'CARD', label: 'Kartu Kredit/Debit', icon: <CreditCard className="w-4 h-4" /> }
]

function WizardSteps() {
  const steps = ['Rincian Sewa', 'Kontrak Digital', 'Pembayaran Escrow']
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((label, i) => {
        const isDone = i < 2
        const isActive = i === 2
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold ${
                isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-400'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-[12px] font-${isActive ? 'bold' : 'medium'} ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function CheckoutStep3() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('QRIS')
  const [copied, setCopied] = useState(false)
  const [ewalletType, setEwalletType] = useState('GOPAY')
  const [ewalletPhone, setEwalletPhone] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  // Mock payment state
  const [mockState, setMockState] = useState('idle') // 'idle' | 'verifying' | 'success'

  // QRIS 15-min countdown
  const [qrisDeadline] = useState(() => new Date(Date.now() + 15 * 60 * 1000).toISOString())
  const { minutes: qrisMins, seconds: qrisSecs, isExpired: qrisExpired } = useCountdown(qrisDeadline)

  // 24-hour payment deadline countdown
  const paymentCountdown = useCountdown(order?.paymentDeadline)

  useEffect(() => {
    if (!orderId) { setError('Order ID tidak ditemukan'); setLoading(false); return }
    let active = true
    getOrder(orderId)
      .then(data => {
        if (active) {
          if (data.status !== 'MENUNGGU_PEMBAYARAN') {
            // Kalau sudah dibayar sebelumnya, langsung redirect
            if (data.status === 'MENUNGGU_KONFIRMASI') {
              navigate('/pesanan-saya', { state: { successMessage: `Pesanan ${data.invoiceNumber} sudah dibayar! Menunggu konfirmasi pemilik.` } })
            }
          }
          setOrder(data)
        }
      })
      .catch(err => { if (active) setError(err.message || 'Gagal memuat order') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [orderId, navigate])

  const handleMockPay = useCallback(async () => {
    if (mockState !== 'idle') return
    setMockState('verifying')

    // Simulasi delay verifikasi
    await new Promise(r => setTimeout(r, 1800))

    try {
      await mockPay(orderId, paymentMethod)
      setMockState('success')

      // Redirect setelah 2 detik
      setTimeout(() => {
        navigate('/pesanan-saya', {
          state: {
            successMessage: `🎉 Pembayaran ${order?.invoiceNumber} berhasil! Menunggu konfirmasi pemilik alat.`
          }
        })
      }, 2000)
    } catch (err) {
      setMockState('idle')
      alert(err.message || 'Gagal memproses pembayaran')
    }
  }, [mockState, orderId, paymentMethod, navigate, order])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      <span className="text-sm text-slate-600">Memuat instruksi pembayaran…</span>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4 text-center">
      <AlertCircle className="w-6 h-6 text-red-600" />
      <p className="text-xs text-slate-600">{error}</p>
      <button onClick={() => navigate('/pesanan-saya')} className="text-sm text-blue-600 font-semibold hover:underline">
        Lihat Pesanan Saya
      </button>
    </div>
  )

  const totalAmount = order?.totalPaid || 0
  const invoiceNumber = order?.invoiceNumber || 'INV-???'
  const vaNumber = `88008001${invoiceNumber.replace(/[^0-9]/g, '').slice(-6)}`

  // ── Mock Payment States ────────────────────────────────────────────────────
  if (mockState === 'verifying') return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex flex-col items-center justify-center gap-6 text-white">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-300" />
        </div>
        <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Memverifikasi Pembayaran...</h2>
        <p className="text-blue-200 text-sm">Menghubungkan ke SewaAlat Escrow</p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-blue-300">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )

  if (mockState === 'success') return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-teal-900 flex flex-col items-center justify-center gap-6 text-white">
      <div className="w-20 h-20 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <CheckCircle2 className="w-10 h-10 text-white" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold">Pembayaran Berhasil!</h2>
        <p className="text-emerald-200 text-sm">Dana diterima Escrow MyRent · {invoiceNumber}</p>
        <p className="text-emerald-300 text-xs">Mengarahkan ke Pesanan Saya…</p>
      </div>
    </div>
  )

  // ── Main Payment UI ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Bar */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <span className="text-[18px] text-blue-600 font-extrabold tracking-[-0.3px]">SewaAlat</span>
            <div className="w-px h-[18px] bg-slate-200" />
            <span className="text-[13px] font-semibold text-slate-900">Checkout · Pembayaran Escrow</span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">Langkah 3 dari 3</span>
        </div>
      </header>

      <main className="w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 flex flex-col gap-5 py-7 pb-12">
        <WizardSteps />

        {/* Countdown 24 jam */}
        <div className="bg-amber-50 ring-1 ring-amber-200 rounded-[14px] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-[13px] font-bold text-slate-900">Selesaikan pembayaran dalam:</div>
              <div className="text-[11px] text-slate-500">Pesanan hangus jika melewati batas waktu</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono font-extrabold text-[22px] text-amber-700 bg-white px-3.5 py-1.5 rounded-xl ring-1 ring-amber-200">
            <span>{String(paymentCountdown.hours).padStart(2, '0')}</span>
            <span className="animate-pulse">:</span>
            <span>{String(paymentCountdown.minutes).padStart(2, '0')}</span>
            <span className="animate-pulse">:</span>
            <span>{String(paymentCountdown.seconds).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* ── Left Column ────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Metode Pembayaran */}
            <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-4">
              <h2 className="text-[14px] font-bold text-slate-900">Pilih metode pembayaran</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl ring-2 transition-all cursor-pointer text-[11px] font-semibold ${
                      paymentMethod === m.id
                        ? 'ring-blue-600 bg-blue-50 text-blue-700'
                        : 'ring-slate-200 bg-white text-slate-600 hover:ring-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {m.icon}
                    <span className="text-center leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Pembayaran Dinamis */}
            {paymentMethod === 'QRIS' && (
              <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col items-center gap-4">
                <div className="text-[13px] font-bold text-slate-900">Scan QR Code untuk membayar</div>
                <div className="p-4 bg-white ring-2 ring-slate-100 rounded-2xl shadow-md">
                  <QrisCode invoiceNumber={invoiceNumber} amount={totalAmount} />
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-slate-500">Total tagihan</div>
                  <div className="text-[22px] font-extrabold text-slate-900">Rp {totalAmount.toLocaleString('id-ID')}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{invoiceNumber}</div>
                </div>
                {!qrisExpired ? (
                  <div className="flex items-center gap-2 text-[12px] text-slate-600">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Kode berlaku selama: <span className="font-bold text-blue-600 font-mono">{String(qrisMins).padStart(2,'0')}:{String(qrisSecs).padStart(2,'0')}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-red-600 font-semibold">Kode QRIS telah kedaluwarsa. Refresh halaman.</div>
                )}
                <div className="text-[11px] text-slate-400 text-center max-w-xs">
                  Scan menggunakan aplikasi perbankan atau e-wallet apapun yang mendukung QRIS
                </div>
              </div>
            )}

            {paymentMethod === 'VA_BCA' && (
              <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm">BCA</div>
                  <div>
                    <div className="text-[14px] font-bold text-slate-900">Virtual Account BCA</div>
                    <div className="text-[11px] text-slate-500">Transfer ke nomor VA berikut</div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 ring-1 ring-blue-200 rounded-xl">
                  <div className="text-[11px] text-blue-600 font-semibold mb-1">Nomor Virtual Account</div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-extrabold text-[20px] text-slate-900 tracking-widest">{vaNumber}</span>
                    <button
                      onClick={() => copyToClipboard(vaNumber)}
                      className="flex items-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold cursor-pointer transition-colors shrink-0"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Disalin!' : 'Salin'}
                    </button>
                  </div>
                </div>
                <div className="text-[13px] font-bold text-slate-900">Total transfer: <span className="text-blue-600">Rp {totalAmount.toLocaleString('id-ID')}</span></div>
                <div className="text-[11px] text-slate-500">Transfer jumlah yang tepat sesuai tagihan. Lebih atau kurang 1 digit akan menyebabkan pembayaran gagal.</div>
                <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600">
                  <div className="font-semibold text-slate-700">Cara transfer m-BCA:</div>
                  <div>1. Buka aplikasi m-BCA → Transfer → BCA Virtual Account</div>
                  <div>2. Masukkan nomor VA: <strong>{vaNumber}</strong></div>
                  <div>3. Masukkan nominal: <strong>Rp {totalAmount.toLocaleString('id-ID')}</strong></div>
                  <div>4. Konfirmasi dan selesaikan transfer</div>
                </div>
              </div>
            )}

            {paymentMethod === 'EWALLET' && (
              <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-4">
                <div className="text-[14px] font-bold text-slate-900">E-wallet</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'GOPAY', label: 'GoPay', color: 'bg-green-50 ring-green-400 text-green-700' },
                    { id: 'OVO', label: 'OVO', color: 'bg-purple-50 ring-purple-400 text-purple-700' },
                    { id: 'DANA', label: 'DANA', color: 'bg-blue-50 ring-blue-400 text-blue-700' }
                  ].map(w => (
                    <button
                      key={w.id}
                      onClick={() => setEwalletType(w.id)}
                      className={`py-3 rounded-xl ring-2 font-bold text-[13px] cursor-pointer transition-all ${
                        ewalletType === w.id ? w.color : 'ring-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-slate-700 block mb-1.5">Nomor HP terdaftar di {ewalletType}</label>
                  <input
                    type="tel"
                    value={ewalletPhone}
                    onChange={e => setEwalletPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 ring-1 ring-slate-200 focus:ring-blue-500 rounded-xl text-[13px] outline-none bg-slate-50 font-mono transition-all"
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Tautan pembayaran akan dikirim ke nomor HP yang terdaftar di {ewalletType}
                </div>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-4">
                <div className="text-[14px] font-bold text-slate-900">Kartu Kredit / Debit</div>
                {/* Preview Kartu */}
                <div className="w-full h-[160px] bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 flex flex-col justify-between text-white shadow-lg">
                  <div className="text-[11px] font-semibold opacity-80">MyRent Escrow Card</div>
                  <div className="font-mono text-[18px] font-bold tracking-widest">
                    {cardNumber.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim() || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[9px] opacity-60 uppercase tracking-wider">Nama Pemegang</div>
                      <div className="text-[12px] font-semibold uppercase">{order?.user?.fullName || 'NAMA PEMEGANG'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] opacity-60 uppercase tracking-wider">Berlaku s.d.</div>
                      <div className="text-[12px] font-semibold">{cardExpiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[12px] font-semibold text-slate-700 block mb-1.5">Nomor Kartu</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
                        setCardNumber(raw.replace(/(.{4})/g, '$1 ').trim())
                      }}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3.5 py-2.5 ring-1 ring-slate-200 focus:ring-blue-500 rounded-xl text-[13px] outline-none bg-slate-50 font-mono transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[12px] font-semibold text-slate-700 block mb-1.5">Tanggal Kadaluarsa</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '').slice(0, 4)
                          if (val.length >= 3) val = val.slice(0,2) + '/' + val.slice(2)
                          setCardExpiry(val)
                        }}
                        placeholder="MM/YY"
                        className="w-full px-3.5 py-2.5 ring-1 ring-slate-200 focus:ring-blue-500 rounded-xl text-[13px] outline-none bg-slate-50 font-mono transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-slate-700 block mb-1.5">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••"
                        className="w-full px-3.5 py-2.5 ring-1 ring-slate-200 focus:ring-blue-500 rounded-xl text-[13px] outline-none bg-slate-50 font-mono transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Cek Status */}
            <button
              onClick={handleMockPay}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[13px] rounded-xl transition-all cursor-pointer border border-slate-200 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              Saya sudah transfer — cek status pembayaran
            </button>
          </div>

          {/* ── Right Column: Summary + CTA ─────────────────────────────────── */}
          <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 sticky top-24">
            {/* Detail Pesanan */}
            <div className="bg-white ring-1 ring-slate-200 rounded-[14px] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-slate-900">Detail Pesanan</h2>
                <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{invoiceNumber}</span>
              </div>
              {order?.equipment && (
                <div className="flex items-center gap-3">
                  {order.equipment.images?.[0] && (
                    <img src={order.equipment.images[0]} alt="" className="w-12 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-slate-900 truncate">{order.equipment.name}</div>
                    <div className="text-[10px] text-slate-400">{order.rentalDays} hari · {order.deliveryMethod === 'COURIER' ? 'Kurir' : 'Ambil sendiri'}</div>
                  </div>
                </div>
              )}
              <div className="h-px bg-slate-100" />
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Sewa alat</span>
                  <span>Rp {(order?.rentalCost || 0).toLocaleString('id-ID')}</span>
                </div>
                {(order?.shippingCost || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Ongkir</span>
                    <span>Rp {order.shippingCost.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {(order?.addonsCost || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Layanan tambahan</span>
                    <span>Rp {order.addonsCost.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {(order?.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Diskon ({order.promoCode})</span>
                    <span>− Rp {order.discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Deposit escrow</span>
                  <span>Rp {(order?.depositAmount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between font-extrabold text-[13px] text-slate-900">
                  <span>Total</span>
                  <span className="text-blue-600">Rp {totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* CTA Bayar */}
            <button
              onClick={handleMockPay}
              disabled={mockState !== 'idle'}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-[15px] rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {mockState === 'idle'
                ? `Bayar Rp ${totalAmount.toLocaleString('id-ID')}`
                : <><Loader2 className="w-4 h-4 animate-spin" /> Memproses…</>}
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <span>🔒</span>
              <span>Pembayaran diamankan oleh Escrow MyRent</span>
            </div>

            {/* Info Escrow */}
            <div className="p-3.5 bg-emerald-50 ring-1 ring-emerald-200 rounded-xl">
              <div className="text-[11px] font-bold text-emerald-800 mb-1">🛡️ Perlindungan Escrow MyRent</div>
              <p className="text-[10px] text-emerald-700 leading-relaxed">
                Dana Anda tidak langsung masuk ke pemilik. MyRent menahan dana hingga Anda mengkonfirmasi alat diterima dengan baik.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
