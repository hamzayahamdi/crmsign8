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
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Globe,
  Home,
  ListTodo,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Shield,
  UserPlus,
  User,
  Users,
  Ban,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { LeadCallHistory } from "@/components/lead-call-history"
import { CampaignBadge } from "@/components/campaign-badge"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { addDays, format } from "date-fns"
import { UserAutocomplete } from "@/components/user-autocomplete"

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
  const [showTaskComposer, setShowTaskComposer] = useState(false)
  const [isLeadContentVisible, setIsLeadContentVisible] = useState(true)
  const [taskUsers, setTaskUsers] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false)
  const [isLoadingTaskUsers, setIsLoadingTaskUsers] = useState(false)
  const defaultTaskDueDate = useMemo(() => format(addDays(new Date(), 2), "yyyy-MM-dd"), [])
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: defaultTaskDueDate,
    assignedTo: "",
  })
  
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

  useEffect(() => {
    if (!open) return

    const loadTaskUsers = async () => {
      setIsLoadingTaskUsers(true)
      try {
        const res = await fetch("/api/users", { cache: "no-store" })
        if (res.ok) {
          const allUsers = (await res.json()) as Array<{ id: string; name: string; role: string }>
          
          // Filter users based on role - prioritize architects
          const userRole = (authUser?.role || currentUserRole || "").toLowerCase()
          let filteredUsers: Array<{ id: string; name: string; role: string }> = []
          
          if (userRole === "architect" || userRole === "architecte") {
            // Architects can only see and assign to other architects and admins
            filteredUsers = allUsers.filter(
              (u) => {
                const role = (u.role || "").toLowerCase()
                return role === "architect" || role === "architecte" || role === "admin"
              }
            )
          } else if (userRole === "admin" || userRole === "manager") {
            // Admins and managers can see all users, but prioritize architects
            filteredUsers = allUsers
          } else {
            // Other roles see architects and admins only (default: show architects first)
            filteredUsers = allUsers.filter(
              (u) => {
                const role = (u.role || "").toLowerCase()
                return role === "architect" || role === "architecte" || role === "admin"
              }
            )
          }
          
          // Sort: architects first, then admins, then others
          filteredUsers.sort((a, b) => {
            const roleA = (a.role || "").toLowerCase()
            const roleB = (b.role || "").toLowerCase()
            
            if (roleA === "architect" || roleA === "architecte") {
              if (roleB === "architect" || roleB === "architecte") return 0
              return -1
            }
            if (roleB === "architect" || roleB === "architecte") return 1
            if (roleA === "admin") {
              if (roleB === "admin") return 0
              return -1
            }
            if (roleB === "admin") return 1
            return 0
          })
          
          setTaskUsers(filteredUsers)
          setTaskForm((prev) => ({
            ...prev,
            assignedTo: prev.assignedTo || authUser?.id || (filteredUsers.length ? filteredUsers[0].id : ""),
          }))
        }
      } catch (error) {
        console.error("Error loading task users:", error)
      } finally {
        setIsLoadingTaskUsers(false)
      }
    }

    loadTaskUsers()
  }, [open, authUser?.id, currentUserRole])

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
    // Reset visibility when modal opens
    if (open) {
      setIsLeadContentVisible(true)
      setShowTaskComposer(false)
    }
  }, [open, lead])

  useEffect(() => {
    if (!authUser?.id) return
    setTaskForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo || authUser.id,
    }))
  }, [authUser?.id])

  const handleOpenTaskComposer = () => {
    // Reset form immediately
    setTaskForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      dueDate: defaultTaskDueDate,
      assignedTo: prev.assignedTo || authUser?.id || "",
    }))
    
    // Smooth transition: hide lead content first, then show task composer
    setIsLeadContentVisible(false)
    // Use a delay to allow exit animation to complete smoothly
    setTimeout(() => {
      setShowTaskComposer(true)
      if (!lead?.id) {
        toast({
          title: "Enregistrez le lead",
          description: "Sauvegardez la fiche pour lier cette tâche automatiquement.",
        })
      }
    }, 160) // Match exit animation duration (150ms + small buffer)
  }

  const handleCloseTaskComposer = () => {
    // Smooth transition: hide task composer first, then show lead content
    setShowTaskComposer(false)
    // Use a delay to allow exit animation to complete smoothly
    setTimeout(() => {
      setIsLeadContentVisible(true)
    }, 190) // Match exit animation duration (180ms + small buffer)
  }

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

  const handleTaskSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!lead?.id) {
      toast({
        title: "Lead requis",
        description: "Enregistrez d'abord le lead avant de créer une tâche liée.",
        variant: "destructive",
      })
      return
    }

    if (!taskForm.title.trim()) {
      toast({
        title: "Titre requis",
        description: "Veuillez renseigner un titre de tâche.",
        variant: "destructive",
      })
      return
    }

    if (!taskForm.assignedTo) {
      toast({
        title: "Assignation requise",
        description: "Sélectionnez un destinataire pour cette tâche.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsTaskSubmitting(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const response = await fetch("/api/tasks/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          dueDate: taskForm.dueDate,
          assignedTo: taskForm.assignedTo,
          linkedType: "lead",
          linkedId: lead.id,
          linkedName: lead.nom,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Impossible de créer la tâche")
      }

      const assignedUser = taskUsers.find(u => u.id === taskForm.assignedTo)
      const due = taskForm.dueDate ? format(new Date(taskForm.dueDate), "dd/MM/yyyy") : undefined

      toast({
        title: "Tâche assignée",
        description: `“${taskForm.title.trim()}” assignée à ${assignedUser?.name || 'l\'utilisateur'}${due ? ` · échéance ${due}` : ''}.`,
        action: <ToastAction altText="Fermer">OK</ToastAction>,
      })

      setTaskForm({
        title: "",
        description: "",
        dueDate: defaultTaskDueDate,
        assignedTo: authUser?.id || taskForm.assignedTo,
      })
      
      // Close task composer and return to lead form
      setShowTaskComposer(false)
      setTimeout(() => {
        setIsLeadContentVisible(true)
      }, 190)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur est survenue lors de l'assignation.",
        variant: "destructive",
      })
    } finally {
      setIsTaskSubmitting(false)
    }
  }

  const selectedAssignee = useMemo(
    () => taskUsers.find((user) => user.id === taskForm.assignedTo),
    [taskUsers, taskForm.assignedTo],
  )

  const latestNote = lead?.notes && lead.notes.length > 0 ? lead.notes[lead.notes.length - 1] : undefined

  const composerFormVariants = {
    hidden: { opacity: 0, y: 0 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.02,
        duration: 0.15,
        ease: [0.4, 0.0, 0.2, 1] as const,
      },
    },
    exit: { 
      opacity: 0, 
      y: 0,
      transition: {
        duration: 0.12,
        ease: [0.4, 0.0, 0.2, 1] as const,
      }
    },
  }

  const composerFieldVariants = {
    hidden: { opacity: 0, y: 0 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.15,
        ease: [0.4, 0.0, 0.2, 1] as const,
      }
    },
    exit: { 
      opacity: 0, 
      y: 0,
      transition: {
        duration: 0.1,
        ease: [0.4, 0.0, 0.2, 1] as const,
      }
    },
  }

  const composerSummaryVariants = {
    hidden: { opacity: 0, x: 0 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.15,
        ease: [0.4, 0.0, 0.2, 1] as const,
        delay: 0.03
      }
    },
    exit: { 
      opacity: 0, 
      x: 0,
      transition: {
        duration: 0.1,
        ease: [0.4, 0.0, 0.2, 1] as const,
      }
    },
  }

  const normalizedRole = (authUser?.role || currentUserRole || "").toLowerCase()
  const isAdmin = normalizedRole === "admin"
  const canAssignToOthers = normalizedRole === "admin" || normalizedRole === "manager"

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
            {isLeadContentVisible && (
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
                      <Button
                        type="button"
                        onClick={handleOpenTaskComposer}
                        className="rounded-xl bg-white/15 border border-white/10 text-white hover:bg-white/20 transition-all shadow-lg shadow-cyan-500/20"
                      >
                        <ListTodo className="h-4 w-4 mr-2" />
                        Créer une tâche de suivi
                      </Button>
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
                  type="button"
                  onClick={handleOpenTaskComposer}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-600/30 hover:shadow-violet-600/40 transition-all px-6 h-11 font-medium"
                >
                  <ListTodo className="w-4 h-4 mr-2" />
                  Créer une tâche
                </Button>

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
            )}
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            {showTaskComposer && (
              <>
                <motion.div
                  key="task-composer-overlay"
                  className="fixed inset-0 z-[100] bg-slate-950/95"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 0.15,
                    ease: [0.4, 0.0, 0.2, 1] as const,
                  }}
                  onClick={handleCloseTaskComposer}
                />
                <motion.div
                  key="task-composer-modal"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ 
                    duration: 0.18,
                    ease: [0.4, 0.0, 0.2, 1] as const
                  }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl mx-auto rounded-[32px] border border-white/10 bg-slate-950/98 shadow-[0_40px_120px_rgba(8,24,68,0.75)] z-[101] max-h-[90vh] overflow-y-auto custom-scrollbar overflow-x-visible"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="absolute inset-0 opacity-70 bg-linear-to-br from-violet-500/25 via-slate-900/70 to-slate-950/90 pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.15),transparent_50%)] pointer-events-none" />
                  <div className="relative z-10 flex flex-col gap-8 px-8 py-9 sm:px-10 sm:py-11 min-h-0">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ 
                            duration: 0.15, 
                            ease: [0.4, 0.0, 0.2, 1] as const,
                            delay: 0.02
                          }}
                          className="h-14 w-14 rounded-2xl bg-linear-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-violet-600/40 ring-2 ring-violet-400/20"
                        >
                          <ListTodo className="h-6 w-6 text-white" />
                        </motion.div>
                        <motion.div 
                          className="flex-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ 
                            duration: 0.15,
                            delay: 0.03,
                            ease: [0.4, 0.0, 0.2, 1] as const
                          }}
                        >
                          <h3 className="text-2xl font-bold text-white sm:text-3xl tracking-tight">Nouvelle tâche de suivi</h3>
                          <motion.p 
                            className="text-sm text-slate-300/90 sm:text-base mt-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ 
                              duration: 0.15,
                              delay: 0.05,
                              ease: [0.4, 0.0, 0.2, 1] as const
                            }}
                          >
                            Connectez votre équipe {lead?.nom ? (
                              <>au lead <span className="font-semibold text-violet-300">{lead.nom}</span></>
                            ) : (
                              <>à ce lead</>
                            )}
                          </motion.p>
                        </motion.div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white transition-all px-5 h-10 shadow-sm"
                        onClick={handleCloseTaskComposer}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour à la fiche
                      </Button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
                      <motion.form
                        variants={composerFormVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleTaskSubmit}
                        className="rounded-2xl border border-white/10 bg-linear-to-br from-slate-950/60 via-slate-900/60 to-slate-900/40 p-7 shadow-inner shadow-black/30 space-y-7"
                      >
                        <motion.div variants={composerFieldVariants} className="space-y-2.5">
                          <Label htmlFor="overlay-task-title" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                            <ListTodo className="h-3.5 w-3.5 text-violet-400" />
                            Titre de la tâche *
                          </Label>
                          <Input
                            id="overlay-task-title"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                            placeholder="Ex: Rappeler le lead demain matin"
                            className="h-12 bg-white/10 border border-white/10 text-white placeholder:text-slate-300/60 rounded-xl focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all shadow-sm"
                            required
                          />
                        </motion.div>

                        <motion.div variants={composerFieldVariants} className="space-y-2.5">
                          <Label htmlFor="overlay-task-description" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-violet-400" />
                            Détails
                          </Label>
                          <Textarea
                            id="overlay-task-description"
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            placeholder="Ex: Confirmer la disponibilité et envoyer la proposition."
                            className="bg-white/10 border border-white/10 text-white rounded-xl min-h-[120px] focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all shadow-sm resize-none"
                          />
                        </motion.div>

                        <motion.div variants={composerFieldVariants} className="grid gap-5 sm:grid-cols-2">
                          <div className="space-y-2.5">
                            <Label htmlFor="overlay-task-due" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
                              Échéance
                            </Label>
                            <div className="relative">
                              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300 z-10 pointer-events-none" />
                              <Input
                                id="overlay-task-due"
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                className="pl-11 h-12 bg-white/10 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all shadow-sm"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <Label htmlFor="overlay-task-assignee" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-violet-400" />
                              Assigner à
                            </Label>
                            <UserAutocomplete
                              value={taskForm.assignedTo}
                              onValueChange={(userId) => setTaskForm({ ...taskForm, assignedTo: userId })}
                              users={taskUsers.map((u) => ({
                                id: u.id,
                                name: u.name,
                                role: u.role,
                              }))}
                              placeholder="Rechercher un utilisateur..."
                              disabled={isLoadingTaskUsers || !canAssignToOthers}
                              isLoading={isLoadingTaskUsers}
                            />
                            {selectedAssignee && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-slate-300/80 leading-tight flex items-center gap-1.5 mt-2"
                              >
                                <Shield className="h-3 w-3 text-violet-400" />
                                Rôle&nbsp;: <span className="capitalize font-medium text-violet-300">{selectedAssignee.role}</span>
                              </motion.p>
                            )}
                            {!canAssignToOthers && (
                              <p className="text-xs text-amber-300/80 flex items-center gap-1.5 mt-2">
                                <Ban className="h-3 w-3" />
                                Vous ne pouvez assigner que des tâches à vous-même.
                              </p>
                            )}
                          </div>
                        </motion.div>

                        <motion.div variants={composerFieldVariants} className="space-y-3 pt-4 border-t border-white/5">
                          {!lead?.id && (
                            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
                              <span className="text-lg">⚠️</span>
                              <p>
                                <strong>Attention:</strong> Enregistrez d'abord le lead pour créer la tâche liée.
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-end gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleCloseTaskComposer}
                              className="text-slate-200 hover:bg-white/10 hover:text-white rounded-xl px-5 h-10 transition-all"
                              disabled={isTaskSubmitting}
                            >
                              Annuler
                            </Button>
                            <Button
                              type="submit"
                              disabled={isTaskSubmitting || !taskForm.title.trim() || !taskForm.assignedTo}
                              className="rounded-xl bg-linear-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white shadow-lg shadow-violet-600/30 px-6 h-10 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isTaskSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Création en cours...
                                </>
                              ) : (
                                <>
                                  <ListTodo className="h-4 w-4 mr-2" />
                                  Créer et assigner
                                </>
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      </motion.form>

                      {lead ? (
                        <motion.div
                          variants={composerSummaryVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="rounded-2xl border border-white/10 bg-linear-to-br from-white/5 via-slate-900/50 to-slate-950/60 p-6 space-y-5 shadow-inner shadow-black/30"
                        >
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-white/10 p-2.5 shadow-inner shadow-black/40">
                            <UserPlus className="h-5 w-5 text-violet-200" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">Lead en cours</p>
                            <p className="text-sm font-semibold text-white">{lead.nom}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-emerald-400/40 text-emerald-200 bg-emerald-500/10">
                            {statuts.find((s) => s.value === lead.statut)?.label ?? lead.statut}
                          </Badge>
                          <Badge variant="outline" className="border-blue-500/40 text-blue-200 bg-blue-500/10">
                            Priorité {lead.priorite}
                          </Badge>
                        </div>

                        <div className="space-y-3 text-sm text-slate-200/90">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-300" />
                            <span>{lead.telephone}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-300" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-300" />
                            <span>{lead.ville}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-300" />
                            <span>Assigné à {lead.assignePar}</span>
                          </div>
                        </div>

                        {latestNote ? (
                          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-300/80">Dernière note</p>
                            <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{latestNote.content}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide">
                              <Users className="h-3 w-3" />
                              <span>{latestNote.author}</span>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(latestNote.createdAt).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300/70">
                            Aucune note encore enregistrée. Ajoutez votre premier suivi dès que la tâche est créée.
                          </div>
                        )}
                        </motion.div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  )
}

