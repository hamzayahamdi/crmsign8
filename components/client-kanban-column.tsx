"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { ClientKanbanCard } from "@/components/client-kanban-card"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface ClientKanbanColumnProps {
  status: ProjectStatus
  label: string
  clients: Client[]
  color: string
  gradient: string
  onClientClick: (client: Client) => void
  newlyAddedClientId?: string | null
}

const colorClasses: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  green: "bg-green-500/20 text-green-300 border-green-500/30",
  purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  red: "bg-red-500/20 text-red-300 border-red-500/30",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
}

export function ClientKanbanColumn({
  status,
  label,
  clients,
  color,
  gradient,
  onClientClick,
  newlyAddedClientId
}: ClientKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] max-w-[280px] sm:max-w-[320px]">
      {/* Column Header - Modern with Gradient */}
      <div className="bg-[#171B22] border border-white/10 rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">{label}</h3>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold border",
              colorClasses[color] || "bg-white/10 text-white/60 border-white/20"
            )}
          >
            {clients.length}
          </span>
        </div>
        {/* Gradient Bar */}
        <div className={cn("h-1 rounded-full bg-gradient-to-r", gradient)} />
      </div>

      {/* Column Content - Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-3 overflow-y-auto rounded-lg p-3 transition-all duration-200 min-h-[400px]",
          isOver && "bg-primary/10 ring-2 ring-primary/50 border-2 border-primary/40 shadow-lg",
          "border border-slate-700/50"
        )}
      >
        <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {clients.map((client) => (
            <ClientKanbanCard
              key={client.id}
              client={client}
              onClick={onClientClick}
              isNewlyAdded={client.id === newlyAddedClientId}
            />
          ))}
        </SortableContext>

        {clients.length === 0 && (
          <div className={cn(
            "glass rounded-lg p-8 text-center transition-all",
            isOver && "bg-primary/20 border-2 border-primary/60"
          )}>
            <p className="text-sm text-muted-foreground">
              {isOver ? "Déposer ici" : "Aucun projet"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
