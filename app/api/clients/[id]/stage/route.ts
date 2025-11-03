import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Log environment variables on module load
console.log('[STAGE API] Module loaded - Env vars:', {
  supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
  serviceKey: supabaseServiceKey ? 'SET' : 'MISSING'
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[POST /stage] Request received')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[POST /stage] Missing environment variables')
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      )
    }
    
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')
    
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { newStage, changedBy } = body

    if (!newStage || !changedBy) {
      return NextResponse.json(
        { error: 'newStage et changedBy sont requis' },
        { status: 400 }
      )
    }

    // Next.js 16: params is now async
    const { id: clientId } = await params
    console.log('[POST /stage] Client ID:', clientId)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date().toISOString()

    // 1. Get the current stage history for this client
    const { data: currentHistory, error: historyError } = await supabase
      .from('client_stage_history')
      .select('*')
      .eq('client_id', clientId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // 2. If there's an active stage, close it
    if (currentHistory && !historyError) {
      const startedAt = new Date(currentHistory.started_at)
      const endedAt = new Date(now)
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

      await supabase
        .from('client_stage_history')
        .update({
          ended_at: now,
          duration_seconds: durationSeconds,
          updated_at: now
        })
        .eq('id', currentHistory.id)
    }

    // 3. Create new stage history entry
    const crypto = require('crypto')
    const newId = crypto.randomUUID()
    
    const { data: newHistory, error: insertError } = await supabase
      .from('client_stage_history')
      .insert({
        id: newId,
        client_id: clientId,
        stage_name: newStage,
        started_at: now,
        ended_at: null,
        duration_seconds: null,
        changed_by: changedBy,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting stage history:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'historique' },
        { status: 500 }
      )
    }

    // 4. Update the historique table for timeline tracking
    await supabase
      .from('historique')
      .insert({
        client_id: clientId,
        date: now,
        type: 'statut',
        description: `Statut changé vers: ${newStage}`,
        auteur: changedBy,
        previous_status: currentHistory?.stage_name || null,
        new_status: newStage,
        timestamp_start: now,
        created_at: now,
        updated_at: now
      })

    // 5. Trigger realtime broadcast (Supabase Realtime will handle this automatically)
    // The client will subscribe to changes on client_stage_history table

    return NextResponse.json({
      success: true,
      data: newHistory,
      previousStage: currentHistory?.stage_name || null
    })

  } catch (error) {
    console.error('Error updating client stage:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[GET /stage] ===== START =====')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[GET /stage] Missing environment variables!')
      return NextResponse.json(
        { error: 'Configuration serveur manquante', details: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }
    
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')
    
    if (!authCookie) {
      console.log('[GET /stage] No auth cookie found')
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Next.js 16: params is now async
    const { id: clientId } = await params
    console.log('[GET /stage] Client ID:', clientId)
    console.log('[GET /stage] Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('[GET /stage] Service Key:', supabaseServiceKey ? `SET (${supabaseServiceKey.substring(0, 20)}...)` : 'MISSING')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all stage history for this client
    const { data: history, error } = await supabase
      .from('client_stage_history')
      .select('*')
      .eq('client_id', clientId)
      .order('started_at', { ascending: false })

    console.log('[GET /stage] Query result:', {
      clientId,
      found: history?.length || 0,
      error: error?.message || null,
      errorDetails: error || null,
      rawData: history ? `${history.length} entries` : 'null',
      firstEntry: history?.[0] || null
    })

    if (error) {
      console.error('[GET /stage] ERROR:', error)
      console.error('[GET /stage] Error code:', error.code)
      console.error('[GET /stage] Error details:', error.details)
      console.error('[GET /stage] Error hint:', error.hint)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'historique', details: error.message },
        { status: 500 }
      )
    }

    // Transform snake_case to camelCase for frontend
    const transformedHistory = history?.map(entry => ({
      id: entry.id,
      clientId: entry.client_id,
      stageName: entry.stage_name,
      startedAt: entry.started_at,
      endedAt: entry.ended_at,
      durationSeconds: entry.duration_seconds,
      changedBy: entry.changed_by,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at
    })) || []

    console.log('[GET /stage] Returning data:', {
      count: transformedHistory.length,
      sample: transformedHistory[0] || null
    })
    console.log('[GET /stage] ===== END =====')

    return NextResponse.json({
      success: true,
      data: transformedHistory
    })

  } catch (error) {
    console.error('Error fetching stage history:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
