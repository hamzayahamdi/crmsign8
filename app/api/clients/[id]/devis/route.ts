import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Generate CUID-like ID
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET /api/clients/[id]/devis - Fetch all devis for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all devis for this client
    const { data: devisList, error } = await supabase
      .from('devis')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })

    if (error) {
      console.error('[Get Devis] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch devis', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: devisList || []
    })
  } catch (error: any) {
    console.error('[Get Devis] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/devis - Add a devis to a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const body = await request.json()

    console.log('[Add Devis] Request for client:', clientId)
    console.log('[Add Devis] Devis data:', body)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify client exists
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, nom')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      console.error('[Add Devis] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // 2. Insert new devis into devis table
    const now = new Date().toISOString()
    const devisId = generateCuid() // Generate unique ID
    
    const { data: newDevis, error: insertError } = await supabase
      .from('devis')
      .insert({
        id: devisId,
        client_id: clientId,
        title: body.title,
        montant: parseFloat(body.montant) || 0,
        description: body.description || '',
        statut: body.statut || 'en_attente',
        created_by: body.createdBy || 'Utilisateur',
        validated_at: body.statut === 'accepte' || body.statut === 'refuse' ? now : null,
        facture_reglee: false, // Always set to false by default when creating a new devis
        date: now,
        updated_at: now,
        notes: body.notes || null,
        fichier: body.fichier || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Add Devis] Insert error:', insertError)
      console.error('[Add Devis] Error details:', JSON.stringify(insertError, null, 2))
      return NextResponse.json(
        { error: 'Failed to add devis', details: insertError.message },
        { status: 500 }
      )
    }

    // 3. Update client's derniere_maj
    await supabase
      .from('clients')
      .update({
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)

    // 4. Check if we need to auto-update project status for newly created devis
    let stageProgressed = false
    let newStage = null
    
    if (body.statut === 'accepte') {
      // If creating an accepted devis, ensure we're at least at "accepte" stage
      const { data: clientData } = await supabase
        .from('clients')
        .select('statut_projet')
        .eq('id', clientId)
        .single()
      
      // Include 'refuse' to allow recovery from refused state
      const earlyStages = ['qualifie', 'acompte_recu', 'conception', 'devis_negociation', 'refuse']
      
      if (clientData && earlyStages.includes(clientData.statut_projet)) {
        console.log('[Add Devis] Accepted devis created, auto-progressing to "accepte" stage')
        
        // Get current stage from history
        const { data: currentStageHistory } = await supabase
          .from('client_stage_history')
          .select('stage_name, started_at')
          .eq('client_id', clientId)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()
        
        // Close current stage
        if (currentStageHistory) {
          const startedAt = new Date(currentStageHistory.started_at || now)
          const endedAt = new Date(now)
          const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
          
          await supabase
            .from('client_stage_history')
            .update({
              ended_at: now,
              duration_seconds: durationSeconds,
              updated_at: now
            })
            .eq('client_id', clientId)
            .is('ended_at', null)
        }
        
        // Create new stage entry for "accepte"
        const crypto = require('crypto')
        const stageId = crypto.randomUUID()
        
        await supabase
          .from('client_stage_history')
          .insert({
            id: stageId,
            client_id: clientId,
            stage_name: 'accepte',
            started_at: now,
            ended_at: null,
            duration_seconds: null,
            changed_by: body.createdBy || 'Système',
            created_at: now,
            updated_at: now
          })
        
        // Update client's statut_projet
        await supabase
          .from('clients')
          .update({
            statut_projet: 'accepte',
            derniere_maj: now,
            updated_at: now
          })
          .eq('id', clientId)
        
        // Add to historique with devis info
        const devisTitle = body.title || `Devis n°${devisId.slice(-6)}`
        await supabase
          .from('historique')
          .insert({
            id: crypto.randomUUID(),
            client_id: clientId,
            date: now,
            type: 'statut',
            description: `Étape mise à jour automatiquement suite à l'acceptation du devis "${devisTitle}"`,
            auteur: body.createdBy || 'Système',
            previous_status: currentStageHistory?.stage_name || null,
            new_status: 'accepte',
            timestamp_start: now,
            created_at: now,
            updated_at: now
          })
        
        stageProgressed = true
        newStage = 'accepte'
        console.log('[Add Devis] ✅ Stage auto-progressed to "accepte"')
      }
    }

    console.log('[Add Devis] ✅ Devis added successfully:', newDevis.id, stageProgressed ? `(stage → ${newStage})` : '')

    return NextResponse.json({
      success: true,
      data: newDevis,
      stageProgressed,
      newStage
    })
  } catch (error: any) {
    console.error('[Add Devis] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id]/devis - Update a devis
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const body = await request.json()
    const { devisId, ...updates } = body

    console.log('[Update Devis] Request for client:', clientId, 'devis:', devisId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify devis belongs to client
    const { data: existingDevis, error: fetchError } = await supabase
      .from('devis')
      .select('*')
      .eq('id', devisId)
      .eq('client_id', clientId)
      .single()

    if (fetchError || !existingDevis) {
      return NextResponse.json(
        { error: 'Devis not found' },
        { status: 404 }
      )
    }

    // 2. Prepare update data
    const now = new Date().toISOString()
    const updateData: any = {
      updated_at: now
    }

    // Map frontend fields to database fields
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.montant !== undefined) updateData.montant = parseFloat(updates.montant)
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.statut !== undefined) {
      updateData.statut = updates.statut
      // Set validated_at if status is accepte or refuse
      if ((updates.statut === 'accepte' || updates.statut === 'refuse') && !existingDevis.validated_at) {
        updateData.validated_at = now
      }
    }
    if (updates.facture_reglee !== undefined) updateData.facture_reglee = updates.facture_reglee
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.fichier !== undefined) updateData.fichier = updates.fichier

    // 3. Update devis in database
    const { data: updatedDevis, error: updateError } = await supabase
      .from('devis')
      .update(updateData)
      .eq('id', devisId)
      .select()
      .single()

    if (updateError) {
      console.error('[Update Devis] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update devis', details: updateError.message },
        { status: 500 }
      )
    }

    // 4. Check if we need to auto-update project status based on devis changes
    let stageProgressed = false
    let newStage = null
    
    if (updates.statut === 'refuse') {
      // Check if ALL devis for this client are now refused
      const { data: allDevis } = await supabase
        .from('devis')
        .select('statut')
        .eq('client_id', clientId)
      
      const allRefused = allDevis && allDevis.length > 0 && allDevis.every(d => d.statut === 'refuse')
      
      if (allRefused) {
        console.log('[Update Devis] All devis refused, auto-progressing to "refuse" stage')
        
        // Get current stage from history
        const { data: currentStageHistory } = await supabase
          .from('client_stage_history')
          .select('stage_name, started_at')
          .eq('client_id', clientId)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()
        
        // Close current stage if it exists
        if (currentStageHistory) {
          const startedAt = new Date(currentStageHistory.started_at || now)
          const endedAt = new Date(now)
          const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
          
          await supabase
            .from('client_stage_history')
            .update({
              ended_at: now,
              duration_seconds: durationSeconds,
              updated_at: now
            })
            .eq('client_id', clientId)
            .is('ended_at', null)
        }
        
        // Create new stage entry for "refuse"
        const crypto = require('crypto')
        const stageId = crypto.randomUUID()
        
        await supabase
          .from('client_stage_history')
          .insert({
            id: stageId,
            client_id: clientId,
            stage_name: 'refuse',
            started_at: now,
            ended_at: null,
            duration_seconds: null,
            changed_by: updates.createdBy || 'Système',
            created_at: now,
            updated_at: now
          })
        
        // Update client's statut_projet
        await supabase
          .from('clients')
          .update({
            statut_projet: 'refuse',
            derniere_maj: now,
            updated_at: now
          })
          .eq('id', clientId)
        
        // Add to historique with devis info
        const devisTitle = updatedDevis.title || `Devis n°${devisId.slice(-6)}`
        await supabase
          .from('historique')
          .insert({
            id: crypto.randomUUID(),
            client_id: clientId,
            date: now,
            type: 'statut',
            description: `Étape mise à jour automatiquement suite au refus de tous les devis. Dernier refusé: ${devisTitle}`,
            auteur: updates.createdBy || 'Système',
            previous_status: currentStageHistory?.stage_name || null,
            new_status: 'refuse',
            timestamp_start: now,
            created_at: now,
            updated_at: now
          })
        
        stageProgressed = true
        newStage = 'refuse'
        console.log('[Update Devis] ✅ Stage auto-progressed to "refuse"')
      }
    } else if (updates.statut === 'accepte') {
      // If a devis is accepted, ensure we're at least at "accepte" stage
      const { data: clientData } = await supabase
        .from('clients')
        .select('statut_projet')
        .eq('id', clientId)
        .single()
      
      console.log('[Update Devis] 🔍 Checking if stage should progress...')
      console.log('[Update Devis] Current project stage:', clientData?.statut_projet)
      console.log('[Update Devis] Devis being accepted:', devisId)
      
      // Include 'refuse' to allow recovery from refused state
      const earlyStages = ['qualifie', 'acompte_recu', 'conception', 'devis_negociation', 'refuse']
      
      if (clientData && earlyStages.includes(clientData.statut_projet)) {
        console.log('[Update Devis] ✅ Stage qualifies for progression! Moving to "accepte" stage')
        
        // Get current stage from history
        const { data: currentStageHistory } = await supabase
          .from('client_stage_history')
          .select('stage_name, started_at')
          .eq('client_id', clientId)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()
        
        // Close current stage
        if (currentStageHistory) {
          const startedAt = new Date(currentStageHistory.started_at || now)
          const endedAt = new Date(now)
          const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
          
          await supabase
            .from('client_stage_history')
            .update({
              ended_at: now,
              duration_seconds: durationSeconds,
              updated_at: now
            })
            .eq('client_id', clientId)
            .is('ended_at', null)
        }
        
        // Create new stage entry for "accepte"
        const crypto = require('crypto')
        const stageId = crypto.randomUUID()
        
        await supabase
          .from('client_stage_history')
          .insert({
            id: stageId,
            client_id: clientId,
            stage_name: 'accepte',
            started_at: now,
            ended_at: null,
            duration_seconds: null,
            changed_by: updates.createdBy || 'Système',
            created_at: now,
            updated_at: now
          })
        
        // Update client's statut_projet
        await supabase
          .from('clients')
          .update({
            statut_projet: 'accepte',
            derniere_maj: now,
            updated_at: now
          })
          .eq('id', clientId)
        
        // Add to historique with devis info
        const devisTitle = updatedDevis.title || `Devis n°${devisId.slice(-6)}`
        await supabase
          .from('historique')
          .insert({
            id: crypto.randomUUID(),
            client_id: clientId,
            date: now,
            type: 'statut',
            description: `Étape mise à jour automatiquement suite à l'acceptation du devis "${devisTitle}"`,
            auteur: updates.createdBy || 'Système',
            previous_status: currentStageHistory?.stage_name || null,
            new_status: 'accepte',
            timestamp_start: now,
            created_at: now,
            updated_at: now
          })
        
        stageProgressed = true
        newStage = 'accepte'
        console.log('[Update Devis] ✅ Stage auto-progressed to "accepte"')
      } else {
        console.log('[Update Devis] ⚠️ Stage NOT progressed. Reason:')
        if (!clientData) {
          console.log('  - Client data not found')
        } else if (!earlyStages.includes(clientData.statut_projet)) {
          console.log(`  - Current stage "${clientData.statut_projet}" is not in early stages`)
          console.log('  - Early stages are:', earlyStages)
        }
      }
    } else {
      // Just update derniere_maj if no stage change
      await supabase
        .from('clients')
        .update({
          derniere_maj: now,
          updated_at: now
        })
        .eq('id', clientId)
    }

    console.log('[Update Devis] ✅ Devis updated successfully', stageProgressed ? `(stage → ${newStage})` : '')
    console.log('[Update Devis] 📤 Returning response:', {
      success: true,
      stageProgressed,
      newStage,
      devisId: updatedDevis.id,
      devisStatus: updatedDevis.statut
    })

    return NextResponse.json({
      success: true,
      data: updatedDevis,
      stageProgressed,
      newStage
    })
  } catch (error: any) {
    console.error('[Update Devis] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/devis - Delete a devis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const devisId = searchParams.get('devisId')

    if (!devisId) {
      return NextResponse.json(
        { error: 'Devis ID is required' },
        { status: 400 }
      )
    }

    console.log('[Delete Devis] Request for client:', clientId, 'devis:', devisId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify devis belongs to client
    const { data: existingDevis, error: fetchError } = await supabase
      .from('devis')
      .select('id')
      .eq('id', devisId)
      .eq('client_id', clientId)
      .single()

    if (fetchError || !existingDevis) {
      return NextResponse.json(
        { error: 'Devis not found' },
        { status: 404 }
      )
    }

    // 2. Delete the devis (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('devis')
      .delete()
      .eq('id', devisId)

    if (deleteError) {
      console.error('[Delete Devis] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete devis', details: deleteError.message },
        { status: 500 }
      )
    }

    // 3. Update client's derniere_maj
    const now = new Date().toISOString()
    await supabase
      .from('clients')
      .update({
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)

    console.log('[Delete Devis] ✅ Devis deleted successfully')

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('[Delete Devis] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
