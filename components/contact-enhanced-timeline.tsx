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

  // Helper function to format description with highlighted amounts and keywords
  const formatDescription = (description: string) => {
    if (!description) return null
    
    // Regex to find amounts (numbers followed by MAD or with currency formatting)
    const amountRegex = /(\d+[\s,.]?\d*)\s*(MAD|DH|Dhs?)/gi
    const statusRegex = /(Qualifié|Prise de besoin|Acompte reçu|Perdu)/gi
    
    let result = description
    
    // Replace amounts with highlighted version
    result = result.replace(amountRegex, '<span class="font-bold text-green-300 text-base">$1 $2</span>')
    
    // Replace status keywords
    result = result.replace(statusRegex, '<span class="font-semibold text-indigo-300">$1</span>')
    
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
      <div className="mt-3 p-4 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-400/40 shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-white/20 border border-white/30 backdrop-blur-sm">
            <span className="text-[10px] text-white/80 uppercase font-medium">De:</span>
            <span className="text-sm font-semibold text-white">
              {statusLabels[metadata.oldStatus] || metadata.oldStatus}
            </span>
          </div>

          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ArrowRightCircle className="w-4 h-4 text-white" />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-300/50 backdrop-blur-sm">
            <span className="text-[10px] text-indigo-100 uppercase font-bold">À:</span>
            <span className="text-sm font-bold text-white">
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

    return (
      <div className="mt-3 p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/40 shadow-lg">
        <div className="space-y-2 text-sm">
          {metadata.titre && (
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-200" />
              <span className="text-white font-semibold">{metadata.titre}</span>
            </div>
          )}
          {metadata.type && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-200" />
              <span className="text-white/90 capitalize">{metadata.type}</span>
            </div>
          )}
          {metadata.budget && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-300" />
              <span className="text-emerald-200 font-bold text-base">{metadata.budget.toLocaleString('fr-FR')} MAD</span>
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
      <div className="mt-3 p-5 rounded-lg bg-gradient-to-br from-green-500/25 to-emerald-500/25 backdrop-blur-sm border border-green-400/50 shadow-xl shadow-green-500/10">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/30 flex items-center justify-center backdrop-blur-sm border border-green-400/40">
              <Wallet className="w-5 h-5 text-green-200" />
            </div>
            <span className="text-green-200 font-bold text-2xl">
              {metadata.montant.toLocaleString('fr-FR')} MAD
            </span>
          </div>
          {metadata.methode && (
            <div className="flex items-center gap-2 pl-12">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span className="text-white font-medium capitalize">{metadata.methode}</span>
            </div>
          )}
          {metadata.reference && (
            <div className="flex items-center gap-2 pl-12">
              <FileText className="w-4 h-4 text-emerald-300" />
              <span className="text-white/90 text-sm">Réf: <span className="font-mono font-semibold">{metadata.reference}</span></span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-700/30 via-slate-800/30 to-slate-900/30 rounded-xl border border-slate-500/40 p-6 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Historique Complet
          </h3>
          <p className="text-sm text-slate-300">
            {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "all", label: "Tous", icon: null, count: allEvents.length },
            { key: "statuts", label: "Statuts", icon: TrendingUp, count: allEvents.filter(e => e.displayType === "statuts").length },
            { key: "opportunites", label: "Opportunités", icon: Briefcase, count: allEvents.filter(e => e.displayType === "opportunites").length },
            { key: "taches", label: "Tâches", icon: CheckCircle, count: allEvents.filter(e => e.displayType === "taches").length },
            { key: "rdv", label: "RDV", icon: Calendar, count: allEvents.filter(e => e.displayType === "rdv").length },
            { key: "documents", label: "Documents", icon: FileText, count: allEvents.filter(e => e.displayType === "documents").length },
            { key: "notes", label: "Notes", icon: MessageSquare, count: allEvents.filter(e => e.displayType === "notes").length },
            { key: "paiements", label: "Paiements", icon: Wallet, count: allEvents.filter(e => e.displayType === "paiements").length },
          ].map(filter => {
            const Icon = filter.icon
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                  activeFilter === filter.key
                    ? "bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {filter.label}
                {filter.count > 0 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    activeFilter === filter.key
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/50"
                  )}>
                    {filter.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Timeline */}
      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateKey, events]) => {
            const processedEvents = groupSystemUpdates(events)
            
            return (
              <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-primary/30" />
                <span className="text-xs font-bold text-white uppercase tracking-wider px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/30 border border-primary/30 shadow-lg shadow-primary/10">
                  {dateKey}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-primary/30" />
              </div>

                {/* Events for this date */}
                <div className="space-y-3 relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary/50 via-white/10 to-transparent" />

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
                          className="relative pl-12"
                        >
                          {/* Icon */}
                          <div className={cn(
                            "absolute left-0 w-9 h-9 rounded-full flex items-center justify-center border-2 z-10 backdrop-blur-sm shadow-lg",
                            firstEvent.iconColor
                          )}>
                            <firstEvent.icon className="w-5 h-5" />
                          </div>

                          {/* Grouped Content Card */}
                          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl overflow-hidden hover:border-white/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5">
                            <button
                              onClick={() => toggleGroup(item.id)}
                              className="w-full p-5 hover:bg-white/25 transition-all duration-200 text-left"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <User className="w-4 h-4 text-slate-300" />
                                  <span className="text-xs font-semibold text-slate-200">
                                    {getUserName(firstEvent.author)}
                                  </span>
                                  <span className="text-xs text-slate-400">•</span>
                                  <span className="text-xs text-slate-300">
                                    {formatRelativeTime(firstEvent.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/40 text-white font-semibold backdrop-blur-sm">
                                    {groupEvents.length} mises à jour
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-300" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-300" />
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-sm text-slate-200 font-medium leading-relaxed">
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
                                  className="border-t border-white/20"
                                >
                                  <div className="p-4 space-y-2 bg-white/10 backdrop-blur-sm">
                                    {groupEvents.map((subEvent, subIndex) => (
                                      <div key={subEvent.id} className="text-sm p-4 rounded-lg bg-white/20 border border-white/20 backdrop-blur-sm hover:bg-white/25 transition-all duration-200">
                                        <div className="flex items-center gap-2 text-slate-300 mb-1.5">
                                          <Clock className="w-3.5 h-3.5" />
                                          {formatRelativeTime(subEvent.createdAt)}
                                        </div>
                                        <p className="text-white font-semibold">{subEvent.title}</p>
                                        {subEvent.description && (
                                          <div className="text-slate-200 mt-1">
                                            {formatDescription(subEvent.description)}
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
                        className="relative pl-12"
                      >
                        {/* Icon */}
                        <div className={cn(
                          "absolute left-0 w-9 h-9 rounded-full flex items-center justify-center border-2 z-10 backdrop-blur-sm shadow-lg",
                          event.iconColor
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content Card */}
                        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-5 hover:bg-white/25 hover:border-white/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <User className="w-4 h-4 text-slate-300" />
                              <span className="text-xs font-semibold text-slate-200">
                                {getUserName(event.author)}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-300">
                                {formatRelativeTime(event.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <h4 className="text-base font-bold text-white mb-2">
                            {event.title}
                          </h4>
                          
                          {event.description && (
                            <div className="text-sm text-slate-200 leading-relaxed">
                              {formatDescription(event.description)}
                            </div>
                          )}

                          {/* Special rendering for different event types */}
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
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700/30 to-slate-800/30 flex items-center justify-center mx-auto mb-4 border-2 border-slate-600/30">
            <History className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400 text-base font-medium">Aucun événement pour le moment</p>
          <p className="text-slate-500 text-sm mt-2">
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
          className="w-full mt-6 text-white/60 hover:text-white hover:bg-white/5 border border-white/10"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Voir moins
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Voir tout ({filteredEvents.length - maxItems} de plus)
            </>
          )}
        </Button>
      )}
    </div>
  )
}

