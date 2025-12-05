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
import { toast } from 'sonner'
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
      status: "prise_de_besoin",
      label: "Prise de besoin",
      color: "sky",
      gradient: "from-sky-400 to-sky-500"
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
  const { user } = useAuth()
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [newlyAddedClientId, setNewlyAddedClientId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [scrollPosition, setScrollPosition] = useState<'start' | 'middle' | 'end'>('start')
  const scrollContainerRef = useState<HTMLDivElement | null>(null)[0]

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Require 10px movement to start drag (more intentional)
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Longer delay for touch to prevent accidental drags
        tolerance: 10,
      },
    })
  )

  // Enhanced collision detection for better drop target recognition
  const customCollisionDetection = (args: any) => {
    // First, try pointer-based collision (most accurate)
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }

    // Then try rectangle intersection
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) {
      return rectCollisions
    }

    // Finally, use closest center as fallback
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
      prise_de_besoin: "prise_de_besoin",
      acompte_recu: "acompte_recu",
      conception: "conception",
      devis_negociation: "devis_negociation",
      accepte: "accepte",
      refuse: "refuse",
      premier_depot: "premier_depot",
      projet_en_cours: "projet_en_cours",
      chantier: "projet_en_cours",
      facture_reglee: "facture_reglee",
      livraison_termine: "livraison_termine",
      perdu: "refuse",

      // Legacy status mapping for backward compatibility
      nouveau: "qualifie",
      acompte_verse: "acompte_recu",
      en_conception: "conception",
      en_validation: "devis_negociation",
      en_chantier: "projet_en_cours",
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

    console.log('[Kanban] 🎯 Drag ended', { activeId: active.id, overId: over?.id })

    // Clear active client immediately
    setActiveClient(null)

    if (!over) {
      console.log('[Kanban] ⚠️ No drop target detected')
      return
    }

    const draggedId = String(active.id)
    const draggedClient = clients.find(c => c.id === draggedId)

    if (!draggedClient) {
      console.log('[Kanban] ⚠️ Dragged client not found:', draggedId)
      return
    }

    // Determine target status from drop zone
    const overId = String(over.id)
    const possibleStatuses: ProjectStatus[] = [
      "qualifie",
      "prise_de_besoin",
      "acompte_recu",
      "conception",
      "devis_negociation",
      "accepte",
      "refuse",
      "premier_depot",
      "projet_en_cours",
      "facture_reglee",
      "livraison_termine",
    ]

    let targetStatus: ProjectStatus | null = null

    // Check if dropped directly on a column
    if (possibleStatuses.includes(overId as ProjectStatus)) {
      targetStatus = overId as ProjectStatus
    }

    if (!targetStatus) {
      console.log('[Kanban] ⚠️ Could not determine target status from:', overId)
      return
    }

    // Don't update if dropped in same column
    if (draggedClient.statutProjet === targetStatus) {
      console.log('[Kanban] ℹ️ Dropped in same column, no update needed')
      return
    }

    // Store original state for rollback
    const originalStatus = draggedClient.statutProjet
    const originalClient = { ...draggedClient }
    const now = new Date().toISOString()

    console.log(`[Kanban] 🎯 Moving: ${draggedClient.nom}`)
    console.log(`[Kanban] 📍 ${originalStatus} → ${targetStatus}`)

    // Show loading indicator
    setIsUpdating(true)

    // Create optimistic update
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

    console.log(`[Kanban] ⚡ Applying optimistic update`)

    // Apply optimistic update to UI
    onUpdateClient(optimisticClient)

    // Update database - handle opportunity-based clients differently
    try {
      // For opportunity-based clients, we can't update via drag-and-drop
      // They should be updated from the contact details page
      if (draggedClient.isContact && draggedClient.opportunityId) {
        console.log('[Kanban] ⚠️ Cannot drag opportunity-based clients. Please update from contact details.')
        // Revert optimistic update
        onUpdateClient(originalClient)
        setIsUpdating(false)
        toast.error('Veuillez mettre à jour cette opportunité depuis la page contact')
        return
      }

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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update stage`)
      }

      const result = await response.json()
      console.log(`[Kanban] ✅ Database updated successfully`)
      console.log(`[Kanban] 📊 Result:`, result)

      // Check if devis were synced
      if (result.devisSynced && result.devisUpdatedCount > 0) {
        console.log(`[Kanban] 📋 ${result.devisUpdatedCount} devis auto-synced to match project status`)
      }

      // Show success toast
      const statusLabels: Record<ProjectStatus, string> = {
        qualifie: "Qualifié",
        prise_de_besoin: "Prise de besoin",
        acompte_recu: "Acompte reçu",
        conception: "Conception",
        devis_negociation: "Devis/Négociation",
        accepte: "Accepté",
        refuse: "Refusé",
        premier_depot: "1er Dépôt",
        projet_en_cours: "Projet en cours",
        chantier: "Projet en cours",
        facture_reglee: "Facture réglée",
        livraison_termine: "Livraison & Terminé",
        perdu: "Perdu",
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

      // Enhanced toast with devis sync info
      const toastDescription = result.devisSynced && result.devisUpdatedCount > 0
        ? `${draggedClient.nom} → ${statusLabels[targetStatus]}\n📋 ${result.devisUpdatedCount} devis ${targetStatus === 'accepte' ? 'accepté(s)' : 'refusé(s)'} automatiquement`
        : `${draggedClient.nom} → ${statusLabels[targetStatus]}`

      toast.success("✅ Projet déplacé", {
        description: toastDescription,
        duration: result.devisSynced ? 5000 : 3000
      })

    } catch (error) {
      console.error('[Kanban] ❌ Failed to update stage:', error)
      console.log(`[Kanban] 🔄 Rolling back to original status: ${originalStatus}`)

      // ROLLBACK: Revert to original client state
      onUpdateClient(originalClient)
      console.log(`[Kanban] ✅ Rollback complete`)

      toast.error(error instanceof Error ? error.message : "Impossible de déplacer le projet. Veuillez réessayer.", {
        duration: 5000
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusLabel = (status: ProjectStatus): string => {
    const statusLabels: Record<ProjectStatus, string> = {
      qualifie: "Qualifié",
      prise_de_besoin: "Prise de besoin",
      acompte_recu: "Acompte reçu",
      conception: "Conception",
      devis_negociation: "Devis/Négociation",
      accepte: "Accepté",
      refuse: "Refusé",
      premier_depot: "1er Dépôt",
      projet_en_cours: "Projet en cours",
      chantier: "Projet en cours",
      facture_reglee: "Facture réglée",
      livraison_termine: "Livraison & Terminé",
      perdu: "Perdu",
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

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeClient ? (
            <div className="rotate-3 scale-110 opacity-95 shadow-2xl ring-2 ring-blue-500/50">
              <ClientKanbanCard
                client={activeClient}
                onClick={() => { }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
