import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * A Supabase client for an API route that runs as the person who called it (their login token from
 * the Authorization header), so the tables' access rules apply to them. null if they aren't signed in.
 */
export function supabaseForRequest(request: Request): { client: SupabaseClient; token: string } | null {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return { client, token }
}
