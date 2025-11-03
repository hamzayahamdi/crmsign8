"use client"

import { useState } from "react"
import { X, Calendar as CalendarIcon, Clock, MapPin, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
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
    dateStart: undefined as Date | undefined,
    timeStart: "09:00",
    dateEnd: undefined as Date | undefined,
    timeEnd: "10:00",
    location: "",
    locationUrl: "",
    notes: "",
    status: "upcoming" as const
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.dateStart) return

    const dateStart = new Date(formData.dateStart)
    const [startHours, startMinutes] = formData.timeStart.split(':').map(Number)
    dateStart.setHours(startHours, startMinutes, 0, 0)

    const dateEnd = formData.dateEnd ? new Date(formData.dateEnd) : new Date(dateStart)
    const [endHours, endMinutes] = formData.timeEnd.split(':').map(Number)
    dateEnd.setHours(endHours, endMinutes, 0, 0)

    const dateStartISO = dateStart.toISOString()
    const dateEndISO = dateEnd.toISOString()

    const rdv: Omit<Appointment, "id" | "createdAt" | "updatedAt"> = {
      title: formData.title,
      dateStart: dateStartISO,
      dateEnd: dateEndISO,
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
      dateStart: undefined,
      timeStart: "09:00",
      dateEnd: undefined,
      timeEnd: "10:00",
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
                    <CalendarIcon className="w-4 h-4 inline mr-2" />
                    Date de début *
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
                          !formData.dateStart && "text-white/40"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dateStart ? (
                          format(formData.dateStart, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#171B22] border-white/10">
                      <Calendar
                        mode="single"
                        selected={formData.dateStart}
                        onSelect={(date) => setFormData({ ...formData, dateStart: date })}
                        initialFocus
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
                          !formData.dateEnd && "text-white/40"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dateEnd ? (
                          format(formData.dateEnd, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#171B22] border-white/10">
                      <Calendar
                        mode="single"
                        selected={formData.dateEnd}
                        onSelect={(date) => setFormData({ ...formData, dateEnd: date })}
                        initialFocus
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
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
