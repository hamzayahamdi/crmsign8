import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'
import { verify } from 'jsonwebtoken'
import { randomBytes } from 'crypto'

// Generate CUID-like ID (compatible with Prisma's cuid())
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// POST /api/leads/[id]/convert - Convert lead to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const leadId = resolvedParams.id
    
    // Get architect ID from request body
    const body = await request.json().catch(() => ({}))
    const architectId = body.architectId
    
    // Verify JWT - Admin only
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    let userName = 'Admin'
    try {
      const decoded = verify(token, JWT_SECRET) as any
      const role = (decoded.role || '').toLowerCase()
      userName = decoded.name || 'Admin'
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
      }
    } catch (_) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Initialize Supabase client early for all operations
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the lead with all notes for complete data preservation
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    // Check if client already exists for this lead
    const { data: existingClients } = await supabase
      .from('clients')
      .select('*')
      .eq('lead_id', leadId)
      .limit(1)
    
    if (existingClients && existingClients.length > 0) {
      return NextResponse.json(
        { error: 'Ce lead a déjà été converti en client' },
        { status: 400 }
      )
    }
    
    // Store complete lead data for potential restoration
    const leadDataForRestoration = {
      id: lead.id,
      nom: lead.nom,
      telephone: lead.telephone,
      ville: lead.ville,
      typeBien: lead.typeBien,
      statut: lead.statut,
      statutDetaille: lead.statutDetaille,
      message: lead.message,
      assignePar: lead.assignePar,
      source: lead.source,
      priorite: lead.priorite,
      magasin: lead.magasin,
      commercialMagasin: lead.commercialMagasin,
      month: lead.month,
      campaignName: lead.campaignName,
      uploadedAt: lead.uploadedAt,
      createdBy: lead.createdBy,
      createdAt: lead.createdAt,
      notes: lead.notes
    }
    
    // Map lead typeBien to client typeProjet enum
    const typeMapping: Record<string, any> = {
      'Appartement': 'appartement',
      'Villa': 'villa',
      'Magasin': 'magasin',
      'Bureau': 'bureau',
      'Riad': 'riad',
      'Studio': 'studio',
      'Autre': 'autre',
      // Lowercase versions
      'appartement': 'appartement',
      'villa': 'villa',
      'magasin': 'magasin',
      'bureau': 'bureau',
      'riad': 'riad',
      'studio': 'studio',
      'autre': 'autre'
    }
    
    const typeProjet = typeMapping[lead.typeBien] || 'autre'
    console.log(`[Convert Lead] Mapping typeBien "${lead.typeBien}" to typeProjet "${typeProjet}"`)
    
    const now = new Date().toISOString()
    const clientId = generateCuid()
    
    // Fetch architect name if architectId is provided
    let architectName = lead.assignePar // Default to lead's original assignment
    if (architectId) {
      try {
        const architect = await prisma.user.findUnique({
          where: { id: architectId },
          select: { name: true }
        })
        if (architect) {
          architectName = architect.name
          console.log(`[Convert Lead] Architect found: ${architectName} (ID: ${architectId})`)
        } else {
          console.warn(`[Convert Lead] Architect ID ${architectId} not found, using default`)
        }
      } catch (error) {
        console.error(`[Convert Lead] Error fetching architect:`, error)
      }
    }
    
    // 1. Create client in database with complete lead data for restoration
    console.log(`[Convert Lead] Creating client in database for lead: ${leadId} with architect: ${architectName}`)
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        id: clientId,
        nom: lead.nom,
        telephone: lead.telephone,
        ville: lead.ville,
        type_projet: typeProjet,
        architecte_assigne: architectName,
        statut_projet: 'qualifie', // Start at first stage
        derniere_maj: now,
        lead_id: lead.id, // Link back to original lead ID
        lead_data: leadDataForRestoration, // Store complete lead data for restoration
        notes: lead.message || null,
        magasin: lead.magasin || null,
        commercial_attribue: lead.createdBy || userName,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Convert Lead] ❌ Insert error:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du client', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`[Convert Lead] ✅ Client created in database:`, {
      id: newClient.id,
      nom: newClient.nom,
      typeProjet: newClient.type_projet,
      statutProjet: newClient.statut_projet,
      leadDataStored: !!newClient.lead_data
    })

    // 2. Create initial stage history for the client
    await supabase
      .from('client_stage_history')
      .insert({
        client_id: newClient.id,
        stage_name: 'qualifie',
        started_at: now,
        ended_at: null,
        changed_by: userName,
        created_at: now,
        updated_at: now
      })

    // 3. Add to historique
    await supabase
      .from('historique')
      .insert({
        client_id: newClient.id,
        date: now,
        type: 'note',
        description: `Client créé depuis lead converti: ${lead.nom} (Source: ${lead.source})`,
        auteur: userName,
        created_at: now,
        updated_at: now
      })

    // 4. DELETE the lead from the database (true migration - no duplication)
    // The lead data is preserved in client.lead_data for restoration if needed
    await prisma.lead.delete({
      where: { id: leadId }
    })

    console.log(`[Convert Lead] ✅ Lead ${leadId} deleted from leads table (migrated to client)`)
    
    // Transform client response to camelCase for frontend consistency
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
    
    return NextResponse.json({
      success: true,
      client: transformedClient,
      message: 'Lead converti avec succès en client et migré. Vous pouvez désormais le suivre dans Clients & Projets.'
    })
  } catch (error) {
    console.error('[Convert Lead] ❌ Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to convert lead',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
