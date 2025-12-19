"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Filter, X, ChevronDown, Users, Clock, CheckCircle2, FolderOpen, Grid3x3, List } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

export default function ArchitectesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [architects, setArchitects] = useState<Architect[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    projectStatus: "all" as "all" | "en_cours" | "termines" | "en_attente",
    availability: "all" as "all" | "disponible" | "occupe",
    hasDossiers: "all" as "all" | "has" | "none",
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Check if current user is an architect or admin
  const isArchitect = user?.role?.toLowerCase() === "architect"
  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "operator"

  // Fetch architects from API
  useEffect(() => {
    const fetchArchitects = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        const response = await fetch('/api/architects', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch architects')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          setArchitects(result.data)
          console.log(`✅ Loaded ${result.data.length} architect(s) from API`)
          
          // If architect viewing their own profile, redirect to detail page
          if (isArchitect && !isAdmin && result.data.length === 1) {
            const ownProfile = result.data[0]
            if (ownProfile.id === user?.id) {
              // Optionally redirect to detail page, or keep on list page
              console.log(`[Architectes Page] Architect viewing own profile`)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching architects:', error)
        toast.error('Erreur lors du chargement des architectes')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchArchitects()
    }
  }, [user, isArchitect, isAdmin])

  // Architects already have statistics from API
  const architectsWithStats = architects

  // Filter and search architects - based on real project data
  const filteredArchitects = useMemo(() => {
    return architectsWithStats.filter(architect => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        architect.nom.toLowerCase().includes(searchLower) ||
        architect.prenom.toLowerCase().includes(searchLower) ||
        architect.email.toLowerCase().includes(searchLower) ||
        architect.ville.toLowerCase().includes(searchLower)

      // Project status filter - filter by project type
      let matchesProjectStatus = true
      if (filters.projectStatus !== "all") {
        if (filters.projectStatus === "en_cours") {
          matchesProjectStatus = (architect.dossiersEnCours || 0) > 0
        } else if (filters.projectStatus === "termines") {
          matchesProjectStatus = (architect.dossiersTermines || 0) > 0
        } else if (filters.projectStatus === "en_attente") {
          matchesProjectStatus = (architect.dossiersEnAttente || 0) > 0
        }
      }

      // Availability filter
      let matchesAvailability = true
      if (filters.availability !== "all") {
        const isDisponible = architect.isDisponible !== undefined ? architect.isDisponible : (architect.dossiersEnCours || 0) < 10
        if (filters.availability === "disponible") {
          matchesAvailability = isDisponible
        } else if (filters.availability === "occupe") {
          matchesAvailability = !isDisponible
        }
      }

      // Has dossiers filter
      let matchesHasDossiers = true
      if (filters.hasDossiers !== "all") {
        const totalDossiers = architect.totalDossiers || 0
        if (filters.hasDossiers === "has") {
          matchesHasDossiers = totalDossiers > 0
        } else if (filters.hasDossiers === "none") {
          matchesHasDossiers = totalDossiers === 0
        }
      }

      return matchesSearch && matchesProjectStatus && matchesAvailability && matchesHasDossiers
    })
  }, [architectsWithStats, searchQuery, filters])

  // Calculate statistics - based on real architect data from API
  // IMPORTANT: These values come directly from the API and match what's shown on individual architect cards
  const totalArchitects = isArchitect && !isAdmin ? 1 : architectsWithStats.length
  const totalDossiers = architectsWithStats.reduce((sum, a) => sum + (a.totalDossiers || 0), 0)
  
  // Calculate dossiers en cours - sum from all architects' dossiersEnCours field
  // This matches the "Projet en cours" value shown on each architect card
  const totalDossiersEnCours = architectsWithStats.reduce((sum, a) => {
    const enCours = a.dossiersEnCours || 0
    return sum + enCours
  }, 0)
  
  // Calculate dossiers terminés - sum from all architects' dossiersTermines field
  // This matches the "Projet livré" value shown on each architect card
  const totalDossiersTermines = architectsWithStats.reduce((sum, a) => sum + (a.dossiersTermines || 0), 0)
  
  // Calculate dossiers en attente - sum from all architects' dossiersEnAttente field
  // This matches the "Projet en attente" value shown on each architect card
  const totalDossiersEnAttente = architectsWithStats.reduce((sum, a) => sum + (a.dossiersEnAttente || 0), 0)

  // Debug: Log detailed breakdown to verify calculation matches cards
  useEffect(() => {
    if (architectsWithStats.length > 0) {
      const breakdown = architectsWithStats.map(a => ({
        name: `${a.prenom} ${a.nom}`,
        dossiersEnCours: a.dossiersEnCours || 0,
        dossiersTermines: a.dossiersTermines || 0,
        dossiersEnAttente: a.dossiersEnAttente || 0,
        totalDossiers: a.totalDossiers || 0
      }))
      
      const calculatedEnCours = breakdown.reduce((sum, a) => sum + a.dossiersEnCours, 0)
      const calculatedEnAttente = breakdown.reduce((sum, a) => sum + a.dossiersEnAttente, 0)
      
      console.log('[Architectes Page] 📊 Stats Calculation Breakdown:', {
        'Total Architects': totalArchitects,
        'Total Dossiers': totalDossiers,
        'Projets en cours (sum)': totalDossiersEnCours,
        'Projets terminés (sum)': totalDossiersTermines,
        'Projets en attente (sum)': totalDossiersEnAttente,
        'Verification - Calculated en cours': calculatedEnCours,
        'Verification - Calculated en attente': calculatedEnAttente,
        'Architects Breakdown': breakdown
      })
      
      // Verify the calculation matches
      if (calculatedEnCours !== totalDossiersEnCours) {
        console.error('❌ Mismatch: Calculated en cours does not match!', {
          calculated: calculatedEnCours,
          actual: totalDossiersEnCours
        })
      }
    }
  }, [architectsWithStats, totalArchitects, totalDossiers, totalDossiersEnCours, totalDossiersTermines, totalDossiersEnAttente])

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.projectStatus !== "all") count++
    if (filters.availability !== "all") count++
    if (filters.hasDossiers !== "all") count++
    return count
  }

  const clearAllFilters = () => {
    setFilters({
      projectStatus: "all",
      availability: "all",
      hasDossiers: "all",
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
      <RoleGuard allowedRoles={['Admin', 'Operator', 'Architect']}>
        <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <Header />
            {/* Page Title for Architects */}
            {isArchitect && !isAdmin && (
              <div className="px-3 md:px-4 pt-3 md:pt-4 pb-2">
                <h1 className="text-lg md:text-xl font-bold text-white">Mes Projets</h1>
                <p className="text-xs md:text-sm text-slate-400">Gérez vos projets et dossiers</p>
              </div>
            )}
          
          {/* Stats Cards - Enhanced design matching contacts page */}
          <div className="px-3 md:px-4 pt-3 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total Architects - Cyan to differentiate from project stats */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-500/10 via-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 cursor-pointer transition-all duration-200 hover:border-cyan-500/40 hover:shadow-md hover:shadow-cyan-500/10"
              >
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-cyan-300/70 mb-1 uppercase tracking-wider">
                      Total
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-bold text-white leading-none">{totalArchitects}</p>
                      <span className="text-[11px] font-semibold text-cyan-300/70">Architectes</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Projets en Cours - Blue to match architect cards */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500/10 via-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 cursor-pointer transition-all duration-200 hover:border-blue-500/40 hover:shadow-md hover:shadow-blue-500/10"
              >
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-blue-300/70 mb-1 uppercase tracking-wider">
                      Projets en cours
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-bold text-blue-400 leading-none">{totalDossiersEnCours}</p>
                      <span className="text-[11px] font-semibold text-blue-300/70">Dossiers</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Total Dossiers */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/10 via-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 cursor-pointer transition-all duration-200 hover:border-purple-500/40 hover:shadow-md hover:shadow-purple-500/10"
              >
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-purple-300/70 mb-1 uppercase tracking-wider">
                      Dossiers
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-bold text-purple-400 leading-none">{totalDossiers}</p>
                      <span className="text-[11px] font-semibold text-purple-300/70">Total</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Projets Terminés */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500/10 via-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 cursor-pointer transition-all duration-200 hover:border-green-500/40 hover:shadow-md hover:shadow-green-500/10"
              >
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-green-300/70 mb-1 uppercase tracking-wider">
                      Projets terminés
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-bold text-green-400 leading-none">{totalDossiersTermines}</p>
                      <span className="text-[11px] font-semibold text-green-300/70">Dossiers</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters - Only show for admins */}
          {isAdmin && (
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

              {/* Only show Add button for admins */}
              {isAdmin && (
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="h-8 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Ajouter</span>
                  <span className="sm:hidden">+</span>
                </Button>
              )}
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
                    {filters.projectStatus !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                        {filters.projectStatus === "en_cours" && "Projets en cours"}
                        {filters.projectStatus === "termines" && "Projets terminés"}
                        {filters.projectStatus === "en_attente" && "Projets en attente"}
                        <button onClick={() => removeFilter('projectStatus')} className="hover:text-primary/70">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    {filters.availability !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                        {filters.availability === "disponible" ? "Disponible" : "Occupé"}
                        <button onClick={() => removeFilter('availability')} className="hover:text-primary/70">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    {filters.hasDossiers !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5">
                        {filters.hasDossiers === "has" ? "Avec dossiers" : "Sans dossiers"}
                        <button onClick={() => removeFilter('hasDossiers')} className="hover:text-primary/70">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Content - Based on real project data */}
              {isFiltersOpen && (
                <div className="border-t border-slate-600/30 p-2.5 bg-slate-800/60">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* Project Status Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        Statut projet
                      </label>
                      <Select
                        value={filters.projectStatus}
                        onValueChange={(value) => setFilters(f => ({ ...f, projectStatus: value as any }))}
                      >
                        <SelectTrigger className="h-8 w-full bg-slate-700/60 border-slate-600/40 text-white text-xs hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="all" className="text-white text-xs">Tous les statuts</SelectItem>
                          <SelectItem value="en_cours" className="text-white text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            Projets en cours
                          </SelectItem>
                          <SelectItem value="termines" className="text-white text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            Projets terminés
                          </SelectItem>
                          <SelectItem value="en_attente" className="text-white text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                            Projets en attente
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Availability Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3 text-cyan-400" />
                        Disponibilité
                      </label>
                      <Select
                        value={filters.availability}
                        onValueChange={(value) => setFilters(f => ({ ...f, availability: value as any }))}
                      >
                        <SelectTrigger className="h-8 w-full bg-slate-700/60 border-slate-600/40 text-white text-xs hover:border-cyan-400/40 hover:bg-slate-700/80 transition-all">
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="all" className="text-white text-xs">Tous</SelectItem>
                          <SelectItem value="disponible" className="text-white text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            Disponible
                          </SelectItem>
                          <SelectItem value="occupe" className="text-white text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                            Occupé
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Has Dossiers Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <FolderOpen className="w-3 h-3 text-purple-400" />
                        Dossiers
                      </label>
                      <Select
                        value={filters.hasDossiers}
                        onValueChange={(value) => setFilters(f => ({ ...f, hasDossiers: value as any }))}
                      >
                        <SelectTrigger className="h-8 w-full bg-slate-700/60 border-slate-600/40 text-white text-xs hover:border-purple-400/40 hover:bg-slate-700/80 transition-all">
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="all" className="text-white text-xs">Tous</SelectItem>
                          <SelectItem value="has" className="text-white text-xs">Avec dossiers</SelectItem>
                          <SelectItem value="none" className="text-white text-xs">Sans dossiers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Architects Display */}
          <div className="flex-1 px-3 md:px-4 pb-4 md:pb-6 overflow-hidden">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {filteredArchitects.map((architect, index) => (
                      <ArchitectCard
                        key={architect.id}
                        architect={architect}
                        onViewDetails={handleViewDetails}
                        index={index}
                        currentUserId={user?.id}
                        isArchitect={isArchitect}
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
