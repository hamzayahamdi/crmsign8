"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import type { Client, ProjectStatus } from "@/types/client"
import { ClientKanbanColumn } from "@/components/client-kanban-column"
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core"
import { ClientKanbanCard } from "@/components/client-kanban-card"
import { toast } from 'sonner'
import { useAuth } from "@/contexts/auth-context"

interface ClientKanbanBoardProps {
    clients: Client[]
    onClientClick: (client: Client) => void
    onUpdateClient: (client: Client) => void
    searchQuery?: string
    filters?: {
        architecte: string
        statut: "all" | ProjectStatus
        ville: string
        typeProjet: string
    }
}

const COLUMNS = [
    { id: "qualifie", label: "Qualifié", color: "#3b82f6" },
    { id: "prise_de_besoin", label: "Prise de besoin", color: "#06b6d4" },
    { id: "acompte_recu", label: "Acompte reçu", color: "#10b981" },
    { id: "conception", label: "Conception", color: "#a855f7" },
    { id: "devis_negociation", label: "Devis/Négociation", color: "#f59e0b" },
    { id: "accepte", label: "Accepté", color: "#10b981" },
    { id: "refuse", label: "Refusé", color: "#ef4444" },
    { id: "premier_depot", label: "1er Dépôt", color: "#06b6d4" },
    { id: "projet_en_cours", label: "Projet en cours", color: "#6366f1" },
    { id: "facture_reglee", label: "Facture réglée", color: "#10b981" },
    { id: "livraison_termine", label: "Livraison & Terminé", color: "#f59e0b" },
] as const

// Map column IDs to exact database ProjectStatus values
const COLUMN_TO_STATUS_MAP: Record<string, ProjectStatus> = {
    qualifie: "qualifie",
    prise_de_besoin: "prise_de_besoin",
    acompte_recu: "acompte_recu",
    conception: "conception",
    devis_negociation: "devis_negociation",
    accepte: "accepte",
    refuse: "refuse",
    premier_depot: "premier_depot",
    projet_en_cours: "projet_en_cours",
    facture_reglee: "facture_reglee",
    livraison_termine: "livraison_termine",
}

