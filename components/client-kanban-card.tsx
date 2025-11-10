"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { MapPin, User, Building2, CheckCircle, XCircle, Clock, Phone, Mail, CalendarDays, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { getStatusConfig } from "@/lib/status-config"

interface ClientKanbanCardProps {
  client: Client
  onClick: (client: Client) => void
  isNewlyAdded?: boolean
}

export function ClientKanbanCard({ client, onClick, isNewlyAdded }: ClientKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: client.id,
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = today.getTime() - compareDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays > 0 && diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 0 && diffDays > -2) return "Aujourd'hui"
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    })
  }

  const getStatusBadge = (status: ProjectStatus) => {
    const sc = getStatusConfig(status)
    return { label: sc.label, className: `${sc.bgColor} ${sc.textColor} ${sc.borderColor}` }
  }

  // Compute a quick upcoming rendez-vous summary if available
  const upcomingRdv = (client.rendezVous || [])
    .filter(r => r.status !== "cancelled")
    .map(r => ({ ...r, start: new Date(r.dateStart) }))
    .filter(r => !isNaN(r.start.getTime()) && r.start.getTime() >= Date.now())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
  }

  const acceptedDevis = client.devis?.filter(d => d.statut === "accepte").length || 0
  const refusedDevis = client.devis?.filter(d => d.statut === "refuse").length || 0
  const pendingDevis = client.devis?.filter(d => d.statut === "en_attente").length || 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick(client)}
      className={cn(
        "bg-[#171B22] border border-white/10 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:bg-[#1C2128] hover:border-white/20 hover:shadow-xl transition-all duration-200",
        isDragging && "opacity-50 shadow-2xl border-2 border-blue-500/60 scale-105 rotate-2",
        isNewlyAdded && "ring-2 ring-blue-500/50 animate-pulse"
      )}
    >
      {/* Header - Client Name, Status & Magasin */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-bold text-white text-base line-clamp-1">{client.nom}</h4>
          {/* status badge */}
          {client.statutProjet && (
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap",
              getStatusBadge(client.statutProjet).className
            )}>
              {getStatusBadge(client.statutProjet).label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {client.magasin && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <Building2 className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">{client.magasin}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-md">
            <MapPin className="w-3 h-3 text-white/60" />
            <span className="text-xs text-white/60">{client.ville}</span>
          </div>
        </div>
      </div>

      {/* Key info - compact & useful */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {/* Phone */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md">
          <Phone className="w-3.5 h-3.5 text-white/50" />
          <span className="text-xs text-white/70 truncate" title={client.telephone}>{client.telephone}</span>
        </div>
        {/* Email */}
        {client.email && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md">
            <Mail className="w-3.5 h-3.5 text-white/50" />
            <span className="text-xs text-white/70 truncate" title={client.email}>{client.email}</span>
          </div>
        )}
        {/* Project type */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md">
          <Tag className="w-3.5 h-3.5 text-white/50" />
          <span className="text-xs text-white/70 capitalize">{client.typeProjet}</span>
        </div>
        {/* Next RDV */}
        {upcomingRdv ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md">
            <CalendarDays className="w-3.5 h-3.5 text-white/50" />
            <span className="text-xs text-white/70">{formatShortDate(upcomingRdv.start)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-md">
            <CalendarDays className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs text-white/50">Pas de RDV</span>
          </div>
        )}
      </div>

      {/* Devis Indicators */}
      {(acceptedDevis > 0 || refusedDevis > 0 || pendingDevis > 0) && (
        <div className="flex items-center gap-2 mb-3">
          {acceptedDevis > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-md" title="Devis acceptés">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs font-semibold text-green-300">{acceptedDevis}</span>
              <span className="text-[10px] text-green-300/90">Accepté{acceptedDevis > 1 ? 's' : ''}</span>
            </div>
          )}
          {pendingDevis > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-md" title="Devis en attente">
              <Clock className="w-3 h-3 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-300">{pendingDevis}</span>
              <span className="text-[10px] text-yellow-300/90">En attente</span>
            </div>
          )}
          {refusedDevis > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-md" title="Devis refusés">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-xs font-semibold text-red-300">{refusedDevis}</span>
              <span className="text-[10px] text-red-300/90">Refusé{refusedDevis > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer - Owner & Last Update */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/60 truncate max-w-[120px]">
            {client.commercialAttribue || client.architecteAssigne}
          </span>
        </div>
        <span className="text-[10px] text-white/40">{formatRelativeDate(client.derniereMaj)}</span>
      </div>
    </div>
  )
}
