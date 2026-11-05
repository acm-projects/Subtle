import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { supabase as anon } from './supabase'

/*
  SERVER ONLY. A Supabase client with the secret key (SUPABASE_SERVICE_ROLE_KEY in .env.local, never
  NEXT_PUBLIC_), which skips the tables' access rules. API routes use it only after they've worked out
  who is calling (callerFrom) and only for rows that caller may see.
  Without the key (e.g. a teammate who hasn't added it yet) it falls back to the normal client, which
  works until access rules are turned on for users_table / listing_table.
*/
let cached: SupabaseClient | null = null
export function admin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is missing from .env.local; using the public client')
    return anon
  }
  cached ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

/** The signed-in user who sent this request (from the Authorization: Bearer <login token> header), or null. */
export async function callerFrom(request: Request): Promise<User | null> {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const { data } = await admin().auth.getUser(token)
    return data.user ?? null
  } catch {
    return null
  }
}
