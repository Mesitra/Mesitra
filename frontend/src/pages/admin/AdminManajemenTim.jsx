import React, { useState, useEffect } from 'react'
import { Users, Plus, Shield, ShieldOff, KeyRound, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function AdminManajemenTim() {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStaffList()
  }, [])

  async function fetchStaffList() {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const res = await fetch('http://localhost:3000/api/admin/staff', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setStaffList(data.users || [])
      } else {
        setError(data.error?.message || 'Gagal memuat daftar staff')
      }
    } catch (err) {
      setError('Gagal menghubungi server')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateStaff(e) {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.password) {
      alert('Semua field wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('adminToken')
      const res = await fetch('http://localhost:3000/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        alert('Staff berhasil dibuat')
        setShowModal(false)
        setFormData({ name: '', email: '', password: '' })
        fetchStaffList()
      } else {
        alert(data.error?.message || 'Gagal membuat staff')
      }
    } catch (err) {
      alert('Gagal menghubungi server')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPin(id, name) {
    if (!confirm(`Reset PIN untuk ${name}? Staff akan diminta setup PIN baru saat login berikutnya.`)) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`http://localhost:3000/api/admin/staff/${id}/reset-pin`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'PIN berhasil direset')
        fetchStaffList()
      } else {
        alert(data.error?.message || 'Gagal reset PIN')
      }
    } catch (err) {
      alert('Gagal menghubungi server')
    }
  }

  async function handleToggleActive(id, name, isActive) {
    const action = isActive ? 'nonaktifkan' : 'aktifkan'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} akun ${name}?`)) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const endpoint = isActive ? 'deactivate' : 'activate'
      const res = await fetch(`http://localhost:3000/api/admin/staff/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || `Akun berhasil di${action}`)
        fetchStaffList()
      } else {
        alert(data.error?.message || `Gagal ${action} akun`)
      }
    } catch (err) {
      alert('Gagal menghubungi server')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Tim</h1>
            <p className="text-gray-600">Kelola karyawan dan staff admin MyRent</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Tambah Staff
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{staffList.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Superadmin</p>
              <p className="text-2xl font-bold text-gray-900">
                {staffList.filter((s) => s.role === 'SUPERADMIN').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">
                {staffList.filter((s) => s.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nama</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staffList.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{staff.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-600">{staff.email}</div>
                </td>
                <td className="px-6 py-4">
                  {staff.role === 'SUPERADMIN' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                      <Shield className="w-4 h-4" />
                      Superadmin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      <Users className="w-4 h-4" />
                      Staff
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {staff.isActive ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      <XCircle className="w-4 h-4" />
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {staff.role === 'SUPERADMIN' ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPin(staff.id, staff.name)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
                        title="Reset PIN"
                      >
                        <KeyRound className="w-4 h-4" />
                        Reset PIN
                      </button>
                      <button
                        onClick={() => handleToggleActive(staff.id, staff.name, staff.isActive)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition ${
                          staff.isActive
                            ? 'text-red-700 bg-red-50 hover:bg-red-100'
                            : 'text-green-700 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {staff.isActive ? (
                          <>
                            <ShieldOff className="w-4 h-4" />
                            Nonaktifkan
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" />
                            Aktifkan
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {staffList.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Belum ada staff</p>
          </div>
        )}
      </div>

      {/* Modal Tambah Staff */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tambah Staff Baru</h2>
            <form onSubmit={handleCreateStaff}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@myrent.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Awal</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Staff akan diminta setup PIN 6 digit saat pertama kali login
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ name: '', email: '', password: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
