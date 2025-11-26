"use client"

import { motion } from "framer-motion"
import { User, MapPin, Briefcase, FolderOpen, Eye } from "lucide-react"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import type { Architect } from "@/types/architect"
import { cn } from "@/lib/utils"

interface ArchitectCardProps {
  architect: Architect
  onViewDetails: (architect: Architect) => void
  index?: number
}

export function ArchitectCard({ architect, onViewDetails, index = 0 }: ArchitectCardProps) {
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

  const status = statusConfig[architect.statut]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-2xl p-6 border border-slate-600/30 hover:border-primary/50 transition-all duration-300 group"
    >
      {/* Header with Avatar */}
      <div className="flex items-start gap-4 mb-5">
        <Avatar className="h-16 w-16 border-2 border-primary/30 ring-4 ring-primary/10">
          {architect.photo ? (
            <AvatarImage src={architect.photo} alt={`${architect.prenom} ${architect.nom}`} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white font-bold text-lg">
            {getInitials(architect.nom, architect.prenom)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-primary transition-colors">
            {architect.prenom} {architect.nom}
          </h3>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
              status.color
            )}>
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75",
                  architect.statut === "actif" ? "animate-ping bg-green-400" : ""
                )}></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
              </span>
              {status.label}
            </span>
            {architect.isDisponible !== undefined && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                architect.isDisponible 
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-orange-500/20 text-orange-400 border-orange-500/30"
              )}>
                {architect.isDisponible ? "Disponible" : "Occupé"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>{architect.ville}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Briefcase className="w-4 h-4 text-slate-400" />
          <span>{specialtyLabels[architect.specialite]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4 text-primary" />
          <span className="font-semibold text-white">
            {architect.totalDossiers || 0} dossier{(architect.totalDossiers || 0) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Stats Pills */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass rounded-lg p-2 text-center border border-slate-600/20">
          <div className="text-lg font-bold text-orange-400">{architect.dossiersEnCours || 0}</div>
          <div className="text-[10px] text-slate-400">En cours</div>
        </div>
        <div className="glass rounded-lg p-2 text-center border border-slate-600/20">
          <div className="text-lg font-bold text-green-400">{architect.dossiersTermines || 0}</div>
          <div className="text-[10px] text-slate-400">Terminés</div>
        </div>
        <div className="glass rounded-lg p-2 text-center border border-slate-600/20">
          <div className="text-lg font-bold text-blue-400">{architect.dossiersEnAttente || 0}</div>
          <div className="text-[10px] text-slate-400">En attente</div>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={() => onViewDetails(architect)}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all"
      >
        <Eye className="w-4 h-4 mr-2" />
        Voir détails
      </Button>
    </motion.div>
  )
}
