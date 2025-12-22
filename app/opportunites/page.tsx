"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Filter, X, ChevronDown, Target, LayoutGrid, Table as TableIcon, Loader2, CheckCircle2, Clock } from "lucide-react"
import type { Client, ProjectStatus } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { ClientsTable } from "@/components/clients-table"
import { ClientsListMobile } from "@/components/clients-list-mobile"
import { ClientDetailPanelRedesigned } from "@/components/client-detail-panel-redesigned"
import { AddClientModalImproved } from "@/components/add-client-modal-improved"
import { ClientAutocomplete } from "@/components/client-autocomplete"
import { ClientKanbanBoard } from "@/components/client-kanban-board"

import { ViewStore, type ViewMode } from "@/stores/view-store"
import { useClientStore } from "@/stores/client-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Header } from "@/components/header"
import { motion, AnimatePresence } from "framer-motion"
import { ensureIssamInLocalStorage } from "@/lib/seed-issam"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function OpportunitiesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  // Debug: Log when modal state changes
  useEffect(() => {
    if (isAddModalOpen) {
      console.log('[Opportunities Page] 🔓 Modal is OPEN, editingClient:', editingClient?.id, editingClient?.nom)
    } else {
      console.log('[Opportunities Page] 🔒 Modal is CLOSED')
    }
  }, [isAddModalOpen, editingClient])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    architecte: "all" as string,
    statut: "all" as "all" | ProjectStatus,
    ville: "all" as string,
    typeProjet: "all" as string,
  })
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load view mode from localStorage on mount
  useEffect(() => {
    setViewMode(ViewStore.getViewMode())
  }, [])

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    ViewStore.setViewMode(mode)
  }

  // Use Zustand store for real-time sync
  const { clients: storeClients, setClients: setStoreClients, updateClient: updateStoreClient, addClient: addStoreClient, deleteClient: deleteStoreClient, refreshClients, fetchClients, isLoading } = useClientStore()

  // Initialize local state from store immediately (preserves optimistic updates)
  useEffect(() => {
    // Use store data immediately if available (preserves any optimistic updates)
    if (storeClients.length > 0) {
      console.log('[Opportunities Page] 📦 Using existing store data:', storeClients.length, 'clients')
      setClients(storeClients)
    }
  }, []) // Only run once on mount

  // Fetch opportunities (clients) from database on mount (background refresh)
  useEffect(() => {
    // Only fetch if store is empty (first load)
    // This preserves optimistic updates when navigating back
    if (storeClients.length === 0) {
      console.log('[Opportunities Page] 🚀 Store empty - fetching from database')
      fetchClients()
    } else {
      console.log('[Opportunities Page] ✅ Using cached store data, skipping initial fetch')
      // Refresh in background after a short delay to ensure data consistency
      const timer = setTimeout(() => {
        console.log('[Opportunities Page] 🔄 Background refresh from database')
        fetchClients()
      }, 2000) // 2 second delay to ensure any pending writes complete
      return () => clearTimeout(timer)
    }
  }, [fetchClients, storeClients.length])

  // Sync local state with store (real-time updates)
  // CRITICAL: Preserve recent local updates to prevent overwriting
  useEffect(() => {
    const unsubscribe = useClientStore.subscribe((state) => {
      // Only deduplicate if we actually have duplicates (performance optimization)
      let clientsToSet = state.clients
      
      // Quick check for duplicates
      const clientIds = new Set(state.clients.map(c => c.id))
      if (clientIds.size !== state.clients.length) {
        // Only deduplicate if duplicates exist
        const uniqueClients = state.clients.filter((client, index, self) => 
          index === self.findIndex(c => c.id === client.id)
        )
        console.warn(`[Opportunities Page] ⚠️ Removed ${state.clients.length - uniqueClients.length} duplicate clients from store`)
        clientsToSet = uniqueClients
      }
      
      // CRITICAL: Merge with local state to preserve recent updates
      setClients(prev => {
        const prevMap = new Map(prev.map(c => [c.id, c]))
        const merged = clientsToSet.map(newClient => {
          const existing = prevMap.get(newClient.id)
          if (existing) {
            // If existing was recently updated (within last 2 seconds), keep it
            if (existing.updatedAt && newClient.updatedAt) {
              const existingTime = new Date(existing.updatedAt).getTime()
              const newTime = new Date(newClient.updatedAt).getTime()
              const now = Date.now()
              
              // Keep existing if it's more recent or was updated in last 2 seconds
              if (existingTime > newTime || (now - existingTime < 2000)) {
                return existing
              }
            }
            // If statuses differ and existing was recently updated, prefer existing
            if (existing.statutProjet !== newClient.statutProjet && existing.updatedAt) {
              const existingTime = new Date(existing.updatedAt).getTime()
              const now = Date.now()
              if (now - existingTime < 2000) {
                return existing
              }
            }
          }
          return newClient
        })
        
        // Add any clients from prev that aren't in new list
        const newIds = new Set(clientsToSet.map(c => c.id))
        prev.forEach(existingClient => {
          if (!newIds.has(existingClient.id)) {
            merged.push(existingClient)
          }
        })
        
        return merged
      })
      
      console.log(`[Opportunities Page] 🔄 Store updated - ${clientsToSet.length} opportunities`)
    })
    return unsubscribe
  }, [])

  // Listen for opportunity creation events to refresh opportunities list
  useEffect(() => {
    const handleOpportunityCreated = () => {
      console.log('[Opportunities Page] Opportunity created, refreshing opportunities list...')
      fetchClients()
    }

    const handleOpportunityUpdated = (event: CustomEvent) => {
      console.log('[Opportunities Page] Opportunity updated event received:', event.detail)
      // Refresh to ensure all pages are in sync
      fetchClients()
    }

    // CRITICAL: Listen for stage updates from client details page
    const handleStageUpdated = (event: CustomEvent) => {
      const { clientId, newStatus, changedBy } = event.detail || {}
      console.log('[Opportunities Page] 🔄 Stage updated event received:', { clientId, newStatus, changedBy })
      
      if (clientId && newStatus) {
        const now = new Date().toISOString()
        
        // Update local state immediately for instant visual feedback
        setClients(prev => {
          const updated = prev.map(c => {
            if (c.id === clientId) {
              console.log('[Opportunities Page] ⚡ Updating client status locally:', {
                clientId,
                from: c.statutProjet,
                to: newStatus
              })
              return {
                ...c,
                statutProjet: newStatus,
                derniereMaj: now,
                updatedAt: now
              }
            }
            return c
          })
          
          // Also update the store immediately for cross-component sync
          const updatedClient = updated.find(c => c.id === clientId)
          if (updatedClient) {
            updateStoreClient(clientId, updatedClient)
          }
          
          console.log('[Opportunities Page] ✅ Stage update synced to local state and store')
          return updated
        })
      }
    }

    window.addEventListener('opportunity-created', handleOpportunityCreated)
    window.addEventListener('opportunity-updated', handleOpportunityUpdated as EventListener)
    window.addEventListener('stage-updated', handleStageUpdated as EventListener)
    return () => {
      window.removeEventListener('opportunity-created', handleOpportunityCreated)
      window.removeEventListener('opportunity-updated', handleOpportunityUpdated as EventListener)
      window.removeEventListener('stage-updated', handleStageUpdated as EventListener)
    }
  }, [fetchClients, updateStoreClient])

  const handleClientClick = (client: Client & { isContact?: boolean }) => {
    // Navigate to opportunity details page
    router.push(`/clients/${client.id}`)
  }

  const handleAddOpportunity = () => {
    setEditingClient(null)
    setIsAddModalOpen(true)
  }

  const handleEditClient = (client: Client & { isContact?: boolean }) => {
    console.log('[Opportunities Page] ✏️ Edit clicked for opportunity:', client.id, client.nom)
    // Always open modal for editing opportunities
    setEditingClient(client)
    setIsAddModalOpen(true)
    setIsDetailPanelOpen(false)
    console.log('[Opportunities Page] ✅ Modal should open now, editingClient:', client.id)
  }

  const handleSaveClient = async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "derniereMaj">): Promise<void> => {
    if (editingClient) {
      console.log('[Opportunities Page] 💾 Updating opportunity:', editingClient.id)
      
      // Prepare update data with timestamp for tracability
      const now = new Date().toISOString()
      const updateData = {
        ...clientData,
        updatedAt: now,
        derniereMaj: now,
      }

      // Update existing opportunity via API
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update opportunity')
      }

      const result = await response.json()
      const updatedClient = result.data as Client
      
      console.log('[Opportunities Page] ✅ Opportunity updated in database:', updatedClient.id, {
        ville: updatedClient.ville,
        nomProjet: updatedClient.nomProjet,
        nom: updatedClient.nom
      })

      // CRITICAL: Ensure ville is always a string (never null/undefined)
      const clientWithVille = {
        ...updatedClient,
        ville: updatedClient.ville || "",
        nomProjet: updatedClient.nomProjet || ""
      }

      // CRITICAL: Update the store immediately for real-time sync across all pages
      updateStoreClient(clientWithVille.id, clientWithVille)
      
      // Also update local state
      setClients(prev => prev.map(c => c.id === clientWithVille.id ? clientWithVille : c))

      // Refresh clients list to ensure data consistency (especially for opportunity-based clients)
      await fetchClients()

      // Dispatch event for other pages/components to refresh
      window.dispatchEvent(new CustomEvent('opportunity-updated', {
        detail: { opportunityId: updatedClient.id, client: clientWithVille }
      }))

      // Build description with all updated fields
      const updatedFields = []
      if (clientData.nomProjet && clientData.nomProjet !== editingClient.nomProjet) {
        updatedFields.push(`nom du projet: "${clientData.nomProjet}"`)
      }
      if (clientData.ville && clientData.ville !== editingClient.ville) {
        updatedFields.push(`ville: "${clientData.ville}"`)
      }
      if (clientData.nom && clientData.nom !== editingClient.nom) {
        updatedFields.push(`nom: "${clientData.nom}"`)
      }
      if (clientData.telephone && clientData.telephone !== editingClient.telephone) {
        updatedFields.push(`téléphone: "${clientData.telephone}"`)
      }
      if (clientData.statutProjet && clientData.statutProjet !== editingClient.statutProjet) {
        updatedFields.push(`statut: "${clientData.statutProjet}"`)
      }
      if (clientData.typeProjet && clientData.typeProjet !== editingClient.typeProjet) {
        updatedFields.push(`type: "${clientData.typeProjet}"`)
      }
      if (clientData.architecteAssigne && clientData.architecteAssigne !== editingClient.architecteAssigne) {
        updatedFields.push(`architecte: "${clientData.architecteAssigne}"`)
      }
      if (clientData.budget !== undefined && clientData.budget !== editingClient.budget) {
        updatedFields.push(`estimation montant: "${clientData.budget} DH"`)
      }

      const descriptionText = updatedFields.length > 0
        ? `L'opportunité "${clientData.nom}" a été mise à jour avec succès. ${updatedFields.join(', ')} ${updatedFields.length > 1 ? 'ont été' : 'a été'} synchronisé${updatedFields.length > 1 ? 's' : ''} dans la base de données et la table.`
        : `L'opportunité "${clientData.nom}" a été mise à jour avec succès. Toutes les modifications sont synchronisées.`

      toast({
        title: "✅ Opportunité mise à jour",
        description: descriptionText,
      })
    } else {
      // Add new opportunity via API
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...clientData,
          commercialAttribue: user?.name || 'Système'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create opportunity')
      }

      const result = await response.json()
      const newClient = result.data as Client
      console.log('[Opportunities Page] ✅ Opportunity created in database:', newClient.id)

      // Add to store for real-time sync
      addStoreClient(newClient)

      // Refresh opportunities from database (this will also sync via store)
      await fetchClients()

      toast({
        title: "✅ Opportunité créée",
        description: `L'opportunité "${clientData.nom}" a été créée avec succès`,
      })
    }

    // Close modal only after successful save
    setIsAddModalOpen(false)
    setEditingClient(null)
  }

  const handleUpdateClient = async (updatedClient: Client) => {
    // IMPORTANT: Only update the store, don't call API
    // The kanban board already handles API calls
    console.log('[Opportunities Page] 🔄 Updating client:', {
      id: updatedClient.id,
      statutProjet: updatedClient.statutProjet
    })
    
    // Update local state immediately for instant UI feedback
    setClients(prev => prev.map(c => 
      c.id === updatedClient.id ? { ...c, ...updatedClient } : c
    ))
    
    // Also update the store for cross-component sync
    updateStoreClient(updatedClient.id, updatedClient)
    setSelectedClient(updatedClient)
    console.log('[Opportunities Page] ✅ Opportunity updated in local state and store')
  }

  // Open confirm dialog for deletion
  const requestDeleteClient = (client: Client & { isContact?: boolean }) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
      try {
        const clientName = clientToDelete.nom

        // Delete via API
        const response = await fetch(`/api/clients/${clientToDelete.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Failed to delete opportunity')
        }

        console.log('[Opportunities Page] ✅ Opportunity deleted from database')

        // Immediately update the local store (optimistic update)
        deleteStoreClient(clientToDelete.id)

        // Close detail panel if the deleted opportunity was selected
        if (selectedClient?.id === clientToDelete.id) {
          setIsDetailPanelOpen(false)
          setSelectedClient(null)
        }

        // Show success toast
        toast({
          title: "✅ Opportunité supprimée",
          description: `L'opportunité "${clientName}" a été supprimée avec succès`,
        })
      } catch (error) {
        console.error('[Opportunities Page] Error deleting opportunity:', error)
        toast({
          title: "Erreur",
          description: "Impossible de supprimer l'opportunité. Veuillez réessayer.",
          variant: "destructive"
        })
      } finally {
        setDeleteDialogOpen(false)
        setClientToDelete(null)
      }
    }
  }

  const handleMarkComplete = (client: Client) => {
    const now = new Date().toISOString()
    const updatedClient = {
      ...client,
      statutProjet: "termine" as ProjectStatus,
      derniereMaj: now,
      updatedAt: now,
      historique: [
        ...(client.historique || []),
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: "statut" as const,
          description: "Projet marqué comme terminé",
          auteur: "Système"
        }
      ]
    }
    setClients(prev => prev.map(c =>
      c.id === client.id ? updatedClient : c
    ))
    setIsDetailPanelOpen(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.statut !== "all") count++
    if (filters.ville !== "all") count++
    if (filters.typeProjet !== "all") count++
    if (filters.architecte !== "all") count++
    return count
  }

  const clearAllFilters = () => {
    setFilters({
      architecte: "all",
      statut: "all",
      ville: "all",
      typeProjet: "all",
    })
  }

  const removeFilter = (filterType: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: "all"
    }))
  }

  // Calculate statistics - Opportunity statistics based on project status
  // IMPORTANT: Use the same filtering logic as the table to ensure stats match displayed opportunities
  // Only count opportunities that have a project name (nomProjet) - matching table logic
  
  // Filter opportunities the same way the table does - only show opportunities with nomProjet
  const opportunitiesWithProjects = clients.filter(client => {
    // Only count opportunities that have a project name (nomProjet)
    // This matches the table filtering logic in ClientsTable component
    return client.nomProjet && client.nomProjet.trim()
  })

  // Remove duplicates: Only count unique opportunity+project combinations
  // This prevents counting the same opportunity multiple times
  const uniqueOpportunitiesWithProjects = opportunitiesWithProjects.reduce((acc, client) => {
    const existingIndex = acc.findIndex(c => c.nom === client.nom && c.nomProjet === client.nomProjet)
    if (existingIndex < 0) {
      acc.push(client)
    }
    return acc
  }, [] as Client[])
  
  // Helper function to categorize opportunity status (matches architect logic)
  const getOpportunityStatusCategory = (status: ProjectStatus): 'en_cours' | 'termine' | 'en_attente' | 'excluded' => {
    // Exclude lost/refused/cancelled projects - these are not counted in active stats
    if (status === 'perdu' || status === 'refuse' || status === 'annule') {
      return 'excluded'
    }
    
    // Terminés - completed projects
    if (status === 'termine' || status === 'livraison_termine' || status === 'livraison') {
      return 'termine'
    }
    
    // En attente - new or qualified projects waiting to start
    if (status === 'nouveau' || status === 'qualifie' || status === 'prise_de_besoin') {
      return 'en_attente'
    }
    
    // En cours - all active projects in progress
    // Includes: acompte_recu, conception, devis_negociation, accepte, premier_depot,
    // projet_en_cours, chantier, facture_reglee, en_conception, en_validation, en_chantier, suspendu
    return 'en_cours'
  }

  // Calculate stats based on opportunities with projects (matching table display)
  const totalOpportunities = uniqueOpportunitiesWithProjects.length
  
  // Opportunities with projects actively in progress (en cours)
  const opportunitiesEnCours = uniqueOpportunitiesWithProjects.filter(c => getOpportunityStatusCategory(c.statutProjet) === 'en_cours').length
  
  // Opportunities with completed projects (terminés)
  const opportunitiesTermines = uniqueOpportunitiesWithProjects.filter(c => getOpportunityStatusCategory(c.statutProjet) === 'termine').length
  
  // Opportunities with projects waiting to start (en attente) - for reference
  const opportunitiesEnAttente = uniqueOpportunitiesWithProjects.filter(c => getOpportunityStatusCategory(c.statutProjet) === 'en_attente').length

  // Get unique values for filters (based on opportunities with projects)
  const uniqueArchitects = Array.from(new Set(uniqueOpportunitiesWithProjects.map(c => c.architecteAssigne))).filter(Boolean)
  const uniqueVilles = Array.from(new Set(uniqueOpportunitiesWithProjects.map(c => c.ville))).filter(Boolean)
  const uniqueTypes = Array.from(new Set(uniqueOpportunitiesWithProjects.map(c => c.typeProjet))).filter(Boolean)


  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)] w-full">
          <Header />

          {/* Stats Cards - Compact design with inline text */}
          <div className="px-3 md:px-4 pt-3 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500/15 via-slate-800/70 to-slate-900/50 border border-blue-500/40 p-2.5 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-blue-400/80 mb-0.5 uppercase tracking-widest">Total</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-extrabold text-white leading-none">{isLoading ? '...' : totalOpportunities}</p>
                      <span className="text-[11px] font-semibold text-blue-300/70">Opportunités</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/25 to-blue-500/15 border border-blue-500/40 flex items-center justify-center shadow-md shadow-blue-500/20">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        <Target className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-500/15 via-slate-800/70 to-slate-900/50 border border-orange-500/40 p-2.5 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-orange-400/80 mb-0.5 uppercase tracking-widest">En cours</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-extrabold text-orange-300 leading-none">{isLoading ? '...' : opportunitiesEnCours}</p>
                      <span className="text-[11px] font-semibold text-orange-300/70">Opportunités</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/25 to-orange-500/15 border border-orange-500/40 flex items-center justify-center shadow-md shadow-orange-500/20">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500/15 via-slate-800/70 to-slate-900/50 border border-green-500/40 p-2.5 hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-green-400/80 mb-0.5 uppercase tracking-widest">Terminés</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-extrabold text-green-300 leading-none">{isLoading ? '...' : opportunitiesTermines}</p>
                      <span className="text-[11px] font-semibold text-green-300/70">Opportunités</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500/25 to-green-500/15 border border-green-500/40 flex items-center justify-center shadow-md shadow-green-500/20">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters - Compact layout */}
          <div className="px-3 md:px-4 pb-2">
            <div className="space-y-1.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-[220px]">
                  <ClientAutocomplete
                    clients={clients}
                    onSelectClient={handleClientClick}
                    placeholder="Rechercher une opportunité..."
                  />
                </div>

                {/* Enhanced View Mode Toggle */}
                <div className="glass rounded-lg p-1 flex border border-slate-600/40 bg-slate-800/40 backdrop-blur-sm self-stretch lg:self-auto shadow-lg">
                  <button
                    onClick={() => handleViewModeChange('table')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 flex-1 lg:flex-none h-8",
                      viewMode === 'table'
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.4)] border border-blue-400/50"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/60 border border-transparent"
                    )}
                  >
                    <TableIcon className={cn("w-3.5 h-3.5", viewMode === 'table' ? "text-white" : "text-slate-400")} />
                    <span className="inline font-medium">Table</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange('kanban')}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 flex-1 lg:flex-none h-8",
                      viewMode === 'kanban'
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.4)] border border-blue-400/50"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/60 border border-transparent"
                    )}
                  >
                    <LayoutGrid className={cn("w-3.5 h-3.5", viewMode === 'kanban' ? "text-white" : "text-slate-400")} />
                    <span className="inline font-medium">Kanban</span>
                  </button>
                </div>
              </div>

              <div className="glass rounded-lg border border-slate-600/30 shadow-[0_18px_48px_-28px_rgba(59,130,246,0.65)]">
                <div className="flex items-center justify-between p-2 gap-2">
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  >
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-white">Filtres</span>
                    {getActiveFiltersCount() > 0 && (
                      <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                        {getActiveFiltersCount()} actif{getActiveFiltersCount() > 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 text-white transition-transform ml-auto",
                        isFiltersOpen && "rotate-180"
                      )}
                    />
                  </div>

                  {getActiveFiltersCount() > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearAllFilters()
                      }}
                      className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-700/50"
                    >
                      <X className="w-3 h-3" />
                      <span className="hidden sm:inline">Effacer</span>
                    </button>
                  )}
                </div>

                {getActiveFiltersCount() > 0 && (
                  <div className="border-t border-slate-600/30 px-2.5 py-2 bg-slate-900/40">
                    <div className="flex flex-wrap gap-1.5">
                      {filters.statut !== "all" && (
                        <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                          Statut: {
                            filters.statut === "qualifie" ? "Qualifié" :
                              filters.statut === "prise_de_besoin" ? "Prise de besoin" :
                                filters.statut === "acompte_recu" ? "Acompte reçu" :
                                  filters.statut === "conception" ? "Conception" :
                                    filters.statut === "devis_negociation" ? "Devis/Négociation" :
                                      filters.statut === "accepte" ? "Accepté" :
                                        filters.statut === "premier_depot" ? "1er Dépôt" :
                                          filters.statut === "projet_en_cours" ? "Projet en cours" :
                                            filters.statut === "chantier" ? "Chantier" :
                                              filters.statut === "facture_reglee" ? "Facture réglée" :
                                                filters.statut === "livraison_termine" ? "Livraison & Terminé" : filters.statut
                          }
                          <button onClick={() => removeFilter('statut')} className="hover:text-primary/70">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      {filters.ville !== "all" && (
                        <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                          Ville: {filters.ville}
                          <button onClick={() => removeFilter('ville')} className="hover:text-primary/70">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      {filters.typeProjet !== "all" && (
                        <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                          Type: {filters.typeProjet}
                          <button onClick={() => removeFilter('typeProjet')} className="hover:text-primary/70">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      {filters.architecte !== "all" && (
                        <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                          Architecte: {filters.architecte}
                          <button onClick={() => removeFilter('architecte')} className="hover:text-primary/70">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isFiltersOpen && (
                  <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-600/30 bg-slate-900/35 rounded-b-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white uppercase tracking-wider">Statut du projet</label>
                        <Select
                          value={filters.statut}
                          onValueChange={(value) => setFilters(f => ({ ...f, statut: value as ProjectStatus | "all" }))}
                        >
                          <SelectTrigger className="h-7 text-xs bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white max-h-[400px] overflow-y-auto">
                            <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
                            <SelectItem value="qualifie" className="text-xs">Qualifié</SelectItem>
                            <SelectItem value="prise_de_besoin" className="text-xs">Prise de besoin</SelectItem>
                            <SelectItem value="acompte_recu" className="text-xs">Acompte reçu</SelectItem>
                            <SelectItem value="conception" className="text-xs">Conception</SelectItem>
                            <SelectItem value="devis_negociation" className="text-xs">Devis/Négociation</SelectItem>
                            <SelectItem value="accepte" className="text-xs">Accepté</SelectItem>
                            <SelectItem value="premier_depot" className="text-xs">1er Dépôt</SelectItem>
                            <SelectItem value="projet_en_cours" className="text-xs">Projet en cours</SelectItem>
                            <SelectItem value="chantier" className="text-xs">Chantier</SelectItem>
                            <SelectItem value="facture_reglee" className="text-xs">Facture réglée</SelectItem>
                            <SelectItem value="livraison_termine" className="text-xs">Livraison & Terminé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white uppercase tracking-wider">Ville</label>
                        <Select
                          value={filters.ville}
                          onValueChange={(value) => setFilters(f => ({ ...f, ville: value }))}
                        >
                          <SelectTrigger className="h-7 text-xs bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Toutes les villes" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all" className="text-xs">Toutes les villes</SelectItem>
                            {uniqueVilles.map(v => (
                              <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white uppercase tracking-wider">Type de projet</label>
                        <Select
                          value={filters.typeProjet}
                          onValueChange={(value) => setFilters(f => ({ ...f, typeProjet: value }))}
                        >
                          <SelectTrigger className="h-7 text-xs bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all" className="text-xs">Tous les types</SelectItem>
                            {uniqueTypes.map(t => (
                              <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-white uppercase tracking-wider">Équipe</label>
                        <Select
                          value={filters.architecte}
                          onValueChange={(value) => setFilters(f => ({ ...f, architecte: value }))}
                        >
                          <SelectTrigger className="h-7 text-xs bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Tous les architectes" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all" className="text-xs">Tous les architectes</SelectItem>
                            {uniqueArchitects.map(a => (
                              <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Opportunities Content - Table or Kanban - Reduced spacing */}
          <div className="flex-1 px-3 md:px-4 pb-3 overflow-hidden mt-1">
            <div className="flex h-full w-full flex-col">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Chargement...</p>
                  </motion.div>
                </div>
              ) : clients.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl border border-slate-600/30 p-10 max-w-xl w-full text-center shadow-[0_22px_60px_-32px_rgba(59,130,246,0.7)]"
                  >
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Target className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Aucune opportunité pour le moment</h2>
                    <p className="text-slate-400 mb-6">Créez une nouvelle opportunité depuis un contact pour commencer à gérer vos projets.</p>
                    <Button
                      onClick={handleAddOpportunity}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer une opportunité
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <>
                  {viewMode === 'table' ? (
                    <div className="flex flex-1 flex-col">
                      {/* Desktop Table View */}
                      <div className="hidden lg:block">
                        <ClientsTable
                          clients={clients}
                          onClientClick={handleClientClick}
                          onEditClient={handleEditClient}
                          onDeleteClient={requestDeleteClient}
                          searchQuery={searchQuery}
                          filters={filters}
                        />
                      </div>

                      {/* Mobile List View */}
                      <div className="block lg:hidden">
                        <ClientsListMobile
                          clients={clients}
                          onClientClick={handleClientClick}
                          onDeleteClient={requestDeleteClient}
                          searchQuery={searchQuery}
                          filters={filters}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Kanban View - Project Management */
                    <div className="h-full overflow-hidden">
                      <ClientKanbanBoard
                        clients={clients}
                        onClientClick={handleClientClick}
                        onUpdateClient={handleUpdateClient}
                        searchQuery={searchQuery}
                        filters={filters}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* Opportunity Detail Panel - Redesigned */}
        <ClientDetailPanelRedesigned
          client={selectedClient}
          isOpen={isDetailPanelOpen}
          onClose={() => setIsDetailPanelOpen(false)}
          onUpdate={handleUpdateClient}
          onDelete={requestDeleteClient}
        />

        {/* Confirm Delete Modal - Custom Implementation */}
        <AnimatePresence>
          {deleteDialogOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isDeleting && setDeleteDialogOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99998]"
              />

              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] w-full max-w-md"
              >
                <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 mx-4">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Supprimer l'opportunité ?
                  </h2>
                  <p className="text-slate-300 text-sm mb-6">
                    Cette action supprimera uniquement l'opportunité
                    {clientToDelete ? ` "${clientToDelete.nom}"` : ""} de la table Clients.
                    Le contact associé (s'il existe) sera <span className="font-semibold text-white">préservé</span>.
                    Cette action est irréversible.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={isDeleting}
                      className="px-4 py-2 rounded-md bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={confirmDeleteClient}
                      disabled={isDeleting}
                      className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isDeleting ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Add/Edit Opportunity Modal */}
        <AddClientModalImproved
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingClient(null)
          }}
          onSave={handleSaveClient}
          editingClient={editingClient}
        />
      </div>
    </AuthGuard>
  )
}

