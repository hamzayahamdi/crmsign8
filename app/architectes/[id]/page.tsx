"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, TrendingUp, FolderOpen, Clock, CheckCircle2, AlertCircle, Plus, Bell, Filter, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Architect, ArchitectNotification } from "@/types/architect"
import type { Client, ProjectStatus } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { Header } from "@/components/header"
import { DossierCardEnhanced } from "@/components/dossier-card-enhanced"
import { ClientDetailPanelLuxe } from "@/components/client-detail-panel-luxe"
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
  const [notifications, setNotifications] = useState<ArchitectNotification[]>([])
  const [filterStatus, setFilterStatus] = useState<"all" | ProjectStatus>("all")
  const [filterVille, setFilterVille] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "priority" | "status">("date")
  
  const isAdmin = user?.role?.toLowerCase() === "admin"

  useEffect(() => {
    // Load architect
    const storedArchitects = localStorage.getItem("signature8-architects")
    if (storedArchitects) {
      const architects: Architect[] = JSON.parse(storedArchitects)
      const found = architects.find(a => a.id === architectId)
      setArchitect(found || null)
    }

    // Load clients
    const storedClients = localStorage.getItem("signature8-clients")
    if (storedClients) {
      setClients(JSON.parse(storedClients))
    }

    // Load notifications
    const storedNotifications = localStorage.getItem(`signature8-notifications-${architectId}`)
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications))
    }
  }, [architectId])

  // Filter clients for this architect
  const architectClients = useMemo(() => {
    if (!architect) return []
    let filtered = clients.filter(c => 
      c.architecteAssigne.toLowerCase().includes(architect.prenom.toLowerCase()) ||
      c.architecteAssigne.toLowerCase().includes(architect.nom.toLowerCase())
    )

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.statutProjet === filterStatus)
    }

    // Apply ville filter
    if (filterVille !== "all") {
      filtered = filtered.filter(c => c.ville === filterVille)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.derniereMaj).getTime() - new Date(a.derniereMaj).getTime()
      } else if (sortBy === "status") {
        return a.statutProjet.localeCompare(b.statutProjet)
      }
      return 0
    })

    return filtered
  }, [architect, clients, filterStatus, filterVille, sortBy])

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = architectClients.length
    const enCours = architectClients.filter(c => 
      c.statutProjet !== "termine" && c.statutProjet !== "livraison"
    ).length
    const termines = architectClients.filter(c => c.statutProjet === "termine").length
    const enAttente = architectClients.filter(c => c.statutProjet === "nouveau").length
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
    localStorage.setItem("signature8-clients", JSON.stringify(updatedClients))
  }

  const handleAssignDossiers = (clientIds: string[]) => {
    const architectName = `${architect!.prenom} ${architect!.nom}`
    const updatedClients = clients.map(client => {
      if (clientIds.includes(client.id)) {
        return {
          ...client,
          architecteAssigne: architectName,
          derniereMaj: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      return client
    })

    setClients(updatedClients)
    localStorage.setItem("signature8-clients", JSON.stringify(updatedClients))

    // Create notifications
    const newNotifications: ArchitectNotification[] = clientIds.map(clientId => {
      const client = clients.find(c => c.id === clientId)!
      return {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        architectId: architect!.id,
        type: "dossier_assigned" as const,
        title: "Nouveau dossier attribué",
        message: `Le dossier client "${client.nom}" vous a été attribué`,
        clientId: client.id,
        clientName: client.nom,
        isRead: false,
        createdAt: new Date().toISOString(),
      }
    })

    const allNotifications = [...newNotifications, ...notifications]
    setNotifications(allNotifications)
    localStorage.setItem(`signature8-notifications-${architect!.id}`, JSON.stringify(allNotifications))

    toast.success(`${clientIds.length} dossier${clientIds.length > 1 ? 's' : ''} attribué${clientIds.length > 1 ? 's' : ''} avec succès`)
    setIsAssignModalOpen(false)
  }

  const markNotificationAsRead = (notificationId: string) => {
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    )
    setNotifications(updated)
    localStorage.setItem(`signature8-notifications-${architectId}`, JSON.stringify(updated))
  }

  const unreadCount = notifications.filter(n => !n.isRead).length
  const uniqueVilles = Array.from(new Set(architectClients.map(c => c.ville))).sort()

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return formatDate(dateString)
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

  if (!architect) {
    return (
      <AuthGuard>
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
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
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

          {/* Compact Architect Header */}
          <div className="px-4 pb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 border border-slate-700/40"
            >
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-20 w-20 border-2 border-primary/40 shadow-lg shadow-primary/20">
                    {architect.photo ? (
                      <AvatarImage src={architect.photo} alt={`${architect.prenom} ${architect.nom}`} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white font-bold text-2xl">
                      {getInitials(architect.nom, architect.prenom)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name & Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                      <h1 className="text-2xl font-bold text-white mb-2">
                        {architect.prenom} {architect.nom}
                      </h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
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
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
                          <Briefcase className="w-3 h-3 mr-1.5" />
                          {specialtyLabels[architect.specialite]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Contact Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2 text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">
                      <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">Email</div>
                        <div className="text-sm font-medium truncate">{architect.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">
                      <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">Téléphone</div>
                        <div className="text-sm font-medium truncate">{architect.telephone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">
                      <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">Ville</div>
                        <div className="text-sm font-medium truncate">{architect.ville}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">
                      <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">Embauche</div>
                        <div className="text-sm font-medium truncate">{new Date(architect.dateEmbauche).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {architect.bio && (
                    <div className="mt-3 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
                      <p className="text-xs text-slate-400 leading-relaxed">{architect.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Compact KPI Cards */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="glass rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/60 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white leading-none">{kpis.total}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium">Total dossiers</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="glass rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/60 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white leading-none">{kpis.enCours}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium">En cours</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="glass rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/60 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white leading-none">{kpis.termines}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium">Terminés</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="glass rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/60 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white leading-none">{kpis.enAttente}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium">En attente</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="glass rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/60 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 col-span-2 md:col-span-1"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white leading-none">{formatCurrency(kpis.totalRevenue)}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium">Revenu total</div>
              </motion.div>
            </div>
          </div>

          {/* Compact Notifications Section */}
          {notifications.length > 0 && (
            <div className="px-4 pb-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-xl p-4 border border-slate-700/40"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {notifications.slice(0, 5).map((notif) => (
                    <motion.div
                      key={notif.id}
                      whileHover={{ x: 2 }}
                      onClick={() => markNotificationAsRead(notif.id)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        notif.isRead 
                          ? "bg-slate-800/20 border-slate-700/20" 
                          : "bg-primary/5 border-primary/20"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                          notif.isRead ? "bg-slate-500" : "bg-primary animate-pulse"
                        )} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-white font-medium mb-0.5">{notif.title}</h4>
                          <p className="text-xs text-slate-400 mb-1 line-clamp-2">{notif.message}</p>
                          <span className="text-xs text-slate-500">{getRelativeTime(notif.createdAt)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {/* Dossiers Section with Modern Toolbar */}
          <div className="px-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Dossiers clients</h2>
                <p className="text-xs text-slate-400">
                  {kpis.total} dossier{kpis.total > 1 ? 's' : ''} • {kpis.enCours} en cours • {kpis.termines} terminé{kpis.termines > 1 ? 's' : ''}
                  {kpis.enAttente > 0 && ` • ${kpis.enAttente} en attente`}
                </p>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setIsAssignModalOpen(true)}
                  size="sm"
                  className="h-9 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-lg font-medium shadow-md shadow-primary/20 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Attribuer
                </Button>
              )}
            </div>

            {/* Compact Modern Filters */}
            {architectClients.length > 0 && (
              <div className="glass rounded-lg p-3 border border-slate-700/40 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="h-8 w-auto min-w-[140px] bg-slate-800/50 border-slate-700/50 text-white rounded-lg text-xs px-3">
                      <SelectValue placeholder="État" />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      <SelectItem value="all" className="text-white text-xs">Tous les états</SelectItem>
                      <SelectItem value="nouveau" className="text-white text-xs">Nouveau</SelectItem>
                      <SelectItem value="acompte_verse" className="text-white text-xs">Acompte versé</SelectItem>
                      <SelectItem value="en_conception" className="text-white text-xs">En conception</SelectItem>
                      <SelectItem value="en_chantier" className="text-white text-xs">En chantier</SelectItem>
                      <SelectItem value="livraison" className="text-white text-xs">Livraison</SelectItem>
                      <SelectItem value="termine" className="text-white text-xs">Terminé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterVille} onValueChange={setFilterVille}>
                    <SelectTrigger className="h-8 w-auto min-w-[120px] bg-slate-800/50 border-slate-700/50 text-white rounded-lg text-xs px-3">
                      <SelectValue placeholder="Ville" />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      <SelectItem value="all" className="text-white text-xs">Toutes</SelectItem>
                      {uniqueVilles.map(ville => (
                        <SelectItem key={ville} value={ville} className="text-white text-xs">{ville}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="h-8 w-auto min-w-[120px] bg-slate-800/50 border-slate-700/50 text-white rounded-lg text-xs px-3">
                      <SelectValue placeholder="Trier" />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      <SelectItem value="date" className="text-white text-xs">Date MAJ</SelectItem>
                      <SelectItem value="status" className="text-white text-xs">État</SelectItem>
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

        {/* Client Detail Panel */}
        <ClientDetailPanelLuxe
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
    </AuthGuard>
  )
}
