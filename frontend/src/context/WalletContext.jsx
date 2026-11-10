import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getOwnerWallet } from '../lib/walletApi'

const WalletContext = createContext({
  walletData: null,
  setWalletData: () => {},
  loading: true,
  error: null,
  escrowBalance: 0,
  availableBalance: 0,
  escrowItems: [],
  mutations: [],
  bankAccount: null,
  refreshWallet: () => Promise.resolve()
})

/**
 * WalletProvider: Pengelola state dompet pemilik terpusat (Context API)
 * Memastikan Sidebar ("Dana di Escrow") dan halaman Dompet mengonsumsi
 * data finansial yang 100% konsisten dan real-time.
 */
export function WalletProvider({ children }) {
  const [walletData, setWalletData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOwnerWallet()
      setWalletData(data)
      return data
    } catch (err) {
      setError(err.message || 'Gagal memuat data dompet')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWallet()

    const handleWalletUpdated = () => {
      fetchWallet()
    }

    window.addEventListener('mesitra:wallet-updated', handleWalletUpdated)
    return () => {
      window.removeEventListener('mesitra:wallet-updated', handleWalletUpdated)
    }
  }, [fetchWallet])

  // Kalkulasi mutlak saldo escrow dari array pesanan aktif (escrowItems)
  const escrowItems = useMemo(() => {
    return Array.isArray(walletData?.escrowItems) ? walletData.escrowItems : []
  }, [walletData])

  const escrowBalance = useMemo(() => {
    if (escrowItems.length > 0) {
      return escrowItems.reduce(
        (sum, item) => sum + (Number(item.amount ?? item.payoutAmount) || 0),
        0
      )
    }
    return walletData?.escrowBalance ?? 0
  }, [escrowItems, walletData])

  const availableBalance = walletData?.availableBalance ?? 0
  const mutations = useMemo(() => {
    return Array.isArray(walletData?.mutations) ? walletData.mutations : []
  }, [walletData])
  const bankAccount = walletData?.bankAccount ?? null

  const value = useMemo(
    () => ({
      walletData,
      setWalletData,
      loading,
      error,
      escrowBalance,
      availableBalance,
      escrowItems,
      mutations,
      bankAccount,
      refreshWallet: fetchWallet
    }),
    [
      walletData,
      loading,
      error,
      escrowBalance,
      availableBalance,
      escrowItems,
      mutations,
      bankAccount,
      fetchWallet
    ]
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet harus digunakan di dalam WalletProvider')
  }
  return context
}
