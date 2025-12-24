import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

const BUCKET = process.env.SUPABASE_DOCS_BUCKET || 'documents'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabase()

    // Create signed URL (valid for 1 year)
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365)

    if (error) {
      console.error('[Signed URL] Error:', error)
      return NextResponse.json(
        { error: 'Failed to create signed URL', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: data.signedUrl,
      path,
    })
  } catch (error: any) {
    console.error('[Signed URL] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}






