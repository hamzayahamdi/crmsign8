"use client"

import { useState, useEffect } from "react"
import { MapPin, Building2, User, TrendingUp, DollarSign, Clock } from "lucide-react"
import type { Client } from "@/types/client"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ProjectStatusStepperEnhanced } from "@/components/project-status-stepper-enhanced"
import { updateClientStage } from "@/lib/client-stage-service"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface ClientDetailsHeaderProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function ClientDetailsHeader({ client, onUpdate }: ClientDetailsHeaderProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    console.log('[ClientDetailsHeader] Client prop updated:', {
      id: client.id,
      statutProjet: client.statutProjet,
      derniereMaj: client.derniereMaj,
      fullClient: client
    })
  }, [client])

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
    try {
      const { getStatusConfig } = require("@/lib/status-config")
      const sc = getStatusConfig(status)
      return { label: sc.label, className: `${sc.bgColor} ${sc.textColor} ${sc.borderColor}` }
    } catch {
      return { label: status, className: "bg-white/10 text-white/60 border-white/20" }
    }
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
        key={`stepper-${client.statutProjet}-${client.derniereMaj}`}
        currentStatus={client.statutProjet}
        onStatusChange={async (newStatus) => {
          const now = new Date().toISOString()
          const changedBy = user?.name || 'Utilisateur'

          // Update stage history in database
          const result = await updateClientStage(client.id, newStatus, changedBy)

          if (result.success) {
            // Update local client state
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
                  auteur: changedBy
                },
                ...(client.historique || [])
              ]
            }
            onUpdate(updatedClient)

            toast({
              title: "Statut mis à jour",
              description: `Le statut a été changé à "${newStatus}"`,
            })
          } else {
            toast({
              title: "Erreur",
              description: result.error || "Impossible de mettre à jour le statut",
              variant: "destructive"
            })
          }
        }}
        interactive={true}
        lastUpdated={client.derniereMaj}
      />
    </div>
  )
}
