"use client"

import { useState } from "react"
import { Lead } from "@/types/lead"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, MapPin, Home, Building2, Calendar, Eye } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface CommercialLeadsTableProps {
  leads: Lead[]
  onViewLead: (lead: Lead) => void
}

export function CommercialLeadsTable({ leads, onViewLead }: CommercialLeadsTableProps) {
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
                Magasin
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
            {leads.map((lead) => (
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
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Building2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-base font-medium">{lead.magasin || "—"}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm px-3 py-1.5">
                    🟢 Nouveau
                  </Badge>
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
        {leads.map((lead) => (
          <Card key={lead.id} className="bg-gradient-to-br from-slate-800/90 to-slate-700/90 border border-white/10 overflow-hidden backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg mb-2">{lead.nom}</h3>
                  <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm px-3 py-1.5">
                    🟢 Nouveau
                  </Badge>
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
                <div className="flex items-center gap-3 text-slate-200">
                  <Building2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-base font-medium">{lead.magasin || "—"}</span>
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
