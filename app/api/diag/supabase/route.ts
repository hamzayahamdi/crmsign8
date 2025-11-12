import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function present(name: keyof NodeJS.ProcessEnv) {
  const v = process.env[name]
  return typeof v === 'string' && v.trim().length > 0
}

export async function GET() {
  try {
    const variants = {
      URL: {
        SUPABASE_URL: present('SUPABASE_URL'),
        NEXT_PUBLIC_SUPABASE_URL: present('NEXT_PUBLIC_SUPABASE_URL'),
        SUPABASE_PROJECT_URL: present('SUPABASE_PROJECT_URL' as any),
        SB_URL: present('SB_URL' as any),
      },
      SERVICE_KEY: {
        SUPABASE_SERVICE_ROLE_KEY: present('SUPABASE_SERVICE_ROLE_KEY'),
        SUPABASE_SERVICE_KEY: present('SUPABASE_SERVICE_KEY' as any),
        SUPABASE_SECRET: present('SUPABASE_SECRET' as any),
        SUPABASE_SERVICE_ROLE: present('SUPABASE_SERVICE_ROLE' as any),
        SERVICE_ROLE_KEY: present('SERVICE_ROLE_KEY' as any),
        SB_SERVICE_ROLE_KEY: present('SB_SERVICE_ROLE_KEY' as any),
        SUPABASE_SERVICE_ROLE_SECRET: present('SUPABASE_SERVICE_ROLE_SECRET' as any),
      },
      OTHER: {
        SUPABASE_DOCS_BUCKET: present('SUPABASE_DOCS_BUCKET'),
        NODE_ENV: process.env.NODE_ENV || 'undefined',
      }
    }
    return NextResponse.json({ ok: true, variants })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}








