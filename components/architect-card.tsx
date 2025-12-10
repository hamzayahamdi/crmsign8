"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { User, MapPin, Briefcase, FolderOpen, Eye, Settings2, MoreVertical, Check } from "lucide-react"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import type { Architect, ArchitectStatus } from "@/types/architect"
import { cn } from "@/lib/utils"

interface ArchitectCardProps {
  architect: Architect
  onViewDetails: (architect: Architect) => void
  index?: number
  currentUserId?: string
  isArchitect?: boolean
  onStatusUpdate?: (newStatus: ArchitectStatus) => Promise<void>
}

export function ArchitectCard({ 
  architect, 
  onViewDetails, 
  index = 0,
  currentUserId,
  isArchitect = false,
  onStatusUpdate
}: ArchitectCardProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  
  // Check if this is the current user's own profile
  const isOwnProfile = isArchitect && currentUserId === architect.id
  
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
  
  const handleStatusChange = async (newStatus: ArchitectStatus) => {
    if (!onStatusUpdate || isUpdatingStatus) return
    
    try {
      setIsUpdatingStatus(true)
      await onStatusUpdate(newStatus)
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setIsUpdatingStatus(false)
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
      className="glass rounded-xl p-4 border border-slate-600/30 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group cursor-pointer"
    >
      {/* Header with Avatar */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-12 w-12 border-2 border-primary/30 ring-2 ring-primary/10">
          {architect.photo ? (
            <AvatarImage src={architect.photo} alt={`${architect.prenom} ${architect.nom}`} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white font-bold text-sm">
            {getInitials(architect.nom, architect.prenom)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
              {architect.prenom} {architect.nom}
            </h3>
            {/* 3-dot Menu for Status Actions - Only for own profile, positioned in header */}
            {isOwnProfile && (
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={isUpdatingStatus}
                    className={cn(
                      "p-1 rounded-md hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
                      isUpdatingStatus && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-slate-400 hover:text-white transition-colors" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50 min-w-[140px] p-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Changer le statut
                    </div>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("actif")}
                      disabled={isUpdatingStatus || architect.statut === "actif"}
                      className={cn(
                        "text-xs text-white cursor-pointer rounded-md px-2 py-1.5 hover:bg-slate-700/70 focus:bg-slate-700/70 transition-colors",
                        architect.statut === "actif" && "bg-green-500/20 hover:bg-green-500/20"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
                        <span className="flex-1">Actif</span>
                        {architect.statut === "actif" && (
                          <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("inactif")}
                      disabled={isUpdatingStatus || architect.statut === "inactif"}
                      className={cn(
                        "text-xs text-white cursor-pointer rounded-md px-2 py-1.5 hover:bg-slate-700/70 focus:bg-slate-700/70 transition-colors",
                        architect.statut === "inactif" && "bg-slate-500/20 hover:bg-slate-500/20"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                        <span className="flex-1">Inactif</span>
                        {architect.statut === "inactif" && (
                          <Check className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange("conge")}
                      disabled={isUpdatingStatus || architect.statut === "conge"}
                      className={cn(
                        "text-xs text-white cursor-pointer rounded-md px-2 py-1.5 hover:bg-slate-700/70 focus:bg-slate-700/70 transition-colors",
                        architect.statut === "conge" && "bg-orange-500/20 hover:bg-orange-500/20"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span>
                        <span className="flex-1">En congé</span>
                        {architect.statut === "conge" && (
                          <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Role Tag - Architecte */}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              Architecte
            </span>
            {/* Status Badge - Always visible */}
            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
              status.color
            )}>
              <span className="relative flex h-1.5 w-1.5 mr-1">
                <span className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75",
                  architect.statut === "actif" ? "animate-ping bg-green-400" : ""
                )}></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
              </span>
              {status.label}
            </span>
            {architect.isDisponible !== undefined && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border",
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

      {/* Info Grid - Enhanced with better icons and spacing */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 group/item">
          <div className="p-1 rounded bg-slate-700/50 group-hover/item:bg-emerald-500/20 transition-colors">
            <MapPin className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="font-medium">{architect.ville}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-300 group/item">
          <div className="p-1 rounded bg-slate-700/50 group-hover/item:bg-purple-500/20 transition-colors">
            <Briefcase className="w-3 h-3 text-purple-400" />
          </div>
          <span className="font-medium">{specialtyLabels[architect.specialite]}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs group/item">
          <div className="p-1 rounded bg-primary/20 group-hover/item:bg-primary/30 transition-colors">
            <FolderOpen className="w-3 h-3 text-primary" />
          </div>
          <span className="font-bold text-white">
            {architect.totalDossiers || 0} dossier{(architect.totalDossiers || 0) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Stats Pills - Enhanced with better visual hierarchy */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="glass rounded-lg p-2 text-center border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:border-orange-500/50 transition-all"
        >
          <div className="text-lg font-bold text-orange-400 mb-0.5">{architect.dossiersEnCours || 0}</div>
          <div className="text-[9px] font-medium text-slate-300 uppercase tracking-wide">En cours</div>
        </motion.div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="glass rounded-lg p-2 text-center border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5 hover:border-green-500/50 transition-all"
        >
          <div className="text-lg font-bold text-green-400 mb-0.5">{architect.dossiersTermines || 0}</div>
          <div className="text-[9px] font-medium text-slate-300 uppercase tracking-wide">Terminés</div>
        </motion.div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="glass rounded-lg p-2 text-center border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:border-blue-500/50 transition-all"
        >
          <div className="text-lg font-bold text-blue-400 mb-0.5">{architect.dossiersEnAttente || 0}</div>
          <div className="text-[9px] font-medium text-slate-300 uppercase tracking-wide">En attente</div>
        </motion.div>
      </div>

      {/* Action Button */}
      <Button
        onClick={() => onViewDetails(architect)}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all h-8 text-xs"
      >
        <Eye className="w-3.5 h-3.5 mr-1.5" />
        Voir détails
      </Button>
    </motion.div>
  )
}
