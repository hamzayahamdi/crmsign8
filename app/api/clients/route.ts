import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

// Generate CUID-like ID (compatible with Prisma's cuid())
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * GET /api/clients - Fetch all clients from database
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      )
    }
    
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')
    
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for leadId query parameter
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    // Fetch clients from database (optionally filtered by leadId)
    let query = supabase
      .from('clients')
      .select('*')
    
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }
    
    const { data: clients, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/clients] Error:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des clients' },
        { status: 500 }
      )
    }

    // Transform snake_case to camelCase for frontend
    const transformedClients = clients.map(client => ({
      id: client.id,
      nom: client.nom,
      telephone: client.telephone,
      ville: client.ville,
      typeProjet: client.type_projet,
      architecteAssigne: client.architecte_assigne,
      statutProjet: client.statut_projet,
      derniereMaj: client.derniere_maj,
      leadId: client.lead_id,
      email: client.email,
      adresse: client.adresse,
      budget: client.budget,
      notes: client.notes,
      magasin: client.magasin,
      commercialAttribue: client.commercial_attribue,
      createdAt: client.created_at,
      updatedAt: client.updated_at
    }))

    console.log(`[GET /api/clients] ✅ Fetched ${transformedClients.length} clients from database`)

    return NextResponse.json({
      success: true,
      data: transformedClients
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
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      )
    }
    
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date().toISOString()
    const clientId = generateCuid()

    // Create client in database
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        id: clientId,
        nom,
        telephone,
        ville,
        type_projet: typeProjet,
        architecte_assigne: architecteAssigne,
        statut_projet: statutProjet,
        derniere_maj: now,
        lead_id: leadId || null,
        email: email || null,
        adresse: adresse || null,
        budget: budget || null,
        notes: notes || null,
        magasin: magasin || null,
        commercial_attribue: commercialAttribue || null,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/clients] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du client' },
        { status: 500 }
      )
    }

    // Create initial stage history
    await supabase
      .from('client_stage_history')
      .insert({
        client_id: newClient.id,
        stage_name: statutProjet,
        started_at: now,
        ended_at: null,
        changed_by: commercialAttribue || 'Système',
        created_at: now,
        updated_at: now
      })

    // Add to historique
    await supabase
      .from('historique')
      .insert({
        client_id: newClient.id,
        date: now,
        type: 'note',
        description: 'Client créé',
        auteur: commercialAttribue || 'Système',
        created_at: now,
        updated_at: now
      })

    // Transform response
    const transformedClient = {
      id: newClient.id,
      nom: newClient.nom,
      telephone: newClient.telephone,
      ville: newClient.ville,
      typeProjet: newClient.type_projet,
      architecteAssigne: newClient.architecte_assigne,
      statutProjet: newClient.statut_projet,
      derniereMaj: newClient.derniere_maj,
      leadId: newClient.lead_id,
      email: newClient.email,
      adresse: newClient.adresse,
      budget: newClient.budget,
      notes: newClient.notes,
      magasin: newClient.magasin,
      commercialAttribue: newClient.commercial_attribue,
      createdAt: newClient.created_at,
      updatedAt: newClient.updated_at
    }

    console.log(`[POST /api/clients] ✅ Created client: ${newClient.id}`)

    return NextResponse.json({
      success: true,
      data: transformedClient
    })

  } catch (error) {
    console.error('[POST /api/clients] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
