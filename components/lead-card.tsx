"use client"

import type { Lead } from "@/types/lead"
import { Phone, MapPin, User, Calendar } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
}

const priorityConfig = {
  haute: { label: "Haute", color: "bg-green-500/20 text-green-400 border-green-500/40" },
  moyenne: { label: "Moyenne", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  basse: { label: "Basse", color: "bg-gray-500/20 text-gray-400 border-gray-500/40" },
}

const formatRelativeDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  
  // Reset time to midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const diffTime = today.getTime() - compareDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Show relative time for recent dates
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return "Hier"
  if (diffDays > 0 && diffDays < 7) return `Il y a ${diffDays}j`
  if (diffDays < 0 && diffDays > -2) return "Aujourd'hui" // Handle timezone edge cases
  
  // Otherwise show formatted date
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short'
  })
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "glass rounded-lg p-4 cursor-grab active:cursor-grabbing glass-hover hover:scale-[1.02] transition-all duration-200",
        isDragging && "shadow-lg border-2 border-primary/40"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-white">{lead.nom}</h4>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">{lead.typeBien}</span>
          <Badge className={cn("border text-xs", priorityConfig[lead.priorite]?.color || "bg-gray-500/20 text-gray-400 border-gray-500/40")}>
            {priorityConfig[lead.priorite]?.label || 'Non défini'}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-3.5 h-3.5" />
          <span className="text-xs">{lead.telephone}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-xs">{lead.ville}</span>
        </div>

        {lead.statutDetaille && (
          <div className="text-xs text-muted-foreground italic line-clamp-2 mt-2">{lead.statutDetaille}</div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{lead.assignePar}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatRelativeDate(lead.derniereMaj)}</span>
        </div>
      </div>
    </div>
  )
}
