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
import { AnimatePresence, motion } from "framer-motion"
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
  const [commercials, setCommercials] = useState<string[]>(["Radia"])
  const [villes, setVilles] = useState<string[]>(defaultVilles)
  const [typesBien, setTypesBien] = useState<string[]>(defaultTypesBien)
  const [architects, setArchitects] = useState<string[]>(['Mohamed'])
  const [newNote, setNewNote] = useState("")
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Load project managers (gestionnaires) and architects from Users API
  useEffect(() => {
    const loadAssignees = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const users = (await res.json()) as any[]
          // Filter users with role 'gestionnaire' (gestionnaire de projet) or 'architect'
          const list: string[] = Array.from(new Set(
            users
              .filter((u: any) => {
                const role = (u.role || '').toLowerCase()
                return role === 'gestionnaire' || role === 'architect'
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
          setArchitects(list.length ? list : ['Mohamed'])

          // Set Mohamed as default for new leads
          if (!lead) {
            setFormData((prev) => ({ ...prev, assignePar: defaultAssignee }))
          }
        } else {
          setArchitects(['Mohamed'])
          if (!lead) {
            setFormData((prev) => ({ ...prev, assignePar: 'Mohamed' }))
          }
        }
      } catch {
        setArchitects(['Mohamed'])
        if (!lead) {
          setFormData((prev) => ({ ...prev, assignePar: 'Mohamed' }))
        }
      }
    }
    loadAssignees()
  }, [lead])

  const resetForm = () => {
    setFormData({
      nom: "",
      telephone: "",
      ville: "",
      typeBien: "",
      statut: "nouveau" as LeadStatus,
      statutDetaille: "",
      message: "",
      assignePar: "Mohamed",
      source: "site_web" as LeadSource,
      priorite: "moyenne" as LeadPriority,
      magasin: "",
      commercialMagasin: "",
      notes: [],
    })
    setErrors({})
    setShowErrors(false)
  }

  useEffect(() => {
    if (lead && open) {
      setFormData((prev) => ({
        ...prev,
        nom: lead.nom,
        telephone: lead.telephone,
        ville: lead.ville,
        typeBien: lead.typeBien,
        statut: lead.statut,
        statutDetaille: lead.statutDetaille || "",
        message: lead.message || "",
        assignePar: lead.assignePar || prev.assignePar || (architects[0] || 'Mohamed'),
        source: lead.source,
        priorite: lead.priorite,
        magasin: lead.magasin || "",
        commercialMagasin: lead.commercialMagasin || "",
        notes: lead.notes || [],
      }))
    }
  }, [lead, architects, open])

  // When opening for a new lead (no lead provided), ensure Mohamed is default
  useEffect(() => {
    if (open && !lead) {
      resetForm()
      // ensure Mohamed or first available gestionnaire is the default assignee
      const defaultAssignee = architects.find((name: string) =>
        name.toLowerCase().includes('mohamed')
      ) || architects[0] || 'Mohamed'
      setFormData((prev) => ({ ...prev, assignePar: defaultAssignee }))
    }
  }, [open, lead, architects])

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true)
    try {
      const calculatedPriority = calculatePriority(formData.source)
      await onSave({
        ...formData,
        priorite: calculatedPriority,
        id: lead?.id,
        // Use current timestamp - API will use this or override with server time
        derniereMaj: new Date().toISOString(),
        createdAt: lead?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      // Reset and close to avoid reopening with stale values
      resetForm()
      onOpenChange(false)
      toast({
        title: "Succès",
        description: lead ? "Lead mis à jour avec succès" : "Lead créé avec succès",
      })
    } catch (error: any) {
      console.error("Error saving lead:", error)
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWrapper}>
      <DialogContent className="bg-popover/98 border-2 border-primary/40 sm:max-w-[680px] max-h-[90vh] overflow-y-auto shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-blue-400 to-premium bg-clip-text text-transparent">
            {lead ? "Modifier le lead" : "Nouveau lead"}
          </DialogTitle>
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
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-foreground">
              Nom complet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => handleFieldChange("nom", e.target.value)}
              className={cn(
                "border-border/60 focus:border-primary/60",
                errors.nom
                  ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                  : ""
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
            <Label htmlFor="telephone" className="text-foreground">
              Téléphone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telephone"
              value={formData.telephone}
              onChange={(e) => handleFieldChange("telephone", e.target.value)}
              className={cn(
                "border-border/60 focus:border-primary/60",
                errors.telephone
                  ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                  : ""
              )}
              placeholder="212 6XX-XXXXXX"
            />
            {errors.telephone && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.telephone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ville" className="text-foreground">
                Ville <span className="text-red-500">*</span>
              </Label>
              <div>
                <CreatableSelect
                  value={formData.ville}
                  onValueChange={(value) => handleFieldChange("ville", value)}
                  options={villes}
                  placeholder="Choisir ou créer..."
                  searchPlaceholder="Rechercher..."
                  emptyText="Tapez pour créer une nouvelle ville"
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
              <Label htmlFor="typeBien" className="text-foreground">
                Type de bien <span className="text-red-500">*</span>
              </Label>
              <div>
                <CreatableSelect
                  value={formData.typeBien}
                  onValueChange={(value) => handleFieldChange("typeBien", value)}
                  options={typesBien}
                  placeholder="Choisir ou créer..."
                  searchPlaceholder="Rechercher..."
                  emptyText="Tapez pour créer un nouveau type"
                  className={errors.typeBien ? "border-red-500/50" : ""}
                />
                {errors.typeBien && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.typeBien}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statut" className="text-foreground">
              Statut
            </Label>
            <Select
              value={formData.statut}
              onValueChange={(value) => setFormData({ ...formData, statut: value as LeadStatus })}
            >
              <SelectTrigger className="border-border/60 focus:border-primary/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/60">
                {statuts.map((statut) => (
                  <SelectItem key={statut.value} value={statut.value}>
                    {statut.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statutDetaille" className="text-foreground">
              Statut détaillé
            </Label>
            <Textarea
              id="statutDetaille"
              value={formData.statutDetaille}
              onChange={(e) => setFormData({ ...formData, statutDetaille: e.target.value })}
              className="border-border/60 focus:border-primary/60 min-h-[80px]"
              placeholder="Ex: En deplacement à recontacter dans 10 jours"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-foreground">
              Message / Note importante
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="border-border/60 focus:border-primary/60 min-h-[80px]"
              placeholder="Ex: ELLE va m envoyer la video et le plan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignePar" className="text-foreground">
                Assigné à <span className="text-red-500">*</span>
              </Label>
              <div>
                <Select
                  value={formData.assignePar}
                  onValueChange={(value) => handleFieldChange("assignePar", value)}
                >
                  <SelectTrigger className={cn(
                    "border-border/60 focus:border-primary/60",
                    errors.assignePar
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                      : ""
                  )}>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="border-border/60">
                    {architects.map((name: string) => (
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source" className="text-foreground">
                Source du lead <span className="text-red-500">*</span>
              </Label>
              <div>
                <Select
                  value={formData.source}
                  onValueChange={(value) => {
                    const newSource = value as LeadSource
                    const calculatedPriority = calculatePriority(newSource)
                    handleFieldChange("source", newSource)
                    setFormData({ ...formData, source: newSource, priorite: calculatedPriority })
                    // Clear magasin errors if source changes
                    if (newSource !== 'magasin') {
                      const newErrors = { ...errors }
                      delete newErrors.magasin
                      delete newErrors.commercialMagasin
                      setErrors(newErrors)
                    }
                  }}
                >
                  <SelectTrigger className={cn(
                    "border-border/60 focus:border-primary/60",
                    errors.source
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                      : ""
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border/60">
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
              </div>
            </div>
          </div>

          {/* Magasin fields - only show if source is magasin */}
          {formData.source === 'magasin' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <div className="space-y-2">
                <Label htmlFor="magasin" className="text-foreground">
                  Magasin <span className="text-red-500">*</span>
                </Label>
                <div>
                  <Select
                    value={formData.magasin}
                    onValueChange={(value) => handleFieldChange("magasin", value)}
                  >
                    <SelectTrigger className={cn(
                      "border-border/60 focus:border-primary/60",
                      errors.magasin
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                        : ""
                    )}>
                      <SelectValue placeholder="Sélectionner un magasin" />
                    </SelectTrigger>
                    <SelectContent className="border-border/60">
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
                <Label htmlFor="commercialMagasin" className="text-foreground">
                  Commercial magasin <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="commercialMagasin"
                  value={formData.commercialMagasin}
                  onChange={(e) => handleFieldChange("commercialMagasin", e.target.value)}
                  className={cn(
                    "border-border/60 focus:border-primary/60",
                    errors.commercialMagasin
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                      : ""
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

          {/* Priority Display */}
          <div className="space-y-2">
            <Label className="text-foreground">
              Priorité du lead (calculée automatiquement)
            </Label>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-2 rounded-lg border text-sm font-medium ${formData.priorite === 'haute' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                  formData.priorite === 'moyenne' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/40'
                }`}>
                {formData.priorite === 'haute' ? 'Priorité Haute' :
                  formData.priorite === 'moyenne' ? 'Priorité Moyenne' :
                    'Priorité Basse'}
              </div>
              <span className="text-sm text-muted-foreground">
                Basée sur: {sources.find(s => s.value === formData.source)?.label}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {lead && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="glass text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
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
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                setErrors({})
                setShowErrors(false)
                onOpenChange(false)
              }} 
              className="glass"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-primary to-premium hover:opacity-90 shadow-lg shadow-primary/50 hover:shadow-primary/70 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  {lead ? "Enregistrement..." : "Création..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {lead ? "Enregistrer" : "Créer"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
