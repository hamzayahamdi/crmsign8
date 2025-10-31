"use client"

import { useState } from "react"
import { 
  Clock, MessageSquare, Phone, FileText, CheckCircle, DollarSign, 
  Calendar, MapPin, ExternalLink, Filter, Plus, ChevronDown, ChevronUp,
  TrendingUp, User
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

  // Group by date
  const groupedEvents = groupHistoryByDate(displayedEvents)

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
      <div className="mt-2 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/60">Statut changé:</span>
          <span className="text-white/80 font-medium">{getStatusLabel(entry.previousStatus)}</span>
          <span className="text-white/40">→</span>
          <span className="text-indigo-400 font-medium">{getStatusLabel(entry.newStatus)}</span>
        </div>
        
        {entry.durationInHours !== undefined && entry.durationInHours > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
            <Clock className="w-3.5 h-3.5" />
            <span>Durée précédente: <span className="text-white/80 font-medium">{formatDuration(entry.durationInHours)}</span></span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#171B22] rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Historique & Timeline</h3>
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
        <div className="flex flex-wrap gap-2 mb-6">
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
            <Clock className="w-8 h-8 text-white/40" />
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
