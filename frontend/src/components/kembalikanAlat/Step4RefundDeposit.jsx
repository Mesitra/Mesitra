import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Wallet,
  ArrowRight,
  Building,
  AlertCircle,
  KeyRound,
  Copy,
  Check,
  Loader2,
  PackageCheck,
  Lock
} from 'lucide-react'
import ModalDokumenBAST from './ModalDokumenBAST'
import ModalDompet from '../pesananSaya/ModalDompet'
import { formatLongDate, formatRupiah } from '../../lib/dateHelpers'
import { getSessionUser } from '../../lib/userSession'
import { markOrderHandedOver } from '../../lib/ordersApi'

export default function Step4RefundDeposit({ order, returnData }) {
  const navigate = useNavigate()
  const user = getSessionUser()
  const kyc = user?.kycData || {}

  const [isBastModalOpen, setIsBastModalOpen] = useState(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)
  const [isMarkingHandedOver, setIsMarkingHandedOver] = useState(false)
  const [handedOverAt, setHandedOverAt] = useState(
    order?.returnData?.handedOverAt || returnData?.handedOverAt || null
  )

  const depositAmount = order?.depositAmount || 0
  const lateFee = order?.lateFee || returnData?.lateFee || 0
  const damageFee = order?.damageFee || 0
  const estimatedRefund = Math.max(0, depositAmount - lateFee - damageFee)

  const handoverPin = order?.returnData?.handoverPin || returnData?.handoverPin || '849201'
  const isUnitReceived = !!(order?.returnData?.unitReceivedAt || returnData?.unitReceivedAt)

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(handoverPin)
    setCopiedPin(true)
    setTimeout(() => setCopiedPin(false), 2000)
  }

  const handleMarkHandedOver = async () => {
    try {
      setIsMarkingHandedOver(true)
      const res = await markOrderHandedOver(order.id)
      setHandedOverAt(new Date().toISOString())
      if (res?.data) {
        order.returnData = res.data.returnData
      }
    } catch (err) {
      alert(err.message || 'Gagal menandai penyerahan unit')
    } finally {
      setIsMarkingHandedOver(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-5">
      {/* 1. Success Hero Banner */}
      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Pengembalian Berhasil Diajukan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
            BAST Akhir Diterbitkan &amp; Menunggu Serah Terima
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed m-0">
            Unit alat sedang dalam proses serah terima kembali ke pemilik. Tunjukkan PIN verifikasi di bawah saat fisik unit diserahkan.
          </p>
        </div>

        <div className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
      </section>

      {/* 2. Kode PIN Serah Terima Fisik (Handover Verification Code) */}
      <section className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 rounded-2xl p-5 sm:p-6 ring-1 ring-blue-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 m-0">
                  Kode PIN Serah Terima Unit
                </h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  Wajib untuk Pemilik
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Berikan kode ini kepada pemilik alat saat fisik unit Anda serahkan
              </p>
            </div>
          </div>

          {/* PIN Digits Display */}
          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl ring-1 ring-blue-300/80 shadow-xs self-start sm:self-auto">
            <span className="font-mono text-lg font-black tracking-widest text-blue-700 select-all">
              {handoverPin}
            </span>
            <button
              type="button"
              onClick={handleCopyPin}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Salin PIN"
            >
              {copiedPin ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2.5 border-t border-blue-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-xs text-slate-600 m-0 leading-relaxed max-w-xl flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-700 shrink-0 inline" />
            <span><strong>Proteksi Dua Pihak:</strong> Pemilik alat memerlukan kode PIN ini untuk mengonfirmasi bahwa unit fisik telah sampai di gudangnya. Jangan berikan kode ini sebelum unit diserahkan!</span>
          </p>

          {!handedOverAt ? (
            <button
              type="button"
              disabled={isMarkingHandedOver}
              onClick={handleMarkHandedOver}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-2"
            >
              {isMarkingHandedOver && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <PackageCheck className="w-4 h-4" />
              <span>Saya Sudah Menyerahkan Unit</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl ring-1 ring-emerald-200 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Unit Telah Anda Serahkan</span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Grid: Status Timeline (Left) & Refund Financial Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Timeline (7 cols) */}
        <section className="lg:col-span-7 bg-white ring-1 ring-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">
              Alur Verifikasi Pengembalian
            </h2>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Status: {order.status === 'SELESAI' ? 'Selesai' : isUnitReceived ? 'Inspeksi Berjalan' : 'Menunggu Serah Terima Fisik'}
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {/* Step A: BAST Diserahkan */}
            <div className="relative">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                    BAST Akhir Diserahkan oleh Penyewa
                  </h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md">
                    Selesai
                  </span>
                </div>
                <p className="text-xs text-slate-500 m-0">
                  Foto fisik 4 sisi dan tanda tangan digital Anda telah tersimpan secara resmi di dokumen No. BAST-OUT-{order.invoiceNumber}.
                </p>
                <div className="text-[10px] text-slate-400 pt-1">
                  Waktu penyerahan: {formatLongDate(returnData?.bastSubmittedAt || new Date())}
                </div>
              </div>
            </div>

            {/* Step B: Konfirmasi Penerimaan Fisik via PIN */}
            <div className="relative">
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-xs ${
                  isUnitReceived || order.status === 'SELESAI'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white animate-pulse'
                }`}
              >
                {isUnitReceived || order.status === 'SELESAI' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                    Konfirmasi Penerimaan Fisik Unit (Input PIN)
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      isUnitReceived || order.status === 'SELESAI'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}
                  >
                    {isUnitReceived || order.status === 'SELESAI' ? 'Fisik Diterima' : 'Menunggu Input PIN'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 m-0 leading-relaxed">
                  {isUnitReceived
                    ? `Unit fisik telah terkonfirmasi diterima oleh pemilik pada ${formatLongDate(order?.returnData?.unitReceivedAt || new Date())}.`
                    : `Pemilik alat (${order.equipment?.owner?.fullName || 'Mitra Pemilik'}) akan menginput PIN serah terima saat alat tiba di gudang.`}
                </p>
                <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 mt-1 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Proteksi SLA Escrow:</strong> Bila unit telah diserahkan dan pemilik tidak melakukan konfirmasi dalam batas waktu 24 jam setelah jadwal, sistem Mesitra akan melakukan verifikasi otomatis (Auto-Confirm) demi melindungi hak penyewa.
                  </span>
                </div>
              </div>
            </div>

            {/* Step C: Inspeksi Fisik 2x24 Jam */}
            <div className="relative">
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-xs ${
                  order.status === 'SELESAI'
                    ? 'bg-emerald-600 text-white'
                    : isUnitReceived
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 ring-1 ring-slate-300 text-slate-400'
                }`}
              >
                {order.status === 'SELESAI' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                    Inspeksi Fisik &amp; Fungsi Alat (2×24 Jam)
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      order.status === 'SELESAI'
                        ? 'bg-emerald-50 text-emerald-700'
                        : order.status === 'DISPUTE'
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        : isUnitReceived
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {order.status === 'SELESAI'
                      ? 'Disetujui'
                      : order.status === 'DISPUTE'
                      ? 'Klaim / Dispute Diajukan'
                      : isUnitReceived
                      ? 'Sedang Berlangsung'
                      : 'Aktif Setelah PIN Diinput'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 m-0 leading-relaxed">
                  Pemilik alat memiliki waktu maksimal 2×24 jam kerja untuk memeriksa kelengkapan &amp; fungsi mesin sesuai checklist BAST.
                </p>
                {order.status === 'DISPUTE' && (order.disputeReason || order.disputeNote) && (
                  <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Alasan Klaim dari Pemilik Alat:</span>
                    </div>
                    <p className="text-xs text-rose-950 font-medium m-0 bg-white/80 p-2 rounded border border-rose-200">
                      "{order.disputeReason || order.disputeNote}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Step C: Refund Deposit */}
            <div className="relative">
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-xs ${
                  order.status === 'SELESAI'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 ring-1 ring-slate-300 text-slate-400'
                }`}
              >
                {order.status === 'SELESAI' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                    Pencairan Refund Deposit ke Dompet
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                    {order.status === 'SELESAI' ? 'Telah Dicairkan' : 'Menunggu Hasil Inspeksi'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 m-0">
                  Dana deposit sebesar <strong className="text-slate-800">Rp {formatRupiah(estimatedRefund)}</strong> yang ditahan di escrow SewaAlat akan langsung diteruskan ke Dompet Anda setelah verifikasi disetujui.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Escrow & Refund Financials (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card Rincian Deposit */}
          <section className="bg-white ring-1 ring-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 m-0">Rincian Refund Deposit</h2>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Dana Terproteksi
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Security Deposit Awal</span>
                <span className="font-semibold text-slate-900">Rp {formatRupiah(depositAmount)}</span>
              </div>

              {lateFee > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Denda Keterlambatan ({returnData?.daysLate || 0} hari)</span>
                  <span className="font-semibold">- Rp {formatRupiah(lateFee)}</span>
                </div>
              )}

              {damageFee > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Biaya Klaim Kerusakan Fisik</span>
                  <span className="font-semibold">- Rp {formatRupiah(damageFee)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">Estimasi Dana Kembali</span>
                <span className="text-base font-extrabold text-blue-700">
                  Rp {formatRupiah(estimatedRefund)}
                </span>
              </div>
            </div>

            {/* Destination Bank Account */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Rekening Pencairan Terdaftar
              </div>
              <div className="p-3 bg-slate-50 rounded-xl ring-1 ring-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                    {kyc.bankName || 'BANK'}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">
                      {kyc.bankAccountNumber || '8830-1928-44'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      a.n. {kyc.bankAccountName || user?.fullName || 'Penyewa Terdaftar'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Terverifikasi
                </span>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsBastModalOpen(true)}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Lihat Detail Dokumen BAST Akhir</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100/80 ring-1 ring-blue-200 rounded-xl text-xs font-bold text-blue-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Wallet className="w-4 h-4 text-blue-600" />
              <span>Buka Dompet Penyewa</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/pesanan-saya')}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Kembali ke Pesanan Saya</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dokumen BAST */}
      <ModalDokumenBAST
        isOpen={isBastModalOpen}
        onClose={() => setIsBastModalOpen(false)}
        order={order}
        returnData={returnData}
      />

      {/* Modal Dompet Penyewa */}
      <ModalDompet
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  )
}
