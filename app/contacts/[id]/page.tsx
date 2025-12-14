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

      // Optimized fetch - use cache for faster loading
      const url = `/api/contacts/${contactId}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // Enable caching for faster subsequent loads
        cache: 'default',
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
  const canCreateOpportunity = contact.status === 'qualifie' ||
    contact.status === 'prise_de_besoin' ||
    contact.status === 'acompte_recu'

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
                        {contact.nom.charAt(0).toUpperCase()}
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

                      {/* Create Opportunity button - Enabled when status is 'qualifie' or higher */}
                      {(!contact.opportunities || contact.opportunities.length === 0) && (
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
                      )}

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
                  { id: 'timeline', label: 'Timeline', icon: <MessageSquare className="w-3.5 h-3.5" /> },
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
}

function OverviewTab({ contact, architectName, architectNameMap, userNameMap, onUpdate, onEditAcompte }: { contact: ContactWithDetails; architectName: string | null; architectNameMap: Record<string, string>; userNameMap: Record<string, string>; onUpdate: () => void; onEditAcompte?: () => void }) {
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [leadData, setLeadData] = useState<{ typeBien?: string; source?: string } | null>(null)

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

  // Parse notes from contact (includes merged lead notes from API)
  useEffect(() => {
    // Reset notes first
    setNotes([])

    if (contact.notes) {
      try {
        if (typeof contact.notes === 'string') {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(contact.notes)

            if (Array.isArray(parsed) && parsed.length > 0) {
              // Valid array of notes (may include lead notes)
              // Deduplicate on frontend as well (by content + author + date)
              const uniqueNotes = parsed.filter((note: ContactNote, index: number, self: ContactNote[]) => {
                const normalizedContent = note.content?.trim().toLowerCase() || '';
                const dateKey = new Date(note.createdAt).setSeconds(0, 0);
                const uniqueKey = `${normalizedContent}|${note.createdBy}|${dateKey}`;
                return index === self.findIndex((n: ContactNote) => {
                  const nContent = n.content?.trim().toLowerCase() || '';
                  const nDateKey = new Date(n.createdAt).setSeconds(0, 0);
                  return `${nContent}|${n.createdBy}|${nDateKey}` === uniqueKey;
                });
              });
              setNotes(uniqueNotes as ContactNote[])
            } else if (parsed && typeof parsed === 'string' && parsed.trim()) {
              // Legacy single note format - convert to array
              setNotes([{
                id: `legacy-${Date.now()}`,
                content: parsed,
                createdAt: toISOString(contact.createdAt),
                createdBy: contact.createdBy || 'unknown',
                type: 'note'
              }])
            }
          } catch (parseError) {
            // Not valid JSON, treat as plain string
            if (contact.notes.trim()) {
              setNotes([{
                id: `legacy-${Date.now()}`,
                content: contact.notes,
                createdAt: toISOString(contact.createdAt),
                createdBy: contact.createdBy || 'unknown',
                type: 'note'
              }])
            }
          }
        } else if (Array.isArray(contact.notes)) {
          // Already an array (from API merge)
          const notesArray = contact.notes as ContactNote[]
          if (notesArray.length > 0) {
            setNotes(notesArray)
          }
        }
      } catch (e) {
        console.error('Error parsing contact notes:', e)
        // If it's a plain string, convert to array
        if (typeof contact.notes === 'string' && contact.notes.trim()) {
          setNotes([{
            id: `legacy-${Date.now()}`,
            content: contact.notes,
            createdAt: toISOString(contact.createdAt),
            createdBy: contact.createdBy || 'unknown',
            type: 'note'
          }])
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
          } else {
            // Fallback: try to fetch from API if available
            // Note: Lead might be deleted, so this might fail
            try {
              const response = await fetch(`/api/leads/${contact.leadId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              })
              if (response.ok) {
                const lead = await response.json()
                setLeadData({
                  typeBien: lead.typeBien,
                  source: lead.source
                })
              }
            } catch (e) {
              // Lead might be deleted, that's okay
              console.log('Lead not found or deleted:', e)
            }
          }
        } catch (error) {
          console.error('Error fetching lead data:', error)
        }
      }
    }
    fetchLeadData()
  }, [contact.leadId, contact.timeline])

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
    if (!acompteMontant || isNaN(Number(acompteMontant))) {
      toast.error('Veuillez saisir un montant valide')
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

                return (
                  <motion.div
                    key={uniqueKey}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.015 }}
                    className={`group relative pl-2.5 pr-2 py-1.5 rounded-lg border-l-2 transition-all ${isLeadNote
                      ? 'bg-slate-800/30 border-l-purple-500/40 hover:bg-slate-800/50 hover:border-l-purple-500/60'
                      : 'bg-slate-800/20 border-l-slate-600/30 hover:bg-slate-800/40 hover:border-l-slate-500/50'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Note Content - Highlighted and Readable */}
                        <div className="relative">
                          <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap font-light">
                            {note.content}
                          </p>
                        </div>

                        {/* Note Metadata - Clean and Subtle */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap pt-0.5">
                          {isLeadNote && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/8 border border-purple-500/15 text-purple-300/80 font-light">
                              <History className="w-2.5 h-2.5" />
                              Lead
                            </span>
                          )}
                          <span className="font-light text-slate-400">
                            {userNameMap[note.createdBy] || note.createdBy}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="font-light text-slate-500">{formatNoteDate(note.createdAt)}</span>
                        </div>
                      </div>

                      {/* Delete Button - Only for non-lead notes */}
                      {!isLeadNote && (
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
  return (
    <div className="glass rounded-lg border border-slate-600/40 p-8 text-center">
      <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
      <p className="text-xs text-slate-300">Documents</p>
      <p className="text-[10px] text-slate-500 mt-1">Aucun document téléchargé pour ce contact</p>
    </div>
  )
}
