"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatableSelect } from "@/components/creatable-select"
import { Textarea } from "@/components/ui/textarea"
import type { Lead, LeadStatus, LeadSource, LeadPriority, LeadNote } from "@/types/lead"
import { Trash2, UserPlus, XCircle, Save, AlertCircle, X } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterRoot,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface LeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead
  onSave: (lead: Omit<Lead, "id"> & { id?: string }) => void
  onDelete?: () => void
  onConvertToClient?: (lead: Lead) => void
  onMarkAsNotInterested?: (lead: Lead) => void
  currentUserRole?: string
  currentUserName?: string
}

// Liste complète des villes du Maroc
const defaultVilles = [
  "Agadir",
  "Aïn Harrouda",
  "Aïn Taoujdate",
  "Aït Melloul",
  "Al Hoceïma",
  "Azemmour",
  "Azrou",
  "Béni Mellal",
  "Berkane",
  "Berrechid",
  "Boujdour",
  "Bouskoura",
  "Casablanca",
  "Chefchaouen",
  "Dakhla",
  "Dar Bouazza",
  "El Aaiún",
  "El Jadida",
  "Errachidia",
  "Essaouira",
  "Fès",
  "Guelmim",
  "Ifrane",
  "Imzouren",
  "Kénitra",
  "Khemisset",
  "Khouribga",
  "Ksar El Kebir",
  "Larache",
  "Marrakech",
  "Meknès",
  "Mohammedia",
  "Nador",
  "Ouarzazate",
  "Oujda",
  "Rabat",
  "Safi",
  "Salé",
  "Settat",
  "Sidi Bennour",
  "Sidi Ifni",
  "Sidi Kacem",
  "Sidi Slimane",
  "Skhirat",
  "Tanger",
  "Taourirt",
  "Taroudant",
  "Taza",
  "Témara",
  "Tétouan",
  "Tifelt",
  "Tiznit",
  "Youssoufia",
  "Zagora",
]

const defaultTypesBien = [
  "Villa",
  "Appartement",
  "Duplex",
  "B2B",
  "Autre",
]

const statuts: { value: LeadStatus; label: string }[] = [
  { value: "nouveau", label: "🟢 Nouveau" },
  { value: "a_recontacter", label: "🟡 À recontacter" },
  { value: "sans_reponse", label: "🟠 Sans réponse" },
  { value: "non_interesse", label: "🔴 Non intéressé" },
  { value: "qualifie", label: "🔵 Qualifié" },
  { value: "refuse", label: "⚫ Refusé" },
]

const sources: { value: LeadSource; label: string }[] = [
  { value: "magasin", label: "🏢 Magasin" },
  { value: "site_web", label: "🌐 Site web" },
  { value: "facebook", label: "📘 Facebook" },
  { value: "instagram", label: "📷 Instagram" },
  { value: "tiktok", label: "🎵 TikTok" },
  { value: "reference_client", label: "👥 Recommandation" },
  { value: "autre", label: "📦 Autre" },
]

const magasins = [
  "📍 Casablanca",
  "📍 Rabat",
  "📍 Tanger",
  "📍 Marrakech",
  "📍 Bouskoura",
]

const calculatePriority = (source: LeadSource): LeadPriority => {
  switch (source) {
    case "magasin":
    case "reference_client":
      return "haute"
    case "site_web":
      return "moyenne"
    case "facebook":
    case "instagram":
    case "tiktok":
    case "autre":
      return "basse"
    default:
      return "moyenne"
  }
}

