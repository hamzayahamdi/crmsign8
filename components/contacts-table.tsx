"use client"

import React from 'react'
import { useRouter } from 'next/navigation'

import { Contact, LeadStatus } from '@/types/contact'
import { Opportunity } from '@/types/contact'
import {
  Phone,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Briefcase,
  Home,
  Building2,
  Store,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { DeleteContactDialog } from '@/components/delete-contact-dialog'

interface ContactsTableProps {
  contacts: (Contact & { opportunities?: Opportunity[] })[]
  onRowClick: (contactId: string) => void
  onEditContact?: (contactId: string) => void
  onDeleteContact?: (contactId: string) => void
  isLoading?: boolean
}

/**
 * Professional CRM-style Contacts Table - FULLY RESPONSIVE
 * Clean, minimal, role-based, focused on opportunities and workflow
 * Mobile: Card view, Desktop: Table view
 * Role-based visibility: Admin sees all, Architect sees limited info
 */
export function ContactsTable({
  contacts,
  onRowClick,
  onEditContact,
  onDeleteContact,
  isLoading = false
}: ContactsTableProps) {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isGestionnaire = user?.role?.toLowerCase() === 'gestionnaire'
  const isArchitect = user?.role?.toLowerCase() === 'architect' || user?.role?.toLowerCase() === 'architecte'

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 ContactsTable Debug:', {
      userRole: user?.role,
      isAdmin,
      isGestionnaire,
      canManage: isAdmin || isGestionnaire,
      hasEditCallback: !!onEditContact,
      hasDeleteCallback: !!onDeleteContact,
    })
  }, [user, isAdmin, isGestionnaire, onEditContact, onDeleteContact])

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [contactToDelete, setContactToDelete] = React.useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Handle delete contact
  const handleDeleteContact = async () => {
    if (!contactToDelete) return

    setIsDeleting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('[ContactsTable] Deleting contact:', contactToDelete.id)

      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[ContactsTable] Delete response status:', response.status)

      const data = await response.json()
      console.log('[ContactsTable] Delete response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete contact')
      }

      // Close dialog immediately on success
      setDeleteDialogOpen(false)
      setContactToDelete(null)

      // Show success toast
      toast.success('Contact supprimé avec succès', {
        description: `Le contact "${contactToDelete.name}" a été supprimé définitivement`,
        duration: 3000,
      })

      console.log('[ContactsTable] Contact deleted successfully, refreshing list...')

      // Call parent callback to refresh data
      if (onDeleteContact) {
        onDeleteContact(contactToDelete.id)
      }
    } catch (error) {
      console.error('[ContactsTable] Error deleting contact:', error)
      toast.error('Erreur lors de la suppression', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        duration: 5000,
      })
    } finally {
      setIsDeleting(false)
    }
  }


  // Map lead typeBien to opportunity type format
  const mapTypeBienToOpportunityType = (typeBien: string | null | undefined): string | null => {
    if (!typeBien) return null

    const typeMap: Record<string, string> = {
      'Villa': 'villa',
      'villa': 'villa',
      'Appartement': 'appartement',
      'appartement': 'appartement',
      'Magasin': 'magasin',
      'magasin': 'magasin',
      'Bureau': 'bureau',
      'bureau': 'bureau',
      'Riad': 'riad',
      'riad': 'riad',
      'Studio': 'studio',
      'studio': 'studio',
      'Rénovation': 'renovation',
      'renovation': 'renovation',
      'Renovation': 'renovation',
      'Autre': 'autre',
      'autre': 'autre',
    }

    return typeMap[typeBien] || typeBien.toLowerCase() || null
  }

  // Get project type: prefer contact.typeBien (direct field), then opportunities, then mapped typeBien
  const getProjectType = (opportunities: Opportunity[] = [], contactTypeBien?: string | null) => {
    // First priority: use contact.typeBien directly (from database)
    if (contactTypeBien) {
      const mapped = mapTypeBienToOpportunityType(contactTypeBien)
      if (mapped) return mapped
    }

    // Second priority: get from opportunities
    if (opportunities.length > 0) {
      // Count types
      const typeCounts: Record<string, number> = {}
      opportunities.forEach(opp => {
        typeCounts[opp.type] = (typeCounts[opp.type] || 0) + 1
      })

      // Get most common
      const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
      if (mostCommon) return mostCommon[0]
    }

    return null
  }

  const getProjectTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'villa': Home,
      'appartement': Building2,
      'magasin': Store,
      'bureau': Building2,
      'riad': Home,
      'studio': Building2,
      'renovation': Building2,
      'autre': Building2,
    }
    return icons[type] || Building2
  }

  const getProjectTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'villa': 'Villa',
      'appartement': 'Appartement',
      'magasin': 'Magasin',
      'bureau': 'Bureau',
      'riad': 'Riad',
      'studio': 'Studio',
      'renovation': 'Rénovation',
      'autre': 'Autre',
    }
    return labels[type] || type
  }

  // Lead Status helpers
  const getLeadStatusLabel = (status: LeadStatus) => {
    const labels: Record<LeadStatus, string> = {
      'nouveau': 'Nouveau',
      'a_recontacter': 'À recontacter',
      'sans_reponse': 'Sans réponse',
      'non_interesse': 'Non intéressé',
      'qualifie': 'Qualifié',
      'refuse': 'Refusé',
    }
    return labels[status] || status
  }

  // Contact Status helpers - Enhanced with distinct colors for better visual hierarchy
  const getContactStatusBadge = (status: string | null | undefined) => {
    if (!status) return null

    const badges: Record<string, { label: string, className: string }> = {
      // Lead Statuses with distinct, meaningful colors
      'nouveau': {
        label: 'Nouveau',
        className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
      },
      'a_recontacter': {
        label: 'À recontacter',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
      },
      'sans_reponse': {
        label: 'Sans réponse',
        className: 'bg-slate-500/20 text-slate-300 border-slate-500/40 shadow-sm'
      },
      'non_interesse': {
        label: 'Non intéressé',
        className: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm'
      },
      'qualifie': {
        label: 'Qualifié',
        className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
      },
      'refuse': {
        label: 'Refusé',
        className: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
      }
    }

    return badges[status] || { label: status, className: 'bg-slate-500/20 text-slate-300 border-slate-500/40 shadow-sm' }
  }


  const [architectNameMap, setArchitectNameMap] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    const loadArchitects = async () => {
      try {
        const res = await fetch('/api/users')
        if (!res.ok) return

        const users = await res.json()
        const map: Record<string, string> = {}

        users.forEach((u: any) => {
          const name = (u.name || '').trim()
          if (!name) return

          if (u.id) {
            map[u.id] = name
          }

          map[name] = name
        })

        setArchitectNameMap(map)
      } catch {
        // Silent fail – fallback to raw value
      }
    }

    loadArchitects()
  }, [])

  if (isLoading) {
    return (
      <>
        {/* Mobile Loading Cards */}
        <div className="lg:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-xl border border-slate-600/30 p-4 animate-pulse">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-700/30 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-slate-700/30 rounded mb-2" />
                  <div className="h-3 w-24 bg-slate-700/20 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-700/20 rounded" />
                <div className="h-3 w-3/4 bg-slate-700/20 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Loading Table */}
        <div className="hidden lg:block glass rounded-2xl border border-slate-600/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600/20">
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ville</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type de projet</th>
                {!isArchitect && (
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Architecte</th>
                )}
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Opportunités</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Statut Lead</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dernière activité</th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-600/5 animate-pulse">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-700/30 rounded-lg" />
                      <div>
                        <div className="h-3 w-32 bg-slate-700/30 rounded mb-1" />
                        <div className="h-2.5 w-24 bg-slate-700/20 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-3 w-20 bg-slate-700/20 rounded" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-5 w-24 bg-slate-700/20 rounded" />
                  </td>
                  {!isArchitect && (
                    <td className="px-3 py-2">
                      <div className="h-3 w-20 bg-slate-700/20 rounded" />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      <div className="h-4 w-8 bg-slate-700/20 rounded" />
                      <div className="h-4 w-16 bg-slate-700/20 rounded" />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-3 w-20 bg-slate-700/20 rounded" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <div className="h-7 w-7 bg-slate-700/20 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="glass rounded-xl md:rounded-2xl border border-slate-600/30 p-8 md:p-12 text-center">
        <Phone className="w-10 h-10 md:w-12 md:h-12 text-slate-500 mx-auto mb-3 md:mb-4" />
        <p className="text-slate-300 text-xs md:text-sm font-medium">Aucun contact trouvé</p>
        <p className="text-[11px] md:text-xs text-slate-500 mt-1">Les contacts proviennent de la conversion des leads</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {contacts.map((contact, index) => {
          const opportunities = contact.opportunities || []

          // An opportunity is considered "Gagnée" ONLY when it is explicitly marked as won
          // or when it has reached the final pipeline stage "gagnee".
          // NOTE: "acompte_recu" is now treated as an opportunity still "en cours" (in progress),
          // not as won, because the devis may not yet be accepté.
          const isWon = (o: Opportunity) =>
            o.statut === 'won' || o.pipelineStage === 'gagnee'

          const isLost = (o: Opportunity) =>
            o.statut === 'lost' || o.pipelineStage === 'perdue'

          // An opportunity is "En cours" when it's open AND not won AND not lost
          const isOpen = (o: Opportunity) =>
            o.statut === 'open' && !isWon(o) && !isLost(o)

          const opportunityCounts = {
            open: opportunities.filter(isOpen).length,
            won: opportunities.filter(isWon).length,
            lost: opportunities.filter((o) => o.statut === 'lost' || o.pipelineStage === 'perdue').length,
            onHold: opportunities.filter((o) => o.statut === 'on_hold').length,
          }
          const projectType = getProjectType(opportunities, contact.typeBien)

          return (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.2 }}
              onClick={() => onRowClick(contact.id)}
              onMouseEnter={() => router.prefetch(`/contacts/${contact.id}`)}
              className="glass rounded-xl border border-slate-600/30 p-4 hover:bg-slate-800/50 transition-all duration-150 cursor-pointer active:scale-[0.98]"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 font-bold text-primary text-xs border border-primary/30">
                  {contact.nom.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white text-xs truncate">{contact.nom}</p>
                    {contact.tag === 'client' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/40 shadow-sm shrink-0">
                        CLIENT
                      </span>
                    )}
                    {contact.tag === 'vip' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] text-amber-300 font-bold bg-amber-500/20 border border-amber-500/40 shadow-sm shrink-0">
                        VIP
                      </span>
                    )}
                  </div>
                  <div
                    className="text-xs text-slate-400 flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 shrink-0" />
                    {contact.telephone}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-2 mb-3">
                {/* City */}
                {contact.ville && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">{contact.ville}</span>
                  </div>
                )}

                {/* Project Type */}
                {projectType && (
                  <div className="flex items-center gap-2">
                    {React.createElement(getProjectTypeIcon(projectType), {
                      className: "w-3.5 h-3.5 text-slate-400 shrink-0"
                    })}
                    <span className="text-xs text-slate-300">{getProjectTypeLabel(projectType)}</span>
                  </div>
                )}

                {/* Architect */}
                {!isArchitect && contact.architecteAssigne && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-300 truncate">
                      {architectNameMap[contact.architecteAssigne] || contact.architecteAssigne}
                    </span>
                  </div>
                )}

                {/* Last Activity */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(contact.updatedAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
              </div>

              {/* Lead Status Badge - Mobile View */}
              {contact.leadStatus && (
                <div className="mb-3">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium border",
                    getContactStatusBadge(contact.leadStatus)?.className
                  )}>
                    {getContactStatusBadge(contact.leadStatus)?.label}
                  </span>
                </div>
              )}

              {/* Opportunities */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-600/20">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400">Opportunités:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {opportunities.length > 0 ? (
                    <>
                      <span className="text-xs font-semibold text-white">{opportunities.length}</span>
                      {opportunityCounts.won > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold shadow-sm">
                          {opportunityCounts.won} Gagné{opportunityCounts.won > 1 ? 's' : ''}
                        </span>
                      )}
                      {opportunityCounts.open > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold shadow-sm">
                          {opportunityCounts.open} En cours
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500 text-xs">Aucune</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-600/20">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRowClick(contact.id)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all text-xs font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Voir
                </button>
                {(isAdmin || isGestionnaire) && onEditContact && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditContact(contact.id)
                    }}
                    className="px-3 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isAdmin && onDeleteContact && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setContactToDelete({ id: contact.id, name: contact.nom })
                      setDeleteDialogOpen(true)
                    }}
                    className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block glass rounded-xl border border-slate-600/30 overflow-hidden shadow-[0_18px_48px_-28px_rgba(59,130,246,0.25)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600/20">
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ville</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type de projet</th>
                {!isArchitect && (
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Architecte</th>
                )}
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Opportunités</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Statut Lead</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dernière activité</th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600/10">
              {contacts.map((contact, index) => {
                const opportunities = contact.opportunities || []

                // Same winning logic as mobile view: only explicit "won" status
                // or final pipeline stage "gagnee" are counted as Gagné.
                // "acompte_recu" remains an active / in-progress opportunity.
                const isWon = (o: Opportunity) =>
                  o.statut === 'won' || o.pipelineStage === 'gagnee'

                const isLost = (o: Opportunity) =>
                  o.statut === 'lost' || o.pipelineStage === 'perdue'

                // An opportunity is "En cours" when it's open AND not won AND not lost
                const isOpen = (o: Opportunity) =>
                  o.statut === 'open' && !isWon(o) && !isLost(o)

                const opportunityCounts = {
                  open: opportunities.filter(isOpen).length,
                  won: opportunities.filter(isWon).length,
                  lost: opportunities.filter((o) => o.statut === 'lost' || o.pipelineStage === 'perdue').length,
                  onHold: opportunities.filter((o) => o.statut === 'on_hold').length,
                }
                const projectType = getProjectType(opportunities, contact.typeBien)

                return (
                  <motion.tr
                    key={contact.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.01, duration: 0.2 }}
                    onClick={() => onRowClick(contact.id)}
                    onMouseEnter={() => router.prefetch(`/contacts/${contact.id}`)}
                    className="group cursor-pointer hover:bg-slate-800/50 transition-all duration-150 border-b border-slate-600/5 last:border-0"
                  >
                    {/* Contact Name + Tag + Phone */}
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 font-bold text-primary text-xs border border-primary/30">
                          {contact.nom.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="font-semibold text-white text-xs truncate">{contact.nom}</p>
                            {contact.tag === 'client' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/40 shadow-sm shrink-0">
                                CLIENT
                              </span>
                            )}
                            {contact.tag === 'vip' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] text-amber-300 font-bold bg-amber-500/20 border border-amber-500/40 shadow-sm shrink-0">
                                VIP
                              </span>
                            )}
                          </div>
                          <div
                            className="text-[10px] text-slate-400 flex items-center gap-1"
                          >
                            <Phone className="w-2.5 h-2.5 shrink-0" />
                            {contact.telephone}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* City */}
                    <td className="px-3 py-2">
                      {contact.ville ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-[11px] text-slate-200">{contact.ville}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Type de projet */}
                    <td className="px-3 py-2">
                      {projectType ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700/50 border border-slate-600/50 shadow-sm">
                          {React.createElement(getProjectTypeIcon(projectType), {
                            className: "w-3.5 h-3.5 text-blue-400 shrink-0"
                          })}
                          <span className="text-[11px] font-semibold text-slate-200">
                            {getProjectTypeLabel(projectType)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Architect */}
                    {!isArchitect && (
                      <td className="px-3 py-2">
                        {contact.architecteAssigne ? (
                          <span className="text-[11px] text-slate-200 truncate max-w-[140px] block">
                            {architectNameMap[contact.architecteAssigne] || contact.architecteAssigne}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    )}

                    {/* Opportunities */}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {opportunities.length > 0 ? (
                          <>
                            <span className="text-[11px] font-semibold text-white">{opportunities.length}</span>
                            {opportunityCounts.won > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-semibold shadow-sm">
                                {opportunityCounts.won} Gagné{opportunityCounts.won > 1 ? 's' : ''}
                              </span>
                            )}
                            {opportunityCounts.open > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-semibold shadow-sm">
                                {opportunityCounts.open} En cours
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Aucune</span>
                        )}
                      </div>
                    </td>

                    {/* Lead Status - Enhanced badge styling */}
                    <td className="px-3 py-2">
                      {contact.leadStatus ? (
                        <span className={cn(
                          "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm transition-all",
                          getContactStatusBadge(contact.leadStatus)?.className
                        )}>
                          {getContactStatusBadge(contact.leadStatus)?.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Last Activity */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        <span className="text-[11px] text-slate-400">
                          {formatDistanceToNow(new Date(contact.updatedAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex justify-center items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {/* View */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRowClick(contact.id)
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 text-slate-400 transition-all"
                          title="Voir les détails"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit - Admin and Gestionnaire can edit */}
                        {(isAdmin || isGestionnaire) && onEditContact && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditContact(contact.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-yellow-500/20 hover:text-yellow-400 text-slate-400 transition-all"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete - Only Admin can delete (Gestionnaire cannot delete per permissions) */}
                        {isAdmin && onDeleteContact && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setContactToDelete({ id: contact.id, name: contact.nom })
                              setDeleteDialogOpen(true)
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteContactDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        contactName={contactToDelete?.name || ''}
        onConfirm={handleDeleteContact}
        isDeleting={isDeleting}
      />
    </>
  )
}
