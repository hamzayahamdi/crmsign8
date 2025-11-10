"use client"

import { useState } from "react"
import { 
  Clock, MessageSquare, Phone, FileText, CheckCircle, DollarSign, 
  Calendar, MapPin, ExternalLink, Filter, Plus, ChevronDown, ChevronUp,
  TrendingUp, User, History
} from "lucide-react"
import type { Client, ClientHistoryEntry, Appointment } from "@/types/client"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { 
  formatRelativeTime, 
  formatDuration, 
  getStatusLabel, 
  groupHistoryByDate,
  getAppointmentStatusColor,
  isUpcomingAppointment
} from "@/lib/timeline-utils"
import { cn } from "@/lib/utils"

interface EnhancedTimelineProps {
  client: Client
  onAddRdv?: () => void
  showFilters?: boolean
  maxItems?: number
}

type FilterType = "all" | "statuts" | "rdv" | "notes" | "fichiers"

export function EnhancedTimeline({ 
  client, 
  onAddRdv,
  showFilters = true,
  maxItems = 20
}: EnhancedTimelineProps) {
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

  // Combine historique and appointments into unified timeline
  // Filter out historique entries with type 'rdv' to avoid duplicates (RDV come from rendezVous array)
  const allEvents = [
    ...(client.historique || [])
      .filter(h => h.type !== 'rdv') // Exclude rdv type from historique to avoid duplicates
      .map(h => ({ ...h, eventType: 'history' as const })),
    ...(client.rendezVous || []).map(rdv => ({
      id: rdv.id,
      date: rdv.dateStart,
      type: 'rdv' as const,
      description: rdv.title,
      auteur: rdv.createdBy,
      metadata: rdv,
      eventType: 'rdv' as const
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Apply filters
  const filteredEvents = allEvents.filter(event => {
    if (activeFilter === "all") return true
    if (activeFilter === "statuts") return event.type === "statut"
    if (activeFilter === "rdv") return event.type === "rdv" || event.type === "rendez-vous"
    if (activeFilter === "notes") return event.type === "note"
    if (activeFilter === "fichiers") return event.type === "document"
    return true
  })

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, maxItems)
  const hasMore = filteredEvents.length > maxItems

  // Group system status updates
  const groupSystemUpdates = (events: any[]) => {
    const grouped: any[] = []
    let systemUpdateGroup: any[] = []
    
    events.forEach((event, index) => {
      const isSystemUpdate = event.type === 'statut' && 
        (event.auteur === 'Système' || event.auteur === 'Système (auto)' || 
         event.description?.includes('automatiquement'))
      
      if (isSystemUpdate) {
        systemUpdateGroup.push(event)
      } else {
        // If we have accumulated system updates, add them as a group
        if (systemUpdateGroup.length > 0) {
          if (systemUpdateGroup.length === 1) {
            grouped.push(systemUpdateGroup[0])
          } else {
            grouped.push({
              id: `system-group-${systemUpdateGroup[0].id}`,
              type: 'system-group',
              events: systemUpdateGroup,
              date: systemUpdateGroup[0].date,
              description: `${systemUpdateGroup.length} changements d'étape automatiques`,
              auteur: 'Système'
            })
          }
          systemUpdateGroup = []
        }
        grouped.push(event)
      }
    })
    
    // Handle remaining system updates
    if (systemUpdateGroup.length > 0) {
      if (systemUpdateGroup.length === 1) {
        grouped.push(systemUpdateGroup[0])
      } else {
        grouped.push({
          id: `system-group-${systemUpdateGroup[0].id}`,
          type: 'system-group',
          events: systemUpdateGroup,
          date: systemUpdateGroup[0].date,
          description: `${systemUpdateGroup.length} changements d'étape automatiques`,
          auteur: 'Système'
        })
      }
    }
    
    return grouped
  }

  // Group system updates first, then group by date
  const eventsWithGroups = groupSystemUpdates(displayedEvents)
  const groupedEvents = groupHistoryByDate(eventsWithGroups)

  const getIcon = (type: ClientHistoryEntry['type']) => {
    const iconMap = {
      note: MessageSquare,
      appel: Phone,
      whatsapp: MessageSquare,
      modification: FileText,
      statut: TrendingUp,
      document: FileText,
      "rendez-vous": Calendar,
      rdv: Calendar,
      devis: FileText,
      validation: CheckCircle,
      acompte: DollarSign,
      tache: CheckCircle,
      projet: FileText,
    }
    return iconMap[type] || MessageSquare
  }

  const getIconColor = (type: ClientHistoryEntry['type']) => {
    const colorMap = {
      note: "text-blue-400 bg-blue-500/20 border-blue-500/30",
      appel: "text-green-400 bg-green-500/20 border-green-500/30",
      whatsapp: "text-green-400 bg-green-500/20 border-green-500/30",
      modification: "text-purple-400 bg-purple-500/20 border-purple-500/30",
      statut: "text-indigo-400 bg-indigo-500/20 border-indigo-500/30",
      document: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
      "rendez-vous": "text-pink-400 bg-pink-500/20 border-pink-500/30",
      rdv: "text-pink-400 bg-pink-500/20 border-pink-500/30",
      devis: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
      validation: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30",
      acompte: "text-green-400 bg-green-500/20 border-green-500/30",
      tache: "text-blue-400 bg-blue-500/20 border-blue-500/30",
      projet: "text-purple-400 bg-purple-500/20 border-purple-500/30",
    }
    return colorMap[type] || "text-white/60 bg-white/10 border-white/20"
  }

  const renderRdvCard = (rdv: Appointment) => {
    const isUpcoming = isUpcomingAppointment(rdv.dateStart)
    const statusColor = getAppointmentStatusColor(rdv.status)

    return (
      <div className={cn(
        "mt-2 p-3 rounded-lg border",
        isUpcoming ? "bg-blue-500/5 border-blue-500/20" : "bg-white/5 border-white/10"
      )}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">{rdv.title}</span>
          </div>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            statusColor
          )}>
            {rdv.status === "upcoming" ? "À venir" : rdv.status === "completed" ? "Terminé" : "Annulé"}
          </span>
        </div>
        
        <div className="space-y-1.5 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date(rdv.dateStart).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          
          {rdv.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>{rdv.location}</span>
              {rdv.locationUrl && (
                <a 
                  href={rdv.locationUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
          
          {rdv.notes && (
            <div className="mt-2 text-white/60 italic">
              🗒 {rdv.notes}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStatusChange = (entry: any) => {
    if (!entry.previousStatus || !entry.newStatus) return null

    return (
      <div className="mt-2 p-2.5 rounded-lg bg-gradient-to-r from-indigo-500/8 to-purple-500/8 border border-indigo-500/20">
        {/* Compact Status Transition */}
        <div className="flex items-center gap-2">
          {/* Previous Status - Compact */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 uppercase">Ancien:</span>
            <span className="text-xs font-medium text-white/60 line-through decoration-red-400/40">
              {getStatusLabel(entry.previousStatus)}
            </span>
          </div>

          {/* Compact Arrow */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* New Status - Compact & Highlighted */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-500/15 border border-indigo-400/30">
            <span className="text-[10px] text-indigo-300 uppercase font-medium">Nouveau:</span>
            <span className="text-xs font-bold text-indigo-300">
              {getStatusLabel(entry.newStatus)}
            </span>
          </div>
        </div>
        
        {/* Duration Info - Compact */}
        {entry.durationInHours !== undefined && entry.durationInHours > 0 && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 text-[10px]">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span className="text-white/40">Durée:</span>
            <span className="text-white/70 font-semibold">{formatDuration(entry.durationInHours)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#171B22] rounded-xl border border-white/10 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white mb-0.5 flex items-center gap-2">
            <History className="w-4 h-4 text-white/80" />
            Historique
          </h3>
          <p className="text-xs text-white/50">{filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}</p>
        </div>
        
        {onAddRdv && (
          <Button
            onClick={onAddRdv}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Ajouter RDV
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "all", label: "Tous", icon: null },
            { key: "statuts", label: "Statuts", icon: TrendingUp },
            { key: "rdv", label: "RDV", icon: Calendar },
            { key: "notes", label: "Notes", icon: MessageSquare },
            { key: "fichiers", label: "Fichiers", icon: FileText }
          ].map(filter => {
            const Icon = filter.icon
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  activeFilter === filter.key
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5 inline mr-1.5" />}
                {filter.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Timeline */}
      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateKey, events]) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  {dateKey}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Events for this date */}
              <div className="space-y-3 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-4 top-4 bottom-4 w-px bg-white/10" />

                {events.map((event, index) => {
                  // Handle system update groups
                  if (event.type === 'system-group') {
                    const isExpanded = expandedGroups.has(event.id)
                    const groupEvents = event.events || []
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="relative pl-12"
                      >
                        {/* Icon */}
                        <div className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border z-10 bg-indigo-500/20 border-indigo-500/30 text-indigo-400">
                          <TrendingUp className="w-4 h-4" />
                        </div>

                        {/* Grouped Content Card */}
                        <div className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleGroup(event.id)}
                            className="w-full p-3 hover:bg-white/[0.07] transition-colors text-left"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <User className="w-3.5 h-3.5 text-white/40" />
                                <span className="text-xs font-medium text-white/70">{event.auteur}</span>
                                <span className="text-xs text-white/30">•</span>
                                <span className="text-xs text-white/50">
                                  {formatRelativeTime(event.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                                  {groupEvents.length} mises à jour
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-white/40" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-white/40" />
                                )}
                              </div>
                            </div>
                            
                            <p className="text-sm text-white/80 leading-relaxed">
                              {event.description}
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
                                className="border-t border-white/5"
                              >
                                <div className="p-3 space-y-2 bg-white/[0.02]">
                                  {groupEvents.map((subEvent: any, subIndex: number) => (
                                    <div key={subEvent.id} className="text-xs">
                                      <div className="flex items-center gap-2 text-white/50 mb-1">
                                        <Clock className="w-3 h-3" />
                                        {formatRelativeTime(subEvent.date)}
                                      </div>
                                      <p className="text-white/70">{subEvent.description}</p>
                                      {subEvent.type === "statut" && renderStatusChange(subEvent)}
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
                  const Icon = getIcon(event.type)
                  const iconColor = getIconColor(event.type)

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
                        "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border z-10",
                        iconColor
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content Card */}
                      <div className="bg-white/5 border border-white/5 rounded-lg p-3 hover:bg-white/[0.07] transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="w-3.5 h-3.5 text-white/40" />
                            <span className="text-xs font-medium text-white/70">{event.auteur}</span>
                            <span className="text-xs text-white/30">•</span>
                            <span className="text-xs text-white/50">
                              {formatRelativeTime(event.date)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-white/80 leading-relaxed">
                          {event.description}
                        </p>

                        {/* Special rendering for status changes */}
                        {event.type === "statut" && renderStatusChange(event)}

                        {/* Special rendering for RDV */}
                        {event.type === "rdv" && event.metadata && renderRdvCard(event.metadata as Appointment)}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-white/40" />
          </div>
          <p className="text-white/60">Aucun événement pour le moment</p>
        </div>
      )}

      {/* Show More/Less Button */}
      {hasMore && (
        <Button
          onClick={() => setShowAll(!showAll)}
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-white/60 hover:text-white hover:bg-white/5"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Voir moins
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Voir tout ({filteredEvents.length - maxItems} de plus)
            </>
          )}
        </Button>
      )}
    </div>
  )
}
