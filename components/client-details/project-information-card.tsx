"use client"

import { Building2, DollarSign, FileText, CheckCircle } from "lucide-react"
import type { Client } from "@/types/client"

interface ProjectInformationCardProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function ProjectInformationCard({ client }: ProjectInformationCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-[#171B22] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Informations Projet</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/40 mb-1">Type de Projet</p>
            <p className="text-sm text-white font-medium capitalize">{client.typeProjet}</p>
          </div>
        </div>

        {(() => {
          const devisList = client.devis || []
          const acceptedDevis = devisList.filter(d => d.statut === "accepte")
          const totalAccepted = acceptedDevis.reduce((sum, d) => sum + d.montant, 0)
          const allPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee)
          
          return totalAccepted > 0 ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 mb-1">Devis Acceptés</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-medium">{formatCurrency(totalAccepted)}</p>
                  {allPaid && (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  )}
                </div>
              </div>
            </div>
          ) : null
        })()}

        {(() => {
          const paymentsList = client.payments || []
          const totalPayments = paymentsList.reduce((sum, p) => sum + p.amount, 0)
          
          return totalPayments > 0 ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 mb-1">Acomptes Reçus</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-medium">{formatCurrency(totalPayments)}</p>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {paymentsList.length}
                  </span>
                </div>
              </div>
            </div>
          ) : null
        })()}

        {(client.notes || client.nomProjet) && (
          <div className="flex items-start gap-3 md:col-span-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-1">Notes & Détails</p>
              {client.nomProjet && (
                <p className="text-sm text-white font-medium mb-1">Projet: {client.nomProjet}</p>
              )}
              {client.notes && (
                <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{client.notes}</p>
              )}
              {!client.notes && !client.nomProjet && (
                <p className="text-sm text-white/40 italic">Aucune note</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
