"use client"

import { KanbanColumn } from "@/components/kanban-column"
import type { Lead, LeadStatus, LeadPriority } from "@/types/lead"
import { useState, useEffect } from "react"
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
  closestCenter,
  rectIntersection,
  pointerWithin,
} from "@dnd-kit/core"
import { LeadCard } from "@/components/lead-card"
import { LeadModalRedesigned as LeadModal } from "@/components/lead-modal-redesigned"
import { LeadsTable } from "@/components/leads-table"
import { LeadNotesPanel } from "@/components/lead-notes-panel"
import { Phone, MapPin, Filter, ChevronDown, X, RotateCcw } from "lucide-react"
import { useState as useAccordionState } from "react"
import { cn } from "@/lib/utils"
import { LeadsService } from "@/lib/leads-service"
import { useEnhancedInfiniteScroll } from "@/hooks/useEnhancedInfiniteScroll"
import { Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Dummy data - not used anymore, fetching from database instead
const initialLeads: any[] = [
  // 🏪 MAGASIN LEADS (Priorité Haute)
  {
    id: "1",
    nom: "Dr. Fatima Zahra Alami",
    telephone: "212 661-234567",
    ville: "Casablanca",
    typeBien: "Villa",
    statut: "nouveau",
    statutDetaille: "Visite showroom prévue jeudi 16h - très intéressée par nos services premium",
    assignePar: "TAZI",
    derniereMaj: "2025-01-15",
    source: "magasin",
    priorite: "haute",
  },
  {
    id: "2",
    nom: "Omar Benjelloun",
    telephone: "212 662-345678",
    ville: "Rabat",
    typeBien: "Appartement",
    statut: "en_cours",
    statutDetaille: "Négociation avancée - intéressé par appartement 3 chambres avec terrasse",
    assignePar: "TAZI",
    derniereMaj: "2025-01-14",
    source: "magasin",
    priorite: "haute",
  },
  {
    id: "3",
    nom: "Aicha Tazi",
    telephone: "212 663-456789",
    ville: "Marrakech",
    typeBien: "Riad",
    statut: "a_recontacter",
    statutDetaille: "À rappeler après 15h - hésite entre riad traditionnel et moderne",
    assignePar: "AZI",
    derniereMaj: "2025-01-13",
    source: "magasin",
    priorite: "haute",
  },
  {
    id: "4",
    nom: "Mohammed El Mansouri",
    telephone: "212 664-567890",
    ville: "Casablanca",
    typeBien: "Bureau",
    statut: "signe",
    statutDetaille: "Contrat signé - projet commercial en cours de réalisation",
    assignePar: "TAZI",
    derniereMaj: "2025-01-08",
    source: "magasin",
    priorite: "haute",
  },

  // 👥 RECOMMANDATION LEADS (Priorité Haute)
  {
    id: "5",
    nom: "Youssef El Fassi",
    telephone: "212 665-678901",
    ville: "Casablanca",
    typeBien: "Villa",
    statut: "en_cours",
    statutDetaille: "Recommandé par client satisfait - très intéressé par villa avec jardin",
    assignePar: "TAZI",
    derniereMaj: "2025-01-15",
    source: "recommandation",
    priorite: "haute",
  },
  {
    id: "6",
    nom: "Khadija Bennani",
    telephone: "212 666-789012",
    ville: "Fès",
    typeBien: "Appartement",
    statut: "nouveau",
    statutDetaille: "Recommandation d'un ami - budget confirmé, recherche appartement familial",
    assignePar: "AZI",
    derniereMaj: "2025-01-14",
    source: "recommandation",
    priorite: "haute",
  },
  {
    id: "7",
    nom: "Hassan Alaoui",
    telephone: "212 667-890123",
    ville: "Tanger",
    typeBien: "Bureau",
    statut: "signe",
    statutDetaille: "Projet terminé avec succès - client très satisfait",
    assignePar: "TAZI",
    derniereMaj: "2025-01-10",
    source: "recommandation",
    priorite: "haute",
  },
  {
    id: "8",
    nom: "Amina Chraibi",
    telephone: "212 668-901234",
    ville: "Rabat",
    typeBien: "Appartement",
    statut: "en_cours",
    statutDetaille: "Négociation finale - signature prévue cette semaine",
    assignePar: "AZI",
    derniereMaj: "2025-01-14",
    source: "recommandation",
    priorite: "haute",
  },

  // 🌐 SITE WEB LEADS (Priorité Moyenne)
  {
    id: "9",
    nom: "Nadia El Mansouri",
    telephone: "212 669-012345",
    ville: "Casablanca",
    typeBien: "Appartement",
    statut: "nouveau",
    statutDetaille: "Formulaire de contact rempli sur le site - demande de devis",
    assignePar: "TAZI",
    derniereMaj: "2025-01-15",
    source: "site_web",
    priorite: "moyenne",
  },
  {
    id: "10",
    nom: "Mehdi Chraibi",
    telephone: "212 670-123456",
    ville: "Rabat",
    typeBien: "Villa",
    statut: "a_recontacter",
    statutDetaille: "Demande de devis via site web - à rappeler demain matin",
    assignePar: "AZI",
    derniereMaj: "2025-01-14",
    source: "site_web",
    priorite: "moyenne",
  },
  {
    id: "11",
    nom: "Laila Benkirane",
    telephone: "212 671-234567",
    ville: "Marrakech",
    typeBien: "Appartement",
    statut: "en_cours",
    statutDetaille: "Intéressée par nos services - en négociation sur le prix",
    assignePar: "TAZI",
    derniereMaj: "2025-01-13",
    source: "site_web",
    priorite: "moyenne",
  },
  {
    id: "12",
    nom: "Rachid Idrissi",
    telephone: "212 672-345678",
    ville: "Agadir",
    typeBien: "Villa",
    statut: "perdu",
    statutDetaille: "Pas de réponse après 3 tentatives - semble peu sérieux",
    assignePar: "AZI",
    derniereMaj: "2025-01-12",
    source: "site_web",
    priorite: "moyenne",
  },
  {
    id: "13",
    nom: "Karim Alaoui",
    telephone: "212 673-456789",
    ville: "Marrakech",
    typeBien: "Riad",
    statut: "a_recontacter",
    statutDetaille: "Intéressé mais hésite sur le prix - à rappeler la semaine prochaine",
    assignePar: "TAZI",
    derniereMaj: "2025-01-13",
    source: "site_web",
    priorite: "moyenne",
  },

  // 📱 RÉSEAUX SOCIAUX LEADS (Priorité Basse)
  {
    id: "14",
    nom: "Sara Amrani",
    telephone: "212 674-567890",
    ville: "Casablanca",
    typeBien: "Studio",
    statut: "nouveau",
    statutDetaille: "Contact via Instagram - jeune couple, budget limité",
    assignePar: "TAZI",
    derniereMaj: "2025-01-15",
    source: "reseaux_sociaux",
    priorite: "basse",
  },
  {
    id: "15",
    nom: "Yassine Belhaj",
    telephone: "212 675-678901",
    ville: "Rabat",
    typeBien: "Appartement",
    statut: "a_recontacter",
    statutDetaille: "Contact via Facebook - étudiant, budget très limité",
    assignePar: "AZI",
    derniereMaj: "2025-01-14",
    source: "reseaux_sociaux",
    priorite: "basse",
  },
  {
    id: "16",
    nom: "Imane Tazi",
    telephone: "212 676-789012",
    ville: "Fès",
    typeBien: "Appartement",
    statut: "nouveau",
    statutDetaille: "Message via LinkedIn - professionnelle, recherche investissement",
    assignePar: "TAZI",
    derniereMaj: "2025-01-13",
    source: "reseaux_sociaux",
    priorite: "basse",
  },
  {
    id: "17",
    nom: "Anas El Fassi",
    telephone: "212 677-890123",
    ville: "Tanger",
    typeBien: "Villa",
    statut: "perdu",
    statutDetaille: "Contact via TikTok - semble peu sérieux, pas de suivi",
    assignePar: "AZI",
    derniereMaj: "2025-01-12",
    source: "reseaux_sociaux",
    priorite: "basse",
  },
  {
    id: "18",
    nom: "Fatima Zahra Bennani",
    telephone: "212 678-901234",
    ville: "Fès",
    typeBien: "Villa",
    statut: "nouveau",
    statutDetaille: "Nouveau contact via WhatsApp - à contacter cette semaine",
    assignePar: "AZI",
    derniereMaj: "2025-01-15",
    source: "reseaux_sociaux",
    priorite: "basse",
  },
  {
    id: "19",
    nom: "Youssef Belhaj",
    telephone: "212 679-012345",
    ville: "Casablanca",
    typeBien: "Appartement",
    statut: "a_recontacter",
    statutDetaille: "Contact via Instagram - jeune professionnel, hésite encore",
    assignePar: "TAZI",
    derniereMaj: "2025-01-14",
    source: "reseaux_sociaux",
    priorite: "basse",
  },
]

const columns: { status: LeadStatus; label: string; color: string }[] = [
  { status: "nouveau", label: "Nouveau", color: "success" },
  { status: "a_recontacter", label: "À recontacter", color: "warning" },
  { status: "sans_reponse", label: "Sans réponse", color: "primary" },
  { status: "non_interesse", label: "Non intéressé", color: "destructive" },
  { status: "converti", label: "Converti", color: "premium" },
]

interface KanbanBoardProps {
  onCreateLead?: () => void
  searchQuery?: string
}

export function KanbanBoard({ onCreateLead, searchQuery = "" }: KanbanBoardProps) {
  const { toast } = useToast()
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [historyLead, setHistoryLead] = useState<Lead | null>(null)
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: "all" as "all" | LeadStatus,
    city: "all" as string,
    type: "all" as string,
    assigned: "all" as string,
    priority: "all" as "all" | LeadPriority,
  })
  const [isFiltersOpen, setIsFiltersOpen] = useAccordionState(false)
  // Single view mode only: table
  const [newlyAddedLeadId, setNewlyAddedLeadId] = useState<string | null>(null)
  const [architectAssignees, setArchitectAssignees] = useState<string[]>([])

  // Use infinite scroll hook with eager loading
  // Note: No filter dependencies - we do client-side filtering
  const {
    data: leads,
    loading: isLoading,
    isLoadingMore,
    hasMore,
    error: fetchError,
    totalCount,
    currentPage,
    addItem: addLead,
    updateItem: updateLead,
    removeItem: removeLead
  } = useEnhancedInfiniteScroll<Lead>(
    (params) => LeadsService.getLeads(params),
    {},
    100, // Page size - fetch 100 items at a time for faster loading
    [], // No dependencies - prevents unwanted resets
    true, // Enabled
    true  // Eager load
  )

  const error = fetchError

  // Use leads directly from the hook instead of maintaining separate local state
  // This prevents sync issues where local changes get overwritten

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  )

  // Custom collision detection that prioritizes droppable containers
  const customCollisionDetection = (args: any) => {
    // First, try to find intersecting droppable containers
    const pointerCollisions = pointerWithin(args)
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    
    // Fall back to rectangle intersection
    const rectCollisions = rectIntersection(args)
    
    if (rectCollisions.length > 0) {
      return rectCollisions
    }
    
    // Finally, use closest center as last resort
    return closestCenter(args)
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()

  // Load architect users (assignees) for filter options
  useEffect(() => {
    const loadArchitects = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const users = (await res.json()) as any[]
          const architects: string[] = users
            .filter((u: any) => (u.role || '').toLowerCase() === 'architect')
            .map((u: any) => (u.name || '').trim())
            .filter((n: string) => n)
          const unique: string[] = Array.from(new Set(architects)) as string[]
          setArchitectAssignees(unique.length > 0 ? unique : ['TAZI'])
        } else {
          setArchitectAssignees(['TAZI'])
        }
      } catch {
        setArchitectAssignees(['TAZI'])
      }
    }
    loadArchitects()
  }, [])

  const passesSearch = (lead: Lead) => {
    if (!normalizedQuery) return true
    const haystack = [
      lead.nom,
      lead.telephone,
      lead.ville,
      lead.typeBien,
      lead.assignePar,
      lead.statutDetaille ?? "",
      lead.message ?? "",
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  }

  const passesFilters = (lead: Lead) => {
    if (filters.status !== "all" && lead.statut !== filters.status) return false
    if (filters.city !== "all" && lead.ville !== filters.city) return false
    if (filters.type !== "all" && lead.typeBien !== filters.type) return false
    if (filters.assigned !== "all" && lead.assignePar !== filters.assigned) return false
    if (filters.priority !== "all" && lead.priorite !== filters.priority) return false
    return true
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.status !== "all") count++
    if (filters.city !== "all") count++
    if (filters.type !== "all") count++
    if (filters.assigned !== "all") count++
    if (filters.priority !== "all") count++
    return count
  }

  const clearAllFilters = () => {
    setFilters({
      status: "all",
      city: "all",
      type: "all",
      assigned: "all",
      priority: "all",
    })
  }

  const removeFilter = (filterType: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: "all"
    }))
  }

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead: Lead) => lead.statut === status && passesSearch(lead) && passesFilters(lead))
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const lead = leads.find((l: Lead) => l.id === active.id)
    if (lead) {
      setActiveLead(lead)
    }
  }

  const handleDragCancel = () => {
    setActiveLead(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('[Drag] Drag ended', { activeId: active.id, overId: over?.id })
    
    if (!over) {
      console.log('[Drag] No drop target detected')
      setActiveLead(null)
      return
    }

    const draggedId = String(active.id)
    const draggedLead = leads.find((l: Lead) => l.id === draggedId)

    if (!draggedLead) {
      console.log('[Drag] Dragged lead not found:', draggedId)
      setActiveLead(null)
      return
    }

    // Determine the target status from the droppable column
    const overId = String(over.id)
    const possibleStatuses: LeadStatus[] = [
      "nouveau",
      "a_recontacter",
      "sans_reponse",
      "non_interesse",
      "converti",
    ]

    let targetStatus: LeadStatus | null = null

    // Check if dropped directly on a column
    if (possibleStatuses.includes(overId as LeadStatus)) {
      targetStatus = overId as LeadStatus
      console.log('[Drag] Dropped on column:', targetStatus)
    }

    if (!targetStatus) {
      console.log('[Drag] Could not determine target status from:', overId)
      setActiveLead(null)
      return
    }

    // Don't update if dropped in the same column
    if (draggedLead.statut === targetStatus) {
      console.log('[Drag] Dropped in same column, no update needed')
      setActiveLead(null)
      return
    }

    console.log('[Drag] Moving lead from', draggedLead.statut, 'to', targetStatus)

    // Optimistic update - update UI immediately
    const previousStatus = draggedLead.statut
    updateLead(draggedId, {
      statut: targetStatus,
      derniereMaj: new Date().toISOString()
    })
    setActiveLead(null)

    try {
      // Update in database
      await LeadsService.updateLead(draggedId, {
        statut: targetStatus,
        derniereMaj: new Date().toISOString()
      })

      // Show success toast
      const statusLabels: Record<LeadStatus, string> = {
        nouveau: "Nouveau",
        a_recontacter: "À recontacter",
        sans_reponse: "Sans réponse",
        non_interesse: "Non intéressé",
        converti: "Converti",
      }
      
      toast({
        title: "Lead déplacé",
        description: `${draggedLead.nom} a été déplacé vers ${statusLabels[targetStatus]}`
      })
      
      console.log('[Drag] Successfully updated lead status in database')
    } catch (error) {
      console.error("[Drag] Error updating lead status:", error)
      
      // Revert optimistic update on error
      updateLead(draggedId, {
        statut: previousStatus,
        derniereMaj: new Date().toISOString()
      })
      
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du statut. Veuillez réessayer.",
        variant: "destructive"
      })
    }
  }

  const handleLeadClick = (lead: Lead) => {
    setEditingLead(lead)
    setIsModalOpen(true)
  }

  const handleCreateLead = () => {
    setEditingLead(null)
    setIsModalOpen(true)
  }

  useEffect(() => {
    if (onCreateLead) {
      ;(window as any).__signature8CreateLead = handleCreateLead
    }
  }, [onCreateLead])

  // Cleanup activeLead on unmount or when leads change
  useEffect(() => {
    return () => {
      setActiveLead(null)
    }
  }, [leads])

  const handleSaveLead = async (leadData: Omit<Lead, "id"> & { id?: string }) => {
    try {
      if (leadData.id) {
        // Update existing lead
        console.log('[KanbanBoard] Updating lead with data:', leadData)
        const updatedLead = await LeadsService.updateLead(leadData.id, leadData)
        console.log('[KanbanBoard] Lead updated from API:', updatedLead)
        
        // Update in the list immediately with fresh data from API
        updateLead(leadData.id, updatedLead)
        console.log('[KanbanBoard] Lead updated in list')
        
        // Update editingLead so modal shows fresh data if reopened
        setEditingLead(updatedLead)
        
        // Show success toast
        toast({
          title: "✅ Lead mis à jour",
          description: "Les modifications ont été enregistrées avec succès",
        })
        
        // Close modal
        setIsModalOpen(false)
        setEditingLead(null)
      } else {
        // Create new lead
        console.log('[KanbanBoard] Creating lead:', leadData)
        const createdLead = await LeadsService.createLead(leadData)
        console.log('[KanbanBoard] Lead created from API:', createdLead)
        
        // Add to the list immediately
        console.log('[KanbanBoard] Adding lead to list...')
        addLead(createdLead)
        console.log('[KanbanBoard] Lead added to list')
        
        // Highlight the newly added lead
        setNewlyAddedLeadId(createdLead.id)
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setNewlyAddedLeadId(null)
        }, 3000)
        
        // Show success toast
        toast({
          title: "✅ Lead créé",
          description: "Le nouveau lead a été créé avec succès",
        })
        
        // Close modal after successful creation
        setEditingLead(null)
        setIsModalOpen(false)
      }
    } catch (error) {
      console.error("[KanbanBoard] Error saving lead:", error)
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Échec de l'enregistrement du lead. Veuillez réessayer.",
        variant: "destructive"
      })
      // Re-throw so modal can handle the error state
      throw error
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    try {
      console.log(`[Delete Lead] Deleting lead ${leadId}`)
      
      // Delete from database
      await LeadsService.deleteLead(leadId)
      
      // Also remove associated client from localStorage
      const storedClients = localStorage.getItem('signature8-clients')
      if (storedClients) {
        const clients = JSON.parse(storedClients)
        const filteredClients = clients.filter((client: any) => client.leadId !== leadId)
        
        if (filteredClients.length < clients.length) {
          localStorage.setItem('signature8-clients', JSON.stringify(filteredClients))
          console.log(`[Delete Lead] Associated client removed from localStorage`)
        }
      }
      
      // Remove from list immediately
      removeLead(leadId)
      
      setIsModalOpen(false)
      
      toast({
        title: "✅ Lead supprimé",
        description: "Le lead et son client associé ont été supprimés avec succès",
      })
    } catch (error) {
      console.error("Error deleting lead:", error)
      toast({
        title: "❌ Erreur",
        description: "Échec de la suppression du lead. Veuillez réessayer.",
        variant: "destructive"
      })
    }
  }

  const handleConvertToClient = async (lead: Lead) => {
    console.log('🔄 [Conversion] Starting conversion for lead:', lead.id, lead.nom)
    
    // 🚀 OPTIMISTIC UPDATE - Update UI immediately
    const optimisticLead = {
      ...lead,
      statut: 'converti' as const,
      derniereMaj: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    // Create optimistic client
    const now = new Date().toISOString()
    const optimisticClient = {
      id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nom: lead.nom,
      telephone: lead.telephone,
      email: lead.email || '',
      ville: lead.ville,
      typeProjet: lead.typeBien,
      statutProjet: 'prospection' as const,
      architecte: lead.assignePar,
      budget: '',
      surface: '',
      adresse: '',
      notes: lead.message || '',
      createdAt: lead.createdAt || now,
      updatedAt: now,
      derniereMaj: now,
      leadId: lead.id,
    }
    
    // Update UI immediately (optimistic)
    console.log('⚡ [Conversion] Optimistic update - changing status immediately')
    updateLead(lead.id, optimisticLead)
    
    // Add client to localStorage immediately
    console.log('⚡ [Conversion] Optimistic update - adding client immediately')
    const existingClients = localStorage.getItem('signature8-clients')
    const clients = existingClients ? JSON.parse(existingClients) : []
    clients.unshift(optimisticClient)
    localStorage.setItem('signature8-clients', JSON.stringify(clients))
    
    // Close modal immediately
    setIsModalOpen(false)
    
    // Show success immediately
    toast({
      title: "✅ Lead converti",
      description: "Le lead a été converti en client avec succès. Visible immédiatement dans Clients & Projets.",
    })
    
    // Call API in background to persist
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.warn('⚠️ [Conversion] No auth token - skipping API sync (optimistic update already applied)')
        // Optimistic update already succeeded, just skip API sync
        return
      }
      
      console.log('📡 [Conversion] Calling API in background...')
      const response = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 [Conversion] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [Conversion] API error:', errorData)
        
        // Revert optimistic update on error
        console.log('🔄 [Conversion] Reverting optimistic update')
        updateLead(lead.id, lead)
        
        // Remove client from localStorage
        const currentClients = JSON.parse(localStorage.getItem('signature8-clients') || '[]')
        const filteredClients = currentClients.filter((c: any) => c.id !== optimisticClient.id)
        localStorage.setItem('signature8-clients', JSON.stringify(filteredClients))
        
        throw new Error(errorData.error || 'Failed to convert lead')
      }

      const data = await response.json()
      console.log('✅ [Conversion] API confirmed:', data)
      
      // Update with real data from server
      if (data.lead) {
        updateLead(data.lead.id, data.lead)
      }
      
      // Update client with real data if different
      if (data.client && data.client.id !== optimisticClient.id) {
        const currentClients = JSON.parse(localStorage.getItem('signature8-clients') || '[]')
        const updatedClients = currentClients.map((c: any) => 
          c.id === optimisticClient.id ? data.client : c
        )
        localStorage.setItem('signature8-clients', JSON.stringify(updatedClients))
      }
      
      console.log('✅ [Conversion] Conversion complete and confirmed!')
    } catch (error) {
      console.error("❌ [Conversion] Error:", error)
      // Don't show error toast if optimistic update already succeeded
      // The user already sees the success, no need to confuse them
      console.warn('⚠️ [Conversion] Background sync failed, but optimistic update succeeded')
    }
  }

  const handleMarkAsNotInterested = async (lead: Lead) => {
    console.log('🚫 [Not Interested] Starting for lead:', lead.id, lead.nom)
    
    try {
      // Call mark not interested API
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      console.log('📡 [Not Interested] Calling API...')
      const response = await fetch(`/api/leads/${lead.id}/mark-not-interested`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 [Not Interested] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [Not Interested] API error:', errorData)
        throw new Error(errorData.error || 'Failed to mark lead as not interested')
      }

      const data = await response.json()
      console.log('✅ [Not Interested] API response:', data)
      
      // Update lead status in local state
      if (data.lead) {
        console.log('🔄 [Not Interested] Updating lead status to:', data.lead.statut)
        updateLead(data.lead.id, data.lead)
        console.log('✅ [Not Interested] Lead updated in local state')
      } else {
        console.warn('⚠️ [Not Interested] No lead data in response')
      }

      setIsModalOpen(false)
      console.log('✅ [Not Interested] Modal closed')
      
      toast({
        title: "🔴 Lead marqué",
        description: "Le lead a été marqué comme non intéressé",
      })
      console.log('✅ [Not Interested] Update complete!')
    } catch (error) {
      console.error("❌ [Not Interested] Error:", error)
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Échec de la mise à jour du lead. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="h-full">
          <div className="mb-3">
            {/* Error Message */}
            {error && (
              <div className="mb-3 p-3 bg-red-500/20 border border-red-500/40 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Filter Accordion with View Toggle */}
            <div className="glass rounded-lg border border-slate-600/30">
              {/* Filter Header with View Toggle */}
              <div className="flex items-center justify-between p-4 gap-4">
                {/* Left: Filter Section */}
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                  <Filter className="w-5 h-5 text-primary" />
                  <span className="font-medium text-white">Filtres</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs font-medium">
                      {getActiveFiltersCount()} actif{getActiveFiltersCount() > 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-white transition-transform ml-auto",
                    isFiltersOpen && "rotate-180"
                  )} />
                </div>

                {/* Right: Clear Filters */}
                <div className="flex items-center gap-3">

                  {getActiveFiltersCount() > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearAllFilters()
                      }}
                      className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Effacer filtres
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Chips */}
              {getActiveFiltersCount() > 0 && (
                <div className="border-t border-slate-600/30 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {filters.status !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Statut: {columns.find(c => c.status === filters.status)?.label}
                        <button onClick={() => removeFilter('status')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filters.city !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Ville: {filters.city}
                        <button onClick={() => removeFilter('city')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filters.type !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Type: {filters.type}
                        <button onClick={() => removeFilter('type')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filters.assigned !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Assigné: {filters.assigned}
                        <button onClick={() => removeFilter('assigned')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filters.priority !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Priorité: {filters.priority === 'haute' ? 'Haute' : filters.priority === 'moyenne' ? 'Moyenne' : 'Basse'}
                        <button onClick={() => removeFilter('priority')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Content */}
              {isFiltersOpen && (
                <div className="border-t border-slate-600/30 p-4 bg-slate-800/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div className="space-y-2 bg-slate-800/60 rounded-md p-3 border border-slate-600/40">
                      <label className="text-sm font-medium text-white">Statut</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les statuts</option>
                        {columns.map((c) => (
                          <option key={c.status} value={c.status}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* City Filter */}
                    <div className="space-y-2 bg-slate-800/60 rounded-md p-3 border border-slate-600/40">
                      <label className="text-sm font-medium text-white">Ville</label>
                      <select
                        value={filters.city}
                        onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Toutes les villes</option>
                        {[...new Set(leads.map((l) => l.ville))].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="space-y-2 bg-slate-800/60 rounded-md p-3 border border-slate-600/40">
                      <label className="text-sm font-medium text-white">Type de bien</label>
                      <select
                        value={filters.type}
                        onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les types</option>
                        {[...new Set(leads.map((l) => l.typeBien))].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assigned Filter */}
                    <div className="space-y-2 bg-slate-800/60 rounded-md p-3 border border-slate-600/40">
                      <label className="text-sm font-medium text-white">Assigné par</label>
                      <select
                        value={filters.assigned}
                        onChange={(e) => setFilters((f) => ({ ...f, assigned: e.target.value }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les assignés</option>
                        {architectAssignees.map((name) => (
                          <option key={name} value={name}>
                            {name.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority Filter */}
                    <div className="space-y-2 bg-slate-800/60 rounded-md p-3 border border-slate-600/40">
                      <label className="text-sm font-medium text-white">Priorité</label>
                      <select
                        value={filters.priority}
                        onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as any }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Toutes les priorités</option>
                        <option value="haute">Priorité Haute</option>
                        <option value="moyenne">Priorité Moyenne</option>
                        <option value="basse">Priorité Basse</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table View Only */}
          <LeadsTable
            leads={leads}
            onLeadClick={handleLeadClick}
            onDeleteLead={handleDeleteLead}
            onViewHistory={(lead) => {
              setHistoryLead(lead)
              setIsHistoryPanelOpen(true)
            }}
            searchQuery={searchQuery}
            filters={filters}
            isLoading={isLoading}
            newlyAddedLeadId={newlyAddedLeadId}
          />

          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <div 
                className="rotate-3 scale-110 shadow-2xl border-2 border-primary/80 bg-slate-800 backdrop-blur-md rounded-lg p-1 cursor-grabbing"
                style={{ 
                  opacity: 1,
                  pointerEvents: 'none',
                  zIndex: 9999
                }}
              >
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 border border-primary/30">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-white">{activeLead.nom}</h4>
                    <span className="text-xs text-slate-300 bg-slate-600/50 px-2 py-1 rounded">{activeLead.typeBien}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs">{activeLead.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs">{activeLead.ville}</span>
                    </div>
                    {activeLead.message && (
                      <div className="mt-1 text-[11px] leading-snug text-amber-200/90">
                        <span className="inline-block border-l-2 border-amber-400/60 pl-2">
                          {activeLead.message}
                        </span>
                      </div>
                    )}
                    {activeLead.statutDetaille && (
                      <div className="mt-1 text-[11px] leading-snug text-slate-300/90">
                        <span className="inline-block border-l-2 border-blue-400/50 pl-2">
                          {activeLead.statutDetaille}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>

      <LeadModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        lead={editingLead || undefined}
        onSave={handleSaveLead}
        onDelete={editingLead ? () => handleDeleteLead(editingLead.id) : undefined}
        onConvertToClient={handleConvertToClient}
        onMarkAsNotInterested={handleMarkAsNotInterested}
      />

      <LeadNotesPanel
        open={isHistoryPanelOpen}
        onOpenChange={setIsHistoryPanelOpen}
        lead={historyLead}
        onAddNote={async (leadId: string, noteContent: string) => {
          try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/leads/${leadId}/notes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ content: noteContent }),
            })

            if (!response.ok) {
              throw new Error('Failed to add note')
            }

            const newNote = await response.json()
            
            // Fetch the updated lead with all notes
            const leadResponse = await fetch(`/api/leads/${leadId}`)
            const updatedLead = await leadResponse.json()
            
            // Update the lead in the list
            updateLead(leadId, updatedLead)
            
            // Update the history panel lead
            setHistoryLead(updatedLead)
            
            toast({
              title: "✅ Note ajoutée",
              description: "La note a été ajoutée avec succès",
            })
          } catch (error) {
            console.error('Error adding note:', error)
            toast({
              title: "❌ Erreur",
              description: "Échec de l'ajout de la note. Veuillez réessayer.",
              variant: "destructive"
            })
            throw error
          }
        }}
      />
    </>
  )
}
