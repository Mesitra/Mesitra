import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  Loader2,
  PackageOpen,
  CalendarDays,
  PlusCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import NavbarPenyewa from '../components/common/NavbarPenyewa'
import PesananCard from '../components/pesananSaya/PesananCard'
import ModalPerpanjangSewa from '../components/pesananSaya/ModalPerpanjangSewa'
import ModalHubungiPemilik from '../components/pesananSaya/ModalHubungiPemilik'
import ModalLacakPengiriman from '../components/pesananSaya/ModalLacakPengiriman'
import ModalDetailPesanan from '../components/pesananSaya/ModalDetailPesanan'
import ModalBatalPesanan from '../components/pesananSaya/ModalBatalPesanan'
import ModalDompet from '../components/pesananSaya/ModalDompet'
import ModalKontrakSewa from '../components/checkout/ModalKontrakSewa'
import ModalBeriUlasan from '../components/pesananSaya/ModalBeriUlasan'
import ModalDetailKlaim from '../components/pesananSaya/ModalDetailKlaim'
import {
  listOrders,
  cancelOrder,
  confirmDelivery,
  extendOrder
} from '../lib/ordersApi'
import { getSessionUser } from '../lib/userSession'
import { formatLongDate, normalizeDate } from '../lib/dateHelpers'
import {
  isDitolakTabStatus,
  matchOrderWithTab
} from '../components/pesananSaya/orderStatusConstants'

