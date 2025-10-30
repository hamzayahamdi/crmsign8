import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// GET /api/leads/[id] - Get a specific lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const leadId = resolvedParams.id
    
    // Verify JWT for role-based access
    const authHeader = request.headers.get('authorization')
    let user: { name: string; role: string } | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = verify(token, JWT_SECRET) as any
        user = { name: decoded.name, role: decoded.role }
      } catch (_) {
        user = null
      }
    }
    
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }
    
    // If architect, ensure the lead is assigned to them
    if (user?.role === 'architect' && lead.assignePar !== user.name) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
        { status: 500 }
    )
  }
}

// PUT /api/leads/[id] - Update a lead
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let body: any
  try {
    const resolvedParams = await Promise.resolve(params)
    const leadId = resolvedParams.id

    body = await request.json()

    // Verify JWT for update permissions
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    let user: { name: string; role: string } | null = null
    try {
      const decoded = verify(token, JWT_SECRET) as any
      user = { name: decoded.name, role: (decoded.role || '').toLowerCase() }
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Load existing lead for permission checks
    const existing = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    // Architects: can only update if assigned to them; cannot change assignment
    if (user?.role === 'architect') {
      if (existing.assignePar !== user.name) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    // Commercial: can only update their own leads
    if (user?.role === 'commercial') {
      if (existing.createdBy !== user.name && existing.commercialMagasin !== user.name) {
        return NextResponse.json({ error: 'Forbidden: You can only update your own leads' }, { status: 403 })
      }
    }
    // Admin and operator can update any lead; others forbidden
    if (user && user.role !== 'admin' && user.role !== 'operator' && user.role !== 'architect' && user.role !== 'commercial') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Handle converted lead status change - undo conversion if status changes from "converti"
    // Note: Client removal from localStorage will be handled on the client side
    // We just update the lead status here and log the change
    if (existing.statut === 'converti' && body.statut !== 'converti') {
      console.log(`[Lead Update] Lead ${leadId} status changed from 'converti' to '${body.statut}'. Conversion undone.`)
      console.log(`[Lead Update] Note: Associated client in localStorage should be removed by the client-side code.`)
    }
    
    // Build update data with only valid fields
    const updateData: any = {
      nom: body.nom,
      telephone: body.telephone,
      ville: body.ville,
      typeBien: body.typeBien,
      statut: body.statut,
      statutDetaille: body.statutDetaille || '',
      message: body.message || null,
      // Prevent architects and commercials from reassigning; keep existing assignment
      assignePar: (user?.role === 'architect' || user?.role === 'commercial') ? existing.assignePar : body.assignePar,
      source: body.source as any, // Cast to any to bypass enum validation
      priorite: body.priorite,
      derniereMaj: new Date(body.derniereMaj || new Date())
    }
    
    // Only include magasin fields if source is magasin
    if (body.source === 'magasin') {
      updateData.magasin = body.magasin || null
      updateData.commercialMagasin = body.commercialMagasin || null
    } else {
      // Clear magasin fields if source changed from magasin to something else
      updateData.magasin = null
      updateData.commercialMagasin = null
    }
    
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error updating lead:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    console.error('Body received:', body)
    return NextResponse.json(
      { error: 'Failed to update lead', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const leadId = resolvedParams.id
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }
    
    // Verify JWT and restrict delete to Admin only
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    try {
      const decoded = verify(token, JWT_SECRET) as any
      const role = (decoded.role || '').toLowerCase()
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
      }
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Delete the lead from database
    await prisma.lead.delete({
      where: { id: leadId }
    })
    
    console.log(`[Delete Lead] Lead ${leadId} deleted successfully`)
    
    return NextResponse.json({ 
      success: true,
      leadId: leadId,
      message: 'Lead supprimé avec succès'
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
