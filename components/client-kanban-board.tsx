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
import { Loader2 } from "lucide-react"

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

const columns: { 
  status: ProjectStatus
  label: string
  color: string
}[] = [
  { 
    status: "nouveau", 
    label: "Nouveau projet", 
    color: "success"
  },
  { 
    status: "en_conception", 
    label: "En conception", 
    color: "primary"
  },
  { 
    status: "en_validation", 
    label: "En validation", 
    color: "warning"
  },
  { 
    status: "en_chantier", 
    label: "En réalisation", 
    color: "premium"
  },
  { 
    status: "termine", 
    label: "Terminé", 
    color: "success"
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
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [newlyAddedClientId, setNewlyAddedClientId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
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

  const getClientsByStatus = (status: ProjectStatus) => {
    // Map all 9 statuses to the 5 Kanban columns
    const statusMapping: Record<ProjectStatus, ProjectStatus> = {
      // Column 1: Nouveau projet
      nouveau: "nouveau",
      acompte_verse: "nouveau", // Client paid deposit, still in early stage
      
      // Column 2: En conception
      en_conception: "en_conception",
      
      // Column 3: En validation
      en_validation: "en_validation",
      
      // Column 4: En réalisation (chantier)
      en_chantier: "en_chantier",
      livraison: "en_chantier", // Delivery phase is part of construction
      
      // Column 5: Terminé
      termine: "termine",
      annule: "termine", // Show cancelled projects in final column
      suspendu: "termine", // Show suspended projects in final column
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
      "nouveau",
      "en_conception",
      "en_validation",
      "en_chantier",
      "termine",
      "annule",
      "suspendu",
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

    setIsUpdating(true)

    // Optimistic update
    const now = new Date().toISOString()
    const updatedClient: Client = {
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
          auteur: "Système"
        }
      ]
    }

    onUpdateClient(updatedClient)
    setActiveClient(null)

    // Show success toast
    const statusLabels: Record<ProjectStatus, string> = {
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

    setIsUpdating(false)
  }

  const getStatusLabel = (status: ProjectStatus): string => {
    const statusLabels: Record<ProjectStatus, string> = {
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
    <div className="relative h-full flex flex-col">
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
        {/* Kanban Grid - Match Leads Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {columns.map(column => (
            <ClientKanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              clients={getClientsByStatus(column.status)}
              color={column.color}
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
