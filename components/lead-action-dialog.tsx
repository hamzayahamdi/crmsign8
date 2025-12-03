"use client"

import { motion } from "framer-motion"
import { Building2, Edit, CheckCircle2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Lead } from "@/types/lead"

interface LeadActionDialogProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (lead: Lead) => void
  onConvertToClient?: (lead: Lead) => void
}

export function LeadActionDialog({
  lead,
  open,
  onOpenChange,
  onEdit,
  onConvertToClient,
}: LeadActionDialogProps) {
  // Simple open/close handler
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const handleConvert = () => {
    if (!lead) return

    // Close the action dialog
    handleOpenChange(false)

    // Call the parent handler to show the convert modal
    if (onConvertToClient) {
      onConvertToClient(lead)
    }
  }

  const handleEdit = () => {
    if (lead) {
      onEdit(lead)
      handleOpenChange(false)
    }
  }

  if (!lead) return null

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[90vw] sm:w-full sm:max-w-[420px] md:sm:max-w-[500px] bg-neutral-900/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl rounded-2xl overflow-hidden p-4 md:p-6">
          {/* Gradient overlay for premium feel */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

          <DialogHeader className="relative">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              </div>
              <DialogTitle className="text-lg md:text-xl font-semibold">
                Que souhaitez-vous faire ?
              </DialogTitle>
            </div>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Choisissez une action pour <span className="text-white font-medium">{lead.nom}</span>
            </p>
          </DialogHeader>

          <motion.div
            className="flex flex-col gap-2 md:gap-3 mt-4 md:mt-6 relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Convert to Contact Button */}
            <Button
              onClick={handleConvert}
              className="w-full h-auto py-3 px-4 md:py-4 md:px-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-green-600/20 hover:shadow-green-500/30 hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Building2 className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm md:text-base">Convertir en Contact</p>
                  <p className="text-[10px] md:text-xs text-white/70 mt-0.5">Assigner un architecte et créer le dossier</p>
                </div>
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Button>

            {/* Edit / Open Lead Button */}
            <Button
              onClick={handleEdit}
              variant="outline"
              className="w-full h-auto py-3 px-4 md:py-4 md:px-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Edit className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm md:text-base">Ouvrir le lead</p>
                  <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">Voir la fiche complète et modifier les informations</p>
                </div>
              </div>
            </Button>
          </motion.div>

          {/* Footer hint */}
          <div className="mt-6 pt-4 border-t border-white/5 relative">
            <p className="text-xs text-gray-500 text-center">
              Appuyez sur <kbd className="px-2 py-0.5 bg-white/10 rounded text-white/70">Échap</kbd> pour fermer
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
