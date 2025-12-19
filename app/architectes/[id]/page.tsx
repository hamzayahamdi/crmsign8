"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Mail, Phone, MapPin, FolderOpen, Clock, CheckCircle2, TrendingUp, Filter, X, Building2, MapPin as MapPinIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Architect } from "@/types/architect"
import type { Client, ProjectStatus } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { RoleGuard } from "@/components/role-guard"
import { Header } from "@/components/header"
import { DossierCardEnhanced } from "@/components/dossier-card-enhanced"
import { ClientDetailPanelRedesigned } from "@/components/client-detail-panel-redesigned"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Status groups for better filter organization
const statusGroups = {
  "en_attente": ["qualifie", "prise_de_besoin", "nouveau", "acompte_recu", "acompte_verse", "conception", "en_conception", "devis_negociation", "en_validation"],
  "en_cours": ["accepte", "premier_depot", "projet_en_cours", "chantier", "en_chantier", "facture_reglee"],
  "termines": ["termine", "livraison", "livraison_termine"],
  "inactifs": ["refuse", "perdu", "annule", "suspendu"]
}

export default function ArchitectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const architectId = params.id as string

  const { user } = useAuth()
  const [architect, setArchitect] = useState<Architect | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [filterProjectCategory, setFilterProjectCategory] = useState<"all" | "en_cours" | "termines" | "en_attente">("all")
  const [filterTypeProjet, setFilterTypeProjet] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterVille, setFilterVille] = useState<string>("all")
  const [activeStatFilter, setActiveStatFilter] = useState<"total" | "enCours" | "termines" | "revenue" | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "operator"
  const isArchitect = user?.role?.toLowerCase() === "architect"

  // Fetch architect and their clients from API
  useEffect(() => {
    const fetchArchitectData = async () => {
      try {
        // If architect is trying to view another architect's profile, redirect to their own
        if (isArchitect && !isAdmin && architectId !== user?.id) {
          console.log(`[Architect Detail] Architect trying to view other architect - redirecting to own profile`)
          router.replace(`/architectes/${user.id}`)
          return
        }

        // If no architectId, don't fetch
        if (!architectId) {
          console.error('[Architect Detail] No architect ID provided')
          return
        }

        setIsLoading(true)
        const token = localStorage.getItem("token")
        const response = await fetch(`/api/architects/${architectId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include'
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          // Handle API error response
          const errorMsg = result.error || 'Failed to fetch architect'
          console.error('[Architect Detail] API Error:', errorMsg, 'Status:', response.status)
          
          // If permission denied (403), redirect architect to their own profile
          if (response.status === 403 && isArchitect && user?.id) {
            console.log('[Architect Detail] Permission denied - redirecting to own profile')
            router.replace(`/architectes/${user.id}`)
            return
          }
          
          // If not found (404), show error
          if (response.status === 404) {
            setArchitect(null)
            setClients([])
            toast.error(`Architecte non trouvé`)
            // Redirect to architects list if viewing a non-existent architect
            if (!isArchitect || isAdmin) {
              router.push('/architectes')
            } else if (user?.id) {
              router.replace(`/architectes/${user.id}`)
            }
            return
          }
          
          setArchitect(null)
          setClients([])
          toast.error(`Erreur: ${errorMsg}`)
          return
        }

        if (result.success && result.data) {
          if (result.data.architect) {
            setArchitect(result.data.architect)
            setClients(result.data.clients || [])
            console.log(`✅ Loaded architect ${result.data.architect.nom} with ${result.data.clients?.length || 0} clients`)
          } else {
            console.error('[Architect Detail] No architect data in response')
            setArchitect(null)
            setClients([])
          }
        } else {
          console.error('[Architect Detail] Invalid response format:', result)
          setArchitect(null)
          setClients([])
        }
      } catch (error) {
        console.error('[Architect Detail] Error fetching architect:', error)
        setArchitect(null)
        setClients([])
        toast.error('Erreur lors du chargement de l\'architecte')
      } finally {
        setIsLoading(false)
      }
    }

    if (architectId && user) {
      fetchArchitectData()
    }
  }, [architectId, user?.id, isArchitect, isAdmin, router])

  // Filter clients (API already returns only this architect's clients)
  // Also deduplicate by opportunityId to prevent duplicate projects
  const architectClients = useMemo(() => {
    let filtered = [...clients]

    // Remove duplicates based on opportunityId (for opportunities) or id (for legacy clients)
    // Also check for duplicates based on contact + project title + budget
    const seenOpportunityIds = new Set<string>()
    const seenClientIds = new Set<string>()
    const seenProjectKeys = new Set<string>() // For additional duplicate detection by contact + title + budget
    const seenContactProjectKeys = new Set<string>() // For duplicate detection by contact name + title (normalized)
    
    filtered = filtered.filter(client => {
      // For opportunities (contact-based), deduplicate by opportunityId
      if (client.opportunityId) {
        // First check: exact opportunityId match
        if (seenOpportunityIds.has(client.opportunityId)) {
          return false // Duplicate opportunity, skip it
        }
        seenOpportunityIds.add(client.opportunityId)
        
        // Normalize project title for comparison (remove extra spaces, lowercase)
        const normalizedTitle = (client.nomProjet || client.nom || '').trim().toLowerCase().replace(/\s+/g, ' ')
        const normalizedContactName = (client.nom || '').trim().toLowerCase().replace(/\s+/g, ' ')
        const budget = client.budget || 0
        
        // Second check: same contact + project title + budget (catch true duplicates)
        const projectKey = `${client.contactId || ''}-${normalizedTitle}-${budget}`
        if (seenProjectKeys.has(projectKey)) {
          return false // Duplicate project, skip it
        }
        seenProjectKeys.add(projectKey)
        
        // Third check: same contact name + project title (normalized) - aggressive deduplication
        const contactProjectKey = `${normalizedContactName}-${normalizedTitle}`
        if (seenContactProjectKeys.has(contactProjectKey)) {
          // Only treat as duplicate if title is not empty/generic
          if (normalizedTitle && normalizedTitle.length > 2 && 
              normalizedContactName && normalizedContactName.length > 0 &&
              normalizedTitle !== 'autre' && normalizedTitle !== 'autre -') {
            return false // Duplicate project by contact + title, skip it
          }
        }
        seenContactProjectKeys.add(contactProjectKey)
        
        return true
      }
      // For legacy clients, deduplicate by id
      if (seenClientIds.has(client.id)) {
        return false // Duplicate client, skip it
      }
      seenClientIds.add(client.id)
      return true
    })

    // Apply stat filter (from clicking on KPI cards)
    if (activeStatFilter) {
      // Filter out refused, lost, and cancelled projects first
      filtered = filtered.filter(c => 
        c.statutProjet !== "refuse" &&
        c.statutProjet !== "perdu" &&
        c.statutProjet !== "annule" &&
        c.statutProjet !== "suspendu"
      )

      if (activeStatFilter === "enCours") {
        // Projet en cours - devis accepted and working on project
        filtered = filtered.filter(c => {
          const statut = c.statutProjet
          return statut === "accepte" ||
            statut === "premier_depot" ||
            statut === "projet_en_cours" ||
            statut === "chantier" ||
            statut === "facture_reglee" ||
            statut === "en_chantier"
        })
      } else if (activeStatFilter === "termines") {
        // Projet livré - completed/delivered projects
        filtered = filtered.filter(c => 
          c.statutProjet === "termine" || 
          c.statutProjet === "livraison_termine" ||
          c.statutProjet === "livraison"
        )
      } else if (activeStatFilter === "revenue") {
        // Revenue filter - show all active projects (already filtered above)
        // No additional filtering needed
      }
      // "total" filter shows all active projects (already filtered above)
    }

    // Apply project category filter (grouped by meaningful categories)
    if (filterProjectCategory !== "all") {
      if (filterProjectCategory === "en_cours") {
        // Projet en cours - devis accepted and working on project
        filtered = filtered.filter(c => {
          const statut = c.statutProjet
          return statut === "accepte" ||
            statut === "premier_depot" ||
            statut === "projet_en_cours" ||
            statut === "chantier" ||
            statut === "facture_reglee" ||
            statut === "en_chantier"
        })
      } else if (filterProjectCategory === "termines") {
        // Projet livré - completed/delivered projects
        filtered = filtered.filter(c => 
          c.statutProjet === "termine" || 
          c.statutProjet === "livraison_termine" ||
          c.statutProjet === "livraison"
        )
      } else if (filterProjectCategory === "en_attente") {
        // Projet en attente - acompte reçu but devis not yet accepted
        filtered = filtered.filter(c => {
          const statut = c.statutProjet
          return statut === "acompte_recu" ||
            statut === "acompte_verse" ||
            statut === "conception" ||
            statut === "en_conception" ||
            statut === "devis_negociation" ||
            statut === "en_validation" ||
            statut === "prise_de_besoin" ||
            statut === "qualifie" ||
            statut === "nouveau"
        })
      }
    }

    // Apply project type filter
    if (filterTypeProjet !== "all") {
      filtered = filtered.filter(c => c.typeProjet === filterTypeProjet)
    }

    // Apply status filter (specific status)
    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.statutProjet === filterStatus)
    }

    // Apply ville filter
    if (filterVille !== "all") {
      filtered = filtered.filter(c => c.ville === filterVille)
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.derniereMaj).getTime() - new Date(a.derniereMaj).getTime())

    return filtered
  }, [clients, filterProjectCategory, filterTypeProjet, filterStatus, filterVille, activeStatFilter])

  // Calculate KPIs - Exclude refused/lost/cancelled projects from active counts
  // CATEGORIZATION LOGIC:
  // - Projet livré: livraison_termine, livraison, termine
  // - Projet en cours: accepte (devis accepté) + premier_depot, projet_en_cours, chantier, facture_reglee
  // - Projet en attente: acompte_recu, conception, devis_negociation, prise_de_besoin, qualifie, nouveau (NOT accepte)
  const kpis = useMemo(() => {
    // Filter out refused, lost, and cancelled projects from all calculations
    const activeProjects = architectClients.filter(c => 
      c.statutProjet !== "refuse" &&
      c.statutProjet !== "perdu" &&
      c.statutProjet !== "annule" &&
      c.statutProjet !== "suspendu"
    )
    
    const total = activeProjects.length
    
    // Projet livré - completed/delivered projects
    const termines = activeProjects.filter(c => 
      c.statutProjet === "termine" || 
      c.statutProjet === "livraison_termine" ||
      c.statutProjet === "livraison"
    ).length
    
    // Projet en cours - devis accepted and working on project
    const enCours = activeProjects.filter(c => {
      const statut = c.statutProjet
      return statut === "accepte" ||
        statut === "premier_depot" ||
        statut === "projet_en_cours" ||
        statut === "chantier" ||
        statut === "facture_reglee" ||
        statut === "en_chantier"
    }).length
    
    // Projet en attente - acompte reçu but devis not yet accepted
    const enAttente = activeProjects.filter(c => {
      const statut = c.statutProjet
      return statut === "acompte_recu" ||
        statut === "acompte_verse" ||
        statut === "conception" ||
        statut === "en_conception" ||
        statut === "devis_negociation" ||
        statut === "en_validation" ||
        statut === "prise_de_besoin" ||
        statut === "qualifie" ||
        statut === "nouveau"
    }).length
    
    // Only count revenue from active projects (exclude refused/lost)
    const totalRevenue = activeProjects.reduce((sum, c) => sum + (c.budget || 0), 0)

    return { total, enCours, termines, enAttente, totalRevenue }
  }, [architectClients])

  const handleClientClick = (client: Client) => {
    setSelectedClient(client)
    setIsDetailPanelOpen(true)
  }

  const handleUpdateClient = (updatedClient: Client) => {
    const updatedClients = clients.map(c => c.id === updatedClient.id ? updatedClient : c)
    setClients(updatedClients)
    setSelectedClient(updatedClient)
    // Note: Client updates should be handled by the client detail page API
  }


  const handleStatCardClick = (statType: "total" | "enCours" | "termines" | "revenue") => {
    // Toggle filter: if clicking the same stat, clear it; otherwise set it
    if (activeStatFilter === statType) {
      setActiveStatFilter(null)
      setFilterStatus("all") // Also clear status filter when clearing stat filter
    } else {
      setActiveStatFilter(statType)
      setFilterStatus("all") // Clear status filter when applying stat filter
      setFilterProjectCategory("all") // Clear category filter when applying stat filter
    }
  }

  // Get unique values for filters
  const uniqueVilles = useMemo(() => {
    return Array.from(new Set(clients.map(c => c.ville).filter(v => v && v.trim() !== ""))).sort()
  }, [clients])

  const uniqueProjectTypes = useMemo(() => {
    const types = Array.from(new Set(clients.map(c => c.typeProjet).filter(t => t))).sort()
    return types
  }, [clients])

  // Get available statuses from actual data
  const availableStatuses = useMemo(() => {
    const statuses = Array.from(new Set(clients.map(c => c.statutProjet).filter(s => s)))
    return statuses.sort()
  }, [clients])

  const getInitials = (nom: string, prenom: string) => {
    return `${prenom[0]}${nom[0]}`.toUpperCase()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }


  if (isLoading) {
    return (
      <AuthGuard>
        <RoleGuard allowedRoles={['Admin', 'Operator', 'Architect']}>
          <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
            <Sidebar />
            <main className="flex-1 flex items-center justify-center">
              <div className="glass rounded-xl border border-slate-600/30 p-6 max-w-xl w-full text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                <h2 className="text-base font-bold text-white mb-1.5">Chargement...</h2>
                <p className="text-xs text-slate-400">Veuillez patienter</p>
              </div>
            </main>
          </div>
        </RoleGuard>
      </AuthGuard>
    )
  }

  if (!architect) {
    return (
      <AuthGuard>
        <RoleGuard allowedRoles={['Admin', 'Operator', 'Architect']}>
          <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
            <Sidebar />
            <main className="flex-1 flex items-center justify-center">
              <div className="glass rounded-xl border border-slate-600/30 p-6 max-w-xl w-full text-center">
                <h2 className="text-lg font-bold text-white mb-1.5">Architecte non trouvé</h2>
                <p className="text-xs text-slate-400 mb-3">L'architecte demandé n'existe pas.</p>
                <Button onClick={() => router.push("/architectes")} className="h-8 text-xs">
                  Retour aux architectes
                </Button>
              </div>
            </main>
          </div>
        </RoleGuard>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['Admin', 'Operator', 'Architect']}>
        <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
          <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          
          {/* Back Button */}
          <div className="px-3 md:px-4 pt-3 md:pt-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/architectes")}
              className="text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg h-8 px-3 text-xs font-medium transition-all duration-200 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
              Retour
            </Button>
          </div>

          {/* Architect Header */}
          <div className="px-3 md:px-4 pb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4 md:p-6 border border-slate-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-xl shadow-xl"
            >
              <div className="flex items-start gap-4 md:gap-5">
                {/* Avatar */}
                <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-primary/50 shadow-lg shadow-primary/20 ring-2 ring-primary/10">
                  {architect.photo ? (
                    <AvatarImage src={architect.photo} alt={`${architect.prenom} ${architect.nom}`} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white font-bold text-lg md:text-xl">
                    {getInitials(architect.nom, architect.prenom)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-white mb-3">
                    {architect.prenom} {architect.nom}
                  </h1>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-300">
                    <div className="flex items-center gap-1.5 group">
                      <div className="p-1.5 rounded-lg bg-slate-700/30 group-hover:bg-primary/20 transition-colors">
                        <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="font-medium">{architect.email}</span>
                    </div>
                    {architect.telephone && (
                      <div className="flex items-center gap-1.5 group">
                        <div className="p-1.5 rounded-lg bg-slate-700/30 group-hover:bg-primary/20 transition-colors">
                          <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="font-medium">{architect.telephone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 group">
                      <div className="p-1.5 rounded-lg bg-slate-700/30 group-hover:bg-primary/20 transition-colors">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <span className="font-medium">{architect.ville}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* KPI Cards */}
          <div className="px-3 md:px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: activeStatFilter === "total" ? 1.02 : 1,
                  borderColor: activeStatFilter === "total" ? "rgba(59, 130, 246, 0.5)" : undefined
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => handleStatCardClick("total")}
                className={cn(
                  "group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-900/50 border p-4 cursor-pointer transition-all duration-300 backdrop-blur-sm",
                  activeStatFilter === "total" 
                    ? "border-blue-500/50 shadow-xl shadow-blue-500/20 ring-2 ring-blue-500/30 bg-gradient-to-br from-blue-500/15 to-slate-900/50" 
                    : "border-slate-700/50 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Total</p>
                    <motion.p 
                      key={kpis.total}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl font-bold text-white leading-tight"
                    >
                      {kpis.total}
                    </motion.p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dossiers</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <motion.div 
                      animate={{ 
                        scale: activeStatFilter === "total" ? 1.1 : 1,
                        rotate: activeStatFilter === "total" ? [0, -5, 5, -5, 0] : 0
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
                    >
                      <FolderOpen className="w-5 h-5 text-blue-400" />
                    </motion.div>
                  </div>
                </div>
                {activeStatFilter === "total" && (
                  <>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400"
                    />
                    <motion.div
                      animate={{ 
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-blue-500/5 rounded-lg pointer-events-none"
                    />
                  </>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: activeStatFilter === "enCours" ? 1.02 : 1,
                  borderColor: activeStatFilter === "enCours" ? "rgba(59, 130, 246, 0.5)" : undefined
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => handleStatCardClick("enCours")}
                className={cn(
                  "group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-900/50 border p-4 cursor-pointer transition-all duration-300 backdrop-blur-sm",
                  activeStatFilter === "enCours" 
                    ? "border-blue-500/50 shadow-xl shadow-blue-500/20 ring-2 ring-blue-500/30 bg-gradient-to-br from-blue-500/15 to-slate-900/50" 
                    : "border-slate-700/50 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Projet en cours</p>
                    <motion.p 
                      key={kpis.enCours}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl font-bold text-blue-400 leading-tight"
                    >
                      {kpis.enCours}
                    </motion.p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dossiers</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <motion.div 
                      animate={{ 
                        scale: activeStatFilter === "enCours" ? 1.1 : 1,
                        rotate: activeStatFilter === "enCours" ? [0, -5, 5, -5, 0] : 0
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
                    >
                      <Clock className="w-5 h-5 text-blue-400" />
                    </motion.div>
                  </div>
                </div>
                {activeStatFilter === "enCours" && (
                  <>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400"
                    />
                    <motion.div
                      animate={{ 
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-blue-500/5 rounded-lg pointer-events-none"
                    />
                  </>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: activeStatFilter === "termines" ? 1.02 : 1,
                  borderColor: activeStatFilter === "termines" ? "rgba(34, 197, 94, 0.5)" : undefined
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => handleStatCardClick("termines")}
                className={cn(
                  "group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-900/50 border p-4 cursor-pointer transition-all duration-300 backdrop-blur-sm",
                  activeStatFilter === "termines" 
                    ? "border-green-500/50 shadow-xl shadow-green-500/20 ring-2 ring-green-500/30 bg-gradient-to-br from-green-500/15 to-slate-900/50" 
                    : "border-slate-700/50 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Projet livré</p>
                    <motion.p 
                      key={kpis.termines}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl font-bold text-green-400 leading-tight"
                    >
                      {kpis.termines}
                    </motion.p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dossiers</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <motion.div 
                      animate={{ 
                        scale: activeStatFilter === "termines" ? 1.1 : 1,
                        rotate: activeStatFilter === "termines" ? [0, -5, 5, -5, 0] : 0
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </motion.div>
                  </div>
                </div>
                {activeStatFilter === "termines" && (
                  <>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-green-400"
                    />
                    <motion.div
                      animate={{ 
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-green-500/5 rounded-lg pointer-events-none"
                    />
                  </>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: activeStatFilter === "revenue" ? 1.02 : 1,
                  borderColor: activeStatFilter === "revenue" ? "rgba(168, 85, 247, 0.5)" : undefined
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => handleStatCardClick("revenue")}
                className={cn(
                  "group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-900/50 border p-4 cursor-pointer transition-all duration-300 backdrop-blur-sm",
                  activeStatFilter === "revenue" 
                    ? "border-purple-500/50 shadow-xl shadow-purple-500/20 ring-2 ring-purple-500/30 bg-gradient-to-br from-purple-500/15 to-slate-900/50" 
                    : "border-slate-700/50 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Revenu</p>
                    <motion.p 
                      key={kpis.totalRevenue}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-lg font-bold text-purple-400 leading-tight"
                    >
                      {formatCurrency(kpis.totalRevenue)}
                    </motion.p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Total</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <motion.div 
                      animate={{ 
                        scale: activeStatFilter === "revenue" ? 1.1 : 1,
                        rotate: activeStatFilter === "revenue" ? [0, -5, 5, -5, 0] : 0
                      }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"
                    >
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                    </motion.div>
                  </div>
                </div>
                {activeStatFilter === "revenue" && (
                  <>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-purple-400"
                    />
                    <motion.div
                      animate={{ 
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-purple-500/5 rounded-lg pointer-events-none"
                    />
                  </>
                )}
              </motion.div>
            </div>
          </div>

          {/* Dossiers Section */}
          <div className="px-3 md:px-4 pb-4">
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg md:text-xl font-bold text-white">Dossiers</h2>
                {activeStatFilter && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border backdrop-blur-sm",
                      activeStatFilter === "total" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                      activeStatFilter === "enCours" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                      activeStatFilter === "termines" && "bg-green-500/20 text-green-400 border-green-500/30",
                      activeStatFilter === "revenue" && "bg-purple-500/20 text-purple-400 border-purple-500/30"
                    )}
                  >
                    {activeStatFilter === "total" && `Filtré: Total (${architectClients.length})`}
                    {activeStatFilter === "enCours" && `Filtré: Projet en cours (${architectClients.length})`}
                    {activeStatFilter === "termines" && `Filtré: Projet livré (${architectClients.length})`}
                    {activeStatFilter === "revenue" && `Filtré: Revenu (${architectClients.length})`}
                  </motion.div>
                )}
                {!activeStatFilter && architectClients.length > 0 && (
                  <span className="text-sm text-slate-400 font-medium">
                    {architectClients.length} {architectClients.length === 1 ? 'dossier' : 'dossiers'}
                  </span>
                )}
              </div>
            </div>

            {/* Enhanced Filters */}
            {clients.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-3.5 border border-slate-700/40 bg-gradient-to-br from-slate-800/50 to-slate-900/30 mb-4 backdrop-blur-xl"
              >
                <div className="flex flex-col gap-3">
                  {/* Filter Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">Filtres</span>
                      {(filterStatus !== "all" || filterVille !== "all" || filterTypeProjet !== "all" || activeStatFilter !== null) && (
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-medium">
                          {[
                            filterStatus !== "all" ? 1 : 0,
                            filterVille !== "all" ? 1 : 0,
                            filterTypeProjet !== "all" ? 1 : 0,
                            activeStatFilter !== null ? 1 : 0
                          ].reduce((a, b) => a + b, 0)} actif{[
                            filterStatus !== "all" ? 1 : 0,
                            filterVille !== "all" ? 1 : 0,
                            filterTypeProjet !== "all" ? 1 : 0,
                            activeStatFilter !== null ? 1 : 0
                          ].reduce((a, b) => a + b, 0) > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {(filterStatus !== "all" || filterVille !== "all" || filterTypeProjet !== "all" || activeStatFilter !== null) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFilterStatus("all")
                          setFilterVille("all")
                          setFilterTypeProjet("all")
                          setActiveStatFilter(null)
                          setFilterProjectCategory("all")
                        }}
                        className="h-7 px-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg text-[10px] transition-colors"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>

                  {/* Filter Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Status Filter - Grouped by meaningful categories */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-blue-400" />
                        Statut du projet
                      </label>
                      <Select 
                        value={filterStatus} 
                        onValueChange={(v) => {
                          setFilterStatus(v)
                          setActiveStatFilter(null) // Clear stat filter when using status filter
                          setFilterProjectCategory("all")
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-9 w-full bg-slate-800/60 border text-white rounded-lg text-xs px-3 transition-all",
                          filterStatus !== "all" 
                            ? "border-primary/50 shadow-md shadow-primary/10" 
                            : "border-slate-600/50 hover:border-primary/40"
                        )}>
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent className="glass border-slate-600/30 bg-slate-800/95 backdrop-blur-xl max-h-[300px]">
                          <SelectItem value="all" className="text-white text-xs font-medium">Tous les statuts</SelectItem>
                          
                          {/* En attente group */}
                          <div className="px-2 py-1.5">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">En attente</div>
                            {availableStatuses.filter(s => statusGroups.en_attente.includes(s)).map(status => (
                              <SelectItem key={status} value={status} className="text-white text-xs pl-4">
                                {status === "qualifie" && "Qualifié"}
                                {status === "prise_de_besoin" && "Prise de besoin"}
                                {status === "acompte_recu" && "Acompte reçu"}
                                {status === "acompte_verse" && "Acompte versé"}
                                {status === "conception" && "Conception"}
                                {status === "en_conception" && "En conception"}
                                {status === "devis_negociation" && "Devis / Négociation"}
                                {status === "en_validation" && "En validation"}
                                {status === "nouveau" && "Nouveau"}
                                {!["qualifie", "prise_de_besoin", "acompte_recu", "acompte_verse", "conception", "en_conception", "devis_negociation", "en_validation", "nouveau"].includes(status) && status}
                              </SelectItem>
                            ))}
                          </div>

                          {/* En cours group */}
                          {availableStatuses.some(s => statusGroups.en_cours.includes(s)) && (
                            <div className="px-2 py-1.5 border-t border-slate-700/50">
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">En cours</div>
                              {availableStatuses.filter(s => statusGroups.en_cours.includes(s)).map(status => (
                                <SelectItem key={status} value={status} className="text-white text-xs pl-4">
                                  {status === "accepte" && "Accepté"}
                                  {status === "premier_depot" && "1er Dépôt"}
                                  {status === "projet_en_cours" && "Projet en cours"}
                                  {status === "chantier" && "Chantier"}
                                  {status === "en_chantier" && "En chantier"}
                                  {status === "facture_reglee" && "Facture réglée"}
                                  {!["accepte", "premier_depot", "projet_en_cours", "chantier", "en_chantier", "facture_reglee"].includes(status) && status}
                                </SelectItem>
                              ))}
                            </div>
                          )}

                          {/* Terminés group */}
                          {availableStatuses.some(s => statusGroups.termines.includes(s)) && (
                            <div className="px-2 py-1.5 border-t border-slate-700/50">
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Terminés</div>
                              {availableStatuses.filter(s => statusGroups.termines.includes(s)).map(status => (
                                <SelectItem key={status} value={status} className="text-white text-xs pl-4">
                                  {status === "termine" && "Terminé"}
                                  {status === "livraison" && "Livraison"}
                                  {status === "livraison_termine" && "Livraison & Terminé"}
                                  {!["termine", "livraison", "livraison_termine"].includes(status) && status}
                                </SelectItem>
                              ))}
                            </div>
                          )}

                          {/* Inactifs group */}
                          {availableStatuses.some(s => statusGroups.inactifs.includes(s)) && (
                            <div className="px-2 py-1.5 border-t border-slate-700/50">
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Inactifs</div>
                              {availableStatuses.filter(s => statusGroups.inactifs.includes(s)).map(status => (
                                <SelectItem key={status} value={status} className="text-white text-xs pl-4">
                                  {status === "refuse" && "Refusé"}
                                  {status === "perdu" && "Perdu"}
                                  {status === "annule" && "Annulé"}
                                  {status === "suspendu" && "Suspendu"}
                                  {!["refuse", "perdu", "annule", "suspendu"].includes(status) && status}
                                </SelectItem>
                              ))}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Project Type Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-purple-400" />
                        Type de projet
                      </label>
                      <Select 
                        value={filterTypeProjet} 
                        onValueChange={setFilterTypeProjet}
                      >
                        <SelectTrigger className={cn(
                          "h-9 w-full bg-slate-800/60 border text-white rounded-lg text-xs px-3 transition-all",
                          filterTypeProjet !== "all" 
                            ? "border-purple-500/50 shadow-md shadow-purple-500/10" 
                            : "border-slate-600/50 hover:border-purple-500/40"
                        )}>
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent className="glass border-slate-600/30 bg-slate-800/95 backdrop-blur-xl">
                          <SelectItem value="all" className="text-white text-xs font-medium">Tous les types</SelectItem>
                          {uniqueProjectTypes.map(type => {
                            const labels: Record<string, string> = {
                              appartement: "Appartement",
                              villa: "Villa",
                              magasin: "Magasin",
                              bureau: "Bureau",
                              riad: "Riad",
                              studio: "Studio",
                              autre: "Autre"
                            }
                            return (
                              <SelectItem key={type} value={type} className="text-white text-xs">
                                {labels[type] || type}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ville Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPinIcon className="w-3 h-3 text-green-400" />
                        Ville
                      </label>
                      <Select 
                        value={filterVille} 
                        onValueChange={setFilterVille}
                      >
                        <SelectTrigger className={cn(
                          "h-9 w-full bg-slate-800/60 border text-white rounded-lg text-xs px-3 transition-all",
                          filterVille !== "all" 
                            ? "border-green-500/50 shadow-md shadow-green-500/10" 
                            : "border-slate-600/50 hover:border-green-500/40"
                        )}>
                          <SelectValue placeholder="Toutes les villes" />
                        </SelectTrigger>
                        <SelectContent className="glass border-slate-600/30 bg-slate-800/95 backdrop-blur-xl max-h-[250px]">
                          <SelectItem value="all" className="text-white text-xs font-medium">Toutes les villes</SelectItem>
                          {uniqueVilles.map(ville => (
                            <SelectItem key={ville} value={ville} className="text-white text-xs">
                              {ville}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Active Filter Chips */}
                  {(filterStatus !== "all" || filterVille !== "all" || filterTypeProjet !== "all" || activeStatFilter !== null) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                      {filterStatus !== "all" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5"
                        >
                          Statut: {filterStatus === "qualifie" && "Qualifié"}
                          {filterStatus === "prise_de_besoin" && "Prise de besoin"}
                          {filterStatus === "acompte_recu" && "Acompte reçu"}
                          {filterStatus === "accepte" && "Accepté"}
                          {filterStatus === "termine" && "Terminé"}
                          {filterStatus === "livraison_termine" && "Terminé"}
                          {!["qualifie", "prise_de_besoin", "acompte_recu", "accepte", "termine", "livraison_termine"].includes(filterStatus) && filterStatus}
                          <button 
                            onClick={() => setFilterStatus("all")}
                            className="hover:text-blue-300 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      )}
                      {filterTypeProjet !== "all" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5"
                        >
                          Type: {filterTypeProjet === "appartement" && "Appartement"}
                          {filterTypeProjet === "villa" && "Villa"}
                          {filterTypeProjet === "magasin" && "Magasin"}
                          {filterTypeProjet === "bureau" && "Bureau"}
                          {filterTypeProjet === "riad" && "Riad"}
                          {filterTypeProjet === "studio" && "Studio"}
                          {filterTypeProjet === "autre" && "Autre"}
                          {!["appartement", "villa", "magasin", "bureau", "riad", "studio", "autre"].includes(filterTypeProjet) && filterTypeProjet}
                          <button 
                            onClick={() => setFilterTypeProjet("all")}
                            className="hover:text-purple-300 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      )}
                      {filterVille !== "all" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5"
                        >
                          Ville: {filterVille}
                          <button 
                            onClick={() => setFilterVille("all")}
                            className="hover:text-green-300 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      )}
                      {activeStatFilter && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5 border",
                            activeStatFilter === "total" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                            activeStatFilter === "enCours" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                            activeStatFilter === "termines" && "bg-green-500/20 text-green-400 border-green-500/30",
                            activeStatFilter === "revenue" && "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          )}
                        >
                          {activeStatFilter === "total" && "Total"}
                          {activeStatFilter === "enCours" && "Projet en cours"}
                          {activeStatFilter === "termines" && "Projet livré"}
                          {activeStatFilter === "revenue" && "Revenu"}
                          <button 
                            onClick={() => setActiveStatFilter(null)}
                            className="hover:opacity-70 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {architectClients.length === 0 ? (
              <div className="glass rounded-2xl border border-slate-700/40 bg-gradient-to-br from-slate-800/40 to-slate-900/20 p-8 md:p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/30 flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Aucun dossier</h3>
                <p className="text-sm text-slate-400">Cet architecte n'a pas encore de dossiers clients assignés.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`${activeStatFilter || "all"}-${filterStatus}-${filterVille}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
                >
                  {architectClients.map((client, index) => (
                    <motion.div
                      key={client.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ 
                        delay: Math.min(index * 0.02, 0.2),
                        duration: 0.25,
                        ease: "easeOut",
                        layout: { duration: 0.25 }
                      }}
                    >
                      <DossierCardEnhanced
                        client={client}
                        onOpen={handleClientClick}
                        index={index}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>

        {/* Client Detail Panel - Redesigned */}
        <ClientDetailPanelRedesigned
          client={selectedClient}
          isOpen={isDetailPanelOpen}
          onClose={() => setIsDetailPanelOpen(false)}
          onUpdate={handleUpdateClient}
        />

        </div>
      </RoleGuard>
    </AuthGuard>
  )
}
