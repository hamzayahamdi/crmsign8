import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { getServerSupabase } from '@/lib/supabase'

const BUCKET = process.env.SUPABASE_DOCS_BUCKET || 'documents'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
// Supabase credentials are resolved inside getServerSupabase()

// Ensure Node.js runtime so server env vars are available
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Auth (read JWT from Authorization header)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let uploadedBy = 'Utilisateur'
    try {
      const token = authHeader.substring(7)
      const decoded = verify(token, JWT_SECRET) as any
      uploadedBy = decoded?.name || decoded?.email || 'Utilisateur'
    } catch {
      // ignore, keep default uploadedBy
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    const clientId = String(form.get('clientId') || '')
    const categoryRaw = String(form.get('category') || '')

    if (!file || !clientId) {
      return NextResponse.json({ error: 'Missing file or clientId' }, { status: 400 })
    }

    // Create server-side Supabase client using the Service Role key
    // This bypasses RLS for storage writes
    const supabase = getServerSupabase()
    
    // Ensure path structure: clients/{clientId}/{ts}_{safeName}
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `clients/${clientId}/${timestamp}_${originalName}`

    // ArrayBuffer -> Uint8Array for supabase-js upload
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Upload file to storage - ONLY storage operation, no database
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: file.type || 'application/octet-stream',
          upsert: true, // Force upsert
        })

      if (uploadError) {
        console.error('[Upload] Supabase error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message || String(uploadError) }, { status: 500 })
      }
      
      // Create signed URL
      const { data: signed, error: signedErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days

      if (signedErr) {
        console.error('[Upload] Signed URL error:', signedErr)
        // Still return success even if signed URL fails
        return NextResponse.json({
          id: path,
          name: originalName,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          url: null,
          path,
          clientId,
          success: true
        })
      }

      const ext = (originalName.split('.').pop() || '').toLowerCase()
      const type = file.type.includes('pdf') ? 'pdf' : file.type.startsWith('image/') ? 'image' : (ext === 'dwg' || ext === 'dxf') ? 'dwg' : 'other'

      // Auto-categorize if not provided or set to 'auto'
      const nameLc = originalName.toLowerCase()
      let category = categoryRaw
      if (!category || category === 'auto') {
        if (/(plan|drawing|blueprint)/.test(nameLc) || ext === 'dwg' || ext === 'dxf') category = 'plan'
        else if (/devis/.test(nameLc)) category = 'devis'
        else if (/contrat|contract/.test(nameLc)) category = 'contrat'
        else if (type === 'image') category = 'photo'
        else category = 'autre'
      }

      // Return success response with file details
      return NextResponse.json({
        id: path,
        name: originalName,
        type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        url: signed?.signedUrl || null,
        category,
        bucket: BUCKET,
        path,
        clientId,
        success: true
      })
    } catch (uploadErr: any) {
      console.error('[Upload] Critical error:', uploadErr)
      return NextResponse.json({ 
        error: 'Critical upload error', 
        details: uploadErr.message || String(uploadErr),
        stack: uploadErr.stack
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[Upload] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Failed to process upload', 
      details: error.message || String(error),
      stack: error.stack
    }, { status: 500 })
  }
}


