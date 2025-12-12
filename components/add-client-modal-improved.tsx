"use client"

import type { Client, ProjectStatus, ProjectType } from "@/types/client"
import type { Lead } from "@/types/lead"
import { useState, useEffect } from "react"
import { X, Save, User, Phone, MapPin, Sparkles, Target, Loader2 } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadAutocomplete } from "@/components/lead-autocomplete";
import { CreatableSelect } from "@/components/creatable-select"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// Liste des villes du Maroc
const MOROCCAN_CITIES = [
  "Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès",
  "Oujda", "Kenitra", "Tétouan", "Safi", "Temara", "Mohammedia", "Khouribga",
  "El Jadida", "Béni Mellal", "Nador", "Taza", "Settat", "Ksar El Kebir",
  "Larache", "Khemisset", "Guelmim", "Berrechid", "Berkane", "Taourirt",
  "Bouskoura", "Dar Bouazza", "Ifrane", "Azrou", "Errachidia", "Ouarzazate",
  "Taroudant", "Essaouira", "El Kelaa des Sraghna", "Sidi Kacem", "Sidi Slimane",
  "Skhirat", "Benslimane", "Bouznika", "Zagora", "Tinghir", "Midelt", "Azilal"
]

interface AddClientModalImprovedProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "derniereMaj">) => Promise<void>
  editingClient?: Client | null
}

