import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const clientId = 'client-issam-tester-2025'
    
    console.log('=== DEBUG STAGE HISTORY API ===')
    console.log('Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('Service Key:', supabaseServiceKey ? 'SET (length: ' + supabaseServiceKey.length + ')' : 'MISSING')
    console.log('Client ID:', clientId)
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        serviceKey: !!supabaseServiceKey
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Test 1: Count all entries
    console.log('\n[Test 1] Counting all entries...')
    const { count, error: countError } = await supabase
      .from('client_stage_history')
      .select('*', { count: 'exact', head: true })

    console.log('Count result:', count, 'Error:', countError?.message || 'none')

    // Test 2: Get entries for specific client
    console.log('\n[Test 2] Fetching entries for client:', clientId)
    const { data: history, error } = await supabase
      .from('client_stage_history')
      .select('*')
      .eq('client_id', clientId)
      .order('started_at', { ascending: false })

    console.log('Query result:', {
      found: history?.length || 0,
      error: error?.message || null,
      firstEntry: history?.[0] || null
    })

    // Test 3: Try without filter
    console.log('\n[Test 3] Fetching all entries (no filter)...')
    const { data: allHistory, error: allError } = await supabase
      .from('client_stage_history')
      .select('*')
      .limit(5)

    console.log('All entries result:', {
      found: allHistory?.length || 0,
      error: allError?.message || null
    })

    return NextResponse.json({
      success: true,
      debug: {
        envVarsSet: {
          supabaseUrl: !!supabaseUrl,
          serviceKey: !!supabaseServiceKey
        },
        totalCount: count,
        clientSpecific: {
          clientId,
          found: history?.length || 0,
          error: error?.message || null,
          data: history || []
        },
        allEntries: {
          found: allHistory?.length || 0,
          error: allError?.message || null,
          sample: allHistory?.[0] || null
        }
      }
    })

  } catch (error: any) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
