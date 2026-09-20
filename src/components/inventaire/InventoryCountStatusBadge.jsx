// src/components/inventaire/InventoryCountStatusBadge.jsx
import React from 'react'
import {
  FileText, PlayCircle, CheckCircle2, ShieldCheck, XCircle
} from 'lucide-react'

const STATUS_CONFIG = {
  draft:       { label: 'Brouillon', color: 'badge-ghost',   icon: FileText },
  in_progress: { label: 'En cours',  color: 'badge-warning', icon: PlayCircle },
  completed:   { label: 'Terminé',   color: 'badge-info',    icon: CheckCircle2 },
  validated:   { label: 'Validé',    color: 'badge-success', icon: ShieldCheck },
  cancelled:   { label: 'Annulé',    color: 'badge-error',   icon: XCircle },
}

const InventoryCountStatusBadge = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = config.icon
  const sizeClass = size === 'sm' ? 'badge-sm text-xs' : 'badge-md'

  return (
    <span className={`badge ${config.color} ${sizeClass} gap-1.5 font-semibold`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

export default InventoryCountStatusBadge