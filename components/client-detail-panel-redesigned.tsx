"use client"

import { useState, useEffect } from "react"
import type { Client, ProjectStatus } from "@/types/client"
import {
  X, Phone, Mail, MessageCircle, Plus, MapPin, Building2,
  User, Calendar, DollarSign, Edit, Trash2, FileText,
  Send, Share2, Paperclip, Clock, ChevronDown, ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { calculateDurationInHours, getStatusLabel } from "@/lib/timeline-utils"
import { hasPermission } from "@/lib/permissions"
import { AddPaymentModal, type PaymentData } from "@/components/add-payment-modal"
import { CreateTaskModal, type TaskData } from "@/components/create-task-modal"
import { DocumentsModal } from "@/components/documents-modal"
import { StatusChangeConfirmationModal } from "@/components/status-change-confirmation-modal"
import { ProjectStatusStepperEnhanced } from "@/components/project-status-stepper-enhanced"
import { ProjectStageContent } from "@/components/project-stage-content"

interface ClientDetailPanelRedesignedProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (client: Client) => void
  onDelete?: (client: Client) => void
}

export function ClientDetailPanelRedesigned({
  client,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: ClientDetailPanelRedesignedProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [localClient, setLocalClient] = useState<Client | null>(null)
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

  // Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)
  const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null)

  // Check if user can edit status (Admin, Operator, Gestionnaire, or Architecte)
  const canEditStatus = hasPermission(user?.role, 'clients', 'edit')

  useEffect(() => {
    if (client) {
      setLocalClient(client)
      setIsAddingNote(false)
      setIsPaymentModalOpen(false)
      setIsTaskModalOpen(false)
      setIsDocumentsModalOpen(false)
    }
  }, [client])

  if (!localClient) return null

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

  const handleAddNote = () => {
    if (!newNote.trim()) return

    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'
    const updatedClient = {
      ...localClient,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: "note" as const,
          description: newNote,
          auteur: userName
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

  const handleStatusChange = (newStatus: ProjectStatus) => {
    if (!canEditStatus) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas la permission de modifier le statut du projet",
        variant: "destructive"
      })
      return
    }

    if (newStatus === localClient.statutProjet) return

    setPendingStatus(newStatus)
    setIsStatusConfirmModalOpen(true)
  }

  const confirmStatusChange = (selectedStatus: ProjectStatus) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

    // Calculate duration in previous status
    const previousStatus = localClient.statutProjet
    const lastStatusChange = localClient.historique?.find(h => h.type === 'statut')
    const timestampStart = lastStatusChange?.date || localClient.createdAt
    const durationInHours = calculateDurationInHours(timestampStart, now)

    const updatedClient = {
      ...localClient,
      statutProjet: selectedStatus,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'statut' as const,
          description: `Statut changé: ${getStatusLabel(previousStatus)} → ${getStatusLabel(selectedStatus)}`,
          auteur: userName,
          previousStatus,
          newStatus: selectedStatus,
          durationInHours,
          timestampStart,
          timestampEnd: now
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
      description: `Le projet est maintenant à l'étape: ${getStatusLabel(selectedStatus)}`,
    })
  }

  const handleWhatsApp = () => {
    const phone = localClient.telephone.replace(/\s/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const handleDeleteClient = () => {
    if (!onDelete) return
    onDelete(localClient)
    onClose()
  }

  const handleAddPayment = (payment: PaymentData) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

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

  const handleAddTask = (task: TaskData) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'
    const updatedClient = {
      ...localClient,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'tache' as const,
          description: `Tâche créée: ${task.title} (Assigné à ${task.assignedTo})`,
          auteur: userName
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

  const handleDocumentUpload = (documents: any[]) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

    const updatedClient = {
      ...localClient,
      documents: [
        ...(localClient.documents || []),
        ...documents
      ],
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'document' as const,
          description: `${documents.length} document(s) ajouté(s)`,
          auteur: userName
        },
        ...(localClient.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)

    toast({
      title: "Documents ajoutés",
      description: `${documents.length} document(s) ajouté(s) avec succès`,
    })
  }

  const handleStageAction = (action: string, data?: any) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

    switch (action) {
      case 'add_payment':
      case 'view_payments':
      case 'prepare_deposit':
        setIsPaymentModalOpen(true)
        break
      case 'add_note':
        setIsAddingNote(true)
        break
      case 'add_task':
        setIsTaskModalOpen(true)
        break
      case 'view_documents':
      case 'upload_design':
      case 'upload_photos':
      case 'upload_site_photos':
      case 'view_gallery':
        setIsDocumentsModalOpen(true)
        break
      case 'share_client':
        if (typeof window !== 'undefined') {
          const shareUrl = `${window.location.origin}/clients/${localClient.id}`
          navigator.clipboard.writeText(shareUrl).then(() => {
            toast({
              title: "Lien copié",
              description: "Le lien du projet a été copié dans le presse-papier",
            })
          }).catch(() => {
            toast({
              title: "Lien de partage",
              description: shareUrl,
            })
          })
        }
        break
      case 'schedule_meeting':
      case 'schedule_delivery':
        // Store client context for calendar
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('calendar_client_context', JSON.stringify({
            clientId: localClient.id,
            clientName: localClient.nom,
            action: action === 'schedule_meeting' ? 'meeting' : 'delivery'
          }))
          window.location.href = '/calendrier'
        }
        toast({
          title: "Redirection",
          description: "Ouverture du calendrier...",
        })
        break
      case 'edit_client':
        toast({
          title: "Modification",
          description: "Fonctionnalité de modification à venir",
        })
        break
      case 'start_conception':
        handleStatusChange('conception')
        break
      case 'create_quote':
      case 'send_quote':
        toast({
          title: "Devis",
          description: "Fonctionnalité de devis à venir",
        })
        break
      case 'mark_accepted':
        handleStatusChange('accepte')
        break
      case 'mark_refused':
        handleStatusChange('refuse')
        break
      case 'generate_contract':
      case 'upload_signed':
        setIsDocumentsModalOpen(true)
        toast({
          title: "Contrat",
          description: "Téléchargez le contrat dans la section documents",
        })
        break
      case 'archive':
        toast({
          title: "Archivage",
          description: "Fonctionnalité d'archivage à venir",
        })
        break
      case 'new_proposal':
        setIsAddingNote(true)
        toast({
          title: "Nouvelle proposition",
          description: "Ajoutez une note avec les détails de la nouvelle proposition",
        })
        break
      case 'start_project':
        handleStatusChange('projet_en_cours')
        break
      case 'view_timeline':
        toast({
          title: "Planning",
          description: "Fonctionnalité de planning à venir",
        })
        break
      case 'update_progress':
        setIsAddingNote(true)
        toast({
          title: "Mise à jour",
          description: "Ajoutez une note pour documenter l'avancement",
        })
        break
      case 'view_invoice':
      case 'upload_proof':
        setIsDocumentsModalOpen(true)
        break
      case 'view_summary':
        toast({
          title: "Récapitulatif",
          description: "Affichage du récapitulatif du projet",
        })
        break
      case 'add_review':
      case 'request_testimonial':
        setIsAddingNote(true)
        toast({
          title: "Avis client",
          description: "Ajoutez une note avec l'avis ou le témoignage du client",
        })
        break
      default:
        toast({
          title: "Action",
          description: `Action "${action}" déclenchée`,
        })
    }
  }

  const allHistory = [...(localClient.historique || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const displayedHistory = showAllHistory ? allHistory : allHistory.slice(0, 5)
  const hasMoreHistory = allHistory.length > 5

  // Calculate project summary based on devis
  const devisList = localClient.devis || []
  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const totalAccepted = acceptedDevis.reduce((sum, d) => sum + d.montant, 0)
  const totalPaid = acceptedDevis.filter(d => d.facture_reglee).reduce((sum, d) => sum + d.montant, 0)
  const progressPercentage = totalAccepted > 0 ? Math.round((totalPaid / totalAccepted) * 100) : 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
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
            className="fixed right-0 top-0 h-full w-full md:w-[800px] lg:w-[900px] bg-[#0D0D12] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="relative border-b border-white/5 bg-gradient-to-b from-[#171B22] to-[#0D0D12]">
              <div className="px-8 pt-8 pb-6">
                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group"
                >
                  <X className="w-5 h-5 text-white/80 group-hover:text-white" />
                </motion.button>

                {/* Client Summary */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="pr-14"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {localClient.nom}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {localClient.ville}
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {localClient.typeProjet}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {localClient.architecteAssigne}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-white/50 mb-0.5">Paiements</div>
                      <div className="text-lg font-bold text-white">{progressPercentage}%</div>
                    </div>
                    {totalAccepted > 0 && (
                      <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-xs text-white/50 mb-0.5">Devis acceptés</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(totalAccepted)}</div>
                      </div>
                    )}
                    <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-white/50 mb-0.5">Dernière MAJ</div>
                      <div className="text-sm font-medium text-white">
                        {new Date(localClient.derniereMaj).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Project Status Stepper */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="px-8 pb-6"
              >
                <ProjectStatusStepperEnhanced
                  currentStatus={localClient.statutProjet}
                  onStatusChange={canEditStatus ? handleStatusChange : undefined}
                  interactive={canEditStatus}
                  lastUpdated={localClient.derniereMaj}
                />
              </motion.div>
            </div>

            {/* Content - Two Column Layout */}
            <div className="flex-1 overflow-hidden flex">
              {/* Main Content - Left Side */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                {/* Stage-Specific Content */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <ProjectStageContent
                    status={localClient.statutProjet}
                    client={localClient}
                    onAction={handleStageAction}
                  />
                </motion.div>

                {/* Client Info Card */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="bg-[#171B22] rounded-2xl border border-white/5 p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-white/40" />
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                      Informations de contact
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white">{localClient.telephone}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleWhatsApp}
                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        WhatsApp
                      </Button>
                    </div>
                    {localClient.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white">{localClient.email}</span>
                      </div>
                    )}
                    {localClient.adresse && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white">{localClient.adresse}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Historique & Actions - Right Sidebar */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-80 border-l border-white/5 bg-[#0A0A0F] overflow-y-auto custom-scrollbar"
              >
                <div className="p-6 space-y-6">
                  {/* Actions Rapides */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-white/40" />
                      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Actions rapides
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={() => setIsAddingNote(true)}
                        className="w-full justify-start h-10 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        variant="ghost"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter note
                      </Button>
                      <Button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="w-full justify-start h-10 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        variant="ghost"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Ajouter acompte
                      </Button>
                      <Button
                        onClick={() => setIsDocumentsModalOpen(true)}
                        className="w-full justify-start h-10 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        variant="ghost"
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Documents
                      </Button>
                      <Button
                        onClick={() => {
                          toast({ title: "Partage", description: "Génération du lien de partage..." })
                        }}
                        className="w-full justify-start h-10 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        variant="ghost"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Partager projet
                      </Button>
                    </div>

                    {/* Delete button - only visible for Admin and Operator */}
                    {onDelete && hasPermission(user?.role, 'clients', 'delete') && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <Button
                          onClick={handleDeleteClient}
                          className="w-full justify-start h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                          variant="ghost"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer client
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Add Note Form */}
                  <AnimatePresence>
                    {isAddingNote && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Écrivez votre note..."
                            className="mb-3 min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleAddNote}
                              disabled={!newNote.trim()}
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Enregistrer
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAddingNote(false)
                                setNewNote("")
                              }}
                              size="sm"
                              variant="ghost"
                              className="bg-white/5 hover:bg-white/10 text-white"
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Historique */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-white/40" />
                        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                          Historique
                        </h3>
                      </div>
                      <span className="text-xs text-white/30">{allHistory.length}</span>
                    </div>

                    {displayedHistory.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          {displayedHistory.map((entry) => (
                            <motion.div
                              key={entry.id}
                              whileHover={{ x: 2 }}
                              className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                            >
                              <div className="flex items-start gap-2 mb-1.5">
                                <div className="text-xs text-white/50">
                                  {new Date(entry.date).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                <div className="text-xs text-white/40">•</div>
                                <div className="text-xs text-white/60">{entry.auteur}</div>
                              </div>
                              <p className="text-sm text-white/80 leading-relaxed">
                                {entry.description}
                              </p>
                            </motion.div>
                          ))}
                        </div>

                        {hasMoreHistory && (
                          <Button
                            onClick={() => setShowAllHistory(!showAllHistory)}
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3 text-white/60 hover:text-white hover:bg-white/5"
                          >
                            {showAllHistory ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Voir moins
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Voir tout ({allHistory.length - 5} de plus)
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-white/40 text-center py-8">
                        Aucun historique
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Modals */}
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
            onCreateTask={handleAddTask}
          />

          <DocumentsModal
            isOpen={isDocumentsModalOpen}
            onClose={() => setIsDocumentsModalOpen(false)}
            client={localClient}
            onDocumentsAdded={handleDocumentUpload}
          />

          {pendingStatus && isStatusConfirmModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#171B22] rounded-2xl border border-white/10 p-6 max-w-md w-full"
              >
                <h3 className="text-xl font-bold text-white mb-2">Confirmer le changement de statut</h3>
                <p className="text-white/60 mb-6">
                  Voulez-vous changer le statut du projet à "{pendingStatus}" ?
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => confirmStatusChange(pendingStatus)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Confirmer
                  </Button>
                  <Button
                    onClick={() => {
                      setIsStatusConfirmModalOpen(false)
                      setPendingStatus(null)
                    }}
                    variant="ghost"
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white"
                  >
                    Annuler
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
