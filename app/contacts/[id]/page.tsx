"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import {
  Mail,
  Phone,
  MapPin,
  User,
  Plus,
  Calendar,
  FileText,
  MessageSquare,
  Edit2,
  ArrowLeft,
  Loader2,
  MoreVertical,
  Briefcase,
  AlertCircle,
  Sparkles,
  Save,
  X,
  Clock,
  Building2,
  Copy,
  Check,
  ExternalLink,
  History,
  Activity,
  Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { AuthGuard } from '@/components/auth-guard'
import { useAuth } from '@/contexts/auth-context'
import { Contact, Opportunity, Timeline, ContactWithDetails, ContactStatus } from '@/types/contact'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateOpportunityModal } from '@/components/create-opportunity-modal'
import { OpportunitiesTable } from '@/components/opportunities-table'
import { PriseDeBesoinModal } from '@/components/prise-de-besoin-modal'
import { AcompteRecuModal } from '@/components/acompte-recu-modal'
import { ContactEnhancedTimeline } from '@/components/contact-enhanced-timeline'

/**
 * Professional Contact Page - Redesigned
 * Matches Zoho CRM / HubSpot standards
 * 
 * Features:
 * - Dynamic status badges (Lead → Converti → Client)
 * - Modern table view for opportunities
 * - Clean tab navigation
 * - Seamless workflow
 */
