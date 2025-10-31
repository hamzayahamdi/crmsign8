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
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  FileText, 
  Save, 
  ArrowRightLeft, 
  Ban,
  Loader2,
  MessageSquare,
  Clock,
  Home,
  Globe
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface LeadModalRedesignedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead
  onSave: (lead: Omit<Lead, "id"> & { id?: string }) => void
  onDelete?: () => void
  onConvertToClient?: (lead: Lead) => void
  onMarkAsNotInterested?: (lead: Lead) => void
  currentUserRole?: string
  currentUserName?: string
  currentUserMagasin?: string
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
  { value: "converti", label: "🔵 Converti" },
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
  "Casa",
  "Rabat",
  "Tanger",
  "Marrakech",
  "Bouskoura",
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

export function LeadModalRedesigned({ 
  open, 
  onOpenChange, 
  lead, 
  onSave, 
  onDelete,
  onConvertToClient,
  onMarkAsNotInterested,
  currentUserRole = "admin",
  currentUserName = "Admin",
  currentUserMagasin
}: LeadModalRedesignedProps) {
  const [architects, setArchitects] = useState<string[]>(["Radia"])
  const [commercials, setCommercials] = useState<string[]>(["Radia"])
  const [villes, setVilles] = useState<string[]>(defaultVilles)
  const [typesBien, setTypesBien] = useState<string[]>(defaultTypesBien)
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isMarkingNotInterested, setIsMarkingNotInterested] = useState(false)
  const [showNotInterestedDialog, setShowNotInterestedDialog] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  
  const initialForm = {
    nom: lead?.nom || "",
    telephone: lead?.telephone || "",
    email: lead?.email || "",
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

  // Load architects and commercials from Users API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const users = (await res.json()) as any[]
          
          // Filter architects (for assignePar)
          const architectList: string[] = Array.from(new Set(
            users
              .filter((u: any) => ['admin', 'architect'].includes((u.role || '').toLowerCase()))
              .map((u: any) => (u.name || '').trim())
              .filter((n: string) => n)
          ))
          setArchitects(architectList.length ? architectList : ['Radia'])
          
          // Filter commercials (for commercialMagasin)
          const commercialList: string[] = Array.from(new Set(
            users
              .filter((u: any) => (u.role || '').toLowerCase() === 'commercial')
              .map((u: any) => (u.name || '').trim())
              .filter((n: string) => n)
          ))
          setCommercials(commercialList.length ? commercialList : [])
        }
      } catch (error) {
        console.error('Error loading users:', error)
      }
    }
    loadUsers()
  }, [])

  const resetForm = () => {
    setFormData({
      nom: "",
      telephone: "",
      email: "",
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
  }

  useEffect(() => {
    if (lead && open) {
      setFormData({
        nom: lead.nom,
        telephone: lead.telephone,
        email: lead.email || "",
        ville: lead.ville,
        typeBien: lead.typeBien,
        statut: lead.statut,
        statutDetaille: lead.statutDetaille || "",
        message: lead.message || "",
        assignePar: lead.assignePar,
        source: lead.source,
        priorite: lead.priorite,
        magasin: lead.magasin || (currentUserRole === 'commercial' ? (currentUserMagasin || "") : ""),
        commercialMagasin: lead.commercialMagasin || (currentUserRole === 'commercial' ? currentUserName : ""),
        notes: lead.notes || [],
      })
    }
  }, [lead, open])

  useEffect(() => {
    if (open && !lead) {
      resetForm()
    }
  }, [open, lead])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const calculatedPriority = calculatePriority(formData.source)
      const dataToSave = {
        ...formData,
        priorite: calculatedPriority,
        id: lead?.id,
        derniereMaj: new Date().toISOString(),
        createdAt: lead?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      console.log('[Modal] Saving lead data:', dataToSave)
      await onSave(dataToSave)
      console.log('[Modal] Save completed successfully')
      
      // Reset saving state after successful save
      setIsSaving(false)
      
      // Don't show toast or close here - let parent handle it
      // Parent (kanban-board) will show toast and close modal
    } catch (error) {
      console.error('[Modal] Save error:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      })
      setIsSaving(false)
    }
  }

  const handleConvertToClient = async () => {
    if (lead && onConvertToClient) {
      setIsConverting(true)
      setShowConvertDialog(false)
      
      // Show immediate feedback
      toast({
        title: "⏳ Conversion en cours...",
        description: "Le lead est en cours de conversion",
      })
      
      try {
        // Call parent handler (non-blocking)
        onConvertToClient(lead)
        
        // Close modal immediately for better UX
        setTimeout(() => {
          onOpenChange(false)
        }, 100)
      } catch (error) {
        console.error('Conversion error:', error)
        setIsConverting(false)
        toast({
          title: "❌ Erreur",
          description: "Échec de la conversion",
          variant: "destructive",
        })
      }
    }
  }

  const handleMarkAsNotInterested = async () => {
    if (lead && onMarkAsNotInterested) {
      setIsMarkingNotInterested(true)
      try {
        await onMarkAsNotInterested(lead)
        setShowNotInterestedDialog(false)
        // Parent will handle closing modal and showing toast
      } catch (error) {
        console.error('Mark not interested error:', error)
        setIsMarkingNotInterested(false)
      }
    }
  }

  const isAdmin = currentUserRole === 'admin'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="sm:max-w-[900px] max-h-[92vh] p-0 gap-0 rounded-2xl overflow-hidden glass backdrop-blur-xl bg-slate-900/90 border border-white/10 ring-1 ring-white/10 shadow-2xl">
          {/* Header */}
          <DialogHeader className="px-6 py-5 border-b border-slate-200/10 bg-gradient-to-br from-slate-900/50 to-slate-800/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold text-white">
                {lead ? "Modifier le lead" : "Créer un lead"}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-red-500/90 hover:bg-red-500 text-white transition-colors shadow focus:ring-2 focus:ring-red-400"
                onClick={() => onOpenChange(false)}
                aria-label="Fermer"
                title="Fermer"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
            {lead && (
              <p className="text-sm text-slate-400 mt-1">
                Créé par {lead.createdBy || lead.assignePar} • {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </DialogHeader>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-6 py-5 space-y-5 max-h-[74vh] overflow-y-auto">
              {/* Contact Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations de contact
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-sm text-slate-300">
                      Nom complet *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white z-20 pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        className="pl-12 glass rounded-xl bg-white/10 border border-white/10 text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder="Ex: Ahmed Benali"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone" className="text-sm text-slate-300">
                      Téléphone *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white z-20 pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
                      <Input
                        id="telephone"
                        value={formData.telephone}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                        className="pl-10 glass rounded-xl bg-white/10 border border-white/10 text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder="06 XX XX XX XX"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-slate-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white z-20 pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 glass rounded-xl bg-white/10 border border-white/10 text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ville" className="text-sm text-slate-300">
                      Ville *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 z-20 pointer-events-none drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]" />
                      <div className="[&>button]:pl-10">
                        <Select value={formData.ville} onValueChange={(value) => setFormData({ ...formData, ville: value })}>
                          <SelectTrigger className="pl-12 glass rounded-xl bg-white/10 border border-white/10 text-white">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {villes.map((v) => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property & Source Section */}
              <div className="space-y-4 pt-4 border-t border-slate-700/30">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Bien & Source
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="typeBien" className="text-sm text-slate-300">
                      Type de bien *
                    </Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 z-20 pointer-events-none drop-shadow-[0_0_10px_rgba(168,85,247,0.55)]" />
                      <div className="[&>button]:pl-10">
                        <Select value={formData.typeBien} onValueChange={(value) => setFormData({ ...formData, typeBien: value })}>
                          <SelectTrigger className="pl-10 glass rounded-xl bg-white/10 border border-white/10 text-white">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {typesBien.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source" className="text-sm text-slate-300">
                      Source *
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 z-20 pointer-events-none drop-shadow-[0_0_10px_rgba(59,130,246,0.55)]" />
                      <div className="[&>button]:pl-10">
                        <Select
                          value={formData.source}
                          onValueChange={(value) => {
                            const newSource = value as LeadSource
                            const calculatedPriority = calculatePriority(newSource)
                            setFormData({ 
                              ...formData, 
                              source: newSource, 
                              priorite: calculatedPriority,
                              magasin: newSource !== 'magasin' 
                                ? '' 
                                : (formData.magasin || (currentUserRole === 'commercial' ? (currentUserMagasin || '') : '')),
                              commercialMagasin: newSource !== 'magasin' 
                                ? '' 
                                : (formData.commercialMagasin || (currentUserRole === 'commercial' ? currentUserName : '')),
                            })
                          }}
                        >
                          <SelectTrigger className="pl-10 glass rounded-xl bg-white/10 border border-white/10 text-white">
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Magasin sub-fields */}
                {formData.source === 'magasin' && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-500/30">
                    <div className="space-y-2">
                      <Label htmlFor="magasin" className="text-sm text-slate-300">
                        Magasin *
                      </Label>
                      <Select
                        value={formData.magasin}
                        onValueChange={(value) => setFormData({ ...formData, magasin: value })}
                      >
                        <SelectTrigger className="glass rounded-xl bg-white/10 border border-white/10 text-white">
                          <SelectValue placeholder="Sélectionner" />
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
                      <Label htmlFor="commercialMagasin" className="text-sm text-slate-300">
                        Commercial magasin *
                      </Label>
                      <Select
                        value={formData.commercialMagasin}
                        onValueChange={(value) => setFormData({ ...formData, commercialMagasin: value })}
                      >
                        <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white rounded-lg">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {commercials.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
  <Label htmlFor="assignePar" className="text-sm text-slate-300">
    Assigné à *
  </Label>
  <div className="relative">
    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white z-30 pointer-events-none drop-shadow-[0_0_12px_rgba(255,255,255,0.65)]" />
    <div className="[&>button]:pl-10">
      <Select
        value={formData.assignePar}
        onValueChange={(value) => setFormData({ ...formData, assignePar: value })}
      >
                        <SelectTrigger className="pl-10 glass rounded-xl bg-white/10 border border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {architects.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4 pt-4 border-t border-slate-700/30">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Statut & Notes
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="statut" className="text-sm text-slate-300">
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
                  <Label htmlFor="message" className="text-sm text-slate-300">
                    Notes / Message
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="glass rounded-xl bg-white/10 border border-white/10 text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all min-h-[80px] resize-none"
                    placeholder="Informations complémentaires sur le lead..."
                  />
                </div>
              </div>

              {/* Notes History Section - Only show for existing leads with notes */}
              {lead && lead.notes && lead.notes.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Historique des notes ({lead.notes.length})
                    </h3>
                  </div>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {[...lead.notes].reverse().slice(0, 5).map((note, index) => (
                      <div
                        key={note.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          index === 0 
                            ? "bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/30" 
                            : "bg-slate-800/40 border-slate-700/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={cn(
                            "text-xs font-medium flex items-center gap-1",
                            index === 0 ? "text-primary" : "text-slate-300"
                          )}>
                            <User className="w-3 h-3" />
                            {note.author}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.createdAt).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                          {note.content}
                        </p>
                      </div>
                    ))}
                    {lead.notes.length > 5 && (
                      <p className="text-xs text-slate-500 text-center py-2">
                        + {lead.notes.length - 5} note{lead.notes.length - 5 > 1 ? 's' : ''} supplémentaire{lead.notes.length - 5 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200/10 bg-slate-900/30">
              <div className="flex items-center justify-between gap-3">
                {/* Left side - Cancel */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-xl transition-all"
                >
                  Annuler
                </Button>

                {/* Right side - Action buttons */}
                <div className="flex items-center gap-2">
                {/* Pas intéressé - Only for existing leads */}
                {lead && onMarkAsNotInterested && (
                  <AlertDialog open={showNotInterestedDialog} onOpenChange={setShowNotInterestedDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isMarkingNotInterested || isConverting || isSaving}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl transition-all disabled:opacity-50"
                      >
                        {isMarkingNotInterested ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Traitement...
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            Pas intéressé
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Marquer comme non intéressé ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir marquer ce lead comme pas intéressé ? Cette action mettra à jour le statut du lead.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl" disabled={isMarkingNotInterested}>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50"
                          onClick={handleMarkAsNotInterested}
                          disabled={isMarkingNotInterested}
                        >
                          {isMarkingNotInterested ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Traitement...
                            </>
                          ) : (
                            'Confirmer'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Convertir - Only for existing leads and admins */}
                {lead && onConvertToClient && isAdmin && lead.statut !== 'converti' && (
                  <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        disabled={isConverting || isMarkingNotInterested || isSaving}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                      >
                        {isConverting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Conversion...
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Convertir
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Convertir en client ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Souhaitez-vous convertir ce lead en client ? Un nouveau client sera créé automatiquement dans la section Clients & Projets.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl" disabled={isConverting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50"
                          onClick={handleConvertToClient}
                          disabled={isConverting}
                        >
                          {isConverting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Conversion...
                            </>
                          ) : (
                            'Convertir'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Enregistrer */}
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
