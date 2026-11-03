import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import NavbarPenyewa from '../components/common/NavbarPenyewa'
import ChatPanel from '../components/chat/ChatPanel'
import { getSessionUser } from '../lib/userSession'

export default function Pesan() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getSessionUser()

  const partnerId = location.state?.partnerId || null
  const partnerName = location.state?.partnerName || null
  const contextType = location.state?.contextType || null
  const contextData = location.state?.contextData || null

  // State untuk menandai apakah di tampilan mobile sedang berada di ruang chat aktif
  const [isChatOpenOnMobile, setIsChatOpenOnMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(partnerId && window.innerWidth < 768)
  })

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/beranda-sewa')
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Navbar Global Penyewa */}
      <NavbarPenyewa
        activeTab="pesan"
        hideBottomNav={isChatOpenOnMobile}
        onNavigateHome={() => navigate('/')}
      />

      {/* Baris Tombol Kembali & Breadcrumb (Konsisten seperti Profil, Dompet, dan Detail Alat) */}
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-10 lg:px-12 pt-3 pb-1 shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link to="/beranda-sewa" className="hover:text-blue-600 no-underline text-slate-500">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">Pesan Masuk</span>
        </div>
      </div>

      {/* Main Container Fullscreen */}
      <div className="flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-10 lg:px-12 py-2 pb-3 overflow-hidden flex flex-col min-h-0">
        <ChatPanel
          initialPartnerId={partnerId}
          initialPartnerName={partnerName}
          initialContextType={contextType}
          initialContextData={contextData}
          isEmbedded={false}
          onChatSelectChange={(chat) => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
            setIsChatOpenOnMobile(Boolean(chat && isMobile))
          }}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}

