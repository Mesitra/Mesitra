/**
 * Realtime Client (Server-Sent Events / SSE)
 *
 * Mengelola satu koneksi EventSource HTTP streaming ke backend (/api/realtime/stream)
 * untuk seluruh aplikasi frontend. Mendukung pendaftaran listener event
 * secara modular (misal: chat:message, notification:new, order:updated).
 */
import { getUserToken } from './userSession'
import { getAdminToken } from '../components/adminAuth/adminSession'
import { API_BASE_URL } from './apiClient'

class RealtimeClient {
  constructor() {
    this.eventSource = null
    this.listeners = new Map() // Map<eventName, Set<callback>>
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectDelay = 15000
    this.isConnected = false
  }

  /**
   * Ambil token autentikasi aktif (Penyewa, Pemilik, atau Admin).
   */
  getToken() {
    return getUserToken() || getAdminToken()
  }

  /**
   * Hubungkan ke backend SSE stream jika belum terhubung.
   */
  connect() {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return
    }

    const token = this.getToken()
    if (!token) {
      this.disconnect()
      return
    }

    if (this.eventSource && this.isConnected) {
      return
    }

    // Tutup koneksi lama jika ada
    this.disconnect()

    try {
      const streamUrl = `${API_BASE_URL}/api/realtime/stream?token=${encodeURIComponent(token)}`
      this.eventSource = new EventSource(streamUrl)

      this.eventSource.onopen = () => {
        this.isConnected = true
        this.reconnectAttempts = 0
      }

      this.eventSource.onerror = () => {
        this.isConnected = false
        if (this.eventSource) {
          this.eventSource.close()
          this.eventSource = null
        }
        this.scheduleReconnect()
      }

      // Pasang listener untuk setiap event yang didaftarkan
      for (const eventName of this.listeners.keys()) {
        this.bindEventSourceListener(eventName)
      }
    } catch (err) {
      console.warn('[RealtimeClient] Gagal membuka stream SSE:', err?.message)
      this.scheduleReconnect()
    }
  }

  bindEventSourceListener(eventName) {
    if (!this.eventSource) return

    // Hapus listener lama jika ada
    this.eventSource.removeEventListener(eventName, this.handleEvent)

    this.eventSource.addEventListener(eventName, (event) => {
      try {
        const parsed = JSON.parse(event.data)
        const callbacks = this.listeners.get(eventName)
        if (callbacks) {
          for (const cb of callbacks) {
            try {
              cb(parsed)
            } catch (cbErr) {
              console.error(`[RealtimeClient] Error callback ${eventName}:`, cbErr)
            }
          }
        }
      } catch (parseErr) {
        console.warn(`[RealtimeClient] Gagal parse event ${eventName}:`, parseErr)
      }
    })
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  /**
   * Berlangganan event tertentu.
   * @param {string} eventName - Contoh: 'notification:new', 'chat:message', 'order:updated'
   * @param {function} callback
   * @returns {function} Unsubscribe function
   */
  subscribe(eventName, callback) {
    if (!eventName || typeof callback !== 'function') return () => {}

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set())
    }
    const callbacks = this.listeners.get(eventName)
    callbacks.add(callback)

    // Jika koneksi sudah ada, pasang event listener di EventSource
    if (this.eventSource) {
      this.bindEventSourceListener(eventName)
    } else {
      this.connect()
    }

    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.listeners.delete(eventName)
      }
    }
  }

  /**
   * Tutup stream dan batalkan seluruh timer.
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.isConnected = false
  }
}

export const realtimeClient = new RealtimeClient()

