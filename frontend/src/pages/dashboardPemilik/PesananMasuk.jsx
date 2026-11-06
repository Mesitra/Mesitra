import React, { useState, useMemo } from 'react'
import { Search, Download, Calendar, ChevronDown } from 'lucide-react'
import OrderList from './OrderList'
import OrderDetail from './OrderDetail'

// Data default/mockup sesuai referensi HTML PesananMasuk.html
export const MOCK_ORDERS = [
  {
    id: 'ord-1',
    invoiceNumber: 'INV-2406-021',
    status: 'MENUNGGU_KONFIRMASI',
    timeAgo: 'baru 12 mnt lalu',
    startDate: '2025-06-18',
    endDate: '2025-06-21',
    rentalDays: 4,
    deliveryType: 'Ambil di gudang',
    location: 'Gudang Cilandak',
    dailyRate: 375000,
    rentalCost: 1500000,
    depositAmount: 500000,
    serviceFee: 25000,
    totalPaid: 1575000,
    netEarnings: 1550000,
    user: {
      fullName: 'Dapur Roti Andini',
      initials: 'DA',
      isVerified: true,
      nib: '9120 4471 8830',
      power: 'Daya usaha 1300 W',
      city: 'Bandung',
      rating: 4.9,
      completedRentals: 38
    },
    equipment: {
      name: 'Oven Deck Bakery 2 Pintu',
      category: 'Oven & Bakery'
    }
  },
  {
    id: 'ord-2',
    invoiceNumber: 'INV-2406-024',
    status: 'MENUNGGU_KONFIRMASI',
    timeAgo: '1 jam lalu',
    startDate: '2025-06-22',
    endDate: '2025-06-25',
    rentalDays: 4,
    deliveryType: 'Ambil di gudang',
    location: 'Gudang Cilandak',
    dailyRate: 173750,
    rentalCost: 695000,
    depositAmount: 300000,
    serviceFee: 20000,
    totalPaid: 695000,
    netEarnings: 675000,
    user: {
      fullName: 'Warung Sate Pak Hari',
      initials: 'WA',
      isVerified: true,
      nib: '9120 3341 5521',
      power: 'Daya usaha 900 W',
      city: 'Jakarta Selatan',
      rating: 4.8,
      completedRentals: 19
    },
    equipment: {
      name: 'Mesin Kemasan Vakum',
      category: 'Mesin Kemasan'
    }
  },
  {
    id: 'ord-3',
    invoiceNumber: 'INV-2406-027',
    status: 'MENUNGGU_KONFIRMASI',
    timeAgo: '3 jam lalu',
    startDate: '2025-06-24',
    endDate: '2025-06-27',
    rentalDays: 3,
    deliveryType: 'Ambil di gudang',
    location: 'Gudang Cilandak',
    dailyRate: 150000,
    rentalCost: 450000,
    depositAmount: 250000,
    serviceFee: 15000,
    totalPaid: 450000,
    netEarnings: 435000,
    user: {
      fullName: 'Kedai Bumi',
      initials: 'KB',
      isVerified: true,
      nib: '9120 8892 1104',
      power: 'Daya usaha 2200 W',
      city: 'Bandung',
      rating: 5.0,
      completedRentals: 42
    },
    equipment: {
      name: 'Grinder Kopi Flat Burr',
      category: 'Mesin Kopi'
    }
  },
  {
    id: 'ord-4',
    invoiceNumber: 'INV-2406-019',
    status: 'SEWA_AKTIF',
    timeAgo: 'kemarin',
    startDate: '2025-06-26',
    endDate: '2025-06-29',
    rentalDays: 4,
    deliveryType: 'Kirim via kurir toko',
    location: 'Gudang Cilandak',
    dailyRate: 120000,
    rentalCost: 480000,
    depositAmount: 300000,
    serviceFee: 15000,
    totalPaid: 480000,
    netEarnings: 465000,
    user: {
      fullName: 'Bakery Roti Manis',
      initials: 'BR',
      isVerified: true,
      nib: '9120 1192 4432',
      power: 'Daya usaha 1500 W',
      city: 'Tangerang',
      rating: 4.7,
      completedRentals: 25
    },
    equipment: {
      name: 'Mixer Planetary 10L',
      category: 'Oven & Bakery'
    }
  },
  {
    id: 'ord-5',
    invoiceNumber: 'INV-2406-016',
    status: 'INSPEKSI',
    timeAgo: 'kemarin',
    startDate: '2025-06-28',
    endDate: '2025-07-02',
    rentalDays: 5,
    deliveryType: 'Ambil di gudang',
    location: 'Gudang Cilandak',
    dailyRate: 290000,
    rentalCost: 1450000,
    depositAmount: 600000,
    serviceFee: 30000,
    totalPaid: 1450000,
    netEarnings: 1420000,
    user: {
      fullName: 'Toko Buah Segar',
      initials: 'TS',
      isVerified: true,
      nib: '9120 7712 8820',
      power: 'Daya usaha 1800 W',
      city: 'Jakarta Barat',
      rating: 4.9,
      completedRentals: 31
    },
    equipment: {
      name: 'Chiller Display 2 Pintu',
      category: 'Pendingin'
    }
  }
]

