"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { Phone, MapPin, User, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"

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
  } = useSortable({ id: client.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
    const config: Record<ProjectStatus, { label: string; className: string }> = {
      nouveau: { label: "Nouveau", className: "bg-green-500/20 text-green-400 border-green-500/40" },
      acompte_verse: { label: "Acompte versé", className: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
      en_conception: { label: "En conception", className: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
      en_validation: { label: "En validation", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
      en_chantier: { label: "En chantier", className: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
      livraison: { label: "Livraison", className: "bg-teal-500/20 text-teal-400 border-teal-500/40" },
      termine: { label: "Terminé", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
      annule: { label: "Annulé", className: "bg-red-500/20 text-red-400 border-red-500/40" },
      suspendu: { label: "Suspendu", className: "bg-slate-500/20 text-slate-400 border-slate-500/40" },
    }
    return config[status] || { label: status, className: "bg-gray-500/20 text-gray-400 border-gray-500/40" }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick(client)}
      className={cn(
        "glass rounded-lg p-4 cursor-grab active:cursor-grabbing glass-hover hover:scale-[1.02] transition-all duration-200",
        isDragging && "opacity-50 shadow-2xl border-2 border-primary/60 scale-105"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-white">{client.nom}</h4>
        <span className="text-xs text-muted-foreground">{client.typeProjet}</span>
      </div>

      {/* Status Badge - Shows exact status from table */}
      <div className="mb-3">
        <span className={cn(
          "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium border",
          getStatusBadge(client.statutProjet).className
        )}>
          {getStatusBadge(client.statutProjet).label}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-3.5 h-3.5" />
          <span className="text-xs">{client.telephone}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-xs">{client.ville}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{client.architecteAssigne}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatRelativeDate(client.derniereMaj)}</span>
        </div>
      </div>
    </div>
  )
}
