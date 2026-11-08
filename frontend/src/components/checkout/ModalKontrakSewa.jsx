/**
 * ModalKontrakSewa.jsx
 *
 * Modal Kontrak Sewa Digital yang menampilkan:
 *  - Pasal-pasal kontrak sewa dengan data dinamis (nama penyewa, pemilik, alat, periode, deposit, denda)
 *  - Opsi tanda tangan digital (checkbox persetujuan + timestamp)
 *  - Setelah disetujui: badge kuning "Wajib disetujui" berubah jadi hijau "Kontrak Disetujui ✓"
 */

import React, { useState } from 'react'
import { X, ScrollText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

const PASAL = [
  {
    title: 'Pasal 1 — Objek Sewa',
    content: (d) => `Pihak Pemilik Alat (${d.ownerName}) menyewakan unit ${d.equipmentName} kepada Pihak Penyewa (${d.renterName} / ${d.businessName}) untuk digunakan di lokasi usaha Pihak Penyewa.`
  },
  {
    title: 'Pasal 2 — Periode Sewa',
    content: (d) => `Masa sewa dimulai pada ${d.startDate} dan berakhir pada ${d.endDate} (${d.rentalDays} hari). Waktu serah terima alat adalah pukul 09.00–20.00 WIB.`
  },
  {
    title: 'Pasal 3 — Harga Sewa & Escrow',
    content: (d) => `Pihak Penyewa membayar biaya sewa sebesar Rp ${d.totalPaid.toLocaleString('id-ID')} (termasuk deposit Rp ${d.depositAmount.toLocaleString('id-ID')}) ke rekening escrow MyRent. Dana escrow hanya dilepaskan ke Pihak Pemilik setelah Pihak Penyewa mengkonfirmasi penerimaan unit dalam kondisi baik.`
  },
  {
    title: 'Pasal 4 — Deposit & Pengembalian',
    content: (d) => `Deposit sebesar Rp ${d.depositAmount.toLocaleString('id-ID')} ditahan selama masa sewa sebagai jaminan. Deposit dikembalikan penuh ke Pihak Penyewa dalam 1×24 jam setelah Pihak Pemilik menyelesaikan inspeksi dan menyatakan unit kembali dalam kondisi baik.`
  },
  {
    title: 'Pasal 5 — Tanggung Jawab Penyewa',
    content: () => `Pihak Penyewa bertanggung jawab penuh atas kerusakan, kehilangan, atau penyalahgunaan unit selama masa sewa. Pihak Penyewa wajib mengoperasikan unit sesuai panduan teknis yang diberikan, tidak memindahtangankan unit kepada pihak ketiga, dan mengembalikan unit dalam kondisi bersih dan berfungsi normal.`
  },
  {
    title: 'Pasal 6 — Denda Keterlambatan',
    content: (d) => `Setiap hari keterlambatan pengembalian unit dikenakan denda sebesar Rp ${(d.pricePerDay * 1.5).toLocaleString('id-ID')} (1,5× tarif harian). Denda keterlambatan diambil dari deposit sebelum deposit dikembalikan ke Pihak Penyewa.`
  },
  {
    title: 'Pasal 7 — Force Majeure & Penyelesaian Sengketa',
    content: () => `Dalam hal terjadi bencana alam, kebijakan pemerintah, atau kondisi di luar kendali para pihak, penyelesaian dilakukan dengan musyawarah. Sengketa yang tidak bisa diselesaikan secara mufakat diserahkan ke tim mediasi MyRent sebagai pihak netral.`
  }
]

export default function ModalKontrakSewa({
  isOpen,
  onClose,
  onAgree,
  isAgreed = false,
  setIsAgreed,
  alreadyAgreed = false,
  contractData = {}
}) {
  const [openPasal, setOpenPasal] = useState(null)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const effectiveAgreed = Boolean(isAgreed || alreadyAgreed)
  const [isChecked, setIsChecked] = useState(false)
  const checked = effectiveAgreed || isChecked

  if (!isOpen) return null

  const d = {
    ownerName: contractData.ownerName || 'Pemilik Alat',
    renterName: contractData.renterName || 'Penyewa',
    businessName: contractData.businessName || 'UMKM Anda',
    equipmentName: contractData.equipmentName || 'Unit Alat',
    startDate: contractData.startDate || '-',
    endDate: contractData.endDate || '-',
    rentalDays: contractData.rentalDays || 0,
    totalPaid: contractData.totalPaid || 0,
    depositAmount: contractData.depositAmount || 0,
    pricePerDay: contractData.pricePerDay || 0,
    agreedAt: contractData.agreedAt
  }

  const handleScroll = (e) => {
    const el = e.target
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (atBottom) setScrolledToBottom(true)
  }

  const handleAgree = () => {
    if (onAgree) {
      onAgree(new Date().toISOString())
    } else if (setIsAgreed) {
      setIsAgreed(true)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Kontrak Sewa Digital</h2>
              <p className="text-[11px] text-slate-500">MyRent — Platform Sewa Alat Terverifikasi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>

        {/* Info Kontrak */}
        <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 shrink-0">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <div><span className="text-slate-500">Penyewa:</span> <span className="font-semibold text-slate-900">{d.renterName} ({d.businessName})</span></div>
            <div><span className="text-slate-500">Pemilik:</span> <span className="font-semibold text-slate-900">{d.ownerName}</span></div>
            <div><span className="text-slate-500">Unit:</span> <span className="font-semibold text-slate-900">{d.equipmentName}</span></div>
            <div><span className="text-slate-500">Periode:</span> <span className="font-semibold text-slate-900">{d.startDate} → {d.endDate} ({d.rentalDays} hari)</span></div>
            <div><span className="text-slate-500">Total Bayar:</span> <span className="font-bold text-blue-700">Rp {d.totalPaid.toLocaleString('id-ID')}</span></div>
            <div><span className="text-slate-500">Deposit:</span> <span className="font-semibold text-slate-900">Rp {d.depositAmount.toLocaleString('id-ID')}</span></div>
          </div>
        </div>

        {/* Pasal-pasal (scrollable) */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
          onScroll={handleScroll}
        >
          {PASAL.map((pasal, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenPasal(openPasal === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-left"
              >
                <span>{pasal.title}</span>
                {openPasal === i ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {openPasal === i && (
                <div className="px-4 pb-4 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {pasal.content(d)}
                </div>
              )}
            </div>
          ))}

          <div className="text-center text-[10px] text-slate-400 py-2">
            — Akhir Dokumen Kontrak Sewa —
          </div>
        </div>

        {/* Footer: Persetujuan */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0">
          {effectiveAgreed ? (
            <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50 ring-1 ring-emerald-300 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-[13px] font-bold text-emerald-800">Kontrak Disetujui</div>
                  <div className="text-[11px] text-emerald-600">
                    Disetujui pada: {d.agreedAt ? new Date(d.agreedAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="py-1.5 px-3.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg ring-1 ring-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setIsChecked(e.target.checked)}
                  className="mt-0.5 accent-blue-600 w-4 h-4 shrink-0"
                />
                <span className="text-[12px] text-slate-700 leading-relaxed">
                  Saya, <strong>{d.renterName}</strong>, menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan dalam Kontrak Sewa Digital ini. Persetujuan ini bersifat sah secara hukum sebagai tanda tangan digital.
                </span>
              </label>
              <button
                onClick={handleAgree}
                disabled={!checked}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-[13px] rounded-xl transition-all cursor-pointer"
              >
                {checked ? 'Setujui Kontrak Sewa' : 'Centang persetujuan di atas untuk melanjutkan'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
