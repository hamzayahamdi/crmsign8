"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Filter, X, ChevronDown, Users, TrendingUp, LayoutGrid, Table as TableIcon, Loader2 } from "lucide-react"
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
import { motion } from "framer-motion"
import { ensureIssamInLocalStorage } from "@/lib/seed-issam"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

  const handleClientClick = (client: Client) => {
    // Navigate to full-page client details view using Next.js router (no refresh)
    router.push(`/clients/${client.id}`)
  }

  const handleAddClient = () => {
    setEditingClient(null)
    setIsAddModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
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
    try {
      // Update local state immediately for optimistic UI
      updateStoreClient(updatedClient.id, updatedClient)
      setSelectedClient(updatedClient)
      
      // Update via API
      const response = await fetch(`/api/clients/${updatedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedClient)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update client')
      }
      
      console.log('[Clients Page] ✅ Client updated in database')
      
      // Real-time sync will update the store automatically for other users
    } catch (error) {
      console.error('[Clients Page] Error updating client:', error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le client. Veuillez réessayer.",
        variant: "destructive"
      })
      // Note: If API fails, real-time sync will revert the change
    }
  }

  // Open confirm dialog for deletion
  const requestDeleteClient = (client: Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
      try {
        // Delete via API
        const response = await fetch(`/api/clients/${clientToDelete.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete client')
        }
        
        console.log('[Clients Page] ✅ Client deleted from database')
        
        // Real-time sync will update the store automatically
        if (selectedClient?.id === clientToDelete.id) {
          setIsDetailPanelOpen(false)
          setSelectedClient(null)
        }
        
        toast({
          title: "Client supprimé",
          description: `Le client "${clientToDelete.nom}" a été supprimé avec succès`,
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

  // Calculate statistics
  const totalClients = clients.length
  const activeProjects = clients.filter(c => c.statutProjet !== "termine" && c.statutProjet !== "livraison").length
  const completedProjects = clients.filter(c => c.statutProjet === "termine").length

  // Get unique values for filters
  const uniqueArchitects = Array.from(new Set(clients.map(c => c.architecteAssigne))).filter(Boolean)
  const uniqueVilles = Array.from(new Set(clients.map(c => c.ville))).filter(Boolean)
  const uniqueTypes = Array.from(new Set(clients.map(c => c.typeProjet))).filter(Boolean)


  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)]">
          <Header />

          {/* Stats Cards */}
          <div className="px-6 pt-6 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass relative overflow-hidden rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(59,130,246,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Clients</p>
                    <p className="text-xl font-bold text-white">{isLoading ? '...' : clients.length}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass relative overflow-hidden rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(249,115,22,0.55)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Actifs</p>
                    <p className="text-xl font-bold text-white">{isLoading ? '...' : activeProjects}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass relative overflow-hidden rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(34,197,94,0.55)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Terminés</p>
                    <p className="text-xl font-bold text-white">{isLoading ? '...' : completedProjects}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 pb-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-[220px]">
                  <ClientAutocomplete
                    clients={clients}
                    onSelectClient={handleClientClick}
                    placeholder="Rechercher un client par nom, ville, téléphone..."
                  />
                </div>

                <div className="glass rounded-lg p-1 flex border border-slate-600/30 self-stretch lg:self-auto">
                  <button
                    onClick={() => handleViewModeChange('table')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
                      viewMode === 'table'
                        ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange('kanban')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
                      viewMode === 'kanban'
                        ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kanban</span>
                  </button>
                </div>

                <Button
                  onClick={handleAddClient}
                  className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm shadow-[0_12px_40px_-24px_rgba(59,130,246,0.9)]"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Nouveau</span>
                  <span className="sm:hidden">+</span>
                </Button>
              </div>

              <div className="glass rounded-xl border border-slate-600/30 shadow-[0_18px_48px_-28px_rgba(59,130,246,0.65)]">
                <div className="flex items-center justify-between p-3 gap-3">
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
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-white transition-transform ml-auto",
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
                      className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Effacer filtres
                    </button>
                  )}
                </div>

                {getActiveFiltersCount() > 0 && (
                  <div className="border-t border-slate-600/30 px-4 py-3 bg-slate-900/40">
                    <div className="flex flex-wrap gap-2">
                      {filters.statut !== "all" && (
                        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                          Statut: {
                            filters.statut === "nouveau" ? "Nouveau" :
                            filters.statut === "acompte_verse" ? "Acompte versé" :
                            filters.statut === "en_conception" ? "En conception" :
                            filters.statut === "en_chantier" ? "En chantier" :
                            filters.statut === "livraison" ? "Livraison" : "Terminé"
                          }
                          <button onClick={() => removeFilter('statut')} className="hover:text-primary/70">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {filters.ville !== "all" && (
                        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                          Ville: {filters.ville}
                          <button onClick={() => removeFilter('ville')} className="hover:text-primary/70">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {filters.typeProjet !== "all" && (
                        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                          Type: {filters.typeProjet}
                          <button onClick={() => removeFilter('typeProjet')} className="hover:text-primary/70">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {filters.architecte !== "all" && (
                        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                          Architecte: {filters.architecte}
                          <button onClick={() => removeFilter('architecte')} className="hover:text-primary/70">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isFiltersOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-600/30 bg-slate-900/35 rounded-b-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Statut du projet</label>
                        <Select
                          value={filters.statut}
                          onValueChange={(value) => setFilters(f => ({ ...f, statut: value as ProjectStatus | "all" }))}
                        >
                          <SelectTrigger className="bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="nouveau">Nouveau</SelectItem>
                            <SelectItem value="acompte_verse">Acompte versé</SelectItem>
                            <SelectItem value="en_conception">En conception</SelectItem>
                            <SelectItem value="en_validation">En validation</SelectItem>
                            <SelectItem value="en_chantier">En chantier</SelectItem>
                            <SelectItem value="livraison">Livraison</SelectItem>
                            <SelectItem value="termine">Terminé</SelectItem>
                            <SelectItem value="annule">Annulé</SelectItem>
                            <SelectItem value="suspendu">Suspendu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Ville</label>
                        <Select
                          value={filters.ville}
                          onValueChange={(value) => setFilters(f => ({ ...f, ville: value }))}
                        >
                          <SelectTrigger className="bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Toutes les villes" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all">Toutes les villes</SelectItem>
                            {uniqueVilles.map(v => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Type de projet</label>
                        <Select
                          value={filters.typeProjet}
                          onValueChange={(value) => setFilters(f => ({ ...f, typeProjet: value }))}
                        >
                          <SelectTrigger className="bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all">Tous les types</SelectItem>
                            {uniqueTypes.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Équipe</label>
                        <Select
                          value={filters.architecte}
                          onValueChange={(value) => setFilters(f => ({ ...f, architecte: value }))}
                        >
                          <SelectTrigger className="bg-slate-800/70 border border-slate-600/40 text-white">
                            <SelectValue placeholder="Tous les architectes" />
                          </SelectTrigger>
                          <SelectContent className="border border-slate-600/40 bg-slate-900/95 text-white">
                            <SelectItem value="all">Tous les architectes</SelectItem>
                            {uniqueArchitects.map(a => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
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
          <div className="flex-1 px-6 pb-10 overflow-hidden">
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
                          searchQuery={searchQuery}
                          filters={filters}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Kanban View - Project Management */
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="h-full overflow-x-hidden"
                    >
                      <ClientKanbanBoard
                        clients={clients}
                        onClientClick={handleClientClick}
                        onUpdateClient={handleUpdateClient}
                        searchQuery={searchQuery}
                        filters={filters}
                      />
                    </motion.div>
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

        {/* Confirm Delete Modal */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Supprimer le client ?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                Cette action supprimera uniquement le client
                {clientToDelete ? ` "${clientToDelete.nom}"` : ""} de la table Clients.
                Le lead associé (s'il existe) sera <span className="font-semibold text-white">préservé</span>.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteClient} className="bg-red-600 hover:bg-red-700 text-white">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
