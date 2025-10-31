import { useEffect } from 'react'
import { useClientStore } from '@/stores/client-store'
import type { Client } from '@/types/client'

/**
 * Hook to sync clients with the global store
 * Use this in your main components to ensure real-time sync
 */
export function useClientSync() {
  const { clients, setClients, refreshClients, lastUpdate } = useClientStore()

  // Initialize from localStorage on mount
  useEffect(() => {
    refreshClients()
  }, [])

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'signature8-clients' && e.newValue) {
        refreshClients()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    clients,
    setClients,
    refreshClients,
    lastUpdate
  }
}

/**
 * Hook to get and update a specific client
 */
export function useClient(clientId: string | null) {
  const { getClientById, updateClient, selectedClient, setSelectedClient } = useClientStore()

  useEffect(() => {
    if (clientId) {
      const client = getClientById(clientId)
      if (client) {
        setSelectedClient(client)
      }
    }
  }, [clientId, getClientById, setSelectedClient])

  return {
    client: selectedClient,
    updateClient,
    setSelectedClient
  }
}

/**
 * Hook for real-time status updates
 * Automatically updates all views when status changes
 */
export function useStatusSync() {
  const { updateClientStatus, clients } = useClientStore()

  const updateStatus = (clientId: string, newStatus: Client['statutProjet']) => {
    updateClientStatus(clientId, newStatus)
    
    // Trigger custom event for additional listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('client-status-updated', {
        detail: { clientId, newStatus }
      }))
    }
  }

  return {
    updateStatus,
    clients
  }
}
