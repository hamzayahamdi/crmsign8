import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * GET /api/clients/[id] - Fetch single client with all related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: clientId } = await params
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    // Fetch related data in parallel
    const [
      { data: historique },
      { data: appointments },
      { data: devis },
      { data: documents },
      { data: payments },
      { data: currentStage }
    ] = await Promise.all([
      supabase.from('historique').select('*').eq('client_id', clientId).order('date', { ascending: false }),
      supabase.from('appointments').select('*').eq('client_id', clientId).order('date_start', { ascending: false }),
      supabase.from('devis').select('*').eq('client_id', clientId).order('date', { ascending: false }),
      supabase.from('documents').select('*').eq('client_id', clientId).order('uploaded_at', { ascending: false }),
      supabase.from('payments').select('*').eq('client_id', clientId).order('date', { ascending: false }),
      // Fetch current stage from stage history (source of truth)
      supabase.from('client_stage_history')
        .select('stage_name')
        .eq('client_id', clientId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
    ])

    // Prepare lead data & notes (include legacy lead notes for complete history)
    let parsedLeadData: any = null
    let leadNotesFromLeadData: any[] = []

    if (client.lead_data) {
      try {
        parsedLeadData = typeof client.lead_data === 'string'
          ? JSON.parse(client.lead_data)
          : client.lead_data

        if (Array.isArray(parsedLeadData?.notes)) {
          leadNotesFromLeadData = parsedLeadData.notes
        }
      } catch (error) {
        console.error('[GET /api/clients/[id]] Failed to parse lead_data JSON:', error)
      }
    }

    let leadNotesFromTable: any[] = []
    if (client.lead_id) {
      try {
        const { data: leadNotesData, error: leadNotesError } = await supabase
          .from('lead_notes')
          .select('*')
          .eq('leadId', client.lead_id)
          .order('createdAt', { ascending: false })

        if (leadNotesError) {
          console.warn('[GET /api/clients/[id]] Failed to fetch lead notes from table:', leadNotesError)
        } else if (leadNotesData) {
          leadNotesFromTable = leadNotesData
        }
      } catch (error) {
        console.error('[GET /api/clients/[id]] Unexpected error when fetching lead notes:', error)
      }
    }

    const leadNotesMap = new Map<string, any>()
    const mergeLeadNote = (note: any) => {
      if (!note) return
      const rawKey = note.id ?? note.noteId ?? note.createdAt ?? note.created_at
      const key = typeof rawKey === 'string' && rawKey.trim().length > 0
        ? rawKey
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      if (!leadNotesMap.has(key)) {
        leadNotesMap.set(key, note)
      }
    }

    leadNotesFromLeadData.forEach(mergeLeadNote)
    leadNotesFromTable.forEach(mergeLeadNote)

    const mergedLeadNotes = Array.from(leadNotesMap.values())

    const leadHistoriqueEntries = mergedLeadNotes
      .map((note) => {
        const rawDate =
          note.createdAt ??
          note.created_at ??
          note.date ??
          note.timestamp ??
          null

        const dateObj = rawDate ? new Date(rawDate) : null
        const isoDate = dateObj && !Number.isNaN(dateObj.getTime())
          ? dateObj.toISOString()
          : null

        const description = note.content ?? note.description ?? ''
        const auteur = note.author ?? note.auteur ?? 'Lead'

        if (!isoDate || !description) {
          return null
        }

        const historyIdBase = note.id ?? note.noteId ?? isoDate
        const historyId = `lead-note-${historyIdBase}`

        return {
          id: historyId,
          date: isoDate,
          type: 'note' as const,
          description,
          auteur,
          metadata: {
            source: 'lead',
            leadNoteId: note.id ?? null,
            leadId: note.leadId ?? note.lead_id ?? client.lead_id ?? null
          }
        }
      })
      .filter((entry): entry is {
        id: string
        date: string
        type: 'note'
        description: string
        auteur: string
        metadata: Record<string, any>
      } => Boolean(entry))

    // Use stage from history as source of truth, fallback to client.statut_projet
    const actualStatus = currentStage?.stage_name || client.statut_projet

    console.log('[GET /api/clients/[id]] Status resolution:', {
      clientId,
      fromHistory: currentStage?.stage_name,
      fromClient: client.statut_projet,
      using: actualStatus
    })

    // Transform to frontend format
    const supabaseHistorique = (historique || []).map(h => ({
      id: h.id,
      date: h.date,
      type: h.type,
      description: h.description,
      auteur: h.auteur,
      previousStatus: h.previous_status,
      newStatus: h.new_status,
      durationInHours: h.duration_in_hours,
      timestampStart: h.timestamp_start,
      timestampEnd: h.timestamp_end,
      metadata: h.metadata
    }))

    const combinedHistorique = [...supabaseHistorique, ...leadHistoriqueEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const transformedClient = {
      id: client.id,
      nom: client.nom,
      telephone: client.telephone,
      ville: client.ville,
      typeProjet: client.type_projet,
      architecteAssigne: client.architecte_assigne,
      statutProjet: actualStatus,
      derniereMaj: client.derniere_maj,
      leadId: client.lead_id,
      leadData: parsedLeadData,
      email: client.email,
      adresse: client.adresse,
      budget: client.budget,
      notes: client.notes,
      magasin: client.magasin,
      commercialAttribue: client.commercial_attribue,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      historique: combinedHistorique,
      rendezVous: appointments?.map(a => ({
        id: a.id,
        title: a.title,
        dateStart: a.date_start,
        dateEnd: a.date_end,
        description: a.description,
        location: a.location,
        locationUrl: a.location_url,
        status: a.status,
        clientId: a.client_id,
        clientName: a.client_name,
        architecteId: a.architecte_id,
        notes: a.notes,
        createdBy: a.created_by,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      })) || [],
      devis: devis?.map(d => ({
        id: d.id,
        title: d.title,
        montant: d.montant,
        date: d.date,
        statut: d.statut,
        facture_reglee: d.facture_reglee,
        description: d.description,
        fichier: d.fichier,
        createdBy: d.created_by,
        createdAt: d.created_at,
        validatedAt: d.validated_at,
        notes: d.notes
      })) || [],
      documents: await Promise.all((documents || []).map(async (d) => {
        // Generate signed URL for each document
        let signedUrl = null
        try {
          const { data: signed } = await supabase.storage
            .from(d.bucket || 'documents')
            .createSignedUrl(d.path, 60 * 60 * 24 * 7) // 7 days
          signedUrl = signed?.signedUrl || null
        } catch (err) {
          console.error('[Documents] Failed to generate signed URL:', err)
        }
        
        return {
          id: d.id,
          name: d.name,
          type: d.type,
          size: d.size,
          category: d.category,
          uploadedBy: d.uploaded_by,
          uploadedAt: d.uploaded_at,
          url: signedUrl,
          path: d.path,
          bucket: d.bucket
        }
      })),
      payments: payments?.map(p => ({
        id: p.id,
        amount: p.montant,
        date: p.date,
        method: p.methode,
        reference: p.reference,
        notes: p.description,
        createdBy: p.created_by,
        createdAt: p.created_at
      })) || []
    }

    return NextResponse.json({
      success: true,
      data: transformedClient
    })

  } catch (error) {
    console.error('[GET /api/clients/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clients/[id] - Update client
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: clientId } = await params
    const body = await request.json()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date().toISOString()

    // Build update object (convert camelCase to snake_case)
    const updateData: any = {
      updated_at: now,
      derniere_maj: now
    }

    if (body.nom !== undefined) updateData.nom = body.nom
    if (body.telephone !== undefined) updateData.telephone = body.telephone
    if (body.ville !== undefined) updateData.ville = body.ville
    if (body.typeProjet !== undefined) updateData.type_projet = body.typeProjet
    if (body.architecteAssigne !== undefined) updateData.architecte_assigne = body.architecteAssigne
    if (body.email !== undefined) updateData.email = body.email
    if (body.adresse !== undefined) updateData.adresse = body.adresse
    if (body.budget !== undefined) updateData.budget = body.budget
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.magasin !== undefined) updateData.magasin = body.magasin
    if (body.commercialAttribue !== undefined) updateData.commercial_attribue = body.commercialAttribue

    // Update client
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/clients/[id]] Update error:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du client' },
        { status: 500 }
      )
    }

    // Transform response
    const transformedClient = {
      id: updatedClient.id,
      nom: updatedClient.nom,
      telephone: updatedClient.telephone,
      ville: updatedClient.ville,
      typeProjet: updatedClient.type_projet,
      architecteAssigne: updatedClient.architecte_assigne,
      statutProjet: updatedClient.statut_projet,
      derniereMaj: updatedClient.derniere_maj,
      leadId: updatedClient.lead_id,
      email: updatedClient.email,
      adresse: updatedClient.adresse,
      budget: updatedClient.budget,
      notes: updatedClient.notes,
      magasin: updatedClient.magasin,
      commercialAttribue: updatedClient.commercial_attribue,
      createdAt: updatedClient.created_at,
      updatedAt: updatedClient.updated_at
    }

    console.log(`[PATCH /api/clients/[id]] ✅ Updated client: ${clientId}`)

    return NextResponse.json({
      success: true,
      data: transformedClient
    })

  } catch (error) {
    console.error('[PATCH /api/clients/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[id] - Delete client and restore lead if it was converted
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: clientId } = await params
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // First, fetch the client to check if it has leadData for restoration
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      console.error('[DELETE /api/clients/[id]] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    let restoredLead = null

    // If client has leadData, restore the lead before deleting the client
    if (client.lead_data && client.lead_id) {
      console.log(`[DELETE /api/clients/[id]] 🔄 Restoring lead from client data...`)
      
      try {
        const leadData = client.lead_data as any
        
        // Restore the lead with all original data
        // IMPORTANT: Status is reset to 'nouveau' (not 'converti') because:
        // 1. Lead is no longer a client, so 'converti' status would be misleading
        // 2. 'nouveau' gives it a fresh start and requires re-qualification
        // 3. This prevents confusion in the leads table
        restoredLead = await prisma.lead.create({
          data: {
            id: leadData.id,
            nom: leadData.nom,
            telephone: leadData.telephone,
            ville: leadData.ville,
            typeBien: leadData.typeBien,
            statut: 'nouveau', // Reset to 'nouveau' - lead gets fresh start after client deletion
            statutDetaille: '🔄 Lead restauré après suppression du client - À requalifier',
            message: leadData.message,
            assignePar: leadData.assignePar,
            source: leadData.source,
            priorite: leadData.priorite,
            magasin: leadData.magasin,
            commercialMagasin: leadData.commercialMagasin,
            month: leadData.month,
            campaignName: leadData.campaignName,
            uploadedAt: leadData.uploadedAt ? new Date(leadData.uploadedAt) : null,
            convertedAt: null, // Clear conversion timestamp - no longer converted
            createdBy: leadData.createdBy,
            createdAt: leadData.createdAt ? new Date(leadData.createdAt) : new Date(),
            derniereMaj: new Date() // Update to current time
          }
        })

        // Restore lead notes if they exist
        if (leadData.notes && Array.isArray(leadData.notes)) {
          await prisma.leadNote.createMany({
            data: leadData.notes.map((note: any) => ({
              id: note.id,
              leadId: leadData.id,
              content: note.content,
              author: note.author,
              createdAt: note.createdAt ? new Date(note.createdAt) : new Date()
            }))
          })
        }

        console.log(`[DELETE /api/clients/[id]] ✅ Lead restored: ${restoredLead.id}`)
      } catch (restoreError) {
        console.error('[DELETE /api/clients/[id]] ❌ Failed to restore lead:', restoreError)
        // Continue with client deletion even if lead restoration fails
      }
    }

    // Delete client (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (deleteError) {
      console.error('[DELETE /api/clients/[id]] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du client' },
        { status: 500 }
      )
    }

    console.log(`[DELETE /api/clients/[id]] ✅ Deleted client: ${clientId}`)

    return NextResponse.json({
      success: true,
      message: restoredLead 
        ? 'Client supprimé et lead restauré avec succès' 
        : 'Client supprimé avec succès',
      restoredLead: restoredLead ? {
        id: restoredLead.id,
        nom: restoredLead.nom,
        statut: restoredLead.statut
      } : null
    })

  } catch (error) {
    console.error('[DELETE /api/clients/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
