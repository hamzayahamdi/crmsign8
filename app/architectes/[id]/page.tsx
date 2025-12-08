"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, TrendingUp, FolderOpen, Clock, CheckCircle2, AlertCircle, Plus, Filter, X } from "lucide-react"
import { motion } from "framer-motion"
import type { Architect } from "@/types/architect"
import type { Client, ProjectStatus } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { RoleGuard } from "@/components/role-guard"
import { Header } from "@/components/header"
import { DossierCardEnhanced } from "@/components/dossier-card-enhanced"
import { ClientDetailPanelRedesigned } from "@/components/client-detail-panel-redesigned"
import { AssignDossierModal } from "@/components/assign-dossier-modal"
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

export default function ArchitectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const architectId = params.id as string

  const { user } = useAuth()
  const [architect, setArchitect] = useState<Architect | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | ProjectStatus>("all")
  const [filterVille, setFilterVille] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  
  const isAdmin = user?.role?.toLowerCase() === "admin"

  // Fetch architect and their clients from API
  useEffect(() => {
    const fetchArchitectData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/architects/${architectId}`)
        
        const result = await response.json()
        
        if (!response.ok) {
          // Handle API error response
          const errorMsg = result.error || 'Failed to fetch architect'
          console.error('[Architect Detail] API Error:', errorMsg)
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

    if (architectId) {
      fetchArchitectData()
    }
  }, [architectId])

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

    // Apply status filter
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
  }, [clients, filterStatus, filterVille])

  // Calculate KPIs - Exclude refused/lost/cancelled projects from active counts
  const kpis = useMemo(() => {
    // Filter out refused, lost, and cancelled projects from all calculations
    const activeProjects = architectClients.filter(c => 
      c.statutProjet !== "refuse" &&
      c.statutProjet !== "perdu" &&
      c.statutProjet !== "annule"
    )
    
    const total = activeProjects.length
    const enCours = activeProjects.filter(c => {
      const statut = c.statutProjet
      // Exclude completed, refused, lost, cancelled, and waiting statuses
      return statut !== "termine" && 
        statut !== "livraison" && 
        statut !== "livraison_termine" &&
        statut !== "nouveau" &&
        statut !== "qualifie" &&
        statut !== "prise_de_besoin"
    }).length
    const termines = activeProjects.filter(c => 
      c.statutProjet === "termine" || 
      c.statutProjet === "livraison_termine"
    ).length
    const enAttente = activeProjects.filter(c => 
      c.statutProjet === "nouveau" || 
      c.statutProjet === "qualifie" ||
      c.statutProjet === "prise_de_besoin"
    ).length
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

  const handleAssignDossiers = async (clientIds: string[]) => {
    try {
      // Refresh data after assignment
      const response = await fetch(`/api/architects/${architectId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setClients(result.data.clients)
        }
      }
      toast.success(`${clientIds.length} dossier${clientIds.length > 1 ? 's' : ''} attribué${clientIds.length > 1 ? 's' : ''} avec succès`)
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
    setIsAssignModalOpen(false)
  }

  const uniqueVilles = Array.from(new Set(architectClients.map(c => c.ville).filter(v => v && v.trim() !== ""))).sort()

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

  const statusConfig = {
    actif: {
      label: "Actif",
      color: "bg-green-500/20 text-green-400 border-green-500/30"
    },
    inactif: {
      label: "Inactif",
      color: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    },
    conge: {
      label: "En congé",
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30"
    }
  }

  const specialtyLabels = {
    residentiel: "Résidentiel",
    commercial: "Commercial",
    industriel: "Industriel",
    renovation: "Rénovation",
    luxe: "Luxe",
    mixte: "Mixte"
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <RoleGuard allowedRoles={['Admin', 'Operator']}>
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
        <RoleGuard allowedRoles={['Admin', 'Operator']}>
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
      <RoleGuard allowedRoles={['Admin', 'Operator']}>
        <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
          <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          
          {/* Back Button */}
          <div className="px-3 md:px-4 pt-2 md:pt-3 pb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/architectes")}
              className="text-slate-400 hover:text-white hover:bg-slate-800/50 -ml-1 h-7 text-xs"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Retour
            </Button>
          </div>

          {/* Architect Header */}
          <div className="px-3 md:px-4 pb-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-3 border border-slate-700/40"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <Avatar className="h-12 w-12 border-2 border-primary/40 shadow-lg shadow-primary/20">
                  {architect.photo ? (
                    <AvatarImage src={architect.photo} alt={`${architect.prenom} ${architect.nom}`} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white font-bold text-sm">
                    {getInitials(architect.nom, architect.prenom)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h1 className="text-base font-bold text-white">
                      {architect.prenom} {architect.nom}
                    </h1>
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                      statusConfig[architect.statut].color
                    )}>
                      <span className="relative flex h-1.5 w-1.5 mr-1">
                        <span className={cn(
                          "absolute inline-flex h-full w-full rounded-full opacity-75",
                          architect.statut === "actif" ? "animate-ping bg-current" : ""
                        )}></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                      </span>
                      {statusConfig[architect.statut].label}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                      <Briefcase className="w-2.5 h-2.5 mr-1" />
                      {specialtyLabels[architect.specialite]}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{architect.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{architect.telephone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{architect.ville}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* KPI Cards */}
          <div className="px-3 md:px-4 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-white leading-tight">{kpis.total}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dossiers</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">En cours</p>
                    <p className="text-2xl font-bold text-orange-400 leading-tight">{kpis.enCours}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dossiers</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-green-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Terminés</p>
                    <p className="text-2xl font-bold text-green-400 leading-tight">{kpis.termines}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dossiers</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Revenu</p>
                    <p className="text-lg font-bold text-purple-400 leading-tight">{formatCurrency(kpis.totalRevenue)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Total</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Dossiers Section */}
          <div className="px-3 md:px-4 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div>
                <h2 className="text-base font-bold text-white">Dossiers</h2>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setIsAssignModalOpen(true)}
                  size="sm"
                  className="h-7 px-2.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-lg font-medium shadow-md shadow-primary/20 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Attribuer
                </Button>
              )}
            </div>

            {/* Filters */}
            {architectClients.length > 0 && (
              <div className="glass rounded-lg p-2 border border-slate-700/40 mb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Filter className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="h-7 w-auto min-w-[120px] bg-slate-800/50 border-slate-700/50 text-white rounded-md text-[11px] px-2">
                      <SelectValue placeholder="État" />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      <SelectItem value="all" className="text-white text-[11px]">Tous les états</SelectItem>
                      <SelectItem value="qualifie" className="text-white text-[11px]">Qualifié</SelectItem>
                      <SelectItem value="prise_de_besoin" className="text-white text-[11px]">Prise de besoin</SelectItem>
                      <SelectItem value="acompte_recu" className="text-white text-[11px]">Acompte reçu</SelectItem>
                      <SelectItem value="conception" className="text-white text-[11px]">Conception</SelectItem>
                      <SelectItem value="projet_en_cours" className="text-white text-[11px]">Projet en cours</SelectItem>
                      <SelectItem value="accepte" className="text-white text-[11px]">Accepté</SelectItem>
                      <SelectItem value="livraison_termine" className="text-white text-[11px]">Terminé</SelectItem>
                      <SelectItem value="refuse" className="text-white text-[11px]">Refusé</SelectItem>
                      <SelectItem value="perdu" className="text-white text-[11px]">Perdu</SelectItem>
                      <SelectItem value="annule" className="text-white text-[11px]">Annulé</SelectItem>
                      <SelectItem value="suspendu" className="text-white text-[11px]">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterVille} onValueChange={setFilterVille}>
                    <SelectTrigger className="h-7 w-auto min-w-[100px] bg-slate-800/50 border-slate-700/50 text-white rounded-md text-[11px] px-2">
                      <SelectValue placeholder="Ville" />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      <SelectItem value="all" className="text-white text-[11px]">Toutes</SelectItem>
                      {uniqueVilles.map(ville => (
                        <SelectItem key={ville} value={ville} className="text-white text-[11px]">{ville}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(filterStatus !== "all" || filterVille !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterStatus("all")
                        setFilterVille("all")
                      }}
                      className="h-7 px-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 text-[11px]"
                    >
                      <X className="w-3 h-3 mr-0.5" />
                      Effacer
                    </Button>
                  )}
                </div>
              </div>
            )}

            {architectClients.length === 0 ? (
              <div className="glass rounded-xl border border-slate-700/40 p-6 text-center">
                <FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white mb-1">Aucun dossier</h3>
                <p className="text-xs text-slate-400">Cet architecte n'a pas encore de dossiers clients assignés.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {architectClients.map((client, index) => (
                  <DossierCardEnhanced
                    key={client.id}
                    client={client}
                    onOpen={handleClientClick}
                    index={index}
                  />
                ))}
              </div>
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

        {/* Assign Dossier Modal */}
        {architect && (
          <AssignDossierModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            architect={architect}
            onAssign={handleAssignDossiers}
          />
        )}
        </div>
      </RoleGuard>
    </AuthGuard>
  )
}
