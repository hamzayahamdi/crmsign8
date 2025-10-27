"use client"

import { useState, useEffect } from "react"
import type { Client, ProjectStatus } from "@/types/client"
import { 
  X, Phone, Mail, MessageCircle, Plus, MapPin, Building2, 
  User, Calendar, DollarSign, Briefcase, Clock, Copy,
  FileText, Send, Archive, Check, Sparkles, TrendingUp,
  FolderOpen, ListTodo, ChevronDown, ChevronUp, Newspaper
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { AddPaymentModal, type PaymentData } from "@/components/add-payment-modal"
import { CreateTaskModal, type TaskData } from "@/components/create-task-modal"
import { DocumentsModal } from "@/components/documents-modal"
import { NewProjectModal, type NewProjectData } from "@/components/new-project-modal"
import { StatusChangeConfirmationModal } from "@/components/status-change-confirmation-modal"
import { PaymentTracker } from "@/components/payment-tracker"

interface ClientDetailPanelProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (client: Client) => void
}

const statusConfig: Record<ProjectStatus, { 
  label: string
  progress: number
  gradient: string
  glowColor: string
}> = {
  nouveau: { 
    label: "Nouveau", 
    progress: 10,
    gradient: "from-slate-400 to-slate-500",
    glowColor: "shadow-slate-500/20"
  },
  acompte_verse: { 
    label: "Acompte versé", 
    progress: 25,
    gradient: "from-orange-400 to-orange-600",
    glowColor: "shadow-orange-500/30"
  },
  en_conception: { 
    label: "En conception", 
    progress: 40,
    gradient: "from-blue-400 to-blue-600",
    glowColor: "shadow-blue-500/30"
  },
  en_chantier: { 
    label: "En chantier", 
    progress: 65,
    gradient: "from-purple-400 to-purple-600",
    glowColor: "shadow-purple-500/30"
  },
  livraison: { 
    label: "Livraison", 
    progress: 85,
    gradient: "from-teal-400 to-teal-600",
    glowColor: "shadow-teal-500/30"
  },
  termine: { 
    label: "Terminé", 
    progress: 100,
    gradient: "from-emerald-400 to-emerald-600",
    glowColor: "shadow-emerald-500/30"
  },
}

// Project stage icons and colors
const stageConfig = [
  { key: "nouveau", label: "Nouveau", icon: Sparkles, color: "text-slate-400" },
  { key: "acompte_verse", label: "Acompte", icon: DollarSign, color: "text-orange-400" },
  { key: "en_conception", label: "Conception", icon: Briefcase, color: "text-blue-400" },
  { key: "en_chantier", label: "Chantier", icon: Building2, color: "text-purple-400" },
  { key: "livraison", label: "Livraison", icon: TrendingUp, color: "text-teal-400" },
  { key: "termine", label: "Terminé", icon: Check, color: "text-emerald-400" },
]

