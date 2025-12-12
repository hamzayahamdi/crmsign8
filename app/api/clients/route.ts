import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { verify } from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'
import type { Client } from '@/types/client'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Helper function to get client status from clients table or fallback to pipeline stage
async function getClientStatus(clientId: string, pipelineStage: string | null): Promise<string> {
  let status = 'nouveau'
  
  // Try to get status from clients table first (most accurate)
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data: clientRecord, error } = await supabase
        .from('clients')
        .select('statut_projet')
        .eq('id', clientId)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors if not found
      
      if (!error && clientRecord?.statut_projet) {
        status = clientRecord.statut_projet
        return status
      }
    } catch (supabaseError: any) {
      // Silently fail and use fallback - this is expected if client doesn't exist in Supabase
      // Opportunities are stored in Prisma, not Supabase clients table
    }
  }
  
  // Fallback: Map Status from opportunity pipeline stage if not found in clients table
  if (pipelineStage) {
    if (pipelineStage === 'prise_de_besoin') status = 'prise_de_besoin'
    else if (pipelineStage === 'projet_accepte') status = 'acompte_recu'
    else if (pipelineStage === 'acompte_recu') status = 'acompte_recu'
    else if (pipelineStage === 'gagnee') status = 'projet_en_cours'
    else if (pipelineStage === 'perdue') status = 'annule'
  }
  
  return status
}

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

    // Get authenticated user for role-based filtering
    let user: { id: string; role: string | null; name: string | null } | null = null
    try {
      const token = authCookie.value
      const decoded = verify(token, JWT_SECRET) as any
      const userId = decoded.userId

      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, name: true }
      })
    } catch (error) {
      console.error('[Client API] Error verifying token:', error)
      // Continue without user filtering if token is invalid (for backward compatibility)
    }

    // 1. Fetch existing Clients (Legacy/Project table)
    // Filter legacy clients by architect if user is architect
    const legacyClientWhere: any = {}
    if (user?.role?.toLowerCase() === 'architect' && user.name) {
      // Match by either user ID or user name (database can contain either)
      legacyClientWhere.OR = [
        { architecteAssigne: user.id },
        { architecteAssigne: user.name }
      ]
    }

    const clients = await prisma.client.findMany({
      where: legacyClientWhere,
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
    architects.forEach((arch: { id: string; name: string }) => {
      architectNameMap[arch.id] = arch.name
      // Also map by lowercase name for case-insensitive matching
      architectNameMap[arch.name.toLowerCase()] = arch.name
    })
    console.log(`[Client API] ✅ Loaded ${architects.length} architects for name mapping`)
    if (architects.length > 0) {
      console.log(`[Client API] Architect IDs: ${architects.map((a: { id: string; name: string }) => a.id).join(', ')}`)
      console.log(`[Client API] Architect Names: ${architects.map((a: { id: string; name: string }) => a.name).join(', ')}`)
    }

    // 3. Fetch Contacts that are Clients (Unified model)
    // 🎯 SIMPLIFIED LOGIC: Show ALL contacts that have opportunities (except perdue/lost)
    // CRITICAL: Include ALL opportunities except those with status "perdue" (lost)
    // This includes: acompte_recu, projet_accepte, gagnee (won), prise_de_besoin, etc.
    const contactWhere: any = {
      // Include contacts that have at least one opportunity that is NOT lost (perdue)
      opportunities: {
        some: {
          // Only exclude lost opportunities - include ALL other statuses (won, open, etc.)
          statut: {
            not: 'lost'
          },
          pipelineStage: {
            not: 'perdue'
          }
        }
      }
    }
    
    // Use the simplified query
    const contactWhereWithTag = contactWhere

    if (user?.role?.toLowerCase() === 'architect' && user.name) {
      // Architect sees contacts with opportunities assigned to them
      contactWhereWithTag.AND = [
        {
          OR: [
            // Contacts with opportunities assigned to architect (all except perdue)
            {
              opportunities: {
                some: {
                  statut: { not: 'lost' },
                  pipelineStage: { not: 'perdue' },
                  OR: [
                    { architecteAssigne: user.id },
                    { architecteAssigne: user.name }
                  ]
                }
              }
            },
            // Contacts assigned to architect (with or without opportunities)
            {
              OR: [
                { architecteAssigne: user.id },
                { architecteAssigne: user.name }
              ]
            }
          ]
        }
      ]
    }

    console.log('[Client API] Contact filter:', JSON.stringify(contactWhereWithTag, null, 2))

    let contactClients: any[] = []
    try {
      contactClients = await prisma.contact.findMany({
        where: contactWhereWithTag,
        include: { opportunities: true },
        orderBy: { createdAt: 'desc' }
      })
    } catch (prismaError: any) {
      console.error('[Client API] Prisma query error:', prismaError)
      // If query fails, try a simpler query - get all contacts with opportunities (except perdue)
      contactClients = await prisma.contact.findMany({
        where: {
          opportunities: {
            some: {
              statut: { not: 'lost' },
              pipelineStage: { not: 'perdue' }
            }
          }
        },
        include: { opportunities: true },
        orderBy: { createdAt: 'desc' }
      })
      console.log('[Client API] Using fallback query, found:', contactClients.length, 'contacts')
    }
    
    console.log(`[Client API] ✅ Found ${contactClients.length} contacts with opportunities`)
    contactClients.forEach(c => {
      const validOpps = c.opportunities.filter((opp: any) => {
        const isWon = opp.statut === 'won' || opp.pipelineStage === 'gagnee'
        const isLost = opp.statut === 'lost' || opp.pipelineStage === 'perdue'
        return !isWon && !isLost
      })
      if (validOpps.length > 0) {
        console.log(`[Client API]   - ${c.nom}: ${validOpps.length} opportunities (${validOpps.map((o: any) => o.titre + ' [' + o.pipelineStage + ']').join(', ')})`)
      }
    })

    // 4. Map Contacts to Client interface - CREATE ONE ROW PER OPPORTUNITY
    // Note: This now uses async operations for status lookup
    const mappedContactsPromises = contactClients.map(async (c: any) => {
      // If contact has no opportunities, create one entry for the contact
      // BUT: Only include if architect is assigned to this contact (for architect role)
      if (!c.opportunities || c.opportunities.length === 0) {
        // For architects, only show contacts assigned to them (by ID or name)
        if (user?.role?.toLowerCase() === 'architect' && user.name) {
          const isAssignedToArchitect = c.architecteAssigne === user.id || c.architecteAssigne === user.name
          if (!isAssignedToArchitect) {
            return [] // Skip this contact if not assigned to architect
          }
        }

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
      // 🎯 CRITICAL: Show ALL opportunities EXCEPT those with status "perdue" (lost)
      // This includes: won (gagnée), acompte_recu, projet_accepte, prise_de_besoin, etc.
      let opportunitiesToShow = c.opportunities.filter((opp: any) => {
        // Only exclude lost (perdue) opportunities - include ALL other statuses
        const isLost = opp.statut === 'lost' || opp.pipelineStage === 'perdue'
        return !isLost
      })

      // Filter by architect if user is architect (check both ID and name)
      if (user?.role?.toLowerCase() === 'architect' && user.name) {
        opportunitiesToShow = opportunitiesToShow.filter(
          (opp: any) => opp.architecteAssigne === user.id || opp.architecteAssigne === user.name
        )
      }

      // If no opportunities match after filtering, return empty array
      if (opportunitiesToShow.length === 0) {
        return []
      }

      // Process opportunities with async status lookup
      const mappedOpportunities = await Promise.all(opportunitiesToShow.map(async (opp: any) => {
        console.log(`[Client API] Contact ${c.nom} -> Opportunity: "${opp.titre}" (budget: ${opp.budget})`)

        // CRITICAL: Check clients table first for the most up-to-date status
        // This ensures Kanban stage changes are persisted correctly
        const clientId = `${c.id}-${opp.id}`
        const status = await getClientStatus(clientId, opp.pipelineStage)

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

        // CRITICAL: Ensure nomProjet is always set from opportunity title
        const nomProjet = opp.titre || ''
        if (!nomProjet) {
          console.warn(`[Client API] ⚠️ Opportunity ${opp.id} has no titre (nomProjet will be empty)`)
        }

        return {
          id: `${c.id}-${opp.id}`, // Unique ID combining contact + opportunity
          contactId: c.id, // Store original contact ID
          opportunityId: opp.id, // Store opportunity ID
          nom: c.nom,
          nomProjet: nomProjet, // CRITICAL: Opportunity title - must be set for table display
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
      }));
      
      return mappedOpportunities;
    });
    
    // Wait for all async operations to complete and flatten the results
    const mappedContactsArrays = await Promise.all(mappedContactsPromises);
    const mappedContacts = mappedContactsArrays.flat();
    
    // Log opportunities with nomProjet for debugging
    const opportunitiesWithNomProjet = mappedContacts.filter((c: any) => c.nomProjet && c.nomProjet.trim())
    const opportunitiesWithoutNomProjet = mappedContacts.filter((c: any) => !c.nomProjet || !c.nomProjet.trim())
    console.log(`[Client API] 📊 Opportunities summary:`)
    console.log(`   ✅ With nomProjet (will appear in table): ${opportunitiesWithNomProjet.length}`)
    console.log(`   ⚠️  Without nomProjet (filtered out): ${opportunitiesWithoutNomProjet.length}`)
    if (opportunitiesWithNomProjet.length > 0) {
      console.log(`   📋 Sample opportunities that will appear:`)
      opportunitiesWithNomProjet.slice(0, 5).forEach((c: any) => {
        console.log(`      - ${c.nomProjet} (${c.statutProjet}, pipeline: ${c.contactId ? 'opportunity-based' : 'legacy'})`)
      })
    }

    // 5. Map legacy clients to include nomProjet field (empty for legacy) and map architect names
    const mappedLegacyClients = clients.map((c: any) => {
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

    // 6. Merge lists - CRITICAL: Prefer opportunity-based clients over legacy clients
    // If both exist with the same ID, keep the opportunity-based one (has nomProjet)
    const opportunityClientIds = new Set(mappedContacts.map((c: any) => c.id))
    const uniqueLegacyClients = mappedLegacyClients.filter((c: any) => {
      // Exclude legacy clients that have a corresponding opportunity-based client
      // Opportunity-based clients have nomProjet set and are more accurate
      return !opportunityClientIds.has(c.id)
    })

    const allClients = [...uniqueLegacyClients, ...mappedContacts]

    // Sort by createdAt desc
    allClients.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const roleInfo = user?.role ? ` (Role: ${user.role})` : ''
    console.log(`[GET /api/clients] ✅ Fetched ${allClients.length} clients (${clients.length} legacy, ${mappedContacts.length} opportunity-based)${roleInfo}`)

    return NextResponse.json({
      success: true,
      data: allClients
    })

  } catch (error) {
    console.error('[GET /api/clients] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[GET /api/clients] Error details:', { errorMessage, errorStack })
    return NextResponse.json(
      { error: 'Erreur serveur', details: errorMessage },
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

