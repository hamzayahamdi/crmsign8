"use client"

import type { Lead, LeadStatus, LeadPriority } from "@/types/lead"
import { Phone, MapPin, User, Calendar, Edit, Trash2, Store, Globe, Facebook, Instagram, Users, Package, Music2, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getLeadDuration, getLeadDurationColor, getLeadDurationIcon } from "@/lib/lead-duration-utils"
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

interface LeadsTableImprovedProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  onDeleteLead: (leadId: string) => void
  searchQuery: string
  filters: {
    status: "all" | LeadStatus
    city: string
    type: string
    assigned: string
    priority: "all" | LeadPriority
    source: string
  }
  isLoading?: boolean
  newlyAddedLeadId?: string | null
}

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: string }> = {
  nouveau: { label: "Nouveau", color: "bg-green-500/20 text-green-400 border-green-500/40", icon: "🟢" },
  a_recontacter: { label: "À recontacter", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", icon: "🟡" },
  sans_reponse: { label: "Sans réponse", color: "bg-orange-500/20 text-orange-400 border-orange-500/40", icon: "🟠" },
  non_interesse: { label: "Non intéressé", color: "bg-red-500/20 text-red-400 border-red-500/40", icon: "🔴" },
  converti: { label: "Converti", color: "bg-purple-500/20 text-purple-400 border-purple-500/40", icon: "✅" },
  qualifie: { label: "Qualifié", color: "bg-blue-500/20 text-blue-400 border-blue-500/40", icon: "🔵" },
  refuse: { label: "Refusé", color: "bg-gray-500/20 text-gray-400 border-gray-500/40", icon: "⚫" },
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

export function LeadsTableImproved({
  leads,
  onLeadClick,
  onDeleteLead,
  searchQuery,
  filters,
  isLoading = false,
  newlyAddedLeadId = null
}: LeadsTableImprovedProps) {
  // Only apply filters (search is handled server-side)
  const passesFilters = (lead: Lead) => {
    if (filters.status !== "all" && lead.statut !== filters.status) return false
    if (filters.city !== "all" && lead.ville !== filters.city) return false
    if (filters.type !== "all" && lead.typeBien !== filters.type) return false
    if (filters.assigned !== "all" && lead.assignePar !== filters.assigned) return false
    if (filters.priority !== "all" && lead.priorite !== filters.priority) return false
    if (filters.source !== "all" && lead.source !== filters.source) return false
    return true
  }

  const filteredLeads = leads.filter(lead => passesFilters(lead))

  // Sort by creation date (newest first)
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (isLoading && leads.length === 0) {
    return <LeadsTableSkeleton rows={8} />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffTime = today.getTime() - compareDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays > 0 && diffDays < 7) return `Il y a ${diffDays}j`

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getSourceDisplay = (lead: Lead) => {
    const sourceInfo = sourceIcons[lead.source] || sourceIcons.autre
    const Icon = sourceInfo.icon

    if (lead.source === 'magasin' && lead.magasin) {
      return (
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center">
            <span className="text-base">🏬</span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-purple-300">{lead.magasin}</span>
            {lead.commercialMagasin && (
              <span className="text-xs text-slate-400 truncate" title={lead.commercialMagasin}>
                <span className="text-slate-500">Commercial:</span> {lead.commercialMagasin}
              </span>
            )}
          </div>
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

    // Default display for other sources (Facebook, Instagram, Site Web, etc.)
    const gradientMap: Record<string, string> = {
      facebook: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
      instagram: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
      site_web: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
      reference_client: "from-green-500/20 to-emerald-500/20 border-green-500/30",
      autre: "from-slate-500/20 to-slate-600/20 border-slate-500/30"
    }

    const textColorMap: Record<string, string> = {
      facebook: "text-blue-300",
      instagram: "text-pink-300",
      site_web: "text-cyan-300",
      reference_client: "text-green-300",
      autre: "text-slate-300"
    }

    return (
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
          gradientMap[lead.source] || gradientMap.autre
        )}>
          <Icon className="w-4 h-4 text-white/90" />
        </div>
        <span className={cn("text-sm font-semibold", textColorMap[lead.source] || textColorMap.autre)}>
          {sourceInfo.label}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200/20 overflow-hidden bg-white/5 backdrop-blur-sm">
      {/* Loading overlay */}
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
        <table className="w-full">
          <thead className="bg-slate-800/20 border-b border-slate-200/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                👤 Nom & Téléphone
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🏙️ Ville
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🏠 Type de bien
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🧭 Source
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🧑‍💼 Commercial
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🔖 État
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                📅 Date création
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                ⏱️ Durée en lead
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
                  {/* Nom & Téléphone */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-white">{lead.nom}</p>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-xs">{lead.telephone}</span>
                      </div>
                    </div>
                  </td>

                  {/* Ville */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-200">{lead.ville}</span>
                    </div>
                  </td>

                  {/* Type de bien */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-200">{lead.typeBien}</span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-4">
                    {getSourceDisplay(lead)}
                  </td>

                  {/* Commercial assigné */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-white">{lead.assignePar}</span>
                    </div>
                  </td>

                  {/* État */}
                  <td className="px-4 py-4">
                    <Badge className={cn("border text-xs font-medium px-2.5 py-1", statusInfo.color)}>
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                  </td>

                  {/* Date création */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">
                        {formatDate(lead.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* Durée en lead */}
                  <td className="px-4 py-4">
                    {(() => {
                      const duration = getLeadDuration(lead.createdAt, lead.convertedAt)
                      const colorClass = getLeadDurationColor(duration.days, duration.isActive)
                      const icon = getLeadDurationIcon(duration.days, duration.isActive)

                      return (
                        <Badge
                          className={cn(
                            "border text-xs font-medium px-2.5 py-1 flex items-center gap-1.5 w-fit",
                            duration.isActive ? colorClass : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          )}
                          title={duration.isActive ? "Lead actif" : "Lead converti/refusé"}
                        >
                          {duration.isActive ? (
                            <>
                              <span className="text-[10px] leading-none">{icon}</span>
                              <span>{duration.label}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{duration.label}</span>
                            </>
                          )}
                        </Badge>
                      )
                    })()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
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
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteLead(lead.id)
                              }}
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
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-700"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-white font-medium">Chargement des leads...</p>
                <p className="text-sm text-slate-400">Veuillez patienter</p>
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
