"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Search, Download, Image, FileSpreadsheet } from 'lucide-react'
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
  Trash2,
  Home,
  DollarSign,
  Wallet,
  Edit
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CreateOpportunityModal } from '@/components/create-opportunity-modal'
import { OpportunitiesTable } from '@/components/opportunities-table'
import { PriseDeBesoinModal } from '@/components/prise-de-besoin-modal'
import { AcompteRecuModal } from '@/components/acompte-recu-modal'
import { ContactEnhancedTimeline } from '@/components/contact-enhanced-timeline'
import { DeleteContactDialog } from '@/components/delete-contact-dialog'
import { cn } from '@/lib/utils'
import { UpdateContactModal } from '@/components/update-contact-modal'
import { ConversionCelebration } from '@/components/conversion-celebration'

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
  const { isAuthenticated, user } = useAuth()
  const contactId = params?.id as string

  const [contact, setContact] = useState<ContactWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'notes' | 'timeline' | 'tasks' | 'documents'>('overview')
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

  // Delete contact state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Update contact modal state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)

  useEffect(() => {
    if (contactId && isAuthenticated) {
      loadContact()
    }
  }, [contactId, isAuthenticated])

  // Check if this is a fresh conversion and show celebration + toast
  useEffect(() => {
    const converted = searchParams?.get('converted')
    if (converted === 'true') {
      // Clean up URL immediately
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)

      // Show confetti immediately
      setShowConversionCelebration(true)

      // Show success toast with detailed message
      toast.success('🎉 Conversion Réussie !', {
        description: contact?.nom
          ? `${contact.nom} est maintenant un contact actif. Vous pouvez créer des opportunités et gérer le pipeline.`
          : 'Le lead a été converti en contact avec succès. Vous pouvez maintenant créer des opportunités.',
        duration: 5000,
      })

      // Auto-hide confetti after 3 seconds
      setTimeout(() => {
        setShowConversionCelebration(false)
      }, 3000)
    }
  }, [searchParams, contact])

  // Load architect/user names in parallel with contact data (non-blocking)
  useEffect(() => {
    const loadArchitects = async () => {
      try {
        const token = localStorage.getItem('token')

        // Load both in parallel for faster loading
        const [archRes, usersRes] = await Promise.all([
          fetch('/api/architects', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => null),
          fetch('/api/users', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => null),
        ])

        const map: Record<string, string> = {}

        // Process architects
        if (archRes?.ok) {
          try {
            const archData = await archRes.json()
            const architects = archData?.data || archData?.architects || []
            architects.forEach((arch: any) => {
              const fullName = `${arch.prenom || ''} ${arch.nom || ''}`.trim()
              if (arch.id && fullName) {
                map[arch.id] = fullName
              }
            })
          } catch (e) {
            console.error('[Contact Detail] Error parsing architects:', e)
          }
        }

        // Process users
        if (usersRes?.ok) {
          try {
            const users = await usersRes.json()
            users.forEach((u: any) => {
              const name = (u.name || '').trim()
              if (!name) return
              if (u.id) {
                map[u.id] = name
              }
              map[name] = name
            })
          } catch (e) {
            console.error('[Contact Detail] Error parsing users:', e)
          }
        }

        setArchitectNameMap(map)
      } catch (e) {
        console.error('[Contact Detail] Failed to load architects/users for mapping', e)
      }
    }

    // Load architects in background, don't block page render
    loadArchitects()
  }, [])

  const loadContact = async (skipCache = false) => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Token d\'authentification manquant')
        setLoading(false)
        return
      }

      // Optimized fetch - use cache for faster loading, but skip cache when refreshing after updates
      const url = `/api/contacts/${contactId}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // Skip cache when explicitly requested (e.g., after opportunity creation)
        cache: skipCache ? 'no-store' : 'default',
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
      console.log('[Contact Detail] Contact loaded:', {
        id: data.id,
        leadId: data.leadId,
        leadCreatedAt: data.leadCreatedAt,
        tag: data.tag,
        convertedBy: data.convertedBy
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

  const handleDeleteContact = async () => {
    if (!contact) return

    setIsDeleting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Token d\'authentification manquant')
      }

      console.log('[Contact Page] Deleting contact:', contactId)

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[Contact Page] Delete response status:', response.status)

      const data = await response.json()
      console.log('[Contact Page] Delete response data:', data)

      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}`)
      }

      // Close dialog immediately on success
      setIsDeleteDialogOpen(false)

      // Show success toast
      toast.success('Contact supprimé avec succès', {
        description: `Le contact "${contact.nom}" a été supprimé définitivement`,
        duration: 3000,
      })

      console.log('[Contact Page] Contact deleted successfully, redirecting...')

      // Redirect to contacts page immediately
      router.push('/contacts')

    } catch (error) {
      console.error('[Contact Page] Error deleting contact:', error)
      toast.error('Erreur lors de la suppression', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        duration: 5000,
      })
      // Only reset isDeleting on error (so dialog can be retried)
      setIsDeleting(false)
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
                      onClick={() => loadContact(true)}
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

  // Helper: Count won opportunities.
  // Business rule: an opportunity is "Gagnée" only when it is explicitly marked as won
  // or when it has reached the final pipeline stage "gagnee".
  // The "acompte_recu" stage is treated as an opportunity still in progress.
  const wonOpportunitiesCount = contact.opportunities?.filter(o =>
    o.statut === 'won' || o.pipelineStage === 'gagnee'
  ).length || 0

  // Helper: Count lost opportunities.
  // An opportunity is "Perdue" when statut is 'lost' OR pipelineStage is 'perdue'
  const lostOpportunitiesCount = contact.opportunities?.filter(o =>
    o.statut === 'lost' || o.pipelineStage === 'perdue'
  ).length || 0

  // Helper: Count in-progress opportunities (En cours).
  // An opportunity is "En cours" when:
  // - statut is 'open' AND
  // - NOT won (statut !== 'won' && pipelineStage !== 'gagnee') AND
  // - NOT lost (statut !== 'lost' && pipelineStage !== 'perdue')
  const inProgressOpportunitiesCount = contact.opportunities?.filter(o => {
    const isWon = o.statut === 'won' || o.pipelineStage === 'gagnee'
    const isLost = o.statut === 'lost' || o.pipelineStage === 'perdue'
    return o.statut === 'open' && !isWon && !isLost
  }).length || 0

  // Allow creating opportunities if contact status is 'qualifie' or higher
  // Contacts can create opportunities once they're qualified
  // Check if acompte has been received
  const hasAcompteReceived = () => {
    const payments = (contact as any).payments || []
    const hasAcomptePayment = payments.some((p: any) => p.type === 'accompte')

    // Also check if any opportunity has acompte_recu stage
    const hasAcompteOpportunity = contact.opportunities?.some(
      (opp: any) => opp.pipelineStage === 'acompte_recu'
    )

    // Check if contact status is acompte_recu
    const hasAcompteStatus = contact.status === 'acompte_recu'

    return hasAcomptePayment || hasAcompteOpportunity || hasAcompteStatus
  }

  // Button is enabled only when acompte has been received
  const canCreateOpportunity = hasAcompteReceived()

  // Check if there's an opportunity with acompte payment
  const hasAcomptePayment = () => {
    const payments = (contact as any).payments || []
    const hasAcomptePayment = payments.some((p: any) => p.type === 'accompte')

    // Also check if any opportunity has acompte_recu stage
    const hasAcompteOpportunity = contact.opportunities?.some(
      (opp: any) => opp.pipelineStage === 'acompte_recu'
    )

    return hasAcomptePayment || hasAcompteOpportunity
  }

  // Helper: Get status badge configuration
  // Show "Qualifié" as default status, "Acompte Reçu" only appears as separate badge when there's payment
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

    // If status is acompte_recu but no opportunity/payment exists, show Qualifié instead
    if (contact.status === 'acompte_recu' && !hasAcomptePayment()) {
      return {
        label: 'Qualifié',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/50'
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
        label: 'Qualifié', // Show Qualifié instead of Acompte Reçu in main badge
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      }
    }

    return statusMap[contact.status] || {
      label: 'Qualifié', // Default to Qualifié
      className: 'bg-blue-500/20 text-blue-300 border-blue-500/50'
    }
  }

  const statusBadge = getStatusBadge()

  return (
    <AuthGuard>
      {/* Conversion Celebration - lightweight confetti only */}
      <ConversionCelebration show={showConversionCelebration} />
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)]">
          <Header />

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="w-full px-4 md:px-6 py-3 md:py-4 space-y-3">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-xs font-light"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour</span>
              </button>

              {/* HEADER SECTION */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Main Header Card */}
                <div className={`relative glass rounded-lg border border-slate-600/40 p-4 shadow-[0_18px_48px_-28px_rgba(59,130,246,0.25)] ${contact.status === 'perdu' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-sm font-medium shrink-0">
                        {contact.nom?.trim()?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      {/* Contact Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <h1 className="text-base font-medium text-white">{contact.nom}</h1>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-light border ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                          {contact.architecteAssigne && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-light border bg-purple-500/10 text-purple-300 border-purple-500/30">
                              <Briefcase className="w-3 h-3" />
                              {resolvedArchitectName || contact.architecteAssigne}
                            </span>
                          )}
                        </div>

                        {/* Quick Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {contact.telephone && (
                            <div className="flex items-center gap-1.5 text-xs font-light">
                              <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="text-slate-300">{contact.telephone}</span>
                            </div>
                          )}
                          {contact.ville && (
                            <div className="flex items-center gap-1.5 text-xs font-light">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-slate-300">{contact.ville}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-1.5 text-xs font-light min-w-0">
                              <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="text-slate-300 truncate">{contact.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Accompte Reçu Badge in Header - Only show when there's actual payment/opportunity */}
                        {hasAcomptePayment() && (() => {
                          const payments = (contact as any).payments || []
                          const acompte = payments.find((p: any) => p.type === 'accompte')
                          if (acompte) {
                            return (
                              <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all">
                                <DollarSign className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] font-medium text-emerald-300 uppercase tracking-wide">
                                  Acompte
                                </span>
                                <div className="h-2.5 w-px bg-emerald-500/30" />
                                <span className="text-xs font-semibold text-emerald-200">
                                  {acompte.montant?.toLocaleString('fr-FR') || '0'} MAD
                                </span>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {/* Prise de besoin button - Only when status is 'qualifie' */}
                      {contact.status === 'qualifie' && (
                        <Button
                          onClick={() => setIsPriseDeBesoinModalOpen(true)}
                          className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-light text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          <span className="hidden sm:inline">Prise de besoin</span>
                        </Button>
                      )}

                      {/* Acompte Reçu button - Only when status is 'prise_de_besoin' */}
                      {contact.status === 'prise_de_besoin' && (
                        <Button
                          onClick={() => setIsAcompteRecuModalOpen(true)}
                          className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-light text-xs"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          <span className="hidden sm:inline">Acompte Reçu</span>
                        </Button>
                      )}

                      {/* Create Opportunity button - Always visible when status is 'qualifie' or higher */}
                      <Button
                        onClick={() => setIsCreateOpportunityModalOpen(true)}
                        disabled={!canCreateOpportunity}
                        className={`h-8 px-3 rounded-lg font-light text-xs ${canCreateOpportunity
                          ? 'bg-primary hover:bg-primary/90 text-white shadow-[0_12px_40px_-24px_rgba(59,130,246,0.9)]'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                          }`}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        <span className="hidden sm:inline">Créer Opportunité</span>
                        <span className="sm:hidden">+</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-slate-600/30">
                          <DropdownMenuItem
                            className="text-slate-300 focus:text-white"
                            onClick={() => setIsUpdateModalOpen(true)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Éditer le contact
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-slate-300 focus:text-white">
                            <FileText className="w-4 h-4 mr-2" />
                            Voir documents
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                            onClick={() => setIsDeleteDialogOpen(true)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer le contact
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Stats Cards - Matching Other Pages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-4 hover:border-blue-500/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-light text-slate-400 mb-1 uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-light text-white leading-tight mb-0.5">{contact.opportunities?.length || 0}</p>
                        <p className="text-xs font-light text-slate-500">Opportunités</p>
                      </div>
                      <div className="shrink-0 ml-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-4 hover:border-green-500/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-light text-slate-400 mb-1 uppercase tracking-wider">Gagnées</p>
                        <p className="text-2xl font-light text-green-400 leading-tight mb-0.5">{wonOpportunitiesCount}</p>
                        <p className="text-xs font-light text-slate-500">Opportunités</p>
                      </div>
                      <div className="shrink-0 ml-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-400" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-4 hover:border-amber-500/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-light text-slate-400 mb-1 uppercase tracking-wider">En cours</p>
                        <p className="text-2xl font-light text-amber-400 leading-tight mb-0.5">{inProgressOpportunitiesCount}</p>
                        <p className="text-xs font-light text-slate-500">Opportunités</p>
                      </div>
                      <div className="shrink-0 ml-2">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-amber-400" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* TAB NAVIGATION */}
              <div className="flex gap-1 border-b border-slate-600/30 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Général', icon: <User className="w-3.5 h-3.5" /> },
                  { id: 'opportunities', label: 'Opportunités', icon: <Briefcase className="w-3.5 h-3.5" /> },
                  { id: 'notes', label: 'Notes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                  { id: 'timeline', label: 'Timeline', icon: <History className="w-3.5 h-3.5" /> },
                  { id: 'tasks', label: 'Tâches & RDV', icon: <Calendar className="w-3.5 h-3.5" /> },
                  { id: 'documents', label: 'Documents', icon: <FileText className="w-3.5 h-3.5" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-light border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
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
                    canCreateOpportunity={canCreateOpportunity}
                  />
                )}
                {activeTab === 'notes' && (
                  <NotesTab
                    contact={contact}
                    onUpdate={loadContact}
                    userNameMap={architectNameMap}
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
              onSuccess={async (opportunityId) => {
                // Wait a bit for the note to be created in the database
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Reload contact data to get the new opportunity and note (skip cache to get fresh data)
                await loadContact(true)
                // Switch to opportunities tab to see the new opportunity
                setActiveTab('opportunities')
                // Also refresh notes by clearing cache and triggering a re-fetch
                // This ensures the opportunity note appears immediately
                setTimeout(() => {
                  // Force refresh by dispatching a custom event that NotesTab can listen to
                  window.dispatchEvent(new CustomEvent('notes-refresh', { 
                    detail: { contactId: contact.id } 
                  }))
                }, 500)
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

            <DeleteContactDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              contactName={contact.nom}
              onConfirm={handleDeleteContact}
              isDeleting={isDeleting}
            />

            <UpdateContactModal
              open={isUpdateModalOpen}
              onOpenChange={setIsUpdateModalOpen}
              contact={contact}
              onSave={(updatedContact) => {
                setContact(updatedContact as ContactWithDetails)
                loadContact()
                setIsUpdateModalOpen(false)
              }}
              currentUserName={user?.name}
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
  source?: string
  isPriseDeBesoin?: boolean
  isOpportunityNote?: boolean
}

function OverviewTab({ contact, architectName, architectNameMap, userNameMap, onUpdate, onEditAcompte }: { contact: ContactWithDetails; architectName: string | null; architectNameMap: Record<string, string>; userNameMap: Record<string, string>; onUpdate: () => void; onEditAcompte?: () => void }) {
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [leadData, setLeadData] = useState<{ typeBien?: string; source?: string } | null>(null)
  const [leadCreatedAt, setLeadCreatedAt] = useState<string | Date | null>(null)

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Delete note confirmation dialog state
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeletingNote, setIsDeletingNote] = useState(false)

  // Accompte reçu editing state
  const [isEditingAcompte, setIsEditingAcompte] = useState(false)
  const [acompteMontant, setAcompteMontant] = useState('')
  const [isSavingAcompte, setIsSavingAcompte] = useState(false)
  const [acomptePayment, setAcomptePayment] = useState<any>(null)

  // Check if there's an opportunity with acompte payment
  const hasAcomptePayment = () => {
    const payments = (contact as any).payments || []
    const hasAcomptePayment = payments.some((p: any) => p.type === 'accompte')

    // Also check if any opportunity has acompte_recu stage
    const hasAcompteOpportunity = contact.opportunities?.some(
      (opp: any) => opp.pipelineStage === 'acompte_recu'
    )

    return hasAcomptePayment || hasAcompteOpportunity || !!acomptePayment
  }

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

  // Helper function to identify "prise de besoin" and opportunity notes
  const identifyPriseDeBesoinNotes = (notes: ContactNote[]): ContactNote[] => {
    if (!contact.timeline || !Array.isArray(contact.timeline)) {
      return notes;
    }

    // Find timeline entries where status changed to "prise_de_besoin"
    const priseDeBesoinTimelineEntries = contact.timeline.filter((entry: any) => {
      const metadata = entry.metadata || {};
      return (
        entry.eventType === 'status_changed' &&
        metadata.newStatus === 'prise_de_besoin' &&
        metadata.notes
      );
    });

    // Match notes with timeline entries by content and approximate date
    return notes.map(note => {
      const noteContent = (note.content || '').trim().toLowerCase();
      const noteDate = new Date(note.createdAt);

      // Check if this note matches any prise de besoin timeline entry
      const isPriseDeBesoin = priseDeBesoinTimelineEntries.some((entry: any) => {
        const timelineNotes = (entry.metadata?.notes || '').trim().toLowerCase();
        const entryDate = new Date(entry.createdAt || entry.date);
        
        // Match by content similarity (exact match or contains)
        const contentMatches = timelineNotes === noteContent || 
                              noteContent.includes(timelineNotes) ||
                              timelineNotes.includes(noteContent);
        
        // Match by date (within 5 minutes of timeline entry)
        const timeDiff = Math.abs(noteDate.getTime() - entryDate.getTime());
        const dateMatches = timeDiff < 5 * 60 * 1000; // 5 minutes tolerance

        return contentMatches && dateMatches;
      });

      // Check if this is an opportunity note
      const isOpportunityNote = note.content?.trim().startsWith('[Opportunité:') || 
                                note.source === 'opportunity' ||
                                (note as any).metadata?.source === 'opportunity' ||
                                (note as any).metadata?.opportunityId;

      return {
        ...note,
        isPriseDeBesoin: isPriseDeBesoin,
        isOpportunityNote: isOpportunityNote,
      };
    });
  };

  // Listen for notes refresh events (e.g., after opportunity creation)
  useEffect(() => {
    const handleNotesRefresh = (event: CustomEvent) => {
      if (event.detail?.contactId === contact.id) {
        // Force re-parse notes by clearing and reloading contact
        console.log('[OverviewTab] Notes refresh event received, reloading contact...')
        onUpdate()
      }
    }
    
    window.addEventListener('notes-refresh', handleNotesRefresh as EventListener)
    return () => {
      window.removeEventListener('notes-refresh', handleNotesRefresh as EventListener)
    }
  }, [contact.id, onUpdate])

  // Parse notes from contact (includes merged lead notes from API)
  useEffect(() => {
    // Reset notes first
    setNotes([])

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
    ];

    const filterSystemNotes = (notes: ContactNote[]): ContactNote[] => {
      return notes.filter(note => {
        const content = note.content?.trim() || '';
        // Exclude empty notes
        if (!content) return false;
        // Exclude system-generated notes
        return !systemNotePatterns.some(pattern => pattern.test(content));
      });
    };

    if (contact.notes) {
      try {
        if (typeof contact.notes === 'string') {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(contact.notes)

            if (Array.isArray(parsed) && parsed.length > 0) {
              // Valid array of notes (may include lead notes)
              // First filter out system-generated notes
              const filteredNotes = filterSystemNotes(parsed);
              
              // Deduplicate on frontend as well (by content + author + date)
              const uniqueNotes = filteredNotes.filter((note: ContactNote, index: number, self: ContactNote[]) => {
                const normalizedContent = note.content?.trim().toLowerCase() || '';
                const dateKey = new Date(note.createdAt).setSeconds(0, 0);
                const uniqueKey = `${normalizedContent}|${note.createdBy}|${dateKey}`;
                return index === self.findIndex((n: ContactNote) => {
                  const nContent = n.content?.trim().toLowerCase() || '';
                  const nDateKey = new Date(n.createdAt).setSeconds(0, 0);
                  return `${nContent}|${n.createdBy}|${nDateKey}` === uniqueKey;
                });
              });
              
              // Identify prise de besoin notes and set them
              const notesWithPriseDeBesoin = identifyPriseDeBesoinNotes(uniqueNotes as ContactNote[]);
              setNotes(notesWithPriseDeBesoin)
            } else if (parsed && typeof parsed === 'string' && parsed.trim()) {
              // Legacy single note format - convert to array and filter
              const legacyNote = {
                id: `legacy-${Date.now()}`,
                content: parsed,
                createdAt: toISOString(contact.createdAt),
                createdBy: contact.createdBy || 'unknown',
                type: 'note'
              };
              const filtered = filterSystemNotes([legacyNote]);
              if (filtered.length > 0) {
                const notesWithPriseDeBesoin = identifyPriseDeBesoinNotes(filtered);
                setNotes(notesWithPriseDeBesoin);
              }
            }
          } catch (parseError) {
            // Not valid JSON, treat as plain string
            if (contact.notes.trim()) {
              const legacyNote = {
                id: `legacy-${Date.now()}`,
                content: contact.notes,
                createdAt: toISOString(contact.createdAt),
                createdBy: contact.createdBy || 'unknown',
                type: 'note'
              };
              const filtered = filterSystemNotes([legacyNote]);
              if (filtered.length > 0) {
                const notesWithPriseDeBesoin = identifyPriseDeBesoinNotes(filtered);
                setNotes(notesWithPriseDeBesoin);
              }
            }
          }
        } else if (Array.isArray(contact.notes)) {
          // Already an array (from API merge)
          const notesArray = contact.notes as ContactNote[]
          if (notesArray.length > 0) {
            // Filter out system-generated notes
            const filtered = filterSystemNotes(notesArray);
            const notesWithPriseDeBesoin = identifyPriseDeBesoinNotes(filtered);
            setNotes(notesWithPriseDeBesoin);
          }
        }
      } catch (e) {
        console.error('Error parsing contact notes:', e)
        // If it's a plain string, convert to array and filter
        if (typeof contact.notes === 'string' && contact.notes.trim()) {
          const legacyNote = {
            id: `legacy-${Date.now()}`,
            content: contact.notes,
            createdAt: toISOString(contact.createdAt),
            createdBy: contact.createdBy || 'unknown',
            type: 'note'
          };
          const filtered = filterSystemNotes([legacyNote]);
          if (filtered.length > 0) {
            const notesWithPriseDeBesoin = identifyPriseDeBesoinNotes(filtered);
            setNotes(notesWithPriseDeBesoin);
          }
        }
      }
    } else {
      // No notes in contact.notes
      setNotes([])
    }
  }, [contact.notes, contact.createdAt, contact.createdBy, contact.leadId])

  // Check if this contact was converted from a lead
  const isConverted = contact.tag === 'converted' || contact.leadId

  // Fetch lead data if contact was converted from a lead
  useEffect(() => {
    // Use stored leadCreatedAt from API (lead is deleted after conversion, so we use stored value)
    if ((contact as any).leadCreatedAt) {
      console.log('[Contact Detail] Using stored leadCreatedAt from contact:', (contact as any).leadCreatedAt)
      setLeadCreatedAt((contact as any).leadCreatedAt)
    }

    // Fetch other lead data (typeBien, source) if needed
    const fetchLeadData = async () => {
      if (contact.leadId) {
        try {
          const token = localStorage.getItem('token')
          // Try to get lead data from timeline metadata first
          const timelineEvent = contact.timeline?.find(
            t => t.eventType === 'contact_converted_from_lead' && t.metadata
          )
          if (timelineEvent?.metadata) {
            const metadata = timelineEvent.metadata as any
            setLeadData({
              typeBien: metadata.typeBien || metadata.leadTypeBien,
              source: metadata.source || metadata.leadSource
            })
          }
        } catch (error) {
          console.error('Error fetching lead data:', error)
        }
      }
    }
    fetchLeadData()
  }, [contact.leadId, contact.timeline, (contact as any).leadCreatedAt])

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

  // Load accompte payment when contact changes
  useEffect(() => {
    if (contact && (contact as any).payments) {
      const payments = (contact as any).payments || []
      const acompte = payments.find((p: any) => p.type === 'accompte')
      if (acompte) {
        setAcomptePayment(acompte)
        setAcompteMontant(acompte.montant?.toString() || '')
      } else {
        setAcomptePayment(null)
        setAcompteMontant('')
      }
    } else {
      setAcomptePayment(null)
      setAcompteMontant('')
    }
  }, [contact])

  const handleUpdateAcompte = async () => {
    if (acompteMontant === "" || acompteMontant === null || acompteMontant === undefined || isNaN(Number(acompteMontant)) || Number(acompteMontant) < 0) {
      toast.error('Veuillez saisir un montant valide (0 ou plus)')
      return
    }

    try {
      setIsSavingAcompte(true)
      const token = localStorage.getItem('token')

      if (acomptePayment) {
        // Update existing payment via acompte-recu endpoint (it will update if payment exists)
        const response = await fetch(`/api/contacts/${contact.id}/acompte-recu`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            montant: Number(acompteMontant),
            methode: acomptePayment.methode || 'virement',
            reference: acomptePayment.reference || undefined,
            description: acomptePayment.description || 'Acompte initial',
            updateExisting: true,
            paymentId: acomptePayment.id,
          }),
        })

        if (!response.ok) {
          throw new Error('Erreur lors de la mise à jour')
        }
        toast.success('Montant de l\'acompte mis à jour avec succès')
      } else {
        // Create new payment via acompte-recu endpoint
        const response = await fetch(`/api/contacts/${contact.id}/acompte-recu`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            montant: Number(acompteMontant),
            methode: 'virement',
            description: 'Acompte initial',
          }),
        })

        if (!response.ok) {
          throw new Error('Erreur lors de l\'enregistrement')
        }
        toast.success('Acompte enregistré avec succès')
      }

      setIsEditingAcompte(false)
      await onUpdate()
    } catch (error) {
      console.error('Error updating acompte:', error)
      toast.error('Une erreur est survenue')
    } finally {
      setIsSavingAcompte(false)
    }
  }

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

  const handleDeleteNoteClick = (noteId: string) => {
    // Find the note to check if it's a lead note
    const note = notes.find(n => n.id === noteId)

    // Prevent deletion of lead notes (historical records)
    if (note && (note.type === 'lead_note' || note.source === 'lead')) {
      toast.error('Impossible de supprimer une note du lead (historique)')
      return
    }

    // Open confirmation dialog
    setNoteToDelete(noteId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return

    setIsDeletingNote(true)

    // Store the note ID to remove from UI immediately
    const noteIdToDelete = noteToDelete

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`/api/contacts/${contact.id}/notes?noteId=${noteIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Handle specific error cases
        if (response.status === 404) {
          // Note not found - might be a legacy note, remove from UI anyway
          console.warn('Note not found in database, removing from UI:', noteIdToDelete)

          // Immediately remove from UI state
          setNotes(prevNotes => prevNotes.filter(n => n.id !== noteIdToDelete))

          setIsDeleteDialogOpen(false)
          setNoteToDelete(null)

          // Refresh to sync with server
          await onUpdate()
          toast.success('Note supprimée de l\'affichage')
          return
        }

        throw new Error(errorData.error || 'Failed to delete note')
      }

      const responseData = await response.json().catch(() => ({}))

      // Immediately remove the note from UI state for instant feedback
      setNotes(prevNotes => {
        const filtered = prevNotes.filter(n => n.id !== noteIdToDelete)
        console.log(`[Delete Note] Removed note ${noteIdToDelete} from UI. Remaining notes: ${filtered.length}`)
        return filtered
      })

      // Close dialog and reset state
      setIsDeleteDialogOpen(false)
      setNoteToDelete(null)

      // Refresh notes from server to ensure consistency
      await onUpdate()

      toast.success(responseData.message || 'Note supprimée avec succès')
    } catch (error) {
      console.error('Error deleting note:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression de la note'
      toast.error(errorMessage)

      // On error, refresh to get the correct state from server
      await onUpdate()
    } finally {
      setIsDeletingNote(false)
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

  // Count won opportunities (same rule as header helper above)
  const wonOpportunitiesCount = contact.opportunities?.filter(o =>
    o.statut === 'won' || o.pipelineStage === 'gagnee'
  ).length || 0

  // Count lost opportunities
  const lostOpportunitiesCount = contact.opportunities?.filter(o =>
    o.statut === 'lost' || o.pipelineStage === 'perdue'
  ).length || 0

  // Count in-progress opportunities (En cours) - excludes won and lost
  const inProgressOpportunitiesCount = contact.opportunities?.filter(o => {
    const isWon = o.statut === 'won' || o.pipelineStage === 'gagnee'
    const isLost = o.statut === 'lost' || o.pipelineStage === 'perdue'
    return o.statut === 'open' && !isWon && !isLost
  }).length || 0

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 mt-2">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-2 space-y-2.5">
        {/* Contact Information - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-lg border border-slate-600/40 p-3 shadow-lg shadow-slate-900/20"
        >
          <h2 className="text-xs font-medium text-white mb-2.5 flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <User className="w-3 h-3 text-blue-400" />
            </div>
            Informations
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="group relative p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-400" />
                  Nom
                </p>
                <button
                  onClick={() => handleCopy(contact.nom, 'nom')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-700/50"
                  title="Copier"
                >
                  {copiedField === 'nom' ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
              <p className="text-xs font-light text-white">{contact.nom}</p>
            </div>

            <div className="group relative p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-green-500/30 transition-all">
              <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-green-400" />
                Téléphone
              </p>
              <a
                href={`tel:${contact.telephone}`}
                className="text-xs font-light text-green-400 hover:text-green-300 transition-colors flex items-center gap-1 group/link"
              >
                {contact.telephone}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </a>
            </div>

            {contact.email && (
              <div className="group relative p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-purple-500/30 transition-all">
                <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-purple-400" />
                  Email
                </p>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-xs font-light text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 break-all group/link"
                >
                  {contact.email}
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                </a>
              </div>
            )}

            {contact.ville && (
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-emerald-500/30 transition-all">
                <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  Ville
                </p>
                <p className="text-xs font-light text-white">{contact.ville}</p>
              </div>
            )}

            {(contact.typeBien || leadData?.typeBien) && (
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-red-500/30 transition-all">
                <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Home className="w-3 h-3 text-red-400" />
                  Type de bien
                </p>
                <p className="text-xs font-light text-white">{contact.typeBien || leadData?.typeBien}</p>
              </div>
            )}

            {leadData?.source && (
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-cyan-500/30 transition-all">
                <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                  Source
                </p>
                <p className="text-xs font-light text-white capitalize">{leadData.source}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Notes & Observations - Multiple Notes System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-lg border border-slate-600/40 p-3 shadow-lg shadow-slate-900/20"
        >
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-medium text-white flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <MessageSquare className="w-3 h-3 text-amber-400" />
              </div>
              Notes & Observations
              {notes.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-light bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  {notes.length}
                </span>
              )}
            </h2>
            {!isAddingNote && (
              <Button
                onClick={() => setIsAddingNote(true)}
                size="sm"
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 h-6 px-2 text-[10px] font-light"
              >
                <Plus className="w-3 h-3 mr-1" />
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
              className="mb-3 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 shadow-lg shadow-amber-500/10"
            >
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Écrivez votre note ici..."
                rows={2}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none text-xs mb-2"
                autoFocus
              />
              <div className="flex items-center gap-1.5 justify-end">
                <Button
                  onClick={() => {
                    setIsAddingNote(false)
                    setNewNoteContent('')
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white h-7 text-xs px-2.5"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddNote}
                  disabled={isSavingNote || !newNoteContent.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white h-7 text-xs px-2.5"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1.5" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Notes List - Enhanced, Clean, Readable */}
          {notes.length > 0 ? (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {notes.map((note, index) => {
                // Use note ID as primary key, fallback to content+date+index for uniqueness
                const uniqueKey = note.id || `note-${note.content.substring(0, 30)}-${note.createdAt}-${index}`;
                const isLeadNote = note.type === 'lead_note' || note.source === 'lead';
                const isPriseDeBesoin = note.isPriseDeBesoin || false;
                const isOpportunityNote = note.isOpportunityNote || false;
                
                // Extract opportunity title and content
                let opportunityTitle = '';
                let noteContent = note.content || '';
                if (isOpportunityNote && note.content?.includes('[Opportunité:')) {
                  const match = note.content.match(/\[Opportunité:\s*([^\]]+)\]/);
                  if (match) {
                    opportunityTitle = match[1].trim();
                    noteContent = note.content.replace(/\[Opportunité:\s*[^\]]+\]\s*/, '').trim();
                    if (!noteContent) {
                      noteContent = 'Détails de l\'opportunité';
                    }
                  }
                }

                return (
                  <motion.div
                    key={uniqueKey}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.015 }}
                    className={`group relative pl-2.5 pr-2 py-1.5 rounded-lg border-l-2 transition-all ${
                      isPriseDeBesoin
                        ? 'bg-purple-500/10 border-l-purple-500/60 hover:bg-purple-500/15 hover:border-l-purple-500/80 shadow-sm shadow-purple-500/10'
                        : isOpportunityNote
                        ? 'bg-blue-500/10 border-l-blue-500/60 hover:bg-blue-500/15 hover:border-l-blue-500/80 shadow-sm shadow-blue-500/10'
                        : isLeadNote
                        ? 'bg-slate-800/30 border-l-purple-500/40 hover:bg-slate-800/50 hover:border-l-purple-500/60'
                        : 'bg-slate-800/20 border-l-slate-600/30 hover:bg-slate-800/40 hover:border-l-slate-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Prise de Besoin Badge */}
                        {isPriseDeBesoin && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/40 text-purple-300 font-medium text-[10px] uppercase tracking-wide shadow-sm">
                              <FileText className="w-2.5 h-2.5" />
                              Prise de Besoin
                            </span>
                          </div>
                        )}
                        
                        {/* Note Content - Highlighted and Readable */}
                        <div className="relative">
                          {isOpportunityNote && opportunityTitle && (
                            <div className="mb-1">
                              <p className="text-[10px] font-medium text-blue-300/80 mb-0.5">
                                Détails de l'opportunité:
                              </p>
                            </div>
                          )}
                          <p className={`text-xs leading-relaxed whitespace-pre-wrap font-light ${
                            isPriseDeBesoin ? 'text-purple-50' : isOpportunityNote ? 'text-blue-50' : 'text-slate-100'
                          }`}>
                            {isOpportunityNote ? noteContent : note.content}
                          </p>
                        </div>

                        {/* Note Metadata - Clean and Subtle */}
                        <div className="flex items-center gap-1.5 text-[10px] flex-wrap pt-0.5">
                          {isLeadNote && !isPriseDeBesoin && !isOpportunityNote && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/8 border border-purple-500/15 text-purple-300/80 font-light">
                              <History className="w-2.5 h-2.5" />
                              Lead
                            </span>
                          )}
                          <span className={`font-light ${
                            isPriseDeBesoin ? 'text-purple-300/80' : isOpportunityNote ? 'text-blue-300/80' : 'text-slate-400'
                          }`}>
                            {userNameMap[note.createdBy] || note.createdBy}
                          </span>
                          <span className={isPriseDeBesoin ? 'text-purple-500/40' : isOpportunityNote ? 'text-blue-500/40' : 'text-slate-600'}>·</span>
                          <span className={`font-light ${
                            isPriseDeBesoin ? 'text-purple-300/60' : isOpportunityNote ? 'text-blue-300/60' : 'text-slate-500'
                          }`}>
                            {formatNoteDate(note.createdAt)}
                          </span>
                          {isOpportunityNote && (
                            <>
                              <span className="text-blue-500/40">·</span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-200 text-[9px] font-medium">
                                <Briefcase className="w-2.5 h-2.5" />
                                {opportunityTitle ? (
                                  <span className="max-w-[150px] truncate" title={opportunityTitle}>
                                    {opportunityTitle}
                                  </span>
                                ) : (
                                  'Opportunité'
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Delete Button - Only for non-lead notes, non-prise-de-besoin notes, and non-opportunity notes */}
                      {!isLeadNote && !isPriseDeBesoin && !isOpportunityNote && (
                        <button
                          onClick={() => handleDeleteNoteClick(note.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 text-red-400/70 hover:text-red-400 shrink-0"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center rounded-lg bg-gradient-to-br from-slate-800/30 to-slate-900/20 border border-dashed border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-1.5">
                <MessageSquare className="w-4 h-4 text-amber-500/50" />
              </div>
              <p className="text-xs font-light text-slate-300 mb-0.5">Aucune note pour le moment</p>
              <p className="text-[10px] font-light text-slate-500">Cliquez sur "Ajouter" pour créer une note</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right Column - Summary */}
      <div className="lg:col-span-1 space-y-2.5">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-lg border border-slate-600/40 p-3 shadow-lg shadow-slate-900/20"
        >
          <h3 className="text-xs font-medium text-white mb-2.5 flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-3 h-3 text-purple-400" />
            </div>
            Résumé
          </h3>
          <div className="space-y-1.5">
            {/* Contact Status - Clean Text Design */}
            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <div className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full",
                  contact.status === 'acompte_recu' ? "bg-emerald-400" :
                    contact.status === 'prise_de_besoin' ? "bg-purple-400" :
                      contact.status === 'qualifie' ? "bg-blue-400" :
                        contact.status === 'perdu' ? "bg-red-400" :
                          "bg-slate-500"
                )} />
                Statut
              </div>

              {(() => {
                const getStatusConfig = (status: string) => {
                  // If status is acompte_recu but no payment/opportunity exists, show Qualifié
                  if (status === 'acompte_recu' && !hasAcomptePayment()) {
                    return { label: 'Qualifié', className: 'text-blue-400' };
                  }

                  switch (status) {
                    case 'acompte_recu':
                      return { label: 'Qualifié', className: 'text-blue-400' }; // Show Qualifié instead
                    case 'prise_de_besoin':
                      return { label: 'Prise de besoin', className: 'text-purple-400' };
                    case 'qualifie':
                      return { label: 'Qualifié', className: 'text-blue-400' };
                    case 'perdu':
                      return { label: 'Refusé', className: 'text-red-400' };
                    default:
                      return { label: 'Qualifié', className: 'text-blue-400' }; // Default to Qualifié
                  }
                };

                const config = getStatusConfig(contact.status);

                return (
                  <p className={cn("text-xs font-medium", config.className)}>
                    {config.label}
                  </p>
                );
              })()}
            </div>

            {isConverted && converterName && (
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  Converti par
                </p>
                <p className="text-xs font-light text-yellow-300">{converterName}</p>
              </div>
            )}

            {architectName && (
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3 text-purple-400" />
                  Architecte
                </p>
                <p className="text-xs font-light text-purple-300">{architectName}</p>
              </div>
            )}

            {(() => {
              // Use state value first, then fallback to contact property
              const leadCreatedAtValue = leadCreatedAt || (contact as any)?.leadCreatedAt;
              
              if (leadCreatedAtValue) {
                try {
                  return (
                    <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                      <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        LEAD CRÉÉE À
                      </p>
                      <p className="text-xs font-light text-white">{formatDateTime(leadCreatedAtValue)}</p>
                    </div>
                  );
                } catch (e) {
                  console.error('[Contact Detail] Error formatting lead creation date:', e, leadCreatedAtValue);
                  return null;
                }
              }
              return null;
            })()}

            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-blue-400" />
                Contact créé le
              </p>
              <p className="text-xs font-light text-blue-300">{formatDateTime(contact.createdAt)}</p>
            </div>
          </div>
        </motion.div>

        {/* Accompte Reçu Section - Only show when there's actual payment/opportunity */}
        {hasAcomptePayment() && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            data-acompte-section
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-3 hover:border-emerald-500/40 hover:bg-emerald-500/12 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <h3 className="text-xs font-medium text-white">Acompte Reçu</h3>
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
              </div>
              {!isEditingAcompte && (
                <button
                  onClick={() => setIsEditingAcompte(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50 transition-all group/edit"
                  title="Modifier le montant"
                >
                  <Edit className="w-3 h-3 text-emerald-300 group-hover/edit:text-emerald-200" />
                  <span className="text-[10px] font-medium text-emerald-200 group-hover/edit:text-emerald-100">
                    Modifier
                  </span>
                </button>
              )}
            </div>

            {isEditingAcompte ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={acompteMontant}
                    onChange={(e) => setAcompteMontant(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-slate-900/50 border-emerald-500/40 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 h-7 text-xs"
                    autoFocus
                  />
                  <span className="text-xs text-slate-400">MAD</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    onClick={() => {
                      setIsEditingAcompte(false)
                      setAcompteMontant(acomptePayment?.montant?.toString() || '')
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-slate-400 hover:text-white"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleUpdateAcompte}
                    disabled={isSavingAcompte || !acompteMontant}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-6 text-[10px] px-2"
                  >
                    {isSavingAcompte ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline justify-between">
                <div className="flex-1">
                  <p className="text-base font-bold text-emerald-300 leading-tight">
                    {acomptePayment?.montant?.toLocaleString('fr-FR') || '0'} MAD
                  </p>
                  {acomptePayment?.methode && (
                    <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                      {acomptePayment.methode}
                    </p>
                  )}
                </div>
                {acomptePayment?.date && (
                  <p className="text-[10px] text-slate-500">
                    {new Date(acomptePayment.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Actions */}

      </div>

      {/* Delete Note Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass border-slate-600/30 p-4">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <AlertDialogTitle className="text-sm font-semibold text-white">
                Supprimer la note
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-300 text-xs leading-relaxed">
              Êtes-vous sûr de vouloir supprimer cette note ?
              <br />
              <br />
              <span className="text-red-400 font-medium">
                Cette action est irréversible.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isDeletingNote}
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setNoteToDelete(null)
              }}
              className="bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/30 h-8 px-3 text-xs"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDeleteNote()
              }}
              disabled={isDeletingNote}
              className="bg-red-500 hover:bg-red-600 text-white border-0 h-8 px-3 text-xs"
            >
              {isDeletingNote ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OpportunitiesTab({ contact, onUpdate, architectNameMap, onCreateOpportunity, canCreateOpportunity }: { contact: ContactWithDetails; onUpdate: () => void; architectNameMap: Record<string, string>; onCreateOpportunity: () => void; canCreateOpportunity: boolean }) {
  return (
    <div className="space-y-2">
      {contact.opportunities && contact.opportunities.length > 0 ? (
        <OpportunitiesTable
          opportunities={contact.opportunities}
          architectNameMap={architectNameMap}
          onUpdate={onUpdate}
          contact={contact}
        />
      ) : (
        <div className="glass rounded-lg border border-slate-600/40 p-8 text-center">
          <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-xs text-slate-300 mb-2">Aucune opportunité pour ce contact</p>
          <Button
            onClick={onCreateOpportunity}
            disabled={!canCreateOpportunity}
            className={`h-7 px-3 text-[10px] ${canCreateOpportunity
              ? 'bg-primary hover:bg-primary/90 text-white'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
              }`}
          >
            <Plus className="w-3 h-3 mr-1.5" />
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

function NotesTab({
  contact,
  onUpdate,
  userNameMap
}: {
  contact: ContactWithDetails;
  onUpdate: () => void;
  userNameMap: Record<string, string>;
}) {
  const [notes, setNotes] = useState<any[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const { user } = useAuth()
  const notesCacheRef = useRef<{ contactId: string; notes: any[]; timestamp: number } | null>(null)

  // Fetch notes from API - Optimized with caching
  useEffect(() => {
    const fetchNotes = async () => {
      if (!contact.id) return
      
      // Check cache first (5 second cache for instant display)
      if (notesCacheRef.current && 
          notesCacheRef.current.contactId === contact.id && 
          Date.now() - notesCacheRef.current.timestamp < 5000) {
        setNotes(notesCacheRef.current.notes)
        return
      }
      
      setIsLoadingNotes(true)
      try {
        const token = localStorage.getItem('token')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
        
        const response = await fetch(`/api/contacts/${contact.id}/notes`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
          // Don't cache when fetching notes to ensure we get latest data
          cache: 'no-store',
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const fetchedNotes = await response.json()
          
          // Notes are already filtered and formatted by API - just set them
          setNotes(fetchedNotes)
          
          // Cache the results
          notesCacheRef.current = {
            contactId: contact.id,
            notes: fetchedNotes,
            timestamp: Date.now(),
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('[NotesTab] Error fetching notes:', error)
        }
      } finally {
        setIsLoadingNotes(false)
      }
    }

    fetchNotes()
    
    // Listen for notes refresh events (e.g., after opportunity creation)
    const handleNotesRefresh = (event: CustomEvent) => {
      if (event.detail?.contactId === contact.id) {
        // Clear cache and refetch
        notesCacheRef.current = null
        fetchNotes()
      }
    }
    
    window.addEventListener('notes-refresh', handleNotesRefresh as EventListener)
    return () => {
      window.removeEventListener('notes-refresh', handleNotesRefresh as EventListener)
    }
  }, [contact.id])

  const handleAddNote = async () => {
    if (!newNote.trim() || isSavingNote) return

    const userName = user?.name || 'Utilisateur'
    const noteContent = newNote.trim()
    
    setIsSavingNote(true)
    
    // Optimistically add note
    const optimisticNote = {
      id: `temp-${Date.now()}`,
      content: noteContent,
      createdAt: new Date().toISOString(),
      createdBy: userName,
      source: 'contact',
      isOptimistic: true,
    }
    
    setNotes(prev => [optimisticNote, ...prev])
    setNewNote('')
    setIsAddingNote(false)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: noteContent,
          createdBy: userName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      const result = await response.json()
      
      // Replace optimistic note with real note
      setNotes(prev => {
        const withoutOptimistic = prev.filter(n => n.id !== optimisticNote.id)
        return [{
          id: result.id,
          content: result.content,
          createdAt: result.createdAt,
          createdBy: result.createdBy || userName,
          source: result.source || 'contact',
        }, ...withoutOptimistic]
      })
      
      toast.success('Note ajoutée', {
        description: 'La note a été enregistrée avec succès.',
        duration: 2000,
      })
      
      // Refresh contact data
      onUpdate()
    } catch (error) {
      console.error('[NotesTab] Error adding note:', error)
      
      // Remove optimistic note on error
      setNotes(prev => prev.filter(n => n.id !== optimisticNote.id))
      
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Impossible d\'ajouter la note. Veuillez réessayer.',
        duration: 3000,
      })
    } finally {
      setIsSavingNote(false)
    }
  }

  // Helper function to identify "prise de besoin" and opportunity notes (same as OverviewTab)
  const identifyPriseDeBesoinNotes = (notes: any[]): any[] => {
    if (!contact.timeline || !Array.isArray(contact.timeline)) {
      return notes;
    }

    // Find timeline entries where status changed to "prise_de_besoin"
    const priseDeBesoinTimelineEntries = contact.timeline.filter((entry: any) => {
      const metadata = entry.metadata || {};
      return (
        entry.eventType === 'status_changed' &&
        metadata.newStatus === 'prise_de_besoin' &&
        metadata.notes
      );
    });

    // Match notes with timeline entries by content and approximate date
    return notes.map(note => {
      const noteContent = (note.content || note.description || '').trim().toLowerCase();
      const noteDate = new Date(note.createdAt || note.date || new Date());

      // Check if this note matches any prise de besoin timeline entry
      const isPriseDeBesoin = priseDeBesoinTimelineEntries.some((entry: any) => {
        const timelineNotes = (entry.metadata?.notes || '').trim().toLowerCase();
        const entryDate = new Date(entry.createdAt || entry.date);
        
        // Match by content similarity (exact match or contains)
        const contentMatches = timelineNotes === noteContent || 
                              noteContent.includes(timelineNotes) ||
                              timelineNotes.includes(noteContent);
        
        // Match by date (within 5 minutes of timeline entry)
        const timeDiff = Math.abs(noteDate.getTime() - entryDate.getTime());
        const dateMatches = timeDiff < 5 * 60 * 1000; // 5 minutes tolerance

        return contentMatches && dateMatches;
      });

      // Check if this is an opportunity note
      const isOpportunityNote = (note.content || note.description || '').trim().startsWith('[Opportunité:') || 
                                note.source === 'opportunity' ||
                                note.sourceType === 'opportunity' ||
                                (note as any).metadata?.source === 'opportunity' ||
                                (note as any).metadata?.opportunityId;

      return {
        ...note,
        isPriseDeBesoin: isPriseDeBesoin,
        isOpportunityNote: isOpportunityNote,
      };
    });
  };

  // Notes are already filtered by API - identify prise de besoin and opportunity notes
  const realNotes = identifyPriseDeBesoinNotes(notes)

  const getUserName = (userId: string) => {
    return userNameMap[userId] || userId || 'Utilisateur'
  }

  return (
    <div className="bg-[#171B22] rounded-lg border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-xs font-light text-white/90 mb-0.5 tracking-wide uppercase">Notes</h2>
          <p className="text-[9px] text-white/40 font-light">Notes ajoutées manuellement</p>
        </div>
        <Button
          onClick={() => setIsAddingNote(!isAddingNote)}
          size="sm"
          className="bg-blue-600/90 hover:bg-blue-600 text-white h-7 px-2.5 text-[10px] font-light"
        >
          <Plus className="w-3 h-3 mr-1" />
          Ajouter note
        </Button>
      </div>

      <AnimatePresence>
        {isAddingNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Écrivez votre note..."
                className="w-full mb-3 min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl resize-none p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSavingNote}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setIsAddingNote(false)
                    setNewNote("")
                  }}
                  size="sm"
                  variant="ghost"
                  className="bg-white/5 hover:bg-white/10 text-white"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoadingNotes ? (
        <div className="space-y-3">
          {/* Skeleton loaders for better perceived performance */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/3 border border-white/5 rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-20 bg-white/5 rounded" />
                    <div className="h-3 w-1 bg-white/5 rounded" />
                    <div className="h-3 w-24 bg-white/5 rounded" />
                  </div>
                  <div className="h-4 w-full bg-white/5 rounded" />
                  <div className="h-4 w-3/4 bg-white/5 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : realNotes.length > 0 ? (
        <div className="space-y-3">
          {realNotes.map((note, index) => {
            const isLeadNote = note.type === 'lead_note' || note.source === 'lead' || note.sourceType === 'lead' || note.source === 'lead_note'
            const isPriseDeBesoin = note.isPriseDeBesoin || false
            const isOpportunityNote = note.isOpportunityNote || false
            const author = getUserName(note.createdBy || note.author || 'Utilisateur')
            let noteContent = note.content || note.description || ''
            const noteDate = note.createdAt || note.date || new Date().toISOString()
            const formattedDate = new Date(noteDate)
            const isToday = formattedDate.toDateString() === new Date().toDateString()
            const isYesterday = formattedDate.toDateString() === new Date(Date.now() - 86400000).toDateString()
            
            // Extract opportunity title if it's an opportunity note
            let opportunityTitle = '';
            if (isOpportunityNote && noteContent.includes('[Opportunité:')) {
              const match = noteContent.match(/\[Opportunité:\s*([^\]]+)\]/);
              if (match) {
                opportunityTitle = match[1].trim();
                noteContent = noteContent.replace(/\[Opportunité:\s*[^\]]+\]\s*/, '').trim();
                if (!noteContent) {
                  noteContent = 'Détails de l\'opportunité';
                }
              }
            }
            
            let dateDisplay = ''
            if (isToday) {
              dateDisplay = `Aujourd'hui, ${formattedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            } else if (isYesterday) {
              dateDisplay = `Hier, ${formattedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            } else {
              dateDisplay = formattedDate.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })
            }
            
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                className={`group rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md ${
                  isPriseDeBesoin
                    ? 'bg-purple-500/8 border border-purple-500/30 hover:bg-purple-500/12 hover:border-purple-500/40'
                    : isOpportunityNote
                    ? 'bg-blue-500/8 border border-blue-500/30 hover:bg-blue-500/12 hover:border-blue-500/40'
                    : 'bg-gradient-to-br from-white/5 to-white/3 border border-white/10 hover:border-white/20 hover:from-white/8 hover:to-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                    isPriseDeBesoin
                      ? 'bg-purple-500/20'
                      : isOpportunityNote
                      ? 'bg-blue-500/20'
                      : 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
                  }`}>
                    {isPriseDeBesoin ? (
                      <FileText className="w-4 h-4 text-purple-300" />
                    ) : isOpportunityNote ? (
                      <Briefcase className="w-4 h-4 text-blue-300" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs font-medium ${
                        isPriseDeBesoin ? 'text-purple-100' : isOpportunityNote ? 'text-blue-100' : 'text-white/90'
                      }`}>
                        {author}
                      </span>
                      <span className={`text-[10px] ${
                        isPriseDeBesoin ? 'text-purple-400/60' : isOpportunityNote ? 'text-blue-400/60' : 'text-white/30'
                      }`}>•</span>
                      <span className={`text-[10px] font-light ${
                        isPriseDeBesoin ? 'text-purple-200/70' : isOpportunityNote ? 'text-blue-200/70' : 'text-white/50'
                      }`}>
                        {dateDisplay}
                      </span>
                      {isPriseDeBesoin && (
                        <>
                          <span className="text-[10px] text-purple-400/60">•</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/25 text-purple-200 text-[9px] font-medium">
                            <FileText className="w-2.5 h-2.5" />
                            Prise de Besoin
                          </span>
                        </>
                      )}
                      {isOpportunityNote && (
                        <>
                          <span className="text-[10px] text-blue-400/60">•</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-200 text-[9px] font-medium">
                            <Briefcase className="w-2.5 h-2.5" />
                            {opportunityTitle ? (
                              <span className="max-w-[200px] truncate" title={opportunityTitle}>
                                {opportunityTitle}
                              </span>
                            ) : (
                              'Opportunité'
                            )}
                          </span>
                        </>
                      )}
                      {isLeadNote && !isPriseDeBesoin && !isOpportunityNote && (
                        <>
                          <span className="text-[10px] text-white/30">•</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-medium">
                            Lead
                          </span>
                        </>
                      )}
                    </div>
                    {isOpportunityNote && opportunityTitle && (
                      <div className="mb-1.5">
                        <p className="text-[10px] font-medium text-blue-300/80 mb-0.5">
                          Détails de l'opportunité:
                        </p>
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed font-light whitespace-pre-wrap break-words ${
                      isPriseDeBesoin ? 'text-purple-50/90' : isOpportunityNote ? 'text-blue-50/90' : 'text-white/90'
                    }`}>
                      {noteContent}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/5 to-white/3 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white/30" />
          </div>
          <p className="text-white/60 text-sm font-light mb-1">Aucune note pour le moment</p>
          <p className="text-white/40 text-xs font-light">Ajoutez votre première note pour commencer</p>
        </div>
      )}
    </div>
  )
}

function TasksTab({ contact }: { contact: ContactWithDetails }) {
  return (
    <div className="glass rounded-lg border border-slate-600/40 p-8 text-center">
      <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
      <p className="text-xs text-slate-300">Tâches et RDV à venir</p>
      <p className="text-[10px] text-slate-500 mt-1">Cette section affichera les tâches et RDV liés à ce contact</p>
    </div>
  )
}

function DocumentsTab({ contact }: { contact: ContactWithDetails }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Get all documents including devis
  const allDocuments = (contact.documents || []).filter((doc: any) => doc && doc.id)
  
  // Calculate category counts including devis
  const categories = [
    { value: "all", label: "Tous", count: allDocuments.length },
    { value: "plan", label: "Plans", count: allDocuments.filter((d: any) => d.category === 'plan').length },
    { 
      value: "devis", 
      label: "Devis", 
      count: allDocuments.filter((d: any) => d.category === 'devis' || d.isDevis).length 
    },
    { value: "photo", label: "Photos", count: allDocuments.filter((d: any) => d.category === 'photo').length },
    { value: "contrat", label: "Contrats", count: allDocuments.filter((d: any) => d.category === 'contrat').length },
    { value: "autre", label: "Autres", count: allDocuments.filter((d: any) => d.category === 'autre' || !d.category).length },
  ]

  const filteredDocuments = allDocuments.filter((doc: any) => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.devisTitle && doc.devisTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || 
                           doc.category === selectedCategory || 
                           (selectedCategory === "devis" && doc.isDevis)
    return matchesSearch && matchesCategory
  })

  const getFileIcon = (doc: any) => {
    if (doc.isDevis) return FileText
    const ext = doc.name?.split('.').pop()?.toLowerCase() || ''
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image
    if (['pdf'].includes(ext)) return FileText
    if (['doc', 'docx'].includes(ext)) return FileText
    if (['xls', 'xlsx'].includes(ext)) return FileSpreadsheet
    return FileText
  }

  const getFileIconColor = (doc: any) => {
    if (doc.isDevis) return "text-red-400"
    const ext = doc.name?.split('.').pop()?.toLowerCase() || ''
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return "text-blue-400"
    if (['pdf'].includes(ext)) return "text-red-400"
    return "text-slate-400"
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: string | Date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleDownload = async (doc: any) => {
    try {
      let fileUrl = doc.url

      // If it's a devis document, get signed URL from path
      if (doc.isDevis && doc.path) {
        if (!fileUrl || !fileUrl.startsWith('http')) {
          try {
            const response = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(doc.path)}`)
            const data = await response.json()
            if (data.url) {
              fileUrl = data.url
            } else {
              throw new Error('Impossible d\'obtenir l\'URL du fichier')
            }
          } catch (error) {
            toast.error("Impossible d'obtenir l'URL du fichier devis.")
            return
          }
        }
      }

      if (!fileUrl && doc.path) {
        // Try to get signed URL for regular documents too
        try {
          const response = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(doc.path)}`)
          const data = await response.json()
          if (data.url) {
            fileUrl = data.url
          }
        } catch (error) {
          console.error('Error getting signed URL:', error)
        }
      }

      if (!fileUrl) {
        toast.error("Aucun lien trouvé pour ce fichier.")
        return
      }

      toast.loading(`Téléchargement de ${doc.name}...`)

      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = doc.name || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success(`Téléchargement de ${doc.name} terminé`)
    } catch (err: any) {
      toast.error(err?.message || "Échec du téléchargement. Veuillez réessayer plus tard.")
    }
  }

  if (allDocuments.length === 0) {
    return (
      <div className="glass rounded-lg border border-slate-600/40 p-8 text-center">
        <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-300">Documents</p>
        <p className="text-[10px] text-slate-500 mt-1">Aucun document téléchargé pour ce contact</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Documents</h3>
          <p className="text-sm text-white/60">
            {contact.nom} • {allDocuments.length} fichier{allDocuments.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un document..."
            className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                selectedCategory === category.value
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
              )}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            Aucun document trouvé
          </div>
        ) : (
          filteredDocuments.map((doc: any) => {
            const Icon = getFileIcon(doc)
            const iconColor = getFileIconColor(doc)
            
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleDownload(doc)}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColor.includes('red') ? 'bg-red-500/20' : iconColor.includes('blue') ? 'bg-blue-500/20' : 'bg-slate-500/20')}>
                  <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                    {doc.isDevis && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
                        Devis
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                    <span>{doc.uploadedBy || 'Utilisateur'}</span>
                    <span>•</span>
                    <span>{formatDate(doc.uploadedAt || doc.createdAt)}</span>
                    {doc.size > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </>
                    )}
                  </div>
                </div>
                <Download className="w-4 h-4 text-white/40" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
