"use client"

import { useState } from "react"
import type { Client } from "@/types/client"
import { MapPin, User, Briefcase, DollarSign, Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EditBudgetModal } from "@/components/edit-budget-modal"

interface ClientKanbanCardProps {
    client: Client
    onClick: (client: Client) => void
    onUpdate?: (client: Client) => void
    isPending?: boolean
    architectNameMap?: Record<string, string>
    isDragging?: boolean
    isPlaceholder?: boolean
}

export function ClientKanbanCard({ client, onClick, onUpdate, isPending, architectNameMap = {}, isDragging: isDraggingProp, isPlaceholder = false }: ClientKanbanCardProps) {
    const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false)
    const [isBudgetUpdating, setIsBudgetUpdating] = useState(false)
    // Use sortable hook conditionally
    const sortable = useSortable({ 
        id: client.id,
    })
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isDraggingSortable,
    } = isPlaceholder ? {
        attributes: {},
        listeners: undefined,
        setNodeRef: () => {},
        transform: null,
        transition: null,
        isDragging: false,
    } : sortable
    
    const isDragging = isDraggingProp || isDraggingSortable

    const style = isPlaceholder ? {} : {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 200ms cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    }

    // Get architect name
    const architectName = client.architecteAssigne 
        ? (architectNameMap[client.architecteAssigne] || client.architecteAssigne)
        : "Non assigné"

    // Display project name first, fallback to client name
    const projectName = client.nomProjet || `Projet ${client.nom}`
    const clientName = client.nom

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...(!isPlaceholder ? listeners : {})}
            onClick={() => !isDragging && !isPlaceholder && onClick(client)}
            className={cn(
                "group bg-slate-800/95 backdrop-blur-sm rounded-lg p-2.5",
                !isPlaceholder && "cursor-pointer",
                "border border-slate-700/50 hover:border-primary/40",
                "transition-all duration-200 hover:shadow-lg hover:shadow-primary/5",
                "relative overflow-hidden",
                isDragging && "opacity-60 shadow-xl shadow-primary/30 scale-105 ring-1 ring-primary/40 border-primary/50",
                isPlaceholder && !isPending && "opacity-40 blur-[1px] scale-95 animate-pulse cursor-not-allowed",
                isPending && "ring-1 ring-blue-400/50 shadow-md shadow-blue-400/20 border-blue-400/40",
                !isDragging && !isPending && !isPlaceholder && "hover:scale-[1.01]"
            )}
        >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-linear-to-br from-primary/0 to-primary/0 group-hover:from-primary/3 group-hover:to-transparent transition-all duration-200 pointer-events-none rounded-lg" />
            
            {/* Placeholder loading overlay */}
            {isPlaceholder && !isPending && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm rounded-lg pointer-events-none flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[8px] text-slate-400">Préparation...</span>
                    </div>
                </div>
            )}
            
            {/* Pending indicator overlay */}
            {isPending && (
                <div className="absolute inset-0 bg-blue-500/15 backdrop-blur-[1px] rounded-lg pointer-events-none flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[8px] text-blue-300 animate-pulse">Enregistrement...</span>
                    </div>
                </div>
            )}
            
            <div className={cn(
                "relative z-10 transition-all duration-200",
                (isPlaceholder || isPending) && "opacity-60"
            )}>
                {/* Project Name - Compact */}
                <div className="mb-1.5">
                    <h3 className="font-medium text-[11px] text-white line-clamp-2 leading-tight group-hover:text-primary/90 transition-colors">
                        {projectName}
                    </h3>
                </div>

                {/* Client Name - Compact highlighted */}
                <div className="flex items-center gap-1 mb-2 pb-1.5 border-b border-slate-700/40">
                    <User className="w-3 h-3 shrink-0 text-primary/80" />
                    <span className="truncate text-[10px] text-primary font-medium">{clientName}</span>
                </div>

                {/* Compact Info Grid - Minimal spacing */}
                <div className="space-y-1">
                    {/* City - Compact */}
                    <div className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-500" />
                        <span className="truncate text-[9px] font-normal">{client.ville}</span>
                    </div>

                    {/* Estimation Montant - Compact with Edit */}
                    {client.budget && client.budget > 0 && (
                        <div className="flex items-center justify-between gap-1 text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5 relative">
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                {isBudgetUpdating ? (
                                    <>
                                        <Loader2 className="w-2.5 h-2.5 shrink-0 animate-spin text-blue-400" />
                                        <span className="font-light text-[9px] truncate text-blue-300 animate-pulse">Mise à jour...</span>
                                    </>
                                ) : (
                                    <>
                                        <DollarSign className="w-2.5 h-2.5 shrink-0" />
                                        <span className="font-light text-[9px] truncate">{client.budget.toLocaleString()} DH</span>
                                    </>
                                )}
                            </div>
                            {onUpdate && !isBudgetUpdating && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsEditBudgetOpen(true)
                                    }}
                                    className="h-3.5 w-3.5 flex items-center justify-center text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 shrink-0 transition-all rounded"
                                    title="Modifier l'estimation montant"
                                >
                                    <Pencil className="w-2.5 h-2.5" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Architect - Compact */}
                    <div className="flex items-center gap-1 pt-1 border-t border-slate-700/30">
                        <Briefcase className="w-2.5 h-2.5 shrink-0 text-purple-400/80" />
                        <span className="truncate text-[9px] text-slate-300 font-normal">{architectName}</span>
                    </div>
                </div>
            </div>

            {/* Edit Budget Modal */}
            {onUpdate && (
                <EditBudgetModal
                    isOpen={isEditBudgetOpen}
                    onClose={() => setIsEditBudgetOpen(false)}
                    client={client}
                    onSave={(updatedClient) => {
                        onUpdate(updatedClient)
                        setIsEditBudgetOpen(false)
                    }}
                    onLoadingChange={setIsBudgetUpdating}
                />
            )}
        </div>
    )
}
