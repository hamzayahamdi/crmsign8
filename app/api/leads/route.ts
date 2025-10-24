import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// GET /api/leads - Fetch all leads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    // Read and verify JWT (optional but used for role-based filtering)
    const authHeader = request.headers.get('authorization')
    let user: { userId: string; email: string; name: string; role: string } | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = verify(token, JWT_SECRET) as any
        user = {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
        }
      } catch (_) {
        // If token invalid, proceed without user (no filtering). You may choose to return 401 if strict auth is desired.
        user = null
      }
    }
    
    // Build where clause based on role
    const where: any = {}
    if (user?.role === 'architect') {
      // Filter by assigned name
      where.assignePar = user.name
    }
    
    // Fetch total count (respecting role filter)
    const totalCount = await prisma.lead.count({ where })
    
    // Fetch leads - newest first
    const leads = await prisma.lead.findMany({
      skip,
      take: limit,
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    const hasMore = (skip + leads.length) < totalCount
    
    console.log(`[API] Page ${page}: Fetched ${leads.length} leads, Total: ${totalCount}, HasMore: ${hasMore}${user ? `, Role: ${user.role}` : ''}`)
    
    return NextResponse.json({
      success: true,
      data: leads,
      totalCount,
      hasMore
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
  } catch (error) {
    console.error('[API] Error fetching leads:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch leads',
      data: [],
      totalCount: 0
    }, { status: 500 })
  }
}

// POST /api/leads - Create new lead
export async function POST(request: NextRequest) {
  try {
    // Auth: only Admin can create leads
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    let role = ''
    try {
      const decoded = verify(token, JWT_SECRET) as any
      role = (decoded.role || '').toLowerCase()
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
    }

    const body = await request.json()
    
    const lead = await prisma.lead.create({
      data: {
        nom: body.nom,
        telephone: body.telephone,
        ville: body.ville,
        typeBien: body.typeBien,
        statut: body.statut,
        statutDetaille: body.statutDetaille,
        assignePar: body.assignePar,
        source: body.source,
        priorite: body.priorite,
        derniereMaj: new Date()
      }
    })
    
    console.log('[API] Created lead:', lead.id)
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
