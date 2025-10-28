import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// POST /api/leads/[id]/mark-not-interested - Mark lead as not interested
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
      user = { name: decoded.name, role: (decoded.role || '').toLowerCase() }
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
    
    // Check permissions - architects can only mark their own leads
    if (user?.role === 'architect' && lead.assignePar !== user.name) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Update lead status
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        statut: 'non_interesse',
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
    
    return NextResponse.json({
      success: true,
      lead: updatedLead,
      message: 'Statut mis à jour — Lead marqué comme non intéressé.'
    })
  } catch (error) {
    console.error('Error marking lead as not interested:', error)
    return NextResponse.json(
      { error: 'Failed to update lead status' },
      { status: 500 }
    )
  }
}
