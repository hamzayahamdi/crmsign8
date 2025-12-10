"use server"

import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/database'

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

    // Get all notes for this contact from unified Note table
    const unifiedNotes = await prisma.note.findMany({
      where: {
        entityType: 'contact',
        entityId: contactId,
      },
      orderBy: { createdAt: 'desc' }, // Newest first
    })

    // Format notes for frontend
    const formattedNotes = unifiedNotes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      createdBy: note.author,
      type: note.sourceType === 'lead' ? 'lead_note' : 'note',
      source: note.sourceType || 'contact',
      sourceId: note.sourceId,
    }))

    return NextResponse.json(formattedNotes)
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
