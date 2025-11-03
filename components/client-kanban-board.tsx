"use client"

import { useState, useEffect } from "react"
import type { Client, ProjectStatus } from "@/types/client"
import { ClientKanbanColumn } from "@/components/client-kanban-column"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  closestCenter,
} from "@dnd-kit/core"
import { ClientKanbanCard } from "@/components/client-kanban-card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

// 11-stage pipeline matching Client Details Page timeline
const columns: { 
  status: ProjectStatus
  label: string
  color: string
  gradient: string
}[] = [
  { 
    status: "qualifie", 
    label: "Qualifié", 
    color: "blue",
    gradient: "from-blue-400 to-blue-500"
  },
  { 
    status: "acompte_recu", 
    label: "Acompte reçu", 
    color: "green",
    gradient: "from-green-400 to-green-500"
  },
  { 
    status: "conception", 
    label: "Conception", 
    color: "purple",
    gradient: "from-purple-400 to-purple-500"
  },
  { 
    status: "devis_negociation", 
    label: "Devis/Négociation", 
    color: "yellow",
    gradient: "from-yellow-400 to-yellow-500"
  },
  { 
    status: "accepte", 
    label: "Accepté", 
    color: "emerald",
    gradient: "from-emerald-400 to-emerald-500"
  },
  { 
    status: "refuse", 
    label: "Refusé", 
    color: "red",
    gradient: "from-red-400 to-red-500"
  },
  { 
    status: "premier_depot", 
    label: "1er Dépôt", 
    color: "cyan",
    gradient: "from-cyan-400 to-cyan-500"
  },
  { 
    status: "projet_en_cours", 
    label: "Projet en cours", 
    color: "indigo",
    gradient: "from-indigo-400 to-indigo-500"
  },
  { 
    status: "chantier", 
    label: "Chantier", 
    color: "blue",
    gradient: "from-blue-500 to-blue-600"
  },
  { 
    status: "facture_reglee", 
    label: "Facture réglée", 
    color: "green",
    gradient: "from-green-500 to-green-600"
  },
  { 
    status: "livraison_termine", 
    label: "Livraison & Terminé", 
    color: "amber",
    gradient: "from-amber-400 to-amber-500"
  },
]

