"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ToastAction } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Lead, LeadPriority, LeadSource, LeadStatus } from "@/types/lead"
import { AnimatePresence, motion } from "framer-motion"
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
import {
  ArrowRightLeft,
  Building2,
  Clock,
  FileText,
  Globe,
  Home,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  UserPlus,
  User,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { LeadCallHistory } from "@/components/lead-call-history"
import { CampaignBadge } from "@/components/campaign-badge"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
 
 

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

const defaultVilles = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Fès", "Agadir", "Meknès", "Oujda", "Bouskoura", "Sale"]
const defaultTypesBien = ["Villa", "Appartement", "B2B", "Autre"]

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

const magasins = ["Casa", "Rabat", "Tanger", "Marrakech", "Bouskoura"]

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
  currentUserMagasin,
}: LeadModalRedesignedProps) {
  const { user: authUser } = useAuth()
  const [architects, setArchitects] = useState<string[]>(["Radia"])
  const [commercials, setCommercials] = useState<string[]>(["Radia"])
  const [villes, setVilles] = useState<string[]>(defaultVilles)
  const [typesBien, setTypesBien] = useState<string[]>(defaultTypesBien)
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
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

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("/api/users")
        if (res.ok) {
          const users = (await res.json()) as Array<{ role?: string; name?: string }>
          
          const architectList = Array.from(
            new Set(
            users
                .filter((u) => ["admin", "architect"].includes((u.role || "").toLowerCase()))
                .map((u) => (u.name || "").trim())
                .filter(Boolean),
            ),
          )
          setArchitects(architectList.length ? architectList : ["Radia"])

          const commercialList = Array.from(
            new Set(
            users
                .filter((u) => (u.role || "").toLowerCase() === "commercial")
                .map((u) => (u.name || "").trim())
                .filter(Boolean),
            ),
          )
          setCommercials(commercialList.length ? commercialList : [])
        }
      } catch (error) {
        console.error("Error loading users:", error)
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
        magasin: lead.magasin || (currentUserRole === "commercial" ? currentUserMagasin || "" : ""),
        commercialMagasin: lead.commercialMagasin || (currentUserRole === "commercial" ? currentUserName : ""),
        notes: lead.notes || [],
      })
    }
  }, [lead, open, currentUserRole, currentUserMagasin, currentUserName])

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
      
      await onSave(dataToSave)
      setIsSaving(false)
    } catch (error) {
      console.error("[Modal] Save error:", error)
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
      
      toast({
        title: "⏳ Conversion en cours...",
        description: "Le lead est en cours de conversion",
      })
      
      try {
        onConvertToClient(lead)
        setTimeout(() => {
          onOpenChange(false)
        }, 100)
      } catch (error) {
        console.error("Conversion error:", error)
        setIsConverting(false)
        toast({
          title: "❌ Erreur",
          description: "Échec de la conversion",
          variant: "destructive",
        })
      }
    }
  }

  

  

  const normalizedRole = (authUser?.role || currentUserRole || "").toLowerCase()
  const isAdmin = normalizedRole === "admin"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[1100px] h-[92vh] sm:h-[88vh] p-0 gap-0 rounded-3xl overflow-hidden glass bg-slate-950/95 border border-white/10 ring-1 ring-cyan-500/20 shadow-[0_20px_60px_rgba(8,24,68,0.65)] relative flex flex-col"
        >
          <DialogHeader className="px-8 py-6 border-b border-slate-200/10 bg-linear-to-br from-slate-950/80 via-slate-900/70 to-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <DialogTitle className="text-2xl font-semibold text-white tracking-tight">
                  {lead ? "Modifier le lead" : "Créer un lead"}
                </DialogTitle>
                {lead?.campaignName && <CampaignBadge campaignName={lead.campaignName} size="md" />}
              </div>

              <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                  className="h-10 w-10 rounded-full bg-red-500/90 hover:bg-red-500 text-white transition-colors shadow focus:ring-2 focus:ring-red-400"
                onClick={() => onOpenChange(false)}
                aria-label="Fermer"
                title="Fermer"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
            </div>

            {lead && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Assigné à <span className="font-semibold text-white">{lead.assignePar}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Créé le {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                  <Badge variant="outline" className="border-blue-500/30 text-blue-200 bg-blue-500/10">
                    Priorité {lead.priorite}
                  </Badge>
                </span>
              </div>
            )}
          </DialogHeader>

          <AnimatePresence mode="wait">
              <motion.form
                key="lead-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.15,
                  ease: [0.4, 0.0, 0.2, 1] as const
                }}
                onSubmit={handleSubmit}
                className="flex-1 min-h-0 flex flex-col"
              >
                <div className="flex-1 min-h-0 px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar">
              {lead && (
                <div className="rounded-2xl border border-white/10 bg-linear-to-r from-slate-900/70 via-slate-900/50 to-slate-900/40 p-5 space-y-5 shadow-inner shadow-black/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400/90">Statut du lead</p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
                        <Badge variant="outline" className="border-emerald-400/40 text-emerald-200 bg-emerald-500/10">
                          {statuts.find((s) => s.value === lead.statut)?.label ?? lead.statut}
                        </Badge>
                        <span className="text-sm text-slate-300">
                          • Priorité <span className="font-semibold text-white">{lead.priorite}</span>
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.telephone}
                    </span>
                    {lead.email && (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {lead.email}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {lead.ville}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                  <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations de contact
                </h3>
                    </div>
                
                    <div className="grid gap-4 md:grid-cols-2">
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
                                  <SelectItem key={v} value={v}>
                                    {v}
                                  </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Bien & Source
                </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
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
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
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
                                  magasin:
                                    newSource !== "magasin"
                                      ? ""
                                      : formData.magasin || (currentUserRole === "commercial" ? currentUserMagasin || "" : ""),
                                  commercialMagasin:
                                    newSource !== "magasin"
                                      ? ""
                                      : formData.commercialMagasin || (currentUserRole === "commercial" ? currentUserName : ""),
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

                    {formData.source === "magasin" && (
                      <div className="grid gap-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 md:grid-cols-2">
                    <div className="space-y-2">
                          <Label htmlFor="magasin" className="text-sm text-slate-200">
                        Magasin *
                      </Label>
                          <Select value={formData.magasin} onValueChange={(value) => setFormData({ ...formData, magasin: value })}>
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
                          <Label htmlFor="commercialMagasin" className="text-sm text-slate-200">
                        Commercial magasin *
                      </Label>
                      <Input
                        id="commercialMagasin"
                        value={formData.commercialMagasin}
                        onChange={(e) => setFormData({ ...formData, commercialMagasin: e.target.value })}
                        className="glass rounded-xl bg-white/10 border border-white/10 text-white"
                            placeholder="Nom du commercial"
                        required
                      />
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
                          <Select value={formData.assignePar} onValueChange={(value) => setFormData({ ...formData, assignePar: value })}>
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
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Statut & Notes
                </h3>
                    </div>

                <div className="space-y-2">
                  <Label htmlFor="statut" className="text-sm text-slate-300">
                    État du lead
                  </Label>
                      <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value as LeadStatus })}>
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
                        className="glass rounded-xl bg-white/10 border border-white/10 text-white focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all min-h-[90px] resize-none"
                    placeholder="Informations complémentaires sur le lead..."
                  />
                </div>
                  </section>
              </div>

              {lead && lead.notes && lead.notes.length > 0 && (
                  <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Historique des notes ({lead.notes.length})
                    </h3>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      {[...lead.notes].reverse().slice(0, 6).map((note, index) => (
                        <div
                          key={note.id}
                          className={cn(
                            "p-3 rounded-xl border transition-all",
                            index === 0
                              ? "bg-linear-to-br from-primary/15 to-purple-500/10 border-primary/40"
                              : "bg-slate-800/40 border-slate-700/30",
                          )}
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-medium flex items-center gap-1",
                                index === 0 ? "text-primary" : "text-slate-300",
                              )}
                            >
                              <User className="w-3 h-3" />
                              {note.author}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(note.createdAt).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap wrap-break-word">
                            {note.content}
                          </p>
                        </div>
                      ))}
                      {lead.notes.length > 6 && (
                        <p className="py-2 text-center text-xs text-slate-500">
                          + {lead.notes.length - 6} note{lead.notes.length - 6 > 1 ? "s" : ""} supplémentaire{lead.notes.length - 6 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {lead && lead.notes && lead.notes.length > 0 && (
                  <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20">
                    <LeadCallHistory notes={lead.notes} />
                  </section>
                )}
              </div>

            <div className="px-8 py-6 border-t border-white/10 bg-gradient-to-r from-slate-900/60 via-slate-900/50 to-slate-900/60 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 rounded-xl transition-all px-6 h-11 font-medium"
                >
                  Annuler
                </Button>

                <div className="flex items-center gap-3">
                  {lead && onConvertToClient && isAdmin && lead.statut !== "qualifie" && (
                  <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        disabled={isConverting || isSaving}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/40 disabled:opacity-50 px-6 h-11 font-medium"
                      >
                        {isConverting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Conversion...
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Convertir en client
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl border border-white/10 bg-slate-950">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Convertir en client ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Souhaitez-vous convertir ce lead en client ? Un nouveau client sera créé automatiquement dans la section Clients &amp; Projets.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl border-slate-600 hover:bg-slate-800" disabled={isConverting}>
                            Annuler
                          </AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl disabled:opacity-50"
                          onClick={handleConvertToClient}
                          disabled={isConverting}
                        >
                          {isConverting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Conversion...
                            </>
                          ) : (
                              "Convertir"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 min-w-[160px] h-11 font-semibold"
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
              </motion.form>
          </AnimatePresence>
          
          
          </DialogContent>
        </Dialog>
      </>
    )
  }

