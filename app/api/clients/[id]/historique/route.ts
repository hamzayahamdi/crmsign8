import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Generate CUID-like ID
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// POST /api/clients/[id]/historique - Add a historique entry (note, activity, etc.)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const body = await request.json()

    console.log('[Add Historique] Request for client:', clientId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify client exists
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      console.error('[Add Historique] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // 2. Create historique entry
    const now = new Date().toISOString()
    const { data: newHistorique, error: insertError } = await supabase
      .from('historique')
      .insert({
        id: generateCuid(),
        client_id: clientId,
        date: now,
        type: body.type || 'note',
        description: body.description || '',
        auteur: body.auteur || 'Utilisateur',
        previous_status: body.previousStatus || null,
        new_status: body.newStatus || null,
        duration_in_hours: body.durationInHours || null,
        timestamp_start: body.timestampStart || null,
        timestamp_end: body.timestampEnd || null,
        metadata: body.metadata || null,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (insertError || !newHistorique) {
      console.error('[Add Historique] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create historique entry', details: insertError?.message },
        { status: 500 }
      )
    }

    // 3. Update client's derniere_maj
    await supabase
      .from('clients')
      .update({
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)

    console.log('[Add Historique] ✅ Historique entry created:', newHistorique.id)

    // Transform to frontend format
    const transformedHistorique = {
      id: newHistorique.id,
      date: newHistorique.date,
      type: newHistorique.type,
      description: newHistorique.description,
      auteur: newHistorique.auteur,
      previousStatus: newHistorique.previous_status,
      newStatus: newHistorique.new_status,
      durationInHours: newHistorique.duration_in_hours,
      timestampStart: newHistorique.timestamp_start,
      timestampEnd: newHistorique.timestamp_end,
      metadata: newHistorique.metadata
    }

    return NextResponse.json({
      success: true,
      data: transformedHistorique
    })
  } catch (error: any) {
    console.error('[Add Historique] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/historique - Delete a historique entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const historiqueId = searchParams.get('historiqueId')

    if (!historiqueId) {
      return NextResponse.json(
        { error: 'Historique ID is required' },
        { status: 400 }
      )
    }

    console.log('[Delete Historique] Request for client:', clientId, 'historique:', historiqueId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Delete historique entry
    const { error: deleteError } = await supabase
      .from('historique')
      .delete()
      .eq('id', historiqueId)
      .eq('client_id', clientId)

    if (deleteError) {
      console.error('[Delete Historique] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete historique entry', details: deleteError.message },
        { status: 500 }
      )
    }

    // 2. Update client's derniere_maj
    const now = new Date().toISOString()
    await supabase
      .from('clients')
      .update({
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)

    console.log('[Delete Historique] ✅ Historique entry deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Historique entry deleted successfully'
    })
  } catch (error: any) {
    console.error('[Delete Historique] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