export function ClientKanbanBoard({ 
  clients, 
  onClientClick, 
  onUpdateClient,
  searchQuery = "",
  filters 
}: ClientKanbanBoardProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [newlyAddedClientId, setNewlyAddedClientId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [scrollPosition, setScrollPosition] = useState<'start' | 'middle' | 'end'>('start')
  const scrollContainerRef = useState<HTMLDivElement | null>(null)[0]

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced for smoother drag start
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Reduced for smoother drag start
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Reduced delay for faster response
        tolerance: 5,
      },
    })
  )

  // Custom collision detection
  const customCollisionDetection = (args: any) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) {
      return rectCollisions
    }
    
    return closestCenter(args)
  }

  // Filter clients
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const passesSearch = (client: Client) => {
    if (!normalizedQuery) return true
    const haystack = [
      client.nom,
      client.telephone,
      client.ville,
      client.typeProjet,
      client.architecteAssigne,
      client.email ?? "",
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  }

  const passesFilters = (client: Client) => {
    if (!filters) return true
    if (filters.statut !== "all" && client.statutProjet !== filters.statut) return false
    if (filters.ville !== "all" && client.ville !== filters.ville) return false
    if (filters.typeProjet !== "all" && client.typeProjet !== filters.typeProjet) return false
    if (filters.architecte !== "all" && client.architecteAssigne !== filters.architecte) return false
    return true
  }

  const filteredClients = clients.filter(client => passesSearch(client) && passesFilters(client))

  // Handle scroll position for fade indicators
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollLeft = target.scrollLeft
    const maxScroll = target.scrollWidth - target.clientWidth
    
    if (scrollLeft <= 10) {
      setScrollPosition('start')
    } else if (scrollLeft >= maxScroll - 10) {
      setScrollPosition('end')
    } else {
      setScrollPosition('middle')
    }
  }

  const getClientsByStatus = (status: ProjectStatus) => {
    // Map legacy statuses to new 11-stage pipeline
    const statusMapping: Record<ProjectStatus, ProjectStatus> = {
      // New statuses (direct mapping)
      qualifie: "qualifie",
      acompte_recu: "acompte_recu",
      conception: "conception",
      devis_negociation: "devis_negociation",
      accepte: "accepte",
      refuse: "refuse",
      premier_depot: "premier_depot",
      projet_en_cours: "projet_en_cours",
      chantier: "chantier",
      facture_reglee: "facture_reglee",
      livraison_termine: "livraison_termine",
      
      // Legacy status mapping for backward compatibility
      nouveau: "qualifie",
      acompte_verse: "acompte_recu",
      en_conception: "conception",
      en_validation: "devis_negociation",
      en_chantier: "chantier",
      livraison: "livraison_termine",
      termine: "livraison_termine",
      annule: "refuse",
      suspendu: "refuse",
    }
    
    return filteredClients.filter(client => {
      const mappedStatus = statusMapping[client.statutProjet]
      return mappedStatus === status
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const client = clients.find(c => c.id === active.id)
    if (client) {
      setActiveClient(client)
    }
  }

  const handleDragCancel = () => {
    setActiveClient(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) {
      setActiveClient(null)
      return
    }

    const draggedId = String(active.id)
    const draggedClient = clients.find(c => c.id === draggedId)

    if (!draggedClient) {
      setActiveClient(null)
      return
    }

    // Determine target status
    const overId = String(over.id)
    const possibleStatuses: ProjectStatus[] = [
      "qualifie",
      "acompte_recu",
      "conception",
      "devis_negociation",
      "accepte",
      "refuse",
      "premier_depot",
      "projet_en_cours",
      "chantier",
      "facture_reglee",
      "livraison_termine",
    ]

    let targetStatus: ProjectStatus | null = null

    if (possibleStatuses.includes(overId as ProjectStatus)) {
      targetStatus = overId as ProjectStatus
    }

    if (!targetStatus) {
      setActiveClient(null)
      return
    }

    // Don't update if dropped in same column
    if (draggedClient.statutProjet === targetStatus) {
      setActiveClient(null)
      return
    }

    // Store original state for rollback
    const originalStatus = draggedClient.statutProjet
    const now = new Date().toISOString()

    console.log(`[Kanban] 🎯 Drag detected: ${draggedClient.nom}`)
    console.log(`[Kanban] 📍 From: ${originalStatus} → To: ${targetStatus}`)

    // Optimistic update FIRST (immediate UI feedback)
    const optimisticClient: Client = {
      ...draggedClient,
      statutProjet: targetStatus,
      derniereMaj: now,
      updatedAt: now,
      historique: [
        ...(draggedClient.historique || []),
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: "statut" as const,
          description: `Statut changé vers ${getStatusLabel(targetStatus)}`,
          auteur: user?.name || "Système"
        }
      ]
    }

    console.log(`[Kanban] ⚡ Optimistic update - Setting UI to: ${targetStatus}`)
    
    // Update UI immediately for smooth drag experience
    onUpdateClient(optimisticClient)
    setActiveClient(null)
    setIsUpdating(true)

    // Then update database - this will trigger real-time sync to other browsers
    try {
      const response = await fetch(`/api/clients/${draggedClient.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newStage: targetStatus,
          changedBy: user?.name || 'Utilisateur'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update stage in database')
      }

      const result = await response.json()
      console.log(`[Kanban] ✅ Stage updated in DB: ${draggedClient.id} → ${targetStatus}`)
      console.log(`[Kanban] 🔄 Real-time sync will update other browsers automatically`)
      
      // Show success toast
      const statusLabels: Record<ProjectStatus, string> = {
        qualifie: "Qualifié",
        acompte_recu: "Acompte reçu",
        conception: "Conception",
        devis_negociation: "Devis/Négociation",
        accepte: "Accepté",
        refuse: "Refusé",
        premier_depot: "1er Dépôt",
        projet_en_cours: "Projet en cours",
        chantier: "Chantier",
        facture_reglee: "Facture réglée",
        livraison_termine: "Livraison & Terminé",
        // Legacy
        nouveau: "Nouveau projet",
        acompte_verse: "Acompte versé",
        en_conception: "En conception",
        en_validation: "En validation",
        en_chantier: "En réalisation",
        livraison: "Livraison",
        termine: "Terminé",
        annule: "Annulé",
        suspendu: "Suspendu"
      }
      
      toast({
        title: "✅ Projet déplacé",
        description: `${draggedClient.nom} → ${statusLabels[targetStatus]}`
      })

    } catch (error) {
      console.error('[Kanban] ❌ Failed to update stage:', error)
      console.log(`[Kanban] 🔄 Rolling back: ${targetStatus} → ${originalStatus}`)
      
      // ROLLBACK: Revert to original status
      const rollbackClient: Client = {
        ...draggedClient,
        statutProjet: originalStatus,
        derniereMaj: draggedClient.derniereMaj,
        updatedAt: draggedClient.updatedAt,
      }
      
      onUpdateClient(rollbackClient)
      console.log(`[Kanban] ✅ Rollback complete - UI restored to: ${originalStatus}`)
      
      toast({
        title: "❌ Erreur",
        description: "Impossible de déplacer le projet. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusLabel = (status: ProjectStatus): string => {
    const statusLabels: Record<ProjectStatus, string> = {
      qualifie: "Qualifié",
      acompte_recu: "Acompte reçu",
      conception: "Conception",
      devis_negociation: "Devis/Négociation",
      accepte: "Accepté",
      refuse: "Refusé",
      premier_depot: "1er Dépôt",
      projet_en_cours: "Projet en cours",
      chantier: "Chantier",
      facture_reglee: "Facture réglée",
      livraison_termine: "Livraison & Terminé",
      // Legacy
      nouveau: "Nouveau projet",
      acompte_verse: "Acompte versé",
      en_conception: "En conception",
      en_validation: "En validation",
      en_chantier: "En réalisation",
      livraison: "Livraison",
      termine: "Terminé",
      annule: "Annulé",
      suspendu: "Suspendu"
    }
    return statusLabels[status] || status
  }

  return (
    <div className={cn(
      "relative h-full flex flex-col overflow-hidden kanban-container",
      scrollPosition === 'start' && "at-start",
      scrollPosition === 'end' && "at-end"
    )}>
      {/* Loading Overlay */}
      {isUpdating && (
        <div className="absolute top-4 right-4 z-50 glass rounded-lg px-4 py-2 border border-blue-500/30 flex items-center gap-2 shadow-lg">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-blue-300 font-medium">Mise à jour...</span>
        </div>
      )}
 
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Kanban Grid - 11 Columns Horizontal Scroll (contained) */}
        <div 
          className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 pr-2 kanban-scroll"
          onScroll={handleScroll}
        >
          {columns.map(column => (
            <ClientKanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              clients={getClientsByStatus(column.status)}
              color={column.color}
              gradient={column.gradient}
              onClientClick={onClientClick}
              newlyAddedClientId={newlyAddedClientId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeClient ? (
            <div className="rotate-3 scale-105">
              <ClientKanbanCard
                client={activeClient}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
