"use client"

import { useMemo } from "react"
import type { Client } from "@/types/client"
import { ClientKanbanCard } from "@/components/client-kanban-card"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { DollarSign } from "lucide-react"

interface ClientKanbanColumnProps {
    id: string
    label: string
    color: string
    clients: Client[]
    onClientClick: (client: Client) => void
    onUpdate?: (client: Client) => void
    pendingId?: string | null
    architectNameMap?: Record<string, string>
    isDraggedOver?: boolean
    placeholderId?: string
}

export function ClientKanbanColumn({
    id,
    label,
    color,
    clients,
    onClientClick,
    onUpdate,
    pendingId,
    architectNameMap = {},
    isDraggedOver = false,
    placeholderId
}: ClientKanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id })

    // Calculate total budget for all clients in this column
    const totalBudget = useMemo(() => {
        return clients
            .filter(c => !c.id.startsWith('placeholder-'))
            .reduce((sum, client) => {
                const budget = client.budget || 0
                return sum + budget
            }, 0)
    }, [clients])

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-MA", {
            style: "currency",
            currency: "MAD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="flex flex-col shrink-0 w-[280px]">
            {/* Header - Improved with better contrast */}
            <div 
                className="mb-3 px-3 py-2 rounded-lg flex items-center justify-between border backdrop-blur-sm"
                style={{ 
                    backgroundColor: color + '20', 
                    borderColor: color + '60'
                }}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white truncate">
                        {label}
                    </span>
                    {totalBudget > 0 && (
                        <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 whitespace-nowrap flex-shrink-0 border"
                            style={{ 
                                backgroundColor: color + '60', 
                                borderColor: color + '80',
                                color: '#fff',
                                boxShadow: `0 0 10px ${color}50, inset 0 1px 0 rgba(255,255,255,0.1)`,
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                            }}
                            title={`Total budget: ${formatCurrency(totalBudget)}`}
                        >
                            <DollarSign className="w-2.5 h-2.5" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }} />
                            <span className="font-extrabold">{formatCurrency(totalBudget)}</span>
                        </span>
                    )}
                </div>
                <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center flex-shrink-0"
                    style={{ backgroundColor: color + '40', color: '#fff' }}
                >
                    {clients.length}
                </span>
            </div>

            {/* Drop Zone - Better visual feedback with smooth transitions */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 space-y-2 p-2.5 rounded-xl border-2 transition-all duration-300 min-h-[500px]",
                    "border-slate-700/30 bg-slate-800/10",
                    isDraggedOver && "bg-primary/5 border-primary/40 ring-1 ring-primary/20",
                    isOver && "bg-primary/15 border-primary/70 ring-2 ring-primary/40 shadow-xl shadow-primary/30 scale-[1.03] animate-pulse"
                )}
            >
                {/* Regular sortable cards */}
                <SortableContext 
                    items={clients.filter(c => !c.id.startsWith('placeholder-')).map(c => c.id)} 
                    strategy={verticalListSortingStrategy}
                >
                    {clients.filter(c => !c.id.startsWith('placeholder-')).map(client => {
                        const isPending = pendingId === client.id
                        
                        return (
                            <ClientKanbanCard
                                key={client.id}
                                client={client}
                                onClick={onClientClick}
                                onUpdate={onUpdate}
                                isPending={isPending}
                                isPlaceholder={false}
                                architectNameMap={architectNameMap}
                            />
                        )
                    })}
                </SortableContext>
                
                {/* Placeholder card (non-draggable) */}
                {clients.filter(c => c.id.startsWith('placeholder-')).map(client => {
                    const originalId = client.id.replace('placeholder-', '')
                    const isPending = pendingId === originalId
                    
                    return (
                        <div key={client.id} className="animate-in fade-in duration-200">
                            <ClientKanbanCard
                                client={client}
                                onClick={() => {}}
                                isPending={isPending}
                                isPlaceholder={true}
                                architectNameMap={architectNameMap}
                            />
                        </div>
                    )
                })}

                {clients.length === 0 && !isOver && (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-[10px] font-medium border border-dashed border-slate-700/40 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-slate-700/30 flex items-center justify-center mb-2">
                            <span className="text-slate-500 text-lg">∅</span>
                        </div>
                        <span>Aucun projet</span>
                    </div>
                )}
                
                {clients.length === 0 && isOver && (
                    <div className="flex flex-col items-center justify-center h-40 text-primary text-xs font-semibold border-2 border-dashed border-primary/60 rounded-lg bg-primary/10">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                            <span className="text-2xl">↓</span>
                        </div>
                        <span>Déposer ici</span>
                    </div>
                )}
            </div>
        </div>
    )
}
