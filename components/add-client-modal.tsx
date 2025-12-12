"use client"

import type { Client, ProjectStatus, ProjectType } from "@/types/client"
import { useState, useEffect } from "react"
import { X, Save, User, Phone, Mail, MapPin, Building2, FileText } from "lucide-react"
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

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, "id" | "createdAt" | "updatedAt" | "derniereMaj">) => void
  editingClient?: Client | null
}

export function AddClientModal({ isOpen, onClose, onSave, editingClient }: AddClientModalProps) {
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

  // Populate form when editing
  useEffect(() => {
    if (editingClient) {
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
    } else {
      // Reset form for new client
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
  }, [editingClient, isOpen, architects])

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
    onClose()
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] !max-w-7xl max-h-[92vh] overflow-y-auto bg-[oklch(22%_0.03_260)] border-slate-600/30 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-white flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            {editingClient ? "Modifier le client" : "Nouveau client"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-base">
            {editingClient 
              ? "Modifiez les informations du client" 
              : "Ajoutez un nouveau client confirmé au système"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 mt-4">
          {/* Informations de base */}
          <div className="glass rounded-2xl p-7 border border-slate-600/30 space-y-6">
            <h3 className="text-base font-semibold text-white uppercase tracking-wider">
              Informations de base
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base"
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
                    className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base"
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
                    className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base"
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
                    className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <Label htmlFor="adresse" className="text-slate-200 font-medium">
                Adresse complète
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => handleChange("adresse", e.target.value)}
                  placeholder="Ex: 123 Rue Mohammed V, Casablanca"
                  className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base"
                />
              </div>
            </div>
          </div>

          {/* Détails du projet */}
          <div className="glass rounded-2xl p-7 border border-slate-600/30 space-y-6">
            <h3 className="text-base font-semibold text-white uppercase tracking-wider">
              Détails du projet
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="typeProjet" className="text-slate-200 font-medium">
                  Type de projet *
                </Label>
                <Select
                  value={formData.typeProjet}
                  onValueChange={(value) => handleChange("typeProjet", value)}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600/50">
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
                <Label htmlFor="statutProjet" className="text-slate-200 font-medium">
                  Statut du projet *
                </Label>
                <Select
                  value={formData.statutProjet}
                  onValueChange={(value) => handleChange("statutProjet", value)}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600/50">
                    <SelectItem value="en_conception">En conception</SelectItem>
                    <SelectItem value="en_travaux">En travaux</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
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
                  <SelectTrigger className="h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600/50">
                    {architects.map((arch) => (
                      <SelectItem key={arch} value={arch}>
                        {arch.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget" className="text-slate-200 font-medium">
                  Estimation Montant (MAD)
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleChange("budget", e.target.value)}
                    placeholder="Ex: 500000"
                    className="pl-10 h-12 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 text-base"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="glass rounded-2xl p-7 border border-slate-600/30 space-y-6">
            <h3 className="text-base font-semibold text-white uppercase tracking-wider">
              Notes additionnelles
            </h3>

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
                  className="pl-10 rounded-xl bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-500 resize-none text-base"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end pt-4 border-t border-slate-600/30">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
