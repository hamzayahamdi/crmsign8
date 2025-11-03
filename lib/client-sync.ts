import { useClientStore } from '@/stores/client-store'
import type { ProjectStatus } from '@/types/client'
import type { Client } from '@/types/client'
import { computeStatusFromDevis } from '@/lib/devis-status-logic'

/**
 * Track stage change in database for duration tracking
 */
async function trackStageChange(clientId: string, newStage: ProjectStatus, changedBy: string = 'Système') {
  try {
    await fetch(`/api/clients/${clientId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        newStage,
        changedBy
      })
    })
  } catch (error) {
    console.error('Failed to track stage change:', error)
  }
}

/**
 * Centralized sync for client status based on devis/payment state.
 * Forward-only: will not downgrade status.
 */
export function syncClientStatus(clientId: string) {
  const store = useClientStore.getState()
  const client = store.getClientById(clientId)
  if (!client) return

  const derived = computeStatusFromDevis(client)
  if (derived && derived !== client.statutProjet) {
    const previousStatus = client.statutProjet
    store.updateClientStatus(clientId, derived as ProjectStatus)
    // Track stage change for duration tracking
    trackStageChange(clientId, derived as ProjectStatus, 'Auto-sync')
  }
}

/**
 * Convenience: sync after providing an updated client object
 */
export function syncClientStatusFrom(updatedClient: Client) {
  const store = useClientStore.getState()
  const previousStatus = updatedClient.statutProjet
  
  // Ensure the store has latest version first so compute sees it elsewhere
  store.updateClient(updatedClient.id, updatedClient)
  const next = computeStatusFromDevis(updatedClient)
  if (next && next !== updatedClient.statutProjet) {
    store.updateClientStatus(updatedClient.id, next as ProjectStatus)
    // Track stage change for duration tracking
    trackStageChange(updatedClient.id, next as ProjectStatus, 'Auto-sync')
  }
}
