"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Lead, LeadStatus, LeadSource, LeadPriority } from "@/types/lead"
import { Trash2 } from "lucide-react"
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

interface LeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead
  onSave: (lead: Omit<Lead, "id"> & { id?: string }) => void
  onDelete?: () => void
}

const villes = [
  "Marrakech",
  "Casablanca",
  "Rabat",
  "Fès",
  "Tanger",
  "Agadir",
  "Meknès",
  "Oujda",
  "Sale",
  "Ain Sbai",
  "Benslimane",
  "Casa",
]
const typesBien = [
  "Appartement",
  "Villa",
  "Bureau",
  "Terrain",
  "Riad",
  "Commerce",
  "Appartement (travaux)",
  "Appartement et plateau bureau",
  "Studio 45 M²",
  "Appartement secondaire",
  "3 Appartements (travaux)",
]
const statuts: { value: LeadStatus; label: string }[] = [
  { value: "nouveau", label: "Nouveau" },
  { value: "a_recontacter", label: "À recontacter" },
  { value: "en_cours", label: "En cours d'acquisition" },
  { value: "signe", label: "Signé" },
  { value: "perdu", label: "Perdu / Sans réponse" },
]

const sources: { value: LeadSource; label: string }[] = [
  { value: "magasin", label: "Magasin" },
  { value: "recommandation", label: "Recommandation" },
  { value: "site_web", label: "Site web" },
  { value: "reseaux_sociaux", label: "Réseaux sociaux" },
]

// Function to calculate priority based on source
const calculatePriority = (source: LeadSource): LeadPriority => {
  switch (source) {
    case "magasin":
    case "recommandation":
      return "haute"
    case "site_web":
      return "moyenne"
    case "reseaux_sociaux":
      return "basse"
    default:
      return "moyenne"
  }
}

export function LeadModal({ open, onOpenChange, lead, onSave, onDelete }: LeadModalProps) {
  const initialForm = {
    nom: lead?.nom || "",
    telephone: lead?.telephone || "",
    ville: lead?.ville || "",
    typeBien: lead?.typeBien || "",
    statut: lead?.statut || ("nouveau" as LeadStatus),
    statutDetaille: lead?.statutDetaille || "",
    assignePar: lead?.assignePar || "TAZI",
    source: lead?.source || ("site_web" as LeadSource),
    priorite: lead?.priorite || ("moyenne" as LeadPriority),
  }

  const [formData, setFormData] = useState(initialForm)

  const resetForm = () => setFormData({
    nom: "",
    telephone: "",
    ville: "",
    typeBien: "",
    statut: "nouveau" as LeadStatus,
    statutDetaille: "",
    assignePar: "TAZI",
    source: "site_web" as LeadSource,
    priorite: "moyenne" as LeadPriority,
  })

  useEffect(() => {
    if (lead) {
      setFormData({
        nom: lead.nom,
        telephone: lead.telephone,
        ville: lead.ville,
        typeBien: lead.typeBien,
        statut: lead.statut,
        statutDetaille: lead.statutDetaille || "",
        assignePar: lead.assignePar,
        source: lead.source,
        priorite: lead.priorite,
      })
    }
  }, [lead])

  // When opening for a new lead (no lead provided), clear the form
  useEffect(() => {
    if (open && !lead) {
      resetForm()
    }
  }, [open, lead])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const calculatedPriority = calculatePriority(formData.source)
    onSave({
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover/98 border-2 border-primary/40 sm:max-w-[680px] max-h-[90vh] overflow-y-auto shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-blue-400 to-premium bg-clip-text text-transparent">
            {lead ? "Modifier le lead" : "Nouveau lead"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-foreground">
              Nom complet
            </Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="border-border/60 focus:border-primary/60"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone" className="text-foreground">
              Téléphone
            </Label>
            <Input
              id="telephone"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              className="border-border/60 focus:border-primary/60"
              placeholder="212 6XX-XXXXXX"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ville" className="text-foreground">
                Ville
              </Label>
              <Select value={formData.ville} onValueChange={(value) => setFormData({ ...formData, ville: value })}>
                <SelectTrigger className="border-border/60 focus:border-primary/60">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="border-border/60">
                  {villes.map((ville) => (
                    <SelectItem key={ville} value={ville}>
                      {ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeBien" className="text-foreground">
                Type de bien
              </Label>
              <Select
                value={formData.typeBien}
                onValueChange={(value) => setFormData({ ...formData, typeBien: value })}
              >
                <SelectTrigger className="border-border/60 focus:border-primary/60">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="border-border/60">
                  {typesBien.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignePar" className="text-foreground">
                Assigné par
              </Label>
              <Select
                value={formData.assignePar}
                onValueChange={(value) => setFormData({ ...formData, assignePar: value })}
              >
                <SelectTrigger className="border-border/60 focus:border-primary/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/60">
                  <SelectItem value="TAZI">TAZI</SelectItem>
                  <SelectItem value="AZI">AZI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source" className="text-foreground">
                Source du lead
              </Label>
              <Select
                value={formData.source}
                onValueChange={(value) => {
                  const newSource = value as LeadSource
                  const calculatedPriority = calculatePriority(newSource)
                  setFormData({ ...formData, source: newSource, priorite: calculatedPriority })
                }}
              >
                <SelectTrigger className="border-border/60 focus:border-primary/60">
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
            </div>
          </div>

          {/* Priority Display */}
          <div className="space-y-2">
            <Label className="text-foreground">
              Priorité du lead (calculée automatiquement)
            </Label>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                formData.priorite === 'haute' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
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
                    <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
                  </AlertDialogFooterRoot>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="glass">
              Annuler
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-primary to-premium hover:opacity-90 shadow-lg shadow-primary/50 hover:shadow-primary/70 transition-all duration-300">
              {lead ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
