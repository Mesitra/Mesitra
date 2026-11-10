import React from 'react'
import { X, User, Phone, Mail, MapPin, MessageCircle } from 'lucide-react'

export default function ModalHubungiPemilik({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null

  const owner = order.equipment?.owner || {}
  const ownerName = owner.fullName || 'Pemilik Alat'
  const ownerPhone = owner.phone || '0812-3456-7890'
  const ownerEmail = owner.email || 'pemilik@mesitra.id'
  const ownerAddress = order.equipment?.location || 'Gudang Sewa, Tebet, Jakarta Selatan'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 m-0">Hubungi Pemilik Alat</h3>
              <p className="text-[11px] text-slate-500 m-0">{order.equipment?.name || 'Unit Sewa'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3.5">
          <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Nama Pemilik</span>
              <span className="text-xs font-bold text-slate-800">{ownerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Nomor Telepon / WA</span>
              <span className="text-xs font-bold text-blue-600">{ownerPhone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Email</span>
              <span className="text-xs font-medium text-slate-700">{ownerEmail}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-slate-500 shrink-0">Lokasi Gudang</span>
              <span className="text-xs font-medium text-slate-700 text-right">{ownerAddress}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=Halo%20${encodeURIComponent(ownerName)},%20saya%20terkait%20sewa%20${encodeURIComponent(order.equipment?.name || 'alat')}%20(${order.invoiceNumber})`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat WhatsApp</span>
            </a>
            <a
              href={`tel:${ownerPhone}`}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Telepon</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
