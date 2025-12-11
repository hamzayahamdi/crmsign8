"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Filter, X, ChevronDown, Users, TrendingUp, LayoutGrid, Table as TableIcon, Loader2, CheckCircle2, Clock } from "lucide-react"
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

export default function ClientsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
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

  // Fetch clients from database on mount
  useEffect(() => {
    console.log('[Clients Page] 🚀 Mounting - fetching clients from database')
    fetchClients()
  }, [fetchClients])

  // Sync local state with store (real-time updates)
  useEffect(() => {
    const unsubscribe = useClientStore.subscribe((state) => {
      setClients(state.clients)
      console.log(`[Clients Page] 🔄 Store updated - ${state.clients.length} clients`)
    })
    return unsubscribe
  }, [])

  // Listen for opportunity creation events to refresh clients list
  useEffect(() => {
    const handleOpportunityCreated = () => {
      console.log('[Clients Page] Opportunity created, refreshing clients...')
      fetchClients()
    }

    window.addEventListener('opportunity-created', handleOpportunityCreated)
    return () => window.removeEventListener('opportunity-created', handleOpportunityCreated)
  }, [fetchClients])

  const handleClientClick = (client: Client & { isContact?: boolean }) => {
    // Always navigate to client details page (not contact details)
    router.push(`/clients/${client.id}`)
  }

  const handleAddClient = () => {
    setEditingClient(null)
    setIsAddModalOpen(true)
  }

  const handleEditClient = (client: Client & { isContact?: boolean }) => {
    // For opportunity-based clients, navigate to client details page to edit
    if (client.isContact) {
      router.push(`/clients/${client.id}`)
      return
    }
    setEditingClient(client)
    setIsAddModalOpen(true)
    setIsDetailPanelOpen(false)
  }

  const handleSaveClient = async (clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "derniereMaj">) => {
    try {
      if (editingClient) {
        // Update existing client via API
        const response = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(clientData)
        })

        if (!response.ok) {
          throw new Error('Failed to update client')
        }

        const result = await response.json()
        console.log('[Clients Page] ✅ Client updated in database:', result.data)

        toast({
          title: "Client mis à jour",
          description: `Le client "${clientData.nom}" a été mis à jour avec succès`,
        })
      } else {
        // Add new client via API
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
          throw new Error('Failed to create client')
        }

        const result = await response.json()
        console.log('[Clients Page] ✅ Client created in database:', result.data)

        toast({
          title: "Client créé",
          description: `Le client "${clientData.nom}" a été créé avec succès`,
        })
      }

      // Refresh clients from database (real-time sync will also update)
      await fetchClients()

      setIsAddModalOpen(false)
      setEditingClient(null)
    } catch (error) {
      console.error('[Clients Page] Error saving client:', error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le client. Veuillez réessayer.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateClient = async (updatedClient: Client) => {
    // IMPORTANT: Only update the store, don't call API
    // The kanban board already handles API calls
    updateStoreClient(updatedClient.id, updatedClient)
    setSelectedClient(updatedClient)
    console.log('[Clients Page] ✅ Client store updated')
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
          throw new Error('Failed to delete client')
        }

        console.log('[Clients Page] ✅ Client deleted from database')

        // Immediately update the local store (optimistic update)
        deleteStoreClient(clientToDelete.id)

        // Close detail panel if the deleted client was selected
        if (selectedClient?.id === clientToDelete.id) {
          setIsDetailPanelOpen(false)
          setSelectedClient(null)
        }

        // Show success toast
        toast({
          title: "✅ Client supprimé",
          description: `Le client "${clientName}" a été supprimé avec succès`,
        })
      } catch (error) {
        console.error('[Clients Page] Error deleting client:', error)
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le client. Veuillez réessayer.",
          variant: "destructive"
        })
      } finally {
        setDeleteDialogOpen(false)
        setClientToDelete(null)
      }
    }
  }

  // Note: Clients from converted leads should be deleted from the Leads table
  // This ensures data consistency and maintains the lead-to-client workflow

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

  // Calculate statistics - Client statistics based on project status
  // IMPORTANT: Use the same filtering logic as the table to ensure stats match displayed clients
  // Only count clients that have a project name (nomProjet) - matching table logic
  
  // Filter clients the same way the table does - only show clients with nomProjet
  const clientsWithProjects = clients.filter(client => {
    // Only count clients that have a project name (nomProjet)
    // This matches the table filtering logic in ClientsTable component
    return client.nomProjet && client.nomProjet.trim()
  })

  // Remove duplicates: Only count unique client+project combinations
  // This prevents counting the same client multiple times
  const uniqueClientsWithProjects = clientsWithProjects.reduce((acc, client) => {
    const existingIndex = acc.findIndex(c => c.nom === client.nom && c.nomProjet === client.nomProjet)
    if (existingIndex < 0) {
      acc.push(client)
    }
    return acc
  }, [] as Client[])
  
  // Helper function to categorize client status (matches architect logic)
  const getClientStatusCategory = (status: ProjectStatus): 'en_cours' | 'termine' | 'en_attente' | 'excluded' => {
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

  // Calculate stats based on clients with projects (matching table display)
  const totalClients = uniqueClientsWithProjects.length
  
  // Clients with projects actively in progress (en cours)
  const clientsEnCours = uniqueClientsWithProjects.filter(c => getClientStatusCategory(c.statutProjet) === 'en_cours').length
  
  // Clients with completed projects (terminés)
  const clientsTermines = uniqueClientsWithProjects.filter(c => getClientStatusCategory(c.statutProjet) === 'termine').length
  
  // Clients with projects waiting to start (en attente) - for reference
  const clientsEnAttente = uniqueClientsWithProjects.filter(c => getClientStatusCategory(c.statutProjet) === 'en_attente').length

  // Get unique values for filters (based on clients with projects)
  const uniqueArchitects = Array.from(new Set(uniqueClientsWithProjects.map(c => c.architecteAssigne))).filter(Boolean)
  const uniqueVilles = Array.from(new Set(uniqueClientsWithProjects.map(c => c.ville))).filter(Boolean)
  const uniqueTypes = Array.from(new Set(uniqueClientsWithProjects.map(c => c.typeProjet))).filter(Boolean)


  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)] w-full">
          <Header />

          {/* Stats Cards */}
          <div className="px-3 md:px-4 pt-2 md:pt-3 pb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-white leading-tight">{isLoading ? '...' : totalClients}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Clients</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      ) : (
                        <Users className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">En cours</p>
                    <p className="text-2xl font-bold text-orange-400 leading-tight">{isLoading ? '...' : clientsEnCours}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Clients</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-green-500/30 transition-all duration-300 sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Terminés</p>
                    <p className="text-2xl font-bold text-green-400 leading-tight">{isLoading ? '...' : clientsTermines}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Clients</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-3 md:px-4 pb-2">
            <div className="space-y-1.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-[220px]">
                  <ClientAutocomplete
                    clients={clients}
                    onSelectClient={handleClientClick}
                    placeholder="Rechercher un client..."
                  />
                </div>

                <div className="glass rounded-lg p-0.5 flex border border-slate-600/30 self-stretch lg:self-auto">
                  <button
                    onClick={() => handleViewModeChange('table')}
                    className={cn(
                      "flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-1 lg:flex-none h-7",
                      viewMode === 'table'
                        ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <TableIcon className="w-3 h-3" />
                    <span className="inline">Table</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange('kanban')}
                    className={cn(
                      "flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-1 lg:flex-none h-7",
                      viewMode === 'kanban'
                        ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span className="inline">Kanban</span>
                  </button>
                </div>

                <Button
                  onClick={handleAddClient}
                  className="h-7 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-xs shadow-[0_12px_40px_-24px_rgba(59,130,246,0.9)] w-full lg:w-auto"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Nouveau client</span>
                </Button>
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
                            filters.statut === "nouveau" ? "Nouveau" :
                              filters.statut === "acompte_verse" ? "Acompte versé" :
                                filters.statut === "en_conception" ? "En conception" :
                                  filters.statut === "en_chantier" ? "En chantier" :
                                    filters.statut === "livraison" ? "Livraison" : "Terminé"
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
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
                            <SelectItem value="nouveau" className="text-xs">Nouveau</SelectItem>
                            <SelectItem value="acompte_verse" className="text-xs">Acompte versé</SelectItem>
                            <SelectItem value="en_conception" className="text-xs">En conception</SelectItem>
                            <SelectItem value="en_validation" className="text-xs">En validation</SelectItem>
                            <SelectItem value="en_chantier" className="text-xs">En chantier</SelectItem>
                            <SelectItem value="livraison" className="text-xs">Livraison</SelectItem>
                            <SelectItem value="termine" className="text-xs">Terminé</SelectItem>
                            <SelectItem value="annule" className="text-xs">Annulé</SelectItem>
                            <SelectItem value="suspendu" className="text-xs">Suspendu</SelectItem>
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

          {/* Clients Content - Table or Kanban */}
          <div className="flex-1 px-3 md:px-4 pb-3 overflow-hidden">
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
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Aucun client pour le moment</h2>
                    <p className="text-slate-400 mb-6">Ajoutez un nouveau client pour commencer à gérer vos projets.</p>
                    <Button
                      onClick={handleAddClient}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un client
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <>
                  {viewMode === 'table' ? (
                    <div className="flex flex-1 flex-col gap-6">
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

        {/* Client Detail Panel - Redesigned */}
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
                    Supprimer le client ?
                  </h2>
                  <p className="text-slate-300 text-sm mb-6">
                    Cette action supprimera uniquement le client
                    {clientToDelete ? ` "${clientToDelete.nom}"` : ""} de la table Clients.
                    Le lead associé (s'il existe) sera <span className="font-semibold text-white">préservé</span>.
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

        {/* Add/Edit Client Modal */}
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
