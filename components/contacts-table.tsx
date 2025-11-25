"use client"

import React from 'react'
import { Contact } from '@/types/contact'
import { Opportunity } from '@/types/contact'
import {
  Phone,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Briefcase,
  TrendingUp,
  Trophy,
  Flame,
  Target,
  Home,
  Building2,
  Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'

interface ContactsTableProps {
  contacts: (Contact & { opportunities?: Opportunity[] })[]
  onRowClick: (contactId: string) => void
  onEditContact?: (contactId: string) => void
  onDeleteContact?: (contactId: string) => void
  isLoading?: boolean
}

/**
 * Professional CRM-style Contacts Table - FULLY REDESIGNED
 * Clean, minimal, role-based, focused on opportunities and workflow
 * Role-based visibility: Admin sees all, Architect sees limited info
 */
export function ContactsTable({ 
  contacts, 
  onRowClick, 
  onEditContact, 
  onDeleteContact, 
  isLoading = false 
}: ContactsTableProps) {
  const { user } = useAuth()
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isArchitect = user?.role?.toLowerCase() === 'architect' || user?.role?.toLowerCase() === 'architecte'

  // Get pipeline stage badge for Admin only
  const getPipelineBadge = (contact: Contact) => {
    if (contact.status === 'perdu') {
      return { label: 'Perdu', className: 'bg-red-500/20 text-red-300 border-red-500/30' }
    }

    const map: Record<string, { label: string, className: string }> = {
      'qualifie': { label: 'Qualifié', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
      'prise_de_besoin': { label: 'Prise de besoin', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
      'acompte_recu': { label: 'Acompte reçu', className: 'bg-green-500/20 text-green-300 border-green-500/30' }
    }

    return map[contact.status] || null
  }

  // Get most common project type from opportunities
  const getProjectType = (opportunities: Opportunity[] = []) => {
    if (opportunities.length === 0) return null
    
    // Count types
    const typeCounts: Record<string, number> = {}
    opportunities.forEach(opp => {
      typeCounts[opp.type] = (typeCounts[opp.type] || 0) + 1
    })
    
    // Get most common
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
    return mostCommon ? mostCommon[0] : null
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
      <div className="glass rounded-2xl border border-slate-600/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-600/30 bg-slate-800/40">
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Téléphone</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ville</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type de projet</th>
              {!isArchitect && (
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Architecte</th>
              )}
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Opportunités</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dernière activité</th>
              {isAdmin && (
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline</th>
              )}
              <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-600/10 animate-pulse">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-700/30 rounded-lg" />
                    <div className="h-3 w-28 bg-slate-700/30 rounded" />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-20 bg-slate-700/20 rounded" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-16 bg-slate-700/20 rounded" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-5 w-20 bg-slate-700/20 rounded" />
                </td>
                {!isArchitect && (
                  <td className="px-4 py-2.5">
                    <div className="h-5 w-16 bg-slate-700/20 rounded" />
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <div className="h-4 w-14 bg-slate-700/20 rounded" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="h-3 w-16 bg-slate-700/20 rounded" />
                </td>
                {isAdmin && (
                  <td className="px-4 py-2.5">
                    <div className="h-5 w-20 bg-slate-700/20 rounded" />
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <div className="flex justify-center gap-0.5">
                    <div className="h-6 w-6 bg-slate-700/20 rounded" />
                    {isAdmin && (
                      <>
                        <div className="h-6 w-6 bg-slate-700/20 rounded" />
                        <div className="h-6 w-6 bg-slate-700/20 rounded" />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="glass rounded-2xl border border-slate-600/30 p-12 text-center">
        <Phone className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-300 text-lg font-medium">Aucun contact trouvé</p>
        <p className="text-sm text-slate-500 mt-1">Les contacts proviennent de la conversion des leads</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl border border-slate-600/30 overflow-hidden shadow-[0_18px_48px_-28px_rgba(59,130,246,0.25)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-600/30 bg-slate-800/40">
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Téléphone</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ville</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type de projet</th>
              {!isArchitect && (
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Architecte</th>
              )}
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Opportunités</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Dernière activité</th>
              {isAdmin && (
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline</th>
              )}
              <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600/10">
            {contacts.map((contact, index) => {
              const opportunities = contact.opportunities || []
              
              // Helper: Check if opportunity is won (by statut or pipeline stage)
              // Acompte Reçu (acompte_recu) means the opportunity is won (deposit received)
              const isWon = (o: Opportunity) => 
                o.statut === 'won' || o.pipelineStage === 'acompte_recu' || o.pipelineStage === 'gagnee'
              
              // Helper: Check if opportunity is open (statut is open AND not won, lost, or on hold)
              const isOpen = (o: Opportunity) => 
                o.statut === 'open' && !isWon(o) && o.statut !== 'lost' && o.statut !== 'on_hold'
              
              const opportunityCounts = {
                open: opportunities.filter(isOpen).length,
                won: opportunities.filter(isWon).length,
                lost: opportunities.filter((o) => o.statut === 'lost' || o.pipelineStage === 'perdue').length,
                onHold: opportunities.filter((o) => o.statut === 'on_hold').length,
              }
              const projectType = getProjectType(opportunities)
              const pipelineBadge = getPipelineBadge(contact)

              // Check if contact has unread/untreated opportunities
              const hasUntreatedOpps = opportunityCounts.open > 0

              return (
                <motion.tr
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="group hover:bg-slate-800/30 transition-colors duration-150 border-b border-slate-600/10 last:border-0"
                >
                  {/* Contact Name + Avatar + Tag */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 font-semibold text-white text-xs border border-primary/20">
                        {contact.nom.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-white text-xs leading-tight truncate">{contact.nom}</p>
                          {contact.tag === 'client' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] text-green-400 font-semibold bg-green-500/10 border border-green-500/20 whitespace-nowrap flex-shrink-0">
                              CLIENT
                            </span>
                          )}
                          {contact.tag === 'prospect' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 whitespace-nowrap flex-shrink-0">
                              PROSPECT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Phone - Clickable */}
                  <td className="px-4 py-2.5">
                    <a
                      href={`tel:${contact.telephone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 hover:text-blue-400 transition-colors group/phone"
                    >
                      <Phone className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-200 group-hover/phone:text-blue-300 whitespace-nowrap">{contact.telephone}</span>
                    </a>
                  </td>

                  {/* City - with icon */}
                  <td className="px-4 py-2.5">
                    {contact.ville ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-200 whitespace-nowrap">{contact.ville}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>

                  {/* Type de projet */}
                  <td className="px-4 py-2.5">
                    {projectType ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700/30 border border-slate-600/30">
                        {React.createElement(getProjectTypeIcon(projectType), {
                          className: "w-3 h-3 text-slate-400 flex-shrink-0"
                        })}
                        <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
                          {getProjectTypeLabel(projectType)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>

                  {/* Architect - Hidden for Architects */}
                  {!isArchitect && (
                    <td className="px-4 py-2.5">
                      {contact.architecteAssigne ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700/30 border border-slate-600/30">
                          <TrendingUp className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-200 whitespace-nowrap truncate max-w-[120px]">
                            {architectNameMap[contact.architecteAssigne] || contact.architecteAssigne}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {/* Opportunities - Simplified with count + status badges */}
                  <td className="px-4 py-2.5">
                    {opportunities.length > 0 ? (
                      <div className="flex items-center gap-1 flex-nowrap">
                        {/* Total Count */}
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-700/30 border border-slate-600/30">
                          <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                          <span className="text-[10px] font-bold text-white">{opportunities.length}</span>
                        </div>

                        {/* Open (Ouvert) */}
                        {opportunityCounts.open > 0 && (
                          <div className="px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30">
                            <span className="text-[10px] font-semibold text-orange-300 whitespace-nowrap">{opportunityCounts.open} Ouvert</span>
                          </div>
                        )}

                        {/* Won (Gagnée) */}
                        {opportunityCounts.won > 0 && (
                          <div className="px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30">
                            <span className="text-[10px] font-semibold text-green-300 whitespace-nowrap">{opportunityCounts.won} Gagnée</span>
                          </div>
                        )}

                        {/* Lost (Perdue) */}
                        {opportunityCounts.lost > 0 && (
                          <div className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30">
                            <span className="text-[10px] font-semibold text-red-300 whitespace-nowrap">{opportunityCounts.lost} Perdue</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700/20 border border-slate-600/20 text-slate-500 text-[10px]">
                        Aucune
                      </span>
                    )}
                  </td>

                  {/* Last Activity - Human format, smaller font */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(contact.updatedAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Pipeline - Admin only, Color coded */}
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      {pipelineBadge ? (
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border whitespace-nowrap',
                            pipelineBadge.className
                          )}
                        >
                          {pipelineBadge.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>
                  )}

                  {/* Actions - Eye for all, Edit/Delete for Admin */}
                  <td className="px-4 py-2.5">
                    <div className="flex justify-center items-center gap-0.5">
                      {/* View */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowClick(contact.id)
                        }}
                        className="p-1.5 rounded-md hover:bg-blue-500/20 hover:text-blue-400 text-slate-400 transition-colors"
                        title="Voir le contact"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit - Admin only */}
                      {isAdmin && onEditContact && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditContact(contact.id)
                          }}
                          className="p-1.5 rounded-md hover:bg-yellow-500/20 hover:text-yellow-400 text-slate-400 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete - Admin only */}
                      {isAdmin && onDeleteContact && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteContact(contact.id)
                          }}
                          className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors"
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
  )
}
