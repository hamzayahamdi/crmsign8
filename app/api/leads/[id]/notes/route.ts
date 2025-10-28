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
    
    return NextResponse.json(notes)
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
    let user: { name: string; role: string } | null = null
    try {
      const decoded = verify(token, JWT_SECRET) as any
      user = { name: decoded.name, role: decoded.role }
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const note = await prisma.leadNote.create({
      data: {
        leadId,
        content: body.content,
        author: user.name
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
