import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// GET /api/leads/[id]/notes - Get all notes for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const leadId = resolvedParams.id

    const notes = await prisma.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' }
    })

    // Map author IDs to human-readable user names (handles legacy data where author might be a userId)
    const uniqueAuthors = Array.from(
      new Set(notes.map(n => n.author).filter(Boolean) as string[])
    )
    const possibleIds = uniqueAuthors.filter(a => a.length > 20)

    let authorNameMap: Record<string, string> = {}
    if (possibleIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: possibleIds } },
        select: { id: true, name: true }
      })
      authorNameMap = users.reduce<Record<string, string>>((acc, u) => {
        acc[u.id] = u.name
        return acc
      }, {})
    }

    const enhancedNotes = notes.map(n => ({
      ...n,
      author: authorNameMap[n.author] || n.author
    }))

    return NextResponse.json(enhancedNotes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST /api/leads/[id]/notes - Add a note to a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const leadId = resolvedParams.id
    
    // Verify JWT
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    let decoded: any
    try {
      decoded = verify(token, JWT_SECRET) as any
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()

    // Resolve author name from database when possible for consistent display
    let authorName = 'Utilisateur'
    try {
      if (decoded.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { name: true }
        })
        authorName = dbUser?.name || decoded.name || 'Utilisateur'
      } else if (decoded.name) {
        authorName = decoded.name
      }
    } catch (e) {
      console.warn('[Lead Notes] Failed to resolve user from database, falling back to token name')
      authorName = decoded?.name || 'Utilisateur'
    }

    const note = await prisma.leadNote.create({
      data: {
        leadId,
        content: body.content,
        author: authorName
      }
    })
    
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}
