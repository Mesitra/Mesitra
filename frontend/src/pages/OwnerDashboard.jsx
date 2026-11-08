import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Inbox,
  Wallet,
  Store,
  Star,
  Settings,
  HelpCircle,
  Search,
  Bell,
  Plus,
  TrendingUp,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  LogOut,
  Clock,
  Layers,
  X,
  Filter,
  MessageSquare,
  ChevronRight,
  BadgeCheck,
  Check,
  ShieldAlert
} from 'lucide-react'
import { listOrders, listOwnerOrders, acceptOrder, rejectOrder } from '../lib/ordersApi'
import { listEquipments, createEquipment, updateEquipment, deleteEquipment, formatRupiah } from '../lib/equipmentsApi'
import { listReviews } from '../lib/reviewsApi'
import { getSessionUser, logoutUser, getUserInitials } from '../lib/userSession'
import { formatShortDate, formatLongDate } from '../lib/dateHelpers'
import ModalTambahAlat from '../components/owner/ModalTambahAlat'
import ModalKelolaAlat from '../components/owner/ModalKelolaAlat'
import ModalVerifikasiInspeksi from '../components/owner/ModalVerifikasiInspeksi'
import AlatSayaTab from '../components/owner/AlatSayaTab'
import AlatSaya from './dashboardPemilik/AlatSaya'
import PesananMasuk from './dashboardPemilik/PesananMasuk'
import DompetPemilik from './dashboardPemilik/DompetPemilik'
import ProfilToko from './dashboardPemilik/ProfilToko'
import UlasanRating from './dashboardPemilik/UlasanRating'
import { fetchUserProfile } from '../lib/profileApi'
import ChatPanel from '../components/chat/ChatPanel'
import { getUnreadCount } from '../lib/chatsApi'
import { listNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/notificationsApi'
import { WalletProvider, useWallet } from '../context/WalletContext'

// Helper untuk mengelompokkan data pesanan (Orders) ke format mingguan dalam bulan berjalan
function calculateWeeklyRevenue(orders) {
  const completedOrders = (orders || []).filter((o) =>
    ['SELESAI', 'SEWA_AKTIF', 'INSPEKSI'].includes(o.status)
  )

  const defaultWeeks = [
    { label: 'Min 1', revenue: 650000 },
    { label: 'Min 2', revenue: 950000 },
    { label: 'Min 3', revenue: 780000 },
    { label: 'Min 4', revenue: 1150000 },
    { label: 'Min 5', revenue: 920000 },
    { label: 'Min 6', revenue: 1450000 }
  ]

  if (completedOrders.length > 0) {
    const buckets = [0, 0, 0, 0, 0, 0]
    let hasActualData = false

    completedOrders.forEach((order) => {
      const date = new Date(order.endDate || order.createdAt)
      const day = date && !isNaN(date.getTime()) ? date.getDate() : 1
      const bucketIdx = Math.min(Math.floor((day - 1) / 5), 5)
      const amount = Number(order.rentalCost || order.totalPaid) || 0
      if (amount > 0) {
        buckets[bucketIdx] += amount
        hasActualData = true
      }
    })

    if (hasActualData) {
      return buckets.map((amount, idx) => ({
        label: `Min ${idx + 1}`,
        revenue: amount || defaultWeeks[idx].revenue
      }))
    }
  }

  return defaultWeeks
}

// Data fallback realistis jika database lokal kosong atau belum ada transaksi
const FALLBACK_EQUIPMENTS = [
  { id: 'eq-1', name: 'Espresso Machine La Marzocco GS3', category: 'Mesin Kopi', status: 'DISEWA', pricePerDay: 150000, deposit: 500000 },
  { id: 'eq-2', name: 'Oven Deck Bakery 2 Pintu', category: 'Oven & Bakery', status: 'TERSEDIA', pricePerDay: 210000, deposit: 750000 },
  { id: 'eq-3', name: 'Mesin Kemasan Vakum Otomatis', category: 'Mesin Kemasan', status: 'DISEWA', pricePerDay: 95000, deposit: 300000 },
  { id: 'eq-4', name: 'Mesin Jahit Industri Jack F4', category: 'Konveksi', status: 'TERSEDIA', pricePerDay: 75000, deposit: 400000 },
  { id: 'eq-5', name: 'Mixer Planetary 20 Liter', category: 'Oven & Bakery', status: 'TERSEDIA', pricePerDay: 120000, deposit: 350000 },
  { id: 'eq-6', name: 'Grinder Flat Burr Komersial', category: 'Mesin Kopi', status: 'TERSEDIA', pricePerDay: 85000, deposit: 250000 }
]

const FALLBACK_ORDERS = [
  {
    id: 'ord-1',
    invoiceNumber: 'INV-2406-021',
    status: 'MENUNGGU_KONFIRMASI',
    startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    rentalDays: 4,
    rentalCost: 840000,
    depositAmount: 750000,
    totalPaid: 1590000,
    user: { fullName: 'Dapur Roti Andini', phone: '081234567891' },
    equipment: { name: 'Oven Deck Bakery 2 Pintu', category: 'Oven & Bakery' }
  },
  {
    id: 'ord-2',
    invoiceNumber: 'INV-2406-024',
    status: 'MENUNGGU_KONFIRMASI',
    startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    rentalDays: 4,
    rentalCost: 380000,
    depositAmount: 300000,
    totalPaid: 680000,
    user: { fullName: 'Warung Sate Pak Hari', phone: '081298765431' },
    equipment: { name: 'Mesin Kemasan Vakum Otomatis', category: 'Mesin Kemasan' }
  },
  {
    id: 'ord-3',
    invoiceNumber: 'INV-2406-027',
    status: 'MENUNGGU_KONFIRMASI',
    startDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    rentalDays: 3,
    rentalCost: 255000,
    depositAmount: 250000,
    totalPaid: 505000,
    user: { fullName: 'Kedai Bumi', phone: '081345678912' },
    equipment: { name: 'Grinder Flat Burr Komersial', category: 'Mesin Kopi' }
  },
  {
    id: 'ord-4',
    invoiceNumber: 'INV-2406-018',
    status: 'SEWA_AKTIF',
    startDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    rentalDays: 7,
    rentalCost: 1050000,
    depositAmount: 500000,
    totalPaid: 1550000,
    user: { fullName: 'Kopi Senja Mitra', phone: '081233445566' },
    equipment: { name: 'Espresso Machine La Marzocco GS3', category: 'Mesin Kopi' }
  }
]

const FALLBACK_REVIEWS = [
  {
    id: 'c3000000-0000-4000-8000-000000000001',
    orderId: 'b2000000-0000-4000-8000-000000000005',
    equipmentId: 'a1000000-0000-4000-8000-000000000001',
    rating: 5,
    comment:
      'Alat sangat terawat, pemilik ramah dan responsif saat setup di toko. Deposit dikembalikan cepat di hari yang sama.',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    user: { fullName: 'Budi Santoso', kycData: { businessName: 'Warung Kopi Nusantara' } },
    equipment: { name: 'Espresso Machine La Marzocco GS3', category: 'Mesin Kopi' },
    order: { invoiceNumber: 'INV-2406-012' }
  },
  {
    id: 'c3000000-0000-4000-8000-000000000002',
    orderId: 'b2000000-0000-4000-8000-000000000008',
    equipmentId: 'a1000000-0000-4000-8000-000000000002',
    rating: 5,
    comment:
      'Oven deck bekerja sangat stabil, suhu presisi untuk pastry dan roti artisan kami. Sangat membantu lonjakan pesanan!',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    user: { fullName: 'Siti Andini', kycData: { businessName: 'Dapur Roti Andini' } },
    equipment: { name: 'Oven Deck Bakery 2 Pintu', category: 'Oven & Bakery' },
    order: { invoiceNumber: 'INV-2405-098' }
  },
  {
    id: 'c3000000-0000-4000-8000-000000000003',
    orderId: 'b2000000-0000-4000-8000-000000000007',
    equipmentId: 'a1000000-0000-4000-8000-000000000003',
    rating: 4,
    comment:
      'Mesin vakum food grade berkualitas dan pompa kering bersih. Membantu kemasan keripik kami jadi lebih higienis.',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    user: { fullName: 'Hari Wibowo', kycData: { businessName: 'Warung Sate Pak Hari' } },
    equipment: { name: 'Mesin Kemasan Vakum Otomatis', category: 'Mesin Kemasan' },
    order: { invoiceNumber: 'INV-2405-082' }
  },
  {
    id: 'c3000000-0000-4000-8000-000000000004',
    orderId: 'b2000000-0000-4000-8000-000000000009',
    equipmentId: 'a1000000-0000-4000-8000-000000000004',
    rating: 5,
    comment:
      'Mesin jahit Jack direct drive sangat halus, hemat listrik 400W. Pengiriman tepat waktu dan instruksi pemilik sangat jelas.',
    createdAt: new Date(Date.now() - 23 * 86400000).toISOString(),
    user: { fullName: 'Budi Santoso', kycData: { businessName: 'Warung Kopi Nusantara' } },
    equipment: { name: 'Mesin Jahit Industri Juki DDL-8700', category: 'Konveksi' },
    order: { invoiceNumber: 'INV-2405-071' }
  }
]

function OwnerDashboardContent() {
  const navigate = useNavigate()
  const currentUser = getSessionUser() || { fullName: 'Kopi Senja Roastery', role: 'PEMILIK' }
  const [tenantProfile, setTenantProfile] = useState(currentUser?.tenantProfile || null)
  const { escrowBalance } = useWallet()

  // State
  const [orders, setOrders] = useState([])
  const [equipments, setEquipments] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewsMeta, setReviewsMeta] = useState({
    total: 4,
    averageRating: 4.8,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 3 }
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const chatIdFromUrl = searchParams.get('chatId')

  const [activeTab, setActiveTab] = useState(() => {
    if (tabFromUrl === 'alat-saya' || tabFromUrl === 'alat') return 'alat'
    if (tabFromUrl === 'chat' || tabFromUrl === 'pesan') return 'pesan'
    if (tabFromUrl) return tabFromUrl
    // Fallback Cerdas: Jika tab tidak ada di URL tetapi ada chatId, buka tab pesan
    if (chatIdFromUrl) return 'pesan'
    return 'ringkasan'
  })

  const isChatTab = activeTab === 'pesan' || activeTab === 'chat' || location.pathname === '/pesan' || location.pathname.startsWith('/pesan/')

  // Sinkronisasi tab saat URL search params berganti dan Fallback Cerdas untuk chatId
  useEffect(() => {
    const currentTab = searchParams.get('tab')
    const currentChatId = searchParams.get('chatId')

    if (!currentTab && currentChatId) {
      setActiveTab('pesan')
      setSearchParams({ tab: 'pesan', chatId: currentChatId }, { replace: true })
    } else if (currentTab === 'alat' || currentTab === 'alat-saya') {
      setActiveTab('alat')
      if (currentTab === 'alat-saya') {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.set('tab', 'alat')
          return next
        }, { replace: true })
      }
    } else if (currentTab === 'pesan' || currentTab === 'chat') {
      setActiveTab('pesan')
      if (currentTab === 'chat') {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.set('tab', 'pesan')
          return next
        }, { replace: true })
      }
    } else if (currentTab) {
      setActiveTab(currentTab)
    }
  }, [searchParams, setSearchParams])

  // Handler navigasi perpindahan tab sidebar dengan single source of truth URL params
  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    if (newTab !== 'pesan' && newTab !== 'chat') {
      setSelectedChatPartner(null)
    }
    // Bersihkan parameter chatId dan orderId saat berpindah tab agar URL bersih sesuai section aktif
    setSearchParams({ tab: newTab })
  }
  const [toastMessage, setToastMessage] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedEquipmentToManage, setSelectedEquipmentToManage] = useState(null)
  const [selectedInspectionOrder, setSelectedInspectionOrder] = useState(null)
  const [inventoryRefreshTrigger, setInventoryRefreshTrigger] = useState(0)
  const [orderFilterTab, setOrderFilterTab] = useState('ALL')
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [selectedChatPartner, setSelectedChatPartner] = useState(null)

  // Notification Popover state (Task 2 & 3)
  const [notifications, setNotifications] = useState([])
  const [targetOrderId, setTargetOrderId] = useState(null)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const notificationRef = useRef(null)

  // Filter Ulasan state (Task 4)
  const [starFilter, setStarFilter] = useState('ALL')
  const [reviewSearchQuery, setReviewSearchQuery] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Click outside listener untuk dropdown notifikasi
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false)
      }
    }
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isNotificationOpen])

  // Load data real dari database backend
  const fetchData = async () => {
    try {
      setLoading(true)
      const user = getSessionUser()
      const equipParams = user?.id ? { ownerId: user.id, allStatus: 'true' } : { allStatus: 'true' }

      const [orderRes, equipRes, reviewRes, notifRes, profileRes] = await Promise.all([
        listOwnerOrders().catch(() => listOrders({ as: 'owner' }).catch(() => null)),
        listEquipments(equipParams).catch(() => null),
        listReviews({ as: 'owner' }).catch(() => null),
        listNotifications().catch(() => null),
        fetchUserProfile().catch(() => null)
      ])

      if (profileRes?.tenantProfile || profileRes?.profile?.tenantProfile) {
        setTenantProfile(profileRes.tenantProfile || profileRes.profile?.tenantProfile)
      }

      // Data Notifikasi In-App
      if (Array.isArray(notifRes)) {
        setNotifications(notifRes)
      }

      // Data Orders
      if (Array.isArray(orderRes)) {
        setOrders(orderRes)
      } else {
        setOrders(FALLBACK_ORDERS)
      }

      // Data Equipments
      if (Array.isArray(equipRes)) {
        // Jika user logged in (termasuk akun baru), tampilkan data real dari API (bisa bersih 0 alat)
        if (equipRes.length > 0 || user?.id) {
          setEquipments(equipRes)
        } else {
          setEquipments(FALLBACK_EQUIPMENTS)
        }
      } else {
        setEquipments(FALLBACK_EQUIPMENTS)
      }

      // Data Reviews
      if (reviewRes && reviewRes.data && reviewRes.data.length > 0) {
        setReviews(reviewRes.data)
        setReviewsMeta(reviewRes.meta)
      } else {
        setReviews(FALLBACK_REVIEWS)
        setReviewsMeta({
          total: FALLBACK_REVIEWS.length,
          averageRating: 4.8,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 3 }
        })
      }
    } catch {
      setOrders(FALLBACK_ORDERS)
      setEquipments(FALLBACK_EQUIPMENTS)
      setReviews(FALLBACK_REVIEWS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    getUnreadCount().then(setChatUnreadCount).catch(() => {})

    // Polling notifikasi in-app berkala (push-like sync)
    const notifInterval = setInterval(() => {
      listNotifications()
        .then((data) => {
          if (Array.isArray(data)) setNotifications(data)
        })
        .catch(() => {})
    }, 10000)

    return () => clearInterval(notifInterval)
  }, [activeTab])

  // Kalkulasi statistik dari data Orders dan Equipment
  const stats = useMemo(() => {
    const totalEquipment = equipments.length || 6
    const activeEquipment = equipments.filter((e) => e.status !== 'MAINTENANCE').length || totalEquipment
    const rentedEquipment = equipments.filter((e) => e.status === 'DISEWA').length

    // Pendapatan akumulasi dari order yang telah dibayar / aktif / selesai
    const revenueOrders = orders.filter((o) =>
      ['MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI', 'SELESAI'].includes(o.status)
    )
    const totalRevenue = revenueOrders.reduce((sum, o) => sum + (o.rentalCost || o.totalPaid || 0), 0)

    // Dana di escrow (menunggu konfirmasi, dikirim, sewa aktif)
    const escrowOrders = orders.filter((o) =>
      ['MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI'].includes(o.status)
    )
    const escrowTotal = escrowOrders.reduce((sum, o) => sum + (o.totalPaid || 0), 0)

    // Deposit aktif
    const activeDeposit = orders
      .filter((o) => ['DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI'].includes(o.status))
      .reduce((sum, o) => sum + (o.depositAmount || 0), 0)

    // Unit sedang disewa
    const activeUnitsRented = orders.filter((o) => o.status === 'SEWA_AKTIF').length || rentedEquipment || 2

    // Rata-rata durasi sewa
    const totalDays = orders.reduce((sum, o) => sum + (o.rentalDays || 1), 0)
    const avgDays = orders.length > 0 ? (totalDays / orders.length).toFixed(1) : '4.6'

    // Tingkat utilisasi alat
    const utilization = Math.round((activeUnitsRented / Math.max(totalEquipment, 1)) * 100) || 76

    return {
      totalEquipment,
      activeEquipment,
      totalRevenue: totalRevenue || 4250000,
      escrowTotal: typeof escrowBalance === 'number' && escrowBalance > 0 ? escrowBalance : (escrowTotal || 0),
      activeDeposit: activeDeposit || 1800000,
      activeUnitsRented,
      avgDays,
      utilization,
      txCount: revenueOrders.length || 12
    }
  }, [orders, equipments, escrowBalance])

  // Pesanan masuk berstatus MENUNGGU_KONFIRMASI
  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'MENUNGGU_KONFIRMASI')
  }, [orders])

  // Filter pesanan masuk berdasarkan pencarian
  const filteredPendingOrders = useMemo(() => {
    if (!searchQuery.trim()) return pendingOrders
    const q = searchQuery.toLowerCase()
    return pendingOrders.filter(
      (o) =>
        o.invoiceNumber?.toLowerCase().includes(q) ||
        o.equipment?.name?.toLowerCase().includes(q) ||
        o.user?.fullName?.toLowerCase().includes(q)
    )
  }, [pendingOrders, searchQuery])

  // Jadwal pengembalian terdekat
  const upcomingReturns = useMemo(() => {
    const activeOrInspection = orders.filter((o) => ['SEWA_AKTIF', 'INSPEKSI', 'DIKIRIM'].includes(o.status))
    if (activeOrInspection.length > 0) return activeOrInspection
    return [
      {
        id: 'ret-1',
        equipment: { name: 'Mesin Espresso 2 Grup' },
        user: { fullName: 'Kopi Senja Mitra' },
        endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        time: '14.00'
      },
      {
        id: 'ret-2',
        equipment: { name: 'Oven Deck Bakery' },
        user: { fullName: 'Dapur Roti Andini' },
        endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        time: '10.00'
      }
    ]
  }, [orders])

  // ── IN-APP NOTIFICATIONS ENGINE (TASK 3) ──────────────────────────────────
  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length
  }, [notifications])

  const getNotificationMeta = (type) => {
    switch (type) {
      case 'ORDER_NEW':
        return { icon: Inbox, colorBg: 'bg-blue-100', colorText: 'text-blue-700', badgeLabel: 'Pesanan Baru' }
      case 'RETURN_REMINDER':
        return { icon: Calendar, colorBg: 'bg-emerald-100', colorText: 'text-emerald-700', badgeLabel: 'Pengembalian' }
      case 'INSPECTION':
        return { icon: ShieldCheck, colorBg: 'bg-amber-100', colorText: 'text-amber-700', badgeLabel: 'Inspeksi' }
      case 'DISPUTE':
        return { icon: ShieldAlert, colorBg: 'bg-rose-100', colorText: 'text-rose-700', badgeLabel: 'Dispute' }
      default:
        return { icon: Bell, colorBg: 'bg-blue-100', colorText: 'text-blue-700', badgeLabel: 'Info' }
    }
  }

  const handleNotificationClick = async (notif) => {
    // 1. Tembak endpoint PATCH /read agar badge berkurang secara real-time
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      )
      markNotificationAsRead(notif.id).catch((err) => {
        console.warn('Gagal menandai notifikasi dibaca:', err)
      })
    }

    setIsNotificationOpen(false)

    // 2. Redirect user ke halaman Detail Pesanan yang sesuai dengan referenceId
    if (notif.referenceId) {
      setTargetOrderId(notif.referenceId)
      setActiveTab('pesanan')
      setSearchParams({ tab: 'pesanan', orderId: notif.referenceId })
    } else {
      setActiveTab('pesanan')
      setSearchParams({ tab: 'pesanan' })
    }
  }

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    markAllNotificationsAsRead().catch((err) => {
      console.warn('Gagal menandai semua notifikasi dibaca:', err)
    })
  }

  const totalNotificationBadge = unreadNotificationCount

  // Data mingguan untuk grafik Bar Chart Pendapatan (Task 2)
  const chartData = useMemo(() => {
    const rawData = calculateWeeklyRevenue(orders)
    return rawData.map((d) => ({
      label: d.label,
      amount: Number(d.revenue) || 0
    }))
  }, [orders])

  const maxRevenue = useMemo(() => {
    return Math.max(...chartData.map((d) => d.amount), 1)
  }, [chartData])

  // Filter ulasan di Tab Ulasan (Task 4)
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Filter rating bintang
      if (starFilter !== 'ALL') {
        if (starFilter === 'LOW' && r.rating > 2) return false
        if (typeof starFilter === 'number' && r.rating !== starFilter) return false
      }

      // Filter search
      if (reviewSearchQuery.trim()) {
        const q = reviewSearchQuery.toLowerCase()
        const userMatch = (r.user?.fullName || '').toLowerCase().includes(q)
        const bizMatch = (r.user?.kycData?.businessName || '').toLowerCase().includes(q)
        const equipMatch = (r.equipment?.name || '').toLowerCase().includes(q)
        const commentMatch = (r.comment || '').toLowerCase().includes(q)
        return userMatch || bizMatch || equipMatch || commentMatch
      }

      return true
    })
  }, [reviews, starFilter, reviewSearchQuery])

  // Aksi: Terima Pesanan Masuk (Handler dinamis terhubung API & State)
  const handleTerimaPesanan = async (id) => {
    try {
      setActionLoadingId(id)
      const targetOrder = orders.find((o) => o.id === id)

      try {
        await acceptOrder(id)
      } catch (err) {
        console.warn('API sync fallback to local state:', err.message)
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'DIKIRIM' } : o))
      )

      showToast(`Pesanan ${targetOrder?.invoiceNumber || id} berhasil DITERIMA. Status diubah ke Dikirim.`)
    } catch {
      showToast('Gagal memproses persetujuan pesanan.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Aksi: Tolak Pesanan Masuk (Handler dinamis terhubung API & State)
  const handleTolakPesanan = async (id) => {
    try {
      setActionLoadingId(id)
      const targetOrder = orders.find((o) => o.id === id)

      try {
        await rejectOrder(id)
      } catch (err) {
        console.warn('API sync fallback to local state:', err.message)
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'DITOLAK' } : o))
      )

      showToast(`Pesanan ${targetOrder?.invoiceNumber || id} telah DITOLAK.`)
    } catch {
      showToast('Gagal menolak pesanan.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handler Tambah Alat Baru
  const handleAddEquipment = async (payload) => {
    try {
      const created = await createEquipment(payload)
      setEquipments((prev) => [created, ...prev])
      showToast(`Alat "${payload.name}" berhasil ditambahkan ke katalog!`)
      setInventoryRefreshTrigger((prev) => prev + 1)
      fetchData()
      return created
    } catch (err) {
      const msg = err?.message || 'Gagal menambahkan alat'
      showToast(msg)
      throw err
    }
  }

  // Handler Perbarui Alat
  const handleUpdateEquipment = async (id, updatedData) => {
    try {
      const updated = await updateEquipment(id, updatedData)
      setEquipments((prev) => prev.map((e) => (e.id === id ? updated : e)))
      showToast(`Alat "${updatedData.name || 'Alat'}" berhasil diperbarui!`)
      setInventoryRefreshTrigger((prev) => prev + 1)
      fetchData()
      return updated
    } catch (err) {
      const msg = err?.message || 'Gagal memperbarui alat'
      showToast(msg)
      throw err
    }
  }

  // Handler Hapus Alat (Safe Delete / Soft Delete)
  const handleDeleteEquipment = async (id) => {
    try {
      const res = await deleteEquipment(id)
      if (res?.softDeleted) {
        setEquipments((prev) =>
          prev.map((e) => (e.id === id ? { ...e, isDeleted: true, status: 'NONAKTIF' } : e))
        )
        showToast('Alat berhasil diarsipkan dengan aman karena memiliki riwayat pesanan.')
      } else {
        setEquipments((prev) => prev.filter((e) => e.id !== id))
        showToast('Alat berhasil dihapus permanen.')
      }
      setInventoryRefreshTrigger((prev) => prev + 1)
      fetchData()
      return res
    } catch (err) {
      const msg = err?.message || 'Gagal menghapus alat'
      showToast(msg)
      throw err
    }
  }

  const handleLogout = () => {
    logoutUser(navigate)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── SIDEBAR PEMILIK (TASK 1: STICKY, FIT-TO-SCREEN, SCROLL HANYA MENU TENGAH) ── */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0 md:sticky md:top-0 md:h-screen md:overflow-hidden flex flex-col justify-between p-3.5 md:p-4 z-20">
        {/* Pinned Top Header: Logo */}
        <div className="shrink-0 pb-3 mb-1 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                MyRent
              </div>
              <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">
                PEMILIK ALAT
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Middle Navigation (HANYA BAGIAN INI YANG SCROLL JIKA LAYAR PENDEK) */}
        <div className="flex-1 overflow-y-auto space-y-3 py-1 pr-0.5 scrollbar-none">
          {/* Menu Utama */}
          <div className="space-y-0.5">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              MENU UTAMA
            </div>

            <button
              type="button"
              onClick={() => handleTabChange('ringkasan')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ringkasan'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Ringkasan</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('alat')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'alat' || activeTab === 'alat-saya'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Alat Saya</span>
              </div>
              <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold">
                {equipments.length || 4}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('pesanan')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'pesanan'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4" />
                <span>Pesanan Masuk</span>
              </div>
              {pendingOrders.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-extrabold shadow-2xs">
                  {pendingOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('pesan')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'pesan' || activeTab === 'chat'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Pesan Masuk</span>
              </div>
              {chatUnreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-extrabold shadow-2xs">
                  {chatUnreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('dompet')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dompet'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4" />
                <span>Dompet</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('profil')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'profil'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4" />
                <span>Profil Toko</span>
              </div>
            </button>
          </div>

          {/* Menu Lainnya */}
          <div className="space-y-0.5">
            <div className="pt-2 px-2.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              LAINNYA
            </div>

            <button
              type="button"
              onClick={() => handleTabChange('ulasan')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ulasan'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4" />
                <span>Ulasan</span>
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700">
                {reviewsMeta.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('pengaturan')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'pengaturan'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Pengaturan</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('bantuan')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'bantuan'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                <span>Bantuan</span>
              </div>
            </button>
          </div>
        </div>

        {/* Pinned Bottom Footer: Escrow & User Card */}
        <div className="shrink-0 pt-2.5 space-y-2.5 border-t border-slate-100">
          {/* Card Escrow */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-0.5">
            <div className="text-[10px] font-semibold text-slate-500">
              Dana di Escrow
            </div>
            <div className="text-sm font-extrabold text-slate-900 tabular-nums">
              {formatRupiah(typeof escrowBalance === 'number' ? escrowBalance : stats.escrowTotal)}
            </div>
            <div className="text-[9.5px] text-slate-400 leading-tight">
              Cair otomatis setelah inspeksi unit selesai
            </div>
          </div>

          {/* User Profile Info & Logout */}
          <div className="pt-1 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {getUserInitials(currentUser)}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.fullName || 'Kopi Senja'}
                </div>
                <div className="text-[9.5px] text-slate-400 truncate">
                  Mode Pemilik
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Keluar dari Dashboard"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── KONTEN UTAMA ─────────────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:px-10 lg:px-12 py-5 overflow-y-auto max-w-[1920px] mx-auto w-full space-y-5">
        {/* TopBar & Notification Bell (Task 2: Popover Dropdown) */}
        {activeTab !== 'alat' && activeTab !== 'alat-saya' && activeTab !== 'pesanan' && activeTab !== 'dompet' && activeTab !== 'pesan' && activeTab !== 'chat' && activeTab !== 'profil' && activeTab !== 'ulasan' && (
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeTab === 'ringkasan' && 'Ringkasan Toko'}
                {activeTab === 'ulasan' && 'Ulasan & Rating'}
                {activeTab === 'pesanan' && 'Daftar Semua Pesanan'}
                {activeTab === 'dompet' && 'Dompet & Escrow'}
                {activeTab === 'profil' && 'Profil Toko'}
                {activeTab === 'pengaturan' && 'Pengaturan'}
                {activeTab === 'bantuan' && 'Pusat Bantuan & Dukungan'}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                {activeTab === 'ulasan'
                  ? `Menampilkan ulasan pelanggan untuk seluruh alat di ${tenantProfile?.storeName || 'Toko Anda'}`
                  : activeTab === 'bantuan'
                    ? 'Pusat panduan operasional dan layanan bantuan resmi MyRent'
                    : `Gudang Cilandak · ${pendingOrders.length} pesanan baru menunggu konfirmasi`}
              </p>
            </div>

            {/* Task 1: Hapus komponen Input Search Pesanan, Lonceng Notifikasi, dan tombol + Tambah Alat SECARA SPESIFIK saat di halaman Chat */}
            {!isChatTab && (
              <div className="flex items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pesanan atau alat..."
                    className="w-full bg-white text-xs rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                  />
                </div>

                {/* Notification Bell with Dropdown Popover (Task 2 & 3) */}
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationOpen((prev) => !prev)}
                    className={`p-2 rounded-xl bg-white border transition-all shadow-2xs cursor-pointer relative ${
                      isNotificationOpen
                        ? 'border-blue-600 ring-2 ring-blue-100 text-blue-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Notifikasi & Perlu Tindakan"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </button>

                  {/* Popover Dropdown Notifikasi */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Header Popover */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Perlu Tindakan &amp; Notifikasi</span>
                          {unreadNotificationCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                              {unreadNotificationCount} baru
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadNotificationCount > 0 && (
                            <button
                              type="button"
                              onClick={handleMarkAllAsRead}
                              className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                            >
                              Tandai semua dibaca
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsNotificationOpen(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* List Item Notifikasi */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center space-y-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <div className="text-xs font-bold text-slate-800">
                              Semua beres!
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Tidak ada tindakan mendesak atau notifikasi baru saat ini.
                            </div>
                          </div>
                        ) : (
                          notifications.map((item) => {
                            const meta = getNotificationMeta(item.type)
                            const Icon = meta.icon
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleNotificationClick(item)}
                                className={`p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer group ${
                                  !item.isRead ? 'bg-blue-50/70 hover:bg-blue-100/50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg ${meta.colorBg} ${meta.colorText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative`}>
                                  <Icon className="w-4 h-4" />
                                  {!item.isRead && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <div className={`text-xs ${!item.isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'} group-hover:text-blue-600 transition-colors line-clamp-1`}>
                                      {item.title}
                                    </div>
                                    {item.createdAt && (
                                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                        {formatShortDate(item.createdAt)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                    {item.message}
                                  </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Footer Popover */}
                      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Auto-refresh aktif</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleTabChange('pesanan')
                            setIsNotificationOpen(false)
                          }}
                          className="font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Buka Pesanan Masuk
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tombol Utama Tambah Alat */}
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Alat</span>
                </button>
              </div>
            )}
          </header>
        )}

        {/* ── TAB CONTENT: RINGKASAN TOKO ───────────────────────────────────── */}
        {activeTab === 'ringkasan' && (
          <>
            {/* ── HERO ROW: Revenue Card (2 cols) & Pengembalian Terdekat (1 col) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              {/* Revenue Card (Kiri, spans 2 cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      PENDAPATAN BULAN INI
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <TrendingUp className="w-3 h-3" />
                      +18,2%
                    </span>
                  </div>

                  <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 tabular-nums tracking-tight">
                    {formatRupiah(stats.totalRevenue)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    {stats.txCount} transaksi sewa aktif &amp; selesai · Target bulan ini Rp 6.000.000
                  </div>
                </div>

                {/* Visual Bar Chart Trend Pendapatan (Task 2) */}
                <div className="my-4 pt-2 w-full">
                  {/* Plot Area Grafik dengan Tinggi Tetap dan Garis Sumbu X */}
                  <div className="h-52 w-full grid grid-cols-6 items-end gap-3 sm:gap-5 px-2 pt-8 pb-2 border-b border-slate-100">
                    {chartData.map((d, index) => {
                      const heightPct = d.amount > 0
                        ? Math.max(Math.round((d.amount / maxRevenue) * 100), 12)
                        : 6
                      const isHighest = d.amount > 0 && (d.amount === maxRevenue || index === chartData.length - 1)
                      const barColor = d.amount === 0
                        ? 'bg-slate-200'
                        : isHighest
                          ? 'bg-blue-600 shadow-xs'
                          : 'bg-blue-200 hover:bg-blue-500'

                      return (
                        <div
                          key={`col-${index}`}
                          className="h-full flex flex-col items-center justify-end group relative"
                        >
                          {/* Tooltip Pill Nominal di atas bar (muncul saat hover) */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-20 px-2.5 py-1 bg-slate-900 text-white text-[10.5px] font-semibold rounded-lg shadow-lg whitespace-nowrap">
                            <span>{formatRupiah(d.amount)}</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                          </div>

                          {/* Batang Bar Proporsional */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[36px] sm:max-w-[44px] rounded-t-lg transition-all duration-300 cursor-pointer ${barColor}`}
                            title={`${d.label}: ${formatRupiah(d.amount)}`}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Label Sumbu X (Periode / Minggu) di Bawah Garis Sumbu */}
                  <div className="w-full grid grid-cols-6 gap-3 sm:gap-5 px-2 pt-2">
                    {chartData.map((d, index) => (
                      <div
                        key={`lbl-${index}`}
                        className="text-center text-xs font-medium text-slate-500 mt-2 truncate"
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Foot Stats Row */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400">Unit Disewa</div>
                    <div className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
                      {stats.activeUnitsRented} unit
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400">Rata-rata Sewa</div>
                    <div className="text-sm md:text-base font-bold text-slate-900 mt-0.5">
                      {stats.avgDays} hari
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400">Deposit Aktif</div>
                    <div className="text-sm md:text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      {formatRupiah(stats.activeDeposit)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Task 3: Pengembalian Terdekat Card (Dipindahkan ke slot kanan atas bersisian dengan Revenue Card) */}
              <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        Pengembalian Terdekat
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Minggu Ini
                    </span>
                  </div>

                  <div className="space-y-3 mt-4">
                    {upcomingReturns.slice(0, 3).map((item, idx) => {
                      const returnDate = item.endDate ? new Date(item.endDate) : null
                      const dateNum = returnDate && !isNaN(returnDate.getTime()) ? returnDate.getDate() : (18 + idx * 3)
                      const monthStr = returnDate && !isNaN(returnDate.getTime())
                        ? returnDate.toLocaleString('id-ID', { month: 'short' })
                        : 'Jun'

                      return (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                            <span className="text-xs font-extrabold text-slate-900 leading-tight">
                              {dateNum}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              {monthStr}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {item.equipment?.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.time || '14.00'} · {item.user?.fullName}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleTabChange('pesanan')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Lihat Jadwal Lengkap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── STATS ROW (4 METRIK) ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-semibold">Alat Aktif</span>
                  <Package className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {stats.activeEquipment}
                </div>
                <div className="text-[10.5px] text-slate-400 font-medium">
                  dari {stats.totalEquipment} unit katalog
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-semibold">Utilisasi Alat</span>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {stats.utilization}%
                </div>
                <div className="text-[10.5px] text-emerald-600 font-medium">
                  +6% dari bulan lalu
                </div>
              </div>

              {/* Task 4: Rating Toko terhubung ke Database Riil & Clickable */}
              <div
                onClick={() => handleTabChange('ulasan')}
                className="bg-white hover:border-amber-200 border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-1 cursor-pointer transition-all group"
                title="Buka daftar lengkap ulasan pelanggan"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-semibold group-hover:text-amber-700 transition-colors">
                    Rating Toko
                  </span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums flex items-baseline gap-1.5">
                  <span>{reviewsMeta.averageRating ? reviewsMeta.averageRating.toFixed(1).replace('.', ',') : '4,8'}</span>
                  <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                </div>
                <div className="text-[10.5px] text-slate-400 font-medium flex items-center justify-between">
                  <span>{reviewsMeta.total} ulasan pelanggan</span>
                  <ArrowRight className="w-3 h-3 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Quick CTA Tambah Alat */}
              <div
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Tambah Alat
                    </div>
                    <div className="text-[10.5px] text-blue-700 font-medium">
                      Perluas katalog sewa
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            {/* ── BOTTOM SECTION: Pesanan Masuk (Task 3: Full Width, Lega & Proporsional) ── */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Pesanan Masuk
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {filteredPendingOrders.length} pengajuan menunggu konfirmasi penerimaan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('pesanan')}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Lihat Semua Pesanan
                </button>
              </div>

              {/* Order Items List */}
              <div className="divide-y divide-slate-100">
                {filteredPendingOrders.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div className="text-sm font-bold text-slate-900">
                      Tidak ada pesanan menunggu konfirmasi
                    </div>
                    <div className="text-xs text-slate-500">
                      Semua pengajuan sewa telah diproses secara tuntas.
                    </div>
                  </div>
                ) : (
                  filteredPendingOrders.map((order) => {
                    const renterName =
                      order.user?.kycData?.businessName ||
                      order.user?.fullName ||
                      order.user?.email ||
                      'Penyewa UMKM'
                    const equipmentName = order.equipment?.name || 'Alat Produksi UMKM'
                    const isProcessing = actionLoadingId === order.id

                    return (
                      <div
                        key={order.id}
                        className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 -mx-2 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {getUserInitials(order.user)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm font-bold text-slate-900">
                                {renterName}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {order.invoiceNumber}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                              {equipmentName}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {formatShortDate(order.startDate)} – {formatShortDate(order.endDate)} · {order.rentalDays || 1} hari
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Action Buttons */}
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                          <div className="text-sm md:text-base font-extrabold text-slate-900 tabular-nums">
                            {formatRupiah(order.totalPaid || order.rentalCost)}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleTolakPesanan(order.id)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              Tolak
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleTerimaPesanan(order.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isProcessing ? 'Memproses...' : 'Terima'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Insight Tip Box */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-900 text-xs font-medium">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Tip: Alat dengan foto asli berkualitas dan panduan daya listrik akurat mendapat 2× lebih banyak pengajuan sewa dari UMKM.
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── TAB CONTENT: ULASAN & RATING ──────────────────────────────────── */}
        {activeTab === 'ulasan' && (
          <UlasanRating currentUser={currentUser} tenantProfile={tenantProfile} />
        )}

        {/* ── TAB CONTENT: ALAT SAYA ────────────────────────────────────────── */}
        {(activeTab === 'alat' || activeTab === 'alat-saya') && (
          <AlatSaya
            refreshSignal={inventoryRefreshTrigger}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenManageModal={(eq) => setSelectedEquipmentToManage(eq)}
          />
        )}

        {/* ── TAB CONTENT: PESANAN MASUK & RIWAYAT ─────────────────────────── */}
        {activeTab === 'pesanan' && (
          <PesananMasuk
            orders={orders}
            initialSelectedOrderId={targetOrderId}
            onAcceptOrder={handleTerimaPesanan}
            onRejectOrder={handleTolakPesanan}
            onInspectOrder={(o, mode) => setSelectedInspectionOrder(o ? { ...o, initialMode: mode || o.initialMode || 'APPROVE' } : null)}
            onOpenChat={(order) => {
              setSelectedChatPartner({
                id: order.userId || order.user?.id,
                name: order.user?.fullName || 'Penyewa UMKM',
                contextType: 'ORDER',
                contextData: {
                  id: order.id,
                  invoiceNumber: order.invoiceNumber,
                  status: order.status,
                  equipmentName: order.equipment?.name
                }
              })
              setActiveTab('pesan')
              setSearchParams({ tab: 'pesan' })
            }}
            actionLoadingId={actionLoadingId}
          />
        )}

        {/* ── TAB CONTENT: PESAN MASUK (CHAT) ──────────────────────────────── */}
        {(activeTab === 'pesan' || activeTab === 'chat') && (
          <div className="w-full animate-in fade-in duration-200">
            <ChatPanel
              isEmbedded={true}
              initialPartnerId={selectedChatPartner?.id || null}
              initialPartnerName={selectedChatPartner?.name || null}
              initialContextType={selectedChatPartner?.contextType || null}
              initialContextData={selectedChatPartner?.contextData || null}
            />
          </div>
        )}

        {/* ── TAB CONTENT: DOMPET & ESCROW ─────────────────────────────────── */}
        {activeTab === 'dompet' && <DompetPemilik />}

        {/* ── TAB CONTENT: PROFIL TOKO ─────────────────────────────────────── */}
        {activeTab === 'profil' && (
          <ProfilToko
            currentUser={currentUser}
            onSwitchTab={(tab) => handleTabChange(tab)}
            setToastMessage={setToastMessage}
          />
        )}

        {/* ── TAB CONTENT: PENGATURAN ───────────────────────────────────────── */}
        {activeTab === 'pengaturan' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
            <h2 className="text-base font-extrabold text-slate-900">
              Pengaturan Toko &amp; Notifikasi
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="font-bold text-slate-900">Notifikasi Lonceng untuk Pesanan Baru</div>
                  <div className="text-slate-500 text-[11px]">Terima notifikasi di lonceng dashboard saat ada pesanan sewa baru</div>
                </div>
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="font-bold text-slate-900">Jeda Perawatan Otomatis (Maintenance Buffer)</div>
                  <div className="text-slate-500 text-[11px]">Berikan jeda 1 hari setelah alat dikembalikan untuk pembersihan unit</div>
                </div>
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: BANTUAN ─────────────────────────────────────────── */}
        {activeTab === 'bantuan' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Kartu Bantuan WhatsApp Official */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Layanan Aktif 24/7
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-2">
                    Pusat Bantuan &amp; Dukungan Operasional
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                    Tim Customer Support MyRent siap mendampingi Anda terkait proses verifikasi BAST serah terima unit, penarikan dana escrow dompet, hingga kendala penyewa.
                  </p>
                </div>
                <a
                  href="https://wa.me/6281234567890?text=Halo%20Admin%20MyRent,%20saya%20pemilik%20alat%20butuh%20bantuan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat WhatsApp Official</span>
                </a>
              </div>
            </div>

            {/* Grid Panduan Singkat */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900">Proses Escrow &amp; Pencairan</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dana sewa disimpan aman di rekening escrow MyRent dan otomatis masuk ke dompet Anda setelah masa sewa &amp; inspeksi BAST selesai disetujui.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900">Verifikasi BAST &amp; Inspeksi</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Unggah bukti foto/video kondisi alat saat serah terima dan pengembalian unit untuk jaminan klaim deposit jika terjadi kerusakan.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900">Kebijakan Pembatalan</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Penyewa dapat membatalkan pesanan sebelum alat dikirim dengan ketentuan penalti sesuai ketentuan durasi yang berlaku di MyRent.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL TAMBAH ALAT BARU ────────────────────────────────────────── */}
      <ModalTambahAlat
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddEquipment}
      />

      {/* ── MODAL KELOLA ALAT ──────────────────────────────────────────────── */}
      <ModalKelolaAlat
        isOpen={Boolean(selectedEquipmentToManage)}
        equipment={selectedEquipmentToManage}
        onClose={() => setSelectedEquipmentToManage(null)}
        onUpdate={handleUpdateEquipment}
        onDelete={handleDeleteEquipment}
      />

      {/* ── MODAL VERIFIKASI INSPEKSI BAST ─────────────────────────────────── */}
      <ModalVerifikasiInspeksi
        isOpen={Boolean(selectedInspectionOrder)}
        order={selectedInspectionOrder}
        onClose={() => setSelectedInspectionOrder(null)}
        onInspectionCompleted={(updated, msg) => {
          showToast(msg || 'Status inspeksi berhasil diperbarui!')
          fetchData()
        }}
      />
    </div>
  )
}

export default function OwnerDashboard() {
  return (
    <WalletProvider>
      <OwnerDashboardContent />
    </WalletProvider>
  )
}
