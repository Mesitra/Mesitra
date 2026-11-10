import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLoginStep1 from './AdminLoginStep1'
import AdminLoginStep2 from './AdminLoginStep2'
import { setAdminSession } from './adminSession'
import { API_BASE_URL } from '../../lib/apiClient'

export default function AdminAuthWrapper({ onAdminLoginSuccess }) {
  const navigate = useNavigate()

  const [step, setStep] = useState('STEP1') // 'STEP1' | 'PIN_REQUIRED' | 'SETUP_PIN_REQUIRED'
  // Email & password dimulai kosong supaya form login tidak pernah terisi otomatis.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberDevice, setRememberDevice] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Step 1: Login dengan Email & Password
  const handleLogin = async (e, credentials) => {
    if (e && e.preventDefault) e.preventDefault()
    setIsLoading(true)
    setError('')
    setNotice('')

    const emailValue = (credentials?.email ?? email).trim().toLowerCase()
    const passwordValue = credentials?.password ?? password

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailValue,
          password: passwordValue
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Email atau kata sandi admin tidak valid')
      }

      // 1. Kasus STAFF: Backend meminta setup PIN baru atau verifikasi PIN.
      //    Form PIN hanya boleh ditampilkan bila backend mengembalikan status ini.
      if (data.step === 'PIN_REQUIRED' || data.step === 'SETUP_PIN_REQUIRED') {
        setEmail(data.email || emailValue)
        setStep(data.step)
        return
      }

      // 2. Kasus SUPERADMIN (atau respons token JWT langsung):
      //    Simpan token ke sesi admin dan langsung redirect ke /admin tanpa modal PIN.
      if (data.token) {
        const userRole = String(data.user?.role || '').toUpperCase()
        const isNonAdminUser = userRole === 'PENYEWA' || userRole === 'PEMILIK'

        if (!isNonAdminUser) {
          setAdminSession(data.token, data.user)
          if (data.user && onAdminLoginSuccess) {
            onAdminLoginSuccess(data.user)
          }
          navigate('/admin', { replace: true })
          return
        }

        // Fallback jika akun bukan admin: pakai sesi user biasa (token/user),
        // bukan sesi admin, supaya key localStorage penyewa tidak tertimpa.
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        navigate(userRole === 'PEMILIK' ? '/dashboard-pemilik' : '/beranda-sewa', { replace: true })
        return
      }

      throw new Error('Respons autentikasi dari server tidak valid')
    } catch (err) {
      setError(err.message || 'Gagal menghubungi server autentikasi.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Setup PIN (pertama kali) atau Verifikasi 6-Digit PIN (khusus STAFF)
  const handlePinSubmit = async (pinCode) => {
    setIsLoading(true)
    setError('')
    setNotice('')

    const isSetupMode = step === 'SETUP_PIN_REQUIRED'
    const endpoint = isSetupMode
      ? `${API_BASE_URL}/api/auth/admin/setup-pin`
      : `${API_BASE_URL}/api/auth/admin/verify-pin`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          pin: pinCode.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            (isSetupMode ? 'Gagal mengatur PIN keamanan' : 'PIN keamanan tidak valid')
        )
      }

      // Berhasil verifikasi: Simpan token & user ke key sesi admin terpisah
      // (`admin_token` / `admin_user`) supaya sesi penyewa tidak tertimpa.
      if (data.token) {
        setAdminSession(data.token, data.user)
        if (data.user && onAdminLoginSuccess) {
          onAdminLoginSuccess(data.user)
        }
        navigate('/admin', { replace: true })
        return
      }

      // Setup PIN berhasil: lanjut ke tahap verifikasi PIN agar staff langsung bisa login
      if (isSetupMode) {
        setStep('PIN_REQUIRED')
        setNotice(data.message || 'PIN berhasil diatur. Masukkan PIN 6 digit Anda untuk masuk.')
        return
      }

      throw new Error('Respons verifikasi PIN dari server tidak lengkap')
    } catch (err) {
      setError(
        err.message ||
          (isSetupMode
            ? 'Gagal menyimpan PIN keamanan. Silakan coba lagi.'
            : 'Verifikasi PIN gagal. Silakan coba lagi.')
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'PIN_REQUIRED' || step === 'SETUP_PIN_REQUIRED') {
    return (
      <AdminLoginStep2
        key={step}
        mode={step}
        email={email}
        onSubmitPin={handlePinSubmit}
        onBackToStep1={() => {
          setStep('STEP1')
          setPassword('')
          setError('')
          setNotice('')
        }}
        isLoading={isLoading}
        error={error}
        setError={setError}
        notice={notice}
      />
    )
  }

  return (
    <AdminLoginStep1
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
      setError={setError}
      rememberDevice={rememberDevice}
      setRememberDevice={setRememberDevice}
      onBackToHome={() => navigate('/', { replace: true })}
    />
  )
}
