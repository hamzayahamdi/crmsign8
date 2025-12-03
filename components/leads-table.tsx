"use client"

import type { Lead, LeadStatus, LeadPriority } from "@/types/lead"
import { Phone, MapPin, User, Calendar, Edit, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Store, Globe, Facebook, Instagram, Users, Package, Music2, MessageSquarePlus, Clock } from "lucide-react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { LeadsTableSkeleton } from "@/components/leads-table-skeleton"
import { LeadActionDialog } from "@/components/lead-action-dialog"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface LeadsTableProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  onEditLead?: (lead: Lead) => void  // Optional handler specifically for edit button
  onDeleteLead: (leadId: string) => void
  onViewHistory?: (lead: Lead) => void
  onConvertToClient?: (lead: Lead) => void
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
  onFilterChange?: (filters: LeadsTableProps['filters']) => void
  isLoading?: boolean
  newlyAddedLeadId?: string | null
}

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: string }> = {
  nouveau: { label: "Nouveau", color: "bg-green-500/20 text-green-400 border-green-500/40", icon: "🟢" },
  a_recontacter: { label: "À recontacter", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", icon: "🟡" },
  sans_reponse: { label: "Sans réponse", color: "bg-orange-500/20 text-orange-400 border-orange-500/40", icon: "🟠" },
  non_interesse: { label: "Non intéressé", color: "bg-red-500/20 text-red-400 border-red-500/40", icon: "🔴" },
  converti: { label: "Converti", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", icon: "✅" },
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

type SortField = 'nom' | 'statut' | 'ville' | 'typeBien' | 'priorite' | 'derniereMaj' | 'createdAt' | 'uploadedAt'
type SortOrder = 'asc' | 'desc'

interface CampaignGroup {
  source: string
  uploadedAt: string
  campaignName?: string
  leads: Lead[]
}

export function LeadsTable({ leads, onLeadClick, onEditLead, onDeleteLead, onViewHistory, onConvertToClient, searchQuery, filters, onFilterChange, isLoading = false, newlyAddedLeadId = null }: LeadsTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [hoveredColumn, setHoveredColumn] = useState<SortField | null>(null)
  const [actionDialogLead, setActionDialogLead] = useState<Lead | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)



  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    const isActive = sortField === field
    const isHovered = hoveredColumn === field

    if (!isActive && !isHovered) {
      return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
    }

    if (isActive) {
      return sortOrder === 'asc' ?
        <ArrowUp className="w-3 h-3 text-[#3B82F6]" /> :
        <ArrowDown className="w-3 h-3 text-[#3B82F6]" />
    }

    return <ArrowUpDown className="w-3 h-3 opacity-30" />
  }

  // Check if a lead is from a recent campaign (last 7 days)
  const isRecentCampaign = (uploadedAt?: string) => {
    if (!uploadedAt) return false
    const diffDays = Math.floor((Date.now() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  }

  // Format import date for display
  const formatImportDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Handle undefined or null leads
  const safeLeads = leads || []

  // Client-side filtering is removed as it is now handled server-side
  const filteredLeads = safeLeads

  // Debug logging
  console.log(`[LeadsTable] Total leads received: ${safeLeads.length}`)
  console.log(`[LeadsTable] Active filters:`, filters)
  console.log(`[LeadsTable] Search query: "${searchQuery}"`)

  // Sort leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue: any = a[sortField as keyof Lead]
    let bValue: any = b[sortField as keyof Lead]

    // Handle date fields
    if (sortField === 'derniereMaj' || sortField === 'createdAt' || sortField === 'uploadedAt') {
      aValue = new Date(aValue || 0).getTime()
      bValue = new Date(bValue || 0).getTime()
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

  // Group leads by campaign
  const groupedLeads = useMemo(() => {
    const groups: CampaignGroup[] = []
    const groupMap = new Map<string, CampaignGroup>()

    sortedLeads.forEach(lead => {
      // Create a unique key for each campaign
      const key = `${lead.source}-${lead.uploadedAt || 'unknown'}-${lead.campaignName || ''}`

      if (!groupMap.has(key)) {
        const group: CampaignGroup = {
          source: lead.source,
          uploadedAt: lead.uploadedAt || '',
          campaignName: lead.campaignName,
          leads: []
        }
        groupMap.set(key, group)
        groups.push(group)
      }

      groupMap.get(key)!.leads.push(lead)
    })

    return groups
  }, [sortedLeads])

  // Show skeleton on initial load
  if (isLoading && safeLeads.length === 0) {
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
    const isRecent = isRecentCampaign(lead.uploadedAt)

    // Special handling for Magasin source
    if (lead.source === 'magasin' && lead.magasin) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Icon className={cn("w-4 h-4 flex-shrink-0", sourceInfo.color)} />
            <span className="text-sm font-semibold text-[#E5E7EB] truncate">
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

    // For all other sources (TikTok, Facebook, etc.)
    return (
      <div className="flex flex-col gap-1">
        {/* Source name with icon, date, and freshness dot */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Icon className={cn("w-4 h-4 flex-shrink-0", sourceInfo.color)} />
          <span className="text-sm font-medium text-[#E5E7EB]">
            {sourceInfo.label}
          </span>

          {/* Dot separator and date on same line */}
          {lead.uploadedAt && (
            <>
              <span className="text-[#9CA3AF]/40">•</span>
              <span className="text-[11px] text-[#9CA3AF]/80">
                {formatImportDate(lead.uploadedAt)}
              </span>
            </>
          )}

          {/* Freshness indicator */}
          <span className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            isRecent ? "bg-green-400" : "bg-gray-500"
          )} />
        </div>

        {/* Campaign name on separate line (if exists) */}
        {lead.campaignName && (
          <div className="text-[10px] font-medium text-fuchsia-400/90 truncate max-w-[200px] pl-5">
            {lead.campaignName}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Table Container */}
      <div className="rounded-lg border border-[#1F2937] overflow-hidden bg-white/5 backdrop-blur-sm">
        {/* Table Header */}
        <div className="bg-slate-800/30 px-6 py-4 border-b border-[#1F2937]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#E5E7EB]">Liste des Leads</h3>
              <p className="text-sm text-[#9CA3AF]">
                {sortedLeads.length} lead{sortedLeads.length > 1 ? 's' : ''} trouvé{sortedLeads.length > 1 ? 's' : ''}
                {isLoading && filteredLeads.length > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse"></span>
                    <span className="text-xs text-[#3B82F6]">Actualisation...</span>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4 px-4 pb-20 mt-4">
          <AnimatePresence mode="popLayout">
            {sortedLeads.map((lead) => {
              const statusInfo = statusConfig[lead.statut]
              const isNewlyAdded = lead.id === newlyAddedLeadId

              return (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    setActionDialogLead(lead)
                    setActionDialogOpen(true)
                  }}
                  className={cn(
                    "bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3 active:scale-[0.98] transition-all",
                    isNewlyAdded && "ring-2 ring-primary/50 bg-primary/5"
                  )}
                >
                  {/* Header: Name, Status, Date */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h4 className="font-semibold text-white text-base">{lead.nom}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("border text-[10px] px-1.5 py-0.5 h-5", statusInfo.color)}>
                          {statusInfo.icon} {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-slate-500">{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>
                    {/* Actions (Edit/Delete) */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onEditLead) onEditLead(lead)
                          else onLeadClick(lead)
                        }}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{lead.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{lead.ville}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Store className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{lead.typeBien}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{lead.assignePar}</span>
                    </div>
                  </div>

                  {/* Source & Campaign */}
                  <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSourceDisplay(lead)}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {sortedLeads.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">Aucun lead trouvé</p>
            </div>
          )}
        </div>

        {/* Desktop Table View - Fixed height container to prevent flickering */}
        <div
          className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] min-h-[400px] scroll-smooth"
          style={{
            willChange: 'scroll-position',
            scrollbarGutter: 'stable'
          }}
        >
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" /> {/* Priorité */}
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-800/20 border-b border-[#1F2937] sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th
                  className="px-6 py-4 text-left group"
                  onMouseEnter={() => setHoveredColumn('nom')}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <button
                    onClick={() => handleSort('nom')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-[#3B82F6] transition-colors"
                  >
                    <span>Contact</span>
                    {getSortIcon('nom')}
                  </button>
                </th>
                <th
                  className="px-4 py-4 text-left group"
                  onMouseEnter={() => setHoveredColumn('ville')}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <button
                    onClick={() => handleSort('ville')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-[#3B82F6] transition-colors"
                  >
                    <span>Ville</span>
                    {getSortIcon('ville')}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-[#9CA3AF]">
                  Bien
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-[#9CA3AF]">
                  Source
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-[#9CA3AF]">
                  Assigné à
                </th>
                <th
                  className="px-4 py-4 text-left group"
                  onMouseEnter={() => setHoveredColumn('statut')}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <button
                    onClick={() => handleSort('statut')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-[#3B82F6] transition-colors"
                  >
                    <span>Statut</span>
                    {getSortIcon('statut')}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-[#9CA3AF]">
                  Priorité
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-[#9CA3AF]">
                  Durée en lead
                </th>
                <th className="px-4 py-4 text-right text-xs font-semibold text-[#9CA3AF]">
                  {/* Actions - no text, just icons */}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]">
              <AnimatePresence mode="popLayout">
                {sortedLeads.map((lead) => {
                  const statusInfo = statusConfig[lead.statut]
                  const isNewlyAdded = lead.id === newlyAddedLeadId
                  return (
                    <motion.tr
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        x: 100,
                        height: 0,
                        transition: {
                          duration: 0.4,
                          ease: "easeInOut"
                        }
                      }}
                      transition={{
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                      onClick={() => {
                        setActionDialogLead(lead)
                        setActionDialogOpen(true)
                      }}
                      className={cn(
                        "transition-all duration-200 group cursor-pointer",
                        "hover:bg-[rgba(255,255,255,0.03)]",
                        isNewlyAdded && "bg-primary/10 ring-2 ring-primary/50"
                      )}
                    >
                      {/* Contact (Nom & Téléphone) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-[#E5E7EB] truncate">{lead.nom}</p>
                          <div className="flex items-center gap-1.5 text-[#9CA3AF]">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-xs truncate">{lead.telephone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Ville */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
                          <span className="text-sm text-[#E5E7EB] truncate">{lead.ville}</span>
                        </div>
                      </td>

                      {/* Type de bien */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-[#E5E7EB] truncate">{lead.typeBien}</span>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-4">
                        {getSourceDisplay(lead)}
                      </td>

                      {/* Assigné à */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
                          <span className="text-sm text-[#E5E7EB] font-medium truncate">{lead.assignePar}</span>
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-4">
                        <Badge className={cn("border text-xs font-medium px-2.5 py-1 whitespace-nowrap", statusInfo.color)}>
                          {statusInfo.icon} {statusInfo.label}
                        </Badge>
                      </td>

                      {/* Priorité */}
                      <td className="px-4 py-4">
                        {(() => {
                          const pr = priorityConfig[lead.priorite]
                          return (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border font-medium",
                                pr.color,
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  lead.priorite === "haute"
                                    ? "bg-red-400"
                                    : lead.priorite === "moyenne"
                                    ? "bg-amber-400"
                                    : "bg-slate-400",
                                )}
                              />
                              <span>Priorité {pr.label}</span>
                            </span>
                          )
                        })()}
                      </td>

                      {/* Durée en lead */}
                      <td className="px-4 py-4">
                        {(() => {
                          const duration = getLeadDuration(lead.createdAt, lead.convertedAt)
                          const icon = getLeadDurationIcon(duration.days, duration.isActive)

                          return (
                            <div
                              className="flex items-center gap-1.5"
                              title={duration.isActive ? `Lead actif depuis ${duration.days} jour(s)` : `Converti/Refusé après ${duration.days} jour(s)`}
                            >
                              <span className="text-[10px] leading-none">{icon}</span>
                              <span className="text-xs text-slate-400 font-normal whitespace-nowrap">
                                {duration.label}
                              </span>
                            </div>
                          )
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onViewHistory && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onViewHistory(lead)
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-primary/10 transition-all text-[#9CA3AF] hover:text-[#3B82F6]"
                                  >
                                    <MessageSquarePlus className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Notes & Historique</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Use onEditLead if provided (always opens modal), otherwise use onLeadClick
                                    if (onEditLead) {
                                      onEditLead(lead)
                                    } else {
                                      onLeadClick(lead)
                                    }
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-slate-600/30 transition-all text-[#9CA3AF] hover:text-[#E5E7EB]"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Modifier</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-8 w-8 p-0 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">Supprimer</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
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

      {/* Lead Action Dialog */}
      <LeadActionDialog
        lead={actionDialogLead}
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        onEdit={(lead) => {
          setActionDialogOpen(false)
          // Use onEditLead if provided (always opens modal), otherwise use onLeadClick
          if (onEditLead) {
            onEditLead(lead)
          } else {
            onLeadClick(lead)
          }
        }}
        onConvertToClient={onConvertToClient}
      />
    </div>
  )
}
