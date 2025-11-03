import { useEffect, useState } from 'react'
import type { Devis } from '@/types/client'

/**
 * Hook to listen for real-time devis changes and fetch updated data
 */
export function useRealtimeDevis(clientId: string | null) {
  const [devisList, setDevisList] = useState<Devis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch devis from database
  const fetchDevis = async () => {
    if (!clientId) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/clients/${clientId}/devis`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch devis')
      }

      const result = await response.json()
      setDevisList(result.data || [])
    } catch (error) {
      console.error('[useRealtimeDevis] Error fetching devis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchDevis()
  }, [clientId])

  // Listen for real-time updates
  useEffect(() => {
    if (!clientId) return

    const handleDevisUpdate = (event: CustomEvent) => {
      const { clientId: updatedClientId } = event.detail
      
      if (updatedClientId === clientId) {
        console.log('[useRealtimeDevis] Devis updated, refreshing...')
        fetchDevis()
      }
    }

    window.addEventListener('devis-updated' as any, handleDevisUpdate)

    return () => {
      window.removeEventListener('devis-updated' as any, handleDevisUpdate)
    }
  }, [clientId])

  return { devisList, isLoading, refetch: fetchDevis }
}
