"use client"

import { useState } from "react"
import { Plus, DollarSign, Paperclip, Share2, Trash2, MessageSquare } from "lucide-react"
import type { Client } from "@/types/client"
import { Button } from "@/components/ui/button"
import { AddNoteModal } from "./add-note-modal"
import { AddDevisModal } from "./add-devis-modal"
import { AddPaymentModal, type PaymentData } from "@/components/add-payment-modal"
import { DocumentsModal } from "@/components/documents-modal"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface QuickActionsSidebarProps {
  client: Client
  onUpdate: (client: Client) => void
  onDelete: () => void
}

export function QuickActionsSidebar({ client, onUpdate, onDelete }: QuickActionsSidebarProps) {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isDevisModalOpen, setIsDevisModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleAddPayment = async (payment: PaymentData) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'
    
    try {
      // Save to database via API
      const response = await fetch(`/api/clients/${client.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          montant: payment.amount,
          date: payment.date,
          methode: payment.method,
          description: payment.notes || '',
          createdBy: userName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add payment')
      }

      const result = await response.json()
      console.log('[Add Payment] Payment created in database:', result.data)
      console.log('[Add Payment] Stage progressed:', result.stageProgressed)

      // Check if stage was auto-progressed
      const wasAutoProgressed = result.stageProgressed || false

      // Re-fetch client data to get updated payments, historique, and stage
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include'
      })
      
      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        console.log('[Add Payment] Updated client data:', {
          statutProjet: clientResult.data.statutProjet,
          paymentsCount: clientResult.data.payments?.length || 0
        })
        onUpdate(clientResult.data)
        
        // Trigger payment update event for real-time sync
        window.dispatchEvent(new CustomEvent('payment-updated', { 
          detail: { clientId: client.id } 
        }))
      }
      
      setIsPaymentModalOpen(false)
      
      toast({
        title: "Acompte enregistré",
        description: wasAutoProgressed 
          ? `${payment.amount.toLocaleString()} MAD ajouté avec succès. Statut changé automatiquement vers "Acompte reçu".`
          : `${payment.amount.toLocaleString()} MAD ajouté avec succès`,
      })
    } catch (error) {
      console.error('[Add Payment] Error:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le paiement. Veuillez réessayer.",
        variant: "destructive"
      })
    }
  }

  const handleDocumentsAdded = async (documents: any[]) => {
    // Re-fetch client data to get updated documents and historique
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        onUpdate(result.data)
      }
    } catch (error) {
      console.error('[Documents Added] Error refreshing client:', error)
    }
    
    toast({
      title: "Documents ajoutés",
      description: `${documents.length} document(s) ajouté(s) avec succès`,
    })
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/clients/${client.id}`
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
  }

  return (
    <>
    <div className="bg-[#171B22] rounded-2xl border border-white/10 p-6 sticky top-24">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Actions Rapides</h3>
        <p className="text-xs text-white/50">Gérer le projet</p>
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => setIsNoteModalOpen(true)}
          className="w-full justify-start h-11 bg-white/5 hover:bg-white/10 text-white border border-white/10"
          variant="ghost"
        >
          <MessageSquare className="w-4 h-4 mr-3" />
          Ajouter note
        </Button>

        <Button
          onClick={() => setIsPaymentModalOpen(true)}
          className="w-full justify-start h-11 bg-white/5 hover:bg-white/10 text-white border border-white/10"
          variant="ghost"
        >
          <DollarSign className="w-4 h-4 mr-3" />
          Ajouter acompte
        </Button>

        <Button
          onClick={() => setIsDocumentsModalOpen(true)}
          className="w-full justify-start h-11 bg-white/5 hover:bg-white/10 text-white border border-white/10"
          variant="ghost"
        >
          <Paperclip className="w-4 h-4 mr-3" />
          Documents
        </Button>

        <Button
          onClick={handleShare}
          className="w-full justify-start h-11 bg-white/5 hover:bg-white/10 text-white border border-white/10"
          variant="ghost"
        >
          <Share2 className="w-4 h-4 mr-3" />
          Partager projet
        </Button>

        <Button
          onClick={() => setIsDevisModalOpen(true)}
          className="w-full justify-start h-11 bg-white/5 hover:bg-white/10 text-white border border-white/10"
          variant="ghost"
        >
          <Plus className="w-4 h-4 mr-3" />
          Créer devis
        </Button>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5">
        <Button
          onClick={onDelete}
          className="w-full justify-start h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
          variant="ghost"
        >
          <Trash2 className="w-4 h-4 mr-3" />
          Supprimer client
        </Button>
      </div>
    </div>

      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        client={client}
        onSave={onUpdate}
      />

      <AddDevisModal
        isOpen={isDevisModalOpen}
        onClose={() => setIsDevisModalOpen(false)}
        client={client}
        onSave={onUpdate}
      />

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
    </>  
  )
}
