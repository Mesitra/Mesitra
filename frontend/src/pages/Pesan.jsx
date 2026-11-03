import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Navbar Global */}
      <NavbarPenyewa
        activeTab="pesan"
        onNavigateHome={() => navigate('/')}
      />

      {/* Main Container Fullscreen */}
      <div className="flex-1 w-full max-w-[1920px] mx-auto px-6 md:px-10 lg:px-12 py-3 overflow-hidden flex flex-col">
        <ChatPanel
          initialPartnerId={partnerId}
          initialPartnerName={partnerName}
          initialContextType={contextType}
          initialContextData={contextData}
          isEmbedded={false}
        />
      </div>
    </div>
  )
}

