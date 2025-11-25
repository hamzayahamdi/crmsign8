"use client"

import React from 'react'
import { Contact } from '@/types/contact'
import { Opportunity } from '@/types/contact'
import {
  Phone,
  MapPin,
  ChevronRight,
  Calendar,
  Briefcase,
  TrendingUp,
  Trophy,
  Flame,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ContactsTableProps {
  contacts: (Contact & { opportunities?: Opportunity[] })[]
  onRowClick: (contactId: string) => void
  isLoading?: boolean
}

/**
 * Professional CRM-style Contacts Table - REDESIGNED
 * Clean, intuitive, focused on opportunities and workflow status
 * Removed unnecessary "Client" status badge for better readability
 */
export function ContactsTable({ contacts, onRowClick, isLoading = false }: ContactsTableProps) {
  // Status badge configuration - NO MORE "Client" status display
  const getStatusBadge = (contact: Contact) => {
    // If contact is marked as perdu, show that
    if (contact.status === 'perdu') {
      return { label: 'Perdu', className: 'bg-red-500/20 text-red-300 border-red-500/50', show: true }
    }

    // Workflow statuses - only show non-client statuses
    const map: Record<string, { label: string, className: string, show: boolean }> = {
      'qualifie': { label: 'Qualifié', className: 'bg-blue-500/20 text-blue-300 border-blue-500/50', show: true },
      'prise_de_besoin': { label: 'Prise de besoin', className: 'bg-purple-500/20 text-purple-300 border-purple-500/50', show: true },
      'acompte_recu': { label: 'Acompte Reçu', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50', show: true }
    }

    // If contact is a client (tag === 'client'), don't show status badge
    if (contact.tag === 'client') {
      return { label: '', className: '', show: false }
    }

    return map[contact.status] || { label: '', className: '', show: false }
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
            <tr className="border-b border-slate-600/30 bg-slate-800/60">
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Contact</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Téléphone</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ville</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Opportunités</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Dernière activité</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Architecte</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Statut</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-300"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-600/20 animate-pulse">
                <td className="px-6 py-4">
                  <div className="h-4 w-40 bg-slate-700/50 rounded" />
                </td>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-4 w-20 bg-slate-700/30 rounded" />
                  </td>
                ))}
                <td className="px-6 py-4">
                  <div className="h-4 w-8 bg-slate-700/30 rounded mx-auto" />
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
        <p className="text-slate-300 text-lg font-medium">Aucun contact</p>
        <p className="text-sm text-slate-500 mt-1">Les contacts proviennent de la conversion des leads</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl border border-slate-600/30 overflow-hidden shadow-[0_18px_48px_-28px_rgba(59,130,246,0.25)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-600/30 bg-slate-800/60">
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Contact</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Téléphone</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Ville</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Opportunités</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Dernière activité</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Architecte</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Statut</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-slate-300"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600/20">
            {contacts.map((contact, index) => {
              const opportunities = contact.opportunities || []
              const opportunityCounts = {
                open: opportunities.filter((o) => o.statut === 'open').length,
                won: opportunities.filter((o) => o.statut === 'won').length,
                lost: opportunities.filter((o) => o.statut === 'lost').length,
                onHold: opportunities.filter((o) => o.statut === 'on_hold').length,
              }

              return (
                <motion.tr
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="group hover:bg-slate-700/40 transition-all duration-200 cursor-pointer border-b border-slate-600/10 last:border-0"
                  onClick={() => onRowClick(contact.id)}
                >
                  {/* Contact Name */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-white text-base border border-primary/20 shadow-sm">
                        {contact.nom.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate text-sm leading-snug">{contact.nom}</p>
                        {contact.email && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{contact.email}</p>
                        )}
                        {contact.tag === 'client' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-400 font-medium">
                            <Trophy className="w-3 h-3" />
                            Client
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-200">{contact.telephone}</span>
                    </div>
                  </td>

                  {/* City */}
                  <td className="px-6 py-5">
                    {contact.ville ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-200">{contact.ville}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </td>

                  {/* Opportunities - REDESIGNED FOR CLARITY */}
                  <td className="px-6 py-5">
                    {opportunities.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Total with icon */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700/50 border border-slate-600/50">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-sm font-bold text-white">{opportunities.length}</span>
                        </div>

                        {/* Open Counter - Prominent */}
                        {opportunityCounts.open > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/20 border border-orange-500/40">
                            <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-orange-200">Ouvert:</span>
                            <span className="text-sm font-bold text-orange-100">{opportunityCounts.open}</span>
                          </div>
                        )}

                        {/* Won Counter - Success */}
                        {opportunityCounts.won > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/20 border border-green-500/40">
                            <Trophy className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-green-200">Gagnée:</span>
                            <span className="text-sm font-bold text-green-100">{opportunityCounts.won}</span>
                          </div>
                        )}

                        {/* Lost/On Hold - Subtle */}
                        {opportunityCounts.open === 0 && opportunityCounts.won === 0 && (opportunityCounts.lost > 0 || opportunityCounts.onHold > 0) && (
                          <div className="flex items-center gap-1 text-slate-500 text-xs">
                            {opportunityCounts.lost > 0 && <span>{opportunityCounts.lost} perdue{opportunityCounts.lost > 1 ? 's' : ''}</span>}
                            {opportunityCounts.onHold > 0 && <span>• {opportunityCounts.onHold} suspendue{opportunityCounts.onHold > 1 ? 's' : ''}</span>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Target className="w-4 h-4 opacity-40" />
                        <span className="text-xs">Aucune</span>
                      </div>
                    )}
                  </td>

                  {/* Last Activity */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-sm text-slate-300">
                        {formatDistanceToNow(new Date(contact.updatedAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Architect */}
                  <td className="px-6 py-5">
                    {contact.architecteAssigne ? (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/40">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-200">
                          {architectNameMap[contact.architecteAssigne] || contact.architecteAssigne}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </td>

                  {/* Contact Status - Clean & Minimal */}
                  <td className="px-6 py-5">
                    {(() => {
                      const badge = getStatusBadge(contact)
                      
                      // Don't show badge if it shouldn't be displayed (e.g., client status)
                      if (!badge.show) {
                        return <span className="text-slate-500 text-sm">—</span>
                      }
                      
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border',
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      )
                    })()}
                  </td>

                  {/* View Button */}
                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center">
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
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
