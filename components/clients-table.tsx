"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { MapPin, User, Eye, ArrowUpDown, ArrowUp, ArrowDown, Building2, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion } from "framer-motion"
import { getStatusConfig } from "@/lib/status-config"

interface ClientsTableProps {
  clients: Client[]
  onClientClick: (client: Client) => void
  onEditClient?: (client: Client) => void
  onDeleteClient?: (client: Client) => void
  searchQuery: string
  filters: {
    architecte: string
    statut: "all" | ProjectStatus
    ville: string
    typeProjet: string
  }
  isLoading?: boolean
}

// Use centralized status config for unified colors/labels

type SortField = 'nomProjet' | 'nom' | 'ville' | 'typeProjet' | 'architecteAssigne' | 'statutProjet' | 'budget' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export function ClientsTable({ clients, onClientClick, onEditClient, onDeleteClient, searchQuery, filters, isLoading = false }: ClientsTableProps) {
  // Default sort: most recently converted/created clients first
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const passesSearch = (client: Client) => {
    if (!normalizedQuery) return true
    const haystack = [
      client.nomProjet ?? "",
      client.nom,
      client.telephone,
      client.ville,
      client.typeProjet,
      client.architecteAssigne,
      client.email ?? "",
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  }

  const passesFilters = (client: Client) => {
    if (filters.statut !== "all" && client.statutProjet !== filters.statut) return false
    if (filters.ville !== "all" && client.ville !== filters.ville) return false
    if (filters.typeProjet !== "all" && client.typeProjet !== filters.typeProjet) return false
    if (filters.architecte !== "all" && client.architecteAssigne !== filters.architecte) return false
    return true
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
    }
    return sortOrder === 'asc' ?
      <ArrowUp className="w-3.5 h-3.5 text-primary" /> :
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
  }

  const filteredClients = clients.filter(client => passesSearch(client) && passesFilters(client))

  // Sort clients
  const sortedClients = [...filteredClients].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    // Handle date fields (createdAt, updatedAt, derniereMaj)
    if (sortField === 'createdAt') {
      aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
      bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
      // Most recent first (desc) by default
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    }

    // Handle budget (number field with potential null/undefined)
    if (sortField === 'budget') {
      aValue = a.budget ?? 0
      bValue = b.budget ?? 0
    }

    // Handle nomProjet (may be undefined, fall back to nom)
    if (sortField === 'nomProjet') {
      aValue = (a.nomProjet || a.nom || '').toLowerCase()
      bValue = (b.nomProjet || b.nom || '').toLowerCase()
    }

    // Handle string fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffTime = today.getTime() - compareDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays > 0 && diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 0 && diffDays > -2) return "Aujourd'hui"

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatProjectType = (type: string) => {
    const types: Record<string, string> = {
      appartement: "Appartement",
      villa: "Villa",
      magasin: "Magasin",
      bureau: "Bureau",
      riad: "Riad",
      studio: "Studio",
      autre: "Autre"
    }
    return types[type] || type
  }

  return (
    <div className="glass rounded-lg border border-slate-600/30 overflow-hidden relative">
      {/* Loading overlay */}
      {isLoading && sortedClients.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/30 backdrop-blur-[1px] border-b border-blue-500/30">
          <div className="flex items-center gap-2 px-6 py-2">
            <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
            <span className="text-xs text-blue-400 font-medium">Actualisation...</span>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="bg-slate-800/30 px-6 py-4 border-b border-slate-200/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Liste des Clients</h3>
            <p className="text-sm text-muted-foreground">
              {sortedClients.length} client{sortedClients.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-slate-800/20 border-b border-slate-200/10">
            <tr>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('nomProjet')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Nom de projet
                  {getSortIcon('nomProjet')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('budget')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Montant
                  {getSortIcon('budget')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('statutProjet')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Statut
                  {getSortIcon('statutProjet')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('typeProjet')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Type de projet
                  {getSortIcon('typeProjet')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('architecteAssigne')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Architecte
                  {getSortIcon('architecteAssigne')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('ville')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Ville
                  {getSortIcon('ville')}
                </button>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600/30">
            {sortedClients.map((client, index) => {
              const sc = getStatusConfig(client.statutProjet)
              const statutInfo = {
                label: sc.label,
                color: `${sc.bgColor} ${sc.textColor} ${sc.borderColor}`
              }
              return (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  className="hover:bg-slate-700/20 transition-all duration-200 group cursor-pointer"
                  onClick={() => onClientClick(client)}
                >
                  {/* Nom de projet (Opportunity Title) */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      {client.nomProjet ? (
                        <>
                          <p className="text-sm font-semibold text-white truncate">
                            {client.nomProjet}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{client.nom}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-400 truncate">
                            {client.nom}
                          </p>
                          <p className="text-xs text-slate-500 italic">Pas d'opportunité</p>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Montant/Budget */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-emerald-400">
                      {client.budget ? `${client.budget.toLocaleString()} DH` : '-'}
                    </span>
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-4">
                    <Badge className={cn("border text-xs font-medium px-2.5 py-1", statutInfo.color)}>
                      {statutInfo.label}
                    </Badge>
                  </td>

                  {/* Type de projet */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-300">{formatProjectType(client.typeProjet)}</span>
                    </div>
                  </td>

                  {/* Architecte */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-300">{client.architecteAssigne}</span>
                    </div>
                  </td>

                  {/* Ville */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-300">{client.ville}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClientClick(client)
                        }}
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {onEditClient && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-orange-500/20 hover:text-orange-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditClient(client)
                          }}
                          title="Modifier le client"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {onDeleteClient && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteClient(client)
                          }}
                          title="Supprimer le client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>

        {sortedClients.length === 0 && (
          <div className="text-center py-16">
            {isLoading ? (
              <div className="glass rounded-lg p-8 max-w-md mx-auto">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-700"></div>
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  <p className="text-white font-medium">Chargement des clients...</p>
                  <p className="text-sm text-muted-foreground">Veuillez patienter</p>
                </div>
              </div>
            ) : (
              <div className="glass rounded-lg p-8 max-w-md mx-auto">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-white font-semibold text-lg mb-2">Aucun client pour le moment</p>
                <p className="text-sm text-muted-foreground">
                  Essayez de modifier vos filtres ou votre recherche
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
