import type { ProjectStatus } from '@/types/client'

/**
 * Update a client's stage and create history entry
 */
export async function updateClientStage(
  clientId: string,
  newStage: ProjectStatus,
  changedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/clients/${clientId}/stage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        newStage,
        changedBy,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || 'Failed to update stage',
      }
    }

    const result = await response.json()
    return {
      success: true,
      ...result,
    }
  } catch (error) {
    console.error('Error updating client stage:', error)
    return {
      success: false,
      error: 'Network error',
    }
  }
}

/**
 * Get stage history for a client
 */
export async function getClientStageHistory(clientId: string) {
  try {
    const response = await fetch(`/api/clients/${clientId}/stage`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch stage history')
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Error fetching stage history:', error)
    return []
  }
}

/**
 * Get the current active stage for a client from the database
 * This is the source of truth for the client's current stage
 */
export async function getCurrentClientStage(clientId: string): Promise<ProjectStatus | null> {
  try {
    const history = await getClientStageHistory(clientId)
    
    // Find the most recent stage with no end date (active stage)
    const activeStage = history.find((entry: any) => !entry.endedAt)
    
    if (activeStage) {
      return activeStage.stageName as ProjectStatus
    }
    
    // If no active stage found, return the most recent stage
    if (history.length > 0) {
      return history[0].stageName as ProjectStatus
    }
    
    return null
  } catch (error) {
    console.error('Error getting current client stage:', error)
    return null
  }
}
