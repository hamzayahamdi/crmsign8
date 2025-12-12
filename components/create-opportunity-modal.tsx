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
  const [architectNameMap, setArchitectNameMap] = useState<Record<string, string>>({})
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

      // Auto-populate title with default if empty
      if (!nomOportunite.trim()) {
        setNomOportunite(defaultTitle(propertyType))
      }
    }
  }, [isOpen, contact])

  // Pre-select architect immediately from contact (don't wait for architects to load)
  useEffect(() => {
    if (contact.architecteAssigne) {
      // If contact has architect assigned, set it immediately
      // We'll resolve the name later when architects load
      setArchitectId(contact.architecteAssigne)
    }
  }, [contact.architecteAssigne])

  // Update architect ID when architects load and we can match by name
  useEffect(() => {
    if (contact.architecteAssigne && architects.length > 0 && !architectId) {
      // Try to find architect by ID first
      const architectById = architects.find(a => a.id === contact.architecteAssigne)
      if (architectById) {
        setArchitectId(contact.architecteAssigne)
      } else {
        // If not found by ID, try to find by name match
        const architectByName = architects.find(a => {
          const fullName = `${a.prenom || ''} ${a.nom || ''}`.trim()
          return fullName === contact.architecteAssigne || 
                 a.nom === contact.architecteAssigne ||
                 a.prenom === contact.architecteAssigne
        })
        if (architectByName) {
          setArchitectId(architectByName.id)
        }
      }
    }
  }, [architects, contact.architecteAssigne, architectId])

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
        
        // Build architect name map for resolving IDs to names
        const map: Record<string, string> = {}
        list.forEach((arch) => {
          const fullName = `${arch.prenom || ''} ${arch.nom || ''}`.trim()
          if (arch.id && fullName) {
            map[arch.id] = fullName
            // Also map by name for reverse lookup
            map[fullName] = fullName
            if (arch.nom) map[arch.nom] = fullName
            if (arch.prenom) map[arch.prenom] = fullName
          }
        })
        setArchitectNameMap(map)
      } else {
        setArchitects([])
        setArchitectNameMap({})
      }
    } catch (error) {
      console.error("Error fetching architects:", error)
      toast.error("Erreur lors du chargement des architectes")
      setArchitects([])
      setArchitectNameMap({})
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

    // Use assigned architect from contact if available, otherwise use selected architect
    const finalArchitectId = contact.architecteAssigne || architectId

    // Validation
    if (!finalArchitectId) {
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
          architecteAssigne: finalArchitectId,
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

      // Trigger clients page refresh by dispatching a custom event
      // This ensures the clients page updates when opportunities are created
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('opportunity-created', { 
          detail: { contactId: contact.id, opportunityId: opportunity.id } 
        }))
        
        // Also try to refresh clients store if available
        // Add a small delay to ensure Supabase record is created first
        setTimeout(async () => {
          try {
            const { useClientStore } = await import('@/stores/client-store')
            const store = useClientStore.getState()
            if (store.refreshClients) {
              console.log('[Create Opportunity] Refreshing clients store after opportunity creation...')
              await store.refreshClients()
              console.log('[Create Opportunity] ✅ Clients store refreshed')
            }
            if (store.fetchClients) {
              // Also fetch from API to ensure we have the latest data
              await store.fetchClients()
            }
          } catch (e) {
            // Store might not be available, that's okay
            console.log('[Create Opportunity] Could not refresh clients store:', e)
          }
        }, 500) // Wait 500ms for Supabase record to be created
      }

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
  
  // Resolve assigned architect name for display
  const getAssignedArchitectName = () => {
    if (!contact.architecteAssigne) return null
    
    // First try to resolve using the name map
    const resolvedName = architectNameMap[contact.architecteAssigne]
    if (resolvedName) return resolvedName
    
    // If not in map, check if it's already a name by looking in architects list
    const architect = architects.find(a => {
      const fullName = `${a.prenom || ''} ${a.nom || ''}`.trim()
      return fullName === contact.architecteAssigne || 
             a.id === contact.architecteAssigne ||
             a.nom === contact.architecteAssigne ||
             a.prenom === contact.architecteAssigne
    })
    if (architect) {
      return `${architect.prenom || ''} ${architect.nom || ''}`.trim()
    }
    
    // Fallback: return as-is (might already be a name)
    return contact.architecteAssigne
  }
  
  const assignedArchitectName = getAssignedArchitectName()

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-lg shadow-2xl z-50 flex flex-col border border-slate-700/50 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
              {/* HEADER */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-lg font-light text-white">
                    Créer une nouvelle opportunité
                  </h1>
                </div>
                <p className="text-[10px] font-light text-slate-400">
                  Informations liées au contact & assignation à un architecte
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* CONTACT INFORMATION SECTION - READ ONLY */}
                <div>
                  <h2 className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <div className="w-0.5 h-2.5 bg-blue-500 rounded-full" />
                    Informations du contact (Lecture seule)
                  </h2>
                  <div className="rounded-lg p-2.5 border border-slate-700/50 bg-slate-800/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* Nom complet */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-light text-slate-500 uppercase tracking-wide">
                            Nom complet
                          </p>
                          <p className="text-xs font-light text-white truncate">
                            {contact.nom}
                          </p>
                        </div>
                      </div>

                      {/* Téléphone */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-3 h-3 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-light text-slate-500 uppercase tracking-wide">
                            Téléphone
                          </p>
                          <p className="text-xs font-light text-white truncate">
                            {contact.telephone}
                          </p>
                        </div>
                      </div>

                      {/* Ville */}
                      {contact.ville && (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3 h-3 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-light text-slate-500 uppercase tracking-wide">
                              Ville
                            </p>
                            <p className="text-xs font-light text-white truncate">
                              {contact.ville}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Type de bien */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <Home className="w-3 h-3 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-light text-slate-500 uppercase tracking-wide">
                            Type de bien
                          </p>
                          <p className="text-xs font-light text-white truncate">
                            {typeLabel(propertyType)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OPPORTUNITY FIELDS SECTION */}
                <div>
                  <h2 className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <div className="w-0.5 h-2.5 bg-blue-500 rounded-full" />
                    Détails de l'opportunité
                  </h2>
                  <div className="space-y-2.5">
                    {/* Nom de l'opportunité */}
                    <div className="space-y-1">
                      <Label className="text-xs font-light text-slate-300">
                        Nom de l'opportunité{" "}
                        <span className="text-[10px] font-light text-slate-500">(un titre par défaut sera généré si vide)</span>
                      </Label>
                      <Input
                        type="text"
                        value={nomOportunite}
                        onChange={(e) => setNomOportunite(e.target.value)}
                        placeholder={defaultTitle(propertyType)}
                        className="h-9 text-xs bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description - REQUIRED */}
                    <div className="space-y-1">
                      <Label className="text-xs font-light text-slate-300">
                        Description <span className="text-[10px] font-light text-red-400">* (Requis)</span>
                      </Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Détails du projet, besoins spécifiques..."
                        className="min-h-[80px] text-xs bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* Montant Estimé - REQUIRED */}
                    <div className="space-y-1">
                      <Label className="text-xs font-light text-slate-300">
                        Montant Estimé (MAD) <span className="text-[10px] font-light text-red-400">* (Requis)</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-light text-slate-400">MAD</span>
                        </div>
                        <Input
                          type="number"
                          value={montantEstime}
                          onChange={(e) => setMontantEstime(e.target.value)}
                          placeholder="0.00"
                          className="h-9 pl-16 pr-3 text-xs bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ARCHITECT ASSIGNMENT SECTION */}
                <div>
                  <h2 className="text-[10px] font-light text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <div className="w-0.5 h-2.5 bg-blue-500 rounded-full" />
                    Attribuer un architecte
                  </h2>
                  <div className="space-y-2">
                    {/* Show assigned architect from contact - READ ONLY if already assigned */}
                    {contact.architecteAssigne ? (
                      <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-light text-purple-300">
                              {assignedArchitectName?.charAt(0).toUpperCase() || contact.architecteAssigne.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-light text-purple-400 mb-0.5">Architecte assigné</p>
                            <p className="text-xs font-light text-white truncate">
                              {assignedArchitectName || contact.architecteAssigne}
                            </p>
                            {selectedArchitect?.specialite && (
                              <p className="text-[10px] font-light text-slate-400 truncate">
                                {selectedArchitect.specialite}
                              </p>
                            )}
                          </div>
                          <Users className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        </div>
                        {!loading && (
                          <p className="text-[10px] font-light text-slate-500 mt-1.5 italic">
                            (Lecture seule - assigné lors de la conversion)
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={() => setArchitectDialogOpen(true)}
                          className="h-9 px-3 text-xs font-light rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-white"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          {selectedArchitect ? "Changer l'architecte" : "Choisir un architecte"}
                        </Button>

                        {/* Selected architect preview */}
                        {selectedArchitect && (
                          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-light text-blue-300">
                                  {(selectedArchitect.prenom || selectedArchitect.nom).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-light text-blue-400 mb-0.5">Architecte sélectionné</p>
                                <p className="text-xs font-light text-white truncate">
                                  {selectedArchitect.prenom} {selectedArchitect.nom}
                                </p>
                                {selectedArchitect.specialite && (
                                  <p className="text-[10px] font-light text-slate-400 truncate">
                                    {selectedArchitect.specialite}
                                  </p>
                                )}
                              </div>
                              <Users className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            </div>
                          </div>
                        )}

                        {!architectId && (
                          <p className="text-[10px] font-light text-red-400">
                            L'assignation à un architecte est obligatoire
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* CTA BUTTONS */}
                <div className="flex gap-2 pt-3 border-t border-slate-700/50">
                  <Button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 h-8 text-xs font-light bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg border border-slate-700/50"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || (!contact.architecteAssigne && !architectId) || !description || !montantEstime}
                    className={cn(
                      "flex-1 h-8 text-xs font-light rounded-lg transition-all",
                      submitting || (!contact.architecteAssigne && !architectId) || !description || !montantEstime
                        ? "bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    )}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-xs">Création...</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-xs">
                        Créer l'opportunité <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
