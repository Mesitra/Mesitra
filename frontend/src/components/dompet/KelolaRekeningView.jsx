import React, { useState } from 'react'
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  Star,
  AlertCircle,
  Loader2,
  Edit2,
  X,
  Check
} from 'lucide-react'
import {
  createWithdrawalAccount,
  updateWithdrawalAccount,
  deleteWithdrawalAccount
} from '../../lib/walletApi'
import AlertModal from '../common/AlertModal'

const BANK_OPTIONS = [
  'Bank BCA',
  'Bank Mandiri',
  'Bank BRI',
  'Bank BNI',
  'Bank BSI (Syariah)',
  'CIMB Niaga',
  'Bank Danamon',
  'Bank Permata',
  'Bank Jago',
  'SeaBank',
  'GoPay (E-Wallet)',
  'OVO (E-Wallet)',
  'DANA (E-Wallet)',
  'ShopeePay (E-Wallet)'
]

export default function KelolaRekeningView({
  accounts = [],
  onBack,
  onRefresh
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)

  const [bankName, setBankName] = useState('Bank BCA')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)

  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [accountToDelete, setAccountToDelete] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const resetForm = () => {
    setIsAdding(false)
    setEditingAccount(null)
    setBankName('Bank BCA')
    setAccountNumber('')
    setAccountHolder('')
    setIsPrimary(false)
    setError(null)
  }

  const handleStartEdit = (acc) => {
    setEditingAccount(acc)
    setIsAdding(false)
    setBankName(acc.bankName)
    setAccountNumber(acc.accountNumber)
    setAccountHolder(acc.accountHolder)
    setIsPrimary(acc.isPrimary)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!accountNumber || accountNumber.trim().length < 5) {
      setError('Nomor rekening / e-wallet minimal 5 digit')
      return
    }
    if (!accountHolder || accountHolder.trim().length < 3) {
      setError('Nama pemilik rekening wajib diisi dengan benar')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (editingAccount) {
        await updateWithdrawalAccount(editingAccount.id, {
          bankName,
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          isPrimary
        })
        setSuccessMessage('Rekening berhasil diperbarui')
      } else {
        await createWithdrawalAccount({
          bankName,
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          isPrimary
        })
        setSuccessMessage('Rekening penarikan baru berhasil didaftarkan')
      }

      resetForm()
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan rekening penarikan')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPrimary = async (accId) => {
    setActionLoadingId(accId)
    setError(null)
    try {
      await updateWithdrawalAccount(accId, { isPrimary: true })
      setSuccessMessage('Rekening utama berhasil diperbarui')
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Gagal mengubah rekening utama')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = (acc) => {
    setAccountToDelete(acc)
  }

  const executeDelete = async (accId) => {
    setActionLoadingId(accId)
    setError(null)
    try {
      await deleteWithdrawalAccount(accId)
      setSuccessMessage('Rekening berhasil dihapus')
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Gagal menghapus rekening')
    } finally {
      setActionLoadingId(null)
      setAccountToDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>
        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
          Metode Penarikan
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="text-xs font-medium">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="text-xs font-medium">{successMessage}</span>
        </div>
      )}

      {/* FORM TAMBAH / EDIT REKENING */}
      {(isAdding || editingAccount) ? (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-900 text-xs">
              {editingAccount ? 'Edit Rekening Penarikan' : 'Daftarkan Rekening Penarikan Baru'}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 mb-1 block">
              Pilih Bank atau E-Wallet
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            >
              {BANK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 mb-1 block">
              Nomor Rekening / Nomor Handphone E-Wallet
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="cth. 8720345612 atau 08123456789"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 mb-1 block">
              Nama Lengkap Pemilik Rekening (Sesuai Buku Tabungan / KTP)
            </label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="cth. Budi Santoso"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <span className="text-[11px] font-semibold text-slate-700">
              Jadikan sebagai rekening penarikan utama (default)
            </span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan…</span>
                </>
              ) : (
                <span>Simpan Rekening</span>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* DAFTAR REKENING */
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">Daftar Rekening Penarikan Terdaftar</span>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rekening</span>
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50 flex flex-col items-center gap-2">
              <Building2 className="w-8 h-8 text-slate-400" />
              <p className="text-slate-600 font-bold text-xs m-0">Belum Ada Rekening Penarikan</p>
              <p className="text-slate-400 text-[11px] m-0 max-w-xs">
                Daftarkan rekening bank atau e-wallet Anda agar dana hasil sewa atau penarikan saldo dapat dicairkan.
              </p>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Daftarkan Rekening Baru
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {accounts.map((acc) => {
                const isLoading = actionLoadingId === acc.id
                return (
                  <div
                    key={acc.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 ${
                      acc.isPrimary
                        ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            acc.isPrimary
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">{acc.bankName}</span>
                            {acc.isPrimary && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-emerald-800" />
                                Utama
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-800 font-mono font-bold tracking-wide">
                            {acc.accountNumber}
                          </span>
                          <div className="text-[10px] text-slate-500">a.n. {acc.accountHolder}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit Rekening"
                          onClick={() => handleStartEdit(acc)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Hapus Rekening"
                          disabled={isLoading}
                          onClick={() => handleDelete(acc)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {!acc.isPrimary && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleSetPrimary(acc.id)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Jadikan Rekening Utama</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Rekening */}
      <AlertModal
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        type="warning"
        title="Hapus Rekening Penarikan?"
        message={`Apakah Anda yakin ingin menghapus rekening ${accountToDelete?.bankName || ''} (${accountToDelete?.accountNumber || ''}) dari daftar rekening penarikan Anda?`}
        confirmText="Ya, Hapus Rekening"
        onConfirm={() => {
          if (accountToDelete) executeDelete(accountToDelete.id)
        }}
        secondaryAction={{
          label: 'Batal',
          onClick: () => setAccountToDelete(null)
        }}
      />
    </div>
  )
}
