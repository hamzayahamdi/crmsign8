import type { Client, Devis, ProjectStatus } from "@/types/client"

/**
 * Summary of devis statuses for a project
 */
export interface DevisStatusSummary {
  total: number
  accepted: number
  refused: number
  pending: number
  hasAccepted: boolean
  allRefused: boolean
  allPending: boolean
}

/**
 * Get summary of all devis statuses for a project
 */
export function getDevisStatusSummary(devisList: Devis[]): DevisStatusSummary {
  const accepted = devisList.filter(d => d.statut === "accepte")
  const refused = devisList.filter(d => d.statut === "refuse")
  const pending = devisList.filter(d => d.statut === "en_attente")

  return {
    total: devisList.length,
    accepted: accepted.length,
    refused: refused.length,
    pending: pending.length,
    hasAccepted: accepted.length > 0,
    allRefused: refused.length > 0 && refused.length === devisList.length,
    allPending: pending.length === devisList.length
  }
}

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
 * Internal: define the canonical order of statuses to avoid regressions when auto-syncing.
 */
const STATUS_ORDER: ProjectStatus[] = [
  "qualifie",
  "prise_de_besoin",
  "acompte_recu",
  "conception",
  "devis_negociation",
  "accepte",
  "refuse",
  "premier_depot",
  "projet_en_cours",
  "facture_reglee",
  "livraison_termine",
  "chantier",
  // Legacy (mapped elsewhere, but included for safety)
  "nouveau",
  "acompte_verse",
  "en_conception",
  "en_validation",
  "en_chantier",
  "livraison",
  "termine",
  "annule",
  "suspendu",
]

function statusIndex(s: ProjectStatus) {
  const i = STATUS_ORDER.indexOf(s)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

/**
 * Compute the appropriate project status from devis state.
 * NEW LOGIC:
 * - If ANY devis is "accepte" → set to "accepte" (favor progress)
 * - If ALL devis are "refuse" → set to "refuse"
 * - If some pending/sent → keep current status unchanged
 * - Never regress the project if a positive devis exists
 *
 * Returns null when no change should be applied.
 */
export function computeStatusFromDevis(client: Client): ProjectStatus | null {
  const devisList = client.devis || []
  if (devisList.length === 0) return null

  const summary = getDevisStatusSummary(devisList)
  
  // Determine derived status from quotes
  let derived: ProjectStatus | null = null

  // Rule 1: If ANY devis is accepted → favor progress, set to "accepte"
  if (summary.hasAccepted) {
    derived = "accepte"

    // If all accepted devis are fully paid, we can move to "facture_reglee"
    const accepted = devisList.filter(d => d.statut === "accepte")
    const allPaid = accepted.every(d => d.facture_reglee)
    if (allPaid) {
      derived = "facture_reglee"
    }
  } 
  // Rule 2: If ALL devis are refused → set to "refuse"
  else if (summary.allRefused) {
    derived = "refuse"
  } 
  // Rule 3: If some devis are still pending/sent → keep current status
  else if (summary.pending > 0) {
    // Don't change status, let user decide
    return null
  }

  if (!derived) return null

  // Forward-only policy: never downgrade status
  const current = client.statutProjet
  
  // Special case: Never regress from "accepte" or beyond if we have accepted devis
  if (summary.hasAccepted && statusIndex(current) >= statusIndex("accepte")) {
    // If current is "accepte" or beyond, only allow progression
    if (statusIndex(derived) <= statusIndex(current)) {
      return null
    }
  }
  
  if (statusIndex(derived) < statusIndex(current)) {
    // Do not regress
    return null
  }

  // If current is already further than derived, keep current
  if (statusIndex(current) < statusIndex(derived)) {
    return derived
  }

  // Equal → no change
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
