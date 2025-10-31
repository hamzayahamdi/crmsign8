"use client"

import { useState } from "react"
import { X, Calendar, Clock, MapPin, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import type { Client, Appointment } from "@/types/client"

interface AddRdvModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onAddRdv: (rdv: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => void
}

export function AddRdvModal({ isOpen, onClose, client, onAddRdv }: AddRdvModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: "",
    dateStart: "",
    timeStart: "",
    dateEnd: "",
    timeEnd: "",
    location: "",
    locationUrl: "",
    notes: "",
    status: "upcoming" as const
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const dateStart = `${formData.dateStart}T${formData.timeStart}`
    const dateEnd = formData.dateEnd && formData.timeEnd 
      ? `${formData.dateEnd}T${formData.timeEnd}`
      : dateStart

    const rdv: Omit<Appointment, "id" | "createdAt" | "updatedAt"> = {
      title: formData.title,
      dateStart,
      dateEnd,
      location: formData.location || undefined,
      locationUrl: formData.locationUrl || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
      clientId: client.id,
      clientName: client.nom,
      createdBy: user?.name || "Utilisateur"
    }

    onAddRdv(rdv)
    handleClose()
  }

  const handleClose = () => {
    setFormData({
      title: "",
      dateStart: "",
      timeStart: "",
      dateEnd: "",
      timeEnd: "",
      location: "",
      locationUrl: "",
      notes: "",
      status: "upcoming"
    })
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#171B22] border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Ajouter un RDV</h2>
                <p className="text-sm text-white/60 mt-1">Client: {client.nom}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Titre du RDV *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Présentation du devis, Visite chantier..."
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              {/* Date & Time Start */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date de début *
                  </label>
                  <Input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Heure de début *
                  </label>
                  <Input
                    type="time"
                    value={formData.timeStart}
                    onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Date & Time End (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Date de fin (optionnel)
                  </label>
                  <Input
                    type="date"
                    value={formData.dateEnd}
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Heure de fin (optionnel)
                  </label>
                  <Input
                    type="time"
                    value={formData.timeEnd}
                    onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Lieu
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Magasin Casa, Chantier client..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              {/* Google Maps URL */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Lien Google Maps (optionnel)
                </label>
                <Input
                  type="url"
                  value={formData.locationUrl}
                  onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Notes / Objectif du RDV
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Validation des plans, Discussion finitions..."
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Créer le RDV
                </Button>
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="ghost"
                  className="bg-white/5 hover:bg-white/10 text-white"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
