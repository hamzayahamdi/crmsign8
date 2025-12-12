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

interface FinancementDocumentsUnifiedProps {
  client: Client;
  onUpdate: (client: Client, skipApiCall?: boolean) => void;
}

export function FinancementDocumentsUnified({
  client,
  onUpdate,
}: FinancementDocumentsUnifiedProps) {
  const { toast } = useToast();
  const [updatingDevisId, setUpdatingDevisId] = useState<string | null>(null);
  const [editingMontantDevis, setEditingMontantDevis] = useState<Devis | null>(null);
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
          createdBy: "Utilisateur",
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        onUpdate(client, true);
        throw new Error("Failed to update devis status");
      }

      const result = await response.json();

      // Re-fetch client data to get updated devis and stage
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        // Update with fresh data from server (skipApiCall = true)
        onUpdate(clientResult.data, true);

        const statusLabel =
          newStatus === "accepte"
            ? "Accepté"
            : newStatus === "refuse"
              ? "Refusé"
              : "En attente";

        // Show appropriate toast based on stage progression
        if (result.stageProgressed) {
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
    <div className="bg-[#171B22] rounded-xl border border-white/10">
      {/* Simple Header */}
      <div className="p-4 pb-0">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-emerald-400" />
          Financement
        </h3>
      </div>

      {/* Tabs for Devis and Paiements */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "devis" | "paiements")}
        className="w-full"
      >
        <div className="px-4">
          <TabsList className="inline-flex bg-white/5 p-1 rounded-lg h-auto gap-1">
            <TabsTrigger
              value="devis"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20 text-white/60 hover:text-white/90 hover:bg-white/10 rounded-md py-2 px-4 transition-all"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-sm font-medium">Devis</span>
              {devisList.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold">
                  {devisList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="paiements"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-600/20 text-white/60 hover:text-white/90 hover:bg-white/10 rounded-md py-2 px-4 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-sm font-medium">Paiements</span>
              {paymentsList.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold">
                  {paymentsList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Devis Tab Content */}
        <TabsContent value="devis" className="p-4 pt-3 mt-0">
          <div className="space-y-2">
            {/* Compact Warning - Only critical */}
            {allRefused && (
              <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <p className="text-xs text-red-300">Tous les devis refusés</p>
              </div>
            )}

            {/* Devis List - Simplified */}
            {devisList.length > 0 ? (
              <div className="space-y-2.5">
                {devisList.map((devis) => {
                  // Extract file name from fichier path or use title
                  const getFileName = () => {
                    if (devis.fichier) {
                      const parts = devis.fichier.split('/')
                      return parts[parts.length - 1] || devis.title
                    }
                    return devis.title
                  }
                  
                  const fileName = getFileName()
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
                        "p-4 rounded-xl border transition-all hover:shadow-lg hover:shadow-white/5 relative group",
                        devis.statut === "accepte" &&
                        "border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/30",
                        devis.statut === "refuse" &&
                        "border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent hover:border-red-500/30",
                        devis.statut === "en_attente" &&
                        "border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:border-amber-500/30",
                        updatingDevisId === devis.id &&
                        "opacity-60 pointer-events-none"
                      )}
                    >
                      {/* Loading overlay */}
                      {updatingDevisId === devis.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm z-10">
                          <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs font-medium">
                              Mise à jour...
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        {/* File Icon */}
                        <div className={cn(
                          "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all",
                          devis.statut === "accepte" && "bg-green-500/10 border-green-500/30",
                          devis.statut === "refuse" && "bg-red-500/10 border-red-500/30",
                          devis.statut === "en_attente" && "bg-amber-500/10 border-amber-500/30"
                        )}>
                          {getFileIcon()}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="text-sm font-semibold text-white truncate">
                              {devis.title}
                            </h4>
                          </div>
                          
                          {devis.fichier && (
                            <p className="text-xs text-white/60 truncate mb-2 flex items-center gap-1.5">
                              <File className="w-3 h-3" />
                              {fileName}
                            </p>
                          )}

                          <div className="flex items-center gap-3 flex-wrap">
                            {devis.statut === "accepte" && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-[10px] font-medium text-green-400">
                                  Accepté
                                </span>
                              </div>
                            )}
                            {devis.statut === "refuse" && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
                                <XCircle className="w-3 h-3 text-red-400" />
                                <span className="text-[10px] font-medium text-red-400">
                                  Refusé
                                </span>
                              </div>
                            )}
                            {devis.statut === "en_attente" && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span className="text-[10px] font-medium text-amber-400">
                                  En attente
                                </span>
                              </div>
                            )}
                            
                            {devis.montant > 0 && (
                              <div className="flex items-center gap-1.5 group/montant">
                                <DollarSign className="w-3.5 h-3.5 text-white/40" />
                                <span className="text-xs text-white/70 font-medium">
                                  {formatCurrency(devis.montant)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingMontantDevis(devis)
                                  }}
                                  className="h-5 w-5 opacity-0 group-hover/montant:opacity-100 transition-opacity text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                  title="Modifier le montant"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            
                            {devis.statut === "accepte" && (
                              <span
                                className={cn(
                                  "text-xs font-medium",
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
                              className="h-8 px-3 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20 border border-amber-400/30"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
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
                                className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm"
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
                <FileText className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/40">Aucun devis</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Paiements Tab Content */}
        <TabsContent value="paiements" className="p-4 pt-3 mt-0">
          <div className="space-y-2">
            {paymentsList.length > 0 ? (
              <div className="space-y-2.5">
                {paymentsList.map((payment) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">
                            {getPaymentMethodIcon(payment.method)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-white">
                                {getPaymentMethodLabel(payment.method)}
                              </h4>
                              {payment.type === "accompte" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Acompte
                                </span>
                              )}
                            </div>
                            {payment.reference && (
                              <span className="text-[10px] text-white/40 truncate">
                                Réf: {payment.reference}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap ml-10">
                          <p className="text-lg font-bold text-green-400">
                            {formatCurrency(payment.amount)}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-white/50">
                            <Calendar className="w-3 h-3" />
                            {new Date(payment.date).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </div>
                        </div>

                        {payment.notes && (
                          <p className="text-xs text-white/40 mt-2 ml-10 line-clamp-1">
                            💬 {payment.notes}
                          </p>
                        )}
                      </div>

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
                        className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/40">
                  Aucun paiement enregistré
                </p>
                <p className="text-xs text-white/30 mt-1">
                  Utilisez le bouton "Ajouter paiement" pour enregistrer des
                  paiements
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
    </div>
  );
}
