import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { ProjectStatus } from '@/types/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Hook to listen for real-time stage changes from the database
 * This completely avoids localStorage and provides instant cross-tab sync
 */
export function useRealtimeStageSync(clientId: string | null) {
  const [currentStage, setCurrentStage] = useState<ProjectStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!clientId || !supabaseUrl || !supabaseAnonKey) {
      setIsLoading(false)
      return
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch initial stage
    const fetchInitialStage = async () => {
      try {
        const { data, error } = await supabase
          .from('client_stage_history')
          .select('*')
          .eq('client_id', clientId)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          console.error('[Realtime Stage] Error fetching initial stage:', error)
        } else if (data) {
          setCurrentStage(data.stage_name as ProjectStatus)
          console.log(`[Realtime Stage] Initial stage for ${clientId}: ${data.stage_name}`)
        }
      } catch (error) {
        console.error('[Realtime Stage] Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialStage()

    // Subscribe to real-time changes
    console.log(`[Realtime Stage] Subscribing to changes for client ${clientId}`)
    
    const channel = supabase
      .channel(`client-stage-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_stage_history',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          console.log('[Realtime Stage] Change detected:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newStage = payload.new as any
            if (!newStage.ended_at) {
              console.log(`[Realtime Stage] Stage changed to: ${newStage.stage_name}`)
              setCurrentStage(newStage.stage_name as ProjectStatus)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedStage = payload.new as any
            if (!updatedStage.ended_at) {
              console.log(`[Realtime Stage] Stage updated to: ${updatedStage.stage_name}`)
              setCurrentStage(updatedStage.stage_name as ProjectStatus)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime Stage] Subscription status: ${status}`)
      })

    // Cleanup
    return () => {
      console.log(`[Realtime Stage] Unsubscribing from client ${clientId}`)
      supabase.removeChannel(channel)
    }
  }, [clientId])

  return { currentStage, isLoading }
}
