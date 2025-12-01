"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { Badge } from "@/components/ui/badge"
import { MapPin, ChevronRight, Building2, DollarSign, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClientsListMobileProps {
  clients: Client[]
  onClientClick: (client: Client) => void
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

const statutConfig: Record<string, { label: string; color: string }> = {
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

export function ClientsListMobile({ clients, onClientClick, onDeleteClient, searchQuery, filters, isLoading = false }: ClientsListMobileProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const passesSearch = (client: Client) => {
    if (!normalizedQuery) return true
    const haystack = [
      client.nomProjet || "",
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
          <div
            key={c.id}
            onClick={() => onClientClick(c)}
            className="w-full text-left glass rounded-xl border border-slate-600/30 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors group relative cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                {/* Project name & Client name */}
                <div>
                  {c.nomProjet ? (
                    <>
                      <p className="font-semibold text-white truncate text-sm">{c.nomProjet}</p>
                      <p className="text-xs text-slate-400 truncate">{c.nom}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-slate-400 truncate text-sm">{c.nom}</p>
                      <p className="text-xs text-slate-500 italic">Pas d'opportunité</p>
                    </>
                  )}
                </div>

                {/* Budget & Status - Most important */}
                <div className="flex items-center gap-3">
                  {c.budget && c.budget > 0 && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-xs font-semibold text-emerald-400">{c.budget.toLocaleString()} DH</span>
                    </div>
                  )}
                  <Badge className={cn("border text-[10px] px-2 py-1 whitespace-nowrap", st.color)}>{st.label}</Badge>
                </div>

                {/* Secondary info */}
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate capitalize">{c.typeProjet}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{c.ville}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                {onDeleteClient && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteClient(c)
                    }}
                    className="p-2 -mr-2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
