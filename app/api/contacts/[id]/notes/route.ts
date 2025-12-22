"use server"

import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// GET /api/contacts/[id]/notes - Get all notes for a contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    try {
      verify(token, JWT_SECRET) as any
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const contactId = resolvedParams.id

    // First, get the contact to check if it has a leadId
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { leadId: true },
    })

    // Get all notes for this contact from unified Note table
    // Include both contact notes and lead notes (if contact was converted from lead)
    const noteConditions: any[] = [
      {
        entityType: 'contact',
        entityId: contactId,
      }
    ]

    // If contact was converted from a lead, also fetch lead notes
    if (contact?.leadId) {
      noteConditions.push({
        entityType: 'lead',
        entityId: contact.leadId,
      })
    }

    const unifiedNotes = await prisma.note.findMany({
      where: {
        OR: noteConditions,
      },
      orderBy: { createdAt: 'desc' }, // Newest first
    })

    // Filter out system-generated notes - only show manually added notes
    const systemNotePatterns = [
      /^Lead créé par/i,
      /statut.*mis à jour/i,
      /déplacé/i,
      /mouvement/i,
      /Note de campagne/i,
      /^📝 Note de campagne/i,
      /Architecte assigné/i,
      /Gestionnaire assigné/i,
      /Opportunité créée/i,
      /Contact converti en Client/i,
      /Contact créé depuis Lead/i,
      /Statut changé/i,
      /Statut Lead mis à jour/i,
      /^✉️ Message WhatsApp envoyé/i,
      /^📅 Nouveau rendez-vous/i,
      /^✅ Statut mis à jour/i,
      /^Note ajoutée$/i, // Exclude timeline events with just "Note ajoutée"
      /^Note ajoutée \(Opportunité\)$/i, // Exclude timeline entries for opportunity notes
    ];

    const userNotes = unifiedNotes.filter(note => {
      const content = note.content.trim();
      // Exclude empty notes
      if (!content) return false;
      // Exclude notes that are just "Note ajoutée"
      if (content === 'Note ajoutée' || content.toLowerCase() === 'note ajoutée') return false;
      // Exclude system-generated notes
      return !systemNotePatterns.some(pattern => pattern.test(content));
    });

    // Also fetch client notes from historique if contact has been converted to client
    // Optimized: Only fetch if we have Supabase credentials and do it in parallel
    let clientNotes: any[] = []
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Find all clients related to this contact - optimized query
        const { data: clientsWithCompositeId } = await supabase
          .from('clients')
          .select('id')
          .like('id', `${contactId}-%`)
          .limit(10) // Limit to prevent excessive queries
        
        const clientIds: string[] = []
        if (clientsWithCompositeId) {
          clientIds.push(...clientsWithCompositeId.map(c => c.id))
        }
        
        // Fetch notes from client historique - optimized with limit
        if (clientIds.length > 0) {
          const { data: historiqueData } = await supabase
            .from('historique')
            .select('id, description, date, auteur, type, metadata')
            .in('client_id', clientIds)
            .eq('type', 'note')
            .order('date', { ascending: false })
            .limit(100) // Limit to most recent 100 notes for performance
        
          if (historiqueData) {
            // Filter out system-generated notes - use same patterns
            clientNotes = historiqueData
              .filter((h: any) => {
                const content = (h.description || '').trim()
                if (!content || content.length < 2) return false
                if (content === 'Note ajoutée' || content.toLowerCase() === 'note ajoutée') return false
                return !systemNotePatterns.some(pattern => pattern.test(content))
              })
              .map((h: any) => {
                const description = h.description || '';
                const isOpportunityNote = description.trim().startsWith('[Opportunité:');
                
                return {
                  id: `client-note-${h.id}`,
                  content: h.description,
                  createdAt: h.date || h.created_at,
                  createdBy: h.auteur,
                  type: 'note',
                  source: h.metadata?.source || 'client',
                  sourceType: 'client',
                  // Include metadata from historique if available
                  metadata: h.metadata || (isOpportunityNote ? {
                    source: 'opportunity',
                    isOpportunityNote: true,
                    opportunityId: h.metadata?.opportunityId,
                  } : undefined),
                };
              })
          }
        }
      } catch (error) {
        console.error('[Get Contact Notes] Error fetching client notes:', error)
        // Don't fail the entire request if client notes fail
      }
    }

    // Format notes for frontend - only manually added notes
    // Also check if note content indicates it's an opportunity note
    const formattedNotes = userNotes.map((note) => {
      const content = note.content || '';
      const isOpportunityNote = content.trim().startsWith('[Opportunité:');
      
      return {
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        createdBy: note.author,
        type: note.sourceType === 'lead' ? 'lead_note' : 'note',
        source: note.sourceType || 'contact',
        sourceType: note.sourceType || 'contact',
        sourceId: note.sourceId,
        // Add metadata to help identify opportunity notes
        metadata: isOpportunityNote ? {
          source: 'opportunity',
          isOpportunityNote: true,
        } : undefined,
      };
    })

    // Combine unified notes with client notes, deduplicate, and sort
    const allNotes = [...formattedNotes, ...clientNotes]
      .filter((note, index, self) => {
        // Deduplicate by content + author + date
        const noteKey = `${(note.content || '').trim().toLowerCase()}|${note.createdBy}|${new Date(note.createdAt).setSeconds(0, 0)}`
        return index === self.findIndex((n: any) => {
          const nKey = `${(n.content || '').trim().toLowerCase()}|${n.createdBy}|${new Date(n.createdAt).setSeconds(0, 0)}`
          return nKey === noteKey
        })
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(allNotes)
  } catch (error: any) {
    console.error('[Get Contact Notes] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/contacts/[id]/notes - Add a note to a contact
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    let decoded: any
    try {
      decoded = verify(token, JWT_SECRET) as any
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const contactId = resolvedParams.id
    const body = await request.json()

    // Fetch current contact
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Get current user name
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })
    const authorName = user?.name || 'Utilisateur'

    // Create note in unified Note table
    const now = new Date()
    const newNote = await prisma.note.create({
      data: {
        content: body.content || body.note || '',
        author: authorName,
        authorId: decoded.userId,
        entityType: 'contact',
        entityId: contactId,
        sourceType: 'contact',
        sourceId: contactId,
        createdAt: now,
      },
    })

    // Format note for response
    const formattedNote = {
      id: newNote.id,
      content: newNote.content,
      createdAt: newNote.createdAt.toISOString(),
      createdBy: newNote.author,
      type: 'note',
      source: 'contact',
    }

    // Create timeline entry
    await prisma.timeline.create({
      data: {
        contactId: contactId,
        eventType: 'note_added',
        title: 'Note ajoutée',
        description: newNote.content,
        author: decoded.userId,
      },
    })

    return NextResponse.json(formattedNote)
  } catch (error: any) {
    console.error('[Add Contact Note] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts/[id]/notes - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    try {
      verify(token, JWT_SECRET) as any
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const contactId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      )
    }

    // Fetch current contact
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Check if note exists in unified table
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of lead notes (historical records)
    if (note.sourceType === 'lead') {
      return NextResponse.json(
        { error: 'Cannot delete lead notes. They are historical records.' },
        { status: 403 }
      )
    }

    // Only allow deletion if note belongs to this contact
    if (note.entityType !== 'contact' || note.entityId !== contactId) {
      return NextResponse.json(
        { error: 'Note does not belong to this contact' },
        { status: 403 }
      )
    }

    // Delete the note
    await prisma.note.delete({
      where: { id: noteId },
    })

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    })
  } catch (error: any) {
    console.error('[Delete Contact Note] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
