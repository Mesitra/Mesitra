import { getUserToken, getSessionUser, setUserSession } from './userSession'

export const API_BASE = 'http://localhost:3000/api'

/**
 * Dispatch event global bila ada perubahan saldo (Top Up / Tarik Saldo)
 * supaya seluruh komponen (Navbar, Card, Modal) sinkron seketika.
 */
export function emitWalletUpdate(newBalance) {
  try {
    const user = getSessionUser()
    if (user && newBalance !== undefined) {
      user.walletBalance = newBalance
      setUserSession(null, user)
    }
    window.dispatchEvent(
      new CustomEvent('myrent:wallet-updated', {
        detail: { newBalance }
      })
    )
  } catch {
    // abaikan di SSR/lingkungan tanpa window
  }
}

/**
 * Mengambil informasi dompet lengkap: saldo, escrow, rekening, & riwayat mutasi
 */
export async function getWalletInfo() {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memuat data dompet')
  }

  // Update session storage jika saldo berubah di backend
  if (data.walletBalance !== undefined) {
    const user = getSessionUser()
    if (user && user.walletBalance !== data.walletBalance) {
      user.walletBalance = data.walletBalance
      setUserSession(null, user)
    }
  }

  return data
}

/**
 * Melakukan Top Up saldo
 */
export async function topUpWallet({ amount, paymentMethod = 'QRIS' }) {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/topup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount: Number(amount), paymentMethod })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal melakukan top up')
  }

  emitWalletUpdate(data.newBalance)
  return data
}

/**
 * Melakukan penarikan saldo ke rekening terdaftar
 */
export async function withdrawWallet({ amount, accountId, notes }) {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: Number(amount),
      accountId,
      notes
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memproses penarikan saldo')
  }

  emitWalletUpdate(data.newBalance)
  return data
}

/**
 * Mengambil daftar rekening penarikan terdaftar
 */
export async function getWithdrawalAccounts() {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memuat rekening penarikan')
  }

  return data.accounts || []
}

/**
 * Mendaftarkan rekening penarikan baru
 */
export async function createWithdrawalAccount({
  bankName,
  accountNumber,
  accountHolder,
  isPrimary = false
}) {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      bankName,
      accountNumber,
      accountHolder,
      isPrimary
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal mendaftarkan rekening penarikan')
  }

  return data
}

/**
 * Memperbarui rekening penarikan
 */
export async function updateWithdrawalAccount(id, payload) {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/accounts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memperbarui rekening penarikan')
  }

  return data
}

/**
 * Menghapus rekening penarikan
 */
export async function deleteWithdrawalAccount(id) {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/accounts/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal menghapus rekening penarikan')
  }

  return data
}

/**
 * Mengambil ringkasan dompet lengkap khusus pemilik alat (Owner Dashboard):
 * Saldo tersedia (availableBalance), escrow (escrowBalance), rincian pesanan escrow H-x,
 * riwayat mutasi komprehensif (Masuk, Keluar, Escrow), dan rekening pencairan utama.
 */
export async function getOwnerWallet() {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/owner/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memuat dompet pemilik')
  }

  // Sinkronkan session storage jika saldo tersedia berubah
  if (data.availableBalance !== undefined) {
    const user = getSessionUser()
    if (user && user.walletBalance !== data.availableBalance) {
      user.walletBalance = data.availableBalance
      setUserSession(null, user)
    }
  }

  return data
}

/**
 * Melakukan penarikan saldo pemilik ke rekening pencairan utama
 */
export async function withdrawOwnerWallet({ amount }) {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/owner/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount: Number(amount) })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memproses pencairan dana')
  }

  emitWalletUpdate(data.newBalance)
  return data
}

/**
 * Mengubah atau memperbarui rekening pencairan pemilik
 */
export async function updateOwnerBankAccount({ bankName, accountNumber, accountHolder }) {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/owner/bank-account`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ bankName, accountNumber, accountHolder })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memperbarui rekening pencairan')
  }

  return data
}

/**
 * Mengambil informasi rekening pencairan pemilik
 */
export async function getOwnerBankAccount() {
  const token = getUserToken()
  if (!token) throw new Error('Harap masuk terlebih dahulu')

  const response = await fetch(`${API_BASE}/wallet/owner/bank-account`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal memuat rekening pencairan')
  }

  return data.bankAccount
}
