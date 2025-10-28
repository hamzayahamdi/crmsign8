import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// POST /api/leads/[id]/convert - Convert lead to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const leadId = resolvedParams.id
    
    // Verify JWT - Admin only
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
    
    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    // Check if already converted
    if (lead.statut === 'converti') {
      return NextResponse.json({ 
        error: 'Lead already converted',
        message: 'Ce lead a déjà été converti en client'
      }, { status: 400 })
    }
    
    // Update lead status to converted
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        statut: 'converti',
        derniereMaj: new Date()
      },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    // Create client object from lead data
    const now = new Date().toISOString()
    const newClient = {
      id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nom: lead.nom,
      telephone: lead.telephone,
      email: '', // Will be filled in client management
      ville: lead.ville,
      typeProjet: lead.typeBien,
      statutProjet: 'prospection' as const,
      architecteAssigne: lead.assignePar,
      budget: '',
      surface: '',
      adresse: '',
      notes: lead.message || '',
      createdAt: now,
      updatedAt: now,
      derniereMaj: now,
      leadId: lead.id, // Link back to original lead
    }
    
    return NextResponse.json({
      success: true,
      lead: updatedLead,
      client: newClient,
      message: 'Lead converti avec succès en client. Vous pouvez désormais le suivre dans Clients & Projets.'
    })
  } catch (error) {
    console.error('Error converting lead:', error)
    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    )
  }
}
