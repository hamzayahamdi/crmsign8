"use client"

import { useState } from "react"
import { TrendingUp, Calendar, Plus, Upload, Send, CheckCircle, FileText, DollarSign, MessageSquare, ArrowRight, NotebookPen } from "lucide-react"
import type { Client, ProjectStatus } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { AddPaymentModal, type PaymentData } from "@/components/add-payment-modal"
import { DocumentsModal } from "@/components/documents-modal"

interface ProjectProgressCardProps {
  client: Client
  onUpdate: (client: Client, skipApiCall?: boolean) => void
}

interface ActionStep {
  id: string
  label: string
  description: string
  action: () => void
  icon: React.ReactNode
  variant?: "default" | "outline" | "secondary"
}

export function ProjectProgressCard({ client, onUpdate }: ProjectProgressCardProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)

  // Calculate based on devis instead of budget
  const devisList = client.devis || []
  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const totalAccepted = acceptedDevis.reduce((sum, d) => sum + d.montant, 0)
  const totalPaid = acceptedDevis.filter(d => d.facture_reglee).reduce((sum, d) => sum + d.montant, 0)
  const progressPercentage = totalAccepted > 0 ? Math.round((totalPaid / totalAccepted) * 100) : 0

  const handleScheduleMeeting = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('calendar_client_context', JSON.stringify({
        clientId: client.id,
        clientName: client.nom,
        action: 'meeting'
      }))
      window.location.href = '/calendrier'
    }
  }

  const handleAddPayment = async (payment: PaymentData) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

    try {
      // Use payment type from modal if provided (modal determines based on its title)
      // Otherwise fallback to determining it
      let paymentType: string
      if (payment.paymentType) {
        // Modal explicitly set the type - use it (this is the source of truth)
        paymentType = payment.paymentType
        console.log("[ProjectProgressCard] Using payment type from modal:", paymentType)
      } else {
        // Fallback: determine payment type
        const hasAcompteStatus =
          client.statutProjet === "acompte_recu" ||
          client.statutProjet === "acompte_verse" ||
          client.statutProjet === "conception" ||
          client.statutProjet === "devis_negociation" ||
          client.statutProjet === "accepte" ||
          client.statutProjet === "premier_depot" ||
          client.statutProjet === "projet_en_cours" ||
          client.statutProjet === "chantier" ||
          client.statutProjet === "facture_reglee"

        // Check specifically for acompte payments, not just any payment
        const hasAcomptePayment = client.payments && client.payments.some(
          (p) => p.type === "accompte" || p.type === "Acompte"
        )
        const isFirstPayment = !hasAcompteStatus && !hasAcomptePayment
        paymentType = isFirstPayment ? "accompte" : "paiement"
        console.log("[ProjectProgressCard] Determined payment type (fallback):", paymentType)
      }
      
      const paymentTypeCapitalized = paymentType === "accompte" ? "Acompte" : "Paiement"

      // Save to database via API - ALWAYS send explicit paymentType
      const response = await fetch(`/api/clients/${client.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          montant: payment.amount,
          date: payment.date,
          methode: payment.method,
          reference: payment.reference || "",
          description: payment.notes || "",
          createdBy: userName,
          paymentType: paymentType, // Explicitly send the type
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add payment")
      }

      const result = await response.json()
      console.log("[Add Payment] Payment created in database:", result.data)
      console.log("[Add Payment] Stage progressed:", result.stageProgressed)

      // Force refresh client data to ensure payments show up
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      })

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        // IMPORTANT: Use skipApiCall=true to prevent cascading updates
        // Force immediate UI update with fresh data
        onUpdate(clientResult.data, true)
        console.log("[Add Payment] Updated client data:", {
          statutProjet: clientResult.data.statutProjet,
          paymentsCount: clientResult.data.payments?.length || 0,
        })
        
        // OPTIMIZATION: Dispatch event to force component re-render
        window.dispatchEvent(new CustomEvent('payment-updated', {
          detail: {
            clientId: client.id,
            paymentId: result.data?.id,
            paymentAdded: true
          }
        }))
      }

      setIsPaymentModalOpen(false)

      // Check if stage was auto-progressed
      const wasAutoProgressed = result.stageProgressed || false

      // Show appropriate toast message based on payment type
      if (paymentType === "accompte") {
        toast({
          title: "Acompte reçu",
          description: wasAutoProgressed
            ? `${payment.amount.toLocaleString()} MAD ajouté avec succès. Statut changé automatiquement vers "Acompte reçu".`
            : `${payment.amount.toLocaleString()} MAD d'acompte ajouté avec succès`,
        })
      } else {
        toast({
          title: "Paiement enregistré",
          description: `${payment.amount.toLocaleString()} MAD de paiement ajouté avec succès`,
        })
      }
    } catch (error) {
      console.error("[Add Payment] Error:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le paiement. Veuillez réessayer.",
        variant: "destructive",
      })
    }
  }

  const handleDocumentsAdded = (documents: any[]) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

    const updatedClient = {
      ...client,
      documents: [...(client.documents || []), ...documents],
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'document' as const,
          description: `${documents.length} document(s) ajouté(s)`,
          auteur: userName
        },
        ...(client.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    onUpdate(updatedClient)
    toast({
      title: "Documents ajoutés",
      description: `${documents.length} document(s) ajouté(s) avec succès`,
    })
  }

  const handleStatusChange = (newStatus: ProjectStatus) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

    const updatedClient = {
      ...client,
      statutProjet: newStatus,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'statut' as const,
          description: `Statut changé vers "${newStatus}"`,
          auteur: userName
        },
        ...(client.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    onUpdate(updatedClient)
    toast({
      title: "Statut mis à jour",
      description: `Le projet est maintenant à l'étape: ${newStatus}`,
    })
  }

  const handleAddNote = (noteText: string) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'

    const updatedClient = {
      ...client,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'note' as const,
          description: noteText,
          auteur: userName
        },
        ...(client.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    onUpdate(updatedClient)
    toast({
      title: "Note ajoutée",
      description: "La note a été enregistrée avec succès",
    })
  }

  // Get actionable steps based on current status
  const getActionSteps = (): ActionStep[] => {
    const stepsByStatus: Partial<Record<ProjectStatus, ActionStep[]>> = {
      qualifie: [
        {
          id: 'schedule_initial',
          label: 'Planifier RDV initial',
          description: 'Organiser une première rencontre avec le client',
          action: handleScheduleMeeting,
          icon: <Calendar className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'start_discovery',
          label: 'Lancer prise de besoin',
          description: 'Passer en phase de recueil des besoins',
          action: () => handleStatusChange('prise_de_besoin'),
          icon: <ArrowRight className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      prise_de_besoin: [
        {
          id: 'schedule_discovery',
          label: 'Programmer atelier',
          description: 'Planifier une réunion de découverte détaillée',
          action: handleScheduleMeeting,
          icon: <Calendar className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'document_needs',
          label: 'Documenter besoins',
          description: 'Capturer les besoins clés dans une note',
          action: () => handleAddNote('Synthèse prise de besoin: '),
          icon: <NotebookPen className="w-4 h-4" />,
          variant: 'outline'
        },
        {
          id: 'move_to_deposit',
          label: 'Passer à l\'acompte',
          description: 'Valider la prise de besoin et enregistrer l\'acompte',
          action: () => handleStatusChange('acompte_recu'),
          icon: <ArrowRight className="w-4 h-4" />,
          variant: 'secondary'
        }
      ],
      acompte_recu: [
        {
          id: 'start_conception',
          label: 'Démarrer conception',
          description: 'Passer à la phase de conception',
          action: () => handleStatusChange('conception'),
          icon: <CheckCircle className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'schedule_brief',
          label: 'Planifier brief',
          description: 'Organiser réunion de brief avec le client',
          action: handleScheduleMeeting,
          icon: <Calendar className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      conception: [
        {
          id: 'upload_plans',
          label: 'Télécharger plans',
          description: 'Ajouter les plans de conception',
          action: () => setIsDocumentsModalOpen(true),
          icon: <Upload className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'share_client',
          label: 'Partager avec client',
          description: 'Envoyer les plans au client pour validation',
          action: () => {
            const shareUrl = `${window.location.origin}/clients/${client.id}`
            navigator.clipboard.writeText(shareUrl)
            toast({ title: "Lien copié", description: "Partagez ce lien avec le client" })
          },
          icon: <Send className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      devis_negociation: [
        {
          id: 'create_quote',
          label: 'Créer devis',
          description: 'Préparer le devis détaillé',
          action: () => setIsDocumentsModalOpen(true),
          icon: <FileText className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'mark_accepted',
          label: 'Marquer accepté',
          description: 'Le client a accepté le devis',
          action: () => handleStatusChange('accepte'),
          icon: <CheckCircle className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      accepte: [
        {
          id: 'request_deposit',
          label: 'Demander 1er dépôt',
          description: 'Enregistrer le premier dépôt',
          action: () => setIsPaymentModalOpen(true),
          icon: <DollarSign className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'upload_contract',
          label: 'Télécharger contrat',
          description: 'Ajouter le contrat signé',
          action: () => setIsDocumentsModalOpen(true),
          icon: <Upload className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      refuse: [
        {
          id: 'add_feedback',
          label: 'Ajouter retour',
          description: 'Noter les raisons du refus',
          action: () => handleAddNote('Raisons du refus: '),
          icon: <MessageSquare className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      premier_depot: [
        {
          id: 'start_project',
          label: 'Démarrer projet',
          description: 'Lancer officiellement le projet',
          action: () => handleStatusChange('projet_en_cours'),
          icon: <CheckCircle className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'schedule_kickoff',
          label: 'Planifier kickoff',
          description: 'Organiser réunion de lancement',
          action: handleScheduleMeeting,
          icon: <Calendar className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      projet_en_cours: [
        {
          id: 'upload_progress',
          label: 'Documenter avancement',
          description: 'Ajouter photos et documents',
          action: () => setIsDocumentsModalOpen(true),
          icon: <Upload className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'schedule_review',
          label: 'Planifier revue',
          description: 'Organiser point d\'avancement',
          action: handleScheduleMeeting,
          icon: <Calendar className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      chantier: [
        {
          id: 'legacy_status',
          label: 'Mettre à jour le statut',
          description: 'Ce stade est remplacé par "Projet en cours". Basculez pour profiter des nouvelles actions.',
          action: () => handleStatusChange('projet_en_cours'),
          icon: <ArrowRight className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'document_travaux',
          label: 'Documenter les travaux',
          description: 'Continuez à suivre vos travaux depuis la phase Projet en cours.',
          action: () => setIsDocumentsModalOpen(true),
          icon: <Upload className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      facture_reglee: [
        {
          id: 'schedule_delivery',
          label: 'Planifier livraison',
          description: 'Organiser la remise des clés',
          action: handleScheduleMeeting,
          icon: <Calendar className="w-4 h-4" />,
          variant: 'default'
        },
        {
          id: 'upload_invoice',
          label: 'Télécharger facture',
          description: 'Ajouter la facture finale',
          action: () => setIsDocumentsModalOpen(true),
          icon: <Upload className="w-4 h-4" />,
          variant: 'outline'
        }
      ],
      livraison_termine: [
        {
          id: 'request_feedback',
          label: 'Demander avis',
          description: 'Recueillir les retours du client',
          action: () => handleAddNote('Avis client: '),
          icon: <MessageSquare className="w-4 h-4" />,
          variant: 'default'
        }
      ]
    }

    return stepsByStatus[client.statutProjet] || []
  }

  const actionSteps = getActionSteps()

  return (
    <div className="bg-[#171B22] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Progression & Prochaines Étapes</h2>
          <p className="text-sm text-white/50">Avancement du projet et actions recommandées</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Paiements des devis acceptés</span>
          <span className="text-sm font-bold text-white">{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        {totalAccepted > 0 && (
          <p className="text-xs text-white/40 mt-2">
            {totalPaid.toLocaleString()} MAD réglé sur {totalAccepted.toLocaleString()} MAD
          </p>
        )}
        {acceptedDevis.length === 0 && (
          <p className="text-xs text-yellow-400/60 mt-2">
            ⚠️ Aucun devis accepté pour le moment
          </p>
        )}
      </div>

      {/* Actionable Next Steps */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Actions recommandées</h3>
        </div>

        {actionSteps.length > 0 ? (
          <div className="space-y-3">
            {actionSteps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-400">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white mb-0.5">{step.label}</h4>
                  <p className="text-xs text-white/50">{step.description}</p>
                </div>
                <Button
                  onClick={step.action}
                  size="sm"
                  variant={step.variant}
                  className={
                    step.variant === 'default'
                      ? "bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                      : "border-white/20 text-white hover:bg-white/10 shrink-0"
                  }
                >
                  {step.icon}
                  <span className="ml-1.5 hidden sm:inline">Action</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
            <p className="text-sm text-white/50">Aucune action recommandée pour ce statut</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        client={client}
        onAddPayment={handleAddPayment}
      />

      <DocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        client={client}
        onDocumentsAdded={handleDocumentsAdded}
      />
    </div>
  )
}
