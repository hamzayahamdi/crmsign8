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

    // Create new note object
    const now = new Date()
    const newNote = {
      id: generateCuid(),
      content: body.content || body.note || '',
      createdAt: now.toISOString(),
      createdBy: authorName,
      type: body.type || 'note'
    }

    // Parse existing notes (could be string or JSON array)
    let currentNotes: any[] = []
    if (contact.notes) {
      try {
        if (typeof contact.notes === 'string') {
          // Try to parse as JSON
          const parsed = JSON.parse(contact.notes)
          currentNotes = Array.isArray(parsed) ? parsed : []
        } else if (Array.isArray(contact.notes)) {
          currentNotes = contact.notes
        }
      } catch (e) {
        // If parsing fails, treat as old single note format
        // Convert to new format
        if (contact.notes.trim()) {
          currentNotes = [{
            id: generateCuid(),
            content: contact.notes,
            createdAt: contact.createdAt.toISOString(),
            createdBy: contact.createdBy,
            type: 'note'
          }]
        }
      }
    }

    // Add new note at the beginning
    const updatedNotes = [newNote, ...currentNotes]

    // Update contact with new notes array
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        notes: JSON.stringify(updatedNotes),
        updatedAt: now,
      },
    })

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

    console.log('[Add Contact Note] ✅ Note added successfully')

    return NextResponse.json({
      success: true,
      data: newNote,
      contact: updatedContact
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

    // Parse existing notes
    let currentNotes: any[] = []
    if (contact.notes) {
      try {
        if (typeof contact.notes === 'string') {
          const parsed = JSON.parse(contact.notes)
          currentNotes = Array.isArray(parsed) ? parsed : []
        } else if (Array.isArray(contact.notes)) {
          currentNotes = contact.notes
        }
      } catch (e) {
        // If it's a plain string, convert to array format
        if (contact.notes.trim()) {
          currentNotes = [{
            id: generateCuid(),
            content: contact.notes,
            createdAt: contact.createdAt.toISOString(),
            createdBy: contact.createdBy,
            type: 'note'
          }]
        }
      }
    }

    // Remove the note
    const updatedNotes = currentNotes.filter((n: any) => n.id !== noteId)

    // Update contact
    const now = new Date()
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        notes: updatedNotes.length > 0 ? JSON.stringify(updatedNotes) : null,
        updatedAt: now,
      },
    })

    console.log('[Delete Contact Note] ✅ Note deleted successfully')

    return NextResponse.json({
      success: true,
      contact: updatedContact
    })
  } catch (error: any) {
    console.error('[Delete Contact Note] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}





