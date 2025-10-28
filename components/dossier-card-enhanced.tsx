"use client"

import { motion } from "framer-motion"
import { Building2, MapPin, Calendar, DollarSign, ArrowRight } from "lucide-react"
import { Button } from "./ui/button"
import type { Client, ProjectStatus } from "@/types/client"
import { cn } from "@/lib/utils"

interface DossierCardEnhancedProps {
  client: Client
  onOpen: (client: Client) => void
  index?: number
}

export function DossierCardEnhanced({ client, onOpen, index = 0 }: DossierCardEnhancedProps) {
  const statusConfig: Record<ProjectStatus, { 
    label: string
    color: string
    bgColor: string
    borderColor: string
  }> = {
    prospection: {
      label: "Prospection",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30"
    },
    nouveau: {
      label: "Nouveau",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30"
    },
    acompte_verse: {
      label: "Acompte versé",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/30"
    },
    en_conception: {
      label: "En conception",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30"
    },
    en_validation: {
      label: "En validation",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30"
    },
    en_chantier: {
      label: "En chantier",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30"
    },
    livraison: {
      label: "Livraison",
      color: "text-teal-400",
      bgColor: "bg-teal-500/10",
      borderColor: "border-teal-500/30"
    },
    termine: {
      label: "Terminé",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30"
    },
    annule: {
      label: "Annulé",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30"
    },
    suspendu: {
      label: "Suspendu",
      color: "text-slate-400",
      bgColor: "bg-slate-500/10",
      borderColor: "border-slate-500/30"
    },
  }

  const statusInfo = statusConfig[client.statutProjet] || {
    label: client.statutProjet || "Inconnu",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={() => onOpen(client)}
      className={cn(
        "glass rounded-xl p-4 border cursor-pointer transition-all duration-200 group",
        "hover:border-slate-600/60 hover:shadow-lg",
        statusInfo.borderColor.replace('border-', 'hover:shadow-')
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-1 truncate group-hover:text-primary transition-colors">
            {client.nom}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{client.typeProjet}</span>
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border flex-shrink-0",
          statusInfo.color,
          statusInfo.bgColor,
          statusInfo.borderColor
        )}>
          {statusInfo.label}
        </span>
      </div>

      {/* Info Grid */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span>{client.ville}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span>MAJ: {formatDate(client.derniereMaj)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <DollarSign className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="font-medium">{formatCurrency(client.budget || 0)}</span>
        </div>
      </div>

      {/* Action Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-8 text-xs bg-slate-800/40 hover:bg-primary/20 hover:text-primary border border-slate-700/40 hover:border-primary/40 transition-all group/btn"
        onClick={(e) => {
          e.stopPropagation()
          onOpen(client)
        }}
      >
        <span>Ouvrir dossier</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
      </Button>
    </motion.div>
  )
}
