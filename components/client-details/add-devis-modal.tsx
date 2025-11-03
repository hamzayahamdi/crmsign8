"use client"

import { useState } from "react"
import { X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import type { Client, Devis } from "@/types/client"
import { syncClientStatusFrom } from "@/lib/client-sync"

interface AddDevisModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onSave: (client: Client) => void
}

export function AddDevisModal({ isOpen, onClose, client, onSave }: AddDevisModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    montant: "",
    description: "",
    statut: "en_attente" as Devis['statut']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newDevis: Devis = {
      id: `devis-${Date.now()}`,
      title: formData.title,
      montant: parseFloat(formData.montant),
      date: new Date().toISOString(),
      statut: formData.statut,
      facture_reglee: false,
      description: formData.description,
      createdBy: "current-user",
      createdAt: new Date().toISOString()
    }

    const updatedClient = {
      ...client,
      devis: [...(client.devis || []), newDevis],
      derniereMaj: new Date().toISOString()
    }

    onSave(updatedClient)
    // Centralized sync: ensure statutProjet updates based on devis
    syncClientStatusFrom(updatedClient)
    setFormData({ title: "", montant: "", description: "", statut: "en_attente" })
    onClose()
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Nouveau Devis</h2>
                  <p className="text-sm text-white/50">Créer un devis pour {client.nom}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-white mb-2 block">
                  Titre du devis *
                </Label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Devis cuisine + salon"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div>
                <Label htmlFor="montant" className="text-white mb-2 block">
                  Montant (MAD) *
                </Label>
                <Input
                  id="montant"
                  type="number"
                  step="0.01"
                  required
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  placeholder="Ex: 2500000"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div>
                <Label htmlFor="statut" className="text-white mb-2 block">
                  Statut
                </Label>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => setFormData({ ...formData, statut: value as Devis['statut'] })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171B22] border-white/10">
                    <SelectItem value="en_attente" className="text-white">En attente</SelectItem>
                    <SelectItem value="accepte" className="text-white">Accepté</SelectItem>
                    <SelectItem value="refuse" className="text-white">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description" className="text-white mb-2 block">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails du devis..."
                  rows={4}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Créer le devis
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