export default function PesananSaya() {
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters & search
  const [activeTab, setActiveTab] = useState('Semua') // 'Semua' | 'Menunggu' | 'Sedang Disewa' | 'Selesai' | 'Ditolak'
  const [searchQuery, setSearchQuery] = useState('')

  // Toast notification
  const [toast, setToast] = useState(location.state?.successMessage || null)

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isExtendOpen, setIsExtendOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isTrackOpen, setIsTrackOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isWalletOpen, setIsWalletOpen] = useState(false)
  const [isKontrakOpen, setIsKontrakOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)


  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar pesanan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Auto-clear location state message
  useEffect(() => {
    if (location.state?.successMessage) {
      showToast(location.state.successMessage)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Hitung jumlah tiap kategori status
  const counts = useMemo(() => {
    const total = orders.length
    const menungguBayar = orders.filter((o) => {
      const s = String(o.status || '').trim().toUpperCase()
      return s === 'MENUNGGU_PEMBAYARAN'
    }).length
    const menunggu = orders.filter((o) => {
      const s = String(o.status || '').trim().toUpperCase()
      return s === 'MENUNGGU_KONFIRMASI' || s === 'MENUNGGU_PEMBAYARAN'
    }).length
    const sedangDisewa = orders.filter((o) => {
      const s = String(o.status || '').trim().toUpperCase()
      return s === 'DIKIRIM' || s === 'SEWA_AKTIF' || s === 'INSPEKSI'
    }).length
    const selesai = orders.filter((o) => {
      const s = String(o.status || '').trim().toUpperCase()
      return s === 'SELESAI'
    }).length
    const ditolak = orders.filter((o) => isDitolakTabStatus(o.status)).length

    return { total, menunggu, menungguBayar, sedangDisewa, selesai, ditolak }
  }, [orders])

  // Filter list pesanan berdasarkan tab aktif dan search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Tab filter (Termasuk pengelompokan dispute/klaim ke dalam tab 'Ditolak')
      if (!matchOrderWithTab(order.status, activeTab)) {
        return false
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const invMatch = (order.invoiceNumber || '').toLowerCase().includes(query)
        const nameMatch = (order.equipment?.name || '').toLowerCase().includes(query)
        const catMatch = (order.equipment?.category || '').toLowerCase().includes(query)
        return invMatch || nameMatch || catMatch
      }

      return true
    })
  }, [orders, activeTab, searchQuery])

  // ── Handlers Aksi Pesanan ──────────────────────────────────────────────────
  const handleConfirmDelivery = async (order) => {
    try {
      await confirmDelivery(order.id)
      showToast(`Penerimaan unit untuk ${order.invoiceNumber} berhasil dikonfirmasi! Sewa kini aktif.`)
      fetchOrders()
    } catch (err) {
      alert(err.message || 'Gagal mengonfirmasi penerimaan barang')
    }
  }

  const handleCancelOrder = async (orderId, reason) => {
    await cancelOrder(orderId)
    showToast('Pesanan berhasil dibatalkan. Deposit telah dikembalikan ke dompet.')
    fetchOrders()
  }

  const handleExtendSuccess = async (orderId, days) => {
    const res = await extendOrder(orderId, days)
    showToast(`Masa sewa berhasil diperpanjang +${days} hari!`)
    fetchOrders()
    return res
  }

  const handleChatOwner = (order) => {
    if (!order) return
    const ownerId = order.equipment?.ownerId || order.equipment?.owner?.id
    if (!ownerId) {
      alert('Informasi pemilik alat tidak ditemukan pada pesanan ini')
      return
    }

    const equipmentImg =
      Array.isArray(order.equipment?.images) && order.equipment.images.length > 0
        ? typeof order.equipment.images[0] === 'string'
          ? order.equipment.images[0]
          : order.equipment.images[0]?.url
        : null

    navigate('/pesan', {
      state: {
        partnerId: ownerId,
        partnerName: order.equipment?.owner?.fullName || order.equipment?.owner?.name || 'Pemilik Alat',
        contextType: 'ORDER',
        contextData: {
          id: order.id,
          invoiceNumber: order.invoiceNumber,
          status: order.status,
          equipmentId: order.equipmentId,
          equipmentName: order.equipment?.name || 'Unit Alat',
          equipmentImage: equipmentImg,
          startDate: order.startDate,
          endDate: order.endDate,
          rentalDays: order.rentalDays,
          totalPaid: order.totalPaid,
          depositAmount: order.depositAmount,
          disputeReason: order.disputeReason || order.disputeNote
        }
      }
    })
  }

  return (
    <div className="box-border w-full min-h-screen flex flex-col justify-start items-start bg-slate-50 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 py-3 px-4 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Global Navigation Bar */}
      <NavbarPenyewa
        activeTab="pesanan"
        onNavigateTab={(tab) => {
          if (tab === 'jelajahi') navigate('/beranda-sewa')
          else if (tab === 'pesanan') navigate('/pesanan-saya')
          else if (tab === 'pesan') navigate('/pesan')
          else if (tab === 'dompet') setIsWalletOpen(true)
        }}
      />

      {/* Main Container */}
      <main className="box-border w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 h-fit flex flex-col gap-5 py-7 pb-16">
        {/* Page Head */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              Pesanan &amp; sewa aktif
            </h1>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Pantau status pengajuan, masa sewa berjalan, dan pengembalian alat Anda.
            </p>
          </div>

          <Link
            to="/beranda-sewa"
            className="flex items-center gap-1.5 py-2 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors no-underline"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Sewa Alat Baru</span>
          </Link>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {/* Tab: Semua */}
            <button
              type="button"
              onClick={() => setActiveTab('Semua')}
              className={`py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'Semua'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              <span>Semua</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'Semua' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts.total}
              </span>
            </button>

            {/* Tab: Menunggu Konfirmasi */}
            <button
              type="button"
              onClick={() => setActiveTab('Menunggu')}
              className={`py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'Menunggu'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              <span>Menunggu</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'Menunggu' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts.menunggu}
              </span>
            </button>

            {/* Tab: Sedang Disewa */}
            <button
              type="button"
              onClick={() => setActiveTab('Sedang Disewa')}
              className={`py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'Sedang Disewa'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              <span>Sedang Disewa</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'Sedang Disewa' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts.sedangDisewa}
              </span>
            </button>

            {/* Tab: Selesai */}
            <button
              type="button"
              onClick={() => setActiveTab('Selesai')}
              className={`py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'Selesai'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              <span>Selesai</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'Selesai' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts.selesai}
              </span>
            </button>

            {/* Tab: Ditolak */}
            <button
              type="button"
              onClick={() => setActiveTab('Ditolak')}
              className={`py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'Ditolak'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              <span>Ditolak</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'Ditolak' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts.ditolak}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari invoice atau alat…"
              className="w-full pl-9 pr-3 py-2 bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Memuat pesanan Anda…</span>
          </div>
        ) : error ? (
          <div className="w-full p-6 bg-red-50 ring-1 ring-red-200 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <span className="text-xs font-bold text-red-900">{error}</span>
            <button
              type="button"
              onClick={fetchOrders}
              className="mt-2 py-1.5 px-4 bg-red-600 text-white text-xs font-bold rounded-xl"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="w-full py-16 px-4 bg-white ring-1 ring-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <PackageOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 m-0">Tidak ada pesanan ditemukan</h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                {searchQuery
                  ? `Tidak ada hasil untuk pencarian "${searchQuery}".`
                  : activeTab !== 'Semua'
                  ? `Belum ada pesanan dengan status ${activeTab.toLowerCase()}.`
                  : 'Anda belum memiliki riwayat pengajuan sewa alat.'}
              </p>
            </div>
            <Link
              to="/beranda-sewa"
              className="mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors no-underline shadow-xs"
            >
              Jelajahi Katalog Alat
            </Link>
          </div>
        ) : (
          /* Order Cards List */
          <div className="flex flex-col gap-5 sm:gap-6">
            {filteredOrders.map((order) => (
              <PesananCard
                key={order.id}
                order={order}
                onChatOwner={handleChatOwner}
                onExtend={(ord) => {
                  setSelectedOrder(ord)
                  setIsExtendOpen(true)
                }}
                onConfirmDelivery={handleConfirmDelivery}
                onCancel={(ord) => {
                  setSelectedOrder(ord)
                  setIsCancelOpen(true)
                }}
                onViewDetail={(ord) => {
                  setSelectedOrder(ord)
                  setIsDetailOpen(true)
                }}
                onTrack={(ord) => {
                  setSelectedOrder(ord)
                  setIsTrackOpen(true)
                }}
                onViewContract={(ord) => {
                  setSelectedOrder(ord)
                  setIsKontrakOpen(true)
                }}
                onReview={(ord) => {
                  setSelectedOrder(ord)
                  setIsReviewOpen(true)
                }}
                onViewDispute={(ord) => {
                  setSelectedOrder(ord)
                  setIsDisputeOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <ModalBeriUlasan
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onSuccess={(_ordId) => {
          showToast('Ulasan berhasil dikirim! Terima kasih atas masukan berharga Anda.')
          fetchOrders()
        }}
      />

      <ModalPerpanjangSewa
        isOpen={isExtendOpen}
        onClose={() => {
          setIsExtendOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onExtendSuccess={handleExtendSuccess}
      />

      <ModalHubungiPemilik
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
      />

      <ModalLacakPengiriman
        isOpen={isTrackOpen}
        onClose={() => {
          setIsTrackOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
      />

      <ModalDetailPesanan
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onViewContract={(ord) => {
          setIsDetailOpen(false)
          setSelectedOrder(ord)
          setIsKontrakOpen(true)
        }}
      />

      <ModalBatalPesanan
        isOpen={isCancelOpen}
        onClose={() => {
          setIsCancelOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onConfirm={handleCancelOrder}
      />

      <ModalDompet
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />

      {/* Modal Detail Klaim / Dispute */}
      <ModalDetailKlaim
        isOpen={isDisputeOpen}
        onClose={() => {
          setIsDisputeOpen(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onChatOwner={(ord) => {
          setIsDisputeOpen(false)
          handleChatOwner(ord)
        }}
      />

      {/* Modal Lihat Kontrak Sewa */}
      {isKontrakOpen && selectedOrder && (
        <ModalKontrakSewa
          isOpen={isKontrakOpen}
          onClose={() => { setIsKontrakOpen(false); setSelectedOrder(null) }}
          alreadyAgreed={true}
          contractData={{
            ownerName: selectedOrder.equipment?.owner?.fullName || 'Pemilik Alat',
            renterName: selectedOrder.user?.fullName || 'Penyewa',
            businessName: selectedOrder.user?.kycData?.businessName || selectedOrder.user?.fullName || 'UMKM',
            equipmentName: selectedOrder.equipment?.name || 'Unit Alat',
            startDate: selectedOrder.startDate ? formatLongDate(normalizeDate(selectedOrder.startDate)) : '-',
            endDate: selectedOrder.endDate ? formatLongDate(normalizeDate(selectedOrder.endDate)) : '-',
            rentalDays: selectedOrder.rentalDays || 0,
            totalPaid: selectedOrder.totalPaid || 0,
            depositAmount: selectedOrder.depositAmount || 0,
            pricePerDay: selectedOrder.equipment?.pricePerDay || 0,
            agreedAt: selectedOrder.contractAgreedAt
          }}
        />
      )}
    </div>
  )
}
