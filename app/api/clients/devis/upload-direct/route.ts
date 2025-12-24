import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getServerSupabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Vercel timeout configuration - this route is lightweight, only creates DB record
export const maxDuration = 30
export const runtime = 'nodejs'

// Generate CUID-like ID
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12)
  return `c${timestamp}${randomPart}`.substring(0, 25)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// POST /api/clients/devis/upload-direct - Create devis record after direct upload to Supabase
// This route only creates the database record, file is already uploaded to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')
    let uploadedBy = 'Utilisateur'

    if (authCookie) {
      try {
        const decoded = verify(authCookie.value, JWT_SECRET) as any
        uploadedBy = decoded?.name || decoded?.email || 'Utilisateur'
      } catch {
        // Try Authorization header as fallback
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7)
            const decoded = verify(token, JWT_SECRET) as any
            uploadedBy = decoded?.name || decoded?.email || 'Utilisateur'
          } catch {
            // Keep default
          }
        }
      }
    } else {
      // Try Authorization header
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7)
          const decoded = verify(token, JWT_SECRET) as any
          uploadedBy = decoded?.name || decoded?.email || 'Utilisateur'
        } catch {
          // Keep default, but this is not authenticated
        }
      } else {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
    }

    // Parse request body (lightweight - only metadata, no file)
    const body = await request.json()
    const { clientId, filePath, fileName, fileSize, fileUrl } = body

    if (!clientId || !filePath) {
      return NextResponse.json(
        { error: 'ID client ou chemin de fichier manquant' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify client exists
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, nom')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      console.error('[Upload Devis Direct] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client introuvable' },
        { status: 404 }
      )
    }

    // 2. Verify file exists in storage
    const serverSupabase = getServerSupabase()
    const { data: fileData, error: fileCheckError } = await serverSupabase.storage
      .from(process.env.SUPABASE_DOCS_BUCKET || 'documents')
      .list(filePath.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: filePath.split('/').pop()
      })

    if (fileCheckError || !fileData || fileData.length === 0) {
      console.error('[Upload Devis Direct] File not found in storage:', fileCheckError)
      return NextResponse.json(
        { error: 'Fichier introuvable dans le stockage' },
        { status: 404 }
      )
    }

    // 3. Generate devis title from filename
    const originalName = fileName || filePath.split('/').pop() || 'devis'
    const fileNameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
    const devisTitle = fileNameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || `Devis ${new Date().toLocaleDateString('fr-FR')}`

    // 4. Create signed URL for the file (if not provided)
    let finalFileUrl = fileUrl
    if (!finalFileUrl) {
      const { data: signedUrlData } = await serverSupabase.storage
        .from(process.env.SUPABASE_DOCS_BUCKET || 'documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year
      finalFileUrl = signedUrlData?.signedUrl || filePath
    }

    // 5. Insert new devis into devis table
    const now = new Date().toISOString()
    const devisId = generateCuid()

    const { data: newDevis, error: insertError } = await supabase
      .from('devis')
      .insert({
        id: devisId,
        client_id: clientId,
        title: devisTitle,
        montant: 0,
        description: `Devis attaché: ${originalName}`,
        statut: 'en_attente',
        created_by: uploadedBy,
        created_at: now,
        validated_at: null,
        facture_reglee: false,
        date: now,
        updated_at: now,
        notes: null,
        fichier: finalFileUrl || filePath
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Upload Devis Direct] Insert error:', insertError)
      console.error('[Upload Devis Direct] Insert error details:', JSON.stringify(insertError, null, 2))
      
      return NextResponse.json(
        { error: 'Échec de la création du devis', details: insertError.message || insertError.hint || String(insertError) },
        { status: 500 }
      )
    }

    // 6. Update client's derniere_maj
    await supabase
      .from('clients')
      .update({
        derniere_maj: now,
        updated_at: now
      })
      .eq('id', clientId)

    // 7. Add to historique
    const crypto = require('crypto')
    await supabase
      .from('historique')
      .insert({
        id: crypto.randomUUID(),
        client_id: clientId,
        date: now,
        type: 'devis',
        description: `Devis attaché: ${originalName}`,
        auteur: uploadedBy,
        previous_status: null,
        new_status: null,
        timestamp_start: now,
        created_at: now,
        updated_at: now
      })

    console.log('[Upload Devis Direct] ✅ Devis created successfully:', newDevis.id)

    return NextResponse.json({
      success: true,
      data: newDevis,
      fileUrl: finalFileUrl,
      fileName: originalName
    })
  } catch (error: any) {
    console.error('[Upload Devis Direct] Unexpected error:', error)
    console.error('[Upload Devis Direct] Error stack:', error.stack)
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error.message || String(error) },
      { status: 500 }
    )
  }
}

