import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

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
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')

    if (!authCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

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
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')

    if (!authCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

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
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')

    if (!authCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

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
      // If changing to "en_attente", reset facture_reglee to false (can't be paid if pending)
      if (updates.statut === 'en_attente' && existingDevis.facture_reglee) {
        updateData.facture_reglee = false
        console.log('[Update Devis] Resetting facture_reglee to false (devis is now pending)')
      }
    }
    if (updates.facture_reglee !== undefined) updateData.facture_reglee = updates.facture_reglee
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.fichier !== undefined) updateData.fichier = updates.fichier

    // 3. Update devis in database
    console.log('[Update Devis] Updating devis:', {
      devisId,
      updateData,
      statut: updates.statut
    })
    
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

    console.log('[Update Devis] ✅ Devis updated successfully:', {
      id: updatedDevis.id,
      statut: updatedDevis.statut,
      title: updatedDevis.title
    })

    // 4. Check if we need to auto-update project status based on devis changes
    let stageProgressed = false
    let newStage = null

    if (updates.statut === 'refuse') {
      // Check if ALL devis for this client are now refused
      // IMPORTANT: Get all devis AFTER the update (the current devis is already updated in DB)
      const { data: allDevis, error: devisError } = await supabase
        .from('devis')
        .select('statut, id, title')
        .eq('client_id', clientId)

      if (devisError) {
        console.error('[Update Devis] Error fetching all devis:', devisError)
      }

      console.log('[Update Devis] All devis for client after update:', allDevis)
      
      // Check if all devis are refused (including the one we just updated)
      const allRefused = allDevis && allDevis.length > 0 && allDevis.every(d => d.statut === 'refuse')
      
      console.log('[Update Devis] All devis refused?', allRefused, {
        totalDevis: allDevis?.length || 0,
        refusedCount: allDevis?.filter(d => d.statut === 'refuse').length || 0,
        devisStatuses: allDevis?.map(d => ({ id: d.id, statut: d.statut, title: d.title }))
      })

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
    }
    
    // 5. Check if reverting devis to "en_attente" should move stage back to "devis_negociation" or "accepte"
    if (updates.statut === 'en_attente' && existingDevis.statut !== 'en_attente') {
      console.log('[Update Devis] 🔄 Devis reverted to "en_attente", checking if stage should regress...')
      console.log('[Update Devis] Previous devis state:', {
        id: existingDevis.id,
        statut: existingDevis.statut,
        facture_reglee: existingDevis.facture_reglee
      })
      
      // Get all devis for this client AFTER the update
      // Note: facture_reglee will be false for the updated devis (reset in step 2)
      const { data: allDevis, error: devisError } = await supabase
        .from('devis')
        .select('statut, facture_reglee, id, title')
        .eq('client_id', clientId)

      if (devisError) {
        console.error('[Update Devis] Error fetching all devis:', devisError)
      } else {
        // Check if ALL devis are now "en_attente" (no accepted, no refused)
        const allPending = allDevis && allDevis.length > 0 && allDevis.every(d => d.statut === 'en_attente')
        const hasAccepted = allDevis?.some(d => d.statut === 'accepte') || false
        const hasRefused = allDevis?.some(d => d.statut === 'refuse') || false
        
        // Check if a paid devis was changed to pending (should revert from "facture_reglee")
        const wasPaidDevis = existingDevis.facture_reglee === true && existingDevis.statut === 'accepte'
        const acceptedDevis = allDevis?.filter(d => d.statut === 'accepte') || []
        const allAcceptedPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee === true)
        
        console.log('[Update Devis] Devis status check:', {
          totalDevis: allDevis?.length || 0,
          allPending,
          hasAccepted,
          hasRefused,
          wasPaidDevis,
          acceptedCount: acceptedDevis.length,
          allAcceptedPaid
        })

        // First, check if a paid devis was changed to pending - should revert from "facture_reglee" to "accepte"
        // This handles: paid accepted devis → en_attente (should revert from facture_reglee to accepte)
        if (wasPaidDevis) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('statut_projet')
            .eq('id', clientId)
            .single()

          const currentStage = clientData?.statut_projet

          // Revert from "facture_reglee" if:
          // 1. Currently at "facture_reglee" stage
          // 2. Not all accepted devis are paid anymore (or no accepted devis left)
          const shouldRevertFromFactureReglee = currentStage === 'facture_reglee' && 
            (acceptedDevis.length === 0 || !allAcceptedPaid)

          if (shouldRevertFromFactureReglee) {
            // Determine target stage: "accepte" if there are still accepted devis, otherwise "devis_negociation"
            const targetStage = acceptedDevis.length > 0 ? 'accepte' : 'devis_negociation'
            
            console.log(`[Update Devis] ✅ Paid devis changed to pending! Reverting from "facture_reglee" to "${targetStage}" stage`)

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

            // Create new stage entry
            const crypto = require('crypto')
            const stageId = crypto.randomUUID()

            await supabase
              .from('client_stage_history')
              .insert({
                id: stageId,
                client_id: clientId,
                stage_name: targetStage,
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
                statut_projet: targetStage,
                derniere_maj: now,
                updated_at: now
              })
              .eq('id', clientId)

            // Add to historique
            const devisTitle = updatedDevis.title || `Devis n°${devisId.slice(-6)}`
            const stageLabel = targetStage === 'accepte' ? 'Accepté' : 'Devis/Négociation'
            const description = acceptedDevis.length > 0
              ? `Étape mise à jour automatiquement: devis payé "${devisTitle}" remis en attente. Retour à "${stageLabel}" car toutes les factures ne sont plus réglées.`
              : `Étape mise à jour automatiquement: devis payé "${devisTitle}" remis en attente. Retour à "${stageLabel}" car aucun devis accepté.`
            
            await supabase
              .from('historique')
              .insert({
                id: crypto.randomUUID(),
                client_id: clientId,
                date: now,
                type: 'statut',
                description: description,
                auteur: updates.createdBy || 'Système',
                previous_status: currentStageHistory?.stage_name || currentStage,
                new_status: targetStage,
                timestamp_start: now,
                created_at: now,
                updated_at: now
              })

            stageProgressed = true
            newStage = targetStage
            console.log(`[Update Devis] ✅ Stage reverted from "facture_reglee" to "${targetStage}"`)
          } else {
            console.log('[Update Devis] ℹ️ Paid devis changed to pending, but stage not reverted. Reason:')
            console.log(`  - Current stage: "${currentStage}"`)
            console.log(`  - Accepted devis count: ${acceptedDevis.length}`)
            console.log(`  - All accepted paid: ${allAcceptedPaid}`)
          }
        }
        // Only regress to "devis_negociation" if:
        // 1. ALL devis are now pending (no accepted, no refused)
        // 2. Current stage is "accepte" or "refuse" (stages that depend on devis decisions)
        // 3. We should NOT regress if project is already at "projet_en_cours" or beyond
        else if (allPending && !hasAccepted && !hasRefused) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('statut_projet')
            .eq('id', clientId)
            .single()

          const currentStage = clientData?.statut_projet
          
          // Stages that can be reverted back to "devis_negociation"
          const revertibleStages = ['accepte', 'refuse']
          
          // Stages that should NOT be reverted (project is too far along)
          const nonRevertibleStages = [
            'premier_depot', 'projet_en_cours', 'chantier', 'en_chantier',
            'facture_reglee', 'livraison_termine', 'livraison', 'termine'
          ]

          if (currentStage && revertibleStages.includes(currentStage) && !nonRevertibleStages.includes(currentStage)) {
            console.log('[Update Devis] ✅ All devis are pending! Reverting to "devis_negociation" stage')

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

            // Create new stage entry for "devis_negociation"
            const crypto = require('crypto')
            const stageId = crypto.randomUUID()

            await supabase
              .from('client_stage_history')
              .insert({
                id: stageId,
                client_id: clientId,
                stage_name: 'devis_negociation',
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
                statut_projet: 'devis_negociation',
                derniere_maj: now,
                updated_at: now
              })
              .eq('id', clientId)

            // Add to historique
            const devisTitle = updatedDevis.title || `Devis n°${devisId.slice(-6)}`
            
            await supabase
              .from('historique')
              .insert({
                id: crypto.randomUUID(),
                client_id: clientId,
                date: now,
                type: 'statut',
                description: `Étape mise à jour automatiquement: tous les devis sont revenus en attente. Devis "${devisTitle}" remis en négociation.`,
                auteur: updates.createdBy || 'Système',
                previous_status: currentStageHistory?.stage_name || currentStage,
                new_status: 'devis_negociation',
                timestamp_start: now,
                created_at: now,
                updated_at: now
              })

            stageProgressed = true
            newStage = 'devis_negociation'
            console.log('[Update Devis] ✅ Stage reverted to "devis_negociation"')
          } else {
            console.log('[Update Devis] ⚠️ All devis are pending, but stage not reverted. Reason:')
            console.log(`  - Current stage: "${currentStage}"`)
            if (nonRevertibleStages.includes(currentStage || '')) {
              console.log(`  - Stage "${currentStage}" is too advanced to revert`)
            } else if (!revertibleStages.includes(currentStage || '')) {
              console.log(`  - Stage "${currentStage}" is not in revertible stages: ${revertibleStages.join(', ')}`)
            }
          }
        } else {
          console.log('[Update Devis] ℹ️ Not all devis are pending. Stage unchanged.')
          console.log('[Update Devis] Current devis breakdown:', {
            total: allDevis?.length || 0,
            pending: allDevis?.filter(d => d.statut === 'en_attente').length || 0,
            accepted: allDevis?.filter(d => d.statut === 'accepte').length || 0,
            refused: allDevis?.filter(d => d.statut === 'refuse').length || 0,
            hasAccepted,
            hasRefused
          })
          
          // Additional check: if an accepted devis (not necessarily paid) was changed to pending
          // and there are no more accepted devis, we should regress from "accepte" to "devis_negociation"
          if (existingDevis.statut === 'accepte' && !hasAccepted && !hasRefused) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('statut_projet')
              .eq('id', clientId)
              .single()

            const currentStage = clientData?.statut_projet
            
            if (currentStage === 'accepte') {
              console.log('[Update Devis] ✅ Last accepted devis changed to pending! Reverting from "accepte" to "devis_negociation" stage')

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

              // Create new stage entry for "devis_negociation"
              const crypto = require('crypto')
              const stageId = crypto.randomUUID()

              await supabase
                .from('client_stage_history')
                .insert({
                  id: stageId,
                  client_id: clientId,
                  stage_name: 'devis_negociation',
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
                  statut_projet: 'devis_negociation',
                  derniere_maj: now,
                  updated_at: now
                })
                .eq('id', clientId)

              // Add to historique
              const devisTitle = updatedDevis.title || `Devis n°${devisId.slice(-6)}`
              
              await supabase
                .from('historique')
                .insert({
                  id: crypto.randomUUID(),
                  client_id: clientId,
                  date: now,
                  type: 'statut',
                  description: `Étape mise à jour automatiquement: dernier devis accepté "${devisTitle}" remis en attente. Retour à "Devis/Négociation".`,
                  auteur: updates.createdBy || 'Système',
                  previous_status: currentStageHistory?.stage_name || currentStage,
                  new_status: 'devis_negociation',
                  timestamp_start: now,
                  created_at: now,
                  updated_at: now
                })

              stageProgressed = true
              newStage = 'devis_negociation'
              console.log('[Update Devis] ✅ Stage reverted from "accepte" to "devis_negociation"')
            }
          } else {
            if (hasAccepted) {
              console.log('  - Still has accepted devis')
            }
            if (hasRefused) {
              console.log('  - Still has refused devis')
            }
          }
        }
      }
    }
    
    // 6. Check if unmarking devis as paid (facture_reglee = false) should revert stage from "facture_reglee"
    if (updates.facture_reglee === false && existingDevis.facture_reglee === true) {
      console.log('[Update Devis] 💰 Devis payment undone, checking if stage should revert...')
      
      // Get all devis for this client AFTER the update
      const { data: allDevis, error: devisError } = await supabase
        .from('devis')
        .select('statut, facture_reglee, id, title')
        .eq('client_id', clientId)

      if (devisError) {
        console.error('[Update Devis] Error fetching all devis:', devisError)
      } else {
        // Filter only accepted devis (ignore refused ones)
        const acceptedDevis = allDevis?.filter(d => d.statut === 'accepte') || []
        const allAcceptedPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee === true)
        
        console.log('[Update Devis] Payment undo check:', {
          totalDevis: allDevis?.length || 0,
          acceptedCount: acceptedDevis.length,
          paidCount: acceptedDevis.filter(d => d.facture_reglee).length,
          allAcceptedPaid
        })

        // If not all accepted devis are paid anymore, revert from "facture_reglee" to "accepte"
        if (!allAcceptedPaid && acceptedDevis.length > 0) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('statut_projet')
            .eq('id', clientId)
            .single()

          const currentStage = clientData?.statut_projet

          // Only revert if currently at "facture_reglee" stage
          if (currentStage === 'facture_reglee') {
            console.log('[Update Devis] ✅ Not all accepted devis are paid anymore! Reverting from "facture_reglee" to "accepte" stage')

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

            // Add to historique
            const devisTitle = updatedDevis.title || `Devis n°${devisId.slice(-6)}`
            
            await supabase
              .from('historique')
              .insert({
                id: crypto.randomUUID(),
                client_id: clientId,
                date: now,
                type: 'statut',
                description: `Étape mise à jour automatiquement: facture "${devisTitle}" remise en attente. Retour à "Accepté" car toutes les factures ne sont plus réglées.`,
                auteur: updates.createdBy || 'Système',
                previous_status: currentStageHistory?.stage_name || currentStage,
                new_status: 'accepte',
                timestamp_start: now,
                created_at: now,
                updated_at: now
              })

            stageProgressed = true
            newStage = 'accepte'
            console.log('[Update Devis] ✅ Stage reverted from "facture_reglee" to "accepte"')
          } else {
            console.log('[Update Devis] ℹ️ Not all accepted devis are paid, but current stage is not "facture_reglee". Stage unchanged.')
          }
        }
      }
    }
    
    // 7. Check if marking devis as paid (facture_reglee) should auto-progress to "facture_reglee" stage
    if (updates.facture_reglee === true) {
      console.log('[Update Devis] 💰 Checking if all accepted devis are paid...')
      
      // Get all devis for this client AFTER the update
      const { data: allDevis, error: devisError } = await supabase
        .from('devis')
        .select('statut, facture_reglee, id, title')
        .eq('client_id', clientId)

      if (devisError) {
        console.error('[Update Devis] Error fetching all devis:', devisError)
      } else {
        // Filter only accepted devis (ignore refused ones)
        const acceptedDevis = allDevis?.filter(d => d.statut === 'accepte') || []
        const allAcceptedPaid = acceptedDevis.length > 0 && acceptedDevis.every(d => d.facture_reglee === true)
        
        console.log('[Update Devis] Payment status check:', {
          totalDevis: allDevis?.length || 0,
          acceptedCount: acceptedDevis.length,
          paidCount: acceptedDevis.filter(d => d.facture_reglee).length,
          allAcceptedPaid
        })

        if (allAcceptedPaid) {
          // Get current client stage
          const { data: clientData } = await supabase
            .from('clients')
            .select('statut_projet')
            .eq('id', clientId)
            .single()

          const currentStage = clientData?.statut_projet
          
          // Stages that should progress to "facture_reglee"
          const stagesBeforeFactureReglee = [
            'qualifie', 'prise_de_besoin', 'acompte_recu', 'conception', 
            'devis_negociation', 'accepte', 'premier_depot', 'projet_en_cours'
          ]

          // Only progress if current stage is before "facture_reglee" and we have accepted devis
          if (currentStage && stagesBeforeFactureReglee.includes(currentStage)) {
            console.log('[Update Devis] ✅ All accepted devis are paid! Auto-progressing to "facture_reglee" stage')

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

            // Create new stage entry for "facture_reglee"
            const crypto = require('crypto')
            const stageId = crypto.randomUUID()

            await supabase
              .from('client_stage_history')
              .insert({
                id: stageId,
                client_id: clientId,
                stage_name: 'facture_reglee',
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
                statut_projet: 'facture_reglee',
                derniere_maj: now,
                updated_at: now
              })
              .eq('id', clientId)

            // Add to historique with devis info
            const devisTitle = updatedDevis.title || `Devis n°${devisId.slice(-6)}`
            const paidDevisTitles = acceptedDevis.map(d => d.title || `Devis n°${d.id.slice(-6)}`).join(', ')
            
            await supabase
              .from('historique')
              .insert({
                id: crypto.randomUUID(),
                client_id: clientId,
                date: now,
                type: 'statut',
                description: `Étape mise à jour automatiquement: toutes les factures des devis acceptés sont réglées. Devis: ${paidDevisTitles}`,
                auteur: updates.createdBy || 'Système',
                previous_status: currentStageHistory?.stage_name || currentStage,
                new_status: 'facture_reglee',
                timestamp_start: now,
                created_at: now,
                updated_at: now
              })

            stageProgressed = true
            newStage = 'facture_reglee'
            console.log('[Update Devis] ✅ Stage auto-progressed to "facture_reglee"')
          } else {
            console.log('[Update Devis] ⚠️ All accepted devis are paid, but stage not progressed. Reason:')
            console.log(`  - Current stage: "${currentStage}"`)
            console.log(`  - Should be in: ${stagesBeforeFactureReglee.join(', ')}`)
          }
        } else {
          console.log('[Update Devis] ℹ️ Not all accepted devis are paid yet. Current stage unchanged.')
        }
      }
    }
    
    // Update derniere_maj if no stage change occurred
    if (!stageProgressed) {
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
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')

    if (!authCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

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
