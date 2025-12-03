"use client";

import { useEffect } from "react";
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Client } from "@/types/client";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusStepperEnhanced } from "@/components/project-status-stepper-enhanced";
import { updateClientStage } from "@/lib/client-stage-service";
import { useToast } from "@/hooks/use-toast";

interface ClientDetailsHeaderProps {
  client: Client;
  onUpdate: (updatedClient: Client, skipApiCall?: boolean) => void;
}

export function ClientDetailsHeader({
  client,
  onUpdate,
}: ClientDetailsHeaderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[ClientDetailsHeader] Client prop updated:", {
      id: client.id,
      statutProjet: client.statutProjet,
      derniereMaj: client.derniereMaj,
      fullClient: client,
    });
  }, [client]);

  const handleBack = () => {
    router.push("/clients");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProjectProgress = () => {
    const statusOrder = [
      "qualifie",
      "prise_de_besoin",
      "acompte_recu",
      "conception",
      "devis_negociation",
      "accepte",
      "premier_depot",
      "projet_en_cours",
      "chantier",
      "facture_reglee",
      "livraison_termine",
    ];

    const currentIndex = statusOrder.indexOf(client.statutProjet);
    if (currentIndex === -1) return 0;

    return Math.round(((currentIndex + 1) / statusOrder.length) * 100);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour aux clients
      </button>

      {/* Client Header */}
      <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{client.nom}</h1>
            {client.nomProjet && (
              <p className="text-lg text-blue-400 mb-1">{client.nomProjet}</p>
            )}
            <div className="flex items-center gap-4 text-white/60">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{client.telephone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{client.ville}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{client.architecteAssigne}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <Badge
              variant="secondary"
              className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-2"
            >
              {client.typeProjet}
            </Badge>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Clock className="w-4 h-4" />
              <span>Mis à jour {formatDate(client.derniereMaj)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-white/80">
              Progression du projet
            </span>
            <span className="text-sm text-blue-400 font-medium">
              {getProjectProgress()}%
            </span>
          </div>
          <Progress value={getProjectProgress()} className="h-2 bg-white/10" />
        </div>

        {/* Project Status Timeline */}
        <ProjectStatusStepperEnhanced
          key={`stepper-${client.id}`}
          currentStatus={client.statutProjet}
          interactive={true}
          onStatusChange={async (newStatus) => {
            console.log("🚀 [ClientDetailsHeader] Status change initiated:", {
              clientId: client.id,
              from: client.statutProjet,
              to: newStatus,
              timestamp: new Date().toISOString(),
              user: user?.name,
            });

            const now = new Date().toISOString();
            const changedBy = user?.name || "Utilisateur";

            try {
              console.log(
                "📡 [ClientDetailsHeader] Calling updateClientStage API...",
              );

              // Update stage history in database
              const result = await updateClientStage(
                client.id,
                newStatus,
                changedBy,
              );

              console.log("📊 [ClientDetailsHeader] API Result:", result);

              if (result.success) {
                console.log(
                  "✅ [ClientDetailsHeader] Stage update successful!",
                );

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
                      type: "statut" as const,
                      description: `Statut changé à "${newStatus}"`,
                      auteur: changedBy,
                    },
                    ...(client.historique || []),
                  ],
                };

                console.log("🔄 [ClientDetailsHeader] Updating local state...");
                // Pass true for skipApiCall to avoid double update
                onUpdate(updatedClient, true);

                // Emit custom event to trigger refresh of timeline and roadmap
                window.dispatchEvent(
                  new CustomEvent("stage-updated", {
                    detail: { clientId: client.id, newStatus, changedBy },
                  }),
                );
                console.log(
                  "[ClientDetailsHeader] Emitted stage-updated event:",
                  {
                    clientId: client.id,
                    newStatus,
                  },
                );

                console.log(
                  "🎉 [ClientDetailsHeader] Showing success toast...",
                );

                // Show enhanced success toast
                const statusLabels = {
                  qualifie: "Qualifié",
                  prise_de_besoin: "Prise de besoin",
                  acompte_recu: "Acompte reçu",
                  conception: "Conception",
                  devis_negociation: "Devis/Négociation",
                  accepte: "Accepté",
                  refuse: "Refusé",
                  premier_depot: "Premier dépôt",
                  projet_en_cours: "Projet en cours",
                  chantier: "Chantier",
                  facture_reglee: "Facture réglée",
                  livraison_termine: "Livraison & Terminé",
                };

                const fromLabel =
                  statusLabels[client.statutProjet] || client.statutProjet;
                const toLabel = statusLabels[newStatus] || newStatus;

                toast({
                  title: "🎉 Statut mis à jour avec succès",
                  description: `Progression : ${fromLabel} → ${toLabel}`,
                });
              } else {
                console.error(
                  "❌ [ClientDetailsHeader] Stage update failed:",
                  result,
                );

                toast({
                  title: "❌ Erreur",
                  description:
                    result.error || "Impossible de mettre à jour le statut",
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error(
                "💥 [ClientDetailsHeader] Exception during status change:",
                error,
              );

              toast({
                title: "❌ Erreur",
                description:
                  "Une erreur inattendue s'est produite lors de la mise à jour",
                variant: "destructive",
              });
            }
          }}
          lastUpdated={client.derniereMaj}
        />
      </div>
    </div>
  );
}
