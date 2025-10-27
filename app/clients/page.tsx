"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Filter, X, ChevronDown, Users, TrendingUp, DollarSign } from "lucide-react"
import type { Client, ProjectStatus } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { ClientsTable } from "@/components/clients-table"
import { ClientsListMobile } from "@/components/clients-list-mobile"
import { ClientDetailPanel } from "@/components/client-detail-panel"
import { AddClientModalImproved } from "@/components/add-client-modal-improved"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Header } from "@/components/header"
import { motion } from "framer-motion"

export default function ClientsPage() {
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

  // Load clients from localStorage
  useEffect(() => {
    const loadClients = () => {
      const storedClients = localStorage.getItem("signature8-clients")
      if (storedClients) {
        setClients(JSON.parse(storedClients))
      }
    }
    loadClients()
  }, [])

  // Save clients to localStorage whenever they change
  useEffect(() => {
    if (clients.length > 0) {
      localStorage.setItem("signature8-clients", JSON.stringify(clients))
    }
  }, [clients])

  const handleClientClick = (client: Client) => {
    setSelectedClient(client)
    setIsDetailPanelOpen(true)
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

  const handleSaveClient = (clientData: Omit<Client, "id" | "createdAt" | "updatedAt" | "derniereMaj">) => {
    const now = new Date().toISOString()
    
    if (editingClient) {
      // Update existing client
      setClients(prev => prev.map(c => 
        c.id === editingClient.id 
          ? { ...c, ...clientData, derniereMaj: now, updatedAt: now }
          : c
      ))
    } else {
      // Create new client
      const newClient: Client = {
        ...clientData,
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        derniereMaj: now,
      }
      setClients(prev => [newClient, ...prev])
    }
    
    setIsAddModalOpen(false)
    setEditingClient(null)
  }

  const handleMarkComplete = (client: Client) => {
    const now = new Date().toISOString()
    setClients(prev => prev.map(c => 
      c.id === client.id 
        ? { 
            ...c, 
            statutProjet: "termine" as ProjectStatus, 
            derniereMaj: now,
            updatedAt: now,
            historique: [
              ...(c.historique || []),
              {
                id: `hist-${Date.now()}`,
                date: now,
                type: "statut" as const,
                description: "Projet marqué comme terminé",
                auteur: "Système"
              }
            ]
          }
        : c
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
  const activeProjects = clients.filter(c => c.statutProjet !== "termine").length
  const completedProjects = clients.filter(c => c.statutProjet === "termine").length
  const totalBudget = clients.reduce((sum, c) => sum + (c.budget || 0), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get unique values for filters
  const uniqueArchitects = Array.from(new Set(clients.map(c => c.architecteAssigne)))
  const uniqueVilles = Array.from(new Set(clients.map(c => c.ville)))
  const uniqueTypes = Array.from(new Set(clients.map(c => c.typeProjet)))


  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          
          {/* Stats Cards */}
          <div className="p-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Total Clients</p>
                    <p className="text-3xl font-bold text-white">{totalClients}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Projets actifs</p>
                    <p className="text-3xl font-bold text-white">{activeProjects}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Projets terminés</p>
                    <p className="text-3xl font-bold text-white">{completedProjects}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Budget total</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 pb-4 space-y-3">
            {/* Search Bar and Add Button */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, ville, téléphone..."
                  className="pl-12 h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>
              <Button
                onClick={handleAddClient}
                className="h-12 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouveau Client
              </Button>
            </div>

            {/* Filters */}
            <div className="glass rounded-xl border border-slate-600/30">
              {/* Filter Header */}
              <div className="flex items-center justify-between p-4 gap-4">
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

              {/* Active Filter Chips */}
              {getActiveFiltersCount() > 0 && (
                <div className="border-t border-slate-600/30 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {filters.statut !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Statut: {filters.statut === "en_conception" ? "En conception" : filters.statut === "en_travaux" ? "En travaux" : "Terminé"}
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

              {/* Filter Content */}
              {isFiltersOpen && (
                <div className="border-t border-slate-600/30 p-4 bg-slate-800/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Statut Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Statut du projet</label>
                      <select
                        value={filters.statut}
                        onChange={(e) => setFilters(f => ({ ...f, statut: e.target.value as any }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="en_conception">En conception</option>
                        <option value="en_travaux">En travaux</option>
                        <option value="termine">Terminé</option>
                      </select>
                    </div>

                    {/* Ville Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Ville</label>
                      <select
                        value={filters.ville}
                        onChange={(e) => setFilters(f => ({ ...f, ville: e.target.value }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Toutes les villes</option>
                        {uniqueVilles.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Type de projet</label>
                      <select
                        value={filters.typeProjet}
                        onChange={(e) => setFilters(f => ({ ...f, typeProjet: e.target.value }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les types</option>
                        {uniqueTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Architecte Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Architecte</label>
                      <select
                        value={filters.architecte}
                        onChange={(e) => setFilters(f => ({ ...f, architecte: e.target.value }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les architectes</option>
                        {uniqueArchitects.map(a => (
                          <option key={a} value={a}>{a.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clients Table or Empty State */}
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {clients.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-2xl border border-slate-600/30 p-8 max-w-xl w-full text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Aucun client pour le moment</h2>
                  <p className="text-slate-400">Ajoutez un nouveau client pour commencer.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <ClientsTable
                    clients={clients}
                    onClientClick={handleClientClick}
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
              </>
            )}
          </div>
        </main>

        {/* Client Detail Panel */}
        <ClientDetailPanel
          client={selectedClient}
          isOpen={isDetailPanelOpen}
          onClose={() => setIsDetailPanelOpen(false)}
          onEdit={handleEditClient}
          onMarkComplete={handleMarkComplete}
        />

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