export function AddClientModalImproved({ isOpen, onClose, onSave, editingClient }: AddClientModalImprovedProps) {
  const [mode, setMode] = useState<"search" | "manual">("search")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [formData, setFormData] = useState({
    nom: "",
    nomProjet: "",
    telephone: "",
    ville: "",
    typeProjet: "appartement" as ProjectType,
    architecteAssigne: "",
    statutProjet: "qualifie" as ProjectStatus,
    budget: "",
  })

  const [architects, setArchitects] = useState<string[]>([])
  const [villes, setVilles] = useState<string[]>(MOROCCAN_CITIES)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load architects
  useEffect(() => {
    const loadArchitects = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const users = await res.json()
          const architectList = users
            .filter((u: any) => u.role?.toLowerCase() === 'architect')
            .map((u: any) => u.name?.trim())
            .filter((n: string) => n)
          setArchitects(architectList.length > 0 ? architectList : ['TAZI', 'AZI'])
        } else {
          setArchitects(['TAZI', 'AZI'])
        }
      } catch {
        setArchitects(['TAZI', 'AZI'])
      }
    }
    loadArchitects()
  }, [])

  // Load existing cities from opportunities/clients
  useEffect(() => {
    const loadExistingCities = async () => {
      try {
        const res = await fetch('/api/clients', {
          credentials: 'include'
        })
        if (res.ok) {
          const result = await res.json()
          const clients = result.data || []
          // Extract unique cities from clients
          const existingCities = Array.from(new Set(
            clients
              .map((c: any) => c.ville)
              .filter((v: string) => v && v.trim())
          )) as string[]
          
          // Merge with Moroccan cities, avoiding duplicates
          const allCities = [...MOROCCAN_CITIES]
          existingCities.forEach((city: string) => {
            if (!allCities.includes(city)) {
              allCities.push(city)
            }
          })
          
          // Sort: Moroccan cities first, then custom cities
          const moroccanSet = new Set(MOROCCAN_CITIES)
          const sortedCities = [
            ...MOROCCAN_CITIES,
            ...allCities.filter(c => !moroccanSet.has(c)).sort()
          ]
          
          setVilles(sortedCities)
        }
      } catch (error) {
        console.error('[AddClientModal] Error loading cities:', error)
        // Keep default cities on error
      }
    }
    
    if (isOpen) {
      loadExistingCities()
    }
  }, [isOpen])

  // Populate form when editing or lead selected
  useEffect(() => {
    if (editingClient) {
      setMode("manual")
      setFormData({
        nom: editingClient.nom,
        nomProjet: editingClient.nomProjet || "",
        telephone: editingClient.telephone,
        ville: editingClient.ville,
        typeProjet: editingClient.typeProjet,
        architecteAssigne: editingClient.architecteAssigne,
        statutProjet: editingClient.statutProjet,
        budget: editingClient.budget?.toString() || "",
      })
    } else if (selectedLead) {
      setMode("manual")
      const typeProjet = (selectedLead.typeBien?.toLowerCase() as ProjectType) || "appartement"
      const typeLabels: Record<string, string> = {
        villa: 'Villa',
        appartement: 'Appartement',
        magasin: 'Magasin',
        bureau: 'Bureau',
        riad: 'Riad',
        studio: 'Studio',
        autre: 'Autre'
      }
      const typeLabel = typeLabels[typeProjet] || 'Projet'
      const defaultNomProjet = `${typeLabel} - ${selectedLead.ville || selectedLead.nom}`
      
      setFormData({
        nom: selectedLead.nom,
        nomProjet: defaultNomProjet,
        telephone: selectedLead.telephone,
        ville: selectedLead.ville,
        typeProjet: typeProjet,
        architecteAssigne: architects[0] || "TAZI",
        statutProjet: "qualifie",
        budget: "",
      })
    } else if (!editingClient) {
      setMode("search")
      setSelectedLead(null)
      setFormData({
        nom: "",
        nomProjet: "",
        telephone: "",
        ville: "",
        typeProjet: "appartement",
        architecteAssigne: architects[0] || "TAZI",
        statutProjet: "qualifie",
        budget: "",
      })
    }
  }, [editingClient, selectedLead, isOpen, architects])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      // Generate nomProjet if not provided
      let nomProjet = formData.nomProjet.trim()
      if (!nomProjet) {
        const typeLabels: Record<string, string> = {
          villa: 'Villa',
          appartement: 'Appartement',
          magasin: 'Magasin',
          bureau: 'Bureau',
          riad: 'Riad',
          studio: 'Studio',
          autre: 'Autre'
        }
        const typeLabel = typeLabels[formData.typeProjet] || 'Projet'
        nomProjet = `${typeLabel} - ${formData.ville || formData.nom}`
      }

      const clientData: any = {
        nom: formData.nom.trim(),
        nomProjet: nomProjet, // CRITICAL: Include nomProjet for opportunity identification
        telephone: formData.telephone.trim(),
        ville: formData.ville.trim() || "", // Ensure ville is always a string, never empty
        typeProjet: formData.typeProjet,
        architecteAssigne: formData.architecteAssigne,
        statutProjet: formData.statutProjet,
        historique: editingClient?.historique || [],
      }

      // Always include ville even if empty to ensure it's saved
      if (!clientData.ville) {
        clientData.ville = ""
      }

      if (formData.budget) clientData.budget = parseFloat(formData.budget)
      
      console.log('[AddClientModal] 💾 Saving client data:', {
        ville: clientData.ville,
        nomProjet: clientData.nomProjet,
        nom: clientData.nom
      })

      // Wait for save to complete (including API call and table refresh)
      await onSave(clientData)
      
      // Only close modal after successful save
      handleClose()
    } catch (error) {
      console.error('[AddClientModal] ❌ Error saving client:', error)
      // Don't close modal on error, let user see the error and retry
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleClose = () => {
    setMode("search")
    setSelectedLead(null)
    onClose()
  }

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead)
  }

  const handleCreateNew = () => {
    setMode("manual")
    setSelectedLead(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing during submission
      if (!open && isSubmitting) {
        console.log('[AddClientModal] ⚠️ Cannot close modal during submission')
        return
      }
      if (!open) {
        handleClose()
      }
    }}>
      <DialogContent className="w-[95vw] !max-w-3xl max-h-[88vh] overflow-y-auto bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl p-4">
        <DialogHeader className="pb-3 border-b border-slate-700/50">
          <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {editingClient ? "Modifier l'opportunité" : "Nouvelle opportunité"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-400 mt-1">
            {editingClient
              ? "Modifiez les informations de l'opportunité"
              : "Créez une nouvelle opportunité depuis un contact"}
          </DialogDescription>
        </DialogHeader>
        <AnimatePresence mode="wait">
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 mt-4"
          >
            {/* Search Section (compact) */}
            {!editingClient && (
              <div className="relative z-10 glass rounded-xl md:rounded-2xl p-4 md:p-5 border border-slate-600/30 overflow-visible">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-white">Recherche intelligente</h3>
                      <p className="text-[10px] md:text-xs text-slate-400">Trouvez rapidement un lead existant</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs text-slate-400">Ou</span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateNew}
                      className="h-8 md:h-9 px-3 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-xs"
                    >
                      Saisir manuellement
                    </Button>
                  </div>
                </div>
                <LeadAutocomplete
                  onSelectLead={handleSelectLead}
                  onCreateNew={handleCreateNew}
                  placeholder="Rechercher par nom, téléphone ou ville..."
                />
              </div>
            )}

            {/* Lead Info Banner */}
            {selectedLead && !editingClient && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl md:rounded-2xl p-4 md:p-5 bg-gradient-to-r from-primary/20 to-premium/10 border border-primary/40 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center ring-2 ring-primary/40 shrink-0">
                      <span className="text-xs md:text-sm font-semibold text-white">
                        {selectedLead.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm md:text-lg font-bold text-white tracking-wide line-clamp-1">{selectedLead.nom}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedLead(null)
                      setMode("search")
                    }}
                    className="text-slate-300 hover:text-white h-8 w-8 p-0 md:h-9 md:w-auto md:px-3"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-2.5 mt-2"
            >

              {/* Informations du contact */}
              <div className="rounded-lg p-2.5 border border-slate-700/40 bg-slate-800/30 space-y-2.5">
                <h3 className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">
                  Contact
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="nom" className="text-[10px] text-slate-400 font-medium">
                      Nom *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => handleChange("nom", e.target.value)}
                        placeholder="Ahmed Benali"
                        required
                        disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}
                        className="pl-8 h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white placeholder:text-slate-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="telephone" className="text-[10px] text-slate-400 font-medium">
                      Téléphone *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                      <Input
                        id="telephone"
                        value={formData.telephone}
                        onChange={(e) => handleChange("telephone", e.target.value)}
                        placeholder="0620778325"
                        required
                        disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}
                        className="pl-8 h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white placeholder:text-slate-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ville" className="text-[10px] text-slate-400 font-medium">
                      Ville *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 z-10 pointer-events-none" />
                      <div className="pl-8">
                        <CreatableSelect
                          value={formData.ville}
                          onValueChange={(value) => handleChange("ville", value)}
                          options={villes}
                          placeholder="Sélectionner une ville"
                          searchPlaceholder="Rechercher une ville..."
                          emptyText="Tapez pour créer une nouvelle ville"
                          disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}
                          onCreateNew={(newCity) => {
                            if (!villes.includes(newCity)) {
                              setVilles([...villes, newCity])
                            }
                          }}
                          className="h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white text-xs font-normal disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50 hover:border-slate-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Détails de l'opportunité */}
              <div className="rounded-lg p-2.5 border border-slate-700/40 bg-slate-800/30 space-y-2.5">
                <h3 className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">
                  Opportunité
                </h3>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="nomProjet" className="text-[10px] text-slate-400 font-medium">
                      Nom de l'opportunité *
                    </Label>
                      <Input
                        id="nomProjet"
                        value={formData.nomProjet}
                        onChange={(e) => handleChange("nomProjet", e.target.value)}
                        placeholder="Villa - Casablanca"
                        required
                        disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}
                        className="h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white placeholder:text-slate-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50"
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="typeProjet" className="text-[10px] text-slate-400 font-medium">
                        Type *
                      </Label>
                      <Select
                        value={formData.typeProjet}
                        onValueChange={(value) => handleChange("typeProjet", value)}
                      >
                        <SelectTrigger className="h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white text-xs disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50" disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="bg-slate-800 border-slate-600/50 z-[90] text-xs">
                          <SelectItem value="appartement">Appartement</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                          <SelectItem value="magasin">Magasin</SelectItem>
                          <SelectItem value="bureau">Bureau</SelectItem>
                          <SelectItem value="riad">Riad</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="architecteAssigne" className="text-[10px] text-slate-400 font-medium">
                        Architecte *
                      </Label>
                      <Select
                        value={formData.architecteAssigne}
                        onValueChange={(value) => handleChange("architecteAssigne", value)}
                      >
                        <SelectTrigger className="h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white text-xs disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50" disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="bg-slate-800 border-slate-600/50 z-[90] text-xs">
                          {architects.map((arch) => (
                            <SelectItem key={arch} value={arch}>
                              {arch.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="statutProjet" className="text-[10px] text-slate-400 font-medium">
                        Statut *
                      </Label>
                      <Select
                        value={formData.statutProjet}
                        onValueChange={(value) => handleChange("statutProjet", value)}
                      >
                        <SelectTrigger className="h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white text-xs disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50" disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="bg-slate-800 border-slate-600/50 z-[90] text-xs max-h-[200px] overflow-y-auto">
                          {/* Statuts principaux (sans doublons) */}
                          <SelectItem value="qualifie">Qualifié</SelectItem>
                          <SelectItem value="prise_de_besoin">Prise de besoin</SelectItem>
                          <SelectItem value="acompte_recu">Acompte reçu</SelectItem>
                          <SelectItem value="conception">Conception</SelectItem>
                          <SelectItem value="devis_negociation">Devis / Négociation</SelectItem>
                          <SelectItem value="accepte">Accepté</SelectItem>
                          <SelectItem value="premier_depot">1er Dépôt</SelectItem>
                          <SelectItem value="projet_en_cours">Projet en cours</SelectItem>
                          <SelectItem value="chantier">Chantier</SelectItem>
                          <SelectItem value="facture_reglee">Facture réglée</SelectItem>
                          <SelectItem value="livraison_termine">Livraison & Terminé</SelectItem>
                          <SelectItem value="refuse">Refusé</SelectItem>
                          <SelectItem value="perdu">Perdu</SelectItem>
                          <SelectItem value="annule">Annulé</SelectItem>
                          <SelectItem value="suspendu">Suspendu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="budget" className="text-[10px] text-slate-400 font-medium">
                      Estimation Montant (DH)
                    </Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => handleChange("budget", e.target.value)}
                        placeholder="0"
                        disabled={isSubmitting || (!editingClient && mode === "search" && !selectedLead)}
                        className="h-8 rounded-md bg-slate-800/60 border-slate-600/40 text-white placeholder:text-slate-500 text-xs disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary/50"
                      />
                  </div>
                </div>
              </div>


              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t border-slate-700/50">
                {!editingClient && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (mode === "manual") {
                        setMode("search")
                        setSelectedLead(null)
                      } else {
                        handleCreateNew()
                      }
                    }}
                    disabled={isSubmitting}
                    className="h-7 px-2.5 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-[10px] w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <X className="w-3 h-3 mr-1" />
                    {mode === "manual" ? "Retour" : "Manuel"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="h-7 px-2.5 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-[10px] w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <X className="w-3 h-3 mr-1" />
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-7 px-2.5 bg-primary hover:bg-primary/90 text-white text-[10px] w-full sm:w-auto shadow-[0_2px_8px_-2px_rgba(59,130,246,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {editingClient ? "Enregistrement..." : "Création..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      {editingClient ? "Enregistrer" : "Créer"}
                    </>
                  )}
                </Button>
              </div>
            </motion.form>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
