"use client"

import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/types/client"

interface ProgressBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProgressBadge({ status, className }: ProgressBadgeProps) {
  const statusConfig = {
    nouveau: {
      label: "Nouveau",
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      gradient: "from-blue-500/20 to-blue-600/20"
    },
    acompte_verse: {
      label: "Acompte versé",
      color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      gradient: "from-cyan-500/20 to-cyan-600/20"
    },
    en_conception: {
      label: "En conception",
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      gradient: "from-purple-500/20 to-purple-600/20"
    },
    en_chantier: {
      label: "En chantier",
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      gradient: "from-orange-500/20 to-orange-600/20"
    },
    livraison: {
      label: "Livraison",
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      gradient: "from-yellow-500/20 to-yellow-600/20"
    },
    termine: {
      label: "Terminé",
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      gradient: "from-green-500/20 to-green-600/20"
    }
  }

  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
        config.color,
        className
      )}
    >
      <span className="relative flex h-2 w-2 mr-2">
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          status === "en_chantier" || status === "en_conception" ? "bg-current" : "opacity-0"
        )}></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
      </span>
      {config.label}
    </span>
  )
}
