"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { Phone, MapPin, User, Calendar, Building2, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface ClientsListMobileProps {
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

const statutConfig = {
  en_conception: { label: "En conception", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  en_travaux: { label: "En travaux", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  termine: { label: "Terminé", color: "bg-green-500/20 text-green-400 border-green-500/40" },
}

export function ClientsListMobile({ clients, onClientClick, searchQuery, filters, isLoading = false }: ClientsListMobileProps) {
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

  const filteredClients = clients
    .filter(client => passesSearch(client) && passesFilters(client))
    .sort((a, b) => new Date(b.derniereMaj).getTime() - new Date(a.derniereMaj).getTime())

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
    <div className="glass rounded-2xl border border-slate-600/30 overflow-hidden">
      {/* Loading overlay */}
      {isLoading && filteredClients.length > 0 && (
        <div className="bg-slate-900/30 backdrop-blur-[1px] border-b border-blue-500/30">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
            <span className="text-xs text-blue-400 font-medium">Actualisation...</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-600/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Liste des Clients</h3>
            <p className="text-xs text-muted-foreground">
              {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Client Cards */}
      <div className="divide-y divide-slate-600/30">
        {filteredClients.length > 0 ? (
          filteredClients.map((client, index) => {
            const statutInfo = statutConfig[client.statutProjet]
            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                onClick={() => onClientClick(client)}
                className="p-4 hover:bg-slate-700/20 active:bg-slate-700/30 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-premium flex items-center justify-center shadow-lg">
                      <span className="text-sm font-semibold text-white">
                        {client.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name and Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{client.nom}</h4>
                        {client.email && (
                          <p className="text-xs text-slate-400 truncate">{client.email}</p>
                        )}
                      </div>
                      <Badge className={cn("border text-xs font-medium px-2 py-0.5 shrink-0", statutInfo.color)}>
                        {statutInfo.label}
                      </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-300 truncate">{client.telephone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-300 truncate">{client.ville}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-300 truncate">{formatProjectType(client.typeProjet)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-300 truncate">{client.architecteAssigne}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-400">{formatDate(client.derniereMaj)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        ) : (
          <div className="text-center py-12 px-4">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-700"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-white font-medium">Chargement...</p>
                <p className="text-sm text-muted-foreground">Veuillez patienter</p>
              </div>
            ) : (
              <div>
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Aucun client</p>
                <p className="text-sm text-muted-foreground">
                  Essayez de modifier vos filtres
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
