"use client"

import { MapPin, Building2, User, TrendingUp, DollarSign, Clock } from "lucide-react"
import type { Client } from "@/types/client"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ProjectStatusStepperEnhanced } from "@/components/project-status-stepper-enhanced"
import { cn } from "@/lib/utils"

interface ClientDetailsHeaderProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function ClientDetailsHeader({ client, onUpdate }: ClientDetailsHeaderProps) {
  // Calculate based on devis instead of budget
  const devisList = client.devis || []
  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const totalAccepted = acceptedDevis.reduce((sum, d) => sum + d.montant, 0)
  const totalPaid = acceptedDevis.filter(d => d.facture_reglee).reduce((sum, d) => sum + d.montant, 0)
  const progressPercentage = totalAccepted > 0 ? Math.round((totalPaid / totalAccepted) * 100) : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      qualifie: { label: "En qualification", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      acompte_recu: { label: "Acompte reçu", className: "bg-green-500/20 text-green-300 border-green-500/30" },
      conception: { label: "En conception", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
      devis_negociation: { label: "Devis/Négociation", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
      accepte: { label: "Accepté", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
      refuse: { label: "Refusé", className: "bg-red-500/20 text-red-300 border-red-500/30" },
      premier_depot: { label: "1er Dépôt", className: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
      projet_en_cours: { label: "Projet en cours", className: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
      chantier: { label: "Chantier", className: "bg-blue-600/20 text-blue-300 border-blue-600/30" },
      facture_reglee: { label: "Facture réglée", className: "bg-green-600/20 text-green-300 border-green-600/30" },
      livraison_termine: { label: "Livraison & Terminé", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    }
    return statusMap[status] || { label: status, className: "bg-white/10 text-white/60 border-white/20" }
  }

  const statusInfo = getStatusBadge(client.statutProjet)

  return (
    <div className="px-8 py-6">
      {/* Top Row - Client Name & Key Info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-3xl font-bold text-white">{client.nom}</h1>
            <Badge className={cn("text-sm font-semibold", statusInfo.className)}>
              {statusInfo.label}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{client.ville}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{client.typeProjet}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Architecte: {client.architecteAssigne}</span>
            </div>
            {client.magasin && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="font-medium text-blue-400">Magasin: {client.magasin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[120px]">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/50">Paiements</span>
            </div>
            <div className="text-2xl font-bold text-white">{progressPercentage}%</div>
          </div>

          {totalAccepted > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[140px]">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white/50">Devis acceptés</span>
              </div>
              <div className="text-xl font-bold text-white">{formatCurrency(totalAccepted)}</div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-white/50">Dernière MAJ</span>
            </div>
            <div className="text-sm font-medium text-white">{formatDate(client.derniereMaj)}</div>
          </div>
        </div>
      </div>

      {/* Project Status Timeline */}
      <ProjectStatusStepperEnhanced
        currentStatus={client.statutProjet}
        onStatusChange={(newStatus) => {
          const now = new Date().toISOString()
          const updatedClient = {
            ...client,
            statutProjet: newStatus,
            derniereMaj: now,
            updatedAt: now,
            historique: [
              {
                id: `hist-${Date.now()}`,
                date: now,
                type: 'statut' as const,
                description: `Statut changé à "${newStatus}"`,
                auteur: 'Utilisateur'
              },
              ...(client.historique || [])
            ]
          }
          onUpdate(updatedClient)
        }}
        interactive={true}
        lastUpdated={client.derniereMaj}
      />
    </div>
  )
}
