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

// POST /api/clients/[id]/notes - Add a note to a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const body = await request.json()

    console.log('[Add Note] Request for client:', clientId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch current client
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      console.error('[Add Note] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // 2. Create new note object
    const now = new Date().toISOString()
    const newNote = {
      id: generateCuid(),
      content: body.content || body.note || '',
      createdAt: now,
      createdBy: body.createdBy || 'Utilisateur',
      type: body.type || 'note'
    }

    // 3. Update client with new note
    const currentNotes = client.notes || []
    const updatedNotes = [newNote, ...currentNotes]

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        notes: updatedNotes,
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('[Add Note] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to add note', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Add Note] ✅ Note added successfully')

    return NextResponse.json({
      success: true,
      data: newNote,
      client: updatedClient
    })
  } catch (error: any) {
    console.error('[Add Note] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/notes - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      )
    }

    console.log('[Delete Note] Request for client:', clientId, 'note:', noteId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch current client
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // 2. Remove the note
    const now = new Date().toISOString()
    const currentNotes = client.notes || []
    const updatedNotes = currentNotes.filter((n: any) => n.id !== noteId)

    // 3. Save to database
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        notes: updatedNotes,
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('[Delete Note] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to delete note', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Delete Note] ✅ Note deleted successfully')

    return NextResponse.json({
      success: true,
      client: updatedClient
    })
  } catch (error: any) {
    console.error('[Delete Note] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
