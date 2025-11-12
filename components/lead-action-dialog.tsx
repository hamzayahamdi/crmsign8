"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, Edit, X, Loader2, CheckCircle2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArchitectSelectionDialog } from "./architect-selection-dialog-improved"
import type { Lead } from "@/types/lead"

interface LeadActionDialogProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (lead: Lead) => void
  onConvertToClient: (lead: Lead, architectId: string) => void
}

type DialogStep = "choose" | "selectArchitect"

export function LeadActionDialog({
  lead,
  open,
  onOpenChange,
  onEdit,
  onConvertToClient,
}: LeadActionDialogProps) {
  const [step, setStep] = useState<DialogStep>("choose")
  const [selectedArchitectId, setSelectedArchitectId] = useState<string | null>(null)

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setStep("choose")
        setSelectedArchitectId(null)
      }, 200) // Wait for animation to complete
    }
    onOpenChange(newOpen)
  }

  const handleConvert = () => {
    setStep("selectArchitect")
  }

  const handleEdit = () => {
    if (lead) {
      onEdit(lead)
      handleOpenChange(false)
    }
  }

  const handleArchitectSelected = (architectId: string) => {
    if (lead) {
      onConvertToClient(lead, architectId)
      handleOpenChange(false)
    }
  }

  if (!lead) return null

  return (
    <>
      <Dialog open={open && step === "choose"} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-neutral-900/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl rounded-2xl overflow-hidden">
          {/* Gradient overlay for premium feel */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <DialogTitle className="text-xl font-semibold">
                Que souhaitez-vous faire ?
              </DialogTitle>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Choisissez une action pour <span className="text-white font-medium">{lead.nom}</span>
            </p>
          </DialogHeader>

          <motion.div 
            className="flex flex-col gap-3 mt-6 relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Convert to Client Button */}
            <Button
              onClick={handleConvert}
              className="w-full h-auto py-4 px-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-green-600/20 hover:shadow-green-500/30 hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-base">Convertir en client</p>
                  <p className="text-xs text-white/70 mt-0.5">Créer un nouveau dossier client</p>
                </div>
                <CheckCircle2 className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Button>

            {/* Edit Lead Button */}
            <Button
              onClick={handleEdit}
              variant="outline"
              className="w-full h-auto py-4 px-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Edit className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-base">Modifier le lead</p>
                  <p className="text-xs text-gray-400 mt-0.5">Mettre à jour les informations</p>
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

      {/* Architect Selection Dialog */}
      <ArchitectSelectionDialog
        open={step === "selectArchitect"}
        onOpenChange={(open) => {
          if (!open) {
            setStep("choose")
          }
        }}
        onBack={() => setStep("choose")}
        onArchitectSelected={handleArchitectSelected}
        leadName={lead.nom}
      />
    </>
  )
}
