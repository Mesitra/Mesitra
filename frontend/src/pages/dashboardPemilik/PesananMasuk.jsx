import React, { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import { Search, Download, Calendar, ChevronDown, RefreshCw } from 'lucide-react'
import { API_BASE } from '../../lib/equipmentsApi'
import { getUserToken } from '../../lib/userSession'
import OrderList from './OrderList'
import OrderDetail from './OrderDetail'

// Status classification helpers agar counter badge dan filter list 100% konsisten
export const isSewaStatus = (status) => {
  const s = String(status || '').trim().toUpperCase()
  return ['SEWA_AKTIF', 'DIKIRIM', 'PENGIRIMAN', 'SIAP_DIAMBIL', 'BERJALAN', 'AKTIF'].includes(s)
}

export const isMenungguStatus = (status) => {
  const s = String(status || '').trim().toUpperCase()
  return ['MENUNGGU_KONFIRMASI', 'PENDING', 'MENUNGGU_PEMBAYARAN'].includes(s)
}

export const isInspeksiStatus = (status) => {
  const s = String(status || '').trim().toUpperCase()
  return ['INSPEKSI', 'DISPUTE', 'CLAIM', 'KLAIM'].includes(s)
}

export const isSelesaiStatus = (status) => {
  const s = String(status || '').trim().toUpperCase()
  return s === 'SELESAI'
}

export const isDitolakStatus = (status) => {
  const s = String(status || '').trim().toUpperCase()
  return ['DITOLAK', 'DIBATALKAN', 'BATAL'].includes(s)
}

// Normalisasi objek data pesanan dari backend API
function normalizeOrder(order) {
  if (!order) return null
  const tenant = order.user || order.tenant || {}
  const initials =
    tenant.initials ||
    (tenant.fullName ? tenant.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'UM')

  const rentalDays = Number(order.rentalDays) || 1
  const rentalCost = Number(order.rentalCost) || 0
  const depositAmount = Number(order.depositAmount) || 0
  const shippingCost = Number(order.shippingCost) || 0
  const serviceFee = Number(order.serviceFee) || Math.round(rentalCost * 0.05) || 25000
  const totalPaid = Number(order.totalPaid) || (rentalCost + depositAmount + shippingCost)
  const netEarnings = Number(order.netEarnings) || (rentalCost + shippingCost)
  const dailyRate = Number(order.dailyRate) || Math.round(rentalCost / rentalDays) || 0

  return {
    ...order,
    id: order.id,
    invoiceNumber: order.invoiceNumber || `INV-${order.id}`,
    status: order.status || 'MENUNGGU_KONFIRMASI',
    createdAt: order.createdAt,
    startDate: order.startDate,
    endDate: order.endDate,
    rentalDays,
    deliveryMethod: order.deliveryMethod,
    deliveryType: order.deliveryMethod === 'COURIER' ? 'Diantar kurir toko' : (order.deliveryType || 'Ambil di gudang'),
    location: order.location || order.equipment?.location || 'Gudang Cilandak',
    dailyRate,
    rentalCost,
    depositAmount,
    shippingCost,
    serviceFee,
    totalPaid,
    netEarnings,
    user: {
      ...tenant,
      fullName: tenant.kycData?.businessName || tenant.fullName || 'Penyewa UMKM',
      initials,
      isVerified: tenant.verificationStatus === 'DISETUJUI' || tenant.isVerified !== false,
      nib: tenant.kycData?.nib || tenant.nib || '9120 4471 8830',
      power: tenant.power || 'Daya usaha 1300 W',
      city: tenant.kycData?.city || tenant.city || 'Bandung',
      rating: tenant.rating || 4.9,
      completedRentals: tenant.completedRentals || 38
    },
    equipment: {
      ...order.equipment,
      name: order.equipment?.name || 'Unit Alat',
      category: order.equipment?.category || 'Komersial',
      images: Array.isArray(order.equipment?.images)
        ? order.equipment.images
        : (typeof order.equipment?.images === 'string'
            ? (() => { try { return JSON.parse(order.equipment.images) } catch { return [order.equipment.images] } })()
            : (order.equipment?.images ? [order.equipment.images] : []))
    }
  }
}

export default function PesananMasuk({
  orders: propOrders,
  onAcceptOrder,
  onRejectOrder,
  onOpenChat,
  onInspectOrder,
  actionLoadingId,
  initialSelectedOrderId
}) {
  // ── State Utama (Task 2) ──────────────────────────────────────────────────
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(!propOrders || propOrders.length === 0)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // ── Fetch Pesanan Real-Time dari Endpoint GET /api/orders/owner/me ────────
  const fetchOwnerOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = getUserToken()
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      const endpoint = `${API_BASE || 'http://localhost:3000/api'}/orders/owner/me`
      const response = await axios.get(endpoint, { headers })
      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : []

      setOrders(data)
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Gagal memuat pesanan masuk dari server'
      setError(msg)

      // Fallback ke propOrders jika fetch gagal
      if (propOrders && propOrders.length > 0) {
        setOrders(propOrders)
      }
    } finally {
      setLoading(false)
    }
  }, [propOrders])

  useEffect(() => {
    fetchOwnerOrders()
  }, [fetchOwnerOrders])

  // Sinkronisasi saat parent mengirim update propOrders
  useEffect(() => {
    if (Array.isArray(propOrders) && propOrders.length > 0 && orders.length === 0) {
      setOrders(propOrders)
    }
  }, [propOrders, orders.length])

  // Normalisasi data pesanan
  const activeOrders = useMemo(() => {
    return orders.map(normalizeOrder)
  }, [orders])

  // ── Kalkulasi Badge / Counter Dinamis (100% Akurat dengan Database) ─────
  const counts = useMemo(() => {
    const all = activeOrders.length
    const menunggu = activeOrders.filter((o) => isMenungguStatus(o.status)).length
    const sewa = activeOrders.filter((o) => isSewaStatus(o.status)).length
    const inspeksi = activeOrders.filter((o) => isInspeksiStatus(o.status)).length
    const selesai = activeOrders.filter((o) => isSelesaiStatus(o.status)).length
    const ditolak = activeOrders.filter((o) => isDitolakStatus(o.status)).length

    return { all, menunggu, sewa, inspeksi, selesai, ditolak }
  }, [activeOrders])

  // ── Filter Berdasarkan Status Tab & Search Query ────────────────────────
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      // 1. Filter status
      if (statusFilter === 'MENUNGGU_KONFIRMASI') {
        if (!isMenungguStatus(order.status)) return false
      } else if (statusFilter === 'SEWA_AKTIF') {
        if (!isSewaStatus(order.status)) return false
      } else if (statusFilter === 'INSPEKSI') {
        if (!isInspeksiStatus(order.status)) return false
      } else if (statusFilter === 'SELESAI') {
        if (!isSelesaiStatus(order.status)) return false
      } else if (statusFilter === 'DITOLAK') {
        if (!isDitolakStatus(order.status)) return false
      }

      // 2. Filter search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchInvoice = (order.invoiceNumber || '').toLowerCase().includes(q)
        const matchName = (order.user?.fullName || '').toLowerCase().includes(q)
        const matchEquip = (order.equipment?.name || '').toLowerCase().includes(q)
        return matchInvoice || matchName || matchEquip
      }

      return true
    })
  }, [activeOrders, statusFilter, searchQuery])

  // Pastikan detail yang dipilih tetap reaktif tersinkronisasi dengan perubahan order
  const currentSelectedOrder = useMemo(() => {
    if (!selectedOrder) return null
    return activeOrders.find((o) => o.id === selectedOrder.id) || selectedOrder
  }, [activeOrders, selectedOrder])

  // Auto-buka detail jika ada target orderId dari notifikasi atau URL
  useEffect(() => {
    const targetId = initialSelectedOrderId || new URLSearchParams(window.location.search).get('orderId')
    if (targetId && activeOrders.length > 0) {
      const match = activeOrders.find((o) => o.id === targetId || o.invoiceNumber === targetId)
      if (match) {
        setSelectedOrder(match)
      }
    }
  }, [initialSelectedOrderId, activeOrders])

  // Handlers
  const handleSelectOrder = (order) => {
    setSelectedOrder(order)
  }

  const handleCloseDetail = () => {
    setSelectedOrder(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has('orderId')) {
      url.searchParams.delete('orderId')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleAccept = async (id) => {
    if (onAcceptOrder) {
      await onAcceptOrder(id)
      fetchOwnerOrders()
    }
  }

  const handleReject = async (id) => {
    if (onRejectOrder) {
      await onRejectOrder(id)
      fetchOwnerOrders()
    }
  }

  const handleConfirmHandover = async () => {
    try {
      await fetchOwnerOrders()
    } catch (err) {
      console.error('Gagal memuat ulang status serah terima:', err)
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
            {counts.all} pesanan terdata · {counts.menunggu} menunggu konfirmasi · {counts.inspeksi} perlu inspeksi
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

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={fetchOwnerOrders}
            title="Muat ulang pesanan"
            aria-label="Muat ulang pesanan"
            className="p-2 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          </button>

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

      {/* Error Banner jika ada */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchOwnerOrders}
            className="font-bold underline cursor-pointer ml-2"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* ── FILTER STATUS CHIPS & BULAN ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: 'ALL', label: 'Semua', count: counts.all },
            { key: 'MENUNGGU_KONFIRMASI', label: 'Menunggu konfirmasi', count: counts.menunggu },
            { key: 'SEWA_AKTIF', label: 'Sedang disewa', count: counts.sewa },
            { key: 'INSPEKSI', label: 'Inspeksi', count: counts.inspeksi },
            { key: 'SELESAI', label: 'Selesai', count: counts.selesai },
            { key: 'DITOLAK', label: 'Ditolak / Batal', count: counts.ditolak }
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
          <span>Bulan Berjalan</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </div>
      </div>

      {/* ── SPLIT-PANE RESPONSIVE CONTAINER (TASK 2) ───────────────────────── */}
      <div className="w-full flex items-start gap-4 lg:gap-6 relative transition-all duration-300">
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
              key={currentSelectedOrder.id}
              order={currentSelectedOrder}
              onClose={handleCloseDetail}
              onAccept={handleAccept}
              onReject={handleReject}
              onOpenChat={onOpenChat}
              onInspectOrder={onInspectOrder}
              onConfirmHandover={handleConfirmHandover}
              onRefreshOrders={fetchOwnerOrders}
              isLoading={actionLoadingId === currentSelectedOrder.id}
            />
          </div>
        )}
      </div>
    </div>
  )
}
