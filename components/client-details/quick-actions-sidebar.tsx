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
      ...client,
      payments: [
        newPayment,
        ...(client.payments || [])
      ],
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: 'acompte' as const,
          description: `Acompte reçu: ${payment.amount.toLocaleString()} MAD (${payment.method})${payment.reference ? ` - Réf: ${payment.reference}` : ''}`,
          auteur: userName,
          metadata: { paymentId: newPayment.id }
        },
        ...(client.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    onUpdate(updatedClient)
    setIsPaymentModalOpen(false)

    toast({
      title: "Acompte enregistré",
      description: `${payment.amount.toLocaleString()} MAD ajouté avec succès`,
    })
  }

  const handleDocumentsAdded = (documents: any[]) => {
    const now = new Date().toISOString()
    const userName = user?.name || 'Admin'
    
    const updatedClient = {
      ...client,
      documents: [
        ...(client.documents || []),
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
