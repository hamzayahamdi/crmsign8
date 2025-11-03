import { useEffect, useState } from 'react'
import type { Appointment } from '@/types/client'

/**
 * Hook to listen for real-time appointment changes and fetch updated data
 */
export function useRealtimeAppointments(clientId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch appointments from database
  const fetchAppointments = async () => {
    if (!clientId) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/clients/${clientId}/appointments`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }

      const result = await response.json()
      setAppointments(result.data || [])
    } catch (error) {
      console.error('[useRealtimeAppointments] Error fetching appointments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAppointments()
  }, [clientId])

  // Listen for real-time updates
  useEffect(() => {
    if (!clientId) return

    const handleAppointmentUpdate = (event: CustomEvent) => {
      const { clientId: updatedClientId } = event.detail
      
      if (updatedClientId === clientId) {
        console.log('[useRealtimeAppointments] Appointment updated, refreshing...')
        fetchAppointments()
      }
    }

    window.addEventListener('appointment-updated' as any, handleAppointmentUpdate)

    return () => {
      window.removeEventListener('appointment-updated' as any, handleAppointmentUpdate)
    }
  }, [clientId])

  return { appointments, isLoading, refetch: fetchAppointments }
}
