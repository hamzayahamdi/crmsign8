"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  MoreHorizontal,
  CreditCard,
  Calendar,
  Trash2,
  Loader2,
  FileText,
  Info,
  Clock,
  Wallet,
  Pencil,
  File,
  Image,
  ExternalLink,
} from "lucide-react";
import type { Client, Devis } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditMontantModal } from "./edit-montant-modal";
import { EditPaymentModal } from "@/components/edit-payment-modal";
import { useAuth } from "@/contexts/auth-context";
import { getDevisDisplayName } from "@/lib/file-utils";

interface FinancementDocumentsUnifiedProps {
  client: Client;
  onUpdate: (client: Client, skipApiCall?: boolean) => void;
}

export function FinancementDocumentsUnified({
  client,
  onUpdate,
}: FinancementDocumentsUnifiedProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [updatingDevisId, setUpdatingDevisId] = useState<string | null>(null);
  const [editingMontantDevis, setEditingMontantDevis] = useState<Devis | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"devis" | "paiements">("devis");
  const devisList = client.devis || [];
  const paymentsList = client.payments || [];

  // Debug: Log when devis changes
  useEffect(() => {
    console.log('[FinancementDocumentsUnified] Client data updated:', {
      clientId: client.id,
      devisCount: devisList.length,
      paymentsCount: paymentsList.length,
      historiqueCount: client.historique?.length || 0,
      devisList: devisList.map(d => ({ id: d.id, title: d.title, statut: d.statut }))
    })
  }, [client.id, devisList.length, paymentsList.length])

  // Calculate financial metrics
  const acceptedDevis = devisList.filter((d) => d.statut === "accepte");
  const refusedDevis = devisList.filter((d) => d.statut === "refuse");
  const totalAccepted = acceptedDevis.reduce((sum, d) => sum + d.montant, 0);
  const totalPaid = acceptedDevis
    .filter((d) => d.facture_reglee)
    .reduce((sum, d) => sum + d.montant, 0);
  const totalPayments = paymentsList.reduce((sum, p) => sum + p.amount, 0);
  const progress =
    totalAccepted > 0 ? Math.round((totalPaid / totalAccepted) * 100) : 0;
  const remainingAmount = totalAccepted - totalPaid;

  // Check if all devis are refused
  const allRefused =
    devisList.length > 0 && devisList.every((d) => d.statut === "refuse");

  // Check if at least one devis is accepted
  const hasAcceptedDevis = acceptedDevis.length > 0;

  // Check if all accepted devis are paid
  const allPaid =
    acceptedDevis.length > 0 && acceptedDevis.every((d) => d.facture_reglee);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleMarkPaid = async (devisId: string) => {
    const devis = client.devis?.find((d) => d.id === devisId);
    if (!devis) return;

    const now = new Date().toISOString();

    // Optimistic update
    const updatedDevis = client.devis?.map((d) =>
      d.id === devisId ? { ...d, facture_reglee: true } : d,
    );

    const optimisticClient = {
      ...client,
      devis: updatedDevis,
    };

    // Update UI optimistically (skipApiCall = true)
    onUpdate(optimisticClient, true);

    try {
      // Update devis in database via API
      const response = await fetch(`/api/clients/${client.id}/devis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          devisId,
          facture_reglee: true,
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        onUpdate(client, true);
        throw new Error("Failed to update devis");
      }

      // Re-fetch client data to get updated state
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        onUpdate(clientResult.data, true);
      }

      toast({
        title: "Facture marquée comme réglée",
        description: `Le paiement de ${formatCurrency(devis.montant)} a été enregistré`,
      });
    } catch (error) {
      console.error("[Mark Paid] Error:", error);
      // Revert to original state on error
      onUpdate(client, true);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la facture comme réglée",
        variant: "destructive",
      });
    }
  };

  const updateDevisStatus = async (
    devisId: string,
    newStatus: Devis["statut"],
  ) => {
    const target = client.devis?.find((d) => d.id === devisId);
    if (!target) return;

    setUpdatingDevisId(devisId);
    const now = new Date().toISOString();

    // Optimistic update: Update UI immediately
    const next: Devis = {
      ...target,
      statut: newStatus,
      facture_reglee:
        newStatus === "accepte" ? target.facture_reglee || false : false,
      validatedAt: newStatus !== "en_attente" ? now : undefined,
    };

    const updatedDevis = client.devis?.map((d) =>
      d.id === devisId ? next : d,
    );
    const optimisticClient: Client = {
      ...client,
      devis: updatedDevis,
    };

    // Update UI optimistically (skipApiCall = true to avoid redundant API call)
    onUpdate(optimisticClient, true);

    try {
      // Update devis in database via API
      const response = await fetch(`/api/clients/${client.id}/devis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          devisId,
          statut: newStatus,
          facture_reglee:
            newStatus === "accepte" ? target.facture_reglee || false : false,
          validatedAt: newStatus !== "en_attente" ? now : null,
          createdBy: user?.name || "Utilisateur",
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        onUpdate(client, true);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update devis status");
      }

      const result = await response.json();
      console.log('[Update Devis Status] API Response:', result);

      // Re-fetch client data to get updated devis and stage
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        console.log('[Update Devis Status] Updated client data:', {
          statutProjet: clientResult.data.statutProjet,
          devisCount: clientResult.data.devis?.length || 0,
          devisStatuses: clientResult.data.devis?.map((d: Devis) => ({ id: d.id, statut: d.statut, title: d.title }))
        });
        
        // Update with fresh data from server (skipApiCall = true)
        onUpdate(clientResult.data, true);

        const statusLabel =
          newStatus === "accepte"
            ? "Accepté"
            : newStatus === "refuse"
              ? "Refusé"
              : "En attente";

        // Show appropriate toast based on stage progression
        if (result.stageProgressed && result.newStage) {
          toast({
            title: "Devis et statut mis à jour",
            description: `"${target.title}" → ${statusLabel}. Statut du projet changé automatiquement vers "${result.newStage}".`,
          });
        } else {
          toast({
            title: `Statut mis à jour`,
            description: `"${target.title}" → ${statusLabel}`,
          });
        }
      } else {
        console.error('[Update Devis Status] Failed to fetch updated client data');
        // Still show success toast even if refresh fails
        const statusLabel =
          newStatus === "accepte"
            ? "Accepté"
            : newStatus === "refuse"
              ? "Refusé"
              : "En attente";
        toast({
          title: `Statut mis à jour`,
          description: `"${target.title}" → ${statusLabel}`,
        });
      }
    } catch (error) {
      console.error("[Update Devis Status] Error:", error);
      // Revert to original state on error
      onUpdate(client, true);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du devis",
        variant: "destructive",
      });
    } finally {
      setUpdatingDevisId(null);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const response = await fetch(
        `/api/clients/${client.id}/payments?paymentId=${paymentId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete payment");
      }

      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        onUpdate(clientResult.data, true);
      }

      toast({
        title: "Acompte supprimé",
        description: "L'acompte a été supprimé avec succès",
      });
    } catch (error) {
      console.error("[Delete Payment] Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'acompte",
        variant: "destructive",
      });
    }
  };

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    paymentId?: string;
    amount?: number;
    date?: string;
  }>({ open: false });

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "espece":
        return "💵";
      case "virement":
        return "🏦";
      case "cheque":
        return "📝";
      default:
        return "💳";
    }
  };

  const handleUpdatePayment = async (updatedPayment: any) => {
    try {
      // Refresh client data to get updated payment
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        onUpdate(clientResult.data, true);
        toast({
          title: "Paiement mis à jour",
          description: "Le paiement a été modifié avec succès",
        });
      }
    } catch (error) {
      console.error("[Update Payment] Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le paiement",
        variant: "destructive",
      });
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "espece":
        return "Espèce";
      case "virement":
        return "Virement";
      case "cheque":
        return "Chèque";
      default:
        return method;
    }
  };

  return (
    <div className="bg-[#171B22] rounded-lg border border-white/5">
      {/* Simple Header */}
      <div className="p-3 pb-0">
        <h3 className="text-xs font-light text-white/90 flex items-center gap-2 mb-3 tracking-wide uppercase">
          <Wallet className="w-4 h-4 text-emerald-400" />
          Financement
        </h3>
      </div>

      {/* Tabs for Devis and Paiements */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "devis" | "paiements")}
        className="w-full"
      >
        <div className="px-3">
          <TabsList className="inline-flex bg-white/5 p-0.5 rounded-md h-auto gap-0.5">
            <TabsTrigger
              value="devis"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-white/50 hover:text-white/80 hover:bg-white/8 rounded-md py-1.5 px-3 transition-all text-xs font-light"
            >
              <FileText className="w-3 h-3 mr-1.5" />
              <span>Devis</span>
              {devisList.length > 0 && (
                <span className="ml-1.5 px-1 py-0.5 rounded-full bg-white/15 text-white text-[9px] font-light">
                  {devisList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="paiements"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-white/50 hover:text-white/80 hover:bg-white/8 rounded-md py-1.5 px-3 transition-all text-xs font-light"
            >
              <CreditCard className="w-3 h-3 mr-1.5" />
              <span>Paiements</span>
              {paymentsList.length > 0 && (
                <span className="ml-1.5 px-1 py-0.5 rounded-full bg-white/15 text-white text-[9px] font-light">
                  {paymentsList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Devis Tab Content */}
        <TabsContent value="devis" className="p-3 pt-2 mt-0">
          <div className="space-y-2">
            {/* Compact Warning - Only critical */}
            {allRefused && (
              <div className="mb-2.5 px-2.5 py-1.5 bg-red-500/8 border border-red-500/15 rounded-md flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-red-400" />
                <p className="text-[10px] text-red-300/90 font-light">Tous les devis refusés</p>
              </div>
            )}

            {/* Devis List - Simplified */}
            {devisList.length > 0 ? (
              <div className="space-y-2.5">
                {devisList.map((devis) => {
                  // Get clean, readable display name
                  const displayName = getDevisDisplayName(devis)
                  
                  // Extract file extension for icon
                  const fileName = devis.fichier ? devis.fichier.split('/').pop() || '' : ''
                  const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)
                  const isPdf = fileExt === 'pdf'
                  const isDoc = ['doc', 'docx'].includes(fileExt)
                  const isExcel = ['xls', 'xlsx'].includes(fileExt)
                  
                  const getFileIcon = () => {
                    if (isPdf) return <FileText className="w-5 h-5 text-red-400" />
                    if (isImage) return <Image className="w-5 h-5 text-blue-400" />
                    if (isDoc) return <FileText className="w-5 h-5 text-blue-500" />
                    if (isExcel) return <FileText className="w-5 h-5 text-green-500" />
                    return <File className="w-5 h-5 text-amber-400" />
                  }

                  const handleOpenFile = async (e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (!devis.fichier || updatingDevisId) return

                    try {
                      let fileUrl = devis.fichier

                      // If it's a path (not a full URL), get signed URL
                      if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
                        const response = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(fileUrl)}`)
                        const data = await response.json()
                        if (data.url) {
                          fileUrl = data.url
                        } else {
                          throw new Error('Impossible d\'obtenir l\'URL du fichier')
                        }
                      }

                      // Open in new tab
                      window.open(fileUrl, '_blank', 'noopener,noreferrer')
                    } catch (error: any) {
                      console.error('[Open Devis File] Error:', error)
                      toast({
                        title: "Erreur",
                        description: "Impossible d'ouvrir le fichier. Veuillez réessayer.",
                        variant: "destructive",
                      })
                    }
                  }

                  return (
                    <motion.div
                      key={devis.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "p-3 rounded-lg border transition-all hover:shadow-sm hover:shadow-white/3 relative group",
                        devis.statut === "accepte" &&
                        "border-green-500/15 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/20",
                        devis.statut === "refuse" &&
                        "border-red-500/15 bg-gradient-to-br from-red-500/5 to-transparent hover:border-red-500/20",
                        devis.statut === "en_attente" &&
                        "border-white/5 bg-gradient-to-br from-white/3 to-transparent hover:border-amber-500/20",
                        updatingDevisId === devis.id &&
                        "opacity-60 pointer-events-none"
                      )}
                    >
                      {/* Loading overlay */}
                      {updatingDevisId === devis.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md backdrop-blur-sm z-10">
                          <div className="flex items-center gap-2 bg-blue-600 text-white px-2.5 py-1 rounded-md shadow-sm">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-[10px] font-light">
                              Mise à jour...
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        {/* File Icon */}
                        <div className={cn(
                          "flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center border transition-all",
                          devis.statut === "accepte" && "bg-green-500/10 border-green-500/20",
                          devis.statut === "refuse" && "bg-red-500/10 border-red-500/20",
                          devis.statut === "en_attente" && "bg-amber-500/10 border-amber-500/20"
                        )}>
                          {getFileIcon()}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-xs font-light text-white/90 truncate" title={displayName}>
                              {displayName}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap">
                            {devis.statut === "accepte" && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/20">
                                <CheckCircle className="w-2.5 h-2.5 text-green-400" />
                                <span className="text-[9px] font-light text-green-400">
                                  Accepté
                                </span>
                              </div>
                            )}
                            {devis.statut === "refuse" && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/20">
                                <XCircle className="w-2.5 h-2.5 text-red-400" />
                                <span className="text-[9px] font-light text-red-400">
                                  Refusé
                                </span>
                              </div>
                            )}
                            {devis.statut === "en_attente" && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                <span className="text-[9px] font-light text-amber-400">
                                  En attente
                                </span>
                              </div>
                            )}
                            
                            {devis.montant > 0 && (
                              <div className="flex items-center gap-1 group/montant">
                                <DollarSign className="w-3 h-3 text-white/35" />
                                <span className="text-[10px] text-white/70 font-light">
                                  {formatCurrency(devis.montant)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingMontantDevis(devis)
                                  }}
                                  className="h-4 w-4 opacity-0 group-hover/montant:opacity-100 transition-opacity text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                  title="Modifier le montant"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            )}
                            
                            {devis.statut === "accepte" && (
                              <span
                                className={cn(
                                  "text-[10px] font-light",
                                  devis.facture_reglee
                                    ? "text-green-400"
                                    : "text-orange-400",
                                )}
                              >
                                {devis.facture_reglee
                                  ? "✓ Réglé"
                                  : "⏳ En attente"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div 
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Visualiser File Button - Always visible if file exists */}
                          {devis.fichier && (
                            <Button
                              size="sm"
                              onClick={handleOpenFile}
                              disabled={updatingDevisId === devis.id}
                              className="h-7 px-2.5 text-[10px] bg-gradient-to-r from-amber-500/90 to-orange-500/90 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm border border-amber-400/20 font-light"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Visualiser
                            </Button>
                          )}

                          {devis.statut === "accepte" &&
                            !devis.facture_reglee && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkPaid(devis.id)
                                }}
                                disabled={updatingDevisId === devis.id}
                                className="h-7 px-2.5 text-[10px] bg-green-600/90 hover:bg-green-600 text-white shadow-sm font-light"
                              >
                                Régler
                              </Button>
                            )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                                disabled={updatingDevisId === devis.id}
                                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-[160px] bg-[#171B22] border-white/10"
                            >
                              {devis.statut !== "accepte" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateDevisStatus(devis.id, "accepte")
                                  }
                                  className="text-sm text-white hover:bg-white/10"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-2" />
                                  Accepter
                                </DropdownMenuItem>
                              )}
                              {devis.statut !== "refuse" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateDevisStatus(devis.id, "refuse")
                                  }
                                  className="text-sm text-white hover:bg-white/10"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-2" />
                                  Refuser
                                </DropdownMenuItem>
                              )}
                              {devis.statut !== "en_attente" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateDevisStatus(devis.id, "en_attente")
                                  }
                                  className="text-sm text-white hover:bg-white/10"
                                >
                                  <Clock className="w-3.5 h-3.5 mr-2" />
                                  En attente
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-[10px] text-white/35 font-light">Aucun devis</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Paiements Tab Content */}
        <TabsContent value="paiements" className="p-3 pt-2 mt-0">
          <div className="space-y-2">
            {paymentsList.length > 0 ? (
              <div className="space-y-2">
                {paymentsList.map((payment) => {
                  const isAcompte = payment.type === "accompte";
                  return (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-2.5 rounded-md border transition-all group",
                        isAcompte
                          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 hover:border-emerald-500/40"
                          : "border-green-500/15 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/20"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-base shrink-0",
                            isAcompte ? "bg-emerald-500/20" : "bg-green-500/15"
                          )}>
                            {getPaymentMethodIcon(payment.method)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-light text-white/90">
                                {getPaymentMethodLabel(payment.method)}
                              </h4>
                              {isAcompte && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-light bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Acompte
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <p className={cn(
                                "text-sm font-light",
                                isAcompte ? "text-emerald-400" : "text-green-400"
                              )}>
                                {formatCurrency(payment.amount)}
                              </p>
                              <div className="flex items-center gap-1 text-[9px] text-white/45 font-light">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(payment.date).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </div>
                              {payment.notes && (
                                <span className="text-[9px] text-white/40 font-light flex items-center gap-0.5">
                                  💬 {payment.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingPayment(payment)}
                            className="h-6 w-6 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Modifier"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                paymentId: payment.id,
                                amount: payment.amount,
                                date: payment.date,
                              })
                            }
                            className="h-6 w-6 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-[10px] text-white/35 font-light">
                  Aucun paiement enregistré
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="bg-[#171B22] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Supprimer l'acompte ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {deleteDialog.amount !== undefined ? (
                <span>
                  Cette action est irréversible. Vous êtes sur le point de
                  supprimer l'acompte de {formatCurrency(deleteDialog.amount)}
                  {deleteDialog.date
                    ? ` du ${new Date(deleteDialog.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`
                    : ""}
                  .
                </span>
              ) : (
                <span>
                  Cette action est irréversible. Confirmez la suppression de
                  l'acompte.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ open: false })}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (deleteDialog.paymentId) {
                  await handleDeletePayment(deleteDialog.paymentId);
                }
                setDeleteDialog({ open: false });
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingMontantDevis && (
        <EditMontantModal
          isOpen={!!editingMontantDevis}
          onClose={() => setEditingMontantDevis(null)}
          client={client}
          devis={editingMontantDevis}
          onSave={(updatedClient, skipApiCall) => {
            onUpdate(updatedClient, skipApiCall)
            setEditingMontantDevis(null)
          }}
        />
      )}

      {editingPayment && (
        <EditPaymentModal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          client={client}
          payment={editingPayment}
          onUpdatePayment={handleUpdatePayment}
        />
      )}
    </div>
  );
}
