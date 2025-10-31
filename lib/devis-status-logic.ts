import type { Client, Devis, ProjectStatus } from "@/types/client"

/**
 * Automatic project status logic based on devis acceptance/refusal
 */
export function getAutoProjectStatus(client: Client): ProjectStatus | null {
  const devisList = client.devis || []
  
  // No devis = no automatic status change
  if (devisList.length === 0) {
    return null
  }

  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const refusedDevis = devisList.filter(d => d.statut === "refuse")
  const allDevisProcessed = devisList.every(d => d.statut !== "en_attente")

  // Rule 1: If all devis are refused → mark project as "Refusé"
  if (allDevisProcessed && devisList.length > 0 && acceptedDevis.length === 0 && refusedDevis.length > 0) {
    return "refuse"
  }

  // Rule 2: If at least one devis is accepted → allow moving to next steps
  if (acceptedDevis.length > 0) {
    // If currently in early stages, suggest moving to "1er Dépôt"
    if (client.statutProjet === "qualifie" || client.statutProjet === "devis_negociation") {
      return "premier_depot"
    }
  }

  // Rule 3: If all accepted devis are paid (facture_reglee = true) → suggest "Terminé"
  const allPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee)
  if (allPaid && client.statutProjet === "livraison_termine") {
    return "livraison_termine" // Already at final stage
  }

  return null
}

/**
 * Check if project can move to next status based on devis
 */
export function canMoveToStatus(client: Client, targetStatus: ProjectStatus): {
  allowed: boolean
  reason?: string
} {
  const devisList = client.devis || []
  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const allPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee)

  // Check if moving to "Terminé" without all payments
  if (targetStatus === "livraison_termine" && acceptedDevis.length > 0 && !allPaid) {
    return {
      allowed: false,
      reason: "⚠️ Toutes les factures des devis acceptés doivent être réglées avant de marquer le projet comme terminé."
    }
  }

  // Check if moving forward without any accepted devis
  const forwardStatuses: ProjectStatus[] = [
    "premier_depot",
    "projet_en_cours",
    "chantier",
    "facture_reglee",
    "livraison_termine"
  ]

  if (forwardStatuses.includes(targetStatus) && acceptedDevis.length === 0) {
    return {
      allowed: false,
      reason: "⚠️ Au moins un devis doit être accepté pour avancer le projet."
    }
  }

  return { allowed: true }
}

/**
 * Get payment completion status
 */
export function getPaymentStatus(client: Client): {
  totalAccepted: number
  totalPaid: number
  progress: number
  allPaid: boolean
  hasAcceptedDevis: boolean
} {
  const devisList = client.devis || []
  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const totalAccepted = acceptedDevis.reduce((sum, d) => sum + d.montant, 0)
  const totalPaid = acceptedDevis.filter(d => d.facture_reglee).reduce((sum, d) => sum + d.montant, 0)
  const progress = totalAccepted > 0 ? Math.round((totalPaid / totalAccepted) * 100) : 0
  const allPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee)

  return {
    totalAccepted,
    totalPaid,
    progress,
    allPaid,
    hasAcceptedDevis: acceptedDevis.length > 0
  }
}

/**
 * Get warning messages based on devis status
 */
export function getDevisWarnings(client: Client): string[] {
  const warnings: string[] = []
  const devisList = client.devis || []
  
  if (devisList.length === 0) {
    warnings.push("Aucun devis créé pour ce projet")
    return warnings
  }

  const acceptedDevis = devisList.filter(d => d.statut === "accepte")
  const refusedDevis = devisList.filter(d => d.statut === "refuse")
  const allRefused = devisList.length > 0 && devisList.every(d => d.statut === "refuse")

  // Warning: All devis refused
  if (allRefused) {
    warnings.push("❌ Tous les devis ont été refusés - Le projet devrait être marqué comme 'Refusé'")
  }

  // Warning: No accepted devis but project is moving forward
  const forwardStatuses: ProjectStatus[] = [
    "premier_depot",
    "projet_en_cours",
    "chantier",
    "facture_reglee",
    "livraison_termine"
  ]

  if (forwardStatuses.includes(client.statutProjet) && acceptedDevis.length === 0) {
    warnings.push("⚠️ Le projet avance sans devis accepté")
  }

  // Warning: Unpaid invoices at delivery
  const unpaidDevis = acceptedDevis.filter(d => !d.facture_reglee)
  if (client.statutProjet === "livraison_termine" && unpaidDevis.length > 0) {
    warnings.push(`⚠️ ${unpaidDevis.length} facture(s) non réglée(s) - Vérifiez avant de finaliser`)
  }

  return warnings
}
