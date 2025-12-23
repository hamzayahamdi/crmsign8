import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getServerSupabase } from '@/lib/supabase'
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const BUCKET = process.env.SUPABASE_DOCS_BUCKET || 'documents'

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// POST /api/clients/devis/upload - Upload a devis file and create devis record
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const clientId = String(formData.get('clientId') || '')

    if (!file || !clientId) {
      return NextResponse.json(
        { error: 'Fichier ou ID client manquant' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté. Formats acceptés: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 10 MB' },
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
      console.error('[Upload Devis] Client not found:', fetchError)
      return NextResponse.json(
        { error: 'Client introuvable' },
        { status: 404 }
      )
    }

    // 2. Upload file to Supabase storage
    const serverSupabase = getServerSupabase()
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `clients/${clientId}/devis/${timestamp}_${originalName}`

    // Convert file to bytes
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Upload to storage
    const { error: uploadError } = await serverSupabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('[Upload Devis] Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Échec de l\'upload du fichier', details: uploadError.message },
        { status: 500 }
      )
    }

    // 3. Create signed URL for the file
    const { data: signedUrlData, error: signedUrlError } = await serverSupabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year

    const fileUrl = signedUrlData?.signedUrl || null

    // 4. Generate devis title from filename (remove extension and clean up)
    const fileNameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
    const devisTitle = fileNameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || `Devis ${new Date().toLocaleDateString('fr-FR')}`

    // 5. Insert new devis into devis table
    const now = new Date().toISOString()
    const devisId = generateCuid()

    const { data: newDevis, error: insertError } = await supabase
      .from('devis')
      .insert({
        id: devisId,
        client_id: clientId,
        title: devisTitle,
        montant: 0, // Will be updated later if needed
        description: `Devis attaché: ${originalName}`,
        statut: 'en_attente',
        created_by: uploadedBy,
        validated_at: null,
        facture_reglee: false,
        date: now,
        updated_at: now,
        notes: null,
        fichier: fileUrl || path // Store URL or path
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Upload Devis] Insert error:', insertError)
      // Try to delete uploaded file if devis creation fails
      await serverSupabase.storage.from(BUCKET).remove([path])
      
      return NextResponse.json(
        { error: 'Échec de la création du devis', details: insertError.message },
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

    console.log('[Upload Devis] ✅ Devis uploaded and created successfully:', newDevis.id)

    return NextResponse.json({
      success: true,
      data: newDevis,
      fileUrl,
      fileName: originalName
    })
  } catch (error: any) {
    console.error('[Upload Devis] Error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error.message },
      { status: 500 }
    )
  }
}