export default function ContactPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const contactId = params?.id as string

  const [contact, setContact] = useState<ContactWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'timeline' | 'tasks' | 'documents'>('overview')
  const [architectNameMap, setArchitectNameMap] = useState<Record<string, string>>({})
  const [showConversionCelebration, setShowConversionCelebration] = useState(false)

  // Modals state
  const [isCreateOpportunityModalOpen, setIsCreateOpportunityModalOpen] = useState(false)
  const [isPriseDeBesoinModalOpen, setIsPriseDeBesoinModalOpen] = useState(false)
  const [isAcompteRecuModalOpen, setIsAcompteRecuModalOpen] = useState(false)

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => {
    if (contactId && isAuthenticated) {
      loadContact()
    }
  }, [contactId, isAuthenticated])

  // Check if this is a fresh conversion and show celebration
  useEffect(() => {
    const converted = searchParams?.get('converted')
    if (converted === 'true' && contact) {
      setShowConversionCelebration(true)
      
      // Show celebration notification
      toast.success(`🎉 ${contact.nom} est maintenant un contact !`, {
        description: "Vous pouvez maintenant créer des opportunités et gérer ce contact.",
        duration: 5000,
      })

      // Hide celebration after animation
      setTimeout(() => {
        setShowConversionCelebration(false)
      }, 3000)

      // Clean up URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams, contact])

  // Load architect/user names
  useEffect(() => {
    const loadArchitects = async () => {
      try {
        const token = localStorage.getItem('token')
        
        // Load architects
        const archRes = await fetch('/api/architects', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        
        const map: Record<string, string> = {}
        
        if (archRes.ok) {
          const archData = await archRes.json()
          const architects = archData?.data || archData?.architects || []
          architects.forEach((arch: any) => {
            const fullName = `${arch.prenom || ''} ${arch.nom || ''}`.trim()
            if (arch.id && fullName) {
              map[arch.id] = fullName
            }
          })
        }
        
        // Also load users as fallback
        const usersRes = await fetch('/api/users')
        if (usersRes.ok) {
          const users = await usersRes.json()
          users.forEach((u: any) => {
            const name = (u.name || '').trim()
            if (!name) return
            if (u.id) {
              map[u.id] = name
            }
            map[name] = name
          })
        }

        setArchitectNameMap(map)
      } catch (e) {
        console.error('[Contact Detail] Failed to load architects/users for mapping', e)
      }
    }

    loadArchitects()
  }, [])

  const loadContact = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Token d\'authentification manquant')
        setLoading(false)
        return
      }

      const url = `/api/contacts/${contactId}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (e) {
          console.error('[Contact Detail] Failed to parse error response:', e)
        }
        const errorMsg = errorData.error || `Erreur ${response.status}: ${response.statusText}`
        throw new Error(errorMsg)
      }

      const data = await response.json()
      console.log('[Contact Page] Contact data loaded:', {
        id: data.id,
        nom: data.nom,
        tag: data.tag,
        convertedBy: data.convertedBy,
        createdBy: data.createdBy,
      })
      setContact(data)
    } catch (error) {
      console.error('[Contact Detail] Error loading contact:', error)
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setError(message)
      toast.error(`Erreur lors du chargement du contact : ${message}`)
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen bg-[rgb(11,14,24)]">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)]">
            <Header />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                <p className="text-slate-400">Chargement du contact...</p>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error || !contact) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen bg-[rgb(11,14,24)]">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)]">
            <Header />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">
                    {error ? 'Erreur lors du chargement' : 'Contact non trouvé'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-2">
                    {error || 'Le contact demandé n\'existe pas ou a été supprimé.'}
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-4">
                  <button
                    onClick={() => router.back()}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-sm font-medium"
                  >
                    Retour
                  </button>
                  {error && (
                    <button
                      onClick={loadContact}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors text-sm font-medium"
                    >
                      Réessayer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // Helper: Resolve architect name
  const resolvedArchitectName = contact.architecteAssigne
    ? architectNameMap[contact.architecteAssigne] || contact.architecteAssigne
    : null

  // Helper: Count won opportunities (including acompte_recu - deposit received means won)
  const wonOpportunitiesCount = contact.opportunities?.filter(o => 
    o.statut === 'won' || o.pipelineStage === 'acompte_recu' || o.pipelineStage === 'gagnee'
  ).length || 0

  // Helper: Get status badge configuration
  const getStatusBadge = () => {
    if (contact.tag === 'client') {
      return {
        label: 'Client',
        className: 'bg-green-500/20 text-green-300 border-green-500/50'
      }
    }

    if (contact.status === 'perdu') {
      return {
        label: 'Perdu',
        className: 'bg-red-500/20 text-red-300 border-red-500/50'
      }
    }

    const statusMap: Record<string, { label: string, className: string }> = {
      'qualifie': {
        label: 'Qualifié',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      },
      'prise_de_besoin': {
        label: 'Prise de besoin',
        className: 'bg-purple-500/20 text-purple-300 border-purple-500/50'
      },
      'acompte_recu': {
        label: 'Acompte Reçu',
        className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
      }
    }

    return statusMap[contact.status] || {
      label: 'Contact',
      className: 'bg-slate-500/20 text-slate-300 border-slate-500/50'
    }
  }

  const statusBadge = getStatusBadge()

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)]">
          <Header />

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="w-full px-6 md:px-8 xl:px-12 py-6 space-y-6">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Retour aux contacts</span>
              </button>

              {/* HEADER SECTION */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Main Header Card */}
                <div className={`relative glass rounded-2xl border border-slate-600/40 p-6 shadow-[0_18px_48px_-28px_rgba(59,130,246,0.25)] ${contact.status === 'perdu' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                  {/* Celebration Effect */}
                  <AnimatePresence>
                    {showConversionCelebration && (
                      <>
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ 
                              opacity: 1, 
                              scale: 0,
                              x: 0,
                              y: 0,
                            }}
                            animate={{ 
                              opacity: 0,
                              scale: 1.5,
                              x: Math.cos((i * Math.PI * 2) / 12) * 200,
                              y: Math.sin((i * Math.PI * 2) / 12) * 200,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute top-1/2 left-1/2 pointer-events-none"
                            style={{ zIndex: 50 }}
                          >
                            <Sparkles className="w-6 h-6 text-yellow-400" />
                          </motion.div>
                        ))}
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                          transition={{ duration: 2, times: [0, 0.5, 1] }}
                          className="absolute inset-0 rounded-2xl border-4 border-yellow-400/50 pointer-events-none"
                          style={{ zIndex: 40 }}
                        />
                      </>
                    )}
                  </AnimatePresence>
                  <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex items-start gap-4 flex-1 min-w-[300px]">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {contact.nom.charAt(0).toUpperCase()}
                      </div>

                      {/* Contact Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h1 className="text-3xl font-bold text-white">{contact.nom}</h1>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                          {contact.architecteAssigne && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-purple-500/10 text-purple-300 border-purple-500/30">
                              <Briefcase className="w-3.5 h-3.5" />
                              {resolvedArchitectName || contact.architecteAssigne}
                            </span>
                          )}
                        </div>

                        {/* Quick Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {contact.telephone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span className="text-slate-300">{contact.telephone}</span>
                            </div>
                          )}
                          {contact.ville && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span className="text-slate-300">{contact.ville}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm min-w-0">
                              <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span className="text-slate-300 truncate">{contact.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {/* Prise de besoin button - Only when status is 'qualifie' */}
                      {contact.status === 'qualifie' && (
                        <Button
                          onClick={() => setIsPriseDeBesoinModalOpen(true)}
                          className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm"
                        >
                          <FileText className="w-4 h-4 mr-1.5" />
                          <span className="hidden sm:inline">Prise de besoin</span>
                        </Button>
                      )}

                      {/* Acompte Reçu button - Only when status is 'prise_de_besoin' */}
                      {contact.status === 'prise_de_besoin' && (
                        <Button
                          onClick={() => setIsAcompteRecuModalOpen(true)}
                          className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          <span className="hidden sm:inline">Acompte Reçu</span>
                        </Button>
                      )}

                      {/* Create Opportunity button - Enabled only when status is 'acompte_recu' */}
                      <Button
                        onClick={() => setIsCreateOpportunityModalOpen(true)}
                        disabled={contact.status !== 'acompte_recu' || contact.status === 'perdu'}
                        className={`h-10 px-4 rounded-lg font-medium text-sm ${
                          contact.status === 'acompte_recu' && contact.status !== 'perdu'
                            ? 'bg-primary hover:bg-primary/90 text-white shadow-[0_12px_40px_-24px_rgba(59,130,246,0.9)]'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline">Créer une Opportunité</span>
                        <span className="sm:hidden">+</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-slate-600/30">
                          <DropdownMenuItem className="text-slate-300 focus:text-white">
                            <Edit2 className="w-4 h-4 mr-2" />
                            Éditer le contact
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-slate-300 focus:text-white">
                            <FileText className="w-4 h-4 mr-2" />
                            Voir documents
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(59,130,246,0.6)] hover:shadow-[0_12px_35px_-15px_rgba(59,130,246,0.8)] transition-shadow"
                  >
                    <p className="text-xs text-slate-400 mb-1">Opportunités</p>
                    <p className="text-2xl font-bold text-white">{contact.opportunities?.length || 0}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(34,197,94,0.55)] hover:shadow-[0_12px_35px_-15px_rgba(34,197,94,0.75)] transition-shadow"
                  >
                    <p className="text-xs text-slate-400 mb-1">Gagnées</p>
                    <p className="text-2xl font-bold text-green-400">{wonOpportunitiesCount}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(59,130,246,0.55)] hover:shadow-[0_12px_35px_-15px_rgba(59,130,246,0.75)] transition-shadow"
                  >
                    <p className="text-xs text-slate-400 mb-1">En cours</p>
                    <p className="text-2xl font-bold text-blue-400">{contact.opportunities?.filter(o => o.statut === 'open').length || 0}</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(249,115,22,0.55)] hover:shadow-[0_12px_35px_-15px_rgba(249,115,22,0.75)] transition-shadow"
                  >
                    <p className="text-xs text-slate-400 mb-1">Timeline</p>
                    <p className="text-2xl font-bold text-orange-400">{contact.timeline?.length || 0}</p>
                  </motion.div>
                </div>
              </motion.div>

              {/* TAB NAVIGATION */}
              <div className="flex gap-2 border-b border-slate-600/30 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Général', icon: <User className="w-4 h-4" /> },
                  { id: 'opportunities', label: 'Opportunités', icon: <Briefcase className="w-4 h-4" /> },
                  { id: 'timeline', label: 'Timeline', icon: <MessageSquare className="w-4 h-4" /> },
                  { id: 'tasks', label: 'Tâches & RDV', icon: <Calendar className="w-4 h-4" /> },
                  { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                      ? 'text-primary border-primary'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && (
                  <OverviewTab
                    contact={contact}
                    architectName={resolvedArchitectName}
                    architectNameMap={architectNameMap}
                    userNameMap={architectNameMap}
                    onUpdate={loadContact}
                  />
                )}
                {activeTab === 'opportunities' && (
                  <OpportunitiesTab
                    contact={contact}
                    onUpdate={loadContact}
                    architectNameMap={architectNameMap}
                    onCreateOpportunity={() => setIsCreateOpportunityModalOpen(true)}
                  />
                )}
                {activeTab === 'timeline' && (
                  <TimelineTab 
                    contact={contact} 
                    userNameMap={architectNameMap} 
                    architectNameMap={architectNameMap}
                  />
                )}
                {activeTab === 'tasks' && <TasksTab contact={contact} />}
                {activeTab === 'documents' && <DocumentsTab contact={contact} />}
              </motion.div>
            </div>
          </div>
        </main>

        {/* Modals */}
        {contact && (
          <>
            <CreateOpportunityModal
              isOpen={isCreateOpportunityModalOpen}
              onClose={() => setIsCreateOpportunityModalOpen(false)}
              contact={contact}
              onSuccess={(opportunityId) => {
                loadContact()
                setActiveTab('opportunities')
              }}
            />

            <PriseDeBesoinModal
              isOpen={isPriseDeBesoinModalOpen}
              onClose={() => setIsPriseDeBesoinModalOpen(false)}
              contactId={contact.id}
              onSuccess={loadContact}
            />

            <AcompteRecuModal
              isOpen={isAcompteRecuModalOpen}
              onClose={() => setIsAcompteRecuModalOpen(false)}
              contactId={contact.id}
              onSuccess={loadContact}
            />
          </>
        )}
      </div>
    </AuthGuard>
  )
}

// ============ TAB COMPONENTS ============

interface ContactNote {
  id: string
  content: string
  createdAt: string
  createdBy: string
  type?: string
}

function OverviewTab({ contact, architectName, architectNameMap, userNameMap, onUpdate }: { contact: ContactWithDetails; architectName: string | null; architectNameMap: Record<string, string>; userNameMap: Record<string, string>; onUpdate: () => void }) {
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  
  // Display notes from contact
  const displayNotes = typeof contact.notes === 'string' ? contact.notes : ''

  // Helper function to convert date to ISO string (handles both Date objects and strings)
  const toISOString = (date: Date | string): string => {
    if (typeof date === 'string') {
      return date
    }
    return date.toISOString()
  }

  // Sync notesValue with contact notes when contact changes
  useEffect(() => {
    if (!isEditingNotes) {
      setNotesValue(displayNotes)
    }
  }, [contact.notes, isEditingNotes, displayNotes])

  // Parse notes from contact
  useEffect(() => {
    if (contact.notes) {
      try {
        if (typeof contact.notes === 'string') {
          const parsed = JSON.parse(contact.notes)
          if (Array.isArray(parsed)) {
            setNotes(parsed)
          } else if (parsed.trim()) {
            // Legacy single note format - convert to array
            setNotes([{
              id: `legacy-${Date.now()}`,
              content: parsed,
              createdAt: toISOString(contact.createdAt),
              createdBy: contact.createdBy,
              type: 'note'
            }])
          }
        } else if (Array.isArray(contact.notes)) {
          setNotes(contact.notes)
        }
      } catch (e) {
        // If it's a plain string, convert to array
        if (typeof contact.notes === 'string' && contact.notes.trim()) {
          setNotes([{
            id: `legacy-${Date.now()}`,
            content: contact.notes,
            createdAt: toISOString(contact.createdAt),
            createdBy: contact.createdBy,
            type: 'note'
          }])
        }
      }
    }
  }, [contact.notes, contact.createdAt, contact.createdBy])

  // Check if this contact was converted from a lead
  const isConverted = contact.tag === 'converted' || contact.leadId
  
  // Get the converter name
  const getConverterName = () => {
    if (contact.convertedBy) {
      return architectNameMap[contact.convertedBy] || contact.convertedBy
    }
    if (isConverted && contact.createdBy) {
      return architectNameMap[contact.createdBy] || contact.createdBy
    }
    return null
  }

  const converterName = getConverterName()

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return

    try {
      setIsSavingNote(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newNoteContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      await onUpdate()
      setNewNoteContent('')
      setIsAddingNote(false)
      toast.success('Note ajoutée avec succès')
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Erreur lors de l\'ajout de la note')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/contacts/${contact.id}/notes?noteId=${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      await onUpdate()
      toast.success('Note supprimée avec succès')
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Erreur lors de la suppression de la note')
    }
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success('Copié dans le presse-papier')
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error('Erreur lors de la copie')
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Count won opportunities
  const wonOpportunitiesCount = contact.opportunities?.filter(o => 
    o.statut === 'won' || o.pipelineStage === 'acompte_recu' || o.pipelineStage === 'gagnee'
  ).length || 0

  // Handle saving notes
  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: notesValue }),
      })

      if (!response.ok) {
        throw new Error('Failed to save notes')
      }

      setIsEditingNotes(false)
      await onUpdate()
      toast.success('Notes enregistrées avec succès')
    } catch (error) {
      console.error('Error saving notes:', error)
      toast.error('Erreur lors de l\'enregistrement des notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const formatNoteDate = (date: Date | string) => {
    const noteDate = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - noteDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Aujourd\'hui'
    } else if (diffDays === 1) {
      return 'Hier'
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`
    } else {
      return noteDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: noteDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contact Information - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-slate-600/40 p-6 shadow-lg shadow-slate-900/20"
        >
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/30">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            Informations
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="group relative p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Nom
                </p>
                <button
                  onClick={() => handleCopy(contact.nom, 'nom')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-700/50"
                  title="Copier"
                >
                  {copiedField === 'nom' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
              <p className="text-base font-semibold text-white">{contact.nom}</p>
            </div>

            <div className="group relative p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-green-500/30 transition-all">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-green-400" />
                Téléphone
              </p>
              <a 
                href={`tel:${contact.telephone}`}
                className="text-base font-semibold text-green-400 hover:text-green-300 transition-colors flex items-center gap-2 group/link"
              >
                {contact.telephone}
                <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </a>
            </div>

            {contact.email && (
              <div className="group relative p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-purple-500/30 transition-all">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  Email
                </p>
                <a 
                  href={`mailto:${contact.email}`}
                  className="text-base font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 break-all group/link"
                >
                  {contact.email}
                  <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </a>
              </div>
            )}

            {contact.ville && (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-emerald-500/30 transition-all">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Ville
                </p>
                <p className="text-base font-semibold text-white">{contact.ville}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Notes & Observations - Multiple Notes System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl border border-slate-600/40 p-6 shadow-lg shadow-slate-900/20"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/30">
                <MessageSquare className="w-5 h-5 text-amber-400" />
              </div>
              Notes & Observations
              {notes.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {notes.length}
                </span>
              )}
            </h2>
            {!isAddingNote && (
              <Button
                onClick={() => setIsAddingNote(true)}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white h-9 px-4 shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Ajouter
              </Button>
            )}
          </div>

          {/* Add Note Form */}
          {isAddingNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30 shadow-lg shadow-amber-500/10"
            >
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Écrivez votre note ici..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none text-sm mb-3"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  onClick={() => {
                    setIsAddingNote(false)
                    setNewNoteContent('')
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white h-8"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddNote}
                  disabled={isSavingNote || !newNoteContent.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white h-8"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Notes List */}
          {notes.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap mb-3">
                        {note.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                          <User className="w-3 h-3 text-blue-400" />
                          <span className="font-medium text-blue-300">
                            {userNameMap[note.createdBy] || note.createdBy}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-700/50 border border-slate-600/50">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-400">{formatNoteDate(note.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center rounded-xl bg-gradient-to-br from-slate-800/30 to-slate-900/20 border-2 border-dashed border-slate-700/50">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-amber-500/50" />
              </div>
              <p className="text-base font-semibold text-slate-300 mb-1">Aucune note pour le moment</p>
              <p className="text-sm text-slate-500">Cliquez sur "Ajouter" pour créer une note</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right Column - Summary */}
      <div className="lg:col-span-1 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl border border-slate-600/40 p-6 shadow-lg shadow-slate-900/20"
        >
          <h3 className="font-bold text-white mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            Résumé
          </h3>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  contact.tag === 'client' ? 'bg-green-400 animate-pulse' :
                  contact.status === 'perdu' ? 'bg-red-400' :
                  'bg-blue-400'
                }`} />
                Statut
              </p>
              <p className="text-sm font-bold text-white capitalize">
                {contact.tag === 'client' ? 'Client' : contact.status || 'Contact'}
              </p>
            </div>
            
            {isConverted && converterName && (
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Converti par
                </p>
                <p className="text-sm font-semibold text-yellow-300">{converterName}</p>
              </div>
            )}
            
            {architectName && (
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                  Architecte
                </p>
                <p className="text-sm font-semibold text-purple-300">{architectName}</p>
              </div>
            )}
            
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Créé le
              </p>
              <p className="text-sm font-semibold text-blue-300">{formatDate(contact.createdAt)}</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl border border-slate-600/40 p-6 shadow-lg shadow-slate-900/20"
        >
          <h3 className="font-bold text-white mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center border border-orange-500/30">
              <Activity className="w-5 h-5 text-orange-400" />
            </div>
            Actions
          </h3>
          <div className="space-y-2.5">
            {contact.telephone && (
              <a
                href={`tel:${contact.telephone}`}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/30 hover:from-blue-500/20 hover:to-blue-600/10 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Phone className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-white">Appeler</span>
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/30 hover:from-purple-500/20 hover:to-purple-600/10 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm font-semibold text-white">Envoyer un Email</span>
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function OpportunitiesTab({ contact, onUpdate, architectNameMap, onCreateOpportunity }: { contact: ContactWithDetails; onUpdate: () => void; architectNameMap: Record<string, string>; onCreateOpportunity: () => void }) {
  return (
    <div className="space-y-4">
      {contact.opportunities && contact.opportunities.length > 0 ? (
        <OpportunitiesTable
          opportunities={contact.opportunities}
          architectNameMap={architectNameMap}
          onUpdate={onUpdate}
          contact={contact}
        />
      ) : (
        <div className="glass rounded-2xl border border-slate-600/40 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 mb-4">Aucune opportunité pour ce contact</p>
          <Button onClick={onCreateOpportunity} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Créer une opportunité
          </Button>
        </div>
      )}
    </div>
  )
}

function TimelineTab({ 
  contact, 
  userNameMap,
  architectNameMap 
}: { 
  contact: ContactWithDetails; 
  userNameMap: Record<string, string>;
  architectNameMap: Record<string, string>;
}) {
  return (
    <ContactEnhancedTimeline 
      contact={contact}
      userNameMap={userNameMap}
      architectNameMap={architectNameMap}
      showFilters={true}
      maxItems={15}
    />
  )
}

function TasksTab({ contact }: { contact: ContactWithDetails }) {
  return (
    <div className="glass rounded-2xl border border-slate-600/40 p-12 text-center">
      <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-300">Tâches et RDV à venir</p>
      <p className="text-sm text-slate-500 mt-1">Cette section affichera les tâches et RDV liés à ce contact</p>
    </div>
  )
}

function DocumentsTab({ contact }: { contact: ContactWithDetails }) {
  return (
    <div className="glass rounded-2xl border border-slate-600/40 p-12 text-center">
      <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-300">Documents</p>
      <p className="text-sm text-slate-500 mt-1">Aucun document téléchargé pour ce contact</p>
    </div>
  )
}
