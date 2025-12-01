"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Search, Building2, MapPin, CheckCircle2, User, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/client"
import type { Architect } from "@/types/architect"

interface AssignDossierModalProps {
  isOpen: boolean
  onClose: () => void
  architect: Architect
  onAssign: (clientIds: string[]) => void
}

export function AssignDossierModal({ isOpen, onClose, architect, onAssign }: AssignDossierModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())

  // Load clients from localStorage
  useEffect(() => {
    if (isOpen) {
      const storedClients = localStorage.getItem("signature8-clients")
      const clientsData = storedClients ? JSON.parse(storedClients) : []
      setClients(clientsData)
      setSelectedClientIds(new Set())
      setSearchQuery("")
    }
  }, [isOpen])

  // Filter clients that are not already assigned to this architect
  const availableClients = useMemo(() => {
    return clients.filter(client => {
      const architectName = `${architect.prenom} ${architect.nom}`.toLowerCase()
      const clientArchitect = client.architecteAssigne.toLowerCase()
      return !clientArchitect.includes(architect.prenom.toLowerCase()) &&
        !clientArchitect.includes(architect.nom.toLowerCase())
    })
  }, [clients, architect])

  // Search filtered clients
  const filteredClients = useMemo(() => {
    if (!searchQuery) return availableClients

    const query = searchQuery.toLowerCase()
    return availableClients.filter(client =>
      client.nom.toLowerCase().includes(query) ||
      client.ville.toLowerCase().includes(query) ||
      client.telephone.includes(query) ||
      client.typeProjet.toLowerCase().includes(query)
    )
  }, [availableClients, searchQuery])

  const toggleClient = (clientId: string) => {
    const newSelected = new Set(selectedClientIds)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClientIds(newSelected)
  }

  const handleAssign = () => {
    if (selectedClientIds.size === 0) return
    onAssign(Array.from(selectedClientIds))
    onClose()
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    nouveau: { label: "Nouveau", color: "text-blue-400" },
    qualifie: { label: "Qualifié", color: "text-cyan-400" },
    prise_de_besoin: { label: "Prise de besoin", color: "text-indigo-400" },
    acompte_recu: { label: "Acompte reçu", color: "text-teal-400" },
    acompte_verse: { label: "Acompte versé", color: "text-cyan-400" },
    conception: { label: "Conception", color: "text-purple-400" },
    en_conception: { label: "En conception", color: "text-purple-400" },
    projet_en_cours: { label: "Projet en cours", color: "text-orange-400" },
    en_chantier: { label: "En chantier", color: "text-orange-400" },
    accepte: { label: "Accepté", color: "text-green-400" },
    livraison: { label: "Livraison", color: "text-yellow-400" },
    livraison_termine: { label: "Livraison terminée", color: "text-green-400" },
    termine: { label: "Terminé", color: "text-green-400" },
    refuse: { label: "Refusé", color: "text-red-400" },
    perdu: { label: "Perdu", color: "text-red-400" },
    annule: { label: "Annulé", color: "text-slate-400" },
    suspendu: { label: "Suspendu", color: "text-yellow-400" },
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] glass rounded-2xl border border-slate-600/30 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-600/30">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Attribuer des dossiers
                  </h2>
                  <p className="text-sm text-slate-400">
                    Sélectionnez les clients à assigner à <span className="text-primary font-medium">{architect.prenom} {architect.nom}</span>
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </motion.button>
              </div>

              {/* Search Bar */}
              <div className="mt-4 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, ville, téléphone..."
                  className="h-12 pl-12 bg-slate-800/60 border-slate-600/60 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>

              {/* Selection Counter */}
              {selectedClientIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 glass rounded-lg p-3 border border-primary/30 bg-primary/10"
                >
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">{selectedClientIds.size} dossier{selectedClientIds.size > 1 ? 's' : ''} sélectionné{selectedClientIds.size > 1 ? 's' : ''}</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="w-16 h-16 text-slate-600 mb-4" />
                  <p className="text-slate-400 text-lg font-medium mb-2">
                    {searchQuery ? "Aucun client trouvé" : "Aucun dossier disponible"}
                  </p>
                  <p className="text-slate-500 text-sm">
                    {searchQuery
                      ? "Essayez une autre recherche"
                      : "Tous les clients sont déjà assignés à cet architecte"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map((client, index) => {
                    const isSelected = selectedClientIds.has(client.id)
                    const statusInfo = statusConfig[client.statutProjet] || {
                      label: client.statutProjet,
                      color: "text-slate-400"
                    }

                    return (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => toggleClient(client.id)}
                        className={cn(
                          "glass rounded-xl p-4 border cursor-pointer transition-all duration-200",
                          isSelected
                            ? "border-primary/50 bg-primary/10"
                            : "border-slate-600/30 hover:border-slate-500/50"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="pt-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleClient(client.id)}
                              className="w-5 h-5 border-2"
                            />
                          </div>

                          {/* Client Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className="text-white font-semibold text-lg mb-1">
                                  {client.nom}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-4 h-4" />
                                    {client.typeProjet}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {client.ville}
                                  </span>
                                </div>
                              </div>
                              <span className={cn("text-sm font-medium", statusInfo.color)}>
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* Additional Info */}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Budget: {new Intl.NumberFormat("fr-MA", {
                                style: "currency",
                                currency: "MAD",
                                minimumFractionDigits: 0,
                              }).format(client.budget || 0)}</span>
                              <span>•</span>
                              <span>Tél: {client.telephone}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-600/30">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl border-slate-600/60 text-slate-300 hover:bg-slate-700/50"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={selectedClientIds.size === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl font-medium shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assigner {selectedClientIds.size > 0 && `(${selectedClientIds.size})`}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
