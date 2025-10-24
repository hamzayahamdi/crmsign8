"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { X, Phone, Mail, MapPin, Building2, User, Calendar, Edit, MessageCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ClientDetailPanelProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (client: Client) => void
  onCall?: (client: Client) => void
  onWhatsApp?: (client: Client) => void
  onMarkComplete?: (client: Client) => void
}

const statutConfig = {
  en_conception: { label: "En conception", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  en_travaux: { label: "En travaux", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  termine: { label: "Terminé", color: "bg-green-500/20 text-green-400 border-green-500/40" },
}

export function ClientDetailPanel({
  client,
  isOpen,
  onClose,
  onEdit,
  onCall,
  onWhatsApp,
  onMarkComplete
}: ClientDetailPanelProps) {
  if (!client) return null

  const statutInfo = statutConfig[client.statutProjet]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatProjectType = (type: string) => {
    const types: Record<string, string> = {
      appartement: "Appartement",
      villa: "Villa",
      magasin: "Magasin",
      bureau: "Bureau",
      riad: "Riad",
      studio: "Studio",
      autre: "Autre"
    }
    return types[type] || type
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
    }).format(amount)
  }

  const handleCall = () => {
    window.location.href = `tel:${client.telephone}`
    onCall?.(client)
  }

  const handleWhatsApp = () => {
    const phoneNumber = client.telephone.replace(/\s+/g, '').replace(/^0/, '212')
    window.open(`https://wa.me/${phoneNumber}`, '_blank')
    onWhatsApp?.(client)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[oklch(22%_0.03_260)] border-l border-slate-600/30 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="glass border-b border-slate-600/30 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-premium flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold text-white">
                      {client.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{client.nom}</h2>
                    <Badge className={cn("border text-xs font-medium px-2.5 py-1", statutInfo.color)}>
                      {statutInfo.label}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-slate-700/50 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    onClick={() => onEdit(client)}
                    className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}
                <Button
                  onClick={handleCall}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Appeler
                </Button>
                <Button
                  onClick={handleWhatsApp}
                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                {client.statutProjet !== 'termine' && onMarkComplete && (
                  <Button
                    onClick={() => onMarkComplete(client)}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Terminé
                  </Button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informations détaillées */}
              <div className="glass rounded-2xl p-6 border border-slate-600/30">
                <h3 className="text-lg font-semibold text-white mb-4">Informations détaillées</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 mb-1">Téléphone</p>
                      <p className="text-sm font-medium text-white">{client.telephone}</p>
                    </div>
                  </div>

                  {client.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">Email</p>
                        <p className="text-sm font-medium text-white">{client.email}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 mb-1">Ville</p>
                      <p className="text-sm font-medium text-white">{client.ville}</p>
                    </div>
                  </div>

                  {client.adresse && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">Adresse complète</p>
                        <p className="text-sm font-medium text-white">{client.adresse}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 mb-1">Type de projet</p>
                      <p className="text-sm font-medium text-white">{formatProjectType(client.typeProjet)}</p>
                    </div>
                  </div>

                  {client.budget && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">Budget</p>
                        <p className="text-sm font-medium text-white">{formatCurrency(client.budget)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Architecte responsable */}
              <div className="glass rounded-2xl p-6 border border-slate-600/30">
                <h3 className="text-lg font-semibold text-white mb-4">Architecte responsable</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{client.architecteAssigne}</p>
                    <p className="text-xs text-slate-400">Architecte assigné</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="glass rounded-2xl p-6 border border-slate-600/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              {/* Historique */}
              <div className="glass rounded-2xl p-6 border border-slate-600/30">
                <h3 className="text-lg font-semibold text-white mb-4">Historique</h3>
                {client.historique && client.historique.length > 0 ? (
                  <div className="space-y-4">
                    {client.historique.map((entry) => (
                      <div key={entry.id} className="flex gap-3 pb-4 border-b border-slate-600/30 last:border-0 last:pb-0">
                        <div className="shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-white">{entry.description}</p>
                            <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                          </div>
                          <p className="text-xs text-slate-400">Par {entry.auteur}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Aucun historique disponible</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="glass rounded-2xl p-6 border border-slate-600/30">
                <h3 className="text-lg font-semibold text-white mb-4">Informations système</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Créé le</span>
                    <span className="text-white">{formatDate(client.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dernière mise à jour</span>
                    <span className="text-white">{formatDate(client.derniereMaj)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
