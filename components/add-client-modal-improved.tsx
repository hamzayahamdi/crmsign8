"use client"

import type { Client, ProjectStatus, ProjectType } from "@/types/client"
import type { Lead } from "@/types/lead"
import { useState, useEffect } from "react"
import { X, Save, User, Phone, Mail, MapPin, Building2, FileText, Sparkles } from "lucide-react"
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
} from "@/components/ui/dialog"
import { LeadAutocomplete } from "@/components/lead-autocomplete"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface AddClientModalImprovedProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "derniereMaj">) => void
  editingClient?: Client | null
}

export function AddClientModalImproved({ isOpen, onClose, onSave, editingClient }: AddClientModalImprovedProps) {
  const [mode, setMode] = useState<"search" | "manual">("search")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    ville: "",
    adresse: "",
    typeProjet: "appartement" as ProjectType,
    architecteAssigne: "",
    statutProjet: "en_conception" as ProjectStatus,
    budget: "",
    notes: "",
  })

  const [architects, setArchitects] = useState<string[]>([])

  // Load architects
  useEffect(() => {
    const loadArchitects = async () => {
      try {
        const res = await fetch('/api/users')
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

  // Populate form when editing or lead selected
  useEffect(() => {
    if (editingClient) {
      setMode("manual")
      setFormData({
        nom: editingClient.nom,
        telephone: editingClient.telephone,
        email: editingClient.email || "",
        ville: editingClient.ville,
        adresse: editingClient.adresse || "",
        typeProjet: editingClient.typeProjet,
        architecteAssigne: editingClient.architecteAssigne,
        statutProjet: editingClient.statutProjet,
        budget: editingClient.budget?.toString() || "",
        notes: editingClient.notes || "",
      })
    } else if (selectedLead) {
      setMode("manual")
      setFormData({
        nom: selectedLead.nom,
        telephone: selectedLead.telephone,
        email: "",
        ville: selectedLead.ville,
        adresse: "",
        typeProjet: (selectedLead.typeBien?.toLowerCase() as ProjectType) || "appartement",
        architecteAssigne: architects[0] || "TAZI",
        statutProjet: "en_conception",
        budget: "",
        notes: selectedLead.message || "",
      })
    } else if (!editingClient) {
      setMode("search")
      setSelectedLead(null)
      setFormData({
        nom: "",
        telephone: "",
        email: "",
        ville: "",
        adresse: "",
        typeProjet: "appartement",
        architecteAssigne: architects[0] || "TAZI",
        statutProjet: "en_conception",
        budget: "",
        notes: "",
      })
    }
  }, [editingClient, selectedLead, isOpen, architects])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const clientData: any = {
      nom: formData.nom.trim(),
      telephone: formData.telephone.trim(),
      ville: formData.ville.trim(),
      typeProjet: formData.typeProjet,
      architecteAssigne: formData.architecteAssigne,
      statutProjet: formData.statutProjet,
      historique: editingClient?.historique || [],
    }

    if (formData.email.trim()) clientData.email = formData.email.trim()
    if (formData.adresse.trim()) clientData.adresse = formData.adresse.trim()
    if (formData.budget) clientData.budget = parseFloat(formData.budget)
    if (formData.notes.trim()) clientData.notes = formData.notes.trim()

    onSave(clientData)
    handleClose()
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] !max-w-4xl max-h-[90vh] overflow-y-auto bg-[oklch(22%_0.03_260)] border-slate-600/30 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-white flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            {editingClient ? "Modifier le client" : "Nouveau client"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-base">
            {editingClient 
              ? "Modifiez les informations du client" 
              : "Recherchez un lead existant ou complétez les informations du client"}
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
              <div className="relative z-10 glass rounded-2xl p-5 border border-slate-600/30 overflow-visible">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Recherche intelligente</h3>
                      <p className="text-xs text-slate-400">Trouvez rapidement un lead existant</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Ou</span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateNew}
                      className="h-9 px-3 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-xs"
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
                className="rounded-2xl p-5 bg-gradient-to-r from-primary/20 to-premium/10 border border-primary/40 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center ring-2 ring-primary/40">
                      <span className="text-sm font-semibold text-white">
                        {selectedLead.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-bold text-white tracking-wide">{selectedLead.nom}</p>
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
                    className="text-slate-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-8"
            >
    
              {/* Informations principales */}
              <div className="glass rounded-2xl p-6 border border-slate-600/30 space-y-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Informations principales
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-slate-200 font-medium">
                      Nom du client *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => handleChange("nom", e.target.value)}
                        placeholder="Ex: Ahmed Benali"
                        required
                        disabled={!editingClient && mode === "search" && !selectedLead}
                        className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone" className="text-slate-200 font-medium">
                      Téléphone *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="telephone"
                        value={formData.telephone}
                        onChange={(e) => handleChange("telephone", e.target.value)}
                        placeholder="Ex: 212 661-234567"
                        required
                        disabled={!editingClient && mode === "search" && !selectedLead}
                        className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200 font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="Ex: client@example.com"
                        disabled={!editingClient && mode === "search" && !selectedLead}
                        className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ville" className="text-slate-200 font-medium">
                      Ville *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="ville"
                        value={formData.ville}
                        onChange={(e) => handleChange("ville", e.target.value)}
                        placeholder="Ex: Casablanca"
                        required
                        disabled={!editingClient && mode === "search" && !selectedLead}
                        className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Détails du projet (essentiels) */}
              <div className="glass rounded-2xl p-6 border border-slate-600/30 space-y-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Détails du projet
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="typeProjet" className="text-slate-200 font-medium">
                      Type de projet *
                    </Label>
                    <Select
                      value={formData.typeProjet}
                      onValueChange={(value) => handleChange("typeProjet", value)}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white text-base disabled:opacity-60 disabled:cursor-not-allowed" disabled={!editingClient && mode === "search" && !selectedLead}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={8} className="bg-slate-800 border-slate-600/50 z-[90]">
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

                  <div className="space-y-2">
                    <Label htmlFor="architecteAssigne" className="text-slate-200 font-medium">
                      Architecte assigné *
                    </Label>
                    <Select
                      value={formData.architecteAssigne}
                      onValueChange={(value) => handleChange("architecteAssigne", value)}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white text-base disabled:opacity-60 disabled:cursor-not-allowed" disabled={!editingClient && mode === "search" && !selectedLead}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={8} className="bg-slate-800 border-slate-600/50 z-[90]">
                        {architects.map((arch) => (
                          <SelectItem key={arch} value={arch}>
                            {arch.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statutProjet" className="text-slate-200 font-medium">
                      Statut du projet *
                    </Label>
                    <Select
                      value={formData.statutProjet}
                      onValueChange={(value) => handleChange("statutProjet", value)}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white text-base disabled:opacity-60 disabled:cursor-not-allowed" disabled={!editingClient && mode === "search" && !selectedLead}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={8} className="bg-slate-800 border-slate-600/50 z-[90]">
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="acompte_verse">Acompte versé</SelectItem>
                        <SelectItem value="en_conception">En conception</SelectItem>
                        <SelectItem value="en_chantier">En chantier</SelectItem>
                        <SelectItem value="livraison">Livraison</SelectItem>
                        <SelectItem value="termine">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section avancée (optionnelle) */}
              <div className="glass rounded-2xl p-6 border border-slate-600/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Options avancées</h3>
                  <Button type="button" variant="outline" onClick={() => setShowAdvanced(v => !v)} className="h-9 px-3 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-xs">
                    {showAdvanced ? "Masquer" : "Afficher"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-slate-200 font-medium">
                    Notes
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      placeholder="Ajoutez des notes sur le client ou le projet..."
                      rows={5}
                      disabled={!editingClient && mode === "search" && !selectedLead}
                      className="pl-10 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 resize-none text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-end pt-4 border-t border-slate-600/30">
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
                    className="h-12 px-6 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-base"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {mode === "manual" ? "Retour à la recherche" : "Saisir manuellement"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="h-12 px-6 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-base"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="h-12 px-6 bg-primary hover:bg-primary/90 text-white text-base"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingClient ? "Enregistrer" : "Créer le client"}
                </Button>
              </div>
            </motion.form>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
