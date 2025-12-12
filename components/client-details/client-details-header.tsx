"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Building2,
  User,
  TrendingUp,
  DollarSign,
  Clock,
} from "lucide-react";
import type { Client } from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusStepperEnhanced } from "@/components/project-status-stepper-enhanced";
import { updateClientStage } from "@/lib/client-stage-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { calculatePaymentMetrics, formatCurrency as formatCurrencyUtil } from "@/lib/payment-calculations";

interface ClientDetailsHeaderProps {
  client: Client;
  onUpdate: (client: Client, skipApiCall?: boolean) => void;
}

export function ClientDetailsHeader({
  client,
  onUpdate,
}: ClientDetailsHeaderProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    console.log("[ClientDetailsHeader] Client prop updated:", {
      id: client.id,
      statutProjet: client.statutProjet,
      derniereMaj: client.derniereMaj,
      fullClient: client,
    });
  }, [client]);

  // Calculate payment metrics using the new utility
  const paymentMetrics = calculatePaymentMetrics(client);
  const progressPercentage = paymentMetrics.paymentPercentage;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    try {
      const { getStatusConfig } = require("@/lib/status-config");
      const sc = getStatusConfig(status);
      return {
        label: sc.label,
        className: `${sc.bgColor} ${sc.textColor} ${sc.borderColor}`,
      };
    } catch {
      return {
        label: status,
        className: "bg-white/10 text-white/60 border-white/20",
      };
    }
  };

  const statusInfo = getStatusBadge(client.statutProjet);

  // Calculate next action based on current status
  const getNextAction = () => {
    switch (client.statutProjet) {
      case "qualifie":
        return "Planifier la prise de besoin";
      case "prise_de_besoin":
        return "Créer un devis";
      case "devis_negociation":
        return "Valider le devis";
      case "accepte":
        return "Recevoir 1er dépôt";
      case "acompte_recu":
        return "Lancer la conception";
      case "premier_depot":
        return "Démarrer conception";
      case "conception":
        return "Valider plans";
      case "projet_en_cours":
        return "Suivre l'exécution";
      case "facture_reglee":
        return "Préparer livraison";
      default:
        return "Aucune action";
    }
  };

  // Calculate project completion percentage based on stage
  const getProjectCompletion = () => {
    const stages = [
      "qualifie",
      "prise_de_besoin",
      "acompte_recu",
      "conception",
      "devis_negociation",
      "accepte",
      "premier_depot",
      "projet_en_cours",
      "facture_reglee",
      "livraison_termine",
    ];
    const currentIndex = stages.indexOf(client.statutProjet);
    if (currentIndex === -1) return 0;
    return Math.round(((currentIndex + 1) / stages.length) * 100);
  };

  return (
    <div className="px-4 md:px-5 lg:px-8 py-3 md:py-4 w-full max-w-full overflow-hidden">
      {/* Top Row - Opportunity Name & Key Info */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3.5 w-full">
        <div className="flex-1 min-w-0 w-full">
          {/* Main Heading - Opportunity/Project Name */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 mb-2">
            <h1 className="text-base md:text-lg lg:text-xl font-light text-white/95 leading-tight truncate">
              {client.nomProjet || client.nom}
            </h1>
            <Badge
              className={cn(
                "text-[9px] md:text-[10px] font-light w-fit px-2 py-0.5 shrink-0",
                statusInfo.className,
              )}
            >
              {statusInfo.label}
            </Badge>
          </div>

          {/* Client Name - Secondary Position */}
          <div className="flex items-center gap-1.5 mb-2">
            <User className="w-3 h-3 text-white/50 shrink-0" />
            <span className="text-[10px] md:text-xs font-light text-white/70 truncate">
              Client: <span className="text-white/85">{client.nom}</span>
            </span>
          </div>

          {/* Project Details */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] md:text-[11px] text-white/60 w-full font-light">
            <div className="flex items-center gap-1 shrink-0">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[120px] md:max-w-none">
                {client.ville}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Building2 className="w-2.5 h-2.5 shrink-0" />
              <span>{client.typeProjet}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[140px] md:max-w-[220px]">
                Architecte: {client.architecteAssigne || "Non assigné"}
              </span>
            </div>
            {client.magasin && (
              <div className="flex items-center gap-1 shrink-0">
                <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                <span className="text-blue-400 truncate max-w-[100px] md:max-w-none">
                  Magasin: {client.magasin}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards - Compact Grid on Mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2 md:gap-2.5 w-full lg:w-auto">
          <div className="bg-white/3 border border-white/5 rounded-md px-2.5 md:px-3 py-2 min-w-0 lg:min-w-[110px]">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-[9px] text-white/40 truncate font-light uppercase tracking-wider">
                Paiements
              </span>
            </div>
            <div className="text-sm md:text-base font-light text-white/90 truncate">
              {progressPercentage}%
            </div>
          </div>

          {paymentMetrics.totalBudget > 0 && (
            <div className="bg-white/3 border border-white/5 rounded-md px-2.5 md:px-3 py-2 min-w-0 lg:min-w-[130px]">
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className="w-3 h-3 text-green-400 shrink-0" />
                <span className="text-[9px] text-white/40 truncate font-light uppercase tracking-wider">
                  {paymentMetrics.budgetSource === 'project_budget' ? 'Estimation' : 'Devis acceptés'}
                </span>
              </div>
              <div className="text-xs md:text-sm font-light text-white/90 truncate">
                {formatCurrencyUtil(paymentMetrics.totalBudget)}
              </div>
            </div>
          )}

          <div className="bg-white/3 border border-white/5 rounded-md px-2.5 md:px-3 py-2 min-w-0 lg:min-w-[130px] col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="text-[9px] text-white/40 truncate font-light uppercase tracking-wider">
                Dernière MAJ
              </span>
            </div>
            <div className="text-[10px] md:text-[11px] font-light text-white/90 truncate">
              {formatDate(client.derniereMaj)}
            </div>
          </div>
        </div>
      </div>

      {/* Project Status Timeline */}
      <ProjectStatusStepperEnhanced
        key={`stepper-${client.id}`}
        currentStatus={client.statutProjet}
        onStatusChange={async (newStatus) => {
          const now = new Date().toISOString();
          const changedBy = user?.name || "Utilisateur";

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
            // Pass true for skipApiCall to avoid double update
            onUpdate(updatedClient, true)

            // Emit custom event to trigger refresh of timeline and roadmap
            window.dispatchEvent(new CustomEvent('stage-updated', {
              detail: { clientId: client.id, newStatus, changedBy }
            }))
            console.log('[ClientDetailsHeader] Emitted stage-updated event:', { clientId: client.id, newStatus })

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
  );
}
