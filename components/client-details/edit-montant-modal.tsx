"use client"

import { useState, useEffect } from "react"
import { X, DollarSign, Loader2, Info, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import type { Client, Devis } from "@/types/client"
import { useToast } from "@/hooks/use-toast"

interface EditMontantModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  devis: Devis
  onSave: (client: Client, skipApiCall?: boolean) => void
}

export function EditMontantModal({ 
  isOpen, 
  onClose, 
  client, 
  devis, 
  onSave 
}: EditMontantModalProps) {
  const { toast } = useToast()
  const [montant, setMontant] = useState(devis.montant.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens or devis changes
  useEffect(() => {
    if (isOpen && devis) {
      setMontant(devis.montant.toString())
    }
  }, [isOpen, devis])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newMontant = parseFloat(montant)
    
    // Validation
    if (isNaN(newMontant) || newMontant <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez saisir un montant valide supérieur à 0",
        variant: "destructive",
      })
      return
    }

    if (newMontant === devis.montant) {
      toast({
        title: "Aucun changement",
        description: "Le montant n'a pas été modifié",
      })
      onClose()
      return
    }

    setIsSubmitting(true)

    try {
      // Update devis via API
      const response = await fetch(`/api/clients/${client.id}/devis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          devisId: devis.id,
          montant: newMontant.toString(),
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Failed to update montant')
      }

      const result = await response.json()
      console.log('[Edit Montant] ✅ Montant updated:', result.data)

      const oldAmount = devis.montant
      const difference = newMontant - oldAmount
      const isIncrease = difference > 0

      // Show success toast immediately with better formatting
      toast({
        title: "✅ Montant modifié avec succès",
        description: (
          <div className="space-y-1.5 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-white/70">Ancien:</span>
              <span className="text-white/90">{formatCurrency(oldAmount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/70">Nouveau:</span>
              <span className="font-semibold text-green-400">{formatCurrency(newMontant)}</span>
            </div>
            {Math.abs(difference) > 0 && (
              <div className={`flex items-center gap-1.5 text-sm font-medium pt-0.5 ${
                isIncrease ? 'text-green-400' : 'text-orange-400'
              }`}>
                {isIncrease ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {isIncrease ? '+' : ''}{formatCurrency(Math.abs(difference))}
                </span>
              </div>
            )}
          </div>
        ),
        duration: 3500,
      })

      // Refresh client data in background (non-blocking)
      setTimeout(async () => {
        try {
          const clientResponse = await fetch(`/api/clients/${client.id}`, {
            credentials: 'include',
          })
          if (clientResponse.ok) {
            const clientResult = await clientResponse.json()
            onSave(clientResult.data, true)
          }
        } catch (error) {
          console.error('[Edit Montant] Error refreshing client data:', error)
        }
      }, 100)

      // Close modal after a brief delay to show the toast
      setTimeout(() => {
        onClose()
      }, 300)
    } catch (error: any) {
      console.error('[Edit Montant] Error:', error)
      toast({
        title: "Erreur",
        description: error.message || 'Impossible de modifier le montant. Veuillez réessayer.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const oldAmount = devis.montant
  const newAmount = parseFloat(montant) || 0
  const difference = newAmount - oldAmount
  const hasChange = Math.abs(difference) > 0 && !isNaN(newAmount)

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gradient-to-br from-[#171B22] via-[#1a1f28] to-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Modifier le Montant</h2>
                  <p className="text-sm text-white/50">{devis.title || 'Devis'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Current Amount Info */}
            <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-white/60">Montant actuel</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(devis.montant)}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="montant" className="text-white mb-2 block text-sm font-medium">
                  Nouveau montant (MAD) <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="montant"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    placeholder="Ex: 25000"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 h-12 text-lg font-semibold focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20"
                    autoFocus
                  />
                </div>
                {hasChange && (
                  <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-sm ${
                    difference > 0 
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                      : 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
                  }`}>
                    {difference > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>
                      {difference > 0 ? 'Augmentation' : 'Diminution'} de {formatCurrency(Math.abs(difference))}
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-300/80 space-y-1">
                    <p className="font-medium">Informations importantes:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-300/60">
                      <li>Le montant sera mis à jour immédiatement</li>
                      <li>Cette modification sera enregistrée dans l'historique</li>
                      {devis.statut === 'accepte' && (
                        <li className="text-yellow-400">⚠️ Ce devis est accepté - la modification affectera les calculs de paiement</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !montant || parseFloat(montant) <= 0}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enregistrement...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>Enregistrer</span>
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

