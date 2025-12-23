"use client";

import { useState } from "react";
import {
  Plus,
  DollarSign,
  Paperclip,
  Trash2,
  MessageSquare,
  ArrowRight,
  Wand2,
  Sparkles,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import type { Client, ProjectStatus } from "@/types/client";
import { Button } from "@/components/ui/button";
import { AddNoteModal } from "./add-note-modal";
import { AddDevisModal } from "./add-devis-modal";
import {
  AddPaymentModal,
  type PaymentData,
} from "@/components/add-payment-modal";
import { DocumentsModal } from "@/components/documents-modal";
import { CreateOpportunityModal } from "@/components/create-opportunity-modal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { updateClientStage } from "@/lib/client-stage-service";
import { getStatusConfig } from "@/lib/status-config";

interface QuickActionsSidebarProps {
  client: Client;
  onUpdate: (client: Client, skipApiCall?: boolean) => void;
  onDelete: () => void;
}

export function QuickActionsSidebar({
  client,
  onUpdate,
  onDelete,
}: QuickActionsSidebarProps) {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDevisModalOpen, setIsDevisModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isCreateOpportunityModalOpen, setIsCreateOpportunityModalOpen] = useState(false);
  const [contact, setContact] = useState<any>(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const canUpdateStage = hasPermission(user?.role, "projectProgress", "update");
  const depositLocked = client.statutProjet === "qualifie";

  // Get contact ID from client (for opportunity-based clients)
  const contactId = client.contactId || (client.id.includes("-") ? client.id.split("-")[0] : null);
  const isOpportunityClient = !!contactId;

  // Load contact when opening opportunity modal
  const handleOpenOpportunityModal = async () => {
    if (!contactId) {
      toast({
        title: "Erreur",
        description: "Impossible de créer une opportunité: contact introuvable",
        variant: "destructive",
      });
      return;
    }

    setLoadingContact(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/contacts/${contactId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Contact non trouvé");
      }

      const contactData = await response.json();
      setContact(contactData);
      setIsCreateOpportunityModalOpen(true);
    } catch (error) {
      console.error("[QuickActionsSidebar] Error loading contact:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du contact",
        variant: "destructive",
      });
    } finally {
      setLoadingContact(false);
    }
  };

  // Helper function to check if client already has an acompte (by status or acompte payment)
  const hasExistingAcompte = () => {
    const hasAcompteStatus =
      client.statutProjet === "acompte_recu" ||
      client.statutProjet === "acompte_verse" ||
      client.statutProjet === "conception" ||
      client.statutProjet === "devis_negociation" ||
      client.statutProjet === "accepte" ||
      client.statutProjet === "premier_depot" ||
      client.statutProjet === "projet_en_cours" ||
      client.statutProjet === "chantier" ||
      client.statutProjet === "facture_reglee";

    // Check specifically for acompte payments, not just any payment
    const hasAcomptePayment = client.payments && client.payments.some(
      (payment) => payment.type === "accompte" || payment.type === "Acompte"
    );
    
    return hasAcompteStatus || hasAcomptePayment;
  };

  const fetchAndUpdateClient = async () => {
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        onUpdate(result.data);
        return result.data as Client;
      }
    } catch (error) {
      console.error("[QuickActionsSidebar] Failed to refresh client:", error);
    }
    return null;
  };

  const handleStageAdvance = async (targetStatus: ProjectStatus) => {
    if (!canUpdateStage) return;
    const changedBy = user?.name || "Utilisateur";

    try {
      const result = await updateClientStage(
        client.id,
        targetStatus,
        changedBy,
      );
      if (!result.success) {
        throw new Error(
          result.error || "Impossible de mettre à jour le statut",
        );
      }

      const updatedClient = await fetchAndUpdateClient();
      const statusConfig = getStatusConfig(targetStatus);

      toast({
        title: "Statut mis à jour",
        description: `Le projet est maintenant à l'étape « ${statusConfig.label} »`,
      });

      window.dispatchEvent(
        new CustomEvent("stage-updated", {
          detail: { clientId: client.id, newStatus: targetStatus, changedBy },
        }),
      );
    } catch (error) {
      console.error("[QuickActionsSidebar] Error updating stage:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le statut du projet",
        variant: "destructive",
      });
    }
  };

  const handleAddPayment = async (payment: PaymentData) => {
    const now = new Date().toISOString();
    const userName = user?.name || "Admin";

    try {
      // Determine payment type before API call
      const isFirstPayment = !hasExistingAcompte();
      const paymentType = isFirstPayment ? "accompte" : "paiement";
      const paymentTypeCapitalized = paymentType === "accompte" ? "Acompte" : "Paiement";

      // Save to database via API
      const response = await fetch(`/api/clients/${client.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          montant: payment.amount,
          date: payment.date,
          methode: payment.method,
          description: payment.notes || "",
          createdBy: userName,
          paymentType: paymentType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add payment");
      }

      const result = await response.json();
      console.log("[Add Payment] Payment created in database:", result.data);
      console.log("[Add Payment] Stage progressed:", result.stageProgressed);
      console.log("[Add Payment] New stage:", result.newStage);
      console.log("[Add Payment] Updated status:", result.updatedStatus);
      console.log("[Add Payment] Payment type from API:", result.data?.type || paymentType);
      
      // Use payment type from API response (most accurate) - normalize to lowercase for comparison
      const actualPaymentType = (result.data?.type || paymentType)?.toLowerCase();
      console.log("[Add Payment] Using payment type for toast:", actualPaymentType);

      // Small delay to ensure database has fully updated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force refresh client data to ensure payments and stage show up immediately
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
        cache: "no-store", // Ensure we get fresh data
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        console.log("[Add Payment] Updated client data:", {
          statutProjet: clientResult.data.statutProjet,
          paymentsCount: clientResult.data.payments?.length || 0,
          paymentTypes: clientResult.data.payments?.map((p: any) => ({ id: p.id, type: p.type, amount: p.amount })),
          stageProgressed: result.stageProgressed,
          expectedStage: result.newStage || result.updatedStatus,
        });

        // Verify stage was updated correctly
        if (result.stageProgressed && clientResult.data.statutProjet !== result.newStage) {
          console.warn("[Add Payment] ⚠️ Stage mismatch! Expected:", result.newStage, "Got:", clientResult.data.statutProjet);
        }

        // CRITICAL: Verify the stage was actually updated in the refreshed data
        if (result.stageProgressed && clientResult.data.statutProjet !== "acompte_recu") {
          console.error("[Add Payment] ❌ CRITICAL: Stage not updated in refreshed data!", {
            expected: "acompte_recu",
            actual: clientResult.data.statutProjet,
            stageProgressed: result.stageProgressed,
            newStage: result.newStage
          });
          
          // Force update the statutProjet if it's wrong
          clientResult.data.statutProjet = "acompte_recu";
          console.log("[Add Payment] 🔧 Forced statutProjet to acompte_recu");
        }

        // IMPORTANT: Use skipApiCall=true to prevent cascading updates and flickering
        // This prevents the parent from making another API call
        // Update immediately so Financement card and Quick Actions update
        onUpdate(clientResult.data, true);
        
        // Trigger a custom event to force re-render of all components
        // Include the updated statutProjet in the event detail
        window.dispatchEvent(new CustomEvent("client-updated", {
          detail: { 
            clientId: client.id, 
            paymentAdded: true,
            stageProgressed: result.stageProgressed,
            newStage: result.newStage || "acompte_recu",
            statutProjet: clientResult.data.statutProjet, // Include actual statutProjet
          }
        }));
        
        // Also dispatch stage-updated event for components that listen to it
        if (result.stageProgressed) {
          window.dispatchEvent(new CustomEvent("stage-updated", {
            detail: {
              clientId: client.id,
              newStatus: "acompte_recu",
              changedBy: userName,
            }
          }));
        }
      } else {
        console.error("[Add Payment] Failed to refresh client data");
      }

      setIsPaymentModalOpen(false);

      // Check if stage was auto-progressed
      const wasAutoProgressed = result.stageProgressed || false;

      // Show appropriate toast message based on ACTUAL payment type from API
      // Use actualPaymentType which comes from the API response (most accurate)
      if (actualPaymentType === "accompte") {
        toast({
          title: "Acompte reçu",
          description: wasAutoProgressed
            ? `${payment.amount.toLocaleString()} MAD ajouté avec succès. Statut changé automatiquement vers "Acompte reçu".`
            : `${payment.amount.toLocaleString()} MAD d'acompte ajouté avec succès`,
        });
      } else {
        toast({
          title: "Paiement enregistré",
          description: `${payment.amount.toLocaleString()} MAD de paiement ajouté avec succès`,
        });
      }
    } catch (error) {
      console.error("[Add Payment] Error:", error);
      toast({
        title: "Erreur",
        description:
          "Impossible d'enregistrer le paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentsAdded = async (documents: any[]) => {
    // Re-fetch client data to get updated documents and historique
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        onUpdate(result.data);

        // Trigger document update event for real-time sync
        window.dispatchEvent(
          new CustomEvent("document-updated", {
            detail: { clientId: client.id },
          }),
        );
      }
    } catch (error) {
      console.error("[Documents Added] Error refreshing client:", error);
    }
  };

  const stageCallout = (() => {
    if (!canUpdateStage) return null;
    if (client.statutProjet === "qualifie") {
      return {
        title: "Activez la prise de besoin",
        description:
          "Planifiez la découverte pour qualifier précisément le projet.",
        actionLabel: "Passer à Prise de besoin",
        gradient: "from-[#4458f1]/85 via-[#8c4af7]/80 to-[#d54dee]/85",
        icon: Wand2,
        onClick: () => handleStageAdvance("prise_de_besoin"),
      };
    }

    if (client.statutProjet === "prise_de_besoin") {
      return {
        title: "Prise de besoin validée",
        description:
          "Brief confirmé. Ajoutez l'acompte pour lancer la conception.",
        actionLabel:
          client.payments && client.payments.length > 0
            ? "Ajouter paiement"
            : "Ajouter un acompte",
        gradient: "from-[#38cfa3]/80 via-[#4ad5c4]/75 to-[#66e6f4]/80",
        icon: CheckCircle2,
        onClick: () => setIsPaymentModalOpen(true),
      };
    }

    return null;
  })();
  const CalloutIcon = stageCallout?.icon;

  return (
    <>
      <div
        className={cn(
          "rounded-2xl md:rounded-3xl border border-white/10 bg-[#161a23] p-3 md:p-4 shadow-[0_12px_24px_rgba(9,11,20,0.45)]",
          "lg:sticky lg:top-24",
        )}
      >
        <div className="mb-2.5 md:mb-3">
          <h3 className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
            Actions Rapides
          </h3>
        </div>

        {stageCallout && CalloutIcon && (
          <div className="relative mb-2.5 md:mb-3 overflow-hidden rounded-xl md:rounded-2xl border border-white/12 bg-[#181d29] px-2.5 md:px-3 py-2 md:py-2.5">
            <div
              className={`pointer-events-none absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-r ${stageCallout.gradient} opacity-18`}
            />
            <div className="relative flex items-center gap-2 md:gap-2.5">
              <div className="flex h-7 w-7 md:h-8.5 md:w-8.5 items-center justify-center rounded-md md:rounded-lg bg-white/10 text-white shadow-[0_6px_14px_rgba(12,14,20,0.4)]">
                <CalloutIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-[13px] font-semibold text-white leading-tight tracking-wide truncate">
                  {stageCallout.title}
                </p>
                <p className="mt-0.5 text-[10px] md:text-[11px] text-white/65 leading-snug line-clamp-2">
                  {stageCallout.description}
                </p>
              </div>
              <button
                type="button"
                onClick={stageCallout.onClick}
                className="inline-flex items-center gap-1 md:gap-1.5 rounded-md md:rounded-lg border border-white/20 bg-white/[0.08] px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[11px] font-semibold text-white/90 shadow-[0_6px_16px_rgba(15,18,30,0.4)] transition hover:bg-white/[0.12] shrink-0"
              >
                <ArrowRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span className="hidden sm:inline">
                  {stageCallout.actionLabel}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-2">
          {/* Create Opportunity - Only for opportunity-based clients */}
          {/* Create Opportunity - Hidden as per user request (Client view = Active Opportunity) */}
          {/* {isOpportunityClient && (
            <ActionButton
              icon={Briefcase}
              label="Créer opportunité"
              description="Ajoutez une nouvelle opportunité"
              accent="from-blue-500 via-indigo-500 to-purple-500"
              onClick={handleOpenOpportunityModal}
              disabled={loadingContact}
            />
          )} */}

          <ActionButton
            icon={MessageSquare}
            label="Ajouter note"
            description="Consignez un échange clé"
            accent="from-sky-500 via-indigo-500 to-purple-500"
            onClick={() => setIsNoteModalOpen(true)}
          />

          <ActionButton
            icon={DollarSign}
            label={
              hasExistingAcompte()
                ? "Ajouter nouveau paiement"
                : "Ajouter acompte"
            }
            description={
              hasExistingAcompte()
                ? "Enregistrez un nouveau paiement"
                : "Enregistrez un acompte"
            }
            accent="from-emerald-400 via-teal-400 to-cyan-400"
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={depositLocked}
          />

          <ActionButton
            icon={Paperclip}
            label="Documents"
            description="Partagez les pièces du dossier"
            accent="from-fuchsia-500 to-rose-500"
            onClick={() => setIsDocumentsModalOpen(true)}
          />

          <ActionButton
            icon={Paperclip}
            label="Attacher devis"
            description="Joignez un fichier de devis"
            accent="from-amber-400 to-orange-500"
            onClick={() => setIsDevisModalOpen(true)}
          />
        </div>

        {/* Delete button - only visible for Admin and Operator */}
        {hasPermission(user?.role, "clients", "delete") && (
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/5">
            <Button
              onClick={onDelete}
              className="w-full justify-start h-9 md:h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs md:text-sm"
              variant="ghost"
            >
              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 md:mr-3" />
              Supprimer client
            </Button>
          </div>
        )}
      </div>

      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        client={client}
        onSave={onUpdate}
      />

      <AddDevisModal
        isOpen={isDevisModalOpen}
        onClose={() => setIsDevisModalOpen(false)}
        client={client}
        onSave={onUpdate}
      />

      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        client={client}
        onAddPayment={handleAddPayment}
      />

      <DocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        client={client}
        onDocumentsAdded={handleDocumentsAdded}
      />

      {/* Create Opportunity Modal - Only show if contact is loaded */}
      {contact && (
        <CreateOpportunityModal
          isOpen={isCreateOpportunityModalOpen}
          onClose={() => {
            setIsCreateOpportunityModalOpen(false);
            setContact(null);
          }}
          contact={contact}
          onSuccess={async (opportunityId) => {
            // Refresh client data after opportunity creation
            const updatedClient = await fetchAndUpdateClient();
            if (updatedClient) {
              toast({
                title: "Opportunité créée",
                description: "L'opportunité a été créée avec succès et le client a été mis à jour",
              });

              // Trigger clients page refresh
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('opportunity-created', {
                  detail: { contactId: contact.id, opportunityId }
                }));
              }
            }
            setIsCreateOpportunityModalOpen(false);
            setContact(null);
          }}
        />
      )}
    </>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick: () => void;
  accent?: string;
  disabled?: boolean;
}

function ActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  accent,
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex w-full items-center gap-2 md:gap-2.5 rounded-lg md:rounded-xl border border-white/10 px-2.5 md:px-3.5 py-2 md:py-2.5 text-left transition-all duration-200",
        "bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.06]",
        "focus:outline-none focus:ring-2 focus:ring-white/15",
        disabled &&
        "cursor-not-allowed opacity-55 hover:border-white/10 hover:bg-white/[0.03]",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-md md:rounded-lg text-white shadow-[0_4px_12px_rgba(10,12,18,0.4)] transition-all duration-200",
          "bg-white/8",
          accent &&
          !disabled &&
          `bg-gradient-to-r ${accent} text-white shadow-[0_8px_18px_rgba(85,90,220,0.4)] group-hover:shadow-[0_10px_22px_rgba(85,90,220,0.5)]`,
        )}
      >
        <Icon className="h-3 w-3 md:h-3.5 md:w-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-[13px] font-semibold text-white/85 leading-tight truncate">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[10px] md:text-[11px] text-white/55 leading-snug line-clamp-1">
            {description}
          </p>
        )}
      </div>
      {!disabled && (
        <ArrowRight className="h-2.5 w-2.5 md:h-3 md:w-3 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/55 shrink-0" />
      )}
    </button>
  );
}
