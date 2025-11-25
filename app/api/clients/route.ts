import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// Generate CUID-like ID (compatible with Prisma's cuid())
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
}

/**
 * GET /api/clients - Fetch all clients from database
 * Merges records from 'clients' table and 'contacts' (tag=client)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 1. Fetch existing Clients (Legacy/Project table)
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // 2. Fetch all architects to map IDs to names
    const architects = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'architect' },
          { role: 'architecte' }
        ]
      },
      select: { id: true, name: true }
    })
    const architectNameMap: Record<string, string> = {}
    architects.forEach(arch => {
      architectNameMap[arch.id] = arch.name
      // Also map by lowercase name for case-insensitive matching
      architectNameMap[arch.name.toLowerCase()] = arch.name
    })
    console.log(`[Client API] ✅ Loaded ${architects.length} architects for name mapping`)
    if (architects.length > 0) {
      console.log(`[Client API] Architect IDs: ${architects.map(a => a.id).join(', ')}`)
      console.log(`[Client API] Architect Names: ${architects.map(a => a.name).join(', ')}`)
    }

    // 3. Fetch Contacts that are Clients (Unified model)
    const contactClients = await prisma.contact.findMany({
      where: { tag: 'client' },
      include: { opportunities: true },
      orderBy: { createdAt: 'desc' }
    })

    // 4. Map Contacts to Client interface - CREATE ONE ROW PER OPPORTUNITY
    const mappedContacts = contactClients.flatMap(c => {
      // If contact has no opportunities, create one entry for the contact
      if (!c.opportunities || c.opportunities.length === 0) {
        console.log(`[Client API] Contact ${c.nom} has NO opportunities`)
        
        // Get architect name from ID or name
        const architectValue = c.architecteAssigne || ''
        let architectName = ''
        if (architectValue) {
          // First try direct ID lookup
          architectName = architectNameMap[architectValue]
          // If not found, try lowercase name lookup (case-insensitive)
          if (!architectName) {
            architectName = architectNameMap[architectValue.toLowerCase()]
          }
          // If still not found and it looks like an ID (long alphanumeric), keep as is but log
          if (!architectName) {
            if (architectValue.length > 20 || /^[a-z0-9]{20,}$/i.test(architectValue)) {
              // It's likely an ID that doesn't exist in our map
              console.warn(`[Client API] Architect ID not found: ${architectValue} for contact ${c.nom}`)
              architectName = 'Non assigné'
            } else {
              // It's probably already a name
              architectName = architectValue
            }
          }
        }

        return [{
          id: c.id,
          contactId: c.id, // Store contact ID for navigation
          nom: c.nom,
          nomProjet: '', // No opportunity
          telephone: c.telephone,
          ville: c.ville || '',
          typeProjet: 'autre',
          architecteAssigne: architectName, // Use architect name instead of ID
          statutProjet: c.status === 'acompte_recu' ? 'acompte_recu' : 'nouveau',
          derniereMaj: c.updatedAt.toISOString(),
          leadId: c.leadId,
          email: c.email,
          adresse: c.adresse,
          budget: 0,
          notes: c.notes,
          magasin: c.magasin,
          commercialAttribue: c.createdBy,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          isContact: true
        }]
      }

      // Create ONE row for EACH opportunity
      return c.opportunities.map(opp => {
        console.log(`[Client API] Contact ${c.nom} -> Opportunity: "${opp.titre}" (budget: ${opp.budget})`)

        // Map Status from opportunity pipeline stage - Show actual pipeline stages
        let status = 'nouveau'
        if (opp.pipelineStage === 'prise_de_besoin') status = 'prise_de_besoin'
        if (opp.pipelineStage === 'projet_accepte') status = 'acompte_recu' // Default first stage when creating opportunity
        if (opp.pipelineStage === 'acompte_recu') status = 'acompte_recu'
        if (opp.pipelineStage === 'gagnee') status = 'projet_en_cours'
        if (opp.pipelineStage === 'perdue') status = 'annule'

        // Map OpportunityType to ProjectType
        const typeMap: Record<string, string> = {
          'villa': 'villa',
          'appartement': 'appartement',
          'magasin': 'magasin',
          'bureau': 'bureau',
          'riad': 'riad',
          'studio': 'studio',
          'renovation': 'autre',
          'autre': 'autre'
        }
        const type = typeMap[opp.type] || 'autre'

        // Get architect name from ID or name
        const architectValue = opp.architecteAssigne || c.architecteAssigne || ''
        let architectName = ''
        if (architectValue) {
          // First try direct ID lookup
          architectName = architectNameMap[architectValue]
          // If not found, try lowercase name lookup (case-insensitive)
          if (!architectName) {
            architectName = architectNameMap[architectValue.toLowerCase()]
          }
          // If still not found and it looks like an ID (long alphanumeric), keep as is but log
          if (!architectName) {
            if (architectValue.length > 20 || /^[a-z0-9]{20,}$/i.test(architectValue)) {
              // It's likely an ID that doesn't exist in our map
              console.warn(`[Client API] Architect ID not found: ${architectValue} for opportunity ${opp.titre}`)
              architectName = 'Non assigné'
            } else {
              // It's probably already a name
              architectName = architectValue
            }
          }
        }

        return {
          id: `${c.id}-${opp.id}`, // Unique ID combining contact + opportunity
          contactId: c.id, // Store original contact ID
          opportunityId: opp.id, // Store opportunity ID
          nom: c.nom,
          nomProjet: opp.titre, // Opportunity title
          telephone: c.telephone,
          ville: c.ville || '',
          typeProjet: type,
          architecteAssigne: architectName, // Use architect name instead of ID
          statutProjet: status,
          derniereMaj: opp.updatedAt.toISOString(),
          leadId: c.leadId,
          email: c.email,
          adresse: c.adresse,
          budget: opp.budget || 0,
          notes: c.notes,
          magasin: c.magasin,
          commercialAttribue: c.createdBy,
          createdAt: opp.createdAt.toISOString(),
          updatedAt: opp.updatedAt.toISOString(),
          isContact: true
        }
      })
    })

    // 5. Map legacy clients to include nomProjet field (empty for legacy) and map architect names
    const mappedLegacyClients = clients.map(c => {
      // Get architect name from ID or name
      const architectValue = c.architecteAssigne || ''
      let architectName = ''
      if (architectValue) {
        // First try direct ID lookup
        architectName = architectNameMap[architectValue]
        // If not found, try lowercase name lookup (case-insensitive)
        if (!architectName) {
          architectName = architectNameMap[architectValue.toLowerCase()]
        }
        // If still not found and it looks like an ID (long alphanumeric), keep as is but log
        if (!architectName) {
          if (architectValue.length > 20 || /^[a-z0-9]{20,}$/i.test(architectValue)) {
            // It's likely an ID that doesn't exist in our map
            console.warn(`[Client API] Architect ID not found: ${architectValue} for legacy client ${c.nom}`)
            architectName = 'Non assigné'
          } else {
            // It's probably already a name
            architectName = architectValue
          }
        }
      }

      return {
        ...c,
        nomProjet: '', // Legacy clients don't have opportunities
        architecteAssigne: architectName, // Use mapped architect name
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        derniereMaj: c.derniereMaj.toISOString(),
        isContact: false
      }
    })

    // 6. Merge lists (exclude opportunity-based clients if the contact also exists as legacy client)
    const legacyClientIds = new Set(clients.map(c => c.id))
    const uniqueMappedContacts = mappedContacts.filter(c => {
      // Check if this contact exists as a legacy client (by contactId)
      return !legacyClientIds.has(c.contactId || '')
    })

    const allClients = [...mappedLegacyClients, ...uniqueMappedContacts]

    // Sort by createdAt desc
    allClients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`[GET /api/clients] ✅ Fetched ${allClients.length} clients (${clients.length} legacy, ${uniqueMappedContacts.length} contacts)`)

    return NextResponse.json({
      success: true,
      data: allClients
    })

  } catch (error) {
    console.error('[GET /api/clients] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients - Create new client in database
 * Kept using Prisma for consistency
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      nom,
      telephone,
      ville,
      typeProjet,
      architecteAssigne,
      statutProjet,
      leadId,
      email,
      adresse,
      budget,
      notes,
      magasin,
      commercialAttribue
    } = body

    // Validate required fields
    if (!nom || !telephone || !ville || !typeProjet || !architecteAssigne || !statutProjet) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    // Create client in database using Prisma
    const newClient = await prisma.client.create({
      data: {
        nom,
        telephone,
        ville,
        typeProjet: typeProjet as any,
        architecteAssigne,
        statutProjet: statutProjet as any,
        leadId: leadId || undefined,
        email: email || undefined,
        adresse: adresse || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        notes: notes || undefined,
        magasin: magasin || undefined,
        commercialAttribue: commercialAttribue || undefined,
        // Prisma handles createdAt/updatedAt automatically
      }
    })

    // Create initial stage history
    await prisma.clientStageHistory.create({
      data: {
        clientId: newClient.id,
        stageName: statutProjet,
        startedAt: new Date(),
        changedBy: commercialAttribue || 'Système',
      }
    })

    // Add to historique
    await prisma.historique.create({
      data: {
        clientId: newClient.id,
        type: 'note',
        description: 'Client créé',
        auteur: commercialAttribue || 'Système',
      }
    })

    console.log(`[POST /api/clients] ✅ Created client: ${newClient.id}`)

    return NextResponse.json({
      success: true,
      data: {
        ...newClient,
        createdAt: newClient.createdAt.toISOString(),
        updatedAt: newClient.updatedAt.toISOString(),
        derniereMaj: newClient.derniereMaj.toISOString()
      }
    })

  } catch (error) {
    console.error('[POST /api/clients] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
