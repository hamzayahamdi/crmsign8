import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { StageHistoryEntry } from '@/lib/stage-duration-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Hook to fetch and subscribe to stage history updates for a client
 */
export function useStageHistory(clientId: string) {
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Only create Supabase client if credentials are available (for realtime)
    const supabase = supabaseUrl && supabaseAnonKey 
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null

    // Fetch initial data
    const fetchStageHistory = async () => {
      try {
        console.log('[useStageHistory] Fetching for client:', clientId)
        const response = await fetch(`/api/clients/${clientId}/stage`, {
          credentials: 'include'
        })
        
        console.log('[useStageHistory] Response status:', response.status)
        
        if (response.ok) {
          const result = await response.json()
          console.log('[useStageHistory] Data received:', result)
          setStageHistory(result.data || [])
        } else {
          const errorText = await response.text()
          console.error('[useStageHistory] Error response:', response.status, errorText)
          throw new Error(`Failed to fetch stage history: ${response.status}`)
        }
      } catch (err) {
        console.error('[useStageHistory] Error fetching stage history:', err)
        setError(err as Error)
        setStageHistory([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStageHistory()

    // Subscribe to realtime updates (only if Supabase client is available)
    if (supabase) {
      const channel = supabase
        .channel(`client_stage_history:${clientId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_stage_history',
            filter: `client_id=eq.${clientId}`
          },
          (payload) => {
            console.log('Stage history update:', payload)
            
            if (payload.eventType === 'INSERT') {
              setStageHistory(prev => [payload.new as StageHistoryEntry, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              setStageHistory(prev => 
                prev.map(entry => 
                  entry.id === payload.new.id ? payload.new as StageHistoryEntry : entry
                )
              )
            } else if (payload.eventType === 'DELETE') {
              setStageHistory(prev => 
                prev.filter(entry => entry.id !== payload.old.id)
              )
            }
          }
        )
        .subscribe()

      // Cleanup subscription
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [clientId])

  return { stageHistory, isLoading, error }
}
