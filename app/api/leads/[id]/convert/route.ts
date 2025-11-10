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
    
    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    // Check if client already exists for this lead using Supabase
    const { data: existingClients } = await supabase
      .from('clients')
      .select('*')
      .eq('lead_id', leadId)
      .limit(1)
    
    const existingClient = existingClients?.[0]
    
    if (existingClient) {
      console.log(`[Convert Lead] Client already exists for lead ${leadId}. Unlinking leadId to allow reconversion...`)
      
      // Remove the leadId reference from the existing client
      // This allows the lead to be converted again while preserving the old client
      await supabase
        .from('clients')
        .update({ lead_id: null })
        .eq('id', existingClient.id)
      
      console.log(`[Convert Lead] ✅ Unlinked leadId from existing client: ${existingClient.nom}`)
    }
    
    // If lead status is 'converti' but no client exists, allow re-conversion
    if (lead.statut === 'converti') {
      console.log(`[Convert Lead] ⚠️ Lead ${leadId} marked as converti but no client found - allowing re-conversion`)
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
    
    // 1. Create client in database using Supabase (for consistency with GET endpoint)
    console.log(`[Convert Lead] Creating client in database for lead: ${leadId}`)
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        id: clientId,
        nom: lead.nom,
        telephone: lead.telephone,
        ville: lead.ville,
        type_projet: typeProjet,
        architecte_assigne: lead.assignePar,
        statut_projet: 'qualifie', // Start at first stage
        derniere_maj: now,
        lead_id: lead.id, // Link back to original lead
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
      statutProjet: newClient.statut_projet
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
        description: `Client créé depuis lead converti: ${lead.nom}`,
        auteur: userName,
        created_at: now,
        updated_at: now
      })

    // 4. Update lead status to converted with convertedAt timestamp
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        statut: 'converti',
        convertedAt: new Date(),
        derniereMaj: new Date()
      },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    console.log(`[Convert Lead] ✅ Lead ${leadId} marked as converted with timestamp`)
    
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
      lead: updatedLead,
      client: transformedClient,
      message: 'Lead converti avec succès en client. Vous pouvez désormais le suivre dans Clients & Projets.'
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
