"use client"

import type { Lead, LeadStatus, LeadPriority } from "@/types/lead"
import { Phone, MapPin, User, Calendar, Edit, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Store, Globe, Facebook, Instagram, Users, Package, Music2, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { LeadsTableSkeleton } from "@/components/leads-table-skeleton"
import { useState } from "react"

interface LeadsTableProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  onDeleteLead: (leadId: string) => void
  onViewHistory?: (lead: Lead) => void
  searchQuery: string
  filters: {
    status: "all" | LeadStatus
    city: string
    type: string
    assigned: string
    priority: "all" | LeadPriority
    source: string
    campaign: string
  }
  isLoading?: boolean
  newlyAddedLeadId?: string | null
}

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: string }> = {
  nouveau: { label: "Nouveau", color: "bg-green-500/20 text-green-400 border-green-500/40", icon: "🟢" },
  a_recontacter: { label: "À recontacter", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", icon: "🟡" },
  sans_reponse: { label: "Sans réponse", color: "bg-orange-500/20 text-orange-400 border-orange-500/40", icon: "🟠" },
  non_interesse: { label: "Non intéressé", color: "bg-red-500/20 text-red-400 border-red-500/40", icon: "🔴" },
  converti: { label: "Converti", color: "bg-blue-500/20 text-blue-400 border-blue-500/40", icon: "🔵" },
}

const priorityConfig = {
  haute: { label: "Haute", color: "bg-green-500/20 text-green-400 border-green-500/40" },
  moyenne: { label: "Moyenne", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  basse: { label: "Basse", color: "bg-gray-500/20 text-gray-400 border-gray-500/40" },
}

const sourceIcons = {
  magasin: { icon: Store, label: "Magasin", color: "text-purple-400" },
  site_web: { icon: Globe, label: "Site web", color: "text-blue-400" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-400" },
  tiktok: { icon: Music2, label: "TikTok", color: "text-fuchsia-400" },
  reference_client: { icon: Users, label: "Recommandation", color: "text-green-400" },
  autre: { icon: Package, label: "Autre", color: "text-gray-400" },
}

type SortField = 'nom' | 'statut' | 'ville' | 'typeBien' | 'priorite' | 'derniereMaj' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export function LeadsTable({ leads, onLeadClick, onDeleteLead, onViewHistory, searchQuery, filters, isLoading = false, newlyAddedLeadId = null }: LeadsTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const passesSearch = (lead: Lead) => {
    if (!normalizedQuery) return true
    const haystack = [
      lead.nom,
      lead.telephone,
      lead.ville,
      lead.typeBien,
      lead.assignePar,
      lead.statutDetaille ?? "",
      lead.message ?? "",
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  }

  const passesFilters = (lead: Lead) => {
    if (filters.status !== "all" && lead.statut !== filters.status) return false
    if (filters.city !== "all" && lead.ville !== filters.city) return false
    if (filters.type !== "all" && lead.typeBien !== filters.type) return false
    if (filters.assigned !== "all" && lead.assignePar !== filters.assigned) return false
    if (filters.priority !== "all" && lead.priorite !== filters.priority) return false
    if (filters.source !== "all" && lead.source !== filters.source) return false
    if (filters.campaign !== "all" && lead.campaignName !== filters.campaign) return false
    return true
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-3.5 h-3.5 text-primary" /> : 
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
  }

  const filteredLeads = leads.filter(lead => passesSearch(lead) && passesFilters(lead))
  
  // Debug logging
  console.log(`[LeadsTable] Total leads received: ${leads.length}`)
  console.log(`[LeadsTable] After filtering: ${filteredLeads.length}`)
  console.log(`[LeadsTable] Filtered out: ${leads.length - filteredLeads.length}`)
  console.log(`[LeadsTable] Active filters:`, filters)
  console.log(`[LeadsTable] Search query: "${searchQuery}"`)

  // Sort leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue: any = a[sortField as keyof Lead]
    let bValue: any = b[sortField as keyof Lead]

    // Handle date fields
    if (sortField === 'derniereMaj' || sortField === 'createdAt') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    // Handle string fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // Show skeleton on initial load
  if (isLoading && leads.length === 0) {
    return <LeadsTableSkeleton rows={8} />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    
    // Reset time to midnight for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = today.getTime() - compareDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    // Show relative time for recent dates
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays > 0 && diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 0 && diffDays > -2) return "Aujourd'hui" // Handle timezone edge cases
    
    // Otherwise show formatted date
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getSourceDisplay = (lead: Lead) => {
    const sourceInfo = sourceIcons[lead.source as keyof typeof sourceIcons] || sourceIcons.autre
    const Icon = sourceInfo.icon
    
    if (lead.source === 'magasin' && lead.magasin) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Icon className={cn("w-4 h-4 flex-shrink-0", sourceInfo.color)} />
            <span className="text-sm font-semibold text-slate-200 truncate">
              Magasin {lead.magasin.replace('📍 ', '')}
            </span>
          </div>
          {lead.commercialMagasin && (
            <div className="ml-5">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] border bg-slate-700/40 border-slate-600/60 text-slate-300">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="opacity-80">Commercial:</span>
                <span className="font-medium text-slate-200 truncate max-w-[160px]">{lead.commercialMagasin}</span>
              </span>
            </div>
          )}
        </div>
      )
    }
    
    if (lead.source === 'tiktok') {
      return (
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4 flex-shrink-0", sourceInfo.color)} />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-200">TikTok</span>
            {lead.campaignName && (
              <span className="text-[10px] text-fuchsia-300/80 truncate max-w-[160px]" title={lead.campaignName}>
                {lead.campaignName}
              </span>
            )}
          </div>
        </div>
      )
    }
    
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-4 h-4 flex-shrink-0", sourceInfo.color)} />
        <span className="text-sm text-slate-200 capitalize truncate">{sourceInfo.label}</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200/20 overflow-hidden bg-white/5 backdrop-blur-sm relative">
      {/* Subtle loading overlay when refetching with existing data */}
      {isLoading && filteredLeads.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/30 backdrop-blur-[1px] border-b border-blue-500/30">
          <div className="flex items-center gap-2 px-6 py-2">
            <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
            <span className="text-xs text-blue-400 font-medium">Actualisation...</span>
          </div>
        </div>
      )}
      
      {/* Table Header */}
      <div className="bg-slate-800/30 px-6 py-4 border-b border-slate-200/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Liste des Leads</h3>
            <p className="text-sm text-slate-400">
              {sortedLeads.length} lead{sortedLeads.length > 1 ? 's' : ''} trouvé{sortedLeads.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-slate-800/20 border-b border-slate-200/10">
            <tr>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('nom')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  👤 Contact
                  {getSortIcon('nom')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('ville')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  🏙️ Ville
                  {getSortIcon('ville')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('typeBien')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  🏠 Bien
                  {getSortIcon('typeBien')}
                </button>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🧭 Source
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                👤 Assigné à
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('statut')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  🔖 Statut
                  {getSortIcon('statut')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  📅 Créé le
                  {getSortIcon('createdAt')}
                </button>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                ⚙️ Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/10">
            {sortedLeads.map((lead) => {
              const statusInfo = statusConfig[lead.statut]
              const isNewlyAdded = lead.id === newlyAddedLeadId
              return (
                <tr 
                  key={lead.id} 
                  className={cn(
                    "hover:bg-slate-700/10 transition-all duration-300 group",
                    isNewlyAdded && "bg-primary/10 ring-2 ring-primary/50"
                  )}  
                >
                  {/* Contact (Nom & Téléphone) */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-white truncate">{lead.nom}</p>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs truncate">{lead.telephone}</span>
                      </div>
                    </div>
                  </td>

                  {/* Ville */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-200 truncate">{lead.ville}</span>
                    </div>
                  </td>

                  {/* Type de bien */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-200 truncate">{lead.typeBien}</span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-4">
                    {getSourceDisplay(lead)}
                  </td>

                  {/* Assigné à */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-200 font-medium truncate">{lead.assignePar}</span>
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-4">
                    <Badge className={cn("border text-xs font-medium px-2.5 py-1 whitespace-nowrap", statusInfo.color)}>
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                  </td>

                  {/* Date création */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300 whitespace-nowrap">
                        {formatDate(lead.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewHistory && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewHistory(lead)}
                          className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-primary/20 hover:to-purple-500/20 transition-all text-primary hover:text-white border border-transparent hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20"
                          title="📝 Notes & Historique"
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLeadClick(lead)}
                        className="h-9 px-3 hover:bg-slate-600/50 transition-all text-slate-300 hover:text-white"
                        title="Voir / Modifier"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-red-500/20 text-red-400 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le lead sera définitivement supprimé de la base de données.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => onDeleteLead(lead.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {sortedLeads.length === 0 && (
          <div className="text-center py-12">
            {isLoading ? (
              <div className="glass rounded-lg p-8 max-w-md mx-auto">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-700"></div>
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  <p className="text-white font-medium">Chargement des leads...</p>
                  <p className="text-sm text-muted-foreground">Veuillez patienter</p>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <p className="text-slate-400">Aucun lead trouvé</p>
                <p className="text-sm text-slate-500 mt-1">
                  Essayez de modifier vos filtres ou votre recherche
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
