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
    let user: { name: string; role: string; magasin?: string } | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = verify(token, JWT_SECRET) as any
        user = { name: decoded.name, role: decoded.role, magasin: decoded.magasin }
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

    // If architect, ensure the lead is assigned to them (case-insensitive)
    if (user?.role === 'architect' && (lead.assignePar || '').trim().toLowerCase() !== (user.name || '').trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Automatically fix magasin leads that have "moyenne" priority
    if (lead.source === 'magasin' && lead.priorite === 'moyenne') {
      console.log(`[API] Fixing lead ${lead.id} (${lead.nom}) - changing priority from moyenne to haute`)
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: { priorite: 'haute' },
        include: {
          notes: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      })
      return NextResponse.json(updatedLead)
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
    let user: { name: string; role: string; magasin?: string } | null = null
    try {
      const decoded = verify(token, JWT_SECRET) as any
      user = { name: decoded.name, role: (decoded.role || '').toLowerCase(), magasin: decoded.magasin }
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
      const existingAssignee = (existing.assignePar || '').trim().toLowerCase()
      const userName = (user.name || '').trim().toLowerCase()
      if (existingAssignee !== userName) {
        console.log(`[Lead Update] Permission denied: Lead assigned to "${existing.assignePar}" but user is "${user.name}"`)
        return NextResponse.json({ error: 'Forbidden: You can only update leads assigned to you' }, { status: 403 })
      }
    }
    // Commercial: can only update their own leads
    if (user?.role === 'commercial') {
      if (existing.createdBy !== user.name && existing.commercialMagasin !== user.name) {
        return NextResponse.json({ error: 'Forbidden: You can only update your own leads' }, { status: 403 })
      }
    }
    // Magasiner: can update leads they created or that belong to their magasin
    if (user?.role === 'magasiner') {
      const sameCreator = existing.createdBy === user.name || existing.commercialMagasin === user.name
      const sameMagasin = !!user.magasin && existing.magasin?.toLowerCase() === user.magasin.toLowerCase()
      if (!(sameCreator || sameMagasin)) {
        return NextResponse.json({ error: 'Forbidden: You can only update leads in your magasin or created by you' }, { status: 403 })
      }
    }
    // Admin, operator, and gestionnaire can update any lead; others forbidden
    if (user && !['admin', 'operator', 'gestionnaire', 'architect', 'commercial', 'magasiner'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle converted lead status change - undo conversion if status changes from "qualifie"
    if (existing.statut === 'qualifie' && body.statut !== 'qualifie') {
      console.log(`[Lead Update] Lead ${leadId} status changed from 'qualifie' to '${body.statut}'. Undoing conversion...`)

      // Find and unlink the associated client
      const associatedClient = await prisma.client.findFirst({
        where: { leadId: leadId }
      })

      if (associatedClient) {
        await prisma.client.update({
          where: { id: associatedClient.id },
          data: { leadId: null }
        })
        console.log(`[Lead Update] ✅ Unlinked leadId from client: ${associatedClient.nom}`)
      } else {
        console.log(`[Lead Update] ⚠️ No associated client found for lead ${leadId}`)
      }
    }

    // Handle convertedAt timestamp based on status changes
    let convertedAtUpdate: Date | null | undefined = undefined

    // Set convertedAt when status changes to 'qualifie', 'non_interesse', or 'refuse'
    if ((body.statut === 'qualifie' || body.statut === 'non_interesse' || body.statut === 'refuse') &&
      existing.statut !== 'qualifie' && existing.statut !== 'non_interesse' && existing.statut !== 'refuse') {
      convertedAtUpdate = new Date()
      console.log(`[Lead Update] Setting convertedAt timestamp for lead ${leadId}`)
    }

    // Clear convertedAt when status changes back from 'qualifie', 'non_interesse', or 'refuse'
    if ((existing.statut === 'qualifie' || existing.statut === 'non_interesse' || existing.statut === 'refuse') &&
      body.statut !== 'qualifie' && body.statut !== 'non_interesse' && body.statut !== 'refuse') {
      convertedAtUpdate = null
      console.log(`[Lead Update] Clearing convertedAt timestamp for lead ${leadId}`)
    }

    // Canonicalize assignePar if admin/operator/gestionnaire is changing it
    let nextAssignePar: string | undefined = undefined
    const canChangeAssignment = user && (user.role === 'admin' || user.role === 'operator' || user.role === 'gestionnaire')
    if (canChangeAssignment && typeof body.assignePar === 'string' && body.assignePar.trim()) {
      const raw = (body.assignePar || '').trim()
      const norm = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
      const tokens = (s: string) => norm(s).split(/\s+/).filter(Boolean)
      const architects = await prisma.user.findMany({
        where: { role: { equals: 'architect', mode: 'insensitive' } },
        select: { name: true }
      })
      const nraw = norm(raw)
      let best: string | null = null
      for (const u of architects) {
        const uname = u.name || ''
        const nuser = norm(uname)
        if (nraw === nuser) { best = uname; break }
      }
      if (!best) {
        for (const u of architects) {
          const uname = u.name || ''
          const nuser = norm(uname)
          if (nraw && nuser.includes(nraw)) { best = uname; break }
        }
      }
      if (!best) {
        const tt = tokens(raw)
        for (const u of architects) {
          const uname = u.name || ''
          const nuser = norm(uname)
          if (tt.length >= 1 && tt.some(t => nuser.includes(t))) { best = uname; break }
        }
      }
      nextAssignePar = best || raw
    }

    // Determine priority - automatically set to "haute" for magasin leads
    let priorite = body.priorite
    if (body.source === 'magasin') {
      priorite = 'haute'
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
      assignePar: (user?.role === 'architect' || user?.role === 'commercial' || user?.role === 'magasiner') ? existing.assignePar : (nextAssignePar ?? body.assignePar),
      source: body.source as any, // Cast to any to bypass enum validation
      priorite: priorite,
      derniereMaj: new Date(body.derniereMaj || new Date())
    }

    // Add convertedAt if it needs to be updated
    if (convertedAtUpdate !== undefined) {
      updateData.convertedAt = convertedAtUpdate
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

    // Handle TikTok campaign name tracking
    if (body.source === 'tiktok') {
      updateData.campaignName = body.campaignName || null
    } else {
      // Clear campaign name when source is no longer TikTok to avoid stale data
      updateData.campaignName = null
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

    // OPTIMIZATION: Invalidate cache after updating lead
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/api/leads')
    revalidatePath(`/api/leads/${leadId}`)

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

    // Verify JWT and check delete permissions
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    let user: { name: string; role: string; magasin?: string } | null = null
    try {
      const decoded = verify(token, JWT_SECRET) as any
      user = { name: decoded.name, role: (decoded.role || '').toLowerCase(), magasin: decoded.magasin }
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Load existing lead
    const existing = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Permission: admin/operator/gestionnaire always allowed
    if (user && (user.role === 'admin' || user.role === 'operator' || user.role === 'gestionnaire')) {
      // allowed
    } else if (user && user.role === 'magasiner') {
      const sameCreator = existing.createdBy === user.name || existing.commercialMagasin === user.name
      const sameMagasin = !!user.magasin && existing.magasin?.toLowerCase() === user.magasin.toLowerCase()
      if (!(sameCreator || sameMagasin)) {
        return NextResponse.json({ error: 'Forbidden: You can only delete leads in your magasin or created by you' }, { status: 403 })
      }
    } else if (user && user.role === 'commercial') {
      if (existing.createdBy !== user.name && existing.commercialMagasin !== user.name) {
        return NextResponse.json({ error: 'Forbidden: You can only delete your own leads' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the lead from database
    await prisma.lead.delete({ where: { id: leadId } })

    console.log(`[Delete Lead] Lead ${leadId} deleted successfully`)

    // OPTIMIZATION: Invalidate cache after deleting lead
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/api/leads')
    revalidatePath(`/api/leads/${leadId}`)

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