export function ClientKanbanBoard({
    clients,
    onClientClick,
    onUpdateClient,
    searchQuery = "",
    filters
}: ClientKanbanBoardProps) {
    const { user } = useAuth()
    const [activeClient, setActiveClient] = useState<Client | null>(null)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [pendingOldStatus, setPendingOldStatus] = useState<ProjectStatus | null>(null)
    const [architectNameMap, setArchitectNameMap] = useState<Record<string, string>>({})
    
    // Local state for optimistic updates
    const [localClients, setLocalClients] = useState<Client[]>(clients)
    const [isUpdating, setIsUpdating] = useState(false)
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)
    const [placeholderClient, setPlaceholderClient] = useState<Client | null>(null)
    const [placeholderColumn, setPlaceholderColumn] = useState<string | null>(null)
    
    // Use ref to prevent re-renders
    const lastDraggedOverColumn = useRef<string | null>(null)

    // Sync local clients with parent when not updating
    useEffect(() => {
        if (!isUpdating) {
            setLocalClients(clients)
        }
    }, [clients, isUpdating])

    // Fetch architect names on mount
    useEffect(() => {
        const loadArchitects = async () => {
            try {
                const response = await fetch('/api/auth/users')
                if (response.ok) {
                    const users = await response.json()
                    const map: Record<string, string> = {}
                    
                    if (Array.isArray(users)) {
                        users.forEach((u: any) => {
                            const name = (u.name || '').trim()
                            if (!name) return
                            if (u.id) {
                                map[u.id] = name
                            }
                            map[name] = name
                        })
                    }
                    
                    setArchitectNameMap(map)
                }
            } catch (e) {
                console.error('[Kanban] Failed to load architects', e)
            }
        }

        loadArchitects()
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    )

    const filteredClients = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        
        // Use local clients for optimistic updates
        const sourceClients = localClients
        
        // Show ALL opportunities as separate cards (like Zoho CRM)
        // Each opportunity should appear as its own card, even if from the same client
        // Filter to only show clients with opportunities (nomProjet exists)
        const clientsWithOpportunities = sourceClients.filter(client => {
            // Only show clients that have a project name (nomProjet)
            // This ensures we show actual opportunities, not contacts without projects
            return client.nomProjet && client.nomProjet.trim()
        })
        
        return clientsWithOpportunities.filter(client => {
            // Search filter
            if (query) {
                const searchText = [
                    client.nomProjet,
                    client.nom,
                    client.telephone,
                    client.ville,
                    client.typeProjet,
                    client.architecteAssigne,
                    client.email ?? "",
                ].join(" ").toLowerCase()
                
                if (!searchText.includes(query)) return false
            }

            // Other filters
            if (filters) {
                if (filters.statut !== "all" && client.statutProjet !== filters.statut) return false
                if (filters.ville !== "all" && client.ville !== filters.ville) return false
                if (filters.typeProjet !== "all" && client.typeProjet !== filters.typeProjet) return false
                if (filters.architecte !== "all" && client.architecteAssigne !== filters.architecte) return false
            }

            return true
        })
    }, [localClients, searchQuery, filters])

    const getClientsByStatus = useCallback((statusId: string) => {
        const statusMap: Record<string, ProjectStatus[]> = {
            qualifie: ["qualifie", "nouveau"],
            prise_de_besoin: ["prise_de_besoin"],
            acompte_recu: ["acompte_recu", "acompte_verse"],
            conception: ["conception", "en_conception"],
            devis_negociation: ["devis_negociation", "en_validation"],
            accepte: ["accepte"],
            refuse: ["refuse", "perdu", "annule", "suspendu"],
            premier_depot: ["premier_depot"],
            projet_en_cours: ["projet_en_cours", "chantier", "en_chantier"],
            facture_reglee: ["facture_reglee"],
            livraison_termine: ["livraison_termine", "livraison", "termine"],
        }

        const validStatuses = statusMap[statusId] || []
        let clients = filteredClients.filter(c => {
            // Exclude the actively dragged card from all columns
            if (activeClient && c.id === activeClient.id) return false
            
            // CRITICAL: Exclude pending clients from their OLD status column to prevent duplication
            // If this is the pending client and we're looking at the OLD column, exclude it
            if (pendingId && c.id === pendingId && pendingOldStatus) {
                // Check if this column contains the old status (meaning this is the OLD column)
                if (validStatuses.includes(pendingOldStatus)) {
                    return false // Exclude from old column
                }
            }
            
            // Filter by status (after excluding from old column)
            if (!validStatuses.includes(c.statutProjet)) return false
            
            return true
        })
        
        // Add placeholder only during drag (not after drop)
        // After drop, the optimistic update handles showing the client in the new column
        // During drag, show placeholder in the target column
        if (placeholderClient && placeholderColumn === statusId && activeClient) {
            // Only add placeholder if we're still dragging (activeClient exists)
            // and the client is not already in this column from optimistic update
            const clientIdWithoutPlaceholder = placeholderClient.id.replace('placeholder-', '')
            const alreadyHasClient = clients.some(c => c.id === clientIdWithoutPlaceholder || c.id === pendingId)
            if (!alreadyHasClient) {
                clients = [...clients, placeholderClient as Client]
            }
        }
        
        return clients
    }, [filteredClients, placeholderClient, placeholderColumn, activeClient, pendingId, pendingOldStatus])

    const handleDragStart = (event: DragStartEvent) => {
        const client = localClients.find(c => c.id === event.active.id)
        lastDraggedOverColumn.current = null
        setActiveClient(client || null)
        setIsUpdating(true)
    }

    const handleDragOver = (event: any) => {
        const { over } = event
        if (over && activeClient) {
            const targetColumnId = String(over.id)
            
            // Only update if column changed (use ref to prevent re-renders)
            if (targetColumnId !== lastDraggedOverColumn.current) {
                lastDraggedOverColumn.current = targetColumnId
                setDraggedOverColumn(targetColumnId)
                
                // Get the exact status from mapping
                const newStatus = COLUMN_TO_STATUS_MAP[targetColumnId]
                if (newStatus && activeClient.statutProjet !== newStatus) {
                    const placeholder = { ...activeClient, statutProjet: newStatus, id: `placeholder-${activeClient.id}` }
                    setPlaceholderClient(placeholder)
                    setPlaceholderColumn(targetColumnId)
                } else if (activeClient.statutProjet === newStatus) {
                    // Same column, clear placeholder
                    setPlaceholderClient(null)
                    setPlaceholderColumn(null)
                }
            }
        } else if (lastDraggedOverColumn.current !== null) {
            lastDraggedOverColumn.current = null
            setDraggedOverColumn(null)
            setPlaceholderClient(null)
            setPlaceholderColumn(null)
        }
    }

    const handleDragCancel = () => {
        lastDraggedOverColumn.current = null
        setActiveClient(null)
        setDraggedOverColumn(null)
        setPlaceholderClient(null)
        setPlaceholderColumn(null)
        setIsUpdating(false)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        
        setActiveClient(null)
        setDraggedOverColumn(null)
        
        if (!over) {
            setPlaceholderClient(null)
            setPlaceholderColumn(null)
            setIsUpdating(false)
            return
        }

        const clientId = String(active.id)
        const overId = String(over.id)
        const client = localClients.find(c => c.id === clientId)

        if (!client) {
            setPlaceholderClient(null)
            setPlaceholderColumn(null)
            setIsUpdating(false)
            return
        }

        // Determine target column ID
        // If dropped on a card (composite ID with dash), find which column that card belongs to
        let targetColumnId = overId
        
        // Check if overId is a client/card ID (contains dash, indicating composite ID)
        if (overId.includes('-') && overId.length > 20) {
            // This is likely a card ID, not a column ID
            // Find the target client to determine its column
            const targetClient = localClients.find(c => c.id === overId)
            if (targetClient) {
                // Find which column contains this client's status
                const targetStatus = targetClient.statutProjet
                // Find the column ID that matches this status
                const matchingColumn = Object.entries(COLUMN_TO_STATUS_MAP).find(
                    ([_, status]) => status === targetStatus
                )
                if (matchingColumn) {
                    targetColumnId = matchingColumn[0]
                    console.log('[Kanban] Dropped on card, using card\'s column:', targetColumnId)
                } else {
                    // If no matching column found, use the target client's status directly
                    targetColumnId = targetStatus
                }
            } else {
                // If target client not found, try to extract column from status mapping
                // Check if any column matches a status pattern
                console.warn('[Kanban] Target client not found, trying to infer column from overId')
            }
        }

        // Get exact status from mapping - allow ALL stage transitions (forward and backward)
        // First try the column mapping
        let newStatus = COLUMN_TO_STATUS_MAP[targetColumnId]
        
        // If not found in mapping, try using the column ID directly if it's a valid status
        // This allows flexibility for any stage transitions (including backward movement)
        if (!newStatus) {
            // Check if targetColumnId is already a valid ProjectStatus
            const validStatuses: ProjectStatus[] = [
                "qualifie", "prise_de_besoin", "acompte_recu", "conception",
                "devis_negociation", "accepte", "refuse", "premier_depot",
                "projet_en_cours", "facture_reglee", "livraison_termine",
                "nouveau", "acompte_verse", "en_conception", "en_validation",
                "en_chantier", "livraison", "termine", "annule", "suspendu", "perdu"
            ]
            
            if (validStatuses.includes(targetColumnId as ProjectStatus)) {
                newStatus = targetColumnId as ProjectStatus
            } else {
                console.error('[Kanban] ❌ Invalid column ID:', targetColumnId, 'from overId:', overId)
                setPlaceholderClient(null)
                setPlaceholderColumn(null)
                setIsUpdating(false)
                toast.error(`Colonne invalide: ${targetColumnId}`)
                return
            }
        }
        
        // Don't update if dropping in same column
        if (client.statutProjet === newStatus) {
            setPlaceholderClient(null)
            setPlaceholderColumn(null)
            setIsUpdating(false)
            return
        }

        // Clear placeholder immediately when drop happens (before API call)
        // The optimistic update will show the client in the new column
        setPlaceholderClient(null)
        setPlaceholderColumn(null)
        
        // Keep placeholder visible and set as pending
        // CRITICAL: Track old status to exclude from old column during pending state
        setPendingId(clientId)
        setPendingOldStatus(client.statutProjet)
        
        // Optimistic update - update local state immediately for smooth UX
        // This moves the client to the new column visually
        const optimisticClient = { ...client, statutProjet: newStatus }
        setLocalClients(prev => 
            prev.map(c => c.id === clientId ? optimisticClient : c)
        )

        try {
            console.log('[Kanban] 🔄 Updating client status:', {
                clientId,
                from: client.statutProjet,
                to: newStatus,
                changedBy: user?.name || 'User',
                timestamp: new Date().toISOString()
            })
            
            const response = await fetch(`/api/clients/${clientId}/stage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    newStage: newStatus,
                    changedBy: user?.name || 'User'
                })
            })

            const result = await response.json()
            console.log('[Kanban] 📨 API response:', {
                success: result.success,
                newStage: result.newStage,
                data: result.data,
                statutProjet: result.data?.statutProjet
            })

            if (!response.ok) {
                // Rollback optimistic update on error
                setLocalClients(prev => 
                    prev.map(c => c.id === clientId ? client : c)
                )
                setPendingId(null)
                setPendingOldStatus(null)
                throw new Error(result.details || result.error || 'Update failed')
            }

            if (result.success && result.data) {
                console.log('[Kanban] ✅ Success! Updating local state with:', {
                    id: result.data.id,
                    statutProjet: result.data.statutProjet,
                    expectedStatus: newStatus
                })
                
                // Verify the status was actually updated
                if (result.data.statutProjet !== newStatus) {
                    console.warn('[Kanban] ⚠️ WARNING: Status mismatch!', {
                        expected: newStatus,
                        actual: result.data.statutProjet,
                        response: result
                    })
                }
                
                // Brief delay to show the card settling into place
                await new Promise(resolve => setTimeout(resolve, 300))
                
                // Clear placeholder and pending state for smooth reveal
                setPlaceholderClient(null)
                setPlaceholderColumn(null)
                setPendingId(null)
                setPendingOldStatus(null)
                
                // Update the parent with confirmed data from API
                onUpdateClient(result.data)
                
                console.log('[Kanban] 🎯 Updated client in store:', {
                    clientId: result.data.id,
                    finalStatus: result.data.statutProjet
                })
                
                // Show enhanced success toast with stage information
                const statusLabels: Record<string, string> = {
                    qualifie: "Qualifié",
                    nouveau: "Nouveau",
                    prise_de_besoin: "Prise de besoin",
                    acompte_recu: "Acompte reçu",
                    acompte_verse: "Acompte versé",
                    conception: "Conception",
                    en_conception: "En conception",
                    devis_negociation: "Devis/Négociation",
                    en_validation: "En validation",
                    accepte: "Accepté",
                    refuse: "Refusé",
                    perdu: "Perdu",
                    annule: "Annulé",
                    suspendu: "Suspendu",
                    premier_depot: "Premier dépôt",
                    projet_en_cours: "Projet en cours",
                    chantier: "Chantier",
                    en_chantier: "En chantier",
                    facture_reglee: "Facture réglée",
                    livraison_termine: "Livraison & Terminé",
                    livraison: "Livraison",
                    termine: "Terminé",
                }
                
                const oldLabel = statusLabels[client.statutProjet] || client.statutProjet
                const newLabel = statusLabels[newStatus] || newStatus
                const projectName = client.nomProjet || client.nom
                
                console.log('[Kanban] 🎉 Showing success toast:', { projectName, oldLabel, newLabel })
                
                // Enhanced toast with better styling to match the design
                toast.success(
                    <div className="flex flex-col gap-2.5 py-1">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center">
                                <span className="text-green-400 text-sm">✓</span>
                            </div>
                            <p className="font-semibold text-sm text-white/95 leading-tight">{projectName}</p>
                        </div>
                        <div className="flex items-center gap-2.5 ml-9">
                            <span className="px-2.5 py-1 rounded-md bg-slate-700/60 text-slate-300 text-xs font-medium line-through opacity-70">
                                {oldLabel}
                            </span>
                            <span className="text-slate-400 text-xs">→</span>
                            <span className="px-2.5 py-1 rounded-md bg-purple-500/25 text-purple-300 text-xs font-semibold border border-purple-500/30">
                                {newLabel}
                            </span>
                        </div>
                    </div>,
                    {
                        duration: 4000,
                        className: '!bg-green-500/15 !border-green-500/30 backdrop-blur-md shadow-lg',
                        style: {
                            background: 'rgba(34, 197, 94, 0.15) !important',
                            border: '1px solid rgba(34, 197, 94, 0.3) !important',
                            borderRadius: '12px',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            zIndex: 9999,
                        },
                        position: 'top-right',
                        id: `stage-change-${clientId}-${Date.now()}`,
                    }
                )
                
                console.log('[Kanban] ✅ Toast triggered successfully')
            } else {
                // Rollback on unexpected response
                setLocalClients(prev => 
                    prev.map(c => c.id === clientId ? client : c)
                )
                setPlaceholderClient(null)
                setPlaceholderColumn(null)
                setPendingId(null)
                setPendingOldStatus(null)
                throw new Error('No data returned from API')
            }
        } catch (error) {
            console.error('[Kanban] Error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
            
            // Clear placeholder on error
            setPlaceholderClient(null)
            setPlaceholderColumn(null)
            setPendingId(null)
            setPendingOldStatus(null)
            
            toast.error(
                <div className="flex items-center gap-2">
                    <span className="text-lg">❌</span>
                    <div>
                        <p className="font-semibold text-xs">Erreur de déplacement</p>
                        <p className="text-[10px] text-slate-400">{errorMessage}</p>
                    </div>
                </div>,
                {
                    duration: 4000,
                }
            )
        } finally {
            // Only clear pending state if not already cleared (success case clears it earlier)
            if (pendingId === clientId) {
                setPendingId(null)
                setPendingOldStatus(null)
            }
            setIsUpdating(false)
        }
    }

    return (
        <div className="h-full flex flex-col">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="flex gap-4 h-full overflow-x-auto px-6 py-4 kanban-scroll">
                    {COLUMNS.map(column => (
                        <ClientKanbanColumn
                            key={column.id}
                            id={column.id}
                            label={column.label}
                            color={column.color}
                            clients={getClientsByStatus(column.id)}
                            onClientClick={onClientClick}
                            onUpdate={onUpdateClient}
                            pendingId={pendingId}
                            architectNameMap={architectNameMap}
                            isDraggedOver={draggedOverColumn === column.id}
                            placeholderId={placeholderClient?.id}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={{
                    duration: 200,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                    {activeClient && (
                        <div className="opacity-80 rotate-3 scale-105 shadow-2xl animate-pulse">
                            <ClientKanbanCard 
                                client={activeClient} 
                                onClick={() => {}} 
                                architectNameMap={architectNameMap}
                                isDragging={true}
                            />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
