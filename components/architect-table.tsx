"use client"

import { motion } from "framer-motion"
import { Eye, Mail, Phone } from "lucide-react"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import type { Architect } from "@/types/architect"
import { cn } from "@/lib/utils"

interface ArchitectTableProps {
  architects: Architect[]
  onViewDetails: (architect: Architect) => void
}

export function ArchitectTable({ architects, onViewDetails }: ArchitectTableProps) {
  const statusConfig = {
    actif: {
      label: "Actif",
      color: "bg-green-500/20 text-green-400 border-green-500/30"
    },
    inactif: {
      label: "Inactif",
      color: "bg-slate-500/20 text-slate-400 border-slate-500/30"
    },
    conge: {
      label: "En congé",
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30"
    }
  }

  const specialtyLabels = {
    residentiel: "Résidentiel",
    commercial: "Commercial",
    industriel: "Industriel",
    renovation: "Rénovation",
    luxe: "Luxe",
    mixte: "Mixte"
  }

  const getInitials = (nom: string, prenom: string) => {
    return `${prenom[0]}${nom[0]}`.toUpperCase()
  }

  return (
    <div className="glass rounded-2xl border border-slate-600/30 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-600/30 bg-slate-800/60">
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Architecte</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Contact</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Ville</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Spécialité</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-300">Dossiers</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-300">Statut</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {architects.map((architect, index) => (
              <motion.tr
                key={architect.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="border-b border-slate-600/20 hover:bg-slate-700/30 transition-colors cursor-pointer"
                onClick={() => onViewDetails(architect)}
              >
                {/* Architect Info */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/30">
                      {architect.photo ? (
                        <AvatarImage src={architect.photo} alt={`${architect.prenom} ${architect.nom}`} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white font-bold text-sm">
                        {getInitials(architect.nom, architect.prenom)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-white">
                        {architect.prenom} {architect.nom}
                      </div>
                      <div className="text-xs text-slate-400">{architect.email}</div>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{architect.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]">{architect.email}</span>
                    </div>
                  </div>
                </td>

                {/* Ville */}
                <td className="p-4">
                  <span className="text-sm text-slate-300">{architect.ville}</span>
                </td>

                {/* Spécialité */}
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                    {specialtyLabels[architect.specialite]}
                  </span>
                </td>

                {/* Dossiers Count */}
                <td className="p-4 text-center">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-2xl font-bold text-white">{architect.totalDossiers || 0}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-orange-400">{architect.dossiersEnCours || 0} actifs</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-green-400">{architect.dossiersTermines || 0} terminés</span>
                    </div>
                  </div>
                </td>

                {/* Statut */}
                <td className="p-4 text-center">
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
                    statusConfig[architect.statut].color
                  )}>
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className={cn(
                        "absolute inline-flex h-full w-full rounded-full opacity-75",
                        architect.statut === "actif" ? "animate-ping bg-green-400" : ""
                      )}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                    </span>
                    {statusConfig[architect.statut].label}
                  </span>
                </td>

                {/* Actions */}
                <td className="p-4 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewDetails(architect)
                    }}
                    className="hover:bg-primary hover:text-white hover:border-primary transition-all"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Détails
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {architects.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-slate-400">Aucun architecte trouvé</p>
        </div>
      )}
    </div>
  )
}
