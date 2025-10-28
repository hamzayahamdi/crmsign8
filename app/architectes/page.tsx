"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Filter, X, ChevronDown, Users, TrendingUp, Briefcase, FolderOpen, Grid3x3, List } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Architect, ArchitectStatus, ArchitectSpecialty } from "@/types/architect"
import type { Client } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { Header } from "@/components/header"
import { ArchitectCard } from "@/components/architect-card"
import { ArchitectTable } from "@/components/architect-table"
import { AddArchitectModal } from "@/components/add-architect-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { toast } from "sonner"

export default function ArchitectesPage() {
  const router = useRouter()
  const [architects, setArchitects] = useState<Architect[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    statut: "all" as "all" | ArchitectStatus,
    ville: "all" as string,
    specialite: "all" as "all" | ArchitectSpecialty,
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Load architects and clients from localStorage
  useEffect(() => {
    // Load clients to compute architect statistics
    const storedClients = localStorage.getItem("signature8-clients")
    const clientsData = storedClients ? JSON.parse(storedClients) : []
    setClients(clientsData)

    // Load or generate architects
    const storedArchitects = localStorage.getItem("signature8-architects")
    if (storedArchitects) {
      setArchitects(JSON.parse(storedArchitects))
    } else {
      // Generate demo architects from unique architect names in clients
      const uniqueArchitectNames = Array.from(new Set(clientsData.map((c: Client) => c.architecteAssigne)))
      const demoArchitects: Architect[] = uniqueArchitectNames.map((name, index) => {
        const nameStr = String(name)
        const [prenom, ...nomParts] = nameStr.split(' ')
        const nom = nomParts.join(' ') || prenom
        return {
          id: `arch-${Date.now()}-${index}`,
          nom: nom,
          prenom: prenom,
          email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@sketchdesign.ma`,
          telephone: `+212 6${Math.floor(10000000 + Math.random() * 90000000)}`,
          ville: ["Casablanca", "Rabat", "Marrakech", "Tanger"][index % 4],
          specialite: (["residentiel", "commercial", "luxe", "mixte"][index % 4] as ArchitectSpecialty),
          statut: "actif" as ArchitectStatus,
          dateEmbauche: new Date(2020 + index, index % 12, 1).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      })
      setArchitects(demoArchitects)
      localStorage.setItem("signature8-architects", JSON.stringify(demoArchitects))
    }
  }, [])

  // Compute architect statistics from clients
  const architectsWithStats = useMemo(() => {
    return architects.map(architect => {
      const architectClients = clients.filter(c => 
        c.architecteAssigne.toLowerCase().includes(architect.prenom.toLowerCase()) ||
        c.architecteAssigne.toLowerCase().includes(architect.nom.toLowerCase())
      )
      
      const totalDossiers = architectClients.length
      const dossiersEnCours = architectClients.filter(c => 
        c.statutProjet !== "termine" && c.statutProjet !== "livraison"
      ).length
      const dossiersTermines = architectClients.filter(c => c.statutProjet === "termine").length
      const dossiersEnAttente = architectClients.filter(c => c.statutProjet === "nouveau").length

      return {
        ...architect,
        totalDossiers,
        dossiersEnCours,
        dossiersTermines,
        dossiersEnAttente
      }
    })
  }, [architects, clients])

  // Filter and search architects
  const filteredArchitects = useMemo(() => {
    return architectsWithStats.filter(architect => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        architect.nom.toLowerCase().includes(searchLower) ||
        architect.prenom.toLowerCase().includes(searchLower) ||
        architect.email.toLowerCase().includes(searchLower) ||
        architect.ville.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus = filters.statut === "all" || architect.statut === filters.statut

      // Ville filter
      const matchesVille = filters.ville === "all" || architect.ville === filters.ville

      // Specialite filter
      const matchesSpecialite = filters.specialite === "all" || architect.specialite === filters.specialite

      return matchesSearch && matchesStatus && matchesVille && matchesSpecialite
    })
  }, [architectsWithStats, searchQuery, filters])

  // Calculate statistics
  const totalArchitects = architectsWithStats.length
  const activeArchitects = architectsWithStats.filter(a => a.statut === "actif").length
  const totalDossiers = architectsWithStats.reduce((sum, a) => sum + (a.totalDossiers || 0), 0)
  const avgDossiersPerArchitect = totalArchitects > 0 ? Math.round(totalDossiers / totalArchitects) : 0

  // Get unique values for filters
  const uniqueVilles = Array.from(new Set(architectsWithStats.map(a => a.ville)))

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.statut !== "all") count++
    if (filters.ville !== "all") count++
    if (filters.specialite !== "all") count++
    return count
  }

  const clearAllFilters = () => {
    setFilters({
      statut: "all",
      ville: "all",
      specialite: "all",
    })
  }

  const removeFilter = (filterType: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: "all"
    }))
  }

  const handleViewDetails = (architect: Architect) => {
    router.push(`/architectes/${architect.id}`)
  }

  const handleAddArchitect = async (architectData: {
    userId: string
    telephone: string
    ville: string
    specialite: ArchitectSpecialty
    statut: ArchitectStatus
    bio?: string
  }) => {
    try {
      // Fetch user details from API
      const response = await fetch(`/api/users/${architectData.userId}`)
      if (!response.ok) {
        toast.error("Erreur lors de la récupération des données utilisateur")
        return
      }
      
      const user = await response.json()
      const [prenom, ...nomParts] = user.name.split(' ')
      const nom = nomParts.join(' ') || prenom
      
      const now = new Date().toISOString()
      const newArchitect: Architect = {
        id: `arch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nom: nom,
        prenom: prenom,
        email: user.email,
        telephone: architectData.telephone,
        ville: architectData.ville,
        specialite: architectData.specialite,
        statut: architectData.statut,
        bio: architectData.bio,
        dateEmbauche: now,
        createdAt: now,
        updatedAt: now,
      }
      
      const updatedArchitects = [...architects, newArchitect]
      setArchitects(updatedArchitects)
      localStorage.setItem("signature8-architects", JSON.stringify(updatedArchitects))
      
      setIsAddModalOpen(false)
      toast.success(`Architecte ${user.name} ajouté avec succès`)
    } catch (error) {
      console.error("Error adding architect:", error)
      toast.error("Erreur lors de l'ajout de l'architecte")
    }
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          
          {/* Page Header */}
          <div className="p-6 pb-4 border-b border-slate-600/30">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold text-white">Gestion des Architectes</h1>
            </motion.div>
          </div>

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
                    <p className="text-sm text-slate-400 mb-1">Total Architectes</p>
                    <p className="text-3xl font-bold text-white">{totalArchitects}</p>
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
                    <p className="text-sm text-slate-400 mb-1">Architectes actifs</p>
                    <p className="text-3xl font-bold text-white">{activeArchitects}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-400" />
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
                    <p className="text-sm text-slate-400 mb-1">Total dossiers</p>
                    <p className="text-3xl font-bold text-white">{totalDossiers}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-purple-400" />
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
                    <p className="text-sm text-slate-400 mb-1">Moyenne / architecte</p>
                    <p className="text-3xl font-bold text-white">{avgDossiersPerArchitect}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 pb-4 space-y-3">
            {/* Search Bar and Actions */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un architecte par nom, email, ville..."
                  className="h-12 pl-12 pr-4 bg-slate-800/60 border-slate-600/60 text-white placeholder:text-slate-400 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="glass rounded-xl border border-slate-600/30 p-1 flex gap-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-10 px-4",
                    viewMode === "grid" && "bg-primary text-white"
                  )}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-10 px-4",
                    viewMode === "table" && "bg-primary text-white"
                  )}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="h-12 px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl font-medium shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter un architecte
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
                        Statut: {filters.statut === "actif" ? "Actif" : filters.statut === "inactif" ? "Inactif" : "En congé"}
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
                    {filters.specialite !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Spécialité: {filters.specialite}
                        <button onClick={() => removeFilter('specialite')} className="hover:text-primary/70">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Statut Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Statut</label>
                      <select
                        value={filters.statut}
                        onChange={(e) => setFilters(f => ({ ...f, statut: e.target.value as any }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="conge">En congé</option>
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

                    {/* Specialite Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Spécialité</label>
                      <select
                        value={filters.specialite}
                        onChange={(e) => setFilters(f => ({ ...f, specialite: e.target.value as any }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Toutes les spécialités</option>
                        <option value="residentiel">Résidentiel</option>
                        <option value="commercial">Commercial</option>
                        <option value="industriel">Industriel</option>
                        <option value="renovation">Rénovation</option>
                        <option value="luxe">Luxe</option>
                        <option value="mixte">Mixte</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Architects Display */}
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {filteredArchitects.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-2xl border border-slate-600/30 p-8 max-w-xl w-full text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Aucun architecte trouvé</h2>
                  <p className="text-slate-400">Ajustez vos filtres ou ajoutez un nouvel architecte.</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArchitects.map((architect, index) => (
                      <ArchitectCard
                        key={architect.id}
                        architect={architect}
                        onViewDetails={handleViewDetails}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <ArchitectTable
                    architects={filteredArchitects}
                    onViewDetails={handleViewDetails}
                  />
                )}
              </>
            )}
          </div>
        </main>

        {/* Add Architect Modal */}
        <AddArchitectModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddArchitect}
        />
      </div>
    </AuthGuard>
  )
}
