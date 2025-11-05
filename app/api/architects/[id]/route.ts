import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/architects/[id] - Fetch single architect with their clients
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

    // Fetch all clients assigned to this architect
    const architectName = architect.name.toLowerCase()
    
    const allClients = await prisma.client.findMany({
      orderBy: {
        derniereMaj: 'desc'
      }
    })

    // Filter clients for this architect
    const architectClients = allClients.filter(client => {
      const assigned = (client.architecteAssigne || '').toLowerCase()
      return assigned.includes(architectName) || assigned === architectName
    })

    // Calculate statistics
    const totalDossiers = architectClients.length
    const dossiersEnCours = architectClients.filter(c => 
      c.statutProjet !== "termine" && 
      c.statutProjet !== "livraison" && 
      c.statutProjet !== "livraison_termine" &&
      c.statutProjet !== "annule" &&
      c.statutProjet !== "refuse"
    ).length
    const dossiersTermines = architectClients.filter(c => 
      c.statutProjet === "termine" || 
      c.statutProjet === "livraison_termine"
    ).length
    const dossiersEnAttente = architectClients.filter(c => 
      c.statutProjet === "nouveau" || 
      c.statutProjet === "qualifie"
    ).length

    const architectData = {
      id: architect.id,
      nom: architect.name.split(' ').slice(1).join(' ') || architect.name,
      prenom: architect.name.split(' ')[0],
      email: architect.email,
      telephone: '', // Can be extended in User model
      ville: architect.magasin || 'Casablanca',
      specialite: 'residentiel',
      statut: 'actif',
      dateEmbauche: architect.createdAt,
      createdAt: architect.createdAt,
      updatedAt: architect.updatedAt,
      // Statistics
      totalDossiers,
      dossiersEnCours,
      dossiersTermines,
      dossiersEnAttente
    }

    // Transform clients to match frontend format
    const transformedClients = architectClients.map(client => ({
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
      updatedAt: client.updatedAt.toISOString()
    }))

    console.log(`[GET /api/architects/${id}] ✅ Fetched architect with ${transformedClients.length} clients`)

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