// Normalisasi data jika orders di-pass dari backend API
function normalizeOrder(order) {
  if (!order) return null
  const initials = order.user?.fullName
    ? order.user.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : (order.user?.initials || 'UM')

  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber || `INV-${order.id}`,
    status: order.status || 'MENUNGGU_KONFIRMASI',
    timeAgo: order.timeAgo || 'Baru saja',
    startDate: order.startDate || '2025-06-18',
    endDate: order.endDate || '2025-06-21',
    rentalDays: order.rentalDays || 4,
    deliveryType: order.deliveryType || 'Ambil di gudang',
    location: order.location || 'Gudang Cilandak',
    dailyRate: order.dailyRate || Math.round((order.rentalCost || 1500000) / (order.rentalDays || 4)),
    rentalCost: order.rentalCost || 1500000,
    depositAmount: order.depositAmount || 500000,
    serviceFee: order.serviceFee || 25000,
    totalPaid: order.totalPaid || (order.rentalCost ? order.rentalCost + (order.depositAmount || 0) : 1575000),
    netEarnings: order.netEarnings || order.rentalCost || 1550000,
    user: {
      fullName: order.user?.kycData?.businessName || order.user?.fullName || 'Penyewa UMKM',
      initials: order.user?.initials || initials,
      isVerified: order.user?.isVerified ?? true,
      nib: order.user?.nib || '9120 4471 8830',
      power: order.user?.power || 'Daya usaha 1300 W',
      city: order.user?.city || 'Bandung',
      rating: order.user?.rating || 4.9,
      completedRentals: order.user?.completedRentals || 38
    },
    equipment: {
      name: order.equipment?.name || 'Unit Alat',
      category: order.equipment?.category || 'Komersial'
    }
  }
}

