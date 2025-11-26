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
  return 'en_cours'
}

/**
 * GET /api/architects/[id] - Fetch single architect with all their dossiers
 * Now includes Clients, Contacts, and Opportunities
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch architect user
    const architect = await prisma.user.findUnique({
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

    if (!architect) {
      return NextResponse.json(
        { error: 'Architecte non trouvé' },
        { status: 404 }
      )
    }

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
              budget: true
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
    
    const architectOpportunities = allOpportunities.filter(opportunity => 
      isAssignedToArchitect(opportunity.architecteAssigne, architect.id, architectName)
    )

    // Combine all dossiers for statistics
    const allDossiers = [
      ...architectClients.map(c => ({ type: 'client' as const, statut: c.statutProjet })),
      ...architectContacts.map(c => ({ 
        type: 'contact' as const, 
        statut: c.status === 'perdu' ? 'perdu' : c.tag === 'client' ? 'en_cours' : 'en_attente' 
      })),
      ...architectOpportunities.map(o => ({ 
        type: 'opportunity' as const, 
        statut: o.statut === 'won' ? 'termine' : o.statut === 'lost' ? 'perdu' : 
               o.pipelineStage === 'perdue' ? 'perdu' : 
               o.pipelineStage === 'gagnee' ? 'termine' : 'en_cours'
      }))
    ]

    // Calculate statistics
    const totalDossiers = allDossiers.length
    const dossiersEnCours = allDossiers.filter(d => 
      getDossierStatusCategory(d.statut) === 'en_cours'
    ).length
    const dossiersTermines = allDossiers.filter(d => 
      getDossierStatusCategory(d.statut) === 'termine'
    ).length
    const dossiersEnAttente = allDossiers.filter(d => 
      getDossierStatusCategory(d.statut) === 'en_attente'
    ).length

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
      contactsCount: architectContacts.length,
      opportunitiesCount: architectOpportunities.length
    }

    // Transform clients to match frontend format (for backward compatibility)
    // Also include contacts and opportunities as "clients" for the detail page
    const transformedClients = [
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
      // Contacts (as clients for display)
      ...architectContacts.map(contact => ({
        id: contact.id,
        nom: contact.nom,
        telephone: contact.telephone,
        ville: contact.ville || '',
        typeProjet: 'autre' as const,
        architecteAssigne: contact.architecteAssigne || '',
        statutProjet: contact.status === 'perdu' ? 'perdu' : 
                     contact.tag === 'client' ? 'en_cours' : 'qualifie',
        derniereMaj: contact.updatedAt.toISOString(),
        leadId: contact.leadId || undefined,
        email: contact.email || undefined,
        adresse: contact.adresse || undefined,
        budget: 0,
        notes: contact.notes || undefined,
        magasin: contact.magasin || undefined,
        commercialAttribue: undefined,
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString(),
        isContact: true,
        contactId: contact.id,
        opportunityId: undefined
      })),
      // Opportunities (as clients for display)
      ...architectOpportunities.map(opportunity => ({
        id: opportunity.id,
        nom: opportunity.contact.nom,
        telephone: opportunity.contact.telephone,
        ville: opportunity.contact.ville || '',
        typeProjet: opportunity.type as any,
        architecteAssigne: opportunity.architecteAssigne || '',
        statutProjet: opportunity.statut === 'won' ? 'termine' : 
                     opportunity.statut === 'lost' ? 'perdu' :
                     opportunity.pipelineStage === 'perdue' ? 'perdu' :
                     opportunity.pipelineStage === 'gagnee' ? 'termine' :
                     opportunity.pipelineStage === 'acompte_recu' ? 'acompte_recu' :
                     opportunity.pipelineStage === 'prise_de_besoin' ? 'prise_de_besoin' :
                     'en_cours',
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
        isContact: false,
        contactId: opportunity.contactId,
        opportunityId: opportunity.id,
        nomProjet: opportunity.titre
      }))
    ].sort((a, b) => new Date(b.derniereMaj).getTime() - new Date(a.derniereMaj).getTime())

    console.log(`[GET /api/architects/${id}] ✅ Fetched architect with ${transformedClients.length} total dossiers (${architectClients.length} clients, ${architectContacts.length} contacts, ${architectOpportunities.length} opportunities)`)

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
