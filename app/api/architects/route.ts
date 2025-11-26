import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/architects - Fetch all architect users with their client statistics
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

    // Fetch all clients to calculate statistics
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        architecteAssigne: true,
        statutProjet: true
      }
    })

    // Calculate statistics for each architect
    const architectsWithStats = architects.map(architect => {
      const architectName = architect.name.toLowerCase()
      
      // Find all clients assigned to this architect
      const architectClients = clients.filter(client => {
        const assigned = (client.architecteAssigne || '').toLowerCase()
        return assigned.includes(architectName) || assigned === architectName
      })

      const totalDossiers = architectClients.length
      
      // Calculate dossiers en cours (excluding terminated, cancelled, refused)
      const dossiersEnCours = architectClients.filter(c => 
        c.statutProjet !== "termine" && 
        c.statutProjet !== "livraison" && 
        c.statutProjet !== "livraison_termine" &&
        c.statutProjet !== "annule" &&
        c.statutProjet !== "refuse"
      ).length

      // Calculate dossiers terminés
      const dossiersTermines = architectClients.filter(c => 
        c.statutProjet === "termine" || 
        c.statutProjet === "livraison_termine"
      ).length

      // Calculate dossiers en attente
      const dossiersEnAttente = architectClients.filter(c => 
        c.statutProjet === "nouveau" || 
        c.statutProjet === "qualifie"
      ).length

      return {
        id: architect.id,
        nom: architect.name.split(' ').slice(1).join(' ') || architect.name,
        prenom: architect.name.split(' ')[0],
        email: architect.email,
        telephone: '', // Can be extended in User model
        ville: architect.ville || 'Casablanca',
        specialite: 'residentiel', // Default, can be extended in User model
        statut: 'actif', // Default, can be extended in User model
        dateEmbauche: architect.createdAt,
        createdAt: architect.createdAt,
        updatedAt: architect.updatedAt,
        // Statistics
        totalDossiers,
        dossiersEnCours,
        dossiersTermines,
        dossiersEnAttente
      }
    })

    console.log(`[GET /api/architects] ✅ Fetched ${architectsWithStats.length} architects with statistics`)

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
