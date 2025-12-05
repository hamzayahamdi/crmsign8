"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Phone, MapPin, Home, Users, Loader2, Sparkles, ArrowRight, Coins } from "lucide-react"
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

      // Auto-populate title with default if empty
      if (!nomOportunite.trim()) {
        setNomOportunite(defaultTitle(propertyType))
      }
    }
  }, [isOpen, contact])

  // Update title when property type changes
  useEffect(() => {
    if (isOpen && !nomOportunite.trim()) {
      setNomOportunite(defaultTitle(propertyType))
    }
  }, [propertyType, isOpen])

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

      // Build payload - ENSURE titre is never empty
      const titre = nomOportunite.trim() || defaultTitle(propertyType)
      const type = propertyType

      console.log('[CreateOpportunity] Creating opportunity with title:', titre)

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl shadow-2xl z-50 flex flex-col border border-slate-700/50 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
              {/* HEADER */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">
                    Créer une nouvelle opportunité
                  </h1>
                </div>
                <p className="text-slate-400 text-sm">
                  Informations liées au contact & assignation à un architecte
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* CONTACT INFORMATION SECTION - READ ONLY */}
                <div>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                    Informations du contact (Lecture seule)
                  </h2>
                  <div className="rounded-xl p-5 border border-slate-700 bg-slate-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nom complet */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">
                            Nom complet
                          </p>
                          <p className="text-sm font-medium text-white truncate">
                            {contact.nom}
                          </p>
                        </div>
                      </div>

                      {/* Téléphone */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">
                            Téléphone
                          </p>
                          <p className="text-sm font-medium text-white truncate">
                            {contact.telephone}
                          </p>
                        </div>
                      </div>

                      {/* Ville */}
                      {contact.ville && (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">
                              Ville
                            </p>
                            <p className="text-sm font-medium text-white truncate">
                              {contact.ville}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Type de bien */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <Home className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">
                            Type de bien
                          </p>
                          <p className="text-sm font-medium text-white truncate">
                            {typeLabel(propertyType)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OPPORTUNITY FIELDS SECTION */}
                <div>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                    Détails de l'opportunité
                  </h2>
                  <div className="space-y-4">
                    {/* Nom de l'opportunité */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-300">
                        Nom de l'opportunité{" "}
                        <span className="text-xs text-slate-500">(un titre par défaut sera généré si vide)</span>
                      </Label>
                      <Input
                        type="text"
                        value={nomOportunite}
                        onChange={(e) => setNomOportunite(e.target.value)}
                        placeholder={defaultTitle(propertyType)}
                        className="h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description - REQUIRED */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-300">
                        Description <span className="text-red-400">* (Requis)</span>
                      </Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Détails du projet, besoins spécifiques..."
                        className="min-h-[100px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* Montant Estimé - REQUIRED */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-300">
                        Montant Estimé (MAD) <span className="text-red-400">* (Requis)</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                          <Coins className="w-5 h-5 text-amber-500" />
                          <span className="text-sm font-semibold text-slate-400">MAD</span>
                        </div>
                        <Input
                          type="number"
                          value={montantEstime}
                          onChange={(e) => setMontantEstime(e.target.value)}
                          placeholder="0.00"
                          className="h-12 pl-20 pr-4 bg-slate-800 border-slate-700 text-white text-base placeholder:text-slate-500 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ARCHITECT ASSIGNMENT SECTION */}
                <div>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                    Attribuer un architecte
                  </h2>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      onClick={() => setArchitectDialogOpen(true)}
                      className="h-11 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Choisir un architecte
                    </Button>

                    {/* Selected architect preview */}
                    {selectedArchitect && (
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-300">
                              {(selectedArchitect.prenom || selectedArchitect.nom).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {selectedArchitect.prenom} {selectedArchitect.nom}
                            </p>
                            <p className="text-xs text-slate-400">
                              {selectedArchitect.specialite}
                            </p>
                          </div>
                          <Users className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        </div>
                      </div>
                    )}

                    {!architectId && (
                      <p className="text-xs text-red-400">
                        L'assignation à un architecte est obligatoire
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA BUTTONS */}
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <Button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 h-11 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !architectId || !description || !montantEstime}
                    className={cn(
                      "flex-1 h-11 rounded-lg transition-all",
                      submitting || !architectId || !description || !montantEstime
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    )}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Création...
                      </div>
                    ) : (
                      <span className="inline-flex items-center">
                        Créer l'opportunité <ArrowRight className="w-4 h-4 ml-2" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Architect selection dialog */}
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
