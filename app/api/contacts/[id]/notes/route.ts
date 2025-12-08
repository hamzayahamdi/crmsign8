"use server"

import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/database'
import { randomBytes } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Generate CUID-like ID
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
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

    console.log('[Add Contact Note] Request for contact:', contactId)

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

    console.log('[Add Contact Note] ✅ Note added successfully to unified table')

    return NextResponse.json({
      success: true,
      data: formattedNote,
    })
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

    console.log('[Delete Contact Note] Request for contact:', contactId, 'note:', noteId)

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

    // Check if this is a legacy note ID (doesn't exist in unified table)
    if (noteId.startsWith('legacy-')) {
      console.log('[Delete Contact Note] Legacy note ID detected, removing from contact.notes field')
      
      // Legacy notes are stored in contact.notes JSON field
      // We need to parse, filter, and update the contact.notes field
      try {
        let notesArray: any[] = []
        
        if ((contact as any).notes) {
          if (typeof (contact as any).notes === 'string') {
            try {
              const parsed = JSON.parse((contact as any).notes)
              notesArray = Array.isArray(parsed) ? parsed : []
            } catch (e) {
              // Not valid JSON, might be plain string - convert to array
              if (typeof (contact as any).notes === 'string' && (contact as any).notes.trim()) {
                notesArray = [{
                  id: `legacy-${Date.now()}`,
                  content: (contact as any).notes,
                  createdAt: (contact as any).createdAt,
                  createdBy: (contact as any).createdBy || 'unknown',
                }]
              }
            }
          } else if (Array.isArray((contact as any).notes)) {
            notesArray = (contact as any).notes
          }
        }

        // Remove the note with matching ID
        const originalLength = notesArray.length
        notesArray = notesArray.filter((n: any) => n.id !== noteId)
        
        if (notesArray.length === originalLength) {
          console.warn('[Delete Contact Note] Legacy note ID not found in contact.notes array')
          // Note not found, but return success anyway (might have been already deleted)
          return NextResponse.json({
            success: true,
            message: 'Legacy note removed (was not in database)',
          })
        }

        // Update contact with filtered notes
        await prisma.contact.update({
          where: { id: contactId },
          data: {
            notes: notesArray.length > 0 ? JSON.stringify(notesArray) : null,
          },
        })

        console.log('[Delete Contact Note] ✅ Legacy note removed from contact.notes field')
        return NextResponse.json({
          success: true,
          message: 'Legacy note removed successfully',
        })
      } catch (error: any) {
        console.error('[Delete Contact Note] Error removing legacy note:', error)
        return NextResponse.json(
          { error: 'Failed to remove legacy note', details: error.message },
          { status: 500 }
        )
      }
    }

    // Check if note exists in unified table
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    })

    if (!note) {
      console.error('[Delete Contact Note] Note not found in unified table:', noteId)
      console.log('[Delete Contact Note] Note ID format:', noteId, 'Length:', noteId.length, 'Starts with legacy?:', noteId.startsWith('legacy-'))
      
      // Try to find and remove from legacy notes if it exists there
      try {
        let notesArray: any[] = []
        
        if ((contact as any).notes) {
          if (typeof (contact as any).notes === 'string') {
            try {
              const parsed = JSON.parse((contact as any).notes)
              notesArray = Array.isArray(parsed) ? parsed : []
              console.log('[Delete Contact Note] Found', notesArray.length, 'legacy notes in contact.notes field')
            } catch (e) {
              // Not valid JSON
              notesArray = []
              console.log('[Delete Contact Note] contact.notes is not valid JSON')
            }
          } else if (Array.isArray((contact as any).notes)) {
            notesArray = (contact as any).notes
            console.log('[Delete Contact Note] Found', notesArray.length, 'legacy notes (already array)')
          }
        } else {
          console.log('[Delete Contact Note] contact.notes field is empty or null')
        }

        // Try to find note by matching the ID (might be a different format)
        const noteIndex = notesArray.findIndex((n: any) => {
          const matches = n.id === noteId
          if (matches) {
            console.log('[Delete Contact Note] Found matching note in legacy array:', n)
          }
          return matches
        })
        
        if (noteIndex !== -1) {
          // Found in legacy notes, remove it
          const removedNote = notesArray.splice(noteIndex, 1)[0]
          console.log('[Delete Contact Note] Removed note from legacy array:', removedNote)
          
          await prisma.contact.update({
            where: { id: contactId },
            data: {
              notes: notesArray.length > 0 ? JSON.stringify(notesArray) : null,
            },
          })

          console.log('[Delete Contact Note] ✅ Note found and removed from legacy contact.notes field')
          return NextResponse.json({
            success: true,
            message: 'Note removed from legacy notes successfully',
          })
        } else {
          console.log('[Delete Contact Note] Note ID not found in legacy notes array. Available IDs:', notesArray.map((n: any) => n.id))
        }
      } catch (legacyError: any) {
        console.error('[Delete Contact Note] Error checking legacy notes:', legacyError)
        console.error('[Delete Contact Note] Error details:', legacyError.message, legacyError.stack)
      }
      
      // If we get here, the note truly doesn't exist
      // Return success anyway to prevent UI errors, but log the issue
      console.warn('[Delete Contact Note] ⚠️ Note not found in unified table or legacy notes. Returning success to prevent UI error.')
      return NextResponse.json({
        success: true,
        message: 'Note not found (may have been already deleted)',
        warning: 'Note ID not found in database',
      })
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

    // Use a transaction to delete the note and related timeline entries
    const deletedCount = await prisma.$transaction(async (tx) => {
      // Delete related timeline entries that match this note
      // Timeline entries with eventType 'note_added' and matching description
      const timelineDeleteResult = await tx.timeline.deleteMany({
        where: {
          contactId: contactId,
          eventType: 'note_added',
          description: note.content,
        },
      })

      console.log(`[Delete Contact Note] Deleted ${timelineDeleteResult.count} related timeline entries`)

      // Delete note from unified table
      const deletedNote = await tx.note.delete({
        where: { id: noteId },
      })

      console.log('[Delete Contact Note] ✅ Note deleted successfully from unified table:', deletedNote.id)

      // Verify deletion by trying to find the note (should return null)
      const verifyNote = await tx.note.findUnique({
        where: { id: noteId },
      })

      if (verifyNote) {
        throw new Error('Note deletion verification failed - note still exists in database')
      }

      return timelineDeleteResult.count
    })

    console.log(`[Delete Contact Note] ✅ Transaction completed. Deleted note ${noteId} and ${deletedCount} timeline entries`)

    return NextResponse.json({
      success: true,
      message: 'Note and related history deleted successfully',
      deletedNoteId: noteId,
      deletedTimelineEntries: deletedCount,
    })
  } catch (error: any) {
    console.error('[Delete Contact Note] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}








