"use client"

import { DollarSign, Check, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Payment } from "@/types/client"

interface PaymentTrackerProps {
  payments: Payment[]
  budget?: number
  className?: string
}

export function PaymentTracker({ payments = [], budget, className }: PaymentTrackerProps) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const paymentCount = payments.length
  const percentagePaid = budget ? Math.min((totalPaid / budget) * 100, 100) : 0
  const remaining = budget ? Math.max(budget - totalPaid, 0) : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      espece: "Espèce",
      virement: "Virement",
      cheque: "Chèque"
    }
    return labels[method as keyof typeof labels] || method
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-white/40">Total des acomptes</div>
              <div className="text-lg font-bold text-emerald-400">{formatCurrency(totalPaid)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40">Nombre de paiements</div>
            <div className="text-lg font-bold text-white/80">{paymentCount}</div>
          </div>
        </div>

        {/* Progress Bar */}
        {budget && budget > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Progression</span>
              <span className="text-emerald-400 font-medium">{percentagePaid.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentagePaid}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Restant: {formatCurrency(remaining)}</span>
              <span className="text-white/30">Budget: {formatCurrency(budget)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment List */} 
      {paymentCount > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">
            Historique des paiements
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
            {payments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-[#EAEAEA]">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-xs text-white/40">•</span>
                      <span className="text-xs text-white/40">
                        {getPaymentMethodLabel(payment.method)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/30">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(payment.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {payment.reference && (
                        <>
                          <span>•</span>
                          <span>Réf: {payment.reference}</span>
                        </>
                      )}
                    </div>
                    {payment.notes && (
                      <div className="mt-1 text-xs text-white/40 italic">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-white/30">{payment.createdBy}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {paymentCount === 0 && (
        <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center">
          <DollarSign className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">Aucun acompte enregistré</p>
          <p className="text-xs text-white/30 mt-1">
            Utilisez le bouton "Ajouter acompte" pour enregistrer un paiement
          </p>
        </div>
      )}
    </div>
  )
}
