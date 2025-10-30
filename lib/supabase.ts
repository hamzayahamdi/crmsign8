import { createClient } from '@supabase/supabase-js'

// Client for server-side operations using service role (uploads, signed URLs)
export function getServerSupabase() {
  const sanitize = (v?: string) => {
    if (!v) return undefined
    const trimmed = v.trim()
    // Strip surrounding quotes if present
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1)
    }
    return trimmed
  }

  const resolve = (...names: (keyof NodeJS.ProcessEnv)[]) => {
    for (const n of names) {
      const v = sanitize(process.env[n])
      if (v && v.length > 0) return v
    }
    return undefined
  }

  const url = resolve(
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_PROJECT_URL',
    'SB_URL'
  )

  const serviceKey = resolve(
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SECRET',
    'SUPABASE_SERVICE_ROLE',
    'SERVICE_ROLE_KEY',
    'SB_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_SECRET'
  )

  if (!url || !serviceKey) {
    const missing: string[] = []
    if (!url) missing.push('SUPABASE_URL')
    if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    throw new Error(
      `Supabase server credentials are not configured (missing: ${missing.join(', ')}). ` +
      `Accepted names for URL: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_PROJECT_URL, SB_URL. ` +
      `Accepted names for service key: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_SECRET, SUPABASE_SERVICE_ROLE, SERVICE_ROLE_KEY, SB_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE_SECRET.`
    )
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

// Client for browser (if needed in the future)
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Supabase browser credentials are not configured')
  }
  return createClient(url, anon, { auth: { persistSession: true } })
}


