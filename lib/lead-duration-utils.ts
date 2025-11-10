/**
 * Lead Duration Utility Functions
 * 
 * Calculates and formats the duration a lead stayed in "Lead" status
 * before being converted to client or marked as non-interested.
 */

export interface LeadDurationResult {
  days: number
  label: string
  isActive: boolean
}

/**
 * Calculate the duration in days a lead has been/was in lead status
 * @param createdAt - When the lead was created
 * @param convertedAt - When the lead was converted or marked non-interested (null if still active)
 * @returns Duration in days
 */
export function calculateLeadDurationDays(
  createdAt: string | Date,
  convertedAt?: string | Date | null
): number {
  const startDate = new Date(createdAt)
  const endDate = convertedAt ? new Date(convertedAt) : new Date()
  
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays) // Ensure non-negative
}

/**
 * Get formatted lead duration with label
 * @param createdAt - When the lead was created
 * @param convertedAt - When the lead was converted or marked non-interested (null if still active)
 * @returns Object with days, formatted label, and active status
 */
export function getLeadDuration(
  createdAt: string | Date,
  convertedAt?: string | Date | null
): LeadDurationResult {
  const days = calculateLeadDurationDays(createdAt, convertedAt)
  const isActive = !convertedAt
  
  let label: string
  
  if (days === 0) {
    label = "Aujourd'hui"
  } else if (days === 1) {
    label = "1 jour"
  } else if (days < 7) {
    label = `${days} jours`
  } else if (days < 14) {
    label = "1 semaine"
  } else if (days < 30) {
    const weeks = Math.floor(days / 7)
    label = `${weeks} semaines`
  } else if (days < 60) {
    label = "1 mois"
  } else {
    const months = Math.floor(days / 30)
    label = `${months} mois`
  }
  
  return {
    days,
    label,
    isActive
  }
}

/**
 * Get a detailed duration string with date range
 * @param createdAt - When the lead was created
 * @param convertedAt - When the lead was converted or marked non-interested (null if still active)
 * @returns Formatted string like "5 jours (du 3 nov. au 8 nov.)"
 */
export function getDetailedLeadDuration(
  createdAt: string | Date,
  convertedAt?: string | Date | null
): string {
  const duration = getLeadDuration(createdAt, convertedAt)
  const startDate = new Date(createdAt)
  const endDate = convertedAt ? new Date(convertedAt) : new Date()
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    })
  }
  
  if (duration.isActive) {
    return `⏳ ${duration.label} depuis le ${formatDate(startDate)}`
  } else {
    return `${duration.label} (du ${formatDate(startDate)} au ${formatDate(endDate)})`
  }
}

/**
 * Get color class based on lead duration
 * @param days - Number of days in lead status
 * @param isActive - Whether the lead is still active
 * @returns Tailwind color classes
 */
export function getLeadDurationColor(days: number, isActive: boolean): string {
  if (!isActive) {
    return "bg-slate-800 text-slate-300 border-slate-700"
  }
  
  if (days < 3) {
    return "bg-green-500/20 text-green-300 border-green-500/40"
  } else if (days < 7) {
    return "bg-blue-500/20 text-blue-300 border-blue-500/40"
  } else if (days < 14) {
    return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
  } else if (days < 30) {
    return "bg-orange-500/20 text-orange-300 border-orange-500/40"
  } else {
    return "bg-red-500/20 text-red-300 border-red-500/40"
  }
}

/**
 * Get icon based on lead duration
 * @param days - Number of days in lead status
 * @param isActive - Whether the lead is still active
 * @returns Emoji icon
 */
export function getLeadDurationIcon(days: number, isActive: boolean): string {
  if (!isActive) {
    return "🔒"
  }
  
  if (days < 3) {
    return "🟢"
  } else if (days < 7) {
    return "🔵"
  } else if (days < 14) {
    return "🟡"
  } else if (days < 30) {
    return "🟠"
  } else {
    return "🔴"
  }
}

/**
 * Calculate average lead duration from an array of leads
 * @param leads - Array of leads with createdAt and convertedAt
 * @returns Average duration in days
 */
export function calculateAverageLeadDuration(
  leads: Array<{ createdAt: string | Date; convertedAt?: string | Date | null }>
): number {
  if (leads.length === 0) return 0
  
  const totalDays = leads.reduce((sum, lead) => {
    return sum + calculateLeadDurationDays(lead.createdAt, lead.convertedAt)
  }, 0)
  
  return Math.round(totalDays / leads.length)
}
