"use client"

import { useState } from "react"
import { DollarSign, CheckCircle, XCircle, AlertTriangle, TrendingUp, MoreHorizontal } from "lucide-react"
import type { Client, Devis } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DevisPaiementTrackerProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function DevisPaiementTracker({ client, onUpdate }: DevisPaiementTrackerProps) {
  const { toast } = useToast()
  const devisList = client.devis || []

  // Calculate financial metrics
  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const refusedDevis = devisList.filter(d => d.statut === "refuse")
  const totalAccepted = acceptedDevis.reduce((sum, d) => sum + d.montant, 0)
  const totalPaid = acceptedDevis
    .filter(d => d.facture_reglee)
    .reduce((sum, d) => sum + d.montant, 0)
  const progress = totalAccepted > 0 ? Math.round((totalPaid / totalAccepted) * 100) : 0

  // Check if all devis are refused
  const allRefused = devisList.length > 0 && devisList.every(d => d.statut === "refuse")
  
  // Check if at least one devis is accepted
  const hasAcceptedDevis = acceptedDevis.length > 0

  // Check if all accepted devis are paid
  const allPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleMarkPaid = (devisId: string) => {
    const now = new Date().toISOString()
    const updatedDevis = client.devis?.map(d =>
      d.id === devisId ? { ...d, facture_reglee: true } : d
    )

    const devis = client.devis?.find(d => d.id === devisId)
    
    const updatedClient = {
      ...client,
      devis: updatedDevis,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'acompte' as const,
          description: `Facture réglée pour le devis "${devis?.title}" - ${formatCurrency(devis?.montant || 0)}`,
          auteur: 'Admin'
        },
        ...(client.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    onUpdate(updatedClient)
    // Sync project status if this payment changes the derived status (e.g., all accepted devis paid)
    import("@/lib/client-sync").then(m => m.syncClientStatusFrom(updatedClient))
    toast({
      title: "Facture marquée comme réglée",
      description: `Le paiement de ${formatCurrency(devis?.montant || 0)} a été enregistré`,
    })
  }

  const updateDevisStatus = (devisId: string, newStatus: Devis['statut']) => {
    const now = new Date().toISOString()
    const target = client.devis?.find(d => d.id === devisId)
    if (!target) return

    const next: Devis = {
      ...target,
      statut: newStatus,
      // when moving to accepted from pending/refused, keep facture_reglee as-is or set false
      facture_reglee: newStatus === "accepte" ? (target.facture_reglee || false) : false,
      validatedAt: newStatus !== "en_attente" ? now : undefined,
    }

    const updatedDevis = client.devis?.map(d => (d.id === devisId ? next : d))
    const statusLabel = newStatus === "accepte" ? "Accepté" : newStatus === "refuse" ? "Refusé" : "En attente"
    const updatedClient: Client = {
      ...client,
      devis: updatedDevis,
      derniereMaj: now,
      updatedAt: now,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'statut',
          description: `Devis "${target.title}" marqué ${statusLabel}`,
          auteur: 'Utilisateur'
        },
        ...(client.historique || [])
      ],
    }

    onUpdate(updatedClient)
    // Centralized sync: update client statutProjet based on devis state
    import("@/lib/client-sync").then(m => m.syncClientStatusFrom(updatedClient))
    toast({
      title: `Statut mis à jour`,
      description: `"${target.title}" → ${statusLabel}`,
    })
  }

  return (
    <div className="bg-[#171B22] rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">💰 Devis</h3>
        {devisList.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              {acceptedDevis.length}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              {refusedDevis.length}
            </span>
          </div>
        )}
      </div>

      {/* Compact Warning - Only critical */}
      {allRefused && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <p className="text-xs text-red-300">Tous les devis refusés</p>
        </div>
      )}

      {/* Devis List - Simplified */}
      {devisList.length > 0 ? (
        <div className="space-y-2">
          {devisList.map((devis) => (
            <motion.div
              key={devis.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "p-3 rounded-lg border transition-all hover:border-white/20",
                devis.statut === "accepte" && "border-green-500/30 bg-green-500/5",
                devis.statut === "refuse" && "border-red-500/30 bg-red-500/5",
                devis.statut === "en_attente" && "border-white/10 bg-white/5"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white truncate">{devis.title}</h4>
                    {devis.statut === "accepte" && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    )}
                    {devis.statut === "refuse" && (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-white">{formatCurrency(devis.montant)}</p>
                    {devis.statut === "accepte" && (
                      <span className="text-xs text-white/50">
                        {devis.facture_reglee ? "✓ Réglé" : "En attente"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Minimal Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {devis.statut === "accepte" && !devis.facture_reglee && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkPaid(devis.id)}
                      className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      Régler
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/5">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      {devis.statut !== "accepte" && (
                        <DropdownMenuItem onClick={() => updateDevisStatus(devis.id, "accepte")} className="text-sm">
                          <CheckCircle className="w-3.5 h-3.5 mr-2" />
                          Accepter
                        </DropdownMenuItem>
                      )}
                      {devis.statut !== "refuse" && (
                        <DropdownMenuItem onClick={() => updateDevisStatus(devis.id, "refuse")} className="text-sm">
                          <XCircle className="w-3.5 h-3.5 mr-2" />
                          Refuser
                        </DropdownMenuItem>
                      )}
                      {devis.statut !== "en_attente" && (
                        <DropdownMenuItem onClick={() => updateDevisStatus(devis.id, "en_attente")} className="text-sm">
                          En attente
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-white/40">Aucun devis</p>
        </div>
      )}
    </div>
  )
}
