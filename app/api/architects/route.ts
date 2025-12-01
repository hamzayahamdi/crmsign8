import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"

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
 */
function getDossierStatusCategory(statut: string): 'en_cours' | 'termine' | 'en_attente' {
  // Terminés - completed projects
  if (
    statut === 'termine' ||
    statut === 'livraison_termine' ||
    statut === 'livraison'
  ) {
    return 'termine'
  }

  // En attente - new or qualified projects waiting to start
  if (
    statut === 'nouveau' ||
    statut === 'qualifie' ||
    statut === 'prise_de_besoin'
  ) {
    return 'en_attente'
  }

  // En cours - all active projects (default)
  // Includes: acompte_recu, conception, devis_negociation, accepte, premier_depot, 
  // projet_en_cours, chantier, facture_reglee, en_conception, en_validation, en_chantier
  return 'en_cours'
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
    // Fetch all users with architect role
    const architects = await prisma.user.findMany({
      where: {
        role: 'architect'
      },
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
        ...architectContacts.flatMap(c =>
          c.opportunities.map(o => ({
            type: 'contact_opportunity' as const,
            statut: o.pipelineStage === 'perdue' ? 'perdu' :
              o.pipelineStage === 'gagnee' ? 'termine' :
                o.pipelineStage === 'acompte_recu' ? 'acompte_recu' :
                  o.pipelineStage === 'prise_de_besoin' ? 'prise_de_besoin' :
                    o.pipelineStage === 'projet_accepte' ? 'acompte_recu' :
                      'projet_en_cours'
          }))
        ),
        ...architectOpportunities.map(o => ({
          type: 'opportunity' as const,
          statut: o.statut === 'won' ? 'termine' : o.statut === 'lost' ? 'perdu' :
            o.pipelineStage === 'perdue' ? 'perdu' :
              o.pipelineStage === 'gagnee' ? 'termine' :
                o.pipelineStage === 'projet_accepte' ? 'acompte_recu' :
                  'projet_en_cours'
        }))
      ]

      const totalDossiers = allDossiers.length

      // Categorize dossiers by status
      const dossiersEnCours = allDossiers.filter(d =>
        getDossierStatusCategory(d.statut) === 'en_cours'
      ).length

      const dossiersTermines = allDossiers.filter(d =>
        getDossierStatusCategory(d.statut) === 'termine'
      ).length

      const dossiersEnAttente = allDossiers.filter(d =>
        getDossierStatusCategory(d.statut) === 'en_attente'
      ).length

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
