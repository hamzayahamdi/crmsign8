"use client"

import { motion } from "framer-motion"
import { Building2, MapPin, Calendar, TrendingUp } from "lucide-react"
import { ProgressBadge } from "./progress-badge"
import { Button } from "./ui/button"
import type { Client } from "@/types/client"
import { cn } from "@/lib/utils"

interface DossierCardProps {
  client: Client
  onOpen: (client: Client) => void
  index?: number
}

export function DossierCard({ client, onOpen, index = 0 }: DossierCardProps) {
  const priorityColors = {
    nouveau: "border-blue-500/30",
    acompte_verse: "border-cyan-500/30",
    en_conception: "border-purple-500/30",
    en_chantier: "border-orange-500/30",
    livraison: "border-yellow-500/30",
    termine: "border-green-500/30"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "glass rounded-xl p-5 border hover:border-primary/50 transition-all duration-300 cursor-pointer group",
        priorityColors[client.statutProjet]
      )}
      onClick={() => onOpen(client)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
            {client.nom}
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Building2 className="w-4 h-4" />
            <span className="capitalize">{client.typeProjet}</span>
          </div>
        </div>
        <ProgressBadge status={client.statutProjet} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>{client.ville}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Dernière MAJ: {formatDate(client.derniereMaj)}</span>
        </div>
        {client.budget && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-primary">
              {new Intl.NumberFormat("fr-MA", {
                style: "currency",
                currency: "MAD",
                minimumFractionDigits: 0
              }).format(client.budget)}
            </span>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
        onClick={(e) => {
          e.stopPropagation()
          onOpen(client)
        }}
      >
        Ouvrir dossier
      </Button>
    </motion.div>
  )
}
