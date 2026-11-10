import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// Impor komponen modular admin
import VerifikasiKYC from './VerifikasiKYC';

const MENU_ITEMS = [
  { id: 'kyc', label: 'Verifikasi Akun', icon: UserCheck }
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab aktif langsung disinkronisasi dari URL Search Params (?tab=...)
  const activeTab = searchParams.get('tab') || 'kyc';

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const currentMenu = MENU_ITEMS.find((m) => m.id === activeTab) || MENU_ITEMS[0];

  const renderContent = () => {
    return <VerifikasiKYC onNavigateTab={handleTabChange} />;
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* 1. SIDEBAR NAVIGASI ADMIN */}
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white shrink-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-blue-600">Mesitra</span>
            <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider">
              Admin
            </span>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
            Dev Mode
          </span>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profil & Footer Status */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              RA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Rani Administrator</p>
              <p className="text-[10px] text-emerald-600 font-semibold truncate">Bypass Auth Aktif</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. AREA KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOPBAR HEADER BREADCRUMB & AKSI CEPAT */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Mesitra Operasional</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-bold text-slate-800">{currentMenu.label}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/landing')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Lihat Tampilan Website Publik / Calon Penyewa"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              <span>Buka Tampilan Publik</span>
            </button>
          </div>
        </header>

        {/* CONTAINER KONTEN MODUL */}
        <main className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
