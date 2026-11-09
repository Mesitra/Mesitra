import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react'
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../../lib/notificationsApi'
import { getUserToken } from '../../lib/userSession'
import { realtimeClient } from '../../lib/realtimeClient'

export default function NotificationBell({ className = '' }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const bellRef = useRef(null)

  const token = getUserToken()

  const loadNotifications = async () => {
    if (!token) return
    try {
      const data = await listNotifications()
      if (Array.isArray(data)) {
        setNotifications(data)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadNotifications()

    // Langganan event real-time SSE (notifikasi instan 0ms)
    const unsub = realtimeClient.subscribe('notification:new', (notif) => {
      setNotifications((prev) => {
        if (!notif?.id || prev.some((n) => n.id === notif.id)) return prev
        return [notif, ...prev]
      })
    })

    // Fallback polling berkala 25 detik
    const timer = setInterval(loadNotifications, 25000)
    return () => {
      unsub()
      clearInterval(timer)
    }
  }, [token])

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length
  }, [notifications])

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      )
      markNotificationAsRead(notif.id).catch(() => {})
    }
    setIsOpen(false)

    // Arahkan ke halaman Pesanan Saya
    navigate('/pesanan-saya')
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await markAllNotificationsAsRead().catch(() => {})
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ORDER_NEW':
      case 'ORDER_PAID':
        return { icon: Package, bg: 'bg-blue-100 text-blue-700' }
      case 'ORDER_CONFIRMED':
      case 'ORDER_SHIPPED':
        return { icon: Clock, bg: 'bg-indigo-100 text-indigo-700' }
      case 'ORDER_COMPLETED':
        return { icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-700' }
      case 'DISPUTE_OPENED':
      case 'DISPUTE_DEFENDED':
      case 'ORDER_REJECTED':
      case 'ORDER_CANCELLED':
        return { icon: AlertTriangle, bg: 'bg-rose-100 text-rose-700' }
      case 'KYC_APPROVED':
        return { icon: ShieldCheck, bg: 'bg-emerald-100 text-emerald-700' }
      default:
        return { icon: Info, bg: 'bg-slate-100 text-slate-700' }
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins}m lalu`
    if (diffHours < 24) return `${diffHours}j lalu`
    if (diffDays < 7) return `${diffDays}h lalu`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  if (!token) return null

  return (
    <div className={`relative ${className}`} ref={bellRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-2 rounded-xl bg-white border transition-all cursor-pointer relative shadow-2xs ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-100 text-blue-600'
            : 'border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50'
        }`}
        title="Notifikasi Saya"
        aria-label="Notifikasi Saya"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Popover */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifikasi Pesanan</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Tandai semua dibaca
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List Notifikasi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-xs font-bold text-slate-800">
                  Semua telah dibaca
                </div>
                <div className="text-[11px] text-slate-500">
                  Tidak ada notifikasi pesanan terbaru saat ini.
                </div>
              </div>
            ) : (
              notifications.map((item) => {
                const meta = getNotificationIcon(item.type)
                const Icon = meta.icon
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer group ${
                      !item.isRead ? 'bg-blue-50/70 hover:bg-blue-100/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative`}>
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
                            {formatTime(item.createdAt)}
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
            <span className="text-slate-400 font-medium">Update otomatis aktif</span>
            <button
              type="button"
              onClick={() => {
                navigate('/pesanan-saya')
                setIsOpen(false)
              }}
              className="font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Lihat Semua Pesanan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

