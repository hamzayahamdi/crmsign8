"use client"

import { useState, useEffect, useRef } from "react"
import {
  Clock, MessageSquare, Phone, FileText, CheckCircle, DollarSign,
  Calendar, MapPin, ExternalLink, Filter, Plus, ChevronDown, ChevronUp,
  TrendingUp, User, History, Activity, CheckCircle2
} from "lucide-react"
import type { Client, ClientHistoryEntry, Appointment } from "@/types/client"
import type { Task } from "@/types/task"
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
  onAddTask?: () => void
  showFilters?: boolean
  maxItems?: number
}
type FilterType = "all" | "statuts" | "rdv" | "notes" | "fichiers" | "activites"

export function EnhancedTimeline({
  client,
  onAddRdv,
  onAddTask,
  showFilters = true,
  maxItems = 20
}: EnhancedTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [showAll, setShowAll] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [cachedEvents, setCachedEvents] = useState<any[]>([]) // Cache events to prevent clearing
  const previousHistoriqueLengthRef = useRef(0)
  const isInitializedRef = useRef(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])

  // Fetch tasks for this client
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoadingTasks(true)
        const response = await fetch('/api/tasks', {
          credentials: 'include'
        })
        if (response.ok) {
          const result = await response.json()
          const allTasks = result.data || result
          if (Array.isArray(allTasks)) {
            const filtered = allTasks
              .filter(
                (task: Task) => 
                  task.linkedType === 'client' && 
                  task.linkedId === client.id && 
                  task.status !== 'termine'
              )
              .sort((a: Task, b: Task) => {
                const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0
                const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0
                return aDate - bDate
              })
            setTasks(filtered)
          }
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setIsLoadingTasks(false)
      }
    }
    fetchTasks()

    // Listen for task updates
    const handleTaskUpdate = (event: CustomEvent) => {
      if (event.detail.clientId === client.id || event.detail.linkedId === client.id) {
        fetchTasks()
      }
    }

    window.addEventListener('task-updated' as any, handleTaskUpdate)
    return () => window.removeEventListener('task-updated' as any, handleTaskUpdate)
  }, [client.id])

  // Get upcoming appointments
  useEffect(() => {
    if (client.rendezVous) {
      const upcoming = client.rendezVous
        .filter(rdv => isUpcomingAppointment(rdv.dateStart))
        .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
      setUpcomingAppointments(upcoming)
    } else {
      setUpcomingAppointments([])
    }

    // Listen for appointment updates
    const handleAppointmentUpdate = (event: CustomEvent) => {
      if (event.detail.clientId === client.id && client.rendezVous) {
        const upcoming = client.rendezVous
          .filter(rdv => isUpcomingAppointment(rdv.dateStart))
          .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
        setUpcomingAppointments(upcoming)
      }
    }

    window.addEventListener('appointment-updated' as any, handleAppointmentUpdate)
    return () => window.removeEventListener('appointment-updated' as any, handleAppointmentUpdate)
  }, [client.rendezVous, client.id])

  const hasActions = tasks.length > 0 || upcomingAppointments.length > 0

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (eventDate.getTime() === today.getTime()) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      return `Demain à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

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

  // Initialize cached events on mount
  useEffect(() => {
    if (!isInitializedRef.current && client.historique) {
      const initialEvents = [
        ...(client.historique || [])
          .filter(h => h.type !== 'rdv')
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
      
      setCachedEvents(initialEvents)
      previousHistoriqueLengthRef.current = client.historique.length
      isInitializedRef.current = true
    }
  }, [client.historique, client.rendezVous])

  // Update cached events when historique changes, but preserve existing events
  useEffect(() => {
    if (!isInitializedRef.current) return
    
    const currentHistorique = client.historique || []
    const currentLength = currentHistorique.length
    
    // If historique was cleared (length decreased significantly), don't clear cached events
    if (currentLength === 0 && previousHistoriqueLengthRef.current > 0) {
      console.log('[Timeline] Historique cleared, preserving cached events')
      return
    }
    
    // Only update if historique actually has new data
    if (currentLength > 0) {
      const newEvents = [
        ...currentHistorique
          .filter(h => h.type !== 'rdv')
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
      
      // Merge with existing cached events to avoid duplicates
      setCachedEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const eventsToAdd = newEvents.filter(e => !existingIds.has(e.id))
        return [...eventsToAdd, ...prev].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      })
      
      previousHistoriqueLengthRef.current = currentLength
    }
  }, [client.historique, client.rendezVous])

  // Combine cached events with current historique and appointments into unified timeline
  // Use cached events to prevent clearing during updates
  const allEventsRaw = cachedEvents.length > 0 ? cachedEvents : [
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

  // Filter out redundant "Architecte assigné" entries that appear right after "Opportunité créée"
  // These are redundant because the architect is already assigned when the lead is converted to contact
  // IMPORTANT: Filter out ALL "Architecte assigné" entries that appear near "Opportunité créée"
  const allEvents = allEventsRaw.filter((event, index) => {
    const description = (event.description || '').trim()
    
    // If this is an "Architecte assigné" activity
    if (/^Architecte assigné/i.test(description)) {
      const eventTime = new Date(event.date).getTime()
      const tenMinutes = 10 * 60 * 1000 // 10 minutes in milliseconds
      
      // Check if there's an "Opportunité créée" event within 10 minutes (before or after)
      const hasNearbyOpportunityCreated = allEventsRaw.some((otherEvent, otherIndex) => {
        // Skip if it's the same event
        if (otherIndex === index) return false
        
        const otherDescription = (otherEvent.description || '').trim()
        // Check if it's an "Opportunité créée" event
        if (/^Opportunité créée/i.test(otherDescription)) {
          const otherEventTime = new Date(otherEvent.date).getTime()
          const timeDiff = Math.abs(eventTime - otherEventTime)
          // If within 10 minutes, it's redundant - filter it out
          return timeDiff <= tenMinutes
        }
        return false
      })
      
      // If we found a nearby opportunity_created, filter out this redundant architect_assigned
      if (hasNearbyOpportunityCreated) {
        return false
      }
    }
    return true
  })

  // System activity patterns - these should appear in "Activités" tab, not "Notes"
  const systemActivityPatterns = [
    /^Architecte assigné/i,
    /^Gestionnaire assigné/i,
    /^Opportunité créée/i,
    /^Contact converti en Client/i,
    /^Contact créé depuis Lead/i,
    /^Statut changé/i,
    /^Lead créé par/i,
    /statut.*mis à jour/i,
    /déplacé/i,
    /mouvement/i,
    /Note de campagne/i,
    /^📝 Note de campagne/i,
    /^✉️ Message WhatsApp envoyé/i,
    /^📅 Nouveau rendez-vous/i,
    /^✅ Statut mis à jour/i,
  ]

  // Check if an event is a system activity (but NOT a status change - those have their own tab)
  const isSystemActivity = (event: any) => {
    // Exclude status changes - they have their own "Statuts" tab
    if (event.type === 'statut') return false
    
    if (event.type === 'note') {
      const description = event.description?.trim() || ''
      return systemActivityPatterns.some(pattern => pattern.test(description))
    }
    // Other system activities (non-note, non-statut types that are system-generated)
    return event.auteur === 'Système' || 
           event.auteur === 'Système (auto)' ||
           event.description?.includes('automatiquement')
  }

  // Check if an event is a real user-added note
  const isRealNote = (event: any) => {
    if (event.type !== 'note') return false
    const description = event.description?.trim() || ''
    if (!description) return false
    // Exclude system-generated notes
    return !systemActivityPatterns.some(pattern => pattern.test(description))
  }

  // Apply filters
  const filteredEvents = allEvents.filter(event => {
    if (activeFilter === "all") return true
    if (activeFilter === "statuts") return event.type === "statut"
    if (activeFilter === "rdv") return event.type === "rdv" || event.type === "rendez-vous"
    if (activeFilter === "notes") {
      // Only show real user-added notes, exclude system activities
      return isRealNote(event)
    }
    if (activeFilter === "activites") {
      // Show system activities (Architecte assigné, Opportunité créée, etc.)
      return isSystemActivity(event)
    }
    // Include both "document" and "devis" types in fichiers filter
    if (activeFilter === "fichiers") return event.type === "document" || event.type === "devis"
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
      note: "text-blue-400 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30",
      appel: "text-green-400 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30",
      whatsapp: "text-green-400 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30",
      modification: "text-purple-400 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30",
      statut: "text-indigo-400 bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border-indigo-500/30",
      document: "text-cyan-400 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
      "rendez-vous": "text-purple-400 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30",
      rdv: "text-purple-400 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30",
      devis: "text-yellow-400 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
      validation: "text-emerald-400 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
      acompte: "text-green-400 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30",
      tache: "text-blue-400 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30",
      projet: "text-purple-400 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30",
    }
    return colorMap[type] || "text-white/60 bg-white/10 border-white/20"
  }

  const renderRdvCard = (rdv: Appointment) => {
    const isUpcoming = isUpcomingAppointment(rdv.dateStart)
    const statusColor = getAppointmentStatusColor(rdv.status)

    return (
      <div className={cn(
        "mt-2 p-3 rounded-lg border transition-all",
        isUpcoming
          ? "bg-gradient-to-br from-purple-500/15 to-purple-500/5 border-purple-500/30"
          : "bg-white/5 border-white/10"
      )}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
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
      <div className="mt-1.5 p-2 rounded-md bg-gradient-to-r from-indigo-500/8 to-purple-500/8 border border-indigo-500/20">
        {/* Compact Status Transition */}
        <div className="flex items-center gap-1.5">
          {/* Previous Status - Compact */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-white/5 border border-white/10">
            <span className="text-[9px] text-white/40 uppercase font-light">Ancien:</span>
            <span className="text-[10px] font-light text-white/60 line-through decoration-red-400/40">
              {getStatusLabel(entry.previousStatus)}
            </span>
          </div>

          {/* Compact Arrow */}
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* New Status - Compact & Highlighted */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-400/30">
            <span className="text-[9px] text-indigo-300 uppercase font-light">Nouveau:</span>
            <span className="text-[10px] font-medium text-indigo-300">
              {getStatusLabel(entry.newStatus)}
            </span>
          </div>
        </div>

        {/* Duration Info - Compact */}
        {entry.durationInHours !== undefined && entry.durationInHours > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-white/5 text-[9px] font-light">
            <Clock className="w-2.5 h-2.5 text-indigo-400" />
            <span className="text-white/40">Durée:</span>
            <span className="text-white/70">{formatDuration(entry.durationInHours)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#171B22] rounded-lg border border-white/10 p-4">
      {/* ACTIONS & RDV Section */}
      <div className="mb-4 pb-4 border-b border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/80" />
            <CheckCircle2 className="w-4 h-4 text-white/80" />
            <h3 className="text-sm font-semibold text-white tracking-wide">ACTIONS & RDV</h3>
          </div>
          
          {/* Top Right Buttons */}
          <div className="flex items-center gap-1.5">
            {onAddTask && (
              <Button
                onClick={onAddTask}
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-[10px] text-white/70 hover:text-white hover:bg-white/10 font-light transition-all"
              >
                <Plus className="w-3 h-3 mr-1" />
                Tâche
              </Button>
            )}
            {onAddRdv && (
              <Button
                onClick={onAddRdv}
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-[10px] text-white/70 hover:text-white hover:bg-white/10 font-light transition-all"
              >
                <Plus className="w-3 h-3 mr-1" />
                RDV
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {isLoadingTasks ? (
          <div className="flex flex-col items-center justify-center py-6 px-4">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-white/40 font-light">Chargement...</p>
          </div>
        ) : !hasActions ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-6 px-4"
          >
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Calendar className="w-7 h-7 text-white/30" />
            </div>
            <p className="text-sm text-white/50 font-light mb-4 text-center">
              Aucune action ou RDV planifié
            </p>
            
            {/* Prominent Action Buttons */}
            <div className="w-full space-y-2.5">
              {onAddTask && (
                <Button
                  onClick={onAddTask}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-10 text-sm font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une tâche
                </Button>
              )}
              {onAddRdv && (
                <Button
                  onClick={onAddRdv}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white h-10 text-sm font-medium shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Planifier RDV
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Tasks */}
            {tasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  Tâches ({tasks.length})
                </h4>
                {tasks.slice(0, 3).map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all",
                      task.status === "en_cours"
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CheckCircle2 className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          task.status === "en_cours" ? "text-blue-400" : "text-white/50"
                        )} />
                        <p className="text-xs font-medium text-white truncate">{task.title}</p>
                      </div>
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="mt-1 text-[10px] text-white/40">
                        Assigné à: {task.assignedTo}
                      </div>
                    )}
                  </motion.div>
                ))}
                {tasks.length > 3 && (
                  <p className="text-[10px] text-white/40 text-center pt-1">
                    +{tasks.length - 3} autre{tasks.length - 3 > 1 ? 's' : ''} tâche{tasks.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Appointments */}
            {upcomingAppointments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  RDV ({upcomingAppointments.length})
                </h4>
                {upcomingAppointments.slice(0, 3).map((rdv) => (
                  <motion.div
                    key={rdv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-2.5 rounded-lg border bg-purple-500/10 border-purple-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <p className="text-xs font-medium text-white truncate">{rdv.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(rdv.dateStart)}</span>
                    </div>
                    {rdv.location && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{rdv.location}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
                {upcomingAppointments.length > 3 && (
                  <p className="text-[10px] text-white/40 text-center pt-1">
                    +{upcomingAppointments.length - 3} autre{upcomingAppointments.length - 3 > 1 ? 's' : ''} RDV
                  </p>
                )}
              </div>
            )}

            {/* Quick Add Buttons when there are items */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              {onAddTask && (
                <Button
                  onClick={onAddTask}
                  variant="outline"
                  className="w-full h-8 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Créer une tâche
                </Button>
              )}
              {onAddRdv && (
                <Button
                  onClick={onAddRdv}
                  variant="outline"
                  className="w-full h-8 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-xs font-medium transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 mr-2" />
                  Planifier RDV
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h3 className="text-sm font-light text-white mb-0.5 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-white/70" />
            Historique
          </h3>
          <p className="text-[10px] text-white/40 font-light">{filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            { key: "all", label: "Tous", icon: null, count: allEvents.length },
            { key: "statuts", label: "Statuts", icon: TrendingUp, count: allEvents.filter(e => e.type === "statut").length },
            { key: "rdv", label: "RDV", icon: Calendar, count: allEvents.filter(e => e.type === "rdv" || e.type === "rendez-vous").length },
            { key: "notes", label: "Notes", icon: MessageSquare, count: allEvents.filter(isRealNote).length },
            { key: "activites", label: "Activités", icon: Activity, count: allEvents.filter(isSystemActivity).length },
            { key: "fichiers", label: "Fichiers", icon: FileText, count: allEvents.filter(e => e.type === "document" || e.type === "devis").length }
          ].map(filter => {
            const Icon = filter.icon
            const count = filter.count || 0
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-light transition-all flex items-center gap-1",
                  activeFilter === filter.key
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{filter.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "px-1 py-0.5 rounded-full text-[9px] font-light",
                    activeFilter === filter.key
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/50"
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
          {Object.entries(groupedEvents).map(([dateKey, events]) => (
            <div key={dateKey}>
              {/* Date Separator */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-light text-white/40 uppercase tracking-wide">
                  {dateKey}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Events for this date */}
              <div className="space-y-2 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-3.5 top-2 bottom-2 w-px bg-white/10" />

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
                        transition={{ delay: index * 0.02 }}
                        className="relative pl-10"
                      >
                        {/* Icon */}
                        <div className="absolute left-0 w-6 h-6 rounded-full flex items-center justify-center border z-10 bg-indigo-500/20 border-indigo-500/30 text-indigo-400">
                          <TrendingUp className="w-3 h-3" />
                        </div>

                        {/* Grouped Content Card */}
                        <div className="bg-white/5 border border-white/5 rounded-md overflow-hidden">
                          <button
                            onClick={() => toggleGroup(event.id)}
                            className="w-full p-2 hover:bg-white/[0.07] transition-colors text-left"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <User className="w-3 h-3 text-white/40" />
                                <span className="text-[10px] font-light text-white/70">{event.auteur}</span>
                                <span className="text-[10px] text-white/30">•</span>
                                <span className="text-[10px] text-white/50 font-light">
                                  {formatRelativeTime(event.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-light">
                                  {groupEvents.length} mises à jour
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3 text-white/40" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-white/40" />
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-white/80 leading-relaxed font-light">
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
                                <div className="p-2 space-y-1.5 bg-white/[0.02]">
                                  {groupEvents.map((subEvent: any, subIndex: number) => (
                                    <div key={subEvent.id} className="text-[10px]">
                                      <div className="flex items-center gap-1.5 text-white/50 mb-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        <span className="font-light">{formatRelativeTime(subEvent.date)}</span>
                                      </div>
                                      <p className="text-white/70 font-light leading-relaxed">{subEvent.description}</p>
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
                  const isActivity = isSystemActivity(event)
                  const isNote = isRealNote(event)
                  const isStatusChange = event.type === 'statut'

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="relative pl-10"
                    >
                      {/* Icon - Enhanced for activities, status changes, and notes */}
                      <div className={cn(
                        "absolute left-0 w-6 h-6 rounded-full flex items-center justify-center border z-10",
                        isStatusChange
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                          : isActivity 
                          ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                          : isNote
                          ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                          : iconColor
                      )}>
                        {isStatusChange ? <TrendingUp className="w-3 h-3" /> : isActivity ? <Activity className="w-3 h-3" /> : isNote ? <MessageSquare className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                      </div>

                      {/* Content Card - Enhanced styling for activities vs notes vs status changes */}
                      <div className={cn(
                        "border rounded-md p-2 transition-colors",
                        isStatusChange
                          ? "bg-indigo-950/20 border-indigo-500/30 hover:bg-indigo-950/30 hover:border-indigo-500/40"
                          : isActivity
                          ? "bg-orange-950/20 border-orange-500/30 hover:bg-orange-950/30 hover:border-orange-500/40"
                          : isNote
                          ? "bg-blue-950/10 border-blue-500/20 hover:bg-blue-950/20 hover:border-blue-500/30"
                          : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
                      )}>
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <User className={cn(
                              "w-3 h-3",
                              isStatusChange ? "text-indigo-400/60" : isActivity ? "text-orange-400/60" : isNote ? "text-blue-400/60" : "text-white/40"
                            )} />
                            <span className={cn(
                              "text-[10px] font-light",
                              isStatusChange ? "text-indigo-200" : isActivity ? "text-orange-200" : isNote ? "text-blue-200" : "text-white/70"
                            )}>{event.auteur}</span>
                            <span className="text-[10px] text-white/30">•</span>
                            <span className={cn(
                              "text-[10px] font-light",
                              isStatusChange ? "text-indigo-300/70" : isActivity ? "text-orange-300/70" : isNote ? "text-blue-300/70" : "text-white/50"
                            )}>
                              {formatRelativeTime(event.date)}
                            </span>
                            {isStatusChange && (
                              <>
                                <span className="text-[10px] text-white/30">•</span>
                                <span className="text-[9px] px-1 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-light uppercase">
                                  Statut
                                </span>
                              </>
                            )}
                            {isActivity && (
                              <>
                                <span className="text-[10px] text-white/30">•</span>
                                <span className="text-[9px] px-1 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-light uppercase">
                                  Activité
                                </span>
                              </>
                            )}
                            {isNote && (
                              <>
                                <span className="text-[10px] text-white/30">•</span>
                                <span className="text-[9px] px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-light uppercase">
                                  Note
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <p className={cn(
                          "text-xs leading-relaxed font-light",
                          isStatusChange
                            ? "text-indigo-100"
                            : isActivity 
                            ? "text-orange-100" 
                            : isNote 
                            ? "text-blue-100" 
                            : "text-white/80"
                        )}>
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
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6 text-white/40" />
          </div>
          <p className="text-white/60 text-xs font-light">Aucun événement pour le moment</p>
        </div>
      )}

      {/* Show More/Less Button */}
      {hasMore && (
        <Button
          onClick={() => setShowAll(!showAll)}
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-white/60 hover:text-white hover:bg-white/5 h-7 text-[10px] font-light"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Voir moins
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Voir tout ({filteredEvents.length - maxItems} de plus)
            </>
          )}
        </Button>
      )}
    </div>
  )
}
