import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Deleting an auth user needs the service-role key, so this must run on the server.
// Add SUPABASE_SERVICE_ROLE_KEY to .env.local (no NEXT_PUBLIC_ prefix, never expose it to the browser).
const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

export async function DELETE(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const supabase = admin()

  // work out who is asking from their login token, never from the request body
  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  if (authError || !auth.user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  const id = auth.user.id

  // profile photos live in avatars/<user id>/
  const { data: files } = await supabase.storage.from('avatars').list(id)
  if (files?.length) {
    await supabase.storage.from('avatars').remove(files.map((f) => `${id}/${f.name}`))
  }

  // connections are removed by the profiles foreign key (on delete cascade)
  // TODO: also delete this user's rows in other tables here (listings, users_table, messages, bookings)
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', id)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const { error: deleteError } = await supabase.auth.admin.deleteUser(id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}