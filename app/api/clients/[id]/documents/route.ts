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

// POST /api/clients/[id]/documents - Add documents to a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const body = await request.json()

    console.log('[Add Documents] Request for client:', clientId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch current client
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      console.error('[Add Documents] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // 2. Create new document objects
    const now = new Date().toISOString()
    const documents = body.documents || []
    const newDocuments = documents.map((doc: any) => ({
      id: generateCuid(),
      name: doc.name,
      url: doc.url,
      type: doc.type || 'document',
      size: doc.size || 0,
      uploadedAt: now,
      uploadedBy: body.uploadedBy || 'Utilisateur'
    }))

    // 3. Update client with new documents
    const currentDocuments = client.documents || []
    const updatedDocuments = [...currentDocuments, ...newDocuments]

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        documents: updatedDocuments,
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('[Add Documents] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to add documents', details: updateError.message },
        { status: 500 }
      )
    }

    // 4. Create history entry
    await supabase
      .from('historique')
      .insert({
        id: generateCuid(),
        client_id: clientId,
        date: now,
        type: 'document',
        description: `${newDocuments.length} document(s) ajouté(s)`,
        auteur: body.uploadedBy || 'Utilisateur',
        created_at: now,
        updated_at: now
      })

    console.log('[Add Documents] ✅ Documents added successfully')

    return NextResponse.json({
      success: true,
      data: newDocuments,
      client: updatedClient
    })
  } catch (error: any) {
    console.error('[Add Documents] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/documents - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    console.log('[Delete Document] Request for client:', clientId, 'document:', documentId)

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

    // 2. Remove the document
    const now = new Date().toISOString()
    const currentDocuments = client.documents || []
    const updatedDocuments = currentDocuments.filter((d: any) => d.id !== documentId)

    // 3. Save to database
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        documents: updatedDocuments,
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('[Delete Document] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to delete document', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Delete Document] ✅ Document deleted successfully')

    return NextResponse.json({
      success: true,
      client: updatedClient
    })
  } catch (error: any) {
    console.error('[Delete Document] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
