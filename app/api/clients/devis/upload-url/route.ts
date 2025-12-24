import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getServerSupabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const BUCKET = process.env.SUPABASE_DOCS_BUCKET || 'documents'

// GET /api/clients/devis/upload-url - Get upload path and credentials for direct client upload
// This is a lightweight route that returns the path and Supabase credentials
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('token')

    if (!authCookie) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const fileName = searchParams.get('fileName')

    if (!clientId || !fileName) {
      return NextResponse.json(
        { error: 'ID client et nom de fichier requis' },
        { status: 400 }
      )
    }

    // Generate upload path
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `clients/${clientId}/devis/${timestamp}_${sanitizedFileName}`

    // Return Supabase URL and anon key for direct browser upload
    // Note: Anon key is safe to expose as it's already public (NEXT_PUBLIC_*)
    // RLS policies on the storage bucket should be configured to allow uploads
    return NextResponse.json({
      path,
      bucket: BUCKET,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })
  } catch (error: any) {
    console.error('[Upload URL] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'URL', details: error.message },
      { status: 500 }
    )
  }
}

