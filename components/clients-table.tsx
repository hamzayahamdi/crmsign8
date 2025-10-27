"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { Phone, MapPin, User, Calendar, Eye, ArrowUpDown, ArrowUp, ArrowDown, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion } from "framer-motion"

interface ClientsTableProps {
  clients: Client[]
  onClientClick: (client: Client) => void
  searchQuery: string
  filters: {
    architecte: string
    statut: "all" | ProjectStatus
    ville: string
    typeProjet: string
  }
  isLoading?: boolean
}

const statutConfig: Record<ProjectStatus, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-slate-500/20 text-slate-400 border-slate-500/40" },
  acompte_verse: { label: "Acompte versé", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  en_conception: { label: "En conception", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  en_chantier: { label: "En chantier", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  livraison: { label: "Livraison", color: "bg-teal-500/20 text-teal-400 border-teal-500/40" },
  termine: { label: "Terminé", color: "bg-green-500/20 text-green-400 border-green-500/40" },
}

type SortField = 'nom' | 'ville' | 'typeProjet' | 'architecteAssigne' | 'statutProjet' | 'derniereMaj'
type SortOrder = 'asc' | 'desc'

export function ClientsTable({ clients, onClientClick, searchQuery, filters, isLoading = false }: ClientsTableProps) {
  const [sortField, setSortField] = useState<SortField>('derniereMaj')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const passesSearch = (client: Client) => {
    if (!normalizedQuery) return true
    const haystack = [
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

    // Handle date fields
    if (sortField === 'derniereMaj') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
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
    <div className="glass rounded-2xl border border-slate-600/30 overflow-hidden relative">
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
      <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-600/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Liste des Clients</h3>
            <p className="text-sm text-muted-foreground">
              {sortedClients.length} client{sortedClients.length > 1 ? 's' : ''} trouvé{sortedClients.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[25%]" /> {/* Nom du client */}
            <col className="w-[12%]" /> {/* Téléphone */}
            <col className="w-[12%]" /> {/* Ville */}
            <col className="w-[13%]" /> {/* Type de projet */}
            <col className="w-[13%]" /> {/* Architecte */}
            <col className="w-[12%]" /> {/* Statut */}
            <col className="w-[10%]" /> {/* Dernière MAJ */}
            <col className="w-[8%]" />  {/* Actions */}
          </colgroup>
          <thead className="bg-slate-700/30">
            <tr>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('nom')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Nom du client
                  {getSortIcon('nom')}
                </button>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Téléphone
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
                  onClick={() => handleSort('statutProjet')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Statut
                  {getSortIcon('statutProjet')}
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => handleSort('derniereMaj')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Mis à jour
                  {getSortIcon('derniereMaj')}
                </button>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600/30">
            {sortedClients.map((client, index) => {
              const statutInfo = statutConfig[client.statutProjet]
              return (
                <motion.tr 
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  className="hover:bg-slate-700/20 transition-all duration-200 group cursor-pointer"
                  onClick={() => onClientClick(client)}
                >
                  {/* Nom du client */}
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-premium flex items-center justify-center shadow-lg">
                          <span className="text-sm font-semibold text-white">
                            {client.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{client.nom}</p>
                          {client.payments && client.payments.length > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-xs font-medium text-emerald-400">{client.payments.length}</span>
                            </div>
                          )}
                        </div>
                        {client.email && (
                          <p className="text-xs text-slate-400 truncate">{client.email}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Téléphone */}
                  <td className="px-4 py-5">
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-300">{client.telephone}</span>
                    </div>
                  </td>

                  {/* Ville */}
                  <td className="px-4 py-5">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-200">{client.ville}</span>
                    </div>
                  </td>

                  {/* Type de projet */}
                  <td className="px-4 py-5">
                    <div className="flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-white">{formatProjectType(client.typeProjet)}</span>
                    </div>
                  </td>

                  {/* Architecte */}
                  <td className="px-4 py-5">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-white">{client.architecteAssigne}</span>
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-5">
                    <Badge className={cn("border text-xs font-medium px-2.5 py-1", statutInfo.color)}>
                      {statutInfo.label}
                    </Badge>
                  </td>

                  {/* Dernière MAJ */}
                  <td className="px-4 py-5">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300 whitespace-nowrap">
                        {formatDate(client.derniereMaj)}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClientClick(client)
                        }}
                        className="h-9 w-9 p-0 hover:bg-slate-600/50 transition-all"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
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
