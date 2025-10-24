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
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import { LeadCard } from "@/components/lead-card"
import { LeadModal } from "@/components/lead-modal"
import { LeadsTable } from "@/components/leads-table"
import { Phone, MapPin, Filter, ChevronDown, X, RotateCcw, Grid3X3, Table } from "lucide-react"
import { useState as useAccordionState } from "react"
import { cn } from "@/lib/utils"
import { LeadsService } from "@/lib/leads-service"
import { useEnhancedInfiniteScroll } from "@/hooks/useEnhancedInfiniteScroll"
import { Loader2, AlertCircle } from "lucide-react"

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
  { status: "en_cours", label: "En cours d'acquisition", color: "primary" },
  { status: "signe", label: "Signé", color: "premium" },
  { status: "perdu", label: "Perdu / Sans réponse", color: "destructive" },
]

interface KanbanBoardProps {
  onCreateLead?: () => void
  searchQuery?: string
}

export function KanbanBoard({ onCreateLead, searchQuery = "" }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: "all" as "all" | LeadStatus,
    city: "all" as string,
    type: "all" as string,
    assigned: "all" as string,
    priority: "all" as "all" | LeadPriority,
  })
  const [isFiltersOpen, setIsFiltersOpen] = useAccordionState(false)
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table")
  const [newlyAddedLeadId, setNewlyAddedLeadId] = useState<string | null>(null)

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
  )

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const passesSearch = (lead: Lead) => {
    if (!normalizedQuery) return true
    const haystack = [
      lead.nom,
      lead.telephone,
      lead.ville,
      lead.typeBien,
      lead.assignePar,
      lead.statutDetaille ?? "",
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
    setActiveLead(null)

    if (!over) return

    const draggedId = String(active.id)

    // Determine the target status:
    // - If dropped over a column, over.id is the status
    // - If dropped over a card, infer its column by looking up that card
    let targetStatus: LeadStatus | null = null

    const overId = String(over.id)
    const possibleStatuses: LeadStatus[] = [
      "nouveau",
      "a_recontacter",
      "en_cours",
      "signe",
      "perdu",
    ]

    if (possibleStatuses.includes(overId as LeadStatus)) {
      targetStatus = overId as LeadStatus
    } else {
      const overLead = leads.find((l: Lead) => l.id === overId)
      if (overLead) {
        targetStatus = overLead.statut
      }
    }

    if (!targetStatus) return

    try {
      // Update in database
      await LeadsService.updateLead(draggedId, {
        statut: targetStatus,
        derniereMaj: new Date().toISOString()
      })
      
      // Update in list immediately
      updateLead(draggedId, {
        statut: targetStatus,
        derniereMaj: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error updating lead status:", error)
      alert("Échec de la mise à jour du statut. Veuillez réessayer.")
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
        console.log('[KanbanBoard] Updating lead:', leadData.id)
        const updatedLead = await LeadsService.updateLead(leadData.id, leadData)
        console.log('[KanbanBoard] Lead updated:', updatedLead)
        
        // Update in the list immediately
        updateLead(leadData.id, updatedLead)
        
        setEditingLead(null)
        setIsModalOpen(false)
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
        
        // Close modal after successful creation
        setEditingLead(null)
        setIsModalOpen(false)
      }
    } catch (error) {
      console.error("[KanbanBoard] Error saving lead:", error)
      alert("Échec de l'enregistrement du lead. Veuillez réessayer.")
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    try {
      // Delete from database
      await LeadsService.deleteLead(leadId)
      
      // Remove from list immediately
      removeLead(leadId)
      
      setIsModalOpen(false)
    } catch (error) {
      console.error("Error deleting lead:", error)
      alert("Échec de la suppression du lead. Veuillez réessayer.")
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
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
                    "w-4 h-4 text-muted-foreground transition-transform ml-auto",
                    isFiltersOpen && "rotate-180"
                  )} />
                </div>

                {/* Right: View Toggle and Clear Filters */}
                <div className="flex items-center gap-3">
                  {/* Refresh Button */}
                  <button
                    onClick={() => {
                      console.log('[KanbanBoard] Manual refresh - reloading page')
                      window.location.reload()
                    }}
                    className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                    title="Actualiser les données"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Actualiser
                  </button>

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
                  
                  {/* View Toggle */}
                  <div className="glass rounded-lg p-1 flex">
                    <button
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        viewMode === "table"
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-white hover:bg-slate-700/50"
                      )}
                    >
                      <Table className="w-3.5 h-3.5" />
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode("kanban")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        viewMode === "kanban"
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-white hover:bg-slate-700/50"
                      )}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      Kanban
                    </button>
                  </div>
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
                <div className="border-t border-slate-600/30 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Assigné par</label>
                      <select
                        value={filters.assigned}
                        onChange={(e) => setFilters((f) => ({ ...f, assigned: e.target.value }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les assignés</option>
                        {[...new Set(leads.map((l) => l.assignePar))].map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority Filter */}
                    <div className="space-y-2">
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

          {/* Conditional Content Rendering */}
          {viewMode === "table" ? (
            <LeadsTable
              leads={leads}
              onLeadClick={handleLeadClick}
              onDeleteLead={handleDeleteLead}
              searchQuery={searchQuery}
              filters={filters}
              isLoading={isLoading}
              newlyAddedLeadId={newlyAddedLeadId}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.status}
                  status={column.status}
                  label={column.label}
                  color={column.color}
                  leads={getLeadsByStatus(column.status)}
                  onLeadClick={handleLeadClick}
                />
              ))}
            </div>
          )}

          <DragOverlay>
            {activeLead ? (
              <div className="rotate-2 scale-110 opacity-100 shadow-2xl border-2 border-primary/80 bg-slate-800/98 backdrop-blur-sm rounded-lg p-1">
                <div className="bg-slate-700/90 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-white">{activeLead.nom}</h4>
                    <span className="text-xs text-slate-300">{activeLead.typeBien}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-xs">{activeLead.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-xs">{activeLead.ville}</span>
                    </div>
                    {activeLead.statutDetaille && (
                      <div className="text-xs text-slate-300 italic line-clamp-2 mt-2">{activeLead.statutDetaille}</div>
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
      />
    </>
  )
}
