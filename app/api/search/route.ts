import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'
import { getSearchEngine, type SearchableItem } from '@/lib/enhanced-search'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface SearchResult {
  id: string
  type: 'lead' | 'contact' | 'client' | 'task' | 'user' | 'opportunity' | 'note'
  title: string
  description?: string
  href?: string
  metadata?: {
    phone?: string
    email?: string
    status?: string
    city?: string
    role?: string
    [key: string]: any
  }
  score?: number
}

// GET /api/search - Global search across all entities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Get and verify user for role-based filtering
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
        // Invalid token, proceed without user
      }
    }

    const userRole = (user?.role || '').toLowerCase()
    const results: SearchResult[] = []

    // Search Leads
    try {
      const leadWhere: any = {
        convertedToContactId: null,
      }

      // Role-based filtering for leads
      if (userRole === 'architect') {
        const normalizedName = (user?.name || '').trim()
        const tokens = normalizedName.split(/\s+/)
        leadWhere.assignePar = {
          in: [normalizedName, ...tokens]
        }
      }

      const leads = await prisma.lead.findMany({
        where: {
          ...leadWhere,
          OR: [
            { nom: { contains: query, mode: 'insensitive' } },
            { telephone: { contains: query, mode: 'insensitive' } },
            { ville: { contains: query, mode: 'insensitive' } },
            { typeBien: { contains: query, mode: 'insensitive' } },
            { assignePar: { contains: query, mode: 'insensitive' } },
            { statutDetaille: { contains: query, mode: 'insensitive' } },
            { message: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      leads.forEach((lead) => {
        results.push({
          id: lead.id,
          type: 'lead',
          title: lead.nom,
          description: `${lead.ville} • ${lead.typeBien}`,
          href: `/`, // Leads are displayed on the home page
          metadata: {
            phone: lead.telephone,
            status: lead.statutDetaille,
            city: lead.ville,
            assignedTo: lead.assignePar,
          },
        })
      })
    } catch (error) {
      console.error('Error searching leads:', error)
    }

    // Search Contacts
    try {
      const contactWhere: any = {}

      if (userRole === 'architect') {
        contactWhere.architecteAssigne = user?.name
      }

      const contacts = await prisma.contact.findMany({
        where: {
          ...contactWhere,
          OR: [
            { nom: { contains: query, mode: 'insensitive' } },
            { telephone: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { ville: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      contacts.forEach((contact) => {
        results.push({
          id: contact.id,
          type: 'contact',
          title: contact.nom,
          description: contact.tag || 'Contact',
          href: `/contacts/${contact.id}`,
          metadata: {
            phone: contact.telephone || undefined,
            email: contact.email || undefined,
            status: contact.tag || undefined,
            city: contact.ville || undefined,
          },
        })
      })
    } catch (error) {
      console.error('Error searching contacts:', error)
    }

    // Search Clients
    try {
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            { nom: { contains: query, mode: 'insensitive' } },
            { telephone: { contains: query, mode: 'insensitive' } },
            { ville: { contains: query, mode: 'insensitive' } },
            { architecteAssigne: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      clients.forEach((client) => {
        results.push({
          id: client.id,
          type: 'client',
          title: client.nom,
          description: client.ville || '',
          href: `/clients/${client.id}`,
          metadata: {
            phone: client.telephone,
            status: client.statutProjet || undefined,
            city: client.ville || undefined,
            architect: client.architecteAssigne || undefined,
          },
        })
      })
    } catch (error) {
      console.error('Error searching clients:', error)
    }

    // Search Tasks
    try {
      const tasks = await prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { assignedTo: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      tasks.forEach((task) => {
        results.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: task.assignedTo || '',
          href: '/tasks',
          metadata: {
            status: task.status,
            assignedTo: task.assignedTo,
          },
        })
      })
    } catch (error) {
      console.error('Error searching tasks:', error)
    }

    // Search Users (only for admins/operators)
    if (userRole === 'admin' || userRole === 'operator' || userRole === 'gestionnaire') {
      try {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
              { ville: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        })

        users.forEach((user) => {
          results.push({
            id: user.id,
            type: 'user',
            title: user.name,
            description: user.email,
            href: `/users/${user.id}`,
            metadata: {
              email: user.email,
              role: user.role,
              phone: user.phone || undefined,
              city: user.ville || undefined,
            },
          })
        })
      } catch (error) {
        console.error('Error searching users:', error)
      }
    }

    // Search Opportunities
    try {
      const opportunities = await prisma.opportunity.findMany({
        where: {
          OR: [
            { titre: { contains: query, mode: 'insensitive' } },
            { architecteAssigne: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          contact: {
            select: {
              nom: true,
              telephone: true,
            },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      opportunities.forEach((opp) => {
        results.push({
          id: opp.id,
          type: 'opportunity',
          title: opp.titre,
          description: opp.contact?.nom || '',
          href: `/opportunities/${opp.id}`,
          metadata: {
            status: opp.statut,
            architect: opp.architecteAssigne || undefined,
            contactName: opp.contact?.nom,
            phone: opp.contact?.telephone || undefined,
          },
        })
      })
    } catch (error) {
      console.error('Error searching opportunities:', error)
    }

    // Search Notes
    try {
      const notes = await prisma.note.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      notes.forEach((note) => {
        let href = ''
        if (note.entityType === 'lead') href = `/leads/${note.entityId}`
        else if (note.entityType === 'contact') href = `/contacts/${note.entityId}`
        else if (note.entityType === 'client') href = `/clients/${note.entityId}`

        results.push({
          id: note.id,
          type: 'note',
          title: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
          description: `Note sur ${note.entityType}`,
          href,
          metadata: {
            author: note.author,
            entityType: note.entityType,
            entityId: note.entityId,
          },
        })
      })
    } catch (error) {
      console.error('Error searching notes:', error)
    }

    // Use Enhanced Search Engine for intelligent ranking
    const searchEngine = getSearchEngine()

    // Clear previous documents and add current results
    searchEngine.clear()
    searchEngine.addDocuments(results as SearchableItem[])

    // Perform intelligent search with the enhanced engine
    const rankedResults = searchEngine.search(query, { limit })

    console.log(`[Search API] Query: "${query}", Total results: ${results.length}, Ranked results: ${rankedResults.length}`)

    return NextResponse.json({
      results: rankedResults,
      total: results.length,
    })
  } catch (error) {
    console.error('Error in global search:', error)
    return NextResponse.json(
      { error: 'Failed to perform search', results: [] },
      { status: 500 }
    )
  }
}
