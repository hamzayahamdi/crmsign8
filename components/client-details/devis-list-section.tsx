"use client"

import { useState } from "react"
import { FileText, Plus, CheckCircle, XCircle, Clock, DollarSign, Calendar, AlertTriangle } from "lucide-react"
import type { Client, Devis } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { AddDevisModal } from "./add-devis-modal"

interface DevisListSectionProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function DevisListSection({ client, onUpdate }: DevisListSectionProps) {
  const [isAddingDevis, setIsAddingDevis] = useState(false)

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
                    "bg-white/5 border rounded-xl p-4 hover:bg-white/[0.07] transition-colors",
                    devis.statut === "accepte" && "border-green-500/30",
                    devis.statut === "refuse" && "border-red-500/30",
                    devis.statut === "en_attente" && "border-yellow-500/30"
                  )}
                >
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
                            onClick={() => {
                              const now = new Date().toISOString()
                              const updatedDevis = client.devis?.map(d =>
                                d.id === devis.id
                                  ? { ...d, statut: "accepte" as const, validatedAt: now, facture_reglee: false }
                                  : d
                              )
                              onUpdate({
                                ...client,
                                devis: updatedDevis,
                                derniereMaj: now,
                                updatedAt: now
                              })
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white h-8"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const now = new Date().toISOString()
                              const updatedDevis = client.devis?.map(d =>
                                d.id === devis.id
                                  ? { ...d, statut: "refuse" as const, validatedAt: now }
                                  : d
                              )
                              onUpdate({
                                ...client,
                                devis: updatedDevis,
                                derniereMaj: now,
                                updatedAt: now
                              })
                            }}
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Refuser
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
