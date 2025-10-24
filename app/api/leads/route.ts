import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// GET /api/leads - Fetch all leads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    // Fetch total count
    const totalCount = await prisma.lead.count()
    
    // Fetch leads - newest first
    const leads = await prisma.lead.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    const hasMore = (skip + leads.length) < totalCount
    
    console.log(`[API] Page ${page}: Fetched ${leads.length} leads, Total: ${totalCount}, HasMore: ${hasMore}`)
    
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
