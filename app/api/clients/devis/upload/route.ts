import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getServerSupabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Vercel timeout configuration - increase for large file uploads
export const maxDuration = 60 // 60 seconds for Pro plan, 10s for Hobby
export const runtime = 'nodejs' // Use Node.js runtime for better file handling

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
    let timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    let path = `clients/${clientId}/devis/${timestamp}_${originalName}`

    console.log('[Upload Devis] Starting upload:', {
      fileName: originalName,
      fileSize: file.size,
      fileType: file.type,
      path
    })

    // Convert file to bytes with timeout protection
    let arrayBuffer: ArrayBuffer
    try {
      // Add timeout for large file reading (30 seconds)
      arrayBuffer = await Promise.race([
        file.arrayBuffer(),
        new Promise<ArrayBuffer>((_, reject) => 
          setTimeout(() => reject(new Error('File reading timeout')), 30000)
        )
      ])
    } catch (readError: any) {
      console.error('[Upload Devis] File read error:', readError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la lecture du fichier', 
          details: readError.message || 'Le fichier est peut-être trop volumineux ou corrompu' 
        },
        { status: 400 }
      )
    }

    const bytes = new Uint8Array(arrayBuffer)

    // Upload to storage with timeout and retry logic
    let uploadError: any = null
    let uploadAttempts = 0
    const maxAttempts = 2
    let uploadSuccess = false

    while (uploadAttempts < maxAttempts && !uploadSuccess) {
      uploadAttempts++
      try {
        console.log(`[Upload Devis] Upload attempt ${uploadAttempts}/${maxAttempts}`, { path, fileSize: bytes.length })
        
        const uploadPromise = serverSupabase.storage
          .from(BUCKET)
          .upload(path, bytes, {
            contentType: file.type || 'application/octet-stream',
            upsert: false, // Don't overwrite existing files
            cacheControl: '3600',
          })

        // Add timeout for upload (50 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout - le fichier est trop volumineux')), 50000)
        )

        const result = await Promise.race([uploadPromise, timeoutPromise]) as any
        
        if (result.error) {
          uploadError = result.error
          // If it's a duplicate file error, try with a new timestamp
          if (result.error.message?.includes('already exists') && uploadAttempts < maxAttempts) {
            timestamp = Date.now()
            path = `clients/${clientId}/devis/${timestamp}_${originalName}`
            uploadError = null
            continue
          }
        } else {
          // Success
          uploadSuccess = true
          uploadError = null
          break
        }
      } catch (timeoutError: any) {
        uploadError = timeoutError
        console.error(`[Upload Devis] Upload attempt ${uploadAttempts} failed:`, timeoutError)
        if (uploadAttempts >= maxAttempts) {
          return NextResponse.json(
            { 
              error: 'Échec de l\'upload du fichier', 
              details: timeoutError.message || 'Le téléchargement a pris trop de temps. Veuillez réessayer avec un fichier plus petit ou vérifier votre connexion internet.' 
            },
            { status: 500 }
          )
        }
      }
    }

    if (uploadError) {
      console.error('[Upload Devis] Storage upload error after retries:', uploadError)
      console.error('[Upload Devis] Upload error details:', JSON.stringify(uploadError, null, 2))
      
      // Provide more specific error messages
      let errorMessage = 'Échec de l\'upload du fichier'
      let errorDetails = uploadError.message || String(uploadError)
      
      if (uploadError.message?.includes('timeout')) {
        errorMessage = 'Timeout lors de l\'upload'
        errorDetails = 'Le fichier est trop volumineux ou la connexion est trop lente. Veuillez réessayer.'
      } else if (uploadError.message?.includes('size')) {
        errorMessage = 'Fichier trop volumineux'
        errorDetails = 'La taille du fichier dépasse la limite autorisée.'
      } else if (uploadError.message?.includes('network') || uploadError.message?.includes('fetch')) {
        errorMessage = 'Erreur réseau'
        errorDetails = 'Problème de connexion lors de l\'upload. Veuillez vérifier votre connexion internet.'
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorDetails },
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
        created_at: now, // Explicitly set created_at (required by Supabase even if Prisma has default)
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
      console.error('[Upload Devis] Insert error details:', JSON.stringify(insertError, null, 2))
      console.error('[Upload Devis] Insert data attempted:', {
        id: devisId,
        client_id: clientId,
        title: devisTitle,
        montant: 0,
        statut: 'en_attente',
        created_by: uploadedBy,
        created_at: now,
        date: now,
        updated_at: now
      })
      // Try to delete uploaded file if devis creation fails
      try {
        await serverSupabase.storage.from(BUCKET).remove([path])
      } catch (cleanupError) {
        console.error('[Upload Devis] Failed to cleanup uploaded file:', cleanupError)
      }
      
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

    console.log('[Upload Devis] ✅ Devis uploaded and created successfully:', newDevis.id)

    return NextResponse.json({
      success: true,
      data: newDevis,
      fileUrl,
      fileName: originalName
    })
  } catch (error: any) {
    console.error('[Upload Devis] Unexpected error:', error)
    console.error('[Upload Devis] Error stack:', error.stack)
    console.error('[Upload Devis] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    // Try to provide more helpful error message
    let errorMessage = 'Erreur interne du serveur'
    let errorDetails = error.message || String(error)
    
    if (error.message?.includes('Missing Supabase')) {
      errorMessage = 'Configuration Supabase manquante'
      errorDetails = 'Les variables d\'environnement Supabase ne sont pas configurées correctement'
    } else if (error.message?.includes('storage')) {
      errorMessage = 'Erreur de stockage'
      errorDetails = 'Impossible d\'accéder au stockage Supabase'
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    )
  }
}






