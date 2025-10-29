"use client"

import type { ProjectStatus } from "@/types/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface StatusChangeConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newStatus: ProjectStatus) => void
  currentStatus: ProjectStatus
  newStatus: ProjectStatus
  clientName: string
}

const statusLabels: Record<ProjectStatus, string> = {
  prospection: "Prospection",
  nouveau: "Nouveau projet",
  acompte_verse: "Acompte versé",
  en_conception: "En conception",
  en_validation: "En validation",
  en_chantier: "En chantier",
  livraison: "Livraison",
  termine: "Terminé",
  annule: "Annulé",
  suspendu: "Suspendu",
}

export function StatusChangeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  newStatus,
  clientName,
}: StatusChangeConfirmationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <AlertDialogContent className="glass border-border/40">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            Confirmer le changement de statut
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Vous êtes sur le point de changer le statut du projet de
            <span className="font-semibold text-foreground"> {statusLabels[currentStatus]} </span>
            à
            <span className="font-semibold text-foreground"> {statusLabels[newStatus]} </span>
            pour le client
            <span className="font-semibold text-foreground"> {clientName}</span>.
            Cette action sera enregistrée dans l'historique.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="hover:bg-accent" onClick={onClose}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onConfirm(newStatus)}
          >
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
