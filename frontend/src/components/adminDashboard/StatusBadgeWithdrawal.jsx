import React from 'react'
import { cn } from '../../lib/utils'

const STATUS_META = {
  MENUNGGU: {
    label: 'Menunggu',
    badge: 'bg-secondary text-secondary-foreground'
  },
  DIPROSES: {
    label: 'Diproses',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500'
  },
  SELESAI: {
    label: 'Selesai',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-500'
  },
  DITOLAK: {
    label: 'Ditolak',
    badge: 'bg-destructive/10 text-destructive dark:bg-destructive/20'
  }
}

export default function StatusBadgeWithdrawal({ status, className }) {
  const meta = STATUS_META[status] || STATUS_META.MENUNGGU

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors',
        meta.badge,
        className
      )}
    >
      {meta.label}
    </span>
  )
}