export function ClientDetailPanelLuxe({
  client,
  isOpen,
  onClose,
  onUpdate
}: ClientDetailPanelProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [localClient, setLocalClient] = useState<Client | null>(null)
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showAllNotes, setShowAllNotes] = useState(false)
  
  // Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
  const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null)
  
  // Check if user can edit status (Admin or Architecte)
  // Case-insensitive role check - database stores roles in lowercase
  const userRole = user?.role?.toLowerCase()
  const canEditStatus = userRole === 'admin' || userRole === 'architecte' || userRole === 'architect'
  
  // Debug: Log user info to console (helpful for troubleshooting)
  useEffect(() => {
    if (isOpen && user) {
      console.log('🔐 Auth Debug - Client Detail Panel')
      console.log('User:', user)
      console.log('Role (original):', user.role)
      console.log('Role (lowercase):', userRole)
      console.log('Can edit status:', canEditStatus)
    }
  }, [user, canEditStatus, isOpen, userRole])

  useEffect(() => {
    if (client) {
      setLocalClient(client)
      setIsAddingNote(false)
      // Close all modals when client changes
      setIsPaymentModalOpen(false)
      setIsTaskModalOpen(false)
      setIsDocumentsModalOpen(false)
      setIsNewProjectModalOpen(false)
    }
  }, [client])

  if (!localClient) return null

  const statusInfo = statusConfig[localClient.statutProjet]
  const currentStageIndex = stageConfig.findIndex(s => s.key === localClient.statutProjet)
  const nextStage = stageConfig[currentStageIndex + 1]

  const handleAdvanceStatus = () => {
    if (!nextStage) return
    handleStatusClick(nextStage.key as ProjectStatus)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
    toast({
      title: "Copié",
      description: `${field} copié dans le presse-papiers`,
    })
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return

    const now = new Date().toISOString()
    const updatedClient = {
      ...localClient,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: "note" as const,
          description: newNote,
          auteur: "Architecte"
        },
        ...(localClient.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)
    setNewNote("")
    setIsAddingNote(false)

    toast({
      title: "Note ajoutée",
      description: "La note a été enregistrée avec succès",
    })
  }

  const handleStatusClick = (newStatus: ProjectStatus) => {
    // Check if user has permission
    if (!canEditStatus) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas la permission de modifier le statut du projet",
      })
      return
    }
    
    // Don't allow clicking the same status
    if (newStatus === localClient.statutProjet) {
      return
    }
    
    // Show confirmation modal
    setPendingStatus(newStatus)
    setIsStatusConfirmModalOpen(true)
  }

  const handleStatusChange = (selectedStatus: ProjectStatus) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'
    const fromLabel = statusConfig[localClient.statutProjet].label
    const toLabel = statusConfig[selectedStatus].label
    const updatedClient = {
      ...localClient,
      statutProjet: selectedStatus,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'statut' as const,
          description: `Statut changé de "${fromLabel}" à "${toLabel}" par ${userName}`,
          auteur: userName
        },
        ...(localClient.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)
    setIsStatusConfirmModalOpen(false)
    setPendingStatus(null)

    toast({
      title: "Statut mis à jour",
      description: `Le projet est maintenant à l'étape: ${toLabel}`,
    })
  }

  const handleWhatsApp = () => {
    const phone = localClient.telephone.replace(/\s/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const handleEmail = () => {
    if (!localClient.email) return
    const subject = encodeURIComponent(`Projet ${localClient.typeProjet} - ${localClient.nom}`)
    window.location.href = `mailto:${localClient.email}?subject=${subject}`
  }

  const handleAddPayment = (payment: PaymentData) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'
    
    // Create payment record
    const newPayment: import('@/types/client').Payment = {
      id: `pay-${Date.now()}`,
      amount: payment.amount,
      date: payment.date,
      method: payment.method as "espece" | "virement" | "cheque",
      reference: payment.reference,
      notes: payment.notes,
      createdBy: userName,
      createdAt: now
    }
    
    const updatedClient = {
      ...localClient,
      payments: [
        newPayment,
        ...(localClient.payments || [])
      ],
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'acompte' as const,
          description: `Acompte reçu: ${formatCurrency(payment.amount)} (${payment.method})${payment.reference ? ` - Réf: ${payment.reference}` : ''}`,
          auteur: userName,
          metadata: { paymentId: newPayment.id }
        },
        ...(localClient.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)
    setIsPaymentModalOpen(false)

    toast({
      title: "Acompte enregistré",
      description: `${formatCurrency(payment.amount)} ajouté avec succès`,
    })
  }

  const handleCreateTask = (task: TaskData) => {
    const now = new Date().toISOString()
    const updatedClient = {
      ...localClient,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'tache' as const,
          description: `Tâche créée: ${task.title} (Assigné à ${task.assignedTo})`,
          auteur: 'Admin'
        },
        ...(localClient.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)
    setIsTaskModalOpen(false)

    toast({
      title: "Tâche créée",
      description: task.title,
    })
  }

  const handleCreateProject = (project: NewProjectData) => {
    const now = new Date().toISOString()
    const updatedClient = {
      ...localClient,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'projet' as const,
          description: `Nouveau projet créé: ${project.type} (Budget: ${formatCurrency(project.budget)})`,
          auteur: 'Admin'
        },
        ...(localClient.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)
    setIsNewProjectModalOpen(false)

    toast({
      title: "Projet créé",
      description: `Nouveau projet ${project.type} ajouté`,
    })
  }

  const allNotes = [...(localClient.historique || [])]
    .filter(h => h.type === 'note')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  const sortedNotes = showAllNotes ? allNotes : allNotes.slice(0, 5)
  const hasMoreNotes = allNotes.length > 5
  
  // Format last updated date
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Il y a quelques instants'
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 35, stiffness: 350, mass: 0.8 }}
            className="fixed right-0 top-0 h-full w-full md:w-[680px] bg-[#0E1116] shadow-2xl z-50 flex flex-col"
            style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Header */}
            <div className="relative border-b border-white/5 bg-gradient-to-b from-[#171B22] to-[#0E1116]">
              <div className="px-8 pt-8 pb-6">
                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group"
                >
                  <X className="w-5 h-5 text-[#EAEAEA] group-hover:text-white" />
                </motion.button>

                {/* Client name */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-3xl font-bold text-[#EAEAEA] mb-3 pr-14">
                    {localClient.nom}
                  </h2>
                  
                  {/* Status badge with progress circle */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className={cn(
                          "absolute inset-0 rounded-full blur-md",
                          statusInfo.glowColor
                        )}
                      />
                      <div className={cn(
                        "relative px-4 py-2 rounded-xl bg-gradient-to-r font-semibold text-sm shadow-lg",
                        statusInfo.gradient,
                        "text-white"
                      )}>
                        {statusInfo.label}
                      </div>
                    </div>
                    <div className="text-sm text-white/50">
                      <span className="font-medium text-white/70">{statusInfo.progress}%</span> complété
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Project Timeline */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="px-8 pb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    État du projet
                  </h3>
                  {canEditStatus ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-400/70 hidden sm:flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Modifiable
                      </span>
                      <Button
                        onClick={handleAdvanceStatus}
                        disabled={!nextStage}
                        className="h-8 px-3 text-xs rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={nextStage ? `Avancer vers: ${nextStage.label}` : "Déjà à l'étape finale"}
                      >
                        Mettre à jour
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-white/30">Lecture seule</span>
                  )}
                </div>
                <div className="flex items-center justify-between relative">
                  {/* Connecting line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/5">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${(currentStageIndex / (stageConfig.length - 1)) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-full bg-gradient-to-r",
                        statusInfo.gradient
                      )}
                    />
                  </div>

                  {/* Stages */}
                  {stageConfig.map((stage, index) => {
                    const Icon = stage.icon
                    const isCompleted = index < currentStageIndex
                    const isCurrent = index === currentStageIndex
                    const isUpcoming = index > currentStageIndex

                    return (
                      <motion.button
                        key={stage.key}
                        onClick={() => (isCompleted || isCurrent) && canEditStatus && handleStatusClick(stage.key as ProjectStatus)}
                        disabled={isUpcoming || !canEditStatus}
                        whileHover={(isCompleted || isCurrent) && canEditStatus ? { scale: 1.1 } : {}}
                        whileTap={(isCompleted || isCurrent) && canEditStatus ? { scale: 0.95 } : {}}
                        className={cn(
                          "relative flex flex-col items-center gap-2 group z-10",
                          (isCompleted || isCurrent) && canEditStatus && "cursor-pointer",
                          (!canEditStatus || isUpcoming) && "cursor-not-allowed"
                        )}
                        title={canEditStatus ? 
                          (isUpcoming ? "Étape future" : "Cliquez pour changer le statut") : 
                          "Vous n'avez pas la permission de modifier le statut"}
                      >
                        {/* Icon circle */}
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                          isCompleted && "bg-gradient-to-br from-white/10 to-white/5 border border-white/20",
                          isCurrent && cn(
                            "bg-gradient-to-br shadow-lg",
                            statusInfo.gradient,
                            statusInfo.glowColor
                          ),
                          isUpcoming && "bg-white/5 border border-white/10",
                          (isCompleted || isCurrent) && canEditStatus && "group-hover:shadow-xl group-hover:border-white/30"
                        )}>
                          {isCompleted ? (
                            <Check className="w-5 h-5 text-white/60" />
                          ) : (
                            <Icon className={cn(
                              "w-5 h-5",
                              isCurrent ? "text-white" : "text-white/30"
                            )} />
                          )}
                        </div>

                        {/* Label */}
                        <span className={cn(
                          "text-xs font-medium transition-colors hidden sm:block",
                          isCurrent && "text-white/90",
                          isCompleted && "text-white/50",
                          isUpcoming && "text-white/30"
                        )}>
                          {stage.label}
                        </span>

                        {/* Active glow pulse */}
                        {isCurrent && (
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={cn(
                              "absolute top-0 w-10 h-10 rounded-xl blur-lg",
                              statusInfo.glowColor
                            )}
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
                
                {/* Last Updated & Progress */}
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-white/30">
                    Dernière mise à jour: <span className="text-white/50">{formatLastUpdated(localClient.derniereMaj)}</span>
                  </span>
                  <span className="text-white/40 font-medium">
                    {statusInfo.progress}% complété
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-8 space-y-6">
                
                {/* Client Info Card */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#171B22] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <User className="w-4 h-4 text-white/40" />
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                      Informations client
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <InfoRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="Ville"
                      value={localClient.ville}
                    />
                    <InfoRow
                      icon={<Phone className="w-4 h-4" />}
                      label="Téléphone"
                      value={localClient.telephone}
                      onCopy={() => handleCopy(localClient.telephone, "Téléphone")}
                      copied={copiedField === "Téléphone"}
                    />
                    {localClient.email && (
                      <InfoRow
                        icon={<Mail className="w-4 h-4" />}
                        label="Email"
                        value={localClient.email}
                        onCopy={() => handleCopy(localClient.email!, "Email")}
                        copied={copiedField === "Email"}
                      />
                    )}
                    <InfoRow
                      icon={<Calendar className="w-4 h-4" />}
                      label="Dernière mise à jour"
                      value={formatDate(localClient.derniereMaj)}
                    />
                  </div>
                </motion.div>

                {/* Project Info Card */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="bg-gradient-to-br from-[#171B22] to-[#1A1F28] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <Briefcase className="w-4 h-4 text-white/40" />
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                      Informations projet
                    </h3>
                  </div>

                  {/* Payment Tracker */}
                  <PaymentTracker 
                    payments={localClient.payments || []} 
                    budget={localClient.budget}
                    className="mb-6"
                  />

                  {/* Two-column grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-white/40">Type de projet</div>
                      <div className="text-sm font-semibold text-[#EAEAEA] capitalize">
                        {localClient.typeProjet}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-white/40">Architecte</div>
                      <div className="text-sm font-semibold text-[#EAEAEA]">
                        {localClient.architecteAssigne}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Actions Card */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-[#171B22] rounded-2xl border border-white/5 p-6"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <Clock className="w-4 h-4 text-white/40" />
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                      Actions rapides
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Communication actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <ActionButton
                        icon={<Mail className="w-4 h-4" />}
                        label="Email"
                        onClick={handleEmail}
                        disabled={!localClient.email}
                        variant="primary"
                        gradient="from-blue-500 to-blue-600"
                      />
                      <ActionButton
                        icon={<MessageCircle className="w-4 h-4" />}
                        label="WhatsApp"
                        onClick={handleWhatsApp}
                        variant="primary"
                        gradient="from-green-500 to-green-600"
                      />
                    </div>

                    {/* Project management actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <ActionButton
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Ajouter acompte"
                        onClick={() => setIsPaymentModalOpen(true)}
                        variant="secondary"
                      />
                      <ActionButton
                        icon={<ListTodo className="w-4 h-4" />}
                        label="Créer tâche"
                        onClick={() => setIsTaskModalOpen(true)}
                        variant="secondary"
                      />
                    </div>

                    {/* Document & project actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <ActionButton
                        icon={<FolderOpen className="w-4 h-4" />}
                        label="Voir documents"
                        onClick={() => setIsDocumentsModalOpen(true)}
                        variant="secondary"
                      />
                      <ActionButton
                        icon={<Building2 className="w-4 h-4" />}
                        label="Nouveau projet"
                        onClick={() => setIsNewProjectModalOpen(true)}
                        variant="secondary"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Notes & Historique */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="bg-[#171B22] rounded-2xl border border-white/5 p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Notes & Historique
                      </h3>
                    </div>
                    <span className="text-xs text-white/30">{allNotes.length} note{allNotes.length > 1 ? 's' : ''}</span>
                  </div>

                  {/* Add Note Button - Prominent */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setIsAddingNote(!isAddingNote)}
                    className="w-full h-11 mb-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-[#EAEAEA] font-medium text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une note
                  </motion.button>

                  {/* Add Note Form */}
                  <AnimatePresence>
                    {isAddingNote && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Écrivez votre note ici... (ex: Réunion planifiée, paiement reçu, discussion avec client)" className="mb-3 min-h-[100px] bg-white/5 border-white/10 text-[#EAEAEA] placeholder:text-white/30 focus:border-white/20 rounded-xl resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleAddNote}
                              disabled={!newNote.trim()}
                              className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Enregistrer
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAddingNote(false)
                                setNewNote("")
                              }}
                              className="h-10 px-6 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10"
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Notes List */}
                  {sortedNotes.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {sortedNotes.map((note) => (
                          <motion.div
                            key={note.id}
                            whileHover={{ x: 4 }}
                            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <p className="text-sm text-[#EAEAEA] leading-relaxed mb-2">
                              {note.description}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-white/40">
                              <span>{note.auteur}</span>
                              <span>•</span>
                              <span>{formatDate(note.date)}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Show More/Less Button */}
                      {hasMoreNotes && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAllNotes(!showAllNotes)}
                          className="w-full mt-4 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#EAEAEA] font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                          {showAllNotes ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Voir moins
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Voir tout ({allNotes.length} notes)
                            </>
                          )}
                        </motion.button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-white/30 text-sm">
                      Aucune note pour le moment
                    </div>
                  )}
                </motion.div>

              </div>
            </div>

          </motion.div>

          {/* Action Modals */}
          <AddPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            client={localClient}
            onAddPayment={handleAddPayment}
          />

          <CreateTaskModal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            client={localClient}
            onCreateTask={handleCreateTask}
          />

          <DocumentsModal
            isOpen={isDocumentsModalOpen}
            onClose={() => setIsDocumentsModalOpen(false)}
            client={localClient}
          />

          <NewProjectModal
            isOpen={isNewProjectModalOpen}
            onClose={() => setIsNewProjectModalOpen(false)}
            client={localClient}
            onCreateProject={handleCreateProject}
          />

          <StatusChangeConfirmationModal
            isOpen={isStatusConfirmModalOpen}
            onClose={() => {
              setIsStatusConfirmModalOpen(false)
              setPendingStatus(null)
            }}
            onConfirm={handleStatusChange}
            currentStatus={localClient.statutProjet}
            newStatus={pendingStatus || localClient.statutProjet}
            clientName={localClient.nom}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// Helper component for info rows
function InfoRow({ 
  icon, 
  label, 
  value, 
  onCopy, 
  copied 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="text-white/40 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/40 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-[#EAEAEA]">{value}</div>
      </div>
      {onCopy && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-lg"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white/40" />
          )}
        </motion.button>
      )}
    </div>
  )
}

// Helper component for action buttons
function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = "secondary",
  gradient,
  fullWidth = false
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "primary" | "secondary"
  gradient?: string
  fullWidth?: boolean
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-12 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 relative overflow-hidden",
        fullWidth && "col-span-2",
        variant === "primary" && gradient && `bg-gradient-to-r ${gradient} text-white shadow-lg`,
        variant === "secondary" && "bg-white/5 hover:bg-white/10 text-[#EAEAEA] border border-white/10",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon}
      {label}
    </motion.button>
  )
}
