import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Package,
  FileText,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Calendar
} from 'lucide-react'
import { formatRupiah } from '../../lib/equipmentsApi'
import { formatShortDate } from '../../lib/dateHelpers'

const STATUS_BADGE = {
  MENUNGGU_PEMBAYARAN: { label: 'Menunggu Bayar', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  MENUNGGU_KONFIRMASI: { label: 'Menunggu Konfirmasi', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  DIKIRIM: { label: 'Sedang Dikirim', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  SEWA_AKTIF: { label: 'Sewa Aktif', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  INSPEKSI: { label: 'Inspeksi Pemilik', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  SELESAI: { label: 'Selesai', bg: 'bg-slate-100 text-slate-700 border-slate-300' },
  DISPUTE: { label: 'Sengketa / Klaim', bg: 'bg-rose-50 text-rose-700 border-rose-300' },
  DITOLAK: { label: 'Ditolak', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
}

export default function ChatContextCard({ contextType, contextData, isOutgoing = false }) {
  const navigate = useNavigate()

  if (!contextType || !contextData) return null

  // ── 1. Konteks Unit Alat (EQUIPMENT) ──────────────────────────────────────────
  if (contextType === 'EQUIPMENT') {
    const {
      id,
      name,
      category,
      image,
      images,
      pricePerDay,
      deposit,
      powerWatt,
      location
    } = contextData

    const imageUrl =
      image ||
      (Array.isArray(images) && images.length > 0
        ? typeof images[0] === 'string'
          ? images[0]
          : images[0]?.url
        : null) ||
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'

    return (
      <div
        className={`w-full max-w-sm rounded-xl p-3 border mb-2 transition-all ${
          isOutgoing
            ? 'bg-blue-700/60 border-blue-400/50 text-white'
            : 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-1.5 pb-2 border-b border-white/20 mb-2">
          <Package className={`w-3.5 h-3.5 ${isOutgoing ? 'text-blue-200' : 'text-blue-600'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isOutgoing ? 'text-blue-200' : 'text-blue-600'}`}>
            Produk Terkait
          </span>
          {category && (
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${isOutgoing ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'}`}>
              {category}
            </span>
          )}
        </div>

        <div className="flex gap-2.5 items-start">
          <img
            src={imageUrl}
            alt={name || 'Alat'}
            className="w-14 h-14 object-cover rounded-lg shrink-0 border border-black/10 bg-slate-100"
          />

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold leading-snug line-clamp-2 m-0 mb-1">
              {name || 'Unit Alat Sewa'}
            </h4>

            <div className="flex items-center gap-1 text-[11px] mb-1">
              <span className="font-extrabold tabular-nums">
                {pricePerDay ? formatRupiah(pricePerDay) : 'Rp 0'}
              </span>
              <span className={`text-[10px] ${isOutgoing ? 'text-blue-200' : 'text-slate-500'}`}>
                /hari
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px]">
              {powerWatt !== undefined && (
                <span className={`flex items-center gap-0.5 ${isOutgoing ? 'text-blue-200' : 'text-slate-500'}`}>
                  <Zap className="w-2.5 h-2.5" />
                  {powerWatt} W
                </span>
              )}
              {deposit ? (
                <span className={isOutgoing ? 'text-blue-200' : 'text-slate-500'}>
                  Dep: {formatRupiah(deposit)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/alat/${id}`)
            }}
            className={`mt-2.5 w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0 ${
              isOutgoing
                ? 'bg-white text-blue-700 hover:bg-blue-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span>Lihat Detail Alat</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  // ── 2. Konteks Pesanan / Sengketa (ORDER) ─────────────────────────────────────
  if (contextType === 'ORDER') {
    const {
      id,
      invoiceNumber,
      status,
      equipmentName,
      equipmentImage,
      totalPaid,
      depositAmount,
      startDate,
      endDate,
      disputeReason
    } = contextData

    const badge = STATUS_BADGE[status] || {
      label: status || 'Pesanan',
      bg: 'bg-slate-100 text-slate-700 border-slate-200'
    }

    const imageUrl =
      equipmentImage ||
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'

    return (
      <div
        className={`w-full max-w-sm rounded-xl p-3 border mb-2 transition-all ${
          isOutgoing
            ? 'bg-blue-700/60 border-blue-400/50 text-white'
            : 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        {/* Header Invoice & Status */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/20 mb-2">
          <div className="flex items-center gap-1">
            <FileText className={`w-3.5 h-3.5 ${isOutgoing ? 'text-blue-200' : 'text-blue-600'}`} />
            <span className="text-[11px] font-mono font-bold">
              {invoiceNumber || 'INV-...'}
            </span>
          </div>

          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}>
            {badge.label}
          </span>
        </div>

        {/* Content Preview */}
        <div className="flex gap-2.5 items-start">
          <img
            src={imageUrl}
            alt={equipmentName || 'Pesanan'}
            className="w-14 h-14 object-cover rounded-lg shrink-0 border border-black/10 bg-slate-100"
          />

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold leading-snug line-clamp-1 m-0 mb-1">
              {equipmentName || 'Unit Alat Sewa'}
            </h4>

            {startDate && endDate && (
              <div className={`flex items-center gap-1 text-[10px] mb-1 ${isOutgoing ? 'text-blue-200' : 'text-slate-500'}`}>
                <Calendar className="w-2.5 h-2.5" />
                <span>
                  {formatShortDate(startDate)} – {formatShortDate(endDate)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px]">
              {totalPaid ? (
                <span className="font-bold tabular-nums">
                  Total: {formatRupiah(totalPaid)}
                </span>
              ) : null}
              {depositAmount ? (
                <span className={isOutgoing ? 'text-blue-200' : 'text-slate-500'}>
                  Dep: {formatRupiah(depositAmount)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Dispute Callout if DISPUTE */}
        {status === 'DISPUTE' && disputeReason && (
          <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1 font-bold mb-0.5 text-rose-900">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Detail Klaim Sengketa</span>
            </div>
            <p className="m-0 text-[10px] text-rose-700 italic">
              &ldquo;{disputeReason}&rdquo;
            </p>
          </div>
        )}

        {/* Action Link to Pesanan */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate('/pesanan-saya')
          }}
          className={`mt-2.5 w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0 ${
            isOutgoing
              ? 'bg-white text-blue-700 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <span>Lihat Status Pesanan</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return null
}

