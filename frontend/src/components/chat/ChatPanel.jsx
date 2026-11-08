import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Send,
  MessageSquare,
  ShieldCheck,
  Store,
  User,
  Clock,
  X,
  Loader2,
  Check,
  CheckCheck,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import ChatContextCard from './ChatContextCard'
import { listChats, getChatMessages, sendMessage, checkPartnerChat } from '../../lib/chatsApi'
import { getSessionUser, getUserInitials } from '../../lib/userSession'
import { formatShortDate } from '../../lib/dateHelpers'

export default function ChatPanel({
  initialPartnerId = null,
  initialPartnerName = null,
  initialContextType = null,
  initialContextData = null,
  isEmbedded = false,
  onChatSelectChange = null,
  onBack = null
}) {
  const currentUser = getSessionUser()
  const currentUserId = currentUser?.id

  const [searchParams, setSearchParams] = useSearchParams()
  const chatIdFromUrl = searchParams.get('chatId')

  const [conversations, setConversations] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [pendingContext, setPendingContext] = useState(null)

  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const messagesEndRef = useRef(null)
  const prevMessagesLengthRef = useRef(0)
  const inputRef = useRef(null)

  // Sinkronkan ID obrolan ke URL Query Parameters (?chatId=...)
  const syncChatIdToUrl = (chatId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (isEmbedded || prev.has('tab') || (typeof window !== 'undefined' && window.location.pathname.includes('dashboard'))) {
          next.set('tab', 'pesan')
        }
        if (chatId && !String(chatId).startsWith('draft')) {
          next.set('chatId', chatId)
        } else {
          next.delete('chatId')
        }
        return next
      },
      { replace: true }
    )
  }

  // Handler memilih obrolan
  const handleSelectChat = (chat) => {
    setSelectedChat(chat)
    setPendingContext(null)
    if (chat && !chat.isDraft) {
      syncChatIdToUrl(chat.id)
    } else {
      syncChatIdToUrl(null)
    }
  }

  // Handler menutup ruang obrolan aktif
  const handleCloseChat = () => {
    setSelectedChat(null)
    setPendingContext(null)
    syncChatIdToUrl(null)
  }

  // Scroll otomatis ke gelembung pesan terbawah
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Reset pelacakan panjang pesan saat obrolan aktif berganti
  useEffect(() => {
    prevMessagesLengthRef.current = 0
  }, [selectedChat?.id, selectedChat?.isDraft])

  // Task 3: Otomatis scroll ke bawah (scrollIntoView) setiap kali array messages bertambah panjang
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom(prevMessagesLengthRef.current === 0 ? 'auto' : 'smooth')
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages.length])

  // Notifikasi perubahan obrolan terpilih ke parent (Pesan.jsx)
  useEffect(() => {
    if (onChatSelectChange) {
      onChatSelectChange(selectedChat)
    }
  }, [selectedChat, onChatSelectChange])

  // ── 1. Muat Seluruh Percakapan Tersimpan dari Backend ──────────────────────────
  const fetchConversations = async (keepSelection = true) => {
    try {
      const data = await listChats()
      setConversations(data)

      // Pertahankan obrolan aktif jika sudah ada tanpa terkena stale closure
      if (keepSelection) {
        setSelectedChat((prev) => {
          if (!prev || prev.isDraft) return prev
          const found = data.find((c) => c.id === prev.id)
          return found ? { ...prev, ...found } : prev
        })
      }
      return data
    } catch (err) {
      console.error('Gagal memuat obrolan:', err)
      return []
    } finally {
      setLoadingChats(false)
    }
  }

  // ── 2. Inisialisasi Pertama: Cek URL Params / Lazy Session / Obrolan Awal ────
  useEffect(() => {
    let isActive = true

    const init = async () => {
      setLoadingChats(true)
      const chatsList = await fetchConversations(false)
      if (!isActive) return

      // Prioritas 1: Baca chatId dari URL Search Params (Persistent Routing saat refresh F5)
      if (chatIdFromUrl) {
        const found = chatsList.find((c) => String(c.id) === String(chatIdFromUrl))
        if (found) {
          setSelectedChat(found)
          if (initialContextType && initialContextData) {
            setPendingContext({
              contextType: initialContextType,
              contextData: initialContextData
            })
          }
          return
        }
      }

      // Prioritas 2: Inisialisasi dari partnerId navigasi
      if (initialPartnerId) {
        // Cek apakah percakapan dengan partner ini sudah ada di database
        const existing = chatsList.find(
          (c) => c.partner?.id === initialPartnerId || c.renterId === initialPartnerId || c.ownerId === initialPartnerId
        )

        if (existing) {
          // Percakapan SUDAH ADA di DB: Langsung buka ruang obrolan tersebut dan set URL
          setSelectedChat(existing)
          syncChatIdToUrl(existing.id)
          if (initialContextType && initialContextData) {
            setPendingContext({
              contextType: initialContextType,
              contextData: initialContextData
            })
          }
        } else {
          // MEKANISME LAZY / EPHEMERAL SESSION (DRAFT ROOM):
          // Percakapan BELUM ADA di database -> Buka Sesi Sementara di local state saja!
          // Sesi ini TIDAK disimpan ke database dan TIDAK muncul di daftar riwayat sidebar
          // sampai pengguna menekan tombol Kirim pada pesan pertama.
          const draftRoom = {
            id: 'draft',
            isDraft: true,
            partner: {
              id: initialPartnerId,
              fullName: initialPartnerName || 'Pemilik Alat',
              name: initialPartnerName || 'Pemilik Alat',
              role: currentUser?.role === 'PEMILIK' ? 'PENYEWA' : 'PEMILIK',
              verificationStatus: 'DISETUJUI'
            },
            messages: []
          }
          setSelectedChat(draftRoom)
          setMessages([])

          if (initialContextType && initialContextData) {
            setPendingContext({
              contextType: initialContextType,
              contextData: initialContextData
            })
          }
        }
      } else if (chatsList.length > 0 && !selectedChat) {
        // Desktop: otomatis buka percakapan pertama jika tidak ada chatId di URL
        // Mobile: biarkan null agar menampilkan daftar percakapan terlebih dahulu
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          setSelectedChat(chatsList[0])
          syncChatIdToUrl(chatsList[0].id)
        }
      }
    }

    init()

    // Task 3: Polling interval setiap 3000ms (3 detik) untuk sinkronisasi daftar percakapan
    const interval = setInterval(() => {
      fetchConversations(true)
    }, 3000)

    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [initialPartnerId])

  // Sinkronisasi saat URL search params berganti secara eksternal (misal: tombol Back / Forward browser)
  useEffect(() => {
    if (!chatIdFromUrl) {
      if (selectedChat && !selectedChat.isDraft) {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setSelectedChat(null)
        }
      }
      return
    }

    if (selectedChat?.id === chatIdFromUrl) return

    if (conversations.length > 0) {
      const match = conversations.find((c) => String(c.id) === String(chatIdFromUrl))
      if (match) {
        setSelectedChat(match)
      }
    }
  }, [chatIdFromUrl, conversations])

  // ── 3. Ambil Pesan & Sinkronisasi Real-Time (Short Polling) Setiap 3 Detik ────
  useEffect(() => {
    if (!selectedChat || selectedChat.isDraft) {
      if (selectedChat?.isDraft) {
        setMessages([])
      }
      return
    }

    const currentChatId = selectedChat.id
    let isActive = true

    const fetchRoomMessages = async (isInitial = false) => {
      if (isInitial) {
        setLoadingMessages(true)
      }
      try {
        const res = await getChatMessages(currentChatId)
        if (!isActive) return

        const incomingMessages = res?.data || []
        setMessages((prev) => {
          // Hanya update jika ada penambahan atau pembaruan status pesan untuk mencegah re-render berlebih
          if (incomingMessages.length !== prev.length) {
            return incomingMessages
          }
          const isChanged = incomingMessages.some((msg, idx) => {
            const p = prev[idx]
            return !p || p.id !== msg.id || p.isRead !== msg.isRead
          })
          return isChanged ? incomingMessages : prev
        })
      } catch (err) {
        console.error('Gagal mengambil pesan:', err)
      } finally {
        if (isActive && isInitial) {
          setLoadingMessages(false)
        }
      }
    }

    // Ambil riwayat pesan awal
    fetchRoomMessages(true)

    // Task 3: Mekanisme Short Polling setiap 3000ms (3 detik) selama room chat terbuka
    const pollInterval = setInterval(() => {
      fetchRoomMessages(false)
    }, 3000)

    // Bersihkan interval saat komponen di-unmount atau chat berganti
    return () => {
      isActive = false
      clearInterval(pollInterval)
    }
  }, [selectedChat?.id, selectedChat?.isDraft])

  // ── 4. Kirim Pesan (Termasuk Transisi Lazy Session -> Permanent) ───────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault()
    const content = inputText.trim()

    // Wajib ada teks atau lampiran konteks
    if (!content && !pendingContext) return

    setSending(true)
    setErrorMsg('')

    try {
      const payload = {
        content: content || (pendingContext?.contextType === 'ORDER' ? 'Informasi Pesanan' : 'Informasi Unit Alat'),
        contextType: pendingContext?.contextType || null,
        contextData: pendingContext?.contextData || null
      }

      if (selectedChat?.isDraft) {
        // PERTAMA KALI MENGIRIM PESAN PADA SESI LAZY:
        // Panggil POST /api/chats/messages dengan recipientId.
        // Di sinilah record Conversation & Message resmi dibuat permanen di database!
        payload.recipientId = selectedChat.partner.id
      } else {
        payload.conversationId = selectedChat.id
      }

      const res = await sendMessage(payload)
      const newMessage = res?.data
      const newConv = res?.conversation

      // Reset form input & banner lampiran konteks
      setInputText('')
      setPendingContext(null)

      // Jika sebelumnya adalah Draft Session, ganti menjadi obrolan permanen
      if (selectedChat?.isDraft && newConv) {
        const permanentChat = {
          ...selectedChat,
          id: newConv.id,
          isDraft: false,
          lastMessageAt: newConv.lastMessageAt,
          lastMessage: newMessage
        }
        setSelectedChat(permanentChat)
        syncChatIdToUrl(newConv.id)
        setMessages([newMessage])
        // Muat ulang daftar obrolan agar langsung muncul di sidebar kiri
        await fetchConversations(false)
      } else {
        // Obrolan biasa: tambahkan pesan baru ke daftar pesan aktif
        setMessages((prev) => [...prev, newMessage])
        // Perbarui preview pesan terakhir di sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedChat.id
              ? { ...c, lastMessage: newMessage, lastMessageAt: newMessage.createdAt }
              : c
          )
        )
      }

      setTimeout(() => scrollToBottom('smooth'), 50)
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim pesan')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ── 5. Filter Daftar Percakapan di Sidebar ─────────────────────────────────────
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const nameMatch = (c.partner?.fullName || '').toLowerCase().includes(q)
    const storeMatch = (c.partner?.businessName || '').toLowerCase().includes(q)
    const msgMatch = (c.lastMessage?.content || '').toLowerCase().includes(q)
    return nameMatch || storeMatch || msgMatch
  })

  // Format waktu pesan
  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className={`box-border w-full flex flex-col md:flex-row bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden shadow-xs ${
        isEmbedded
          ? 'h-[calc(100vh-60px)]'
          : 'h-[calc(100vh-130px)] md:h-[calc(100vh-120px)] flex-1 min-h-0 max-w-[1920px] mx-auto my-0'
      }`}
    >
      {/* ── SIDEBAR KIRI: Daftar Percakapan Tersimpan ──────────────────────────── */}
      <aside
        className={`w-full md:w-80 lg:w-96 xl:w-[400px] shrink-0 border-r border-slate-200 bg-white flex flex-col flex-1 md:flex-none min-h-0 self-stretch ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header Sidebar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex md:hidden items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 m-0 whitespace-nowrap">Pesan Masuk</h2>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {conversations.length} obrolan
            </span>
          </div>

          {/* Input Filter Percakapan (Hanya memfilter obrolan yang sudah tersimpan) */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari obrolan tersimpan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 ring-1 ring-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0 bg-transparent border-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Daftar Obrolan List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 pb-24 md:pb-4">
          {loadingChats ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-xs">Memuat obrolan...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
              <MessageSquare className="w-8 h-8 text-slate-300" />
              <p className="text-xs m-0">
                {searchQuery
                  ? 'Tidak ada obrolan yang cocok dengan pencarian.'
                  : 'Belum ada riwayat pesan. Buka halaman Detail Alat atau Pesanan Saya untuk menghubungi mitra.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const isSelected = selectedChat?.id === chat.id
              const partner = chat.partner
              const initials = getUserInitials(partner)
              const lastMsg = chat.lastMessage
              const unread = chat.unreadCount || 0

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer border-0 ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-blue-600'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {/* Avatar Initials / Photo */}
                  <div className="relative shrink-0">
                    {partner?.photo ? (
                      <img
                        src={partner.photo}
                        alt={partner?.businessName || partner?.fullName || 'Mitra'}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
                        {initials}
                      </div>
                    )}
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full ring-2 ring-white" />
                    )}
                  </div>

                  {/* Partner Info & Last Message Snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h3 className="text-xs font-bold text-slate-900 truncate m-0">
                        {partner?.businessName || partner?.fullName || 'Mitra'}
                      </h3>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatTime(chat.lastMessageAt || lastMsg?.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-slate-500 truncate m-0 flex-1">
                        {lastMsg ? lastMsg.content : 'Memulai percakapan'}
                      </p>
                      {unread > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                          {unread}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                          partner?.role === 'PEMILIK'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {partner?.role === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── PANEL KANAN: Ruang Obrolan Aktif ───────────────────────────────────── */}
      <main
        className={`flex-1 flex flex-col bg-slate-50 min-w-0 min-h-0 relative self-stretch ${
          !selectedChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedChat ? (
          <>
            {/* Header Ruang Obrolan */}
            <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Task 2: Tombol Kembali (Mobile) terhubung ke handleCloseChat */}
                <button
                  type="button"
                  onClick={() => {
                    if (conversations.length > 0) {
                      handleCloseChat()
                    } else if (onBack) {
                      onBack()
                    } else {
                      handleCloseChat()
                    }
                  }}
                  className="inline-flex md:hidden items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200 shrink-0"
                  title="Kembali ke daftar obrolan"
                  aria-label="Kembali ke daftar obrolan"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>

                {selectedChat.partner?.photo ? (
                  <img
                    src={selectedChat.partner.photo}
                    alt={selectedChat.partner?.businessName || selectedChat.partner?.fullName || 'Mitra'}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-slate-200">
                    {getUserInitials(selectedChat.partner)}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate m-0">
                      {selectedChat.partner?.businessName || selectedChat.partner?.fullName || 'Mitra'}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        selectedChat.partner?.role === 'PEMILIK'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {selectedChat.partner?.role === 'PEMILIK' ? 'Pemilik Alat' : 'Penyewa UMKM'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Terverifikasi MyRent</span>
                    {selectedChat.isDraft && (
                      <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                        Sesi Sementara (Draft)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Task 2: Tombol Close (X) di header room chat aktif agar panel chat bisa ditutup */}
              <button
                type="button"
                onClick={handleCloseChat}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200 shrink-0"
                title="Tutup obrolan"
                aria-label="Tutup obrolan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Area Scroll Gelembung Pesan (Chat Bubbles) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-3.5">
              {selectedChat.isDraft && messages.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-500 max-w-sm mx-auto">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    Mulai Obrolan dengan {selectedChat.partner?.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Ketik pesan Anda di bawah untuk mengirim pertanyaan. Sesi obrolan akan resmi tersimpan begitu Anda mengirim pesan pertama.
                  </p>
                </div>
              ) : loadingMessages ? (
                <div className="flex justify-center items-center py-12 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-xs">Memuat riwayat pesan...</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutgoing = msg.senderId === currentUserId

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                    >
                      {/* Kartu Konteks Alat atau Invoice Pesanan di dalam Gelembung */}
                      {msg.contextType && msg.contextData && (
                        <ChatContextCard
                          contextType={msg.contextType}
                          contextData={msg.contextData}
                          isOutgoing={isOutgoing}
                        />
                      )}

                      {/* Gelembung Teks Pesan */}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] lg:max-w-[65%] xl:max-w-[60%] px-4 py-2.5 text-xs rounded-2xl shadow-2xs break-words ${
                          isOutgoing
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        <p className="m-0 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isOutgoing ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatTime(msg.createdAt)}</span>
                          {isOutgoing && (
                            msg.isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-200" title="Dibaca" />
                            ) : (
                              <Check className="w-3 h-3 text-blue-300" title="Terkirim" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Banner Lampiran Konteks (Pratinjau di Atas Kolom Ketik) */}
            {pendingContext && (
              <div className="px-4 py-2.5 bg-blue-50/90 border-t border-blue-200 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded shrink-0">
                    {pendingContext.contextType === 'ORDER' ? 'Invoice Pesanan' : 'Alat Terkait'}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {pendingContext.contextType === 'ORDER'
                      ? `${pendingContext.contextData?.invoiceNumber || 'Pesanan'} – ${pendingContext.contextData?.equipmentName || ''}`
                      : pendingContext.contextData?.name || 'Unit Alat'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setPendingContext(null)}
                  className="p-1 hover:bg-blue-100 text-blue-700 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
                  title="Batalkan lampiran"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Form Input Ketik Pesan */}
            <form
              onSubmit={handleSendMessage}
              className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Tulis pesan Anda..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 ring-1 ring-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />

              <button
                type="submit"
                disabled={sending || (!inputText.trim() && !pendingContext)}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border-0 shadow-xs"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Kirim</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {errorMsg && (
              <div className="px-4 py-1.5 bg-rose-50 text-rose-600 text-xs flex items-center gap-1.5 border-t border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </>
        ) : (
          /* Empty State: Belum ada obrolan yang dipilih */
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 m-0 mb-1">Pilih Obrolan</h3>
            <p className="text-xs text-slate-400 max-w-xs m-0">
              Pilih salah satu obrolan dari daftar di sebelah kiri untuk mulai membaca dan membalas pesan.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