export function LeadModal({
  open,
  onOpenChange,
  lead,
  onSave,
  onDelete,
  onConvertToClient,
  onMarkAsNotInterested,
  currentUserRole = "admin",
  currentUserName = "Admin"
}: LeadModalProps) {
  const [commercials, setCommercials] = useState<string[]>(["Mohamed"])
  const [villes, setVilles] = useState<string[]>(defaultVilles)
  const [typesBien, setTypesBien] = useState<string[]>(defaultTypesBien)
  const [newNote, setNewNote] = useState("")
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)

  const initialForm = {
    nom: lead?.nom || "",
    telephone: lead?.telephone || "",
    ville: lead?.ville || "",
    typeBien: lead?.typeBien || "",
    statut: lead?.statut || ("nouveau" as LeadStatus),
    statutDetaille: lead?.statutDetaille || "",
    message: lead?.message || "",
    assignePar: lead?.assignePar || "Mohamed",
    source: lead?.source || ("site_web" as LeadSource),
    priorite: lead?.priorite || ("moyenne" as LeadPriority),
    magasin: lead?.magasin || "",
    commercialMagasin: lead?.commercialMagasin || "",
    notes: lead?.notes || [],
  }

  const [formData, setFormData] = useState(initialForm)

  // Load gestionnaires and architects from Users API
  useEffect(() => {
    const loadAssignees = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const users = (await res.json()) as any[]
          const list: string[] = Array.from(new Set(
            users
              .filter((u: any) => {
                const role = (u.role || '').toLowerCase()
                return role === 'gestionnaire' || role === 'admin' || role === 'commercial' || role === 'architect'
              })
              .map((u: any) => (u.name || '').trim())
              .filter((n: string) => n)
          ))

          // Find Mohamed as the default gestionnaire de projet
          const mohamedUser = users.find((u: any) =>
            (u.name || '').toLowerCase().includes('mohamed') &&
            (u.role || '').toLowerCase() === 'gestionnaire'
          )

          const defaultAssignee = mohamedUser?.name || list[0] || 'Mohamed'
          setCommercials(list.length ? list : ['Mohamed'])

          if (!lead) {
            setFormData((prev) => ({ ...prev, assignePar: defaultAssignee }))
          }
        }
      } catch (error) {
        console.error('Error loading assignees:', error)
      }
    }
    loadAssignees()
  }, [lead])

  const resetForm = () => {
    const defaultAssignee = commercials.find((name: string) =>
      name.toLowerCase().includes('mohamed')
    ) || commercials[0] || 'Mohamed'

    setFormData({
      nom: "",
      telephone: "",
      ville: "",
      typeBien: "",
      statut: "nouveau" as LeadStatus,
      statutDetaille: "",
      message: "",
      assignePar: defaultAssignee,
      source: "site_web" as LeadSource,
      priorite: "moyenne" as LeadPriority,
      magasin: "",
      commercialMagasin: "",
      notes: [],
    })
    setNewNote("")
    setErrors({})
    setShowErrors(false)
  }

  useEffect(() => {
    if (lead && open) {
      // Load notes from API to ensure we have the latest
      const loadNotes = async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`/api/leads/${lead.id}/notes`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            const notes = await response.json()
            setFormData(prev => ({
              ...prev,
              nom: lead.nom,
              telephone: lead.telephone,
              ville: lead.ville,
              typeBien: lead.typeBien,
              statut: lead.statut,
              statutDetaille: lead.statutDetaille || "",
              message: lead.message || "",
              assignePar: lead.assignePar,
              source: lead.source,
              priorite: lead.priorite,
              magasin: lead.magasin || "",
              commercialMagasin: lead.commercialMagasin || "",
              notes: notes || [],
            }))
          } else {
            // Fallback to notes from lead object if API fails
            setFormData({
              nom: lead.nom,
              telephone: lead.telephone,
              ville: lead.ville,
              typeBien: lead.typeBien,
              statut: lead.statut,
              statutDetaille: lead.statutDetaille || "",
              message: lead.message || "",
              assignePar: lead.assignePar,
              source: lead.source,
              priorite: lead.priorite,
              magasin: lead.magasin || "",
              commercialMagasin: lead.commercialMagasin || "",
              notes: lead.notes || [],
            })
          }
        } catch (error) {
          console.error('Error loading notes:', error)
          // Fallback to notes from lead object
          setFormData({
            nom: lead.nom,
            telephone: lead.telephone,
            ville: lead.ville,
            typeBien: lead.typeBien,
            statut: lead.statut,
            statutDetaille: lead.statutDetaille || "",
            message: lead.message || "",
            assignePar: lead.assignePar,
            source: lead.source,
            priorite: lead.priorite,
            magasin: lead.magasin || "",
            commercialMagasin: lead.commercialMagasin || "",
            notes: lead.notes || [],
          })
        }
      }

      loadNotes()
    } else if (open && !lead) {
      // For new leads, ensure notes array is empty
      setFormData(prev => ({
        ...prev,
        notes: []
      }))
    }
  }, [lead, open])

  // Note: The resetForm logic is now handled in the useEffect above

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nom.trim()) {
      newErrors.nom = "Le nom complet est requis"
    }
    if (!formData.telephone.trim()) {
      newErrors.telephone = "Le numéro de téléphone est requis"
    } else if (!/^[0-9+\s-]{8,}$/.test(formData.telephone.trim())) {
      newErrors.telephone = "Veuillez saisir un numéro de téléphone valide"
    }
    if (!formData.ville) {
      newErrors.ville = "Veuillez sélectionner une ville"
    }
    if (!formData.typeBien) {
      newErrors.typeBien = "Veuillez sélectionner un type de bien"
    }
    if (!formData.source) {
      newErrors.source = "Veuillez sélectionner une source"
    }
    if (!formData.assignePar) {
      newErrors.assignePar = "Veuillez sélectionner une personne à assigner"
    }
    
    // If source is magasin, validate magasin-specific fields
    if (formData.source === 'magasin') {
      if (!formData.magasin) {
        newErrors.magasin = "Veuillez sélectionner un magasin"
      }
      if (!formData.commercialMagasin?.trim()) {
        newErrors.commercialMagasin = "Le nom du commercial est requis"
      }
    }

    setErrors(newErrors)
    setShowErrors(Object.keys(newErrors).length > 0)
    
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0]
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
        element.focus()
      }
      return false
    }

    return true
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
    // Clear error for this field when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: `Veuillez corriger ${Object.keys(errors).length} erreur(s) dans le formulaire`,
        variant: "destructive"
      })
      return
    }

    const calculatedPriority = calculatePriority(formData.source)
    onSave({
      ...formData,
      priorite: calculatedPriority,
      id: lead?.id,
      derniereMaj: new Date().toISOString(),
      createdAt: lead?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    resetForm()
    setErrors({})
    setShowErrors(false)
    onOpenChange(false)
  }

  // Prevent modal from closing when clicking outside if there are errors
  const handleOpenChangeWrapper = (open: boolean) => {
    if (!open && showErrors) {
      // Don't close if there are validation errors
      return
    }
    if (!open) {
      // Clear errors when closing
      setErrors({})
      setShowErrors(false)
    }
    onOpenChange(open)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    // If editing an existing lead, save the note to the database immediately
    if (lead?.id) {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/leads/${lead.id}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: newNote
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save note')
        }

        const savedNote = await response.json()

        // Add the saved note to local state
        setFormData(prev => ({
          ...prev,
          notes: [savedNote, ...(prev.notes || [])]
        }))
        setNewNote("")

        toast({
          title: "Note ajoutée",
          description: "La note a été enregistrée avec succès.",
        })
      } catch (error) {
        console.error('Error saving note:', error)
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer la note.",
          variant: "destructive"
        })
      }
    } else {
      // For new leads, just add to local state (will be saved when lead is created)
      const note: LeadNote = {
        id: Date.now().toString(),
        leadId: "",
        content: newNote,
        author: currentUserName,
        createdAt: new Date().toISOString(),
      }

      setFormData(prev => ({
        ...prev,
        notes: [...(prev.notes || []), note]
      }))
      setNewNote("")

      toast({
        title: "Note ajoutée",
        description: "La note sera enregistrée lors de la création du lead.",
      })
    }
  }

  const handleConvertToClient = () => {
    if (lead && onConvertToClient) {
      onConvertToClient(lead)
      setShowConvertDialog(false)
      onOpenChange(false)
    }
  }

  const handleMarkAsNotInterested = () => {
    if (lead && onMarkAsNotInterested) {
      onMarkAsNotInterested(lead)
      setShowNotInterestedDialog(false)
      onOpenChange(false)
    }
  }

  const isAdmin = currentUserRole === 'admin'
  const isSourceLocked = lead && !isAdmin

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWrapper}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[840px] max-h-[92vh] overflow-y-auto glass backdrop-blur-xl bg-slate-900/90 border border-white/10 ring-1 ring-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            {lead ? "✏️ Modifier le lead" : "➕ Nouveau lead"}
          </DialogTitle>
          {lead && (
            <div className="text-sm text-slate-400 mt-2">
              Lead créé par : <span className="text-white font-medium">{lead.createdBy || lead.assignePar}</span>
              {lead.source === 'magasin' && lead.magasin && (
                <span> — {lead.magasin}</span>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Error Summary */}
        <AnimatePresence>
          {showErrors && Object.keys(errors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-400 mb-1">
                    Veuillez corriger les erreurs suivantes :
                  </p>
                  <ul className="text-xs text-red-300/80 space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-red-400" />
                        {message}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setShowErrors(false)
                    setErrors({})
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Informations principales */}
          <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              📋 Informations principales
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-slate-300">
                  Nom complet *
                </Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => handleFieldChange("nom", e.target.value)}
                  className={cn(
                    "glass rounded-xl bg-white/10 border text-white",
                    errors.nom
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                      : "border-white/10"
                  )}
                />
                {errors.nom && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nom}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telephone" className="text-slate-300">
                  Téléphone *
                </Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => handleFieldChange("telephone", e.target.value)}
                  className={cn(
                    "glass rounded-xl bg-white/10 border text-white",
                    errors.telephone
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                      : "border-white/10"
                  )}
                  placeholder="06 XX XX XX XX"
                />
                {errors.telephone && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.telephone}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ville" className="text-slate-300">
                  Ville *
                </Label>
                <div>
                  <CreatableSelect
                    value={formData.ville}
                    onValueChange={(value) => handleFieldChange("ville", value)}
                    options={villes}
                    placeholder="Choisir ou créer..."
                    className={errors.ville ? "border-red-500/50" : ""}
                  />
                  {errors.ville && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.ville}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="typeBien" className="text-slate-300">
                  Type de bien *
                </Label>
                <div>
                  <Select value={formData.typeBien} onValueChange={(value) => handleFieldChange("typeBien", value)}>
                    <SelectTrigger className={cn(
                      "glass rounded-xl bg-white/10 border text-white",
                      errors.typeBien
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                        : "border-white/10"
                    )}>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent className="glass bg-slate-900/95 border border-white/10">
                      {typesBien.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.typeBien && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.typeBien}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Source du lead */}
          <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              🧭 Source du lead
            </h3>

            <div className="space-y-2">
              <Label htmlFor="source" className="text-slate-300">
                Source du lead *
              </Label>
              <div>
                <Select
                  value={formData.source}
                  onValueChange={(value) => {
                    const newSource = value as LeadSource
                    const calculatedPriority = calculatePriority(newSource)
                    handleFieldChange("source", newSource)
                    setFormData({
                      ...formData,
                      source: newSource,
                      priorite: calculatedPriority,
                      magasin: newSource !== 'magasin' ? '' : formData.magasin,
                      commercialMagasin: newSource !== 'magasin' ? '' : formData.commercialMagasin,
                    })
                    // Clear magasin errors if source changes
                    if (newSource !== 'magasin') {
                      const newErrors = { ...errors }
                      delete newErrors.magasin
                      delete newErrors.commercialMagasin
                      setErrors(newErrors)
                    }
                  }}
                  disabled={isSourceLocked}
                >
                  <SelectTrigger className={cn(
                    "glass rounded-xl bg-white/10 border text-white",
                    errors.source
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                      : "border-white/10"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.source && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.source}
                  </p>
                )}
                {isSourceLocked && !errors.source && (
                  <p className="text-xs text-slate-400 mt-1">
                    ℹ️ La source ne peut être modifiée que par un administrateur
                  </p>
                )}
              </div>
            </div>

            {/* Sous-champs si Magasin sélectionné */}
            {formData.source === 'magasin' && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-500/50">
                <div className="space-y-2">
                  <Label htmlFor="magasin" className="text-slate-300">
                    Magasin *
                  </Label>
                  <div>
                    <Select
                      value={formData.magasin}
                      onValueChange={(value) => handleFieldChange("magasin", value)}
                    >
                      <SelectTrigger className={cn(
                        "glass rounded-xl bg-white/10 border text-white",
                        errors.magasin
                          ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                          : "border-white/10"
                      )}>
                        <SelectValue placeholder="Sélectionner un magasin" />
                      </SelectTrigger>
                      <SelectContent>
                        {magasins.map((mag) => (
                          <SelectItem key={mag} value={mag}>
                            {mag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.magasin && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.magasin}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commercialMagasin" className="text-slate-300">
                    Commercial magasin *
                  </Label>
                  <Input
                    id="commercialMagasin"
                    value={formData.commercialMagasin}
                    onChange={(e) => handleFieldChange("commercialMagasin", e.target.value)}
                    className={cn(
                      "glass rounded-xl bg-white/10 border text-white",
                      errors.commercialMagasin
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                        : "border-white/10"
                    )}
                    placeholder="Saisir le nom du commercial"
                  />
                  {errors.commercialMagasin && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.commercialMagasin}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="assignePar" className="text-slate-300">
                Assigné à *
              </Label>
              <div>
                <Select
                  value={formData.assignePar}
                  onValueChange={(value) => handleFieldChange("assignePar", value)}
                >
                  <SelectTrigger className={cn(
                    "glass rounded-xl bg-white/10 border text-white",
                    errors.assignePar
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                      : "border-white/10"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commercials.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assignePar && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.assignePar}
                  </p>
                )}
                {!errors.assignePar && (
                  <p className="text-xs text-slate-400 mt-1">
                    Assigné à : <span className="text-white font-medium">{formData.assignePar}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Priorité calculée automatiquement */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                Priorité (calculée automatiquement)
              </Label>
              <div className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium inline-block",
                formData.priorite === 'haute' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                  formData.priorite === 'moyenne' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/40'
              )}>
                {formData.priorite === 'haute' ? '🔥 Priorité Haute' :
                  formData.priorite === 'moyenne' ? '⚡ Priorité Moyenne' :
                    '📋 Priorité Basse'}
              </div>
            </div>
          </div>

          {/* Section: Statut et notes */}
          <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              📊 Statut et suivi
            </h3>

            <div className="space-y-2">
              <Label htmlFor="statut" className="text-slate-300">
                État du lead
              </Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => setFormData({ ...formData, statut: value as LeadStatus })}
              >
                <SelectTrigger className="glass rounded-xl bg-white/10 border border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuts.map((statut) => (
                    <SelectItem key={statut.value} value={statut.value}>
                      {statut.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statutDetaille" className="text-slate-300">
                Statut détaillé
              </Label>
              <Textarea
                id="statutDetaille"
                value={formData.statutDetaille}
                onChange={(e) => setFormData({ ...formData, statutDetaille: e.target.value })}
                className="glass rounded-xl bg-white/10 border border-white/10 text-white min-h-[80px]"
                placeholder="Ex: En déplacement, à recontacter dans 10 jours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-slate-300">
                Message / Note importante
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="glass rounded-xl bg-white/10 border border-white/10 text-white min-h-[80px]"
                placeholder="Ex: Client souhaite une villa à Bouskoura avec piscine"
              />
            </div>
          </div>

          {/* Section: Historique et notes */}
          {lead && (
            <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                📝 Historique et notes
              </h3>

              {/* Timeline des notes */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.notes && formData.notes.length > 0 ? (
                  formData.notes.map((note, index) => (
                    <div key={note.id} className="flex gap-3 relative">
                      {index !== formData.notes!.length - 1 && (
                        <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-slate-700"></div>
                      )}
                      <div className="w-4 h-4 rounded-full bg-blue-500 mt-1 flex-shrink-0 z-10"></div>
                      <div className="flex-1 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-blue-400">{note.author}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(note.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{note.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-4">
                    Aucune note ajoutée — commencez à suivre le contact
                  </p>
                )}
              </div>

              {/* Ajouter une note */}
              <div className="space-y-2 pt-3 border-t border-slate-700/50">
                <Label htmlFor="newNote" className="text-slate-300">
                  Ajouter une note
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="newNote"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="bg-slate-800/50 border-slate-600/50 text-white min-h-[60px]"
                    placeholder="Ex: Client rappelé, souhaite visiter le showroom samedi..."
                  />
                  <Button
                    type="button"
                    onClick={handleAddNote}
                    className="bg-blue-600 hover:bg-blue-700 px-4"
                    disabled={!newNote.trim()}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            {/* Bouton Supprimer (gauche) */}
            {lead && onDelete && isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Le lead sera définitivement supprimé.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooterRoot>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={onDelete}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooterRoot>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Boutons d'action principaux */}
            <div className="flex gap-2 ml-auto">
              {/* Lead non intéressé */}
              {lead && onMarkAsNotInterested && (
                <AlertDialog open={showNotInterestedDialog} onOpenChange={setShowNotInterestedDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Lead non intéressé
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Marquer comme non intéressé ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Confirmez-vous que ce lead n'est plus intéressé ? Le statut sera mis à jour.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooterRoot>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleMarkAsNotInterested}
                      >
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooterRoot>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Convertir en client */}
              {lead && onConvertToClient && isAdmin && lead.statut !== 'qualifie' && (
                <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Convertir en client
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Convertir en client ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Souhaitez-vous convertir ce lead en client ? Un nouveau client sera créé automatiquement dans la section Clients & Projets.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooterRoot>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleConvertToClient}
                      >
                        Convertir
                      </AlertDialogAction>
                    </AlertDialogFooterRoot>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Enregistrer */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {lead ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
