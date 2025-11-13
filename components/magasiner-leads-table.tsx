"use client"

import { Lead, LeadStatus } from "@/types/lead"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, MapPin, Home, Building2, Calendar, User, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface MagasinerLeadsTableProps {
  leads: Lead[]
  onEdit?: (lead: Lead) => void
  onDelete?: (lead: Lead) => void
}

const getStatusConfig = (status: LeadStatus) => {
  const configs: Record<LeadStatus, { label: string; bg: string; dot: string; ring: string; text: string; border: string }> = {
    nouveau: {
      label: "🟢 Nouveau",
      bg: "bg-emerald-500/20",
      dot: "bg-emerald-400",
      ring: "ring-emerald-500/30",
      text: "text-emerald-200",
      border: "border-emerald-500/40",
    },
    a_recontacter: {
      label: "À recontacter",
      bg: "bg-amber-500/20",
      dot: "bg-amber-400",
      ring: "ring-amber-500/30",
      text: "text-amber-200",
      border: "border-amber-500/40",
    },
    sans_reponse: {
      label: "Sans réponse",
      bg: "bg-orange-500/25",
      dot: "bg-orange-400",
      ring: "ring-orange-500/30",
      text: "text-orange-200",
      border: "border-orange-500/40",
    },
    non_interesse: {
      label: "Non intéressé",
      bg: "bg-rose-500/25",
      dot: "bg-rose-400",
      ring: "ring-rose-500/30",
      text: "text-rose-200",
      border: "border-rose-500/40",
    },
    qualifie: {
      label: "Qualifié",
      bg: "bg-blue-500/20",
      dot: "bg-blue-400",
      ring: "ring-blue-500/30",
      text: "text-blue-200",
      border: "border-blue-500/40",
    },
    refuse: {
      label: "Refusé",
      bg: "bg-gray-500/20",
      dot: "bg-gray-400",
      ring: "ring-gray-500/30",
      text: "text-gray-200",
      border: "border-gray-500/40",
    },
  }
  return configs[status]
}

export function MagasinerLeadsTable({ leads, onEdit, onDelete }: MagasinerLeadsTableProps) {
  const sortedLeads = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (leads.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-20 px-4"
      >
        <div className="w-28 h-28 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-blue-500/30">
          <Building2 className="h-14 w-14 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Aucun lead pour le moment
        </h3>
        <p className="text-slate-300 text-center max-w-md">
          Commencez à ajouter des leads en cliquant sur le bouton "+ Nouveau Lead"
        </p>
      </motion.div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-2xl border border-white/10">
        <table className="w-full table-auto">
          <thead className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 border-b border-white/10 text-xs">
            <tr>
              <th className="px-5 py-3 text-left font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                Nom client
              </th>
              <th className="px-5 py-3 text-left font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                Téléphone
              </th>
              <th className="px-5 py-3 text-left font-bold text-slate-300 uppercase tracking-wider">
                Ville
              </th>
              <th className="px-5 py-3 text-left font-bold text-slate-300 uppercase tracking-wider">
                Type de bien
              </th>
              <th className="px-5 py-3 text-left font-bold text-slate-300 uppercase tracking-wider">
                Commercial
              </th>
              <th className="px-5 py-3 text-left font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                Date
              </th>
              <th className="px-5 py-3 text-left font-bold text-slate-300 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-5 py-3 text-right font-bold text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-800/30 backdrop-blur-sm text-sm">
            {sortedLeads.map((lead, index) => (
              <motion.tr
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="hover:bg-slate-700/30 transition-colors duration-150"
              >
                <td className="px-5 py-3 align-top">
                  <div className="font-semibold text-white break-words">{lead.nom}</div>
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-2.5 text-slate-200 break-words">
                    <Phone className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">{lead.telephone}</span>
                  </div>
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-2.5 text-slate-200 break-words">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium">{lead.ville}</span>
                  </div>
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-2.5 text-slate-200 break-words">
                    <Home className="h-4 w-4 text-purple-400" />
                    <span className="font-medium">{lead.typeBien}</span>
                  </div>
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-2.5 text-slate-200 break-words">
                    <User className="h-4 w-4 text-indigo-400" />
                    <span className="font-medium">{lead.commercialMagasin || "—"}</span>
                  </div>
                </td>
                <td className="px-5 py-3 align-top whitespace-nowrap">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">{format(new Date(lead.createdAt), "dd MMM yyyy", { locale: fr })}</span>
                  </div>
                </td>
                <td className="px-5 py-3 align-top">
                  {(() => {
                    const st = getStatusConfig(lead.statut)
                    return (
                      <Badge
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-2.5 py-1 border text-xs font-medium",
                          st.bg,
                          st.text,
                          st.border,
                          "ring-1",
                          st.ring
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full", st.dot)} />
                        {st.label}
                      </Badge>
                    )
                  })()}
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                      aria-label="Modifier"
                      onClick={() => onEdit?.(lead)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4 text-blue-300" />
                    </button>
                    <button
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-300 border border-red-500/30 transition"
                      aria-label="Supprimer"
                      onClick={() => onDelete?.(lead)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {sortedLeads.map((lead, index) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border border-white/10 overflow-hidden backdrop-blur-xl hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base mb-1">{lead.nom}</h3>
                    {(() => {
                      const st = getStatusConfig(lead.statut)
                      return (
                        <Badge
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 border text-xs font-medium",
                            st.bg,
                            st.text,
                            st.border,
                            "ring-1",
                            st.ring
                          )}
                        >
                          <span className={cn("w-2 h-2 rounded-full", st.dot)} />
                          {st.label}
                        </Badge>
                      )
                    })()}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Phone className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm font-medium">{lead.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <MapPin className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm font-medium">{lead.ville}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Home className="h-4 w-4 text-purple-400 flex-shrink-0" />
                    <span className="text-sm font-medium">{lead.typeBien}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <User className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm font-medium">{lead.commercialMagasin || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-sm">{format(new Date(lead.createdAt), "dd MMM yyyy", { locale: fr })}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1.5">
                    <button
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-slate-200 border border-white/10"
                      onClick={() => onEdit?.(lead)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-blue-300" />
                      <span className="text-xs">Modifier</span>
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-300 border border-red-500/30"
                      onClick={() => onDelete?.(lead)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-xs">Supprimer</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </>
  )
}
