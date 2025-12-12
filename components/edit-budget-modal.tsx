"use client"

import { useState, useEffect } from "react"
import { DollarSign, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import type { Client } from "@/types/client"
import { useToast } from "@/hooks/use-toast"

interface EditBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onSave: (client: Client) => void
}

export function EditBudgetModal({ 
  isOpen, 
  onClose, 
  client, 
  onSave 
}: EditBudgetModalProps) {
  const { toast } = useToast()
  const [budget, setBudget] = useState((client.budget || 0).toString())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens or client changes
  useEffect(() => {
    if (isOpen && client) {
      setBudget((client.budget || 0).toString())
    }
  }, [isOpen, client])

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
    
    const newBudget = parseFloat(budget)
    
    // Validation
    if (isNaN(newBudget) || newBudget < 0) {
      toast({
        title: "Estimation Montant invalide",
        description: "Veuillez saisir une estimation montant valide (supérieur ou égal à 0)",
        variant: "destructive",
      })
      return
    }

    if (newBudget === (client.budget || 0)) {
      toast({
        title: "Aucun changement",
        description: "L'estimation montant n'a pas été modifiée",
      })
      onClose()
      return
    }

    setIsSubmitting(true)

    // Optimistic update - update UI immediately
    const now = new Date().toISOString()
    const optimisticClient: Client = {
      ...client,
      budget: newBudget,
      derniereMaj: now,
      updatedAt: now,
    }
    onSave(optimisticClient)

    try {
      // Update client budget via API - ONLY send budget field
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          budget: newBudget,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Revert optimistic update on error
        onSave(client)
        throw new Error(errorData.error || 'Failed to update budget')
      }

      // Don't call onSave again - real-time subscription will handle the update
      // This prevents duplicate updates
      console.log('[Edit Budget] ✅ Budget updated via API, real-time sync will update UI')

      // Show success toast immediately with better formatting
      toast({
        title: "✅ Estimation Montant modifiée avec succès",
        description: (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/70">{formatCurrency(oldBudget)}</span>
            <span className="text-white/50">→</span>
            <span className="font-semibold text-green-400">{formatCurrency(newBudget)}</span>
          </div>
        ),
        duration: 3000,
      })

      // Close modal after a brief delay to show the toast
      setTimeout(() => {
        onClose()
      }, 300)
    } catch (error: any) {
      console.error('[Edit Budget] Error:', error)
      toast({
        title: "Erreur",
        description: error.message || 'Impossible de modifier l\'estimation montant. Veuillez réessayer.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const oldBudget = client.budget || 0
  const newBudget = parseFloat(budget) || 0
  const difference = newBudget - oldBudget
  const hasChange = Math.abs(difference) > 0 && !isNaN(newBudget)

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

          {/* Modal - Only Input */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs bg-gradient-to-br from-[#171B22] via-[#1a1f28] to-[#171B22] rounded-lg border border-white/10 shadow-2xl z-50 p-3"
          >
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 z-10" />
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Montant (MAD)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-8 h-9 text-sm font-light focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 h-8 bg-transparent border-white/10 text-white text-xs font-light hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !budget || parseFloat(budget) < 0}
                  className="flex-1 h-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <DollarSign className="w-3 h-3" />
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

