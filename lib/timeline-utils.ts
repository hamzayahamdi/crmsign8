/**
 * Timeline & Duration Utility Functions
 * For calculating and formatting time durations in the historique
 */

import type { ProjectStatus } from "@/types/client"

/**
 * Calculate duration between two dates in hours
 */
export function calculateDurationInHours(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const diffMs = end - start
  return Math.floor(diffMs / (1000 * 60 * 60)) // Convert to hours
}

/**
 * Format duration in a human-readable way
 * Examples: "2 jours 3h", "5 heures", "45 minutes"
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  if (days > 0) {
    if (remainingHours > 0) {
      return `${days} jour${days > 1 ? 's' : ''} ${remainingHours}h`
    }
    return `${days} jour${days > 1 ? 's' : ''}`
  }
  
  return `${hours} heure${hours > 1 ? 's' : ''}`
}

/**
 * Format relative time (e.g., "Il y a 2 jours", "Aujourd'hui à 14:30")
 * Fixed to avoid timezone issues
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  
  // Calculate difference using local date components to avoid timezone issues
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = nowDay.getTime() - dateDay.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // For time-based calculations
  const timeDiffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(timeDiffMs / (1000 * 60 * 60))
  
  // Today
  if (diffDays === 0) {
    if (diffHours === 0) {
      const diffMinutes = Math.floor(timeDiffMs / (1000 * 60))
      if (diffMinutes < 1) return "À l'instant"
      if (diffMinutes === 1) return "Il y a 1 minute"
      if (diffMinutes < 60) return `Il y a ${diffMinutes} minutes`
    }
    return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // Yesterday
  if (diffDays === 1) {
    return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // Within a week
  if (diffDays < 7 && diffDays > 0) {
    return `Il y a ${diffDays} jours`
  }
  
  // More than a week
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Get human-readable status name
 */
export function getStatusLabel(status: ProjectStatus): string {
  const statusLabels: Record<ProjectStatus, string> = {
    qualifie: "Qualifié",
    prise_de_besoin: "Prise de besoin",
    acompte_recu: "Acompte reçu",
    conception: "Conception",
    devis_negociation: "Devis/Négociation",
    accepte: "Accepté",
    refuse: "Refusé",
    premier_depot: "1er Dépôt",
    projet_en_cours: "Projet en cours",
    chantier: "Projet en cours (héritage)",
    facture_reglee: "Facture réglée",
    livraison_termine: "Livraison & Terminé",
    // Legacy
    nouveau: "Nouveau",
    acompte_verse: "Acompte versé",
    en_conception: "En conception",
    en_validation: "En validation",
    en_chantier: "En chantier",
    livraison: "Livraison",
    termine: "Terminé",
    annule: "Annulé",
    suspendu: "Suspendu"
  }
  return statusLabels[status] || status
}

/**
 * Group history entries by date
 * Fixed to avoid timezone issues that cause "-1 jour" display
 */
export function groupHistoryByDate(history: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}
  
  history.forEach(entry => {
    const date = new Date(entry.date)
    
    // Use UTC date components to avoid timezone shifts
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    
    // Create a date object without timezone conversion
    const localDate = new Date(year, month, day)
    
    const dateKey = localDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(entry)
  })
  
  return grouped
}

/**
 * Check if appointment is upcoming
 */
export function isUpcomingAppointment(dateStart: string): boolean {
  return new Date(dateStart).getTime() > Date.now()
}

/**
 * Get appointment status color
 */
export function getAppointmentStatusColor(status: "upcoming" | "completed" | "cancelled"): string {
  const colors = {
    upcoming: "text-blue-400 bg-blue-500/20",
    completed: "text-green-400 bg-green-500/20",
    cancelled: "text-gray-400 bg-gray-500/20"
  }
  return colors[status] || colors.upcoming
}
