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

    // Get search and filter params
    const searchQuery = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || 'all'
    const cityFilter = searchParams.get('city') || 'all'
    const typeFilter = searchParams.get('type') || 'all'
    const assignedFilter = searchParams.get('assigned') || 'all'
    const priorityFilter = searchParams.get('priority') || 'all'
    const sourceFilter = searchParams.get('source') || 'all'

    // Read and verify JWT (optional but used for role-based filtering)
    const authHeader = request.headers.get('authorization')
    let user: { userId: string; email: string; name: string; role: string; magasin?: string } | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = verify(token, JWT_SECRET) as any
        user = {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          magasin: decoded.magasin,
        }
      } catch (_) {
        // If token invalid, proceed without user (no filtering). You may choose to return 401 if strict auth is desired.
        user = null
      }
    }

    // Build where clause based on role
    const where: any = {}
    const userRole = (user?.role || '').toLowerCase()

    // IMPORTANT: Always exclude converted leads (leads that have been converted to contacts)
    // This prevents showing leads that should no longer appear in the leads table
    // We check both:
    // 1. Leads with convertedToContactId set
    // 2. Leads that have a corresponding contact (via leadId in contacts table)
    
    // Get all leadIds that have been converted to contacts
    const contactsWithLeadIds = await prisma.contact.findMany({
      where: {
        leadId: { not: null }
      },
      select: {
        leadId: true
      }
    })
    
    const convertedLeadIds = contactsWithLeadIds
      .map(c => c.leadId)
      .filter((id): id is string => id !== null)
    
    // Build exclusion conditions
    const exclusionConditions: any[] = [
      { convertedToContactId: null } // Not marked as converted
    ]
    
    if (convertedLeadIds.length > 0) {
      // Also exclude leads that have corresponding contacts
      exclusionConditions.push({
        id: { notIn: convertedLeadIds }
      })
    }
    
    // Combine exclusion conditions
    if (exclusionConditions.length > 1) {
      where.AND = exclusionConditions
    } else {
      Object.assign(where, exclusionConditions[0])
    }
    
    console.log(`[Leads API] Excluding ${convertedLeadIds.length} converted leads from results`);

    // Admin, Operator, and Gestionnaire can see ALL leads (no filter applied)
    // Role-based filters will be combined with exclusion filters using AND
    let roleFilter: any = null;
    
    if (userRole === 'admin' || userRole === 'operator' || userRole === 'gestionnaire') {
      // No role filter - they see everything including unassigned leads
      console.log(`[API] ${userRole} user ${user?.name} - showing ALL leads (excluding converted)`)
    } else if (userRole === 'architect') {
      // Architects only see leads assigned to them
      const normalizedName = (user?.name || '').trim()
      const tokens = normalizedName.split(/\s+/)
      roleFilter = {
        OR: [
          { assignePar: { equals: normalizedName, mode: 'insensitive' } },
          { assignePar: { contains: normalizedName, mode: 'insensitive' } },
          ...(tokens.length >= 2
            ? [
              { assignePar: { contains: tokens[0], mode: 'insensitive' } },
              { assignePar: { contains: tokens[tokens.length - 1], mode: 'insensitive' } },
            ]
            : []),
        ]
      }
    } else if (userRole === 'commercial') {
      // Commercial can see their own leads
      roleFilter = {
        OR: [
          { createdBy: user?.name },
          { commercialMagasin: user?.name }
        ]
      }
    } else if (userRole === 'magasiner') {
      // Magasiner can only see leads from their assigned magasin
      if (user?.magasin) {
        roleFilter = { magasin: user.magasin }
      }
    }
    
    // Combine role filter with exclusion filters
    if (roleFilter) {
      if (where.AND) {
        where.AND.push(roleFilter)
      } else {
        where.AND = [...exclusionConditions, roleFilter]
      }
    }

    // Apply search filter (server-side)
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.trim()
      const searchConditions = {
        OR: [
          { nom: { contains: searchTerm, mode: 'insensitive' as const } },
          { telephone: { contains: searchTerm, mode: 'insensitive' as const } },
          { ville: { contains: searchTerm, mode: 'insensitive' as const } },
          { typeBien: { contains: searchTerm, mode: 'insensitive' as const } },
          { assignePar: { contains: searchTerm, mode: 'insensitive' as const } },
          { statutDetaille: { contains: searchTerm, mode: 'insensitive' as const } },
          { message: { contains: searchTerm, mode: 'insensitive' as const } },
        ]
      }

      // Combine with existing where conditions
      // If we have AND conditions (from exclusion filters), add search to AND
      if (where.AND) {
        where.AND.push(searchConditions)
      } else if (where.OR) {
        // If we have OR conditions (from role-based filtering), combine with AND
        where.AND = [
          { OR: where.OR },
          searchConditions
        ]
        delete where.OR
      } else {
        Object.assign(where, searchConditions)
      }
    }

    // Apply other filters
    if (statusFilter !== 'all') {
      where.statut = statusFilter
    }
    if (cityFilter !== 'all') {
      where.ville = cityFilter
    }
    if (typeFilter !== 'all') {
      where.typeBien = typeFilter
    }
    if (assignedFilter !== 'all') {
      where.assignePar = assignedFilter
    }
    if (priorityFilter !== 'all') {
      where.priorite = priorityFilter
    }
    if (sourceFilter !== 'all') {
      where.source = sourceFilter
    }

    // Fetch total count (respecting role filter)
    const totalCount = await prisma.lead.count({ where })

    // Fetch leads - newest first, include notes
    const leads = await prisma.lead.findMany({
      skip,
      take: limit,
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
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
    // Auth: Admin and Commercial can create leads
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    let user: { userId: string; email: string; name: string; role: string; magasin?: string } | null = null
    try {
      const decoded = verify(token, JWT_SECRET) as any
      user = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: (decoded.role || '').toLowerCase(),
        magasin: decoded.magasin
      }
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    if (user.role !== 'admin' && user.role !== 'operator' && user.role !== 'gestionnaire' && user.role !== 'commercial' && user.role !== 'magasiner') {
      return NextResponse.json({ error: 'Forbidden: Admins, Operators, Gestionnaires, Commercials, and Magasiniers only' }, { status: 403 })
    }

    const body = await request.json()

    // Get user info from token for createdBy
    let createdBy = user.name
    let assignePar = body.assignePar || 'Mohamed' // Default to Mohamed (gestionnaire de projet)
    let magasin = body.magasin || user.magasin
    let commercialMagasin = body.commercialMagasin || (user.role === 'commercial' ? user.name : undefined)

    // For commercial and magasiner users, force status to "nouveau" and set default values
    let statut = body.statut
    let statutDetaille = body.statutDetaille
    if (user.role === 'commercial' || user.role === 'magasiner') {
      statut = 'nouveau'
      statutDetaille = 'Nouveau lead'
    }

    // Auto-assign month for TikTok leads
    let month = body.month
    let uploadedAt = body.uploadedAt
    if (body.source === 'tiktok' && !month) {
      const now = new Date()
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
      month = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
      uploadedAt = now
    }
    // If an assignment was provided, try to canonicalize it to an exact gestionnaire/architect user name
    if (assignePar && assignePar !== 'Non assigné') {
      const raw = (assignePar || '').trim()
      const norm = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
      const tokens = (s: string) => norm(s).split(/\s+/).filter(Boolean)
      // Look for gestionnaires and architects
      const allAssignees = await prisma.user.findMany({
        where: {
          OR: [
            { role: { equals: 'gestionnaire', mode: 'insensitive' } },
            { role: { equals: 'architect', mode: 'insensitive' } }
          ]
        },
        select: { name: true }
      })
      const nraw = norm(raw)
      let best: string | null = null
      for (const u of allAssignees) {
        const uname = u.name || ''
        const nuser = norm(uname)
        if (nraw === nuser) { best = uname; break }
      }
      if (!best) {
        for (const u of allAssignees) {
          const uname = u.name || ''
          const nuser = norm(uname)
          if (nraw && nuser.includes(nraw)) { best = uname; break }
        }
      }
      if (!best) {
        const tt = tokens(raw)
        for (const u of allAssignees) {
          const uname = u.name || ''
          const nuser = norm(uname)
          if (tt.length >= 1 && tt.some(t => nuser.includes(t))) { best = uname; break }
        }
      }
      if (best) assignePar = best
    }

    // Prepare notes to create
    const notesToCreate: Array<{ content: string; author: string; createdAt?: Date }> = []
    
    // Add initial traceability note
    notesToCreate.push({
      content: `Lead créé par ${createdBy || 'Utilisateur'}${body.source ? ` (source: ${body.source})` : ''}`,
      author: createdBy || user.name || 'Utilisateur'
    })

    // Add any notes from the request body (from modal)
    if (body.notes && Array.isArray(body.notes)) {
      for (const note of body.notes) {
        // Skip notes that don't have content or are already saved (have an id that looks like a database ID)
        if (note.content && note.content.trim()) {
          // Only add notes that don't have a database ID (temporary notes from modal)
          // Notes with IDs starting with numbers are likely temporary client-side IDs
          if (!note.id || note.id.length < 20 || /^\d+$/.test(note.id)) {
            notesToCreate.push({
              content: note.content.trim(),
              author: note.author || createdBy || user.name || 'Utilisateur',
              createdAt: note.createdAt ? new Date(note.createdAt) : undefined
            })
          }
        }
      }
    }

    const lead = await prisma.lead.create({
      data: {
        nom: body.nom,
        telephone: body.telephone,
        ville: body.ville,
        typeBien: body.typeBien,
        statut: statut,
        statutDetaille: statutDetaille,
        message: body.message,
        assignePar: assignePar,
        source: body.source || 'magasin',
        priorite: body.priorite || 'moyenne',
        magasin: magasin,
        commercialMagasin: commercialMagasin,
        month: month,
        campaignName: body.campaignName,
        uploadedAt: uploadedAt,
        createdBy: createdBy,
        derniereMaj: new Date(),
        // Create all notes (initial + any from modal)
        notes: {
          create: notesToCreate
        }
      },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    console.log('[API] Created lead:', lead.id, 'with', lead.notes.length, 'notes')
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
