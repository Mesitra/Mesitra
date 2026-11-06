import React from 'react'
import {
  Inbox,
  AlertTriangle,
  ChevronDown
} from 'lucide-react'

const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`

export default function OrderList({
  orders = [],
  selectedOrder = null,
  onSelectOrder,
  isCompact = false
}) {
  const pendingOrders = orders.filter((o) =>
    ['MENUNGGU_KONFIRMASI', 'PENDING'].includes(o.status)
  )

  // Mode Tablet Compact: hanya tampilkan avatar/inisial dan indikator status
  if (isCompact) {
    return (
      <aside className="w-20 md:w-24 shrink-0 bg-white border border-slate-200/90 rounded-2xl p-2.5 flex flex-col items-center gap-3 transition-all duration-300 shadow-xs">
        {/* Compact Header */}
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 relative my-1">
          <Inbox className="w-5 h-5 text-slate-600" />
          {pendingOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
              {pendingOrders.length}
            </span>
          )}
        </div>

        <div className="w-full h-px bg-slate-100" />

        {/* Compact List Items */}
        <div className="w-full flex flex-col items-center gap-2 overflow-y-auto max-h-[640px] py-1">
          {orders.map((order) => {
            const isSelected = selectedOrder?.id === order.id
            const initials = order.user?.initials || order.user?.fullName?.substring(0, 2).toUpperCase() || 'UM'

            return (
              <button
                key={order.id}
                type="button"
                onClick={() => onSelectOrder(order)}
                title={`${order.user?.fullName || 'Penyewa'} - ${order.invoiceNumber}`}
                aria-label={`Pilih pesanan ${order.invoiceNumber}`}
                className={`w-12 h-12 rounded-xl flex items-center justify-center relative cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-600 text-blue-700 shadow-xs ring-2 ring-blue-100'
                    : 'bg-slate-100 border border-slate-200/80 text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <span className="text-xs font-extrabold tracking-tight">
                  {initials}
                </span>

                {/* Status Dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    order.status === 'MENUNGGU_KONFIRMASI'
                      ? 'bg-amber-500'
                      : order.status === 'SEWA_AKTIF'
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </aside>
    )
  }

  // Mode Normal (Desktop Full / Split-Pane Normal)
  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl flex flex-col overflow-hidden transition-all duration-300 shadow-xs">
      {/* Header List */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            Antrean konfirmasi
          </h2>
          {pendingOrders.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold shadow-2xs">
              {pendingOrders.length}
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          aria-label="Urutkan antrean"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* List Items */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[640px]">
        {orders.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Tidak ada pesanan</p>
            <p className="text-[11px] text-slate-400">Belum ada pesanan yang masuk pada kategori ini.</p>
          </div>
        ) : (
          orders.map((order) => {
            const isSelected = selectedOrder?.id === order.id
            const initials = order.user?.initials || order.user?.fullName?.substring(0, 2).toUpperCase() || 'UM'

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectOrder(order)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectOrder(order)
                  }
                }}
                className={`p-3.5 sm:p-4 flex flex-col gap-1.5 cursor-pointer text-left transition-all ${
                  isSelected
                    ? 'bg-blue-50/70 border-l-4 border-l-blue-600 shadow-2xs'
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                {/* Baris 1: Avatar, Nama Penyewa, Waktu */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-900 text-white font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                      {order.user?.fullName || 'Penyewa UMKM'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {order.timeAgo || 'baru saja'}
                  </span>
                </div>

                {/* Baris 2: Nama Alat */}
                <div className="text-xs font-semibold text-slate-700 truncate pl-8 sm:pl-9">
                  {order.equipment?.name || 'Unit Alat Sewa'}
                </div>

                {/* Baris 3: Durasi, Invoice, Total Harga */}
                <div className="flex items-center justify-between gap-2 pt-0.5 pl-8 sm:pl-9">
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                    {order.rentalDays ? `${order.rentalDays} hari` : '4 hari'} · {order.invoiceNumber}
                  </div>
                  <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 tabular-nums shrink-0">
                    {formatRupiah(order.totalPaid || order.rentalCost)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Banner Catatan Respons */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="truncate">
          Balas dalam 1×24 jam agar tingkat respons tetap tinggi.
        </span>
      </div>
    </div>
  )
}
