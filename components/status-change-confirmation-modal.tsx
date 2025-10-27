"use client"

import { AlertTriangle, Check, Sparkles, DollarSign, Briefcase, Building2, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import type { ProjectStatus } from "@/types/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"

interface StatusChangeConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (status: ProjectStatus) => void
  currentStatus: ProjectStatus
  newStatus: ProjectStatus
  clientName: string
}

const stageOptions: Array<{ key: ProjectStatus; label: string; icon: React.ElementType; color: string; pill: string }> = [
  { key: "nouveau", label: "Nouveau", icon: Sparkles, color: "text-white/80", pill: "bg-white/10 text-white" },
  { key: "acompte_verse", label: "Acompte versé", icon: DollarSign, color: "text-orange-400", pill: "bg-orange-500/20 text-orange-300 border border-orange-500/30" },
  { key: "en_conception", label: "En conception", icon: Briefcase, color: "text-blue-400", pill: "bg-blue-500/20 text-blue-300 border border-blue-500/30" },
  { key: "en_chantier", label: "En chantier", icon: Building2, color: "text-purple-400", pill: "bg-purple-500/20 text-purple-300 border border-purple-500/30" },
  { key: "livraison", label: "Livraison", icon: TrendingUp, color: "text-teal-400", pill: "bg-teal-500/20 text-teal-300 border border-teal-500/30" },
  { key: "termine", label: "Terminé", icon: Check, color: "text-emerald-400", pill: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" },
]

export function StatusChangeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  newStatus,
  clientName,
}: StatusChangeConfirmationModalProps) {
  const [selected, setSelected] = useState<ProjectStatus>(newStatus)

  const current = useMemo(() => stageOptions.find(s => s.key === currentStatus)!, [currentStatus])
  const selectedStage = useMemo(() => stageOptions.find(s => s.key === selected)!, [selected])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-[60] p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-center mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <AlertTriangle className="w-5 h-5 text-blue-300" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-[#EAEAEA] mb-2">Mettre à jour l'état du projet</h2>
              <p className="text-sm text-white/60">Projet: <span className="text-[#EAEAEA] font-medium">{clientName}</span></p>
            </div>

            {/* Current and selector */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">Statut actuel</span>
                <div className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", current.pill)}>
                  <div className="flex items-center gap-2">
                    <current.icon className={cn("w-4 h-4", current.color)} />
                    {current.label}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">Nouveau statut</span>
                <div className="w-60">
                  <Select value={selected} onValueChange={(v) => setSelected(v as ProjectStatus)}>
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[80]">
                      {stageOptions.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          <span className="flex items-center gap-2">
                            <s.icon className={cn("w-4 h-4", s.color)} />
                            <span>{s.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-white/40 text-center">Cette action sera enregistrée dans l'historique du projet</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={onClose} className="flex-1 h-11 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10">
                Annuler
              </Button>
              <Button onClick={() => onConfirm(selected)} className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20">
                <Check className="w-4 h-4 mr-2" />
                Confirmer
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
