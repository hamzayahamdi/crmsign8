import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import { verify } from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface JWTPayload {
  userId: string
  email: string
  role: string
  name?: string
}

async function getUserFromToken(request?: NextRequest): Promise<JWTPayload | null> {
  try {
    let token: string | undefined

    // First, try to get token from Authorization header
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    // Fall back to cookies if no Authorization header
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get('token')?.value
    }

    if (!token) {
      return null
    }

    const decoded = verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('[Architects API] Token verification failed:', error)
    return null
  }
}

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
 * GET /api/architects - Fetch all architect users with their dossier statistics
 * 
 * DOSSIER COUNTING LOGIC (MUST MATCH /api/architects/[id]):
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
export async function GET(request: NextRequest) {
  try {
    // Get current user from token
    const currentUser = await getUserFromToken(request)
    const isArchitect = currentUser?.role?.toLowerCase() === 'architect'
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'operator'

    // Build where clause - architects only see themselves, admins see all
    const whereClause: any = {
      role: 'architect'
    }

    // If user is an architect (not admin), only show their own profile
    if (isArchitect && !isAdmin && currentUser?.userId) {
      whereClause.id = currentUser.userId
      console.log(`[GET /api/architects] Architect user - filtering to own profile: ${currentUser.userId}`)
    } else if (isAdmin) {
      console.log(`[GET /api/architects] Admin user - showing all architects`)
    } else {
      console.log(`[GET /api/architects] No user or unauthorized - returning empty`)
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Fetch users with architect role (filtered by role)
    const architects = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
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

    // Fetch all dossiers from different sources
    const [clients, contacts, opportunities] = await Promise.all([
      // Clients (legacy Client model)
      prisma.client.findMany({
        select: {
          id: true,
          architecteAssigne: true,
          statutProjet: true
        }
      }),
      // Contacts with architect assignment (with their opportunities)
      prisma.contact.findMany({
        where: {
          architecteAssigne: { not: null }
        },
        select: {
          id: true,
          architecteAssigne: true,
          status: true,
          tag: true,
          opportunities: {
            select: {
              id: true,
              statut: true,
              pipelineStage: true
            }
          }
        }
      }),
      // Opportunities with architect assignment
      prisma.opportunity.findMany({
        where: {
          architecteAssigne: { not: null }
        },
        select: {
          id: true,
          architecteAssigne: true,
          statut: true,
          pipelineStage: true
        }
      })
    ])

    // Calculate statistics for each architect
    const architectsWithStats = architects.map(architect => {
      const architectName = architect.name

      // Find all dossiers assigned to this architect
      const architectClients = clients.filter(client =>
        isAssignedToArchitect(client.architecteAssigne, architect.id, architectName)
      )

      const architectContacts = contacts.filter(contact =>
        isAssignedToArchitect(contact.architecteAssigne, architect.id, architectName)
      )

      // Get all opportunity IDs that are already included in contacts
      const contactOpportunityIds = new Set(
        architectContacts.flatMap(contact => contact.opportunities.map(opp => opp.id))
      )

      // Filter out opportunities that are already included in contacts to avoid duplicates
      const architectOpportunities = opportunities.filter(opportunity =>
        isAssignedToArchitect(opportunity.architecteAssigne, architect.id, architectName) &&
        !contactOpportunityIds.has(opportunity.id)
      )

      // Combine all dossiers - IMPORTANT: Count opportunities within contacts, not contacts themselves
      // A contact can have multiple opportunities (projects), so each opportunity is a dossier
      const allDossiers = [
        ...architectClients.map(c => ({ type: 'client' as const, statut: c.statutProjet })),
        // Extract all opportunities from contacts - each opportunity is a separate dossier
        // IMPORTANT: projet_accepte means devis accepté, so it should map to 'accepte' (PROJET EN COURS)
        // acompte_recu means deposit received but devis not yet accepted (PROJET EN ATTENTE)
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

      const totalDossiers = allDossiers.length

      // Categorize dossiers by status (exclude null/refused/lost projects)
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

      // Calculate disponible status: available if less than 10 active dossiers
      const isDisponible = dossiersEnCours < 10

      return {
        id: architect.id,
        nom: architect.name.split(' ').slice(1).join(' ') || architect.name,
        prenom: architect.name.split(' ')[0],
        email: architect.email,
        telephone: '', // Can be extended in User model
        ville: architect.ville || architect.magasin || 'Casablanca',
        specialite: 'residentiel', // Default, can be extended in User model
        statut: isDisponible ? 'actif' : 'actif', // Can be extended to show disponible status
        dateEmbauche: architect.createdAt,
        createdAt: architect.createdAt,
        updatedAt: architect.updatedAt,
        // Statistics
        totalDossiers,
        dossiersEnCours,
        dossiersTermines,
        dossiersEnAttente,
        isDisponible, // New field to indicate availability
        // Breakdown by source
        clientsCount: architectClients.length,
        contactsCount: architectContacts.reduce((sum, c) => sum + c.opportunities.length, 0), // Count opportunities within contacts
        opportunitiesCount: architectOpportunities.length
      }
    })

    console.log(`[GET /api/architects] ✅ Fetched ${architectsWithStats.length} architects with comprehensive statistics`)

    return NextResponse.json({
      success: true,
      data: architectsWithStats
    })

  } catch (error) {
    console.error('[GET /api/architects] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
