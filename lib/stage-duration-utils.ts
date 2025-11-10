/**
 * Format duration in seconds to human-readable format
 * Following the rules:
 * - >= 86400s (1 day) -> "Xj"
 * - >= 3600s (1 hour) -> "Xh"
 * - >= 60s (1 minute) -> "Xm"
 * - < 60s -> "Récent"
 */
export function formatDuration(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400)
    return `${days}j`
  }
  
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  }
  
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }
  
  return 'Récent'
}

/**
 * Format duration in seconds to detailed human-readable format
 * Shows both days and hours for better clarity
 * - >= 86400s (1 day) -> "X jours" or "X jours Yh"
 * - >= 3600s (1 hour) -> "X heures"
 * - >= 60s (1 minute) -> "X minutes"
 * - < 60s -> "X secondes" (show actual seconds)
 * 
 * Updated: 2025-11-07 - Now shows all durations including seconds
 */
export function formatDurationDetailed(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400)
    const remainingHours = Math.floor((seconds % 86400) / 3600)
    
    if (remainingHours > 0) {
      return `${days} jour${days > 1 ? 's' : ''} ${remainingHours}h`
    }
    return `${days} jour${days > 1 ? 's' : ''}`
  }
  
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    
    if (remainingMinutes > 0) {
      return `${hours} heure${hours > 1 ? 's' : ''} ${remainingMinutes}m`
    }
    return `${hours} heure${hours > 1 ? 's' : ''}`
  }
  
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (remainingSeconds > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds}s`
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  
  // Show actual seconds for very short durations
  if (seconds > 0) {
    return `${seconds} seconde${seconds > 1 ? 's' : ''}`
  }
  
  return 'Instant'
}

/**
 * Calculate duration between two dates in seconds
 */
export function calculateDuration(startDate: string | Date, endDate: string | Date = new Date()): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  return Math.floor((end - start) / 1000)
}

/**
 * Format a date for display in tooltips
 * Example: "31 oct. — par Tazi"
 */
export function formatStageUpdateDate(date: string | Date, author?: string): string {
  const d = new Date(date)
  const formatted = d.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  })
  
  if (author) {
    return `Mis à jour: ${formatted} — par ${author}`
  }
  
  return `Mis à jour: ${formatted}`
}

/**
 * Format a date range for display
 * Example: "du 12/10/2025 au 15/10/2025"
 */
export function formatDateRange(startDate: string | Date, endDate?: string | Date | null): string {
  const start = new Date(startDate)
  const startFormatted = start.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  
  if (!endDate) {
    return `depuis le ${startFormatted}`
  }
  
  const end = new Date(endDate)
  const endFormatted = end.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  
  return `du ${startFormatted} au ${endFormatted}`
}

/**
 * Format a single date for compact display
 * Example: "12/10/2025"
 */
export function formatDateCompact(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Get stage duration display text with status
 * For completed stages: "5j"
 * For active stage: "En cours · 3h"
 */
export function getStageDisplayDuration(
  isActive: boolean,
  startedAt: string | Date,
  endedAt?: string | Date | null,
  durationSeconds?: number | null
): string {
  if (isActive) {
    // Calculate live duration
    const liveDuration = calculateDuration(startedAt)
    return `En cours · ${formatDuration(liveDuration)}`
  }
  
  // Use stored duration if available
  if (durationSeconds !== null && durationSeconds !== undefined) {
    return formatDuration(durationSeconds)
  }
  
  // Fallback: calculate from dates
  if (endedAt) {
    const duration = calculateDuration(startedAt, endedAt)
    return formatDuration(duration)
  }
  
  return 'Récent'
}

export interface StageHistoryEntry {
  id: string
  clientId: string
  stageName: string
  startedAt: string
  endedAt?: string | null
  durationSeconds?: number | null
  changedBy: string
  createdAt: string
  updatedAt: string
}

/**
 * Get the current active stage from history
 */
export function getCurrentStage(history: StageHistoryEntry[]): StageHistoryEntry | null {
  return history.find(entry => !entry.endedAt) || null
}

/**
 * Get duration for a specific stage from history
 */
export function getStageDuration(
  stageName: string,
  history: StageHistoryEntry[],
  currentStage?: string
): string | null {
  const stageEntry = history.find(entry => entry.stageName === stageName)
  
  if (!stageEntry) {
    return null
  }
  
  const isActive = currentStage === stageName && !stageEntry.endedAt
  
  return getStageDisplayDuration(
    isActive,
    stageEntry.startedAt,
    stageEntry.endedAt,
    stageEntry.durationSeconds
  )
}
