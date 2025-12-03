"use client"

import { useState } from "react"
import { Lead, LeadStatus } from "@/types/lead"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, MapPin, Home, Building2, Calendar, Eye } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CommercialLeadsTableProps {
  leads: Lead[]
  onViewLead: (lead: Lead) => void
}

const getStatusConfig = (status: LeadStatus) => {
  const configs: Record<LeadStatus, { label: string; bg: string; dot: string; ring: string; text: string; border: string }> = {
    nouveau: {
      label: "Nouveau",
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
    converti: {
      label: "Converti",
      bg: "bg-blue-500/20",
      dot: "bg-blue-400",
      ring: "ring-blue-500/30",
      text: "text-blue-200",
      border: "border-blue-500/40",
    },
    qualifie: {
      label: "Qualifié",
      bg: "bg-teal-500/20",
      dot: "bg-teal-400",
      ring: "ring-teal-500/30",
      text: "text-teal-200",
      border: "border-teal-500/40",
    },
    refuse: {
      label: "Refusé",
      bg: "bg-red-500/20",
      dot: "bg-red-400",
      ring: "ring-red-500/30",
      text: "text-red-200",
      border: "border-red-500/40",
    },
  }
  return configs[status]
}

export function CommercialLeadsTable({ leads, onViewLead }: CommercialLeadsTableProps) {
  const sortedLeads = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-28 h-28 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-blue-500/30">
          <Building2 className="h-14 w-14 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Aucun lead pour le moment
        </h3>
        <p className="text-slate-300 text-center max-w-md">
          Commencez à ajouter des leads en cliquant sur le bouton "+ Nouveau Lead"
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                Téléphone
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                Ville
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                Type de bien
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                Magasin / Commercial
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>          <tbody className="divide-y divide-white/10 bg-slate-800/30 backdrop-blur-sm">
            {sortedLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-700/30 transition-colors duration-150">
                <td className="px-6 py-4">
                  <div className="font-semibold text-white text-base">{lead.nom}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Phone className="h-4 w-4 text-blue-400" />
                    <span className="text-base font-medium">{lead.telephone}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span className="text-base font-medium">{lead.ville}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Home className="h-4 w-4 text-purple-400" />
                    <span className="text-base font-medium">{lead.typeBien}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-indigo-400" />
                      <span className="text-base font-medium">{lead.magasin || "—"}</span>
                    </div>
                    {lead.commercialMagasin && (
                      <div className="pl-6">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] bg-slate-900/40 border border-slate-600/50 text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="opacity-80">Commercial:</span>
                          <span className="font-medium truncate max-w-[160px]">{lead.commercialMagasin}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const st = getStatusConfig(lead.statut)
                    return (
                      <Badge
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-sm font-medium",
                          st.bg,
                          st.text,
                          st.border,
                          "ring-1",
                          st.ring
                        )}
                      >
                        <span className={cn("w-2.5 h-2.5 rounded-full", st.dot)} />
                        {st.label}
                      </Badge>
                    )
                  })()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-base">{format(new Date(lead.createdAt), "dd MMM yyyy", { locale: fr })}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewLead(lead)}
                    className="bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/40 text-blue-300 hover:text-blue-200 hover:border-blue-400/60 transition-colors duration-150 font-semibold px-4 py-2"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Voir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {sortedLeads.map((lead) => (
          <Card key={lead.id} className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 border border-white/10 overflow-hidden backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg mb-2">{lead.nom}</h3>
                  {(() => {
                    const st = getStatusConfig(lead.statut)
                    return (
                      <Badge
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-sm font-medium",
                          st.bg,
                          st.text,
                          st.border,
                          "ring-1",
                          st.ring
                        )}
                      >
                        <span className={cn("w-2.5 h-2.5 rounded-full", st.dot)} />
                        {st.label}
                      </Badge>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-3.5 mb-5">
                <div className="flex items-center gap-3 text-slate-200">
                  <Phone className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="text-base font-medium">{lead.telephone}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-200">
                  <MapPin className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-base font-medium">{lead.ville}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-200">
                  <Home className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className="text-base font-medium">{lead.typeBien}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-slate-200">
                    <Building2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-base font-medium">{lead.magasin || "—"}</span>
                  </div>
                  {lead.commercialMagasin && (
                    <div className="pl-7">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] bg-slate-900/40 border border-slate-600/50 text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="opacity-80">Commercial:</span>
                        <span className="font-medium truncate max-w-[160px]">{lead.commercialMagasin}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-slate-200">
                  <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="font-medium text-base">{format(new Date(lead.createdAt), "dd MMMM yyyy", { locale: fr })}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/40 text-blue-300 hover:text-blue-200 hover:border-blue-400/60 transition-colors duration-150 font-semibold h-11"
                onClick={() => onViewLead(lead)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir / Modifier
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
