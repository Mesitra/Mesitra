import React from 'react'
import { X, Printer, ShieldCheck, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatLongDate, formatRupiah } from '../../lib/dateHelpers'
import { getSessionUser } from '../../lib/userSession'

export default function ModalDokumenBAST({ isOpen, onClose, order, returnData }) {
  if (!isOpen || !order) return null

  const currentUser = getSessionUser()
  const kyc = currentUser?.kycData || {}
  const equipment = order.equipment || {}
  const owner = equipment.owner || {}

  const handlePrint = () => {
    window.print()
  }

  const checklistItems = [
    { label: 'Mesin dapat menyala normal & elemen panas berfungsi', ok: returnData?.checklist?.mesinMenyala },
    { label: 'Bodi fisik utuh, tanpa penyok baru atau retak kaca', ok: returnData?.checklist?.bodiUtuh },
    { label: 'Semua tombol & indikator panel kontrol responsif', ok: returnData?.checklist?.komponenLengkap },
    { label: 'Kebersihan unit telah dibersihkan / backflush', ok: returnData?.checklist?.kebersihanOk }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Berita Acara Serah Terima (BAST Akhir)
              </h2>
              <p className="text-[11px] text-slate-500 m-0">
                No. Dokumen: BAST-OUT-{order.invoiceNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto text-slate-800 font-sans text-xs space-y-6">
          {/* Document Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div>
              <div className="text-lg font-black text-blue-600 tracking-tight">Mesitra</div>
              <p className="text-[10px] text-slate-500 m-0">
                Platform Sewa Mesin &amp; Alat Usaha UMKM Terverifikasi Indonesia
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                BERITA ACARA SERAH TERIMA PENGEMBALIAN ALAT
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                Lampiran Invoice: {order.invoiceNumber} · Tanggal: {formatLongDate(new Date())}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                PIHAK PERTAMA (Penyewa / Pengembali)
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {currentUser?.fullName || 'Penyewa Terdaftar'}
              </div>
              <div className="text-slate-600">
                {kyc.businessName ? `${kyc.businessName} (UMKM)` : 'Penyewa Terverifikasi'}
              </div>
              <div className="text-slate-500 text-[11px]">
                {returnData?.pickupAddress || kyc.address || 'Alamat terdaftar di profil'}
              </div>
              <div className="text-slate-500 text-[11px]">
                Telp: {returnData?.pickupPhone || currentUser?.phone || '-'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                PIHAK KEDUA (Pemilik Alat / Penerima)
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {owner.fullName || equipment.ownerName || 'Pemilik Alat Mitra Mesitra'}
              </div>
              <div className="text-slate-600">
                Lokasi Gudang: {equipment.location || 'Gudang Pusat Pemilik'}
              </div>
              <div className="text-slate-500 text-[11px]">
                Platform Escrow: PT Mesitra Solusi Digital
              </div>
              <div className="text-slate-500 text-[11px]">
                Deposit Escrow: Rp {formatRupiah(order.depositAmount)} (Dijamin Aman)
              </div>
            </div>
          </div>

          {/* Unit Specifications */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              1. Rincian Unit yang Dikembalikan
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama Alat &amp; Tipe</th>
                    <th className="py-2.5 px-3">Periode Sewa</th>
                    <th className="py-2.5 px-3">Metode Pengembalian</th>
                    <th className="py-2.5 px-3 text-right">Status Deposit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold">
                      {equipment.name || 'Mesin Usaha'}
                      <div className="text-[10px] text-slate-500 font-normal">
                        Kategori: {equipment.category || 'Alat'} · S/N: SN-MR-{order.id.slice(0, 8).toUpperCase()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {order.rentalDays} hari ({formatLongDate(order.startDate)} – {formatLongDate(order.endDate)})
                    </td>
                    <td className="py-2.5 px-3">
                      {returnData?.returnMethod === 'STORE_DROPOFF' ? 'Antar Mandiri ke Gudang' : 'Penjemputan Kurir Toko'}
                      <div className="text-[10px] text-slate-500">
                        {formatLongDate(returnData?.returnDate || order.endDate)} ({returnData?.returnSlot || '09:00 - 12:00 WIB'})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      Rp {formatRupiah(order.depositAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Condition Checklist Summary */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              2. Hasil Pemeriksaan Fisik Mandiri oleh Penyewa
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border text-[11px] ${
                    item.ok
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}
                >
                  {item.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {returnData?.conditionNotes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <span className="font-bold">Catatan kondisi tambahan dari penyewa: </span>
                {returnData.conditionNotes}
              </div>
            )}
          </div>

          {/* Accessories Checklist */}
          {returnData?.accessories && returnData.accessories.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                3. Kelengkapan Aksesoris Pendukung
              </div>
              <div className="flex flex-wrap gap-2">
                {returnData.accessories.map((acc, idx) => (
                  <span
                    key={idx}
                    className="py-1 px-2.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium"
                  >
                    {acc.name}: <strong className="text-slate-900">{acc.returned}/{acc.total}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Signatures Block */}
          <div className="pt-2">
            <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">
              4. Pengesahan &amp; Tanda Tangan Para Pihak
            </div>
            <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-200">
              {/* Pihak Penyewa */}
              <div className="text-center space-y-1 flex flex-col items-center">
                <div className="text-[10px] font-bold text-slate-500">Penyewa (Yang Menyerahkan)</div>
                <div className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-1 overflow-hidden my-1">
                  {returnData?.signature ? (
                    <img
                      src={returnData.signature}
                      alt="Tanda Tangan Penyewa"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Belum ditandatangani</span>
                  )}
                </div>
                <div className="font-bold text-slate-900">{currentUser?.fullName || 'Penyewa'}</div>
                <div className="text-[10px] text-slate-500">
                  {returnData?.signedAt
                    ? `Ditandatangani secara digital · ${formatLongDate(returnData.signedAt)}`
                    : 'Tanda tangan digital terenkripsi'}
                </div>
              </div>

              {/* Pihak Pemilik */}
              <div className="text-center space-y-1 flex flex-col items-center">
                <div className="text-[10px] font-bold text-slate-500">Pemilik Alat (Yang Menerima)</div>
                <div className="w-full h-20 bg-amber-50/50 border border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center p-2 text-center my-1">
                  <ShieldCheck className="w-4 h-4 text-amber-600 mb-0.5" />
                  <span className="text-[10px] font-semibold text-amber-800">
                    Menunggu Konfirmasi Pemilik
                  </span>
                  <span className="text-[9px] text-amber-700">Saat inspeksi fisik selesai</span>
                </div>
                <div className="font-bold text-slate-900">
                  {owner.fullName || equipment.ownerName || 'Pemilik Alat Mitra Mesitra'}
                </div>
                <div className="text-[10px] text-slate-500">Batas verifikasi maksimal 2x24 jam kerja</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  )
}
