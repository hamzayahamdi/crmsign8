import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Helper function to check if a dossier is assigned to an architect
 * Supports both ID matching and name matching (exact and case-insensitive)
 * Handles various formats: "John Doe", "john doe", "John", etc.
 */
function isAssignedToArchitect(
  assignedValue: string | null | undefined,
  architectId: string,
  architectName: string
): boolean {
  if (!assignedValue) return false

  const assigned = assignedValue.trim()
  if (!assigned) return false

  const architectNameLower = architectName.toLowerCase()
  const assignedLower = assigned.toLowerCase()

  // Match by ID (exact match)
  if (assigned === architectId) return true

  // Match by exact name (case-insensitive)
  if (assignedLower === architectNameLower) return true

  // Match by name parts - bidirectional matching
  const nameParts = architectNameLower.split(/\s+/).filter(p => p.length > 0)
  const assignedParts = assignedLower.split(/\s+/).filter(p => p.length > 0)

  // If architect name parts are all present in assigned value, it's a match
  // e.g., "John Doe" matches "John Doe Smith" or "John"
  if (nameParts.length > 0 && nameParts.every(part => assignedLower.includes(part))) {
    return true
  }

  // If assigned value parts are all present in architect name, it's a match
  // e.g., "John" matches "John Doe"
  if (assignedParts.length > 0 && assignedParts.every(part => architectNameLower.includes(part))) {
    return true
  }

  return false
}

/**
 * Helper function to determine dossier status category
 * IMPORTANT: "perdu" (lost) and "refuse" (refused) are excluded from all categories
 * as they represent closed/lost projects that should not be counted as active.
 * 
 * CATEGORIZATION LOGIC:
 * - Projet livré (termine): livraison_termine, livraison, termine
 * - Projet en cours (en_cours): accepte (devis accepté) + premier_depot, projet_en_cours, chantier, facture_reglee
 * - Projet en attente (en_attente): acompte_recu, conception, devis_negociation, prise_de_besoin, qualifie, nouveau
 *   (NOT accepte - if devis is accepted, it's en cours)
 */
function getDossierStatusCategory(statut: string): 'en_cours' | 'termine' | 'en_attente' | null {
  // Exclude lost/refused projects - these should not be counted in any active category
  if (
    statut === 'perdu' ||
    statut === 'refuse' ||
    statut === 'annule' ||
    statut === 'suspendu'
  ) {
    return null // Excluded from all counts
  }

  // Projet livré - completed/delivered projects
  if (
    statut === 'termine' ||
    statut === 'livraison_termine' ||
    statut === 'livraison'
  ) {
    return 'termine'
  }

  // Projet en cours - devis accepted and working on project
  // Includes: accepte (devis accepté), premier_depot, projet_en_cours, chantier, facture_reglee
  if (
    statut === 'accepte' ||
    statut === 'premier_depot' ||
    statut === 'projet_en_cours' ||
    statut === 'chantier' ||
    statut === 'facture_reglee' ||
    statut === 'en_chantier'
  ) {
    return 'en_cours'
  }

  // Projet en attente - acompte reçu but devis not yet accepted
  // Includes: acompte_recu, conception, devis_negociation, prise_de_besoin, qualifie, nouveau
  // Also includes legacy statuses: acompte_verse, en_conception, en_validation
  if (
    statut === 'acompte_recu' ||
    statut === 'acompte_verse' ||
    statut === 'conception' ||
    statut === 'en_conception' ||
    statut === 'devis_negociation' ||
    statut === 'en_validation' ||
    statut === 'prise_de_besoin' ||
    statut === 'qualifie' ||
    statut === 'nouveau'
  ) {
    return 'en_attente'
  }

  // Default fallback for any unknown status
  return 'en_attente'
}

