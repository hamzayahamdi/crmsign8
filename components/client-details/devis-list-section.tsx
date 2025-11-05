"use client"

import { useState } from "react"
import { FileText, Plus, CheckCircle, XCircle, Clock, DollarSign, Calendar, AlertTriangle, Loader2 } from "lucide-react"
import type { Client, Devis } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { AddDevisModal } from "./add-devis-modal"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface DevisListSectionProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function DevisListSection({ client, onUpdate }: DevisListSectionProps) {
  const [isAddingDevis, setIsAddingDevis] = useState(false)
  const [updatingDevisId, setUpdatingDevisId] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const devisList = client.devis || []
  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const pendingDevis = devisList.filter(d => d.statut === "en_attente")
  const refusedDevis = devisList.filter(d => d.statut === "refuse")

  const sortedDevis = [...acceptedDevis, ...pendingDevis, ...refusedDevis]

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

  const getStatusBadge = (statut: Devis['statut']) => {
    const statusMap = {
      accepte: { label: "Accepté", icon: CheckCircle, className: "bg-green-500/20 text-green-300 border-green-500/30" },
      refuse: { label: "Refusé", icon: XCircle, className: "bg-red-500/20 text-red-300 border-red-500/30" },
      en_attente: { label: "En attente", icon: Clock, className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
    }
    return statusMap[statut]
  }

  const handleAddDevis = () => {
    setIsAddingDevis(true)
  }

  const handleCloseModal = () => {
    setIsAddingDevis(false)
  }

  const handleSaveDevis = (updatedClient: Client) => {
    onUpdate(updatedClient)
    setIsAddingDevis(false)
  }

  const handleUpdateDevisStatus = async (devisId: string, newStatus: 'accepte' | 'refuse') => {
    setUpdatingDevisId(devisId)
    
    // Optimistic update: Update UI immediately to prevent data clearing
    const now = new Date().toISOString()
    const optimisticClient = {
      ...client,
      devis: client.devis?.map(d => 
        d.id === devisId 
          ? { ...d, statut: newStatus, validatedAt: now }
          : d
      )
    }
    
    // Update UI optimistically
    onUpdate(optimisticClient)
    
    try {
      const response = await fetch(`/api/clients/${client.id}/devis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          devisId,
          statut: newStatus,
          createdBy: user?.name || 'Admin'
        })
      })

      if (!response.ok) {
        // Revert optimistic update on error
        onUpdate(client)
        throw new Error('Failed to update devis')
      }

      const result = await response.json()
      console.log('[Devis Update] Response:', result)

      // Re-fetch client data to get updated devis and stage
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include'
      })

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        console.log('[Devis Update] 📊 Updated client data:', {
          clientId: clientResult.data.id,
          statutProjet: clientResult.data.statutProjet,
          devisCount: clientResult.data.devis?.length || 0,
          stageProgressed: result.stageProgressed,
          newStage: result.newStage
        })
        
        // Update parent component with fresh data from server
        onUpdate(clientResult.data)
        
        // Dispatch custom event to trigger UI refresh
        window.dispatchEvent(new CustomEvent('devis-updated', {
          detail: { clientId: client.id, stageProgressed: result.stageProgressed }
        }))
        
        // Show appropriate toast based on stage progression
        if (result.stageProgressed) {
          toast({
            title: "Devis et statut mis à jour",
            description: `Le devis a été ${newStatus === 'accepte' ? 'accepté' : 'refusé'}. Statut du projet changé automatiquement vers "${result.newStage}".`,
          })
        } else {
          toast({
            title: "Devis mis à jour",
            description: `Le devis a été ${newStatus === 'accepte' ? 'accepté' : 'refusé'} avec succès.`,
          })
        }
      }
    } catch (error) {
      console.error('[Devis Update] Error:', error)
      // Revert to original state on error
      onUpdate(client)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le devis. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setUpdatingDevisId(null)
    }
  }

  return (
    <>
      <div className="bg-[#171B22] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Devis</h2>
          <p className="text-sm text-white/50">
            {acceptedDevis.length} accepté{acceptedDevis.length > 1 ? 's' : ''} • {pendingDevis.length} en attente • {refusedDevis.length} refusé{refusedDevis.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={handleAddDevis}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau devis
        </Button>
      </div>

      {sortedDevis.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white/40" />
          </div>
          <p className="text-white/60 mb-4">Aucun devis pour le moment</p>
          <Button
            onClick={handleAddDevis}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer le premier devis
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sortedDevis.map((devis, index) => {
              const statusInfo = getStatusBadge(devis.statut)
              const StatusIcon = statusInfo.icon

              return (
                <motion.div
                  key={devis.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "bg-white/5 border rounded-xl p-4 hover:bg-white/[0.07] transition-colors relative",
                    devis.statut === "accepte" && "border-green-500/30",
                    devis.statut === "refuse" && "border-red-500/30",
                    devis.statut === "en_attente" && "border-yellow-500/30",
                    updatingDevisId === devis.id && "opacity-60 pointer-events-none"
                  )}
                >
                  {/* Loading overlay */}
                  {updatingDevisId === devis.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-sm z-10">
                      <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Mise à jour en cours...</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-sm font-semibold text-white">{devis.title || 'Devis sans titre'}</h4>
                        <Badge className={cn("text-xs font-semibold", statusInfo.className)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-white/40">
                          {formatDate(devis.date)}
                        </span>
                      </div>

                      {devis.description && (
                        <p className="text-sm text-white/80 mb-3">{devis.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-white font-semibold">{formatCurrency(devis.montant)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/50">
                          <Calendar className="w-4 h-4" />
                          <span>Par {devis.createdBy}</span>
                        </div>
                      </div>

                      {devis.validatedAt && (
                        <div className="mt-2 text-xs text-white/40">
                          Validé le {formatDate(devis.validatedAt)}
                        </div>
                      )}

                      {/* Facture Status for Accepted Devis */}
                      {devis.statut === "accepte" && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          {devis.facture_reglee ? (
                            <div className="flex items-center gap-2 text-xs text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">Facture réglée ✅</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-yellow-400">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="font-medium">Facture non réglée ⚠️</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {devis.statut === "en_attente" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateDevisStatus(devis.id, 'accepte')}
                            disabled={updatingDevisId === devis.id}
                            className="bg-green-600 hover:bg-green-700 text-white h-8"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            {updatingDevisId === devis.id ? 'En cours...' : 'Accepter'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateDevisStatus(devis.id, 'refuse')}
                            disabled={updatingDevisId === devis.id}
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            {updatingDevisId === devis.id ? 'En cours...' : 'Refuser'}
                          </Button>
                        </div>
                      )}
                      {devis.statut === "accepte" && !devis.facture_reglee && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const now = new Date().toISOString()
                            const updatedDevis = client.devis?.map(d =>
                              d.id === devis.id
                                ? { ...d, facture_reglee: true }
                                : d
                            )
                            onUpdate({
                              ...client,
                              devis: updatedDevis,
                              historique: [
                                {
                                  id: `hist-${Date.now()}`,
                                  date: now,
                                  type: 'acompte' as const,
                                  description: `Facture réglée pour "${devis.title}" - ${formatCurrency(devis.montant)}`,
                                  auteur: 'Admin'
                                },
                                ...(client.historique || [])
                              ],
                              derniereMaj: now,
                              updatedAt: now
                            })
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Marquer réglée
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>

      <AddDevisModal
        isOpen={isAddingDevis}
        onClose={handleCloseModal}
        client={client}
        onSave={handleSaveDevis}
      />
    </>
  )
}
