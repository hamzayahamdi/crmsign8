"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Phone, MapPin, Home, Tag, Users, Loader2, Sparkles, ArrowRight, FileText, DollarSign } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Contact, OpportunityType } from "@/types/contact"
import type { Architect } from "@/types/architect"
import { ArchitectSelectionDialog } from "@/components/architect-selection-dialog-improved"

interface CreateOpportunityModalProps {
  isOpen: boolean
  onClose: () => void
  contact: Contact
  onSuccess?: (opportunityId: string) => void
}

export function CreateOpportunityModal({
  isOpen,
  onClose,
  contact,
  onSuccess,
}: CreateOpportunityModalProps) {
  const [architects, setArchitects] = useState<Architect[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [propertyType, setPropertyType] = useState<OpportunityType>("autre")
  const [architectDialogOpen, setArchitectDialogOpen] = useState(false)

  // Form state
  const [nomOportunite, setNomOportunite] = useState("")
  const [description, setDescription] = useState("")
  const [montantEstime, setMontantEstime] = useState("")
  const [architectId, setArchitectId] = useState("")

  // Fetch architects when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchArchitects()
      loadLeadPropertyType()

      // Pre-select architect if assigned to contact
      if (contact.architecteAssigne) {
        setArchitectId(contact.architecteAssigne)
      }
    }
  }, [isOpen, contact])

  const fetchArchitects = async () => {
    try {
      setLoading(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const response = await fetch("/api/architects", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        const list: Architect[] = data?.data || data?.architects || []
        setArchitects(list)
      } else {
        setArchitects([])
      }
    } catch (error) {
      console.error("Error fetching architects:", error)
      toast.error("Erreur lors du chargement des architectes")
    } finally {
      setLoading(false)
    }
  }

  const mapLeadTypeToOpportunityType = (t: string | null | undefined): OpportunityType => {
    const s = (t || "").toLowerCase()
    if (s.includes("villa")) return "villa"
    if (s.includes("appart")) return "appartement"
    if (s.includes("magasin") || s.includes("local")) return "magasin"
    if (s.includes("bureau")) return "bureau"
    if (s.includes("riad")) return "riad"
    if (s.includes("studio")) return "studio"
    if (s.includes("reno") || s.includes("rénov")) return "renovation"
    return "autre"
  }

  const loadLeadPropertyType = async () => {
    try {
      const leadId = contact?.leadId
      if (!leadId) {
        setPropertyType("autre")
        return
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const res = await fetch(`/api/leads/${leadId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const lead = await res.json()
        const pt = mapLeadTypeToOpportunityType(lead?.typeBien)
        setPropertyType(pt)
        setNomOportunite((prev) => prev || defaultTitle(pt))
      }
    } catch (_) {
      // ignore errors
    }
  }

  const typeLabel = (t: OpportunityType) => {
    const map: Record<OpportunityType, string> = {
      villa: "Villa",
      appartement: "Appartement",
      magasin: "Magasin",
      bureau: "Bureau",
      riad: "Riad",
      studio: "Studio",
      renovation: "Rénovation",
      autre: "Autre",
    }
    return map[t] || "Autre"
  }

  const defaultTitle = (t: OpportunityType) => {
    const suffix = contact.ville || contact.nom
    return `${typeLabel(t)}${suffix ? ` - ${suffix}` : ""}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!architectId) {
      toast.error("L'assignation à un architecte est requise")
      return
    }

    if (!description) {
      toast.error("La description est requise")
      return
    }

    if (!montantEstime) {
      toast.error("Le montant estimé est requis")
      return
    }

    try {
      setSubmitting(true)

      const token = localStorage.getItem("token")
      if (!token) {
        toast.error("Token d'authentification manquant")
        return
      }

      // Build payload
      const titre = nomOportunite.trim() || defaultTitle(propertyType)
      const type = propertyType

      const response = await fetch(`/api/contacts/${contact.id}/opportunities`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titre,
          type,
          description,
          budget: montantEstime,
          architecteAssigne: architectId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création de l'opportunité")
      }

      const opportunity = await response.json()
      toast.success("L'opportunité a été créée avec succès.")

      // Reset form
      setNomOportunite("")
      setDescription("")
      setMontantEstime("")
      setArchitectId("")

      // Call success callback
      onSuccess?.(opportunity.id)

      // Close modal
      onClose()
    } catch (error) {
      console.error("Error creating opportunity:", error)
      const message =
        error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(`Erreur: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedArchitect = architects.find((a) => a.id === architectId)

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
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-2xl z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl z-50 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>

            <div className="p-8 sm:p-10 relative">
              {/* HEADER */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <h1 className="text-3xl font-bold text-white mb-2">
                  Créer une nouvelle opportunité
                </h1>
                <p className="text-gray-400 text-sm">
                  Informations liées au contact & assignation à un architecte
                </p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* CONTACT INFORMATION SECTION - READ ONLY */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-4">
                    Informations du contact (Lecture seule)
                  </h2>
                  <div className="rounded-2xl p-6 border border-white/10 bg-white/5 shadow-inner opacity-80">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {/* Nom complet */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">
                            Nom complet
                          </p>
                          <p className="text-sm font-medium text-white truncate">
                            {contact.nom}
                          </p>
                        </div>
                      </div>

                      {/* Téléphone */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Phone className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">
                            Téléphone
                          </p>
                          <p className="text-sm font-medium text-white truncate">
                            {contact.telephone}
                          </p>
                        </div>
                      </div>

                      {/* Ville */}
                      {contact.ville && (
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MapPin className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">
                              Ville
                            </p>
                            <p className="text-sm font-medium text-white truncate">
                              {contact.ville}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Type de bien - from lead */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Home className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">
                            Type de bien
                          </p>
                          <p className="text-sm font-medium text-white truncate">
                            {typeLabel(propertyType)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* OPPORTUNITY FIELDS SECTION */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-4">
                    Détails de l'opportunité
                  </h2>
                  <div className="space-y-5">
                    {/* Nom de l'opportunité */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        Nom de l'opportunité
                        <span className="text-xs text-slate-400">(optionnel)</span>
                      </Label>
                      <Input
                        type="text"
                        value={nomOportunite}
                        onChange={(e) => setNomOportunite(e.target.value)}
                        placeholder="Ex: Rénovation villa - Casablanca"
                        className="h-11 bg-white/10 border border-white/10 text-white placeholder:text-slate-400 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    {/* Description - REQUIRED */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        Description
                        <span className="text-xs text-red-400">* (Requis)</span>
                      </Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Détails du projet, besoins spécifiques..."
                        className="min-h-[100px] bg-white/10 border border-white/10 text-white placeholder:text-slate-400 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    {/* Montant Estimé - REQUIRED */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        Montant Estimé (MAD)
                        <span className="text-xs text-red-400">* (Requis)</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          value={montantEstime}
                          onChange={(e) => setMontantEstime(e.target.value)}
                          placeholder="0.00"
                          className="h-11 pl-10 bg-white/10 border border-white/10 text-white placeholder:text-slate-400 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ARCHITECT ASSIGNMENT SECTION */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-4">
                    Attribuer un architecte
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => setArchitectDialogOpen(true)}
                        className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium shadow-sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Choisir un architecte
                      </Button>
                      {architectId && (
                        <span className="text-xs text-green-400">Architecte sélectionné</span>
                      )}
                    </div>

                    {/* Selected architect preview */}
                    {selectedArchitect && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-base font-bold text-white">
                              {(selectedArchitect.prenom || selectedArchitect.nom).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {selectedArchitect.prenom} {selectedArchitect.nom}
                            </p>
                            <p className="text-xs text-gray-300">
                              {selectedArchitect.specialite}
                            </p>
                            {selectedArchitect.email && (
                              <p className="text-xs text-gray-400 truncate">{selectedArchitect.email}</p>
                            )}
                          </div>
                          <Users className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        </div>
                      </motion.div>
                    )}

                    {!architectId && (
                      <p className="text-xs text-red-400 font-medium">
                        L'assignation à un architecte est obligatoire
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* CTA BUTTONS */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex gap-3 pt-6 border-t border-white/10"
                >
                  <Button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 h-11 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all border border-white/10"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !architectId || !description || !montantEstime}
                    className={cn(
                      "flex-1 h-11 font-medium rounded-xl transition-all shadow-lg",
                      submitting || !architectId || !description || !montantEstime
                        ? "bg-white/10 text-slate-400 cursor-not-allowed border border-white/10"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    )}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Création...
                      </div>
                    ) : (
                      <span className="inline-flex items-center">Créer l'opportunité <ArrowRight className="w-4 h-4 ml-2" /></span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>
            {/* Architect selection command palette */}
            <ArchitectSelectionDialog
              open={architectDialogOpen}
              onOpenChange={setArchitectDialogOpen}
              onBack={() => setArchitectDialogOpen(false)}
              onArchitectSelected={(id) => {
                setArchitectId(id)
                setArchitectDialogOpen(false)
              }}
              leadName={contact.nom}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
