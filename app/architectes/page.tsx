"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Filter, X, ChevronDown, Users, TrendingUp, Briefcase, FolderOpen, Grid3x3, List } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Architect, ArchitectStatus, ArchitectSpecialty } from "@/types/architect"
import type { Client } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { RoleGuard } from "@/components/role-guard"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    statut: "all" as "all" | ArchitectStatus,
    ville: "all" as string,
    specialite: "all" as "all" | ArchitectSpecialty,
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch architects from API
  useEffect(() => {
    const fetchArchitects = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/architects')
        
        if (!response.ok) {
          throw new Error('Failed to fetch architects')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          setArchitects(result.data)
          console.log(`✅ Loaded ${result.data.length} architects from API`)
        }
      } catch (error) {
        console.error('Error fetching architects:', error)
        toast.error('Erreur lors du chargement des architectes')
      } finally {
        setIsLoading(false)
      }
    }

    fetchArchitects()
  }, [])

  // Architects already have statistics from API
  const architectsWithStats = architects

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
      // Note: In a real implementation, you would update the user's role to 'architect' via API
      // For now, we'll just refresh the architects list
      setIsAddModalOpen(false)
      toast.success("Architecte ajouté avec succès")
      
      // Refresh architects list
      const response = await fetch('/api/architects')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setArchitects(result.data)
        }
      }
    } catch (error) {
      console.error("Error adding architect:", error)
      toast.error("Erreur lors de l'ajout de l'architecte")
    }
  }

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['Admin', 'Operator']}>
        <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <Header />
          
          {/* Stats Cards - Compact */}
          <div className="px-3 md:px-4 pt-2 md:pt-3 pb-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-white leading-tight">{totalArchitects}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Architectes</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-green-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Actifs</p>
                    <p className="text-2xl font-bold text-green-400 leading-tight">{activeArchitects}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Architectes</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Dossiers</p>
                    <p className="text-2xl font-bold text-purple-400 leading-tight">{totalDossiers}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Total</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Moyenne</p>
                    <p className="text-2xl font-bold text-orange-400 leading-tight">{avgDossiersPerArchitect}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Par architecte</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-3 md:px-4 pb-2 space-y-1.5">
            {/* Search Bar and Actions */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un architecte..."
                  className="h-8 pl-9 pr-3 bg-slate-800/60 border-slate-600/60 text-white placeholder:text-slate-400 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 text-xs"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="glass rounded-lg border border-slate-600/30 p-0.5 flex gap-0.5">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-7 px-2",
                    viewMode === "grid" && "bg-primary text-white"
                  )}
                >
                  <Grid3x3 className="w-3 h-3" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-7 px-2",
                    viewMode === "table" && "bg-primary text-white"
                  )}
                >
                  <List className="w-3 h-3" />
                </Button>
              </div>

              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="h-8 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Ajouter</span>
                <span className="sm:hidden">+</span>
              </Button>
            </div>

            {/* Filters */}
            <div className="glass rounded-lg border border-slate-600/30">
              {/* Filter Header */}
              <div className="flex items-center justify-between p-2 gap-2">
                <div 
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-white">Filtres</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                  <ChevronDown className={cn(
                    "w-3 h-3 text-white transition-transform ml-auto",
                    isFiltersOpen && "rotate-180"
                  )} />
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
                    Effacer
                  </button>
                )}
              </div>

              {/* Active Filter Chips */}
              {getActiveFiltersCount() > 0 && (
                <div className="border-t border-slate-600/30 px-2.5 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {filters.statut !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                        Statut: {filters.statut === "actif" ? "Actif" : filters.statut === "inactif" ? "Inactif" : "En congé"}
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
                    {filters.specialite !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                        Spécialité: {filters.specialite}
                        <button onClick={() => removeFilter('specialite')} className="hover:text-primary/70">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Content */}
              {isFiltersOpen && (
                <div className="border-t border-slate-600/30 p-2.5 bg-slate-800/60">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* Statut Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-white uppercase tracking-wider">Statut</label>
                      <select
                        value={filters.statut}
                        onChange={(e) => setFilters(f => ({ ...f, statut: e.target.value as any }))}
                        className="h-8 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white text-xs focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="conge">En congé</option>
                      </select>
                    </div>

                    {/* Ville Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-white uppercase tracking-wider">Ville</label>
                      <select
                        value={filters.ville}
                        onChange={(e) => setFilters(f => ({ ...f, ville: e.target.value }))}
                        className="h-8 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white text-xs focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Toutes les villes</option>
                        {uniqueVilles.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Specialite Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-white uppercase tracking-wider">Spécialité</label>
                      <select
                        value={filters.specialite}
                        onChange={(e) => setFilters(f => ({ ...f, specialite: e.target.value as any }))}
                        className="h-8 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white text-xs focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
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
          <div className="flex-1 px-3 md:px-4 pb-3 overflow-hidden">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-xl border border-slate-600/30 p-6 max-w-xl w-full text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                  <h2 className="text-base font-bold text-white mb-1.5">Chargement des architectes...</h2>
                  <p className="text-xs text-slate-400">Veuillez patienter</p>
                </div>
              </div>
            ) : filteredArchitects.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-xl border border-slate-600/30 p-6 max-w-xl w-full text-center">
                  <h2 className="text-lg font-bold text-white mb-1.5">Aucun architecte trouvé</h2>
                  <p className="text-xs text-slate-400">Ajustez vos filtres ou ajoutez un nouvel architecte.</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
      </RoleGuard>
    </AuthGuard>
  )
}
