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
    } else {
      // Reset form when modal closes
      setNomOportunite("")
      setDescription("")
      setMontantEstime("")
      setArchitectId("")
    }
  }, [isOpen, contact])

  // Pre-populate architect after architects are loaded
  useEffect(() => {
    if (isOpen && architects.length > 0 && contact.architecteAssigne) {
      // Check if architecteAssigne is an ID (exists in architects list)
      const architectById = architects.find(a => a.id === contact.architecteAssigne)
      
      if (architectById) {
        // It's an ID, use it directly
        setArchitectId(contact.architecteAssigne)
      } else {
        // It might be a name, try to find by matching name
        const architectByName = architects.find(a => {
          const fullName = `${a.prenom} ${a.nom}`.trim()
          return fullName === contact.architecteAssigne || 
                 a.nom === contact.architecteAssigne ||
                 contact.architecteAssigne?.includes(a.nom)
        })
        
        if (architectByName) {
          setArchitectId(architectByName.id)
        }
      }
    } else if (isOpen && !contact.architecteAssigne) {
      setArchitectId("")
    }
  }, [isOpen, architects, contact.architecteAssigne])

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
    // Use only property type and city for default title, NOT contact name
    const suffix = contact.ville
    return `${typeLabel(t)}${suffix ? ` - ${suffix}` : ""}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

      // Use the architect from state (already includes pre-assigned one)
      const finalArchitectId = architectId || undefined

      console.log('[CreateOpportunity] Submitting with architect:', finalArchitectId, 'Pre-assigned:', contact.architecteAssigne)

      const response = await fetch(`/api/contacts/${contact.id}/opportunities`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titre,
          type,
          description: description || "",
          budget: montantEstime || "0",
          architecteAssigne: finalArchitectId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création de l'opportunité")
      }

      const opportunity = await response.json()
      
      // Show success message with architect info
      if (isArchitectPreAssigned) {
        toast.success("Opportunité créée avec l'architecte pré-assigné.")
      } else if (finalArchitectId) {
        toast.success("Opportunité créée et architecte assigné.")
      } else {
        toast.success("Opportunité créée avec succès.")
      }

      // Call success callback
      onSuccess?.(opportunity.id)

      // Close modal (form will be reset in useEffect)
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

  // Get the architect to display - from architectId state which includes pre-assigned architect
  const selectedArchitect = architects.find((a) => a.id === architectId)
  // Check if the architect was pre-assigned from contact (not manually changed by user)
  const isArchitectPreAssigned = architectId === contact.architecteAssigne && contact.architecteAssigne

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl z-50 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-white" />
            </motion.button>

            <div className="p-6 relative">
              {/* HEADER */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <h1 className="text-2xl font-bold text-white mb-1">
                  Créer une nouvelle opportunité
                </h1>
                <p className="text-gray-400 text-xs">
                  Informations liées au contact & assignation à un architecte
                </p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* CONTACT INFORMATION SECTION - READ ONLY */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Informations du contact
                  </h2>
                  <div className="rounded-xl p-4 border border-white/10 bg-white/5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Nom complet */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Nom</p>
                          <p className="text-sm font-medium text-white truncate">{contact.nom}</p>
                        </div>
                      </div>

                      {/* Téléphone */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Téléphone</p>
                          <p className="text-sm font-medium text-white truncate">{contact.telephone}</p>
                        </div>
                      </div>

                      {/* Ville */}
                      {contact.ville && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400">Ville</p>
                            <p className="text-sm font-medium text-white truncate">{contact.ville}</p>
                          </div>
                        </div>
                      )}

                      {/* Type de bien */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <Home className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Type</p>
                          <p className="text-sm font-medium text-white truncate">{typeLabel(propertyType)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* OPPORTUNITY DETAILS & ARCHITECT IN ONE ROW */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-4"
                >
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Détails de l'opportunité
                  </h2>

                  {/* Compact 2-column layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nom de l'opportunité */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">
                        Nom du projet <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={nomOportunite}
                        onChange={(e) => setNomOportunite(e.target.value)}
                        placeholder="Ex: Villa moderne, Rénovation appartement..."
                        className="h-10 bg-white/10 border border-white/10 text-white placeholder:text-slate-500 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm"
                        required
                      />
                      <p className="text-xs text-slate-500">Ce nom apparaîtra dans la liste des clients</p>
                    </div>

                    {/* Montant Estimé */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-300">
                        Montant Estimé (MAD) <span className="text-slate-500">(optionnel)</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          type="number"
                          value={montantEstime}
                          onChange={(e) => setMontantEstime(e.target.value)}
                          placeholder="0"
                          className="h-10 pl-9 bg-white/10 border border-white/10 text-white placeholder:text-slate-500 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description - full width */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-300">
                      Description <span className="text-slate-500">(optionnel)</span>
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Détails du projet, besoins spécifiques..."
                      className="min-h-[80px] bg-white/10 border border-white/10 text-white placeholder:text-slate-500 rounded-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm resize-none"
                    />
                  </div>

                  {/* ARCHITECT ASSIGNMENT */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-300">
                        Architecte assigné <span className="text-slate-500">(optionnel)</span>
                      </Label>
                      {isArchitectPreAssigned && !loading && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          Pré-assigné
                        </span>
                      )}
                    </div>
                    
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-white/5 border border-white/10">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        <span className="text-xs text-slate-400">Chargement des architectes...</span>
                      </div>
                    ) : selectedArchitect ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "p-3.5 rounded-lg border flex items-center gap-3 transition-all",
                          isArchitectPreAssigned 
                            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]" 
                            : "bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          isArchitectPreAssigned
                            ? "bg-gradient-to-br from-green-500/30 to-emerald-500/30"
                            : "bg-gradient-to-br from-blue-500/30 to-purple-500/30"
                        )}>
                          <span className="text-sm font-bold text-white">
                            {(selectedArchitect.prenom || selectedArchitect.nom).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {selectedArchitect.prenom} {selectedArchitect.nom}
                          </p>
                          {selectedArchitect.specialite && (
                            <p className="text-xs text-slate-300">{selectedArchitect.specialite}</p>
                          )}
                          {selectedArchitect.ville && (
                            <p className="text-xs text-slate-400 mt-0.5">{selectedArchitect.ville}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={() => setArchitectDialogOpen(true)}
                          className="h-8 px-3 text-xs rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all hover:scale-105"
                        >
                          {isArchitectPreAssigned ? "Modifier" : "Changer"}
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="space-y-1.5">
                        <Button
                          type="button"
                          onClick={() => setArchitectDialogOpen(true)}
                          className="w-full h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-sm transition-all hover:scale-[1.02]"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Choisir un architecte
                        </Button>
                        <p className="text-xs text-slate-400">
                          Vous pouvez assigner un architecte maintenant ou plus tard
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* CTA BUTTONS */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-3 pt-4 border-t border-white/10"
                >
                  <Button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 h-10 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-all border border-white/10 text-sm"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      "flex-1 h-10 font-medium rounded-lg transition-all shadow-lg text-sm",
                      submitting
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
                      <span className="inline-flex items-center">
                        Créer l'opportunité
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </span>
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