export default function PesananMasuk({
  orders: propOrders,
  onAcceptOrder,
  onRejectOrder,
  onOpenChat,
  onInspectOrder,
  actionLoadingId
}) {
  // State Utama: selectedOrder (Task 2)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('MENUNGGU_KONFIRMASI')

  // Gabungkan dan normalisasi orders
  const activeOrders = useMemo(() => {
    const source = (propOrders && propOrders.length > 0) ? propOrders : MOCK_ORDERS
    return source.map(normalizeOrder)
  }, [propOrders])

  // Filter berdasarkan tab status dan search query
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      // Filter status tab
      if (statusFilter === 'MENUNGGU_KONFIRMASI') {
        if (!['MENUNGGU_KONFIRMASI', 'PENDING'].includes(order.status)) return false
      } else if (statusFilter === 'SEWA_AKTIF') {
        if (!['SEWA_AKTIF', 'DIKIRIM'].includes(order.status)) return false
      } else if (statusFilter === 'INSPEKSI') {
        if (order.status !== 'INSPEKSI') return false
      } else if (statusFilter === 'SELESAI') {
        if (order.status !== 'SELESAI') return false
      }

      // Filter search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchInvoice = order.invoiceNumber?.toLowerCase().includes(q)
        const matchName = order.user?.fullName?.toLowerCase().includes(q)
        const matchEquip = order.equipment?.name?.toLowerCase().includes(q)
        return matchInvoice || matchName || matchEquip
      }

      return true
    })
  }, [activeOrders, statusFilter, searchQuery])

  // Hitung jumlah pada setiap status
  const counts = useMemo(() => {
    return {
      all: activeOrders.length,
      menunggu: activeOrders.filter((o) => ['MENUNGGU_KONFIRMASI', 'PENDING'].includes(o.status)).length,
      sewa: activeOrders.filter((o) => ['SEWA_AKTIF', 'DIKIRIM'].includes(o.status)).length,
      inspeksi: activeOrders.filter((o) => o.status === 'INSPEKSI').length,
      selesai: activeOrders.filter((o) => o.status === 'SELESAI').length
    }
  }, [activeOrders])

  // Pastikan selectedOrder tetap sinkron jika statusnya berubah
  const currentSelectedOrder = useMemo(() => {
    if (!selectedOrder) return null
    return activeOrders.find((o) => o.id === selectedOrder.id) || selectedOrder
  }, [activeOrders, selectedOrder])

  // Handlers
  const handleSelectOrder = (order) => {
    setSelectedOrder(order)
  }

  const handleCloseDetail = () => {
    setSelectedOrder(null)
  }

  const handleAccept = (id) => {
    if (onAcceptOrder) {
      onAcceptOrder(id)
    } else {
      alert(`Pesanan ${id} berhasil diterima!`)
    }
  }

  const handleReject = (id) => {
    if (onRejectOrder) {
      onRejectOrder(id)
    } else {
      alert(`Pesanan ${id} ditolak.`)
    }
  }

  return (
    <div className="w-full space-y-4 font-sans text-slate-900 animate-in fade-in duration-300">
      {/* ── TOPBAR: JUDUL, SUBTITUSI, PENCARIAN & EKSPOR ───────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pesanan masuk
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            {counts.all} pesanan bulan ini · {counts.menunggu} menunggu konfirmasi · {counts.inspeksi} inspeksi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Input Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau invoice"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
            />
          </div>

          {/* Tombol Ekspor */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor</span>
          </button>
        </div>
      </header>

      {/* ── FILTER STATUS CHIPS & BULAN ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: 'ALL', label: 'Semua', count: counts.all },
            { key: 'MENUNGGU_KONFIRMASI', label: 'Menunggu konfirmasi', count: counts.menunggu },
            { key: 'SEWA_AKTIF', label: 'Sedang disewa', count: counts.sewa },
            { key: 'INSPEKSI', label: 'Inspeksi', count: counts.inspeksi },
            { key: 'SELESAI', label: 'Selesai', count: counts.selesai }
          ].map((tab) => {
            const isActive = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Dropdown Periode Bulan */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-auto shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Juni 2025</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </div>
      </div>

      {/* ── SPLIT-PANE RESPONSIVE CONTAINER (TASK 2) ───────────────────────── */}
      <div className="w-full flex items-start gap-4 lg:gap-6 relative transition-all duration-300">
        {/*
          ========================================================================
          RESPONSIVE SPLIT-PANE RULES (TASK 2):
          ------------------------------------------------------------------------
          1. Desktop (lg:):
             - Jika selectedOrder === null: OrderList full width (w-full).
             - Jika selectedOrder ada: Layar terbagi flex proporsional
               (Kiri ~1/3 atau 30-35% [lg:w-[380px] / xl:w-[420px]], Kanan sisa [flex-1]).
          2. Tablet (md: ke lg:):
             - Jika detail terbuka: OrderList menyusut menjadi "Compact" (w-20 / md:w-24),
               memberikan ruang sisa maksimum untuk OrderDetail.
             - Jika detail tertutup: OrderList full width (w-full).
          3. Mobile (< md:):
             - Conditional Rendering:
               - Jika selectedOrder === null: HANYA OrderList (full width).
               - Jika selectedOrder ada: HANYA OrderDetail (full width).
          ========================================================================
        */}

        {/* DAFTAR PESANAN (<OrderList />) */}
        {(!currentSelectedOrder || (typeof window !== 'undefined' && true)) && (
          <div
            className={`transition-all duration-300 ease-in-out ${
              currentSelectedOrder
                ? 'hidden md:flex md:w-24 lg:w-[380px] xl:w-[420px] shrink-0'
                : 'w-full'
            }`}
          >
            {/* Tampilkan mode compact saat tablet (md:) ketika detail sedang terbuka */}
            <div className="w-full">
              {/* Tablet Compact View (md: to lg:) */}
              {currentSelectedOrder && (
                <div className="hidden md:block lg:hidden w-full">
                  <OrderList
                    orders={filteredOrders}
                    selectedOrder={currentSelectedOrder}
                    onSelectOrder={handleSelectOrder}
                    isCompact={true}
                  />
                </div>
              )}

              {/* Normal Full List View (Full on Desktop or when detail is closed) */}
              <div className={currentSelectedOrder ? 'hidden lg:block w-full' : 'w-full'}>
                <OrderList
                  orders={filteredOrders}
                  selectedOrder={currentSelectedOrder}
                  onSelectOrder={handleSelectOrder}
                  isCompact={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* DETAIL PESANAN (<OrderDetail />) */}
        {currentSelectedOrder && (
          <div className="flex-1 min-w-0 w-full transition-all duration-300 ease-in-out">
            <OrderDetail
              order={currentSelectedOrder}
              onClose={handleCloseDetail}
              onAccept={handleAccept}
              onReject={handleReject}
              onOpenChat={onOpenChat}
              onInspectOrder={onInspectOrder}
              isLoading={actionLoadingId === currentSelectedOrder.id}
            />
          </div>
        )}
      </div>
    </div>
  )
}
