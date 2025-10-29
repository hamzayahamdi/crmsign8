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
  onClientClick: (client: Client) => void
  newlyAddedClientId?: string | null
}

const colorClasses = {
  success: "bg-success/20 text-success border-success/40",
  warning: "bg-warning/20 text-warning border-warning/40",
  primary: "bg-primary/20 text-primary border-primary/40",
  premium: "bg-premium/20 text-premium border-premium/40",
  destructive: "bg-destructive/20 text-destructive border-destructive/40",
  danger: "bg-red-500/20 text-red-400 border-red-500/40",
  muted: "bg-slate-500/20 text-slate-400 border-slate-500/40",
}

export function ClientKanbanColumn({
  status,
  label,
  clients,
  color,
  onClientClick,
  newlyAddedClientId
}: ClientKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="glass rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{label}</h3>
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium border",
              colorClasses[color as keyof typeof colorClasses]
            )}
          >
            {clients.length}
          </span>
        </div>
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
