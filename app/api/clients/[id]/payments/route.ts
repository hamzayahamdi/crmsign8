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

// POST /api/clients/[id]/payments - Add a payment to a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const body = await request.json()

    console.log('[Add Payment] Request for client:', clientId)
    console.log('[Add Payment] Payment data:', body)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify client exists
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      console.error('[Add Payment] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // 2. Create payment in payments table
    const now = new Date().toISOString()
    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: generateCuid(),
        client_id: clientId,
        montant: parseFloat(body.montant) || 0,
        date: body.date || now,
        methode: body.methode || 'virement',
        reference: body.reference || null,
        description: body.description || '',
        created_by: body.createdBy || 'Utilisateur',
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (paymentError || !newPayment) {
      console.error('[Add Payment] Payment creation error:', paymentError)
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      )
    }

    // 3. Create history entry
    await supabase
      .from('historique')
      .insert({
        id: generateCuid(),
        client_id: clientId,
        date: now,
        type: 'acompte',
        description: `Acompte reçu: ${body.montant} MAD (${body.methode})${body.reference ? ` - Réf: ${body.reference}` : ''}`,
        auteur: body.createdBy || 'Utilisateur',
        metadata: { paymentId: newPayment.id },
        created_at: now,
        updated_at: now
      })

    // 4. Update client's derniere_maj
    await supabase
      .from('clients')
      .update({
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)

    // 5. Check if client should progress to next stage automatically
    // If client is in "qualifie" stage and now has a payment, move to "acompte_recu"
    const { data: currentStageHistory, error: stageError } = await supabase
      .from('client_stage_history')
      .select('stage_name, started_at')
      .eq('client_id', clientId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    console.log('[Add Payment] Current stage from history:', currentStageHistory?.stage_name, 'Error:', stageError?.message)

    // Fallback: check client's statut_projet if no stage history exists
    let currentStageName = currentStageHistory?.stage_name
    if (!currentStageName) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('statut_projet')
        .eq('id', clientId)
        .single()
      currentStageName = clientData?.statut_projet
      console.log('[Add Payment] No stage history found, using client.statut_projet:', currentStageName)
    }

    console.log('[Add Payment] Condition check:', {
      hasStageHistory: !!currentStageHistory,
      stageName: currentStageName,
      isQualifie: currentStageName === 'qualifie',
      justAddedPayment: true
    })

    // Auto-progress if client is in "qualifie" stage (payment was just added above)
    let stageProgressed = false
    if (currentStageName === 'qualifie') {
      console.log('[Add Payment] Auto-progressing stage: qualifie → acompte_recu')
      
      // Close current stage if it exists in history
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
          stage_name: 'acompte_recu',
          started_at: now,
          ended_at: null,
          duration_seconds: null,
          changed_by: body.createdBy || 'Système',
          created_at: now,
          updated_at: now
        })

      // Update client's statut_projet field
      await supabase
        .from('clients')
        .update({
          statut_projet: 'acompte_recu',
          derniere_maj: now,
          updated_at: now
        })
        .eq('id', clientId)

      // Add to historique
      await supabase
        .from('historique')
        .insert({
          id: crypto.randomUUID(),
          client_id: clientId,
          date: now,
          type: 'statut',
          description: 'Statut changé automatiquement vers: acompte_recu (acompte reçu)',
          auteur: body.createdBy || 'Système',
          previous_status: 'qualifie',
          new_status: 'acompte_recu',
          timestamp_start: now,
          created_at: now,
          updated_at: now
        })

      stageProgressed = true
      console.log('[Add Payment] ✅ Stage auto-progressed to acompte_recu')
    }

    console.log('[Add Payment] ✅ Payment created:', newPayment.id)

    // Transform payment to frontend format
    const transformedPayment = {
      id: newPayment.id,
      amount: newPayment.montant,
      date: newPayment.date,
      method: newPayment.methode,
      reference: newPayment.reference,
      notes: newPayment.description,
      createdBy: newPayment.created_by,
      createdAt: newPayment.created_at
    }

    return NextResponse.json({
      success: true,
      data: transformedPayment,
      stageProgressed
    })
  } catch (error: any) {
    console.error('[Add Payment] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/payments - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const clientId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    console.log('[Delete Payment] Request for client:', clientId, 'payment:', paymentId)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Delete payment from payments table
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .eq('client_id', clientId)

    if (deleteError) {
      console.error('[Delete Payment] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete payment', details: deleteError.message },
        { status: 500 }
      )
    }

    // 2. Create history entry
    const now = new Date().toISOString()
    await supabase
      .from('historique')
      .insert({
        id: generateCuid(),
        client_id: clientId,
        date: now,
        type: 'modification',
        description: 'Paiement supprimé',
        auteur: 'Admin',
        metadata: { paymentId },
        created_at: now,
        updated_at: now
      })

    // 3. Update client's derniere_maj
    await supabase
      .from('clients')
      .update({
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)

    console.log('[Delete Payment] ✅ Payment deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully'
    })
  } catch (error: any) {
    console.error('[Delete Payment] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
