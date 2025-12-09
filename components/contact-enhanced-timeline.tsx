"use client"

import { useState } from "react"
import { 
  Clock, MessageSquare, Phone, FileText, CheckCircle, DollarSign, 
  Calendar, User, History, TrendingUp, ChevronDown, ChevronUp, Plus,
  Briefcase, Users, ArrowRightCircle, Sparkles, UserCheck, FileCheck,
  Wallet, XCircle, Trophy, Pause, Upload
} from "lucide-react"
import type { ContactWithDetails, Timeline } from "@/types/contact"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ContactEnhancedTimelineProps {
  contact: ContactWithDetails
  userNameMap: Record<string, string>
  architectNameMap?: Record<string, string>
  showFilters?: boolean
  maxItems?: number
}

type FilterType = "all" | "statuts" | "opportunites" | "taches" | "rdv" | "documents" | "notes" | "paiements"

interface EnhancedTimelineEvent extends Timeline {
  displayType: string
  icon: any
  iconColor: string
  groupable?: boolean
}

export function ContactEnhancedTimeline({ 
  contact,
  userNameMap,
  architectNameMap = {},
  showFilters = true,
  maxItems = 15
}: ContactEnhancedTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [showAll, setShowAll] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  // Combine all timeline events with enhanced metadata
  const enhanceEvent = (event: Timeline): EnhancedTimelineEvent => {
    const eventConfig: Record<string, { displayType: string, icon: any, iconColor: string, groupable?: boolean }> = {
      contact_created: {
        displayType: 'statuts',
        icon: User,
        iconColor: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      },
      contact_converted_from_lead: {
        displayType: 'statuts',
        icon: Sparkles,
        iconColor: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      },
      opportunity_created: {
        displayType: 'opportunites',
        icon: Briefcase,
        iconColor: 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      },
      opportunity_won: {
        displayType: 'opportunites',
        icon: Trophy,
        iconColor: 'text-green-400 bg-green-500/20 border-green-500/30'
      },
      opportunity_lost: {
        displayType: 'opportunites',
        icon: XCircle,
        iconColor: 'text-red-400 bg-red-500/20 border-red-500/30'
      },
      opportunity_on_hold: {
        displayType: 'opportunites',
        icon: Pause,
        iconColor: 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      },
      architect_assigned: {
        displayType: 'statuts',
        icon: UserCheck,
        iconColor: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
        groupable: true
      },
      task_created: {
        displayType: 'taches',
        icon: CheckCircle,
        iconColor: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      },
      task_completed: {
        displayType: 'taches',
        icon: CheckCircle,
        iconColor: 'text-green-400 bg-green-500/20 border-green-500/30'
      },
      appointment_created: {
        displayType: 'rdv',
        icon: Calendar,
        iconColor: 'text-pink-400 bg-pink-500/20 border-pink-500/30'
      },
      appointment_completed: {
        displayType: 'rdv',
        icon: Calendar,
        iconColor: 'text-green-400 bg-green-500/20 border-green-500/30'
      },
      document_uploaded: {
        displayType: 'documents',
        icon: Upload,
        iconColor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30'
      },
      note_added: {
        displayType: 'notes',
        icon: MessageSquare,
        iconColor: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      },
      status_changed: {
        displayType: 'statuts',
        icon: TrendingUp,
        iconColor: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
        groupable: true
      },
      other: {
        displayType: 'notes',
        icon: FileText,
        iconColor: 'text-slate-400 bg-slate-500/20 border-slate-500/30'
      }
    }

    // Check if this is a payment event based on metadata
    const metadata = event.metadata as any
    if (metadata?.paymentId) {
      return {
        ...event,
        displayType: 'paiements',
        icon: Wallet,
        iconColor: 'text-green-400 bg-green-500/20 border-green-500/30'
      }
    }

    const config = eventConfig[event.eventType] || eventConfig.other

    return {
      ...event,
      ...config
    }
  }

  // Convert timeline to enhanced events
  const allEvents: EnhancedTimelineEvent[] = (contact.timeline || []).map(enhanceEvent)

  // Calculate opportunity count - use contact's opportunities array if available (more accurate)
  // Otherwise fallback to counting unique opportunity IDs from timeline events
  const opportunityCount = contact.opportunities?.length ?? (() => {
    const uniqueOpportunityIds = new Set(
      allEvents
        .filter(e => e.displayType === "opportunites" && e.opportunityId)
        .map(e => e.opportunityId)
        .filter((id): id is string => id !== null && id !== undefined)
    )
    return uniqueOpportunityIds.size
  })()

  // Apply filters
  const filteredEvents = allEvents.filter(event => {
    if (activeFilter === "all") return true
    if (activeFilter === "statuts") return event.displayType === "statuts"
    if (activeFilter === "opportunites") return event.displayType === "opportunites"
    if (activeFilter === "taches") return event.displayType === "taches"
    if (activeFilter === "rdv") return event.displayType === "rdv"
    if (activeFilter === "documents") return event.displayType === "documents"
    if (activeFilter === "notes") return event.displayType === "notes"
    if (activeFilter === "paiements") return event.displayType === "paiements"
    return true
  })

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, maxItems)
  const hasMore = filteredEvents.length > maxItems

  // Group events by date
  const groupByDate = (events: EnhancedTimelineEvent[]) => {
    const groups: Record<string, EnhancedTimelineEvent[]> = {}
    
    events.forEach(event => {
      const date = new Date(event.createdAt)
      const dateKey = formatDateKey(date)
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })
    
    return groups
  }

  const formatDateKey = (date: Date): string => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (eventDate.getTime() === today.getTime()) {
      return "Aujourd'hui"
    } else if (eventDate.getTime() === yesterday.getTime()) {
      return "Hier"
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const formatRelativeTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getUserName = (userId: string): string => {
    return userNameMap[userId] || userId
  }

  // Helper function to resolve architect names from IDs
  const getArchitectName = (architectId: string): string => {
    // Check if it's an ID (long alphanumeric string)
    if (architectId && architectId.length > 15 && /^[a-z0-9]+$/i.test(architectId)) {
      return architectNameMap[architectId] || 'Architecte non trouvé'
    }
    // Check in map anyway
    return architectNameMap[architectId] || architectId
  }

  // Helper function to format description with highlighted amounts, keywords, and architect names
  const formatDescription = (description: string, eventType?: string) => {
    if (!description) return null
    
    let result = description
    
    // If this is an architect assignment event, replace architect ID with name
    if (eventType === 'architect_assigned') {
      // Pattern to match architect IDs (long alphanumeric strings)
      const architectIdRegex = /\b([a-z0-9]{20,})\b/gi
      result = result.replace(architectIdRegex, (match) => {
        const architectName = getArchitectName(match)
        return architectName !== 'Architecte non trouvé' ? architectName : match
      })
    }
    
    // Regex to find amounts (numbers followed by MAD or with currency formatting)
    const amountRegex = /(\d+[\s,.]?\d*)\s*(MAD|DH|Dhs?)/gi
    const statusRegex = /(Qualifié|Prise de besoin|Acompte reçu|Perdu)/gi
    
    // Replace amounts with highlighted version
    result = result.replace(amountRegex, '<span class="font-light text-emerald-400">$1 $2</span>')
    
    // Replace status keywords
    result = result.replace(statusRegex, '<span class="font-light text-blue-400">$1</span>')
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  // Group similar consecutive system updates
  const groupSystemUpdates = (events: EnhancedTimelineEvent[]) => {
    const grouped: (EnhancedTimelineEvent | { type: 'group', events: EnhancedTimelineEvent[], id: string })[] = []
    let currentGroup: EnhancedTimelineEvent[] = []
    
    events.forEach((event, index) => {
      const isSystemUpdate = event.groupable && (
        event.author === 'Système' || 
        event.author === 'System' ||
        event.description?.includes('automatiquement')
      )
      
      if (isSystemUpdate) {
        currentGroup.push(event)
      } else {
        if (currentGroup.length > 0) {
          if (currentGroup.length === 1) {
            grouped.push(currentGroup[0])
          } else {
            grouped.push({
              type: 'group',
              events: currentGroup,
              id: `system-group-${currentGroup[0].id}`
            })
          }
          currentGroup = []
        }
        grouped.push(event)
      }
    })
    
    // Handle remaining group
    if (currentGroup.length > 0) {
      if (currentGroup.length === 1) {
        grouped.push(currentGroup[0])
      } else {
        grouped.push({
          type: 'group',
          events: currentGroup,
          id: `system-group-${currentGroup[0].id}`
        })
      }
    }
    
    return grouped
  }

  const groupedEvents = groupByDate(displayedEvents)

  // Render status change details if available
  const renderStatusChange = (event: EnhancedTimelineEvent) => {
    const metadata = event.metadata as any
    if (!metadata?.oldStatus || !metadata?.newStatus) return null

    const statusLabels: Record<string, string> = {
      'qualifie': 'Qualifié',
      'prise_de_besoin': 'Prise de besoin',
      'acompte_recu': 'Acompte reçu',
      'perdu': 'Perdu'
    }

    return (
      <div className="mt-2 p-2 rounded-lg bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/30">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 shadow-sm">
            <span className="text-[9px] text-slate-400 uppercase font-light">De:</span>
            <span className="text-xs font-light text-white">
              {statusLabels[metadata.oldStatus] || metadata.oldStatus}
            </span>
          </div>

          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
            <ArrowRightCircle className="w-3 h-3 text-white" />
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/40 shadow-sm">
            <span className="text-[9px] text-indigo-300 uppercase font-light">À:</span>
            <span className="text-xs font-light text-white">
              {statusLabels[metadata.newStatus] || metadata.newStatus}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Render opportunity details if available
  const renderOpportunityDetails = (event: EnhancedTimelineEvent) => {
    const metadata = event.metadata as any
    if (!metadata) return null

    // Only render if there's actual content
    const hasContent = metadata.titre || metadata.type || metadata.budget
    if (!hasContent) return null

    return (
      <div className="mt-2 p-2 rounded-lg bg-purple-500/10 backdrop-blur-sm border border-purple-500/30">
        <div className="space-y-1.5 text-xs">
          {metadata.titre && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-purple-400" />
              <span className="text-white font-light">{metadata.titre}</span>
            </div>
          )}
          {metadata.type && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-purple-400" />
              <span className="text-slate-300 font-light capitalize">{metadata.type}</span>
            </div>
          )}
          {metadata.budget && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-light">{metadata.budget.toLocaleString('fr-FR')} MAD</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render payment details if available
  const renderPaymentDetails = (event: EnhancedTimelineEvent) => {
    const metadata = event.metadata as any
    if (!metadata || !metadata.montant) return null

    return (
      <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border border-emerald-400/50 shadow-lg">
              <Wallet className="w-3 h-3 text-white" />
            </div>
            <span className="text-emerald-300 font-light text-sm">
              {metadata.montant.toLocaleString('fr-FR')} MAD
            </span>
          </div>
          {metadata.methode && (
            <div className="flex items-center gap-1.5 pl-8">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300 font-light capitalize text-xs">{metadata.methode}</span>
            </div>
          )}
          {metadata.reference && (
            <div className="flex items-center gap-1.5 pl-8">
              <FileText className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-400 text-xs font-light">Réf: <span className="font-mono font-light text-slate-300">{metadata.reference}</span></span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#0F1420]/95 via-[#141A2A]/98 to-[#0F1420]/95 rounded-lg border border-slate-700/40 p-3 backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-light text-white mb-0.5 flex items-center gap-1.5">
            <History className="w-4 h-4 text-blue-400" />
            Historique Complet
          </h3>
          <p className="text-xs text-slate-300 font-light">
            {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            { key: "all", label: "Tous", icon: null, count: allEvents.length },
            { key: "statuts", label: "Statuts", icon: TrendingUp, count: allEvents.filter(e => e.displayType === "statuts").length },
            { key: "opportunites", label: "Opportunités", icon: Briefcase, count: opportunityCount },
            { key: "taches", label: "Tâches", icon: CheckCircle, count: allEvents.filter(e => e.displayType === "taches").length },
            { key: "rdv", label: "RDV", icon: Calendar, count: allEvents.filter(e => e.displayType === "rdv").length },
            { key: "documents", label: "Documents", icon: FileText, count: allEvents.filter(e => e.displayType === "documents").length },
            { key: "notes", label: "Notes", icon: MessageSquare, count: allEvents.filter(e => e.displayType === "notes").length },
            { key: "paiements", label: "Paiements", icon: Wallet, count: allEvents.filter(e => e.displayType === "paiements").length },
          ].map(filter => {
            const Icon = filter.icon
            const count = filter.count
            // Only render if count > 0 or it's the "all" filter
            if (count === 0 && filter.key !== "all") return null
            
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-light transition-all flex items-center gap-1",
                  activeFilter === filter.key
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-slate-700/50 hover:border-slate-600/50"
                )}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {filter.label}
                {count > 0 && (
                  <span className={cn(
                    "ml-0.5 px-1 py-0.5 rounded-full text-[9px] font-light",
                    activeFilter === filter.key
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-slate-400"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Timeline */}
      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(groupedEvents).map(([dateKey, events]) => {
            const processedEvents = groupSystemUpdates(events)
            
            return (
              <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600/50 to-slate-600/50" />
                <span className="text-[10px] font-light text-white uppercase tracking-wider px-2 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 shadow-lg backdrop-blur-sm">
                  {dateKey}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-600/50 to-slate-600/50" />
              </div>

                {/* Events for this date */}
                <div className="space-y-2 relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500/60 via-blue-400/40 to-blue-300/20 rounded-full" />

                  {processedEvents.map((item, index) => {
                    // Handle grouped system updates
                    if ('type' in item && item.type === 'group') {
                      const isExpanded = expandedGroups.has(item.id)
                      const groupEvents = item.events
                      const firstEvent = groupEvents[0]
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="relative pl-10"
                        >
                          {/* Icon */}
                          <div className={cn(
                            "absolute left-0 w-6 h-6 rounded-full flex items-center justify-center border z-10 bg-slate-800/80 backdrop-blur-sm shadow-lg",
                            firstEvent.iconColor
                          )}>
                            <firstEvent.icon className="w-3 h-3" />
                          </div>

                          {/* Grouped Content Card */}
                          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 hover:bg-slate-800/50 transition-all shadow-lg">
                            <button
                              onClick={() => toggleGroup(item.id)}
                              className="w-full p-2.5 hover:bg-slate-800/30 transition-colors text-left"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span className="text-[10px] font-light text-white">
                                    {getUserName(firstEvent.author)}
                                  </span>
                                  <span className="text-[10px] text-slate-500">•</span>
                                  <span className="text-[10px] text-slate-400 font-light">
                                    {formatRelativeTime(firstEvent.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-light border border-blue-500/30">
                                    {groupEvents.length} mises à jour
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-xs text-white font-light leading-relaxed">
                                {groupEvents.length} changements système groupés
                              </p>
                            </button>

                            {/* Expanded group details */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="border-t border-slate-700/50"
                                >
                                  <div className="p-2 space-y-1.5 bg-slate-900/40">
                                    {groupEvents.map((subEvent, subIndex) => (
                                      <div key={subEvent.id} className="text-xs p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/50 transition-colors shadow-sm">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                          <Clock className="w-3 h-3" />
                                          <span className="font-light text-[10px]">{formatRelativeTime(subEvent.createdAt)}</span>
                                        </div>
                                        <p className="text-white font-light text-xs mb-1">{subEvent.title}</p>
                                        {subEvent.description && (
                                          <div className="text-slate-300 mt-1 leading-relaxed text-xs font-light">
                                            {formatDescription(subEvent.description, subEvent.eventType)}
                                          </div>
                                        )}
                                        {subEvent.eventType === 'status_changed' && renderStatusChange(subEvent)}
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )
                    }

                    // Regular event rendering
                    const event = item as EnhancedTimelineEvent
                    const Icon = event.icon

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="relative pl-10"
                      >
                        {/* Icon */}
                        <div className={cn(
                          "absolute left-0 w-6 h-6 rounded-full flex items-center justify-center border z-10 bg-slate-800/80 backdrop-blur-sm shadow-lg",
                          event.iconColor
                        )}>
                          <Icon className="w-3 h-3" />
                        </div>

                        {/* Content Card */}
                        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-lg p-2.5 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all shadow-lg">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-light text-white">
                                {getUserName(event.author)}
                              </span>
                              <span className="text-[10px] text-slate-500">•</span>
                              <span className="text-[10px] text-slate-400 font-light">
                                {formatRelativeTime(event.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <h4 className="text-xs font-light text-white mb-1.5">
                            {event.title}
                          </h4>
                          
                          {event.description && (
                            <div className="text-xs text-slate-300 leading-relaxed font-light">
                              {formatDescription(event.description, event.eventType)}
                            </div>
                          )}

                          {/* Special rendering for different event types - only render if data exists */}
                          {event.eventType === 'status_changed' && renderStatusChange(event)}
                          {(event.eventType === 'opportunity_created' || 
                            event.eventType === 'opportunity_won' || 
                            event.eventType === 'opportunity_lost') && 
                            renderOpportunityDetails(event)}
                          {event.displayType === 'paiements' && renderPaymentDetails(event)}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto mb-3 border border-slate-700/50">
            <History className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-white text-xs font-light">Aucun événement pour le moment</p>
          <p className="text-slate-400 text-[10px] font-light mt-1">
            L'historique des activités apparaîtra ici
          </p>
        </div>
      )}

      {/* Show More/Less Button */}
      {hasMore && (
        <Button
          onClick={() => setShowAll(!showAll)}
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-slate-300 font-light hover:text-white hover:bg-slate-800/50 bg-slate-800/30 border border-slate-700/50 rounded-lg py-2 text-xs transition-colors shadow-sm"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1.5" />
              Voir moins
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1.5" />
              Voir tout ({filteredEvents.length - maxItems} de plus)
            </>
          )}
        </Button>
      )}
    </div>
  )
}

