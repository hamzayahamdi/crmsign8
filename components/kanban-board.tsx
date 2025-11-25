"use client"

import { KanbanColumn } from "@/components/kanban-column"
import type { Lead, LeadStatus, LeadPriority } from "@/types/lead"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { ArchitectSelectionDialog } from "@/components/architect-selection-dialog-improved"
import { Phone, MapPin, Filter, ChevronDown, X, RotateCcw } from "lucide-react"
import { useState as useAccordionState } from "react"
import { cn } from "@/lib/utils"
import { LeadsService } from "@/lib/leads-service"
import { useEnhancedInfiniteScroll } from "@/hooks/useEnhancedInfiniteScroll"
import { Loader2, AlertCircle } from "lucide-react"
import { toast } from 'sonner'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"

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
  const router = useRouter()
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [historyLead, setHistoryLead] = useState<Lead | null>(null)
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false)
  const [isArchitectModalOpen, setIsArchitectModalOpen] = useState(false)
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null)
  const [filters, setFilters] = useState({
    status: "all" as "all" | LeadStatus,
    city: "all" as string,
    type: "all" as string,
    assigned: "all" as string,
    priority: "all" as "all" | LeadPriority,
    source: "all" as string,
    campaign: "all" as string,
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
    if (filters.source !== "all" && lead.source !== filters.source) return false
    if (filters.campaign !== "all" && lead.campaignName !== filters.campaign) return false
    return true
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.status !== "all") count++
    if (filters.city !== "all") count++
    if (filters.type !== "all") count++
    if (filters.assigned !== "all") count++
    if (filters.priority !== "all") count++
    if (filters.source !== "all") count++
    if (filters.campaign !== "all") count++
    return count
  }

  const clearAllFilters = () => {
    setFilters({
      status: "all",
      city: "all",
      type: "all",
      assigned: "all",
      priority: "all",
      source: "all",
      campaign: "all",
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
        qualifie: "Qualifié",
        refuse: "Refusé",
      }
      
      toast.success("Lead déplacé", {
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
      
      toast.error("Échec de la mise à jour du statut. Veuillez réessayer.")
    }
  }

  // Handler for editing leads - always opens modal, never redirects
  const handleEditLead = async (lead: Lead) => {
    // Always open the edit modal, even for converted leads
    try {
      console.log('[KanbanBoard] 📝 Opening edit modal for lead:', lead.id)
      const token = localStorage.getItem('token')
      
      // Fetch the latest lead data to ensure we have all fields
      const leadResponse = await fetch(`/api/leads/${lead.id}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })
      
      if (leadResponse.ok) {
        const freshLeadData = await leadResponse.json()
        console.log('[KanbanBoard] ✅ Loaded fresh lead data:', freshLeadData)
        setEditingLead(freshLeadData)
        setIsModalOpen(true)
      } else {
        // If fetch fails, use the lead data we have
        console.warn('[KanbanBoard] ⚠️ Failed to fetch fresh lead data, using cached data')
        setEditingLead(lead)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('[KanbanBoard] ❌ Error fetching lead data:', error)
      // If error, use the lead data we have
      setEditingLead(lead)
      setIsModalOpen(true)
    }
  }

  const handleLeadClick = async (lead: Lead) => {
    // If lead is converted, redirect to the associated contact details page
    if (lead.statut === 'qualifie' || lead.convertedToContactId) {
      console.log('[KanbanBoard] 🔄 Lead is converted - fetching associated contact...')
      
      try {
        const token = localStorage.getItem('token')
        
        // If we have convertedToContactId, use it directly
        let contactId = lead.convertedToContactId
        
        // If not, try to fetch from the lead endpoint
        if (!contactId) {
          const leadResponse = await fetch(`/api/leads/${lead.id}`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
          })
          
          if (leadResponse.ok) {
            const leadData = await leadResponse.json()
            contactId = leadData.convertedToContactId
          }
        }
        
        if (contactId) {
          console.log('[KanbanBoard] ✅ Found associated contact:', contactId)
          
          // Redirect to contact details page using Next.js router (no refresh)
          router.push(`/contacts/${contactId}`)
          return
        } else {
          console.warn('[KanbanBoard] ⚠️ No contact found for converted lead:', lead.id)
          toast.error("⚠️ Contact introuvable - Ce lead a été converti mais le contact associé est introuvable.")
        }
      } catch (error) {
        console.error('[KanbanBoard] ❌ Error fetching contact:', error)
        toast.error("Impossible de charger le contact associé.")
      }
    } else {
      // For non-converted leads, open the modal
      handleEditLead(lead)
    }
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
        // Update existing lead (no automatic conversion based on status)
        console.log('[KanbanBoard] Updating lead with data:', leadData)
        const updatedLead = await LeadsService.updateLead(leadData.id, leadData)
        console.log('[KanbanBoard] Lead updated from API:', updatedLead)
        
        // Update in the list immediately with fresh data from API
        updateLead(leadData.id, updatedLead)
        console.log('[KanbanBoard] Lead updated in list')
        
        // Update editingLead so modal shows fresh data if reopened
        setEditingLead(updatedLead)

        // Normal update - show success toast and close modal (conversion is handled only via explicit action)
        toast.success("✅ Lead mis à jour", {
          description: "Les modifications ont été enregistrées avec succès",
        })

        // Close modal
        setIsModalOpen(false)
        setEditingLead(null)
      } else {
        // Create new lead (no automatic conversion to client)
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

        // Normal creation - show success toast (conversion will be handled explicitly via Convert Lead → Contact flow)
        toast.success("✅ Lead créé", {
          description: "Le nouveau lead a été créé avec succès",
        })
        
        // Close modal after successful creation
        setEditingLead(null)
        setIsModalOpen(false)
      }
    } catch (error) {
      console.error("[KanbanBoard] Error saving lead:", error)
      toast.error(error instanceof Error ? error.message : "Échec de l'enregistrement du lead. Veuillez réessayer.")
      // Re-throw so modal can handle the error state
      throw error
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    try {
      console.log(`[Delete Lead] Deleting lead ${leadId}`)
      
      // Delete from database
      await LeadsService.deleteLead(leadId)
      
      // Remove from list immediately
      removeLead(leadId)
      
      setIsModalOpen(false)
      
      toast.success("✅ Lead supprimé", {
        description: "Le lead a été supprimé avec succès (client préservé si converti)",
      })
    } catch (error) {
      console.error("Error deleting lead:", error)
      toast.error("Échec de la suppression du lead. Veuillez réessayer.")
    }
  }

  const handleConvertToClient = (lead: Lead) => {
    console.log('🔄 [Conversion] Opening architect selection modal for lead:', lead.id, lead.nom)
    
    // Close edit modal if open
    setIsModalOpen(false)
    
    // Open architect selection modal
    setLeadToConvert(lead)
    setIsArchitectModalOpen(true)
  }

  const handleArchitectSelected = async (architectId: string) => {
    if (!leadToConvert) return

    console.log('🔄 [Conversion] Architect selected:', architectId || 'none', 'for lead:', leadToConvert.id)
    
    // Close architect modal
    setIsArchitectModalOpen(false)
    const lead = leadToConvert
    setLeadToConvert(null)

    // Show loading toast
    const loadingToast = toast.loading(`⏳ Conversion en cours...`, {
      description: `Création du contact pour ${lead.nom}. Merci de patienter quelques secondes...`,
      duration: Infinity,
    })

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.dismiss(loadingToast)
        toast.error("Non authentifié. Veuillez vous reconnecter.")
        return
      }

      console.log('📡 [Conversion] Calling API to create contact with architect...')
      const response = await fetch(`/api/contacts/convert-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          architectId: architectId || undefined, // Empty string becomes undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [Conversion] API error:', errorData)
        
        toast.dismiss(loadingToast)
        toast.error(errorData.error || "Échec de la conversion. Veuillez réessayer.")
        return
      }

      const data = await response.json()
      console.log('✅ [Conversion] Full API response:', data)
      
      if (!data.contact || !data.contact.id) {
        console.error('❌ [Conversion] No contact data in response!')
        toast.dismiss(loadingToast)
        toast.error("Le contact a été créé mais les données sont manquantes. Rechargez la page.")
        return
      }
      
      // Dismiss loading toast before showing success
      toast.dismiss(loadingToast)
      
      // Small delay to ensure loading toast is dismissed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('🎉 [Kanban] Showing success toast for:', lead.nom)
      toast.success(`✨ ${lead.nom} converti en contact !`, {
        description: "Redirection vers le profil du contact...",
        duration: 2000,
      })
      
      // Remove lead from UI
      console.log('🎬 [Conversion] Removing lead from UI...')
      removeLead(lead.id)

      // Redirect to contact details page with conversion flag after a short delay
      const contactId = data.contact.id
      console.log('🔄 [Conversion] Redirecting to:', `/contacts/${contactId}`)
      
      // Use setTimeout to ensure redirect happens after toast is shown
      // Use window.location.href for more reliable navigation
      setTimeout(() => {
        window.location.href = `/contacts/${contactId}?converted=true`
      }, 800)
      
    } catch (error) {
      console.error("❌ [Conversion] Error:", error)
      toast.dismiss(loadingToast)
      toast.error("Échec de la conversion. Veuillez réessayer.")
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
      
      toast.success("🔴 Lead marqué", {
        description: "Le lead a été marqué comme non intéressé",
      })
      console.log('✅ [Not Interested] Update complete!')
    } catch (error) {
      console.error("❌ [Not Interested] Error:", error)
      toast.error(error instanceof Error ? error.message : "Échec de la mise à jour du lead. Veuillez réessayer.")
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
                <p className="text-red-400 text-sm">{error instanceof Error ? error.message : String(error)}</p>
              </div>
            )}

            {/* Filter Accordion - Compact Luxury Design */}
            <div className="glass rounded-xl border border-slate-600/30 overflow-hidden shadow-lg">
              {/* Filter Header - Compact */}
              <div className="px-5 py-3 bg-gradient-to-r from-slate-800/60 to-slate-800/40 backdrop-blur-md space-y-3">
                {/* Top Row: Filter Button and Clear */}
                <div className="flex items-center justify-between">
                  {/* Left: Filter Section */}
                  <button 
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-all flex-1 group"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Filter className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold text-white text-sm">Filtres</span>
                    {getActiveFiltersCount() > 0 && (
                      <span className="bg-gradient-to-r from-primary/30 to-primary/20 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-primary/30 shadow-sm">
                        {getActiveFiltersCount()}
                      </span>
                    )}
                    <ChevronDown className={cn(
                      "w-4 h-4 text-slate-400 transition-transform ml-auto",
                      isFiltersOpen && "rotate-180 text-primary"
                    )} />
                  </button>

                  {/* Right: Clear Filters */}
                  {getActiveFiltersCount() > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearAllFilters()
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30 ml-3"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="font-medium">Réinitialiser</span>
                    </button>
                  )}
                </div>

                {/* Active Filter Chips - Inside Header */}
                <AnimatePresence>
                  {getActiveFiltersCount() > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {filters.status !== "all" && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-blue-500/25 transition-colors"
                          >
                            <span className="truncate max-w-[100px]">{columns.find(c => c.status === filters.status)?.label}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('status')
                              }} 
                              className="hover:text-blue-200 transition-colors flex-shrink-0"
                              aria-label="Remove status filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                        {filters.city !== "all" && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-blue-500/25 transition-colors"
                          >
                            <span className="truncate max-w-[100px]">{filters.city}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('city')
                              }} 
                              className="hover:text-blue-200 transition-colors flex-shrink-0"
                              aria-label="Remove city filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                        {filters.type !== "all" && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-blue-500/25 transition-colors"
                          >
                            <span className="truncate max-w-[100px]">{filters.type}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('type')
                              }} 
                              className="hover:text-blue-200 transition-colors flex-shrink-0"
                              aria-label="Remove type filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                        {filters.assigned !== "all" && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-blue-500/25 transition-colors"
                          >
                            <span className="truncate max-w-[100px]">{filters.assigned}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('assigned')
                              }} 
                              className="hover:text-blue-200 transition-colors flex-shrink-0"
                              aria-label="Remove assigned filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                        {filters.priority !== "all" && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-blue-500/25 transition-colors"
                          >
                            <span className="truncate max-w-[100px]">{filters.priority === 'haute' ? 'Haute' : filters.priority === 'moyenne' ? 'Moyenne' : 'Basse'}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('priority')
                              }} 
                              className="hover:text-blue-200 transition-colors flex-shrink-0"
                              aria-label="Remove priority filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                        {filters.source !== "all" && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1 bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25 rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-fuchsia-500/25 transition-colors"
                          >
                            <span className="truncate max-w-[100px]">{filters.source.charAt(0).toUpperCase() + filters.source.slice(1)}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('source')
                              }} 
                              className="hover:text-fuchsia-200 transition-colors flex-shrink-0"
                              aria-label="Remove source filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                        {filters.campaign !== "all" && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1 bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25 rounded-md px-2 py-0.5 text-[11px] font-medium hover:bg-fuchsia-500/25 transition-colors"
                          >
                            <span className="truncate max-w-[100px]">{filters.campaign}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFilter('campaign')
                              }} 
                              className="hover:text-fuchsia-200 transition-colors flex-shrink-0"
                              aria-label="Remove campaign filter"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Filter Content - Compact Grid */}
              {isFiltersOpen && (
                <div className="border-t border-slate-600/20 p-4 bg-gradient-to-b from-slate-800/30 to-slate-800/50">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Status Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Statut
                      </label>
                      <Select
                        value={filters.status}
                        onValueChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}
                      >
                        <SelectTrigger className="h-9 w-full bg-slate-700/60 border border-slate-600/40 text-white text-sm hover:border-primary/40 hover:bg-slate-700/80 transition-all rounded-lg shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-600">
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          {columns.map((c) => (
                            <SelectItem key={c.status} value={c.status}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* City Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        Ville
                      </label>
                      <Select
                        value={filters.city}
                        onValueChange={(v) => setFilters((f) => ({ ...f, city: v }))}
                      >
                        <SelectTrigger className="h-9 w-full bg-slate-700/60 border border-slate-600/40 text-white text-sm hover:border-blue-400/40 hover:bg-slate-700/80 transition-all rounded-lg shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-600 max-h-72">
                          <SelectItem value="all">Toutes les villes</SelectItem>
                          {[...new Set(leads.map((l) => l.ville))].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Type Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Type de bien
                      </label>
                      <Select
                        value={filters.type}
                        onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                      >
                        <SelectTrigger className="h-9 w-full bg-slate-700/60 border border-slate-600/40 text-white text-sm hover:border-emerald-400/40 hover:bg-slate-700/80 transition-all rounded-lg shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-600">
                          <SelectItem value="all">Tous les types</SelectItem>
                          {[...new Set(leads.map((l) => l.typeBien))].map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assigned Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Assigné à
                      </label>
                      <Select
                        value={filters.assigned}
                        onValueChange={(v) => setFilters((f) => ({ ...f, assigned: v }))}
                      >
                        <SelectTrigger className="h-9 w-full bg-slate-700/60 border border-slate-600/40 text-white text-sm hover:border-amber-400/40 hover:bg-slate-700/80 transition-all rounded-lg shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-600 max-h-72">
                          <SelectItem value="all">Tous les assignés</SelectItem>
                          {architectAssignees.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                        Priorité
                      </label>
                      <Select
                        value={filters.priority}
                        onValueChange={(v) => setFilters((f) => ({ ...f, priority: v as any }))}
                      >
                        <SelectTrigger className="h-9 w-full bg-slate-700/60 border border-slate-600/40 text-white text-sm hover:border-orange-400/40 hover:bg-slate-700/80 transition-all rounded-lg shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-600">
                          <SelectItem value="all">Toutes les priorités</SelectItem>
                          <SelectItem value="haute">Priorité Haute</SelectItem>
                          <SelectItem value="moyenne">Priorité Moyenne</SelectItem>
                          <SelectItem value="basse">Priorité Basse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Source Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        Source
                      </label>
                      <Select
                        value={filters.source}
                        onValueChange={(v) => setFilters((f) => ({ ...f, source: v }))}
                      >
                        <SelectTrigger className="h-9 w-full bg-slate-700/60 border border-slate-600/40 text-white text-sm hover:border-purple-400/40 hover:bg-slate-700/80 transition-all rounded-lg shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-white border-slate-600">
                          <SelectItem value="all">Toutes les sources</SelectItem>
                          <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                          <SelectItem value="magasin">🏬 Magasin</SelectItem>
                          <SelectItem value="facebook">📘 Facebook</SelectItem>
                          <SelectItem value="instagram">📷 Instagram</SelectItem>
                          <SelectItem value="site_web">🌐 Site Web</SelectItem>
                          <SelectItem value="reference_client">👥 Recommandation</SelectItem>
                          <SelectItem value="autre">📦 Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Campaign Filter - Only show if TikTok source is selected or if there are campaigns */}
                    {(filters.source === "tiktok" || filters.source === "all") && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                          Campagne
                        </label>
                        <Select
                          value={filters.campaign}
                          onValueChange={(v) => setFilters((f) => ({ ...f, campaign: v }))}
                        >
                          <SelectTrigger className="h-9 w-full bg-slate-700/60 border border-slate-600/40 text-white text-sm hover:border-fuchsia-400/40 hover:bg-slate-700/80 transition-all rounded-lg shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 text-white border-slate-600 max-h-72">
                            <SelectItem value="all">Toutes les campagnes</SelectItem>
                            {[...new Set(leads.filter(l => l.campaignName).map(l => l.campaignName))].map((campaign) => (
                              <SelectItem key={campaign} value={campaign!}>
                                {campaign}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table View Only */}
          <LeadsTable
            leads={leads}
            onLeadClick={handleLeadClick}
            onEditLead={handleEditLead}
            onDeleteLead={handleDeleteLead}
            onViewHistory={(lead) => {
              setHistoryLead(lead)
              setIsHistoryPanelOpen(true)
            }}
            onConvertToClient={handleConvertToClient}
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
        key={editingLead?.id || 'new-lead'}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) {
            setEditingLead(null)
          }
        }}
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
            
            toast.success("✅ Note ajoutée", {
              description: "La note a été ajoutée avec succès",
            })
          } catch (error) {
            console.error('Error adding note:', error)
            toast.error("Échec de l'ajout de la note. Veuillez réessayer.")
            throw error
          }
        }}
      />

      {/* Architect Selection Modal for Lead Conversion */}
      {leadToConvert && (
        <ArchitectSelectionDialog
          open={isArchitectModalOpen}
          onOpenChange={(open) => {
            setIsArchitectModalOpen(open)
            if (!open) {
              setLeadToConvert(null)
            }
          }}
          onBack={() => {
            setIsArchitectModalOpen(false)
            setLeadToConvert(null)
          }}
          onArchitectSelected={handleArchitectSelected}
          leadName={leadToConvert.nom}
        />
      )}
    </>
  )
}
