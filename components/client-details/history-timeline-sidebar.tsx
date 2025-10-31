"use client"

import { Clock, MessageSquare, Phone, FileText, CheckCircle, DollarSign } from "lucide-react"
import type { Client, ClientHistoryEntry } from "@/types/client"
import { motion } from "framer-motion"

interface HistoryTimelineSidebarProps {
  client: Client
}

export function HistoryTimelineSidebar({ client }: HistoryTimelineSidebarProps) {
  const allHistory = [...(client.historique || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15) // Show last 15 activities

  const getIcon = (type: ClientHistoryEntry['type']) => {
    const iconMap = {
      note: MessageSquare,
      appel: Phone,
      whatsapp: MessageSquare,
      modification: FileText,
      statut: CheckCircle,
      document: FileText,
      "rendez-vous": Clock,
      devis: FileText,
      validation: CheckCircle,
      acompte: DollarSign,
      tache: CheckCircle,
      projet: FileText,
    }
    return iconMap[type] || MessageSquare
  }

  const getIconColor = (type: ClientHistoryEntry['type']) => {
    const colorMap = {
      note: "text-blue-400 bg-blue-500/20",
      appel: "text-green-400 bg-green-500/20",
      whatsapp: "text-green-400 bg-green-500/20",
      modification: "text-purple-400 bg-purple-500/20",
      statut: "text-indigo-400 bg-indigo-500/20",
      document: "text-cyan-400 bg-cyan-500/20",
      "rendez-vous": "text-pink-400 bg-pink-500/20",
      devis: "text-yellow-400 bg-yellow-500/20",
      validation: "text-emerald-400 bg-emerald-500/20",
      acompte: "text-green-400 bg-green-500/20",
      tache: "text-blue-400 bg-blue-500/20",
      projet: "text-purple-400 bg-purple-500/20",
    }
    return colorMap[type] || "text-white/60 bg-white/10"
  }

  return (
    <div className="bg-[#171B22] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-4 h-4 text-white/40" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historique</h3>
      </div>

      {allHistory.length > 0 ? (
        <div className="space-y-3 relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-white/10" />

          {allHistory.map((entry, index) => {
            const Icon = getIcon(entry.type)
            const iconColor = getIconColor(entry.type)

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative pl-12"
              >
                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColor} z-10`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="bg-white/5 border border-white/5 rounded-lg p-3 hover:bg-white/[0.07] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-white/60">{entry.auteur}</span>
                    <span className="text-xs text-white/30">•</span>
                    <span className="text-xs text-white/40">
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">{entry.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-white/40" />
          </div>
          <p className="text-xs text-white/50">Aucun historique</p>
        </div>
      )}
    </div>
  )
}
