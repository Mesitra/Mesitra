import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLoginStep1 from './AdminLoginStep1'
import AdminLoginStep2 from './AdminLoginStep2'
import { setAdminSession } from './adminSession'

export default function AdminAuthWrapper({ onAdminLoginSuccess }) {
  const navigate = useNavigate()

  const [step, setStep] = useState('STEP1') // 'STEP1' | 'STEP2'
  // Email & password starts kosong supaya form login tidak pernah terisi otomatis.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberDevice, setRememberDevice] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Login dengan Email & Password
  const handleStep1Submit = async (e, credentials) => {
    if (e && e.preventDefault) e.preventDefault()
    setIsLoading(true)
    setError('')

    const emailValue = credentials?.email ?? email
    const passwordValue = credentials?.password ?? password

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailValue.trim().toLowerCase(),
          password: passwordValue
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Email atau kata sandi admin tidak valid')
      }

      // Role ADMIN akan menerima response: { step: 'OTP_REQUIRED' }
      if (data.step === 'OTP_REQUIRED') {
        if (data.email) setEmail(data.email)
        setStep('STEP2')
        return
      }

      // Fallback jika akun bukan admin: pakai sesi user biasa (token/user),
      // bukan sesi admin, supaya key localStorage penyewa tidak tertimpa.
      if (data.token && data.user) {
        if (String(data.user.role).toUpperCase() === 'ADMIN') {
          setAdminSession(data.token, data.user)
          navigate('/admin/kyc')
        } else {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          navigate('/beranda-sewa')
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal menghubungi server autentikasi.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Verifikasi 6-Digit OTP
  const handleStep2VerifyOtp = async (otpCode) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3000/api/auth/verify-admin-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Kode verifikasi tidak valid')
      }

      // Berhasil verifikasi: Simpan token & user ke key sesi admin terpisah
      // (`admin_token` / `admin_user`) supaya sesi penyewa tidak tertimpa.
      if (data.token) {
        setAdminSession(data.token, data.user)
      }

      if (onAdminLoginSuccess) {
        onAdminLoginSuccess(data.user)
      }

      // Arahkan ke rute dashboard admin
      navigate('/admin/kyc')
    } catch (err) {
      setError(err.message || 'Verifikasi OTP gagal. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'STEP2') {
    return (
      <AdminLoginStep2
        email={email}
        onVerifyOtp={handleStep2VerifyOtp}
        onBackToStep1={() => {
          setStep('STEP1')
          setError('')
        }}
        isLoading={isLoading}
        error={error}
        setError={setError}
      />
    )
  }

  return (
    <AdminLoginStep1
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      onSubmit={handleStep1Submit}
      isLoading={isLoading}
      error={error}
      setError={setError}
      rememberDevice={rememberDevice}
      setRememberDevice={setRememberDevice}
      onBackToHome={() => navigate('/')}
    />
  )
}
