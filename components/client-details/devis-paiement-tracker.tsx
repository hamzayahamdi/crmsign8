"use client"

import { useState } from "react"
import { DollarSign, CheckCircle, XCircle, AlertTriangle, TrendingUp, MoreHorizontal, CreditCard, Calendar, Trash2, Loader2 } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DevisPaiementTrackerProps {
  client: Client
  onUpdate: (client: Client, skipApiCall?: boolean) => void
}

export function DevisPaiementTracker({ client, onUpdate }: DevisPaiementTrackerProps) {
  const { toast } = useToast()
  const [updatingDevisId, setUpdatingDevisId] = useState<string | null>(null)
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

  const handleMarkPaid = async (devisId: string) => {
    const devis = client.devis?.find(d => d.id === devisId)
    if (!devis) return

    const now = new Date().toISOString()
    
    // Optimistic update
    const updatedDevis = client.devis?.map(d =>
      d.id === devisId ? { ...d, facture_reglee: true } : d
    )
    
    const optimisticClient = {
      ...client,
      devis: updatedDevis,
    }
    
    // Update UI optimistically (skipApiCall = true)
    onUpdate(optimisticClient, true)

    try {
      // Update devis in database via API
      const response = await fetch(`/api/clients/${client.id}/devis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          devisId,
          facture_reglee: true
        })
      })

      if (!response.ok) {
        // Revert optimistic update on error
        onUpdate(client, true)
        throw new Error('Failed to update devis')
      }

      // Re-fetch client data to get updated state
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include'
      })
      
      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        onUpdate(clientResult.data, true)
      }

      toast({
        title: "Facture marquée comme réglée",
        description: `Le paiement de ${formatCurrency(devis.montant)} a été enregistré`,
      })
    } catch (error) {
      console.error('[Mark Paid] Error:', error)
      // Revert to original state on error
      onUpdate(client, true)
      toast({
        title: "Erreur",
        description: "Impossible de marquer la facture comme réglée",
        variant: "destructive"
      })
    }
  }

  const updateDevisStatus = async (devisId: string, newStatus: Devis['statut']) => {
    const target = client.devis?.find(d => d.id === devisId)
    if (!target) return

    setUpdatingDevisId(devisId)
    const now = new Date().toISOString()
    
    // Optimistic update: Update UI immediately
    const next: Devis = {
      ...target,
      statut: newStatus,
      facture_reglee: newStatus === "accepte" ? (target.facture_reglee || false) : false,
      validatedAt: newStatus !== "en_attente" ? now : undefined,
    }

    const updatedDevis = client.devis?.map(d => (d.id === devisId ? next : d))
    const optimisticClient: Client = {
      ...client,
      devis: updatedDevis,
    }
    
    // Update UI optimistically (skipApiCall = true to avoid redundant API call)
    onUpdate(optimisticClient, true)

    try {
      // Update devis in database via API
      const response = await fetch(`/api/clients/${client.id}/devis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          devisId,
          statut: newStatus,
          facture_reglee: newStatus === "accepte" ? (target.facture_reglee || false) : false,
          validatedAt: newStatus !== "en_attente" ? now : null,
          createdBy: 'Utilisateur'
        })
      })

      if (!response.ok) {
        // Revert optimistic update on error
        onUpdate(client, true)
        throw new Error('Failed to update devis status')
      }

      const result = await response.json()
      
      // Re-fetch client data to get updated devis and stage
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include'
      })

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        // Update with fresh data from server (skipApiCall = true)
        onUpdate(clientResult.data, true)
        
        const statusLabel = newStatus === "accepte" ? "Accepté" : newStatus === "refuse" ? "Refusé" : "En attente"
        
        // Show appropriate toast based on stage progression
        if (result.stageProgressed) {
          toast({
            title: "Devis et statut mis à jour",
            description: `"${target.title}" → ${statusLabel}. Statut du projet changé automatiquement vers "${result.newStage}".`,
          })
        } else {
          toast({
            title: `Statut mis à jour`,
            description: `"${target.title}" → ${statusLabel}`,
          })
        }
      }
    } catch (error) {
      console.error('[Update Devis Status] Error:', error)
      // Revert to original state on error
      onUpdate(client, true)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du devis",
        variant: "destructive"
      })
    } finally {
      setUpdatingDevisId(null)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/clients/${client.id}/payments?paymentId=${paymentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to delete payment')
      }

      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include'
      })
      
      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        onUpdate(clientResult.data, true)
      }

      toast({
        title: "Acompte supprimé",
        description: "L'acompte a été supprimé avec succès",
      })
    } catch (error) {
      console.error('[Delete Payment] Error:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'acompte",
        variant: "destructive"
      })
    }
  }

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; paymentId?: string; amount?: number; date?: string }>(
    { open: false }
  )

  const paymentsList = client.payments || []
  const totalPayments = paymentsList.reduce((sum, p) => sum + p.amount, 0)

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'espece':
        return '💵'
      case 'virement':
        return '🏦'
      case 'cheque':
        return '📝'
      default:
        return '💳'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'espece':
        return 'Espèce'
      case 'virement':
        return 'Virement'
      case 'cheque':
        return 'Chèque'
      default:
        return method
    }
  }

  return (
    <div className="space-y-4">
      {/* Devis Section */}
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
                  "p-3 rounded-lg border transition-all hover:border-white/20 relative",
                  devis.statut === "accepte" && "border-green-500/30 bg-green-500/5",
                  devis.statut === "refuse" && "border-red-500/30 bg-red-500/5",
                  devis.statut === "en_attente" && "border-white/10 bg-white/5",
                  updatingDevisId === devis.id && "opacity-60 pointer-events-none"
                )}
              >
                {/* Loading overlay */}
                {updatingDevisId === devis.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs font-medium">Mise à jour...</span>
                    </div>
                  </div>
                )}
                
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

      {/* Payments Section */}
      <div className="bg-[#171B22] rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/80">💳 Acomptes</h3>
          {paymentsList.length > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-semibold text-green-400">
                {formatCurrency(totalPayments)}
              </span>
            </div>
          )}
        </div>

        {paymentsList.length > 0 ? (
          <div className="space-y-2">
            {paymentsList.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 hover:border-green-500/30 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{getPaymentMethodIcon(payment.method)}</span>
                      <h4 className="text-sm font-medium text-white">
                        {getPaymentMethodLabel(payment.method)}
                      </h4>
                      {payment.reference && (
                        <span className="text-xs text-white/40 truncate">
                          #{payment.reference}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-base font-bold text-green-400">
                        {formatCurrency(payment.amount)}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <Calendar className="w-3 h-3" />
                        {new Date(payment.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    {payment.notes && (
                      <p className="text-xs text-white/40 mt-1.5 line-clamp-1">
                        {payment.notes}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialog({ open: true, paymentId: payment.id, amount: payment.amount, date: payment.date })}
                    className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CreditCard className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/40">Aucun acompte enregistré</p>
            <p className="text-xs text-white/30 mt-1">Utilisez "Ajouter acompte" pour commencer</p>
          </div>
        )}
      </div>
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent className="bg-[#171B22] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Supprimer l'acompte ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {deleteDialog.amount !== undefined ? (
                <span>
                  Cette action est irréversible. Vous êtes sur le point de supprimer l'acompte de {new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(deleteDialog.amount)}
                  {deleteDialog.date ? ` du ${new Date(deleteDialog.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}.
                </span>
              ) : (
                <span>Cette action est irréversible. Confirmez la suppression de l'acompte.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ open: false })}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (deleteDialog.paymentId) {
                  await handleDeletePayment(deleteDialog.paymentId)
                }
                setDeleteDialog({ open: false })
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
