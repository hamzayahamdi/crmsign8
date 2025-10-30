"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { Badge } from "@/components/ui/badge"
import { Phone, MapPin, Calendar, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

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

const statutConfig: Record<ProjectStatus, { label: string; color: string }> = {
  nouveau: { label: "Nouveau projet", color: "bg-green-500/20 text-green-400 border-green-500/40" },
  acompte_verse: { label: "Acompte versé", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  en_conception: { label: "En conception", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  en_validation: { label: "En validation", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  en_chantier: { label: "En réalisation", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  livraison: { label: "Livraison", color: "bg-teal-500/20 text-teal-400 border-teal-500/40" },
  termine: { label: "Terminé", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  annule: { label: "Annulé", color: "bg-red-500/20 text-red-400 border-red-500/40" },
  suspendu: { label: "Suspendu", color: "bg-slate-500/20 text-slate-400 border-slate-500/40" },
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
      client.architecteAssigne || "",
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(normalizedQuery)
  }

  const passesFilters = (client: Client) => {
    if (filters.statut !== "all" && client.statutProjet !== filters.statut) return false
    if (filters.ville !== "all" && client.ville !== filters.ville) return false
    if (filters.typeProjet !== "all" && client.typeProjet !== filters.typeProjet) return false
    if (filters.architecte !== "all" && (client.architecteAssigne || "") !== filters.architecte) return false
    return true
  }

  const items = clients.filter((c) => passesSearch(c) && passesFilters(c))

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    } catch {
      return "—"
    }
  }

  if (isLoading && clients.length === 0) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-xl border border-slate-600/30 p-4 animate-pulse">
            <div className="h-4 w-40 bg-slate-700/50 rounded mb-2" />
            <div className="h-3 w-28 bg-slate-700/30 rounded mb-3" />
            <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">Aucun client trouvé</div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {items.map((c) => {
        const st = statutConfig[c.statutProjet] || { label: c.statutProjet, color: "bg-gray-500/20 text-gray-400 border-gray-500/40" }
        return (
          <button
            key={c.id}
            onClick={() => onClientClick(c)}
            className="w-full text-left glass rounded-xl border border-slate-600/30 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">{c.nom}</p>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{c.telephone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{c.ville}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{formatDate(c.createdAt)}</span>
                  </div>
                  {c.architecteAssigne && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full bg-primary/60 flex-shrink-0" />
                      <span className="truncate">{c.architecteAssigne}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={cn("border text-[10px] px-2 py-1", st.color)}>{st.label}</Badge>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
