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
import { Trash2, UserPlus, XCircle, Save } from "lucide-react"
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

const defaultVilles = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tanger",
  "Fès",
  "Agadir",
  "Meknès",
  "Oujda",
  "Bouskoura",
  "Sale",
]

const defaultTypesBien = [
  "Villa",
  "Appartement",
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
  const [newNote, setNewNote] = useState("")
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false)
  
  const initialForm = {
    nom: lead?.nom || "",
    telephone: lead?.telephone || "",
    ville: lead?.ville || "",
    typeBien: lead?.typeBien || "",
    statut: lead?.statut || ("nouveau" as LeadStatus),
    statutDetaille: lead?.statutDetaille || "",
    message: lead?.message || "",
    assignePar: lead?.assignePar || "Radia",
    source: lead?.source || ("site_web" as LeadSource),
    priorite: lead?.priorite || ("moyenne" as LeadPriority),
    magasin: lead?.magasin || "",
    commercialMagasin: lead?.commercialMagasin || "",
    notes: lead?.notes || [],
  }

  const [formData, setFormData] = useState(initialForm)

  // Load commercials from Users API
  useEffect(() => {
    const loadCommercials = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const users = (await res.json()) as any[]
          const list: string[] = Array.from(new Set(
            users
              .filter((u: any) => ['admin', 'commercial', 'architect'].includes((u.role || '').toLowerCase()))
              .map((u: any) => (u.name || '').trim())
              .filter((n: string) => n)
          ))
          setCommercials(list.length ? list : ['Radia'])
          if (!formData.assignePar && list.length > 0) {
            setFormData((prev) => ({ ...prev, assignePar: list[0] }))
          }
        }
      } catch (error) {
        console.error('Error loading commercials:', error)
      }
    }
    loadCommercials()
  }, [])

  const resetForm = () => {
    setFormData({
      nom: "",
      telephone: "",
      ville: "",
      typeBien: "",
      statut: "nouveau" as LeadStatus,
      statutDetaille: "",
      message: "",
      assignePar: "Radia",
      source: "site_web" as LeadSource,
      priorite: "moyenne" as LeadPriority,
      magasin: "",
      commercialMagasin: "",
      notes: [],
    })
    setNewNote("")
  }

  useEffect(() => {
    if (lead && open) {
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
  }, [lead, open])

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
      derniereMaj: new Date().toISOString(),
      createdAt: lead?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    resetForm()
    onOpenChange(false)
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    
    const note: LeadNote = {
      id: Date.now().toString(),
      leadId: lead?.id || "",
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
      description: "La note a été ajoutée avec succès",
    })
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[840px] max-h-[92vh] overflow-y-auto glass backdrop-blur-xl bg-slate-900/90 border border-white/10 ring-1 ring-white/10">
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
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="glass rounded-xl bg-white/10 border border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telephone" className="text-slate-300">
                  Téléphone *
                </Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="glass rounded-xl bg-white/10 border border-white/10 text-white"
                  placeholder="06 XX XX XX XX"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ville" className="text-slate-300">
                  Ville *
                </Label>
                <CreatableSelect
                  value={formData.ville}
                  onValueChange={(value) => setFormData({ ...formData, ville: value })}
                  options={villes}
                  placeholder="Choisir ou créer..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="typeBien" className="text-slate-300">
                  Type de bien *
                </Label>
                <Select value={formData.typeBien} onValueChange={(value) => setFormData({ ...formData, typeBien: value })}>
                  <SelectTrigger className="glass rounded-xl bg-white/10 border border-white/10 text-white">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent className="glass bg-slate-900/95 border border-white/10">
                    {typesBien.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Select
                value={formData.source}
                onValueChange={(value) => {
                  const newSource = value as LeadSource
                  const calculatedPriority = calculatePriority(newSource)
                  setFormData({ 
                    ...formData, 
                    source: newSource, 
                    priorite: calculatedPriority,
                    magasin: newSource !== 'magasin' ? '' : formData.magasin,
                    commercialMagasin: newSource !== 'magasin' ? '' : formData.commercialMagasin,
                  })
                }}
                disabled={isSourceLocked}
              >
                <SelectTrigger className="glass rounded-xl bg-white/10 border border-white/10 text-white">
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
              {isSourceLocked && (
                <p className="text-xs text-slate-400">
                  ℹ️ La source ne peut être modifiée que par un administrateur
                </p>
              )}
            </div>

            {/* Sous-champs si Magasin sélectionné */}
            {formData.source === 'magasin' && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-500/50">
                <div className="space-y-2">
                  <Label htmlFor="magasin" className="text-slate-300">
                    Magasin *
                  </Label>
                  <Select
                    value={formData.magasin}
                    onValueChange={(value) => setFormData({ ...formData, magasin: value })}
                  >
                    <SelectTrigger className="glass rounded-xl bg-white/10 border border-white/10 text-white">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commercialMagasin" className="text-slate-300">
                    Commercial magasin *
                  </Label>
                  <Input
                    id="commercialMagasin"
                    value={formData.commercialMagasin}
                    onChange={(e) => setFormData({ ...formData, commercialMagasin: e.target.value })}
                    className="glass rounded-xl bg-white/10 border border-white/10 text-white"
                    placeholder="Saisir le nom du commercial"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="assignePar" className="text-slate-300">
                Assigné à *
              </Label>
              <Select
                value={formData.assignePar}
                onValueChange={(value) => setFormData({ ...formData, assignePar: value })}
              >
                <SelectTrigger className="glass rounded-xl bg-white/10 border border-white/10 text-white">
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
              <p className="text-xs text-slate-400">
                Assigné à : <span className="text-white font-medium">{formData.assignePar}</span>
              </p>
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
