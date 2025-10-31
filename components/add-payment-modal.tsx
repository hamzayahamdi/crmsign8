"use client"

import { useState } from "react"
import { X, DollarSign, Calendar, FileText, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/client"

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onAddPayment: (payment: PaymentData) => void
}

export interface PaymentData {
  amount: number
  date: string
  method: string
  reference?: string
  notes?: string
}

export function AddPaymentModal({
  isOpen,
  onClose,
  client,
  onAddPayment
}: AddPaymentModalProps) {
  const [formData, setFormData] = useState<PaymentData>({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: "espece",
    reference: "",
    notes: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.amount <= 0) return
    
    onAddPayment(formData)
    
    // Reset form
    setFormData({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      method: "espece",
      reference: "",
      notes: ""
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-[70] p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EAEAEA]">Ajouter un acompte</h2>
                  <p className="text-sm text-white/40">{client.nom}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-[#EAEAEA]" />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Montant de l'acompte *
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                    step="100"
                    required
                    className="h-12 pl-4 pr-16 bg-white/5 border-white/10 text-[#EAEAEA] text-lg font-semibold rounded-xl focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">
                    MAD
                  </span>
                </div>
                {formData.amount > 0 && (
                  <p className="text-xs text-white/40 mt-1.5">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Date du paiement *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="h-12 pl-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-orange-500/50"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Méthode de paiement *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "espece", label: "Espèce" },
                    { value: "virement", label: "Virement" },
                    { value: "cheque", label: "Chèque" },
                  ].map((method) => (
                    <motion.button
                      key={method.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, method: method.value })}
                      className={cn(
                        "h-11 rounded-xl font-medium text-sm transition-all border",
                        formData.method === method.value
                          ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {method.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Reference (optional) */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Référence (optionnel)
                </Label>
                <Input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="N° chèque, référence virement..."
                  className="h-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-orange-500/50"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Notes (optionnel)
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ajouter des notes sur ce paiement..."
                  className="min-h-[80px] bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-orange-500/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={formData.amount <= 0}
                  className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Enregistrer l'acompte
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="h-12 px-6 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
