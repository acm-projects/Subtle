// utils/supabase-server.ts
import { createClient } from '@supabase/supabase-js'

// Builds a Supabase client that acts as the user who sent the request.
// Returns null if there's no token or it's invalid/expired.
export async function getAuthedClient(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    // This makes every query carry the user's token, so auth.uid() works in your RLS policies
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  // Asks Supabase to verify the token and tell us who it belongs to
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  return { supabase, user }
}