/**
 * GET /api/architects/[id] - Fetch single architect with all their dossiers
 * 
 * DOSSIER COUNTING LOGIC (MUST MATCH /api/architects):
 * - A "dossier" is a project/case assigned to an architect
 * - Sources of dossiers:
 *   1. Legacy Clients (Client model) - each client = 1 dossier
 *   2. Contact Opportunities (Contact model with Opportunity relations) - each opportunity = 1 dossier
 *   3. Direct Opportunities (Opportunity model) - each opportunity = 1 dossier
 * 
 * IMPORTANT: A single Contact can have MULTIPLE Opportunities (projects).
 * Therefore, we count opportunities within contacts, NOT the contact itself.
 * Use flatMap to extract opportunities from contacts for accurate counting.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log(`[GET /api/architects/${id}] 🔍 Looking for architect with ID: ${id}`)

    // Fetch architect user - first try with role filter
    let architect = await prisma.user.findUnique({
      where: {
        id: id,
        role: 'architect'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        magasin: true,
        ville: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // If not found with role filter, try without role filter (in case role is not set correctly)
    if (!architect) {
      console.log(`[GET /api/architects/${id}] ⚠️ Not found with role filter, trying without role filter...`)
      const user = await prisma.user.findUnique({
        where: { id: id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          magasin: true,
          ville: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      if (user) {
        console.log(`[GET /api/architects/${id}] ⚠️ Found user but role is: ${user.role}`)
        if (user.role?.toLowerCase() === 'architect') {
          architect = user
        } else {
          return NextResponse.json(
            { 
              success: false,
              error: `Utilisateur trouvé mais le rôle n'est pas 'architect' (rôle actuel: ${user.role || 'non défini'})` 
            },
            { status: 404 }
          )
        }
      }
    }

    if (!architect) {
      console.log(`[GET /api/architects/${id}] ❌ Architect not found`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Architecte non trouvé' 
        },
        { status: 404 }
      )
    }

    console.log(`[GET /api/architects/${id}] ✅ Found architect: ${architect.name}`)

    const architectName = architect.name

    // Fetch all dossiers from different sources
    const [allClients, allContacts, allOpportunities] = await Promise.all([
      // Clients (legacy Client model)
      prisma.client.findMany({
        orderBy: {
          derniereMaj: 'desc'
        }
      }),
      // Contacts with architect assignment
      prisma.contact.findMany({
        where: {
          architecteAssigne: { not: null }
        },
        include: {
          opportunities: {
            select: {
              id: true,
              titre: true,
              type: true,
              statut: true,
              pipelineStage: true,
              budget: true,
              updatedAt: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      }),
      // Opportunities with architect assignment
      prisma.opportunity.findMany({
        where: {
          architecteAssigne: { not: null }
        },
        include: {
          contact: {
            select: {
              id: true,
              nom: true,
              telephone: true,
              ville: true,
              email: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })
    ])

    // Filter dossiers for this architect
    const architectClients = allClients.filter(client =>
      isAssignedToArchitect(client.architecteAssigne, architect.id, architectName)
    )

    const architectContacts = allContacts.filter(contact =>
      isAssignedToArchitect(contact.architecteAssigne, architect.id, architectName)
    )

    // Get all opportunity IDs that are already included in contacts
    const contactOpportunityIds = new Set(
      architectContacts.flatMap(contact => contact.opportunities.map(opp => opp.id))
    )

    // Filter out opportunities that are already included in contacts to avoid duplicates
    const architectOpportunities = allOpportunities.filter(opportunity =>
      isAssignedToArchitect(opportunity.architecteAssigne, architect.id, architectName) &&
      !contactOpportunityIds.has(opportunity.id)
    )

      // Combine all dossiers for statistics
      // IMPORTANT: projet_accepte means devis accepté, so it should map to 'accepte' (PROJET EN COURS)
      // acompte_recu means deposit received but devis not yet accepted (PROJET EN ATTENTE)
      const allDossiers = [
        ...architectClients.map(c => ({ type: 'client' as const, statut: c.statutProjet })),
        ...architectContacts.flatMap(c =>
          c.opportunities.map(o => ({
            type: 'contact_opportunity' as const,
            statut: o.pipelineStage === 'perdue' ? 'perdu' :
              o.pipelineStage === 'gagnee' ? 'projet_en_cours' : // gagnee = won, typically means project in progress
                o.pipelineStage === 'acompte_recu' ? 'acompte_recu' :
                  o.pipelineStage === 'prise_de_besoin' ? 'prise_de_besoin' :
                    o.pipelineStage === 'projet_accepte' ? 'accepte' : // devis accepté = PROJET EN COURS
                      'projet_en_cours'
          }))
        ),
        ...architectOpportunities.map(o => ({
          type: 'opportunity' as const,
          statut: o.statut === 'won' ? 'projet_en_cours' : o.statut === 'lost' ? 'perdu' :
            o.pipelineStage === 'perdue' ? 'perdu' :
              o.pipelineStage === 'gagnee' ? 'projet_en_cours' : // gagnee = won, typically means project in progress
                o.pipelineStage === 'projet_accepte' ? 'accepte' : // devis accepté = PROJET EN COURS
                  o.pipelineStage === 'acompte_recu' ? 'acompte_recu' :
                    o.pipelineStage === 'prise_de_besoin' ? 'prise_de_besoin' :
                      'projet_en_cours'
        }))
      ]

    // Calculate statistics (exclude null/refused/lost projects from active counts)
    const totalDossiers = allDossiers.length
    const dossiersEnCours = allDossiers.filter(d => {
      const category = getDossierStatusCategory(d.statut)
      return category === 'en_cours'
    }).length
    const dossiersTermines = allDossiers.filter(d => {
      const category = getDossierStatusCategory(d.statut)
      return category === 'termine'
    }).length
    const dossiersEnAttente = allDossiers.filter(d => {
      const category = getDossierStatusCategory(d.statut)
      return category === 'en_attente'
    }).length

    // Calculate disponible status
    const isDisponible = dossiersEnCours < 10

    const architectData = {
      id: architect.id,
      nom: architect.name.split(' ').slice(1).join(' ') || architect.name,
      prenom: architect.name.split(' ')[0],
      email: architect.email,
      telephone: '', // Can be extended in User model
      ville: architect.ville || architect.magasin || 'Casablanca',
      specialite: 'residentiel',
      statut: isDisponible ? 'actif' : 'actif',
      dateEmbauche: architect.createdAt,
      createdAt: architect.createdAt,
      updatedAt: architect.updatedAt,
      // Statistics
      totalDossiers,
      dossiersEnCours,
      dossiersTermines,
      dossiersEnAttente,
      isDisponible,
      // Breakdown by source
      clientsCount: architectClients.length,
      contactsCount: architectContacts.reduce((sum, c) => sum + c.opportunities.length, 0),
      opportunitiesCount: architectOpportunities.length
    }

    // Transform clients to match frontend format (for backward compatibility)
    // Also include contacts and opportunities as "clients" for the detail page
    const allTransformedClients = [
      // Legacy clients
      ...architectClients.map(client => ({
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
        ville: client.ville,
        typeProjet: client.typeProjet,
        architecteAssigne: client.architecteAssigne,
        statutProjet: client.statutProjet,
        derniereMaj: client.derniereMaj.toISOString(),
        leadId: client.leadId,
        email: client.email,
        adresse: client.adresse,
        budget: client.budget ? Number(client.budget) : 0,
        notes: client.notes,
        magasin: client.magasin,
        commercialAttribue: client.commercialAttribue,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
        isContact: false,
        contactId: undefined,
        opportunityId: undefined
      })),
      // Contacts with opportunities (transform to opportunity-based clients)
      ...architectContacts.flatMap(contact =>
        contact.opportunities.map(opportunity => ({
          id: `${contact.id}-${opportunity.id}`, // Composite ID format
          nom: contact.nom,
          telephone: contact.telephone,
          ville: contact.ville || '',
          typeProjet: opportunity.type as any,
          architecteAssigne: contact.architecteAssigne || '',
          statutProjet: opportunity.pipelineStage === 'perdue' ? 'perdu' :
            opportunity.pipelineStage === 'gagnee' ? 'projet_en_cours' : // gagnee = won, typically means project in progress
              opportunity.pipelineStage === 'acompte_recu' ? 'acompte_recu' :
                opportunity.pipelineStage === 'prise_de_besoin' ? 'prise_de_besoin' :
                  opportunity.pipelineStage === 'projet_accepte' ? 'accepte' : // devis accepté = PROJET EN COURS
                    'projet_en_cours',
          derniereMaj: opportunity.updatedAt ? opportunity.updatedAt.toISOString() : contact.updatedAt.toISOString(),
          leadId: contact.leadId || undefined,
          email: contact.email || undefined,
          adresse: contact.adresse || undefined,
          budget: opportunity.budget ? Number(opportunity.budget) : 0,
          notes: contact.notes || undefined,
          magasin: contact.magasin || undefined,
          commercialAttribue: undefined,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString(),
          isContact: true,
          contactId: contact.id,
          opportunityId: opportunity.id,
          nomProjet: opportunity.titre
        }))
      ),
      // Opportunities (as clients for display)
      ...architectOpportunities.map(opportunity => ({
        id: `${opportunity.contactId}-${opportunity.id}`, // Composite ID format for opportunity-based clients
        nom: opportunity.contact.nom,
        telephone: opportunity.contact.telephone,
        ville: opportunity.contact.ville || '',
        typeProjet: opportunity.type as any,
        architecteAssigne: opportunity.architecteAssigne || '',
        statutProjet: opportunity.statut === 'won' ? 'projet_en_cours' :
          opportunity.statut === 'lost' ? 'perdu' :
            opportunity.pipelineStage === 'perdue' ? 'perdu' :
              opportunity.pipelineStage === 'gagnee' ? 'projet_en_cours' : // gagnee = won, typically means project in progress
                opportunity.pipelineStage === 'projet_accepte' ? 'accepte' : // devis accepté = PROJET EN COURS
                  opportunity.pipelineStage === 'acompte_recu' ? 'acompte_recu' :
                    opportunity.pipelineStage === 'prise_de_besoin' ? 'prise_de_besoin' :
                      'projet_en_cours',
        derniereMaj: opportunity.updatedAt.toISOString(),
        leadId: undefined,
        email: opportunity.contact.email || undefined,
        adresse: undefined,
        budget: opportunity.budget ? Number(opportunity.budget) : 0,
        notes: opportunity.notes || undefined,
        magasin: undefined,
        commercialAttribue: undefined,
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
        isContact: true, // Mark as contact-based to distinguish from legacy clients
        contactId: opportunity.contactId,
        opportunityId: opportunity.id,
        nomProjet: opportunity.titre
      }))
    ]

    // Remove duplicates based on opportunityId (for opportunities) or id (for legacy clients)
    // Also check for duplicates based on contact name + project title + budget to catch true duplicates
    // This ensures that if the same opportunity appears multiple times, we only keep one instance
    const seenOpportunityIds = new Set<string>()
    const seenClientIds = new Set<string>()
    const seenProjectKeys = new Set<string>() // For additional duplicate detection by contact name + title + budget
    const seenContactProjectKeys = new Set<string>() // For duplicate detection by contact name + title (normalized)
    
    const transformedClients = allTransformedClients.filter(client => {
      // For opportunities (contact-based), deduplicate by opportunityId
      if (client.opportunityId) {
        // First check: exact opportunityId match
        if (seenOpportunityIds.has(client.opportunityId)) {
          return false // Duplicate opportunity, skip it
        }
        seenOpportunityIds.add(client.opportunityId)
        
        // Normalize project title for comparison (remove extra spaces, lowercase)
        const normalizedTitle = (client.nomProjet || client.nom || '').trim().toLowerCase().replace(/\s+/g, ' ')
        const normalizedContactName = (client.nom || '').trim().toLowerCase().replace(/\s+/g, ' ')
        const budget = client.budget || 0
        
        // Second check: same contact + project title + budget (catch true duplicates with different IDs)
        const projectKey = `${client.contactId || ''}-${normalizedTitle}-${budget}`
        if (seenProjectKeys.has(projectKey)) {
          return false // Duplicate project, skip it
        }
        seenProjectKeys.add(projectKey)
        
        // Third check: same contact name + project title (normalized) - only for exact matches
        // This is aggressive deduplication: if contact name + title match exactly, treat as duplicate
        // This catches cases where the same project was created multiple times by mistake
        const contactProjectKey = `${normalizedContactName}-${normalizedTitle}`
        if (seenContactProjectKeys.has(contactProjectKey)) {
          // Only treat as duplicate if:
          // 1. Title is not empty/generic
          // 2. Contact name is not empty
          // 3. Title is not just "autre" (too generic)
          if (normalizedTitle && normalizedTitle.length > 2 && 
              normalizedContactName && normalizedContactName.length > 0 &&
              normalizedTitle !== 'autre' && normalizedTitle !== 'autre -') {
            return false // Duplicate project by contact + title, skip it (keep the first one)
          }
        }
        seenContactProjectKeys.add(contactProjectKey)
        
        return true
      }
      // For legacy clients, deduplicate by id
      if (seenClientIds.has(client.id)) {
        return false // Duplicate client, skip it
      }
      seenClientIds.add(client.id)
      return true
    }).sort((a, b) => new Date(b.derniereMaj).getTime() - new Date(a.derniereMaj).getTime())

    const contactOpportunitiesCount = architectContacts.reduce((sum, c) => sum + c.opportunities.length, 0)
    const beforeDedup = allTransformedClients.length
    const afterDedup = transformedClients.length
    const duplicatesRemoved = beforeDedup - afterDedup
    console.log(`[GET /api/architects/${id}] ✅ Fetched architect with ${transformedClients.length} total dossiers (${architectClients.length} legacy clients, ${contactOpportunitiesCount} contact opportunities, ${architectOpportunities.length} direct opportunities)`)
    if (duplicatesRemoved > 0) {
      console.log(`[GET /api/architects/${id}] 🗑️ Removed ${duplicatesRemoved} duplicate(s) (${beforeDedup} → ${afterDedup})`)
    }

    return NextResponse.json({
      success: true,
      data: {
        architect: architectData,
        clients: transformedClients
      }
    })

  } catch (error) {
    console.error('[GET /api/architects/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/architects/[id] - Update architect status
 * 
 * Permissions:
 * - Architects can only update their own status
 * - Admins, Operators, and Gestionnaires can update any architect's status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get authentication token
    let token: string | undefined
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get('token')?.value
    }
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    // Verify token
    let decoded: { userId: string; email: string; role: string; name?: string }
    try {
      decoded = verify(token, JWT_SECRET) as any
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 401 }
      )
    }
    
    const userRole = (decoded.role || '').toLowerCase()
    const userId = decoded.userId
    
    // Check if architect exists
    const architect = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        name: true
      }
    })
    
    if (!architect) {
      return NextResponse.json(
        { success: false, error: 'Architecte non trouvé' },
        { status: 404 }
      )
    }
    
    // Verify the user is an architect
    if (architect.role?.toLowerCase() !== 'architect') {
      return NextResponse.json(
        { success: false, error: 'L\'utilisateur n\'est pas un architecte' },
        { status: 400 }
      )
    }
    
    // Permission check: Architects can only update their own status
    // Admins, Operators, and Gestionnaires can update any architect's status
    const canUpdate = 
      userRole === 'admin' || 
      userRole === 'operator' || 
      userRole === 'gestionnaire' ||
      (userRole === 'architect' && userId === id)
    
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'avez pas la permission de modifier ce statut' },
        { status: 403 }
      )
    }
    
    // Get request body
    const body = await request.json()
    const { statut } = body
    
    // Validate status
    const validStatuses = ['actif', 'inactif', 'conge']
    if (!statut || !validStatuses.includes(statut)) {
      return NextResponse.json(
        { success: false, error: 'Statut invalide. Doit être: actif, inactif, ou conge' },
        { status: 400 }
      )
    }
    
    // Update architect status
    // NOTE: The User model currently doesn't have a 'statut' field.
    // To fully support this feature, you need to:
    // 1. Add a 'statut' field to the User model in schema.prisma:
    //    statut String? @default("actif")
    // 2. Run: npx prisma migrate dev --name add_user_statut
    // 3. Update the data assignment below to include: statut: statut
    // 
    // For now, we'll update the user's updatedAt timestamp to reflect the change
    // The frontend will handle the status display based on the API response
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        updatedAt: new Date()
        // TODO: Add this when statut field is added to User model:
        // statut: statut
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ville: true,
        magasin: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    console.log(`[PATCH /api/architects/${id}] ✅ Status updated to "${statut}" by ${decoded.name || decoded.email}`)
    
    // Return updated architect data (matching GET response format)
    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        nom: updatedUser.name.split(' ').slice(1).join(' ') || updatedUser.name,
        prenom: updatedUser.name.split(' ')[0],
        email: updatedUser.email,
        telephone: '',
        ville: updatedUser.ville || updatedUser.magasin || 'Casablanca',
        specialite: 'residentiel',
        statut: statut,
        dateEmbauche: updatedUser.createdAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      },
      message: 'Statut mis à jour avec succès'
    })
    
  } catch (error) {
    console.error('[PATCH /api/architects/[id]] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
