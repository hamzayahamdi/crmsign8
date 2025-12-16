"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { 
  Clock, MessageSquare, Phone, FileText, CheckCircle, DollarSign, 
  Calendar, User, History, TrendingUp, ChevronDown, ChevronUp, Plus,
  Briefcase, Users, ArrowRightCircle, Sparkles, UserCheck, FileCheck,
  Wallet, XCircle, Trophy, Pause, Upload, Eye, ExternalLink
} from "lucide-react"
import type { ContactWithDetails, Timeline } from "@/types/contact"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { DevisFileViewerModal } from "@/components/client-details/devis-file-viewer-modal"
import { useToast } from "@/hooks/use-toast"

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
  const [unifiedNotes, setUnifiedNotes] = useState<any[]>([]) // Notes from unified Note table
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [cachedTimelineEvents, setCachedTimelineEvents] = useState<EnhancedTimelineEvent[]>([])
  const previousTimelineLengthRef = useRef(0)
  const isInitializedRef = useRef(false)
  const [viewerFile, setViewerFile] = useState<{ url: string | null, name: string, title: string } | null>(null)
  const { toast } = useToast()

  // Debug: Log contact data when it changes
  useEffect(() => {
    const payments = (contact as any).payments
    console.log('[Contact Timeline] Contact data received:', {
      contactId: contact.id,
      hasPayments: !!payments,
      payments: payments,
      paymentsType: typeof payments,
      paymentsIsArray: Array.isArray(payments),
      paymentsLength: Array.isArray(payments) ? payments.length : 0,
      allKeys: Object.keys(contact),
      contactStringified: JSON.stringify(contact, null, 2).substring(0, 500),
    })
  }, [contact])

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
    // For note events, if title is "Note ajoutée", use description as title instead
    let processedEvent = { ...event }
    if (event.eventType === 'note_added' && event.title === 'Note ajoutée' && event.description) {
      const noteContent = (event.description || '').trim()
      // Only replace if description has actual content (not empty or "Note ajoutée")
      if (noteContent && noteContent !== 'Note ajoutée') {
        processedEvent = {
          ...event,
          title: noteContent, // Use actual note content as title
          description: '', // Clear description to avoid duplication
        }
      }
    }
    
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
      // Handle devis entries from historique - they should appear as documents
      devis_uploaded: {
        displayType: 'documents',
        icon: Upload,
        iconColor: 'text-amber-400 bg-amber-500/20 border-amber-500/30'
      },
      note_added: {
        displayType: 'notes',
        icon: MessageSquare,
        iconColor: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      },
      other: {
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

    // Check if this is a devis event from historique (metadata.isDevis or description contains "Devis attaché")
    if (metadata?.isDevis || processedEvent.description?.includes('Devis attaché') || processedEvent.description?.includes('devis attaché')) {
      // Extract filename from description
      const filename = processedEvent.description?.replace(/^Devis attaché\s*:\s*/i, '').trim() || processedEvent.title || 'Devis'
      return {
        ...processedEvent,
        displayType: 'documents',
        icon: Upload,
        iconColor: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
        eventType: 'document_uploaded', // Normalize to document_uploaded
        title: filename, // Use filename as title
        metadata: {
          ...metadata,
          isDevis: true,
          name: filename,
          category: 'devis',
        }
      }
    }

    const config = eventConfig[processedEvent.eventType] || eventConfig.other

    return {
      ...processedEvent,
      ...config
    }
  }

  // Fetch notes from unified Note table and client historique
  useEffect(() => {
    const fetchNotes = async () => {
      if (!contact.id) return
      
      setIsLoadingNotes(true)
      try {
        const token = localStorage.getItem('token')
        
        // Fetch notes from contact notes API (includes client notes from API route)
        const response = await fetch(`/api/contacts/${contact.id}/notes`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        
        if (response.ok) {
          const notes = await response.json()
          // Filter out system-generated notes
          const systemNotePatterns = [
            /^Lead créé par/i,
            /statut.*mis à jour/i,
            /déplacé/i,
            /mouvement/i,
            /Note de campagne/i,
            /^📝 Note de campagne/i,
            /Architecte assigné/i,
            /Gestionnaire assigné/i,
            /Opportunité créée/i,
            /Contact converti en Client/i,
            /Contact créé depuis Lead/i,
            /Statut changé/i,
            /Statut Lead mis à jour/i,
            /^✉️ Message WhatsApp envoyé/i,
            /^📅 Nouveau rendez-vous/i,
            /^✅ Statut mis à jour/i,
          ]
          
          const userNotes = notes.filter((note: any) => {
            const content = note.content?.trim() || ''
            if (!content) return false
            return !systemNotePatterns.some(pattern => pattern.test(content))
          })
          
          setUnifiedNotes(userNotes)
        }
        
        // Also parse notes from contact.notes if available (includes client notes)
        if (contact.notes) {
          try {
            const parsedNotes = typeof contact.notes === 'string' 
              ? JSON.parse(contact.notes) 
              : contact.notes
            
            if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
              const systemNotePatterns = [
                /^Lead créé par/i,
                /statut.*mis à jour/i,
                /déplacé/i,
                /mouvement/i,
                /Note de campagne/i,
                /^📝 Note de campagne/i,
                /Architecte assigné/i,
                /Gestionnaire assigné/i,
                /Opportunité créée/i,
                /Contact converti en Client/i,
                /Contact créé depuis Lead/i,
                /Statut changé/i,
                /Statut Lead mis à jour/i,
                /^✉️ Message WhatsApp envoyé/i,
                /^📅 Nouveau rendez-vous/i,
                /^✅ Statut mis à jour/i,
              ]
              
              const userNotesFromContact = parsedNotes.filter((note: any) => {
                const content = (note.content || note.description || '').trim()
                if (!content) return false
                return !systemNotePatterns.some(pattern => pattern.test(content))
              })
              
              // Merge with existing notes, avoiding duplicates
              setUnifiedNotes(prev => {
                const existingIds = new Set(prev.map(n => n.id))
                const newNotes = userNotesFromContact.filter((n: any) => !existingIds.has(n.id))
                return [...prev, ...newNotes]
              })
            }
          } catch (e) {
            console.error('[Contact Timeline] Error parsing contact notes:', e)
          }
        }
      } catch (error) {
        console.error('[Contact Timeline] Error fetching notes:', error)
      } finally {
        setIsLoadingNotes(false)
      }
    }

    fetchNotes()
  }, [contact.id, contact.notes])

  // Initialize cached timeline events on mount
  useEffect(() => {
    if (!isInitializedRef.current && contact.timeline) {
      // Filter out timeline events that are just "Note ajoutée" placeholders
      const filteredTimeline = (contact.timeline || []).filter((event: any) => {
        // Exclude timeline events that are just "Note ajoutée" without real content
        if (event.eventType === 'note_added' && event.title === 'Note ajoutée') {
          const description = (event.description || '').trim()
          // Only exclude if description is empty or also "Note ajoutée"
          if (!description || description === 'Note ajoutée') {
            return false
          }
        }
        return true
      })
      const initialEvents = filteredTimeline.map(enhanceEvent)
      setCachedTimelineEvents(initialEvents)
      previousTimelineLengthRef.current = filteredTimeline.length
      isInitializedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.timeline])

  // Update cached timeline events when timeline changes, but preserve existing events
  useEffect(() => {
    if (!isInitializedRef.current) return
    
    const currentTimeline = contact.timeline || []
    const currentLength = currentTimeline.length
    
    // If timeline was cleared, don't clear cached events
    if (currentLength === 0 && previousTimelineLengthRef.current > 0) {
      console.log('[Contact Timeline] Timeline cleared, preserving cached events')
      return
    }
    
    // Only update if timeline actually has new data
    if (currentLength > 0) {
      // Filter out timeline events that are just "Note ajoutée" placeholders
      const filteredTimeline = currentTimeline.filter((event: any) => {
        // Exclude timeline events that are just "Note ajoutée" without real content
        if (event.eventType === 'note_added' && event.title === 'Note ajoutée') {
          const description = (event.description || '').trim()
          // Only exclude if description is empty or also "Note ajoutée"
          if (!description || description === 'Note ajoutée') {
            return false
          }
        }
        return true
      })
      
      const newEvents = filteredTimeline.map(enhanceEvent)
      
      // Merge with existing cached events to avoid duplicates
      setCachedTimelineEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const eventsToAdd = newEvents.filter(e => !existingIds.has(e.id))
        return [...eventsToAdd, ...prev].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      })
      
      previousTimelineLengthRef.current = filteredTimeline.length
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.timeline])

  // Convert timeline to enhanced events (use cached if available)
  // Filter out note events from timeline since we get them from unified notes
  const timelineEvents: EnhancedTimelineEvent[] = (cachedTimelineEvents.length > 0 
    ? cachedTimelineEvents 
    : (contact.timeline || []).map(enhanceEvent)
  ).filter(event => {
    // Exclude note events from timeline - we get them from unified notes instead
    // This prevents duplication
    if (event.displayType === 'notes' && event.eventType === 'note_added') {
      return false
    }
    return true
  })

  // Convert tasks to timeline events (from contact and clients)
  // Ensure we have tasks array
  const contactTasks = Array.isArray(contact.tasks) ? contact.tasks : []
  const taskEvents: EnhancedTimelineEvent[] = contactTasks
    .filter((task: any) => task && task.id) // Filter out invalid tasks
    .map((task: any) => ({
      id: `task-${task.id}`,
      eventType: task.status === 'completed' ? 'task_completed' : 'task_created',
      title: task.title || 'Tâche',
      description: task.description || '',
      author: task.createdBy || task.created_by || task.assignedTo || task.assigned_to || 'Utilisateur',
      createdAt: new Date(task.createdAt || task.created_at || task.dueDate || task.due_date || new Date()),
      displayType: 'taches',
      icon: CheckCircle,
      iconColor: task.status === 'completed' ? 'text-green-400 bg-green-500/20 border-green-500/30' : 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      metadata: {
        taskId: task.id,
        status: task.status,
        priority: task.priority,
        source: task.source || 'contact',
      }
    }))

  // Convert appointments to timeline events (from contact and clients)
  // Ensure we have appointments array
  const contactAppointments = Array.isArray(contact.appointments) ? contact.appointments : []
  const appointmentEvents: EnhancedTimelineEvent[] = contactAppointments
    .filter((appointment: any) => appointment && appointment.id) // Filter out invalid appointments
    .map((appointment: any) => ({
      id: `appointment-${appointment.id}`,
      eventType: appointment.status === 'completed' ? 'appointment_completed' : 'appointment_created',
      title: appointment.title || 'Rendez-vous',
      description: appointment.description || appointment.location || '',
      author: appointment.createdBy || appointment.created_by || 'Utilisateur',
      createdAt: new Date(appointment.dateStart || appointment.date_start || appointment.createdAt || appointment.created_at || new Date()),
      displayType: 'rdv',
      icon: Calendar,
      iconColor: appointment.status === 'completed' ? 'text-green-400 bg-green-500/20 border-green-500/30' : 'text-pink-400 bg-pink-500/20 border-pink-500/30',
      metadata: {
        appointmentId: appointment.id,
        status: appointment.status,
        location: appointment.location,
        dateStart: appointment.dateStart || appointment.date_start,
        dateEnd: appointment.dateEnd || appointment.date_end,
        source: appointment.source || 'contact',
      }
    }))

  // Convert documents to timeline events (from contact, opportunities, and clients)
  // Use useMemo to optimize performance - only recalculate when contact.documents changes
  const contactDocumentEvents: EnhancedTimelineEvent[] = useMemo(() => {
    const contactDocuments = Array.isArray(contact.documents) ? contact.documents : []
    
    return contactDocuments
    .filter((document: any) => {
      // Include all documents that have either an id or a name or a path (for devis)
      const hasId = document && (document.id || document.documentId || document.devisId)
      const hasName = document && (document.name || document.devisTitle)
      const hasPath = document && (document.path || document.fichier || document.url)
      // Include if it has any identifier - this ensures devis are included even if they only have a path
      return hasId || hasName || hasPath
    })
    .map((document: any) => {
      // Handle devis documents specially - check multiple ways to identify devis
      const isDevis = document.isDevis || 
                     document.category === 'devis' || 
                     document.type === 'devis' ||
                     document.id?.startsWith('devis-') ||
                     (document.bucket && document.bucket === 'devis')
      
      const documentId = document.id || document.documentId || document.devisId || `doc-${Date.now()}-${Math.random()}`
      
      // Use devis title if available, otherwise use name, otherwise extract from path
      let documentName = document.devisTitle || document.name || 'Document'
      if (!documentName || documentName === 'Document') {
        // Try to extract from path
        if (document.path || document.fichier) {
          const path = document.path || document.fichier
          documentName = path.split('/').pop() || path || 'Document'
        }
      }
      
      // Get proper date - prioritize uploadedAt, then createdAt, then date field
      let documentDate: Date
      try {
        const dateStr = document.uploadedAt || 
                       document.uploaded_at || 
                       document.createdAt || 
                       document.created_at || 
                       document.date
        if (dateStr) {
          documentDate = new Date(dateStr)
          if (isNaN(documentDate.getTime())) {
            documentDate = new Date()
          }
        } else {
          documentDate = new Date()
        }
      } catch {
        documentDate = new Date()
      }
      
      return {
        id: documentId.startsWith('devis-') ? documentId : `document-${documentId}`,
        eventType: 'document_uploaded',
        title: documentName,
        description: isDevis 
          ? 'Devis'
          : (document.category || document.type || ''),
        author: document.uploadedBy || 
                document.uploaded_by || 
                document.createdBy || 
                document.created_by || 
                'Utilisateur',
        createdAt: documentDate,
        displayType: 'documents',
        icon: Upload,
        iconColor: isDevis 
          ? 'text-amber-400 bg-amber-500/20 border-amber-500/30'
          : 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
        metadata: {
          documentId: documentId,
          name: documentName,
          path: document.path || document.fichier,
          url: document.url || document.path || document.fichier,
          type: document.type || (isDevis ? 'devis' : 'document'),
          category: document.category || (isDevis ? 'devis' : ''),
          source: document.source || 'contact',
          isDevis: isDevis,
          devisTitle: document.devisTitle,
          devisId: document.devisId || (isDevis && document.id ? document.id.replace('devis-', '') : undefined),
        }
      }
    })
  }, [contact.documents])

  // Convert opportunity documents to timeline events
  const opportunityDocumentEvents: EnhancedTimelineEvent[] = useMemo(() => {
    return (contact.opportunities || []).flatMap((opportunity: any) => 
      (opportunity.documents || []).map((document: any) => ({
        id: `opp-document-${document.id}`,
        eventType: 'document_uploaded',
        title: document.name || 'Document',
        description: `${opportunity.titre || 'Opportunité'} - ${document.category || document.type || ''}`,
        author: document.uploadedBy || 'Utilisateur',
        createdAt: new Date(document.uploadedAt || document.createdAt || new Date()),
        displayType: 'documents',
        icon: Upload,
        iconColor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
        metadata: {
          documentId: document.id,
          opportunityId: opportunity.id,
          name: document.name,
          path: document.path,
          url: document.url || document.path,
          type: document.type,
          category: document.category,
        }
      }))
    )
  }, [contact.opportunities])

  // Convert opportunity tasks to timeline events
  const opportunityTaskEvents: EnhancedTimelineEvent[] = (contact.opportunities || []).flatMap((opportunity: any) => 
    (opportunity.tasks || []).map((task: any) => ({
      id: `opp-task-${task.id}`,
      eventType: task.status === 'completed' ? 'task_completed' : 'task_created',
      title: task.title || 'Tâche',
      description: `${opportunity.titre || 'Opportunité'} - ${task.description || ''}`,
      author: task.createdBy || task.assignedTo || 'Utilisateur',
      createdAt: new Date(task.createdAt || task.dueDate || new Date()),
      displayType: 'taches',
      icon: CheckCircle,
      iconColor: task.status === 'completed' ? 'text-green-400 bg-green-500/20 border-green-500/30' : 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      metadata: {
        taskId: task.id,
        opportunityId: opportunity.id,
        status: task.status,
        priority: task.priority,
      }
    }))
  )

  // Convert opportunity appointments to timeline events
  const opportunityAppointmentEvents: EnhancedTimelineEvent[] = (contact.opportunities || []).flatMap((opportunity: any) => 
    (opportunity.appointments || []).map((appointment: any) => ({
      id: `opp-appointment-${appointment.id}`,
      eventType: appointment.status === 'completed' ? 'appointment_completed' : 'appointment_created',
      title: appointment.title || 'Rendez-vous',
      description: `${opportunity.titre || 'Opportunité'} - ${appointment.description || appointment.location || ''}`,
      author: appointment.createdBy || 'Utilisateur',
      createdAt: new Date(appointment.dateStart || appointment.createdAt || new Date()),
      displayType: 'rdv',
      icon: Calendar,
      iconColor: appointment.status === 'completed' ? 'text-green-400 bg-green-500/20 border-green-500/30' : 'text-pink-400 bg-pink-500/20 border-pink-500/30',
      metadata: {
        appointmentId: appointment.id,
        opportunityId: opportunity.id,
        status: appointment.status,
        location: appointment.location,
        dateStart: appointment.dateStart,
        dateEnd: appointment.dateEnd,
      }
    }))
  )

  const documentEvents = [...contactDocumentEvents, ...opportunityDocumentEvents]

  // Get document names from documents array to filter out duplicate timeline entries
  const documentNamesSet = new Set(
    documentEvents
      .map(e => e.metadata?.name)
      .filter((name): name is string => !!name)
      .map(name => name.toLowerCase().trim())
  )

  // Filter timeline events to exclude duplicate document entries
  const filteredTimelineEvents = timelineEvents.filter(event => {
    // Exclude timeline events that are "Document ajouté : filename" if we have the actual document
    if (event.description && (event.description.includes('Document ajouté :') || event.description.includes('document ajouté :'))) {
      const filename = event.description
        .replace(/^.*Document ajouté\s*:\s*/i, '')
        .trim()
        .toLowerCase()
      if (documentNamesSet.has(filename)) {
        return false // Exclude this timeline entry, we have the actual document
      }
    }
    
    // Exclude timeline events that are "Devis attaché : filename" if we have the actual devis document
    // This prevents duplication of devis files
    if (event.description && (event.description.includes('Devis attaché :') || event.description.includes('devis attaché :'))) {
      const filename = event.description
        .replace(/^.*Devis attaché\s*:\s*/i, '')
        .trim()
        .toLowerCase()
      // Check if we have this devis in our documents (by filename or by devis title)
      const hasMatchingDevis = Array.from(documentNamesSet).some(docName => {
        const normalizedDocName = docName.toLowerCase().trim()
        return normalizedDocName === filename || 
               normalizedDocName.includes(filename) || 
               filename.includes(normalizedDocName)
      })
      if (hasMatchingDevis) {
        return false // Exclude this historique entry, we have the actual devis document
      }
    }
    
    return true
  })

  // Convert payments to timeline events (from contact and clients)
  // Ensure we have payments array - check multiple possible locations
  let contactPayments: any[] = []
  
  // Try multiple ways to get payments
  if (Array.isArray(contact.payments)) {
    contactPayments = contact.payments
  } else if (Array.isArray((contact as any).payments)) {
    contactPayments = (contact as any).payments
  } else if ((contact as any).payments && typeof (contact as any).payments === 'object') {
    // If payments is an object, try to convert it
    const paymentsObj = (contact as any).payments
    if (paymentsObj.data && Array.isArray(paymentsObj.data)) {
      contactPayments = paymentsObj.data
    } else if (paymentsObj.length !== undefined) {
      // If it's array-like, convert it
      contactPayments = Array.from(paymentsObj)
    } else if (Array.isArray(paymentsObj)) {
      contactPayments = paymentsObj
    }
  }
  
  // Final fallback: ensure it's an array
  if (!Array.isArray(contactPayments)) {
    contactPayments = []
  }
  
  // CRITICAL: If we still have no payments but contact shows "ACOMPTE", try to fetch from API
  // This is a last resort to ensure payments are displayed
  if (contactPayments.length === 0 && (contact as any).tag === 'client') {
    console.warn('[Contact Timeline] ⚠️ No payments found in contact object, but contact is a client. This might indicate a data fetching issue.')
  }
  
  // Debug logging - always log to help diagnose
  console.log('[Contact Timeline] Contact object:', {
    hasPayments: !!(contact as any).payments,
    paymentsType: typeof (contact as any).payments,
    paymentsIsArray: Array.isArray((contact as any).payments),
    paymentsLength: contactPayments.length,
    contactKeys: Object.keys(contact),
  })
  
  console.log('[Contact Timeline] Processing payments:', {
    count: contactPayments.length,
    payments: contactPayments.map((p: any) => ({
      id: p.id,
      montant: p.montant || p.amount,
      methode: p.methode || p.method,
      type: p.type,
      source: p.source,
      date: p.date || p.createdAt || p.created_at,
    }))
  })
  
  // Get payment IDs from payments array to exclude duplicate timeline events
  const paymentIdsFromPayments = new Set(
    contactPayments
      .filter((p: any) => p && p.id)
      .map((p: any) => p.id)
  )
  
  const paymentEvents: EnhancedTimelineEvent[] = contactPayments
    .filter((payment: any) => {
      // Filter out invalid payments (must have amount)
      if (!payment) {
        console.warn('[Contact Timeline] Invalid payment (null/undefined):', payment)
        return false
      }
      if (!payment.id) {
        console.warn('[Contact Timeline] Payment missing ID:', payment)
        return false
      }
      const amount = payment.montant || payment.amount
      if (amount === null || amount === undefined || amount <= 0) {
        console.warn('[Contact Timeline] Payment missing or invalid amount:', { payment, amount })
        return false
      }
      return true
    })
    .map((payment: any) => {
      console.log('[Contact Timeline] Creating payment event for:', {
        id: payment.id,
        montant: payment.montant || payment.amount,
        type: payment.type,
      })
      const amount = payment.montant || payment.amount || 0
      const method = payment.methode || payment.method || 'Non spécifié'
      const paymentType = payment.type || 'paiement'
      const description = payment.description || payment.notes || ''
      const reference = payment.reference || payment.ref || ''
      
      // Build title with payment type if it's "Acompte" or "accompte"
      const isAcompte = paymentType?.toLowerCase() === 'accompte' || paymentType === 'Acompte'
      const title = isAcompte
        ? `Acompte de ${amount.toLocaleString('fr-FR')} MAD`
        : `Paiement de ${amount.toLocaleString('fr-FR')} MAD`
      
      // Build description with all payment details
      const paymentDescription = [
        method,
        description,
        reference ? `Réf: ${reference}` : null
      ].filter(Boolean).join(' - ')
      
      // Ensure we have a valid date
      let paymentDate: Date
      try {
        paymentDate = new Date(payment.date || payment.createdAt || payment.created_at || new Date())
        if (isNaN(paymentDate.getTime())) {
          paymentDate = new Date()
        }
      } catch {
        paymentDate = new Date()
      }
      
      return {
        id: `payment-${payment.id}`,
        eventType: 'other',
        title: title,
        description: paymentDescription || method,
        author: payment.createdBy || payment.created_by || 'Utilisateur',
        createdAt: paymentDate,
        displayType: 'paiements',
        icon: Wallet,
        // Different icon colors for Acompte vs regular payments
        iconColor: isAcompte 
          ? 'text-amber-400 bg-amber-500/20 border-amber-500/30 shadow-amber-500/20' 
          : 'text-green-400 bg-green-500/20 border-green-500/30',
        metadata: {
          paymentId: payment.id,
          montant: amount,
          methode: method,
          reference: reference,
          type: paymentType,
          source: payment.source || 'contact',
          isAcompte: isAcompte,
        }
      }
    })

  // Convert unified notes to timeline events - use content as title, not "Note ajoutée"
  const noteEvents: EnhancedTimelineEvent[] = unifiedNotes
    .filter(note => {
      // Only include notes with actual content (not just "Note ajoutée")
      const content = (note.content || '').trim()
      return content && content !== 'Note ajoutée' && content.length > 0
    })
    .map(note => ({
      id: `note-${note.id}`,
      eventType: 'note_added',
      title: (note.content || '').trim(), // Use actual content as title, not "Note ajoutée"
      description: '', // Don't duplicate content in description
      author: note.createdBy,
      createdAt: new Date(note.createdAt),
      displayType: 'notes',
      icon: MessageSquare,
      iconColor: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      metadata: {
        noteId: note.id,
        source: note.source,
        sourceType: note.type,
        isNote: true, // Flag to identify real notes
      }
    }))

  // Combine timeline events with notes, tasks, appointments, documents, and payments, then deduplicate
  // Use filteredTimelineEvents instead of timelineEvents to exclude duplicate document entries
  const combinedEvents: EnhancedTimelineEvent[] = [
    ...filteredTimelineEvents,
    ...noteEvents,
    ...taskEvents,
    ...opportunityTaskEvents,
    ...appointmentEvents,
    ...opportunityAppointmentEvents,
    ...documentEvents,
    ...paymentEvents
  ].filter(event => event && event.id) // Filter out any invalid events


  // Deduplicate events - prioritize unified notes over timeline events
  // First, separate notes from other events
  const noteEventsList = combinedEvents.filter(e => e.displayType === 'notes' && (e.metadata?.isNote || e.id?.startsWith('note-')))
  const otherEvents = combinedEvents.filter(e => e.displayType !== 'notes' || (!e.metadata?.isNote && !e.id?.startsWith('note-')))
  
  // Deduplicate notes by content + author + date (keep unified notes, remove timeline duplicates)
  const deduplicatedNotes = noteEventsList.filter((event, index, self) => {
    // Prefer unified notes (those with isNote flag) over timeline events
    if (event.metadata?.isNote || event.id?.startsWith('note-')) {
      return true // Keep all unified notes
    }
    // For timeline note events, check if there's a matching unified note
    const eventKey = `${event.title?.trim().toLowerCase()}|${event.author}|${new Date(event.createdAt).setSeconds(0, 0)}`
    const hasMatchingUnifiedNote = self.some(e => {
      if (e.metadata?.isNote || e.id?.startsWith('note-')) {
        const eKey = `${e.title?.trim().toLowerCase()}|${e.author}|${new Date(e.createdAt).setSeconds(0, 0)}`
        return eKey === eventKey
      }
      return false
    })
    // Only keep timeline note if there's no matching unified note
    return !hasMatchingUnifiedNote
  })
  
  // Get document names from document events to exclude duplicate historique entries
  const documentNamesFromDocuments = new Set(
    documentEvents
      .map(e => e.metadata?.name)
      .filter((name): name is string => !!name)
      .map(name => name.toLowerCase().trim())
  )

  // Deduplicate other events by id
  // IMPORTANT: Keep ALL payment events from payments array, even if they appear in timeline
  // IMPORTANT: Keep ALL document events from documents array - they are the source of truth
  // Exclude timeline historique entries that duplicate document events
  // Exclude timeline payment events if we have the actual payment from payments array
  const deduplicatedOtherEvents = otherEvents.filter((event, index, self) => {
    // CRITICAL: Always keep payment events that come from the payments array
    if (event.displayType === 'paiements' && event.id?.startsWith('payment-')) {
      return true
    }
    
    // CRITICAL: Always keep document events from documents array - they are the source of truth
    if (event.displayType === 'documents' && (event.id?.startsWith('document-') || event.id?.startsWith('devis-') || event.id?.startsWith('opp-document-'))) {
      return true
    }
    
    // Exclude timeline events that are just "Document ajouté : {filename}" if we have the actual document
    if (event.displayType !== 'documents' && event.description) {
      const desc = event.description.trim()
      // Check if this is a "Document ajouté : filename" entry
      if (desc.startsWith('Document ajouté :') || desc.startsWith('document ajouté :')) {
        const filename = desc.replace(/^Document ajouté\s*:\s*/i, '').trim().toLowerCase()
        // If we have this document in our documents array, exclude this historique entry
        if (documentNamesFromDocuments.has(filename)) {
          return false
        }
      }
    }
    
    // If this is a payment event from timeline, check if we have the actual payment
    if (event.displayType === 'paiements' && event.metadata?.paymentId) {
      const paymentId = event.metadata.paymentId
      // If we have this payment in our payments array, exclude the timeline event (we prefer the payment event)
      if (paymentIdsFromPayments.has(paymentId)) {
        return false
      }
    }
    
    if (event.id) {
      return index === self.findIndex(e => e.id === event.id)
    }
    // For events without id, deduplicate by title + author + date
    const eventKey = `${event.title}|${event.author}|${new Date(event.createdAt).setSeconds(0, 0)}`
    return index === self.findIndex(e => {
      const eKey = `${e.title}|${e.author}|${new Date(e.createdAt).setSeconds(0, 0)}`
      return eKey === eventKey
    })
  })
  
  // Combine deduplicated notes and other events
  const deduplicatedEvents = [...deduplicatedNotes, ...deduplicatedOtherEvents]

  // Sort by date (newest first)
  const allEvents: EnhancedTimelineEvent[] = deduplicatedEvents.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  

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

  // Apply filters - for notes, only show actual notes (not other activities)
  const filteredEvents = allEvents.filter(event => {
    if (activeFilter === "all") return true
    if (activeFilter === "statuts") return event.displayType === "statuts"
    if (activeFilter === "opportunites") return event.displayType === "opportunites"
    if (activeFilter === "taches") return event.displayType === "taches"
    if (activeFilter === "rdv") return event.displayType === "rdv"
    if (activeFilter === "documents") return event.displayType === "documents"
    if (activeFilter === "notes") {
      // Only show actual notes (displayType === "notes" AND has isNote flag or is from unified notes)
      // Also exclude notes with empty or "Note ajoutée" content
      if (event.displayType !== "notes") return false
      if (!(event.metadata?.isNote || event.id?.startsWith('note-'))) return false
      // Exclude notes with empty content or just "Note ajoutée"
      const content = (event.title || event.description || '').trim()
      if (!content || content === 'Note ajoutée') return false
      return true
    }
    if (activeFilter === "paiements") {
      return event.displayType === "paiements"
    }
    return true
  })
  
  // Calculate notes count using the same logic as the filter
  const notesCount = allEvents.filter(event => {
    if (event.displayType !== "notes") return false
    if (!(event.metadata?.isNote || event.id?.startsWith('note-'))) return false
    // Exclude notes with empty content or just "Note ajoutée"
    const content = (event.title || event.description || '').trim()
    if (!content || content === 'Note ajoutée') return false
    return true
  }).length

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

  // Check if file type can be previewed in modal
  const canPreviewInModal = (fileName: string): boolean => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    const previewableTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    return previewableTypes.includes(ext)
  }

  // Handle file viewing
  const handleViewFile = async (metadata: any) => {
    // Check for file path in multiple possible fields (path, url, fichier for devis)
    const filePath = metadata.path || metadata.url || metadata.fichier
    
    if (!filePath) {
      toast({
        title: "Fichier indisponible",
        description: "Aucun fichier disponible pour ce document",
        variant: "destructive",
      })
      return
    }

    try {
      let fileUrl: string | null = filePath
      
      // If it's a path (not a full URL), get signed URL
      if (fileUrl && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
        const loadingToast = toast({
          title: "Chargement...",
          description: "Ouverture du fichier en cours",
        })
        
        const response = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(fileUrl)}`)
        const data = await response.json()
        
        loadingToast.dismiss()
        
        if (data.url) {
          fileUrl = data.url
        } else {
          throw new Error('Impossible d\'obtenir l\'URL du fichier')
        }
      }
      
      if (fileUrl) {
        const fileName = metadata.name || 'Document'
        
        // If file can't be previewed (like .xlsx, .docx, etc.), open directly in new tab
        if (!canPreviewInModal(fileName)) {
          window.open(fileUrl, '_blank', 'noopener,noreferrer')
          toast({
            title: "Fichier ouvert",
            description: "Le fichier s'ouvre dans un nouvel onglet",
          })
        } else {
          // For previewable files (images, PDFs), open in modal
          setViewerFile({
            url: fileUrl,
            name: fileName,
            title: fileName
          })
        }
      } else {
        throw new Error('Aucune URL de fichier disponible')
      }
    } catch (error: any) {
      console.error('[Timeline] Error opening file:', error)
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'ouvrir le fichier. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }

  // Render document details if available
  const renderDocumentDetails = (event: EnhancedTimelineEvent) => {
    const metadata = event.metadata as any
    if (!metadata || !metadata.name) return null

    const isDevis = metadata.category === 'devis' || metadata.isDevis || metadata.type === 'devis'
    const fileExt = metadata.name?.split('.').pop()?.toLowerCase() || ''
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)
    const isPdf = fileExt === 'pdf'
    // Check for file path in multiple possible fields
    const hasFile = !!(metadata.path || metadata.url || metadata.fichier)
    
    // Different styling for devis vs regular documents
    const bgColor = isDevis 
      ? 'bg-amber-500/10 border-amber-500/30' 
      : isImage
      ? 'bg-blue-500/10 border-blue-500/30'
      : 'bg-cyan-500/10 border-cyan-500/30'
    const iconBg = isDevis 
      ? 'bg-amber-500 border-amber-400/50 shadow-amber-500/30' 
      : isImage
      ? 'bg-blue-500 border-blue-400/50 shadow-blue-500/30'
      : 'bg-cyan-500 border-cyan-400/50 shadow-cyan-500/30'
    const textColor = isDevis 
      ? 'text-amber-300' 
      : isImage
      ? 'text-blue-300'
      : 'text-cyan-300'
    const iconColor = isDevis 
      ? 'text-amber-400' 
      : isImage
      ? 'text-blue-400'
      : 'text-cyan-400'

    const getFileIcon = () => {
      if (isDevis) return FileText
      if (isImage) return FileText // Could use Image icon if imported
      if (isPdf) return FileText
      return FileText
    }

    const FileIcon = getFileIcon()

    return (
      <div className={cn("mt-1.5 p-2 rounded-lg backdrop-blur-sm border shadow-lg group", bgColor)}>
        <div className="flex items-center gap-2">
          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center border shadow-lg flex-shrink-0", iconBg)}>
            <FileIcon className={cn("w-3.5 h-3.5 text-white")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold text-sm break-words leading-tight", textColor)}>
              {metadata.name}
            </p>
            {metadata.category && metadata.category !== 'devis' && (
              <p className="text-[10px] text-slate-400 font-light capitalize mt-0.5">
                {metadata.category}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isDevis && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-semibold uppercase tracking-wide shadow-sm">
                Devis
              </span>
            )}
            {hasFile && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewFile(metadata)
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  "bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30",
                  "flex items-center justify-center shadow-sm",
                  "hover:shadow-md"
                )}
                title="Visualiser le fichier"
              >
                <Eye className={cn("w-4 h-4", iconColor)} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render payment details if available
  const renderPaymentDetails = (event: EnhancedTimelineEvent) => {
    const metadata = event.metadata as any
    if (!metadata || !metadata.montant) return null

    const isAcompte = metadata.isAcompte || metadata.type?.toLowerCase() === 'accompte' || metadata.type === 'Acompte'
    
    // Different styling for Acompte vs regular payments
    const bgColor = isAcompte 
      ? 'bg-amber-500/10 border-amber-500/30' 
      : 'bg-emerald-500/10 border-emerald-500/30'
    const iconBg = isAcompte 
      ? 'bg-amber-500 border-amber-400/50 shadow-amber-500/30' 
      : 'bg-emerald-500 border-emerald-400/50 shadow-emerald-500/30'
    const textColor = isAcompte 
      ? 'text-amber-300' 
      : 'text-emerald-300'
    const iconColor = isAcompte 
      ? 'text-amber-400' 
      : 'text-emerald-400'

    return (
      <div className={cn("mt-2 p-3 rounded-lg backdrop-blur-sm border shadow-lg", bgColor)}>
        <div className="space-y-2">
          {/* Amount and Acompte badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center border shadow-lg", iconBg)}>
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={cn("font-semibold text-base", textColor)}>
                {metadata.montant.toLocaleString('fr-FR')} MAD
              </span>
            </div>
            {isAcompte && (
              <span className="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold uppercase tracking-wide shadow-sm">
                Acompte
              </span>
            )}
          </div>
          
          {/* Payment method */}
          {metadata.methode && (
            <div className="flex items-center gap-1.5 pl-9">
              <CheckCircle className={cn("w-3.5 h-3.5", iconColor)} />
              <span className="text-slate-200 font-medium capitalize text-xs">{metadata.methode}</span>
            </div>
          )}
          
          {/* Reference */}
          {metadata.reference && (
            <div className="flex items-center gap-1.5 pl-9">
              <FileText className={cn("w-3 h-3", iconColor)} />
              <span className="text-slate-400 text-xs font-light">Réf: <span className="font-mono font-medium text-slate-200">{metadata.reference}</span></span>
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
            { key: "notes", label: "Notes", icon: MessageSquare, count: notesCount },
            { key: "paiements", label: "Paiements", icon: Wallet, count: allEvents.filter(e => e.displayType === "paiements").length },
          ].map(filter => {
            const Icon = filter.icon
            const count = filter.count
            
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-light transition-all flex items-center gap-1.5",
                  activeFilter === filter.key
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-500/50"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-slate-700/50 hover:border-slate-600/50"
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{filter.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium min-w-[18px] text-center",
                    activeFilter === filter.key
                      ? "bg-white/25 text-white"
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
      {isLoadingNotes ? (
        <div className="space-y-3">
          {/* Skeleton loaders for better perceived performance */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="relative pl-10 animate-pulse">
              <div className="absolute left-0 w-6 h-6 rounded-full bg-slate-700/50 border border-slate-600/50" />
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 bg-slate-700/50 rounded" />
                  <div className="h-3 w-16 bg-slate-700/50 rounded" />
                </div>
                <div className="h-4 w-full bg-slate-700/50 rounded" />
                <div className="h-3 w-3/4 bg-slate-700/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(groupedEvents).length > 0 ? (
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
                                        {/* For notes, show content directly without "Note ajoutée" */}
                                        {subEvent.displayType === 'notes' && subEvent.metadata?.isNote ? (
                                          <div className="text-white font-light text-xs leading-relaxed">
                                            {subEvent.title}
                                          </div>
                                        ) : (
                                          <>
                                            {subEvent.title && subEvent.title !== 'Note ajoutée' && (
                                        <p className="text-white font-light text-xs mb-1">{subEvent.title}</p>
                                            )}
                                        {subEvent.description && (
                                          <div className="text-slate-300 mt-1 leading-relaxed text-xs font-light">
                                            {formatDescription(subEvent.description, subEvent.eventType)}
                                          </div>
                                            )}
                                          </>
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

                        {/* Content Card - Enhanced styling for Acompte payments */}
                        <div className={cn(
                          "backdrop-blur-sm rounded-lg p-2 transition-all shadow-lg",
                          event.displayType === 'paiements' && event.metadata?.isAcompte
                            ? "bg-amber-950/20 border-2 border-amber-500/40 hover:bg-amber-950/30 hover:border-amber-500/60"
                            : "bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50"
                        )}>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-light text-white">
                              {getUserName(event.author)}
                            </span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span className="text-[10px] text-slate-400 font-light">
                              {formatRelativeTime(event.createdAt)}
                            </span>
                          </div>
                          
                          {/* For notes, show content directly without "Note ajoutée" title */}
                          {event.displayType === 'notes' && event.metadata?.isNote ? (
                            <div className="text-xs text-white leading-relaxed font-light">
                              {event.title}
                            </div>
                          ) : (
                            <>
                              {event.title && event.title !== 'Note ajoutée' && (
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              "text-xs font-light",
                              event.displayType === 'paiements' && event.metadata?.isAcompte
                                ? "text-amber-300 font-semibold"
                                : "text-white"
                            )}>
                              {event.title}
                            </h4>
                            {event.displayType === 'paiements' && event.metadata?.isAcompte && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Acompte
                              </span>
                            )}
                          </div>
                              )}
                          {event.description && event.displayType !== 'documents' && event.description.trim() && (
                            <div className="text-xs text-slate-300 leading-relaxed font-light mt-0.5">
                              {formatDescription(event.description, event.eventType)}
                            </div>
                              )}
                            </>
                          )}

                          {/* Special rendering for different event types - only render if data exists */}
                          {event.eventType === 'status_changed' && renderStatusChange(event)}
                          {(event.eventType === 'opportunity_created' || 
                            event.eventType === 'opportunity_won' || 
                            event.eventType === 'opportunity_lost') && 
                            renderOpportunityDetails(event)}
                          {event.displayType === 'paiements' && renderPaymentDetails(event)}
                          {event.displayType === 'documents' && renderDocumentDetails(event)}
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

      {/* File Viewer Modal */}
      <DevisFileViewerModal
        isOpen={!!viewerFile}
        onClose={() => setViewerFile(null)}
        fileUrl={viewerFile?.url || null}
        fileName={viewerFile?.name || ''}
        devisTitle={viewerFile?.title || ''}
      />
    </div>
  )
}

