"use client"

import { LeadCard } from "@/components/lead-card"
import type { Lead, LeadStatus } from "@/types/lead"
import { cn } from "@/lib/utils"
import { useDroppable } from "@dnd-kit/core"

interface KanbanColumnProps {
  status: LeadStatus
  label: string
  color: string
  leads: Lead[]
  onLeadClick?: (lead: Lead) => void
}

export function KanbanColumn({ status, label, color, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  const colorClasses = {
    success: "bg-success/20 text-success border-success/40",
    warning: "bg-warning/20 text-warning border-warning/40",
    primary: "bg-primary/20 text-primary border-primary/40",
    premium: "bg-premium/20 text-premium border-premium/40",
    destructive: "bg-destructive/20 text-destructive border-destructive/40",
  }

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="glass rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{label}</h3>
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium border",
              colorClasses[color as keyof typeof colorClasses],
            )}
          >
            {leads.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-3 overflow-y-auto rounded-lg p-3 transition-all duration-200 min-h-[400px]",
          isOver && "bg-primary/10 ring-2 ring-primary/50 border-2 border-primary/40 shadow-lg",
          "border border-slate-700/50"
        )}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick?.(lead)} />
        ))}

        {leads.length === 0 && (
          <div className={cn(
            "glass rounded-lg p-8 text-center transition-all",
            isOver && "bg-primary/20 border-2 border-primary/60"
          )}>
            <p className="text-sm text-muted-foreground">
              {isOver ? "Déposer ici" : "Aucun lead"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
