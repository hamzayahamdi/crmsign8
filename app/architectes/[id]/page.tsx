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
        
        if (!response.ok) {
          throw new Error('Failed to fetch architect')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          setArchitect(result.data.architect)
          setClients(result.data.clients)
          console.log(`✅ Loaded architect with ${result.data.clients.length} clients`)
        }
      } catch (error) {
        console.error('Error fetching architect:', error)
        toast.error('Erreur lors du chargement de l\'architecte')
      } finally {
        setIsLoading(false)
      }
    }

    fetchArchitectData()
  }, [architectId])

  // Filter clients (API already returns only this architect's clients)
  const architectClients = useMemo(() => {
    let filtered = [...clients]

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

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = architectClients.length
    const enCours = architectClients.filter(c => 
      c.statutProjet !== "termine" && 
      c.statutProjet !== "livraison" && 
      c.statutProjet !== "livraison_termine" &&
      c.statutProjet !== "annule" &&
      c.statutProjet !== "refuse"
    ).length
    const termines = architectClients.filter(c => 
      c.statutProjet === "termine" || 
      c.statutProjet === "livraison_termine"
    ).length
    const enAttente = architectClients.filter(c => 
      c.statutProjet === "nouveau" || 
      c.statutProjet === "qualifie"
    ).length
    const totalRevenue = architectClients.reduce((sum, c) => sum + (c.budget || 0), 0)

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
              <div className="glass rounded-2xl border border-slate-600/30 p-8 max-w-xl w-full text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-white mb-2">Chargement...</h2>
                <p className="text-slate-400">Veuillez patienter</p>
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
              <div className="glass rounded-2xl border border-slate-600/30 p-8 max-w-xl w-full text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Architecte non trouvé</h2>
                <p className="text-slate-400 mb-4">L'architecte demandé n'existe pas.</p>
                <Button onClick={() => router.push("/architectes")}>
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
          <div className="px-4 pt-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/architectes")}
              className="text-slate-400 hover:text-white hover:bg-slate-800/50 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Retour
            </Button>
          </div>

          {/* Architect Header */}
          <div className="px-4 pb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 border border-slate-700/40"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <Avatar className="h-16 w-16 border-2 border-primary/40 shadow-lg shadow-primary/20">
                  {architect.photo ? (
                    <AvatarImage src={architect.photo} alt={`${architect.prenom} ${architect.nom}`} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white font-bold text-xl">
                    {getInitials(architect.nom, architect.prenom)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-xl font-bold text-white">
                      {architect.prenom} {architect.nom}
                    </h1>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                      statusConfig[architect.statut].color
                    )}>
                      <span className="relative flex h-1.5 w-1.5 mr-1.5">
                        <span className={cn(
                          "absolute inline-flex h-full w-full rounded-full opacity-75",
                          architect.statut === "actif" ? "animate-ping bg-current" : ""
                        )}></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                      </span>
                      {statusConfig[architect.statut].label}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {specialtyLabels[architect.specialite]}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{architect.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{architect.telephone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{architect.ville}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* KPI Cards */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass rounded-lg p-3 border border-slate-700/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-white">{kpis.total}</div>
                </div>
                <div className="text-xs text-slate-400">Total</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-lg p-3 border border-slate-700/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-xl font-bold text-white">{kpis.enCours}</div>
                </div>
                <div className="text-xs text-slate-400">En cours</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass rounded-lg p-3 border border-slate-700/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-xl font-bold text-white">{kpis.termines}</div>
                </div>
                <div className="text-xs text-slate-400">Terminés</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-lg p-3 border border-slate-700/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-base font-bold text-white">{formatCurrency(kpis.totalRevenue)}</div>
                </div>
                <div className="text-xs text-slate-400">Revenu</div>
              </motion.div>
            </div>
          </div>

          {/* Dossiers Section */}
          <div className="px-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">Dossiers</h2>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setIsAssignModalOpen(true)}
                  size="sm"
                  className="h-8 px-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-lg font-medium shadow-md shadow-primary/20 text-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Attribuer
                </Button>
              )}
            </div>

            {/* Filters */}
            {architectClients.length > 0 && (
              <div className="glass rounded-lg p-2.5 border border-slate-700/40 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="h-8 w-auto min-w-[130px] bg-slate-800/50 border-slate-700/50 text-white rounded-md text-xs px-2.5">
                      <SelectValue placeholder="État" />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      <SelectItem value="all" className="text-white text-xs">Tous les états</SelectItem>
                      <SelectItem value="qualifie" className="text-white text-xs">Qualifié</SelectItem>
                      <SelectItem value="prise_de_besoin" className="text-white text-xs">Prise de besoin</SelectItem>
                      <SelectItem value="acompte_recu" className="text-white text-xs">Acompte reçu</SelectItem>
                      <SelectItem value="conception" className="text-white text-xs">Conception</SelectItem>
                      <SelectItem value="projet_en_cours" className="text-white text-xs">Projet en cours</SelectItem>
                      <SelectItem value="accepte" className="text-white text-xs">Accepté</SelectItem>
                      <SelectItem value="livraison_termine" className="text-white text-xs">Terminé</SelectItem>
                      <SelectItem value="refuse" className="text-white text-xs">Refusé</SelectItem>
                      <SelectItem value="perdu" className="text-white text-xs">Perdu</SelectItem>
                      <SelectItem value="annule" className="text-white text-xs">Annulé</SelectItem>
                      <SelectItem value="suspendu" className="text-white text-xs">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterVille} onValueChange={setFilterVille}>
                    <SelectTrigger className="h-8 w-auto min-w-[110px] bg-slate-800/50 border-slate-700/50 text-white rounded-md text-xs px-2.5">
                      <SelectValue placeholder="Ville" />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      <SelectItem value="all" className="text-white text-xs">Toutes</SelectItem>
                      {uniqueVilles.map(ville => (
                        <SelectItem key={ville} value={ville} className="text-white text-xs">{ville}</SelectItem>
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
                      className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800/50 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Effacer
                    </Button>
                  )}
                </div>
              </div>
            )}

            {architectClients.length === 0 ? (
              <div className="glass rounded-xl border border-slate-700/40 p-10 text-center">
                <FolderOpen className="w-14 h-14 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Aucun dossier</h3>
                <p className="text-sm text-slate-400">Cet architecte n'a pas encore de dossiers clients assignés.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
