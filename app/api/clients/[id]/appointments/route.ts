import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

// Generate CUID-like ID
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create a new appointment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[POST /appointments] Request received')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[POST /appointments] Missing environment variables')
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
    const { title, dateStart, dateEnd, description, location, locationUrl, notes, createdBy, clientName } = body

    if (!title || !dateStart || !dateEnd || !createdBy) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const { id: clientId } = await params
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date().toISOString()
    const appointmentId = generateCuid()

    // Create appointment in database
    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        id: appointmentId,
        title,
        date_start: dateStart,
        date_end: dateEnd,
        description: description || null,
        location: location || null,
        location_url: locationUrl || null,
        status: 'upcoming',
        client_id: clientId,
        client_name: clientName || null,
        notes: notes || null,
        created_by: createdBy,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /appointments] Error inserting appointment:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du rendez-vous' },
        { status: 500 }
      )
    }

    // Add to historique
    await supabase
      .from('historique')
      .insert({
        id: generateCuid(),
        client_id: clientId,
        date: now,
        type: 'rdv',
        description: `Nouveau rendez-vous: ${title}`,
        auteur: createdBy,
        created_at: now,
        updated_at: now
      })

    console.log(`[POST /appointments] ✅ Appointment created: ${newAppointment.id}`)

    return NextResponse.json({
      success: true,
      data: newAppointment
    })

  } catch (error) {
    console.error('[POST /appointments] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Get all appointments for a client
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

    const { data: appointmentsList, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      .order('date_start', { ascending: false })

    if (error) {
      console.error('[GET /appointments] Error:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des rendez-vous' },
        { status: 500 }
      )
    }

    // Transform to camelCase
    const transformedAppointments = appointmentsList?.map(a => ({
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
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedAppointments
    })

  } catch (error) {
    console.error('[GET /appointments] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Update an appointment
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

    const body = await request.json()
    const { appointmentId, updates } = body

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'ID du rendez-vous requis' },
        { status: 400 }
      )
    }

    const { id: clientId } = await params
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date().toISOString()

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: now
      })
      .eq('id', appointmentId)
      .eq('client_id', clientId)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /appointments] Error:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du rendez-vous' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedAppointment
    })

  } catch (error) {
    console.error('[PATCH /appointments] Error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
