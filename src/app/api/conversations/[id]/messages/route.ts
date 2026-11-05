import { NextResponse } from 'next/server'
import { createUserClient } from '../../../../../lib/supabaseServer'

// GET: the latest 50 messages in a conversation (oldest first)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only participants can read (RLS only exposes the user's own participant rows)
  const { data: membership } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json((data ?? []).reverse())
}

// POST: send a message as the logged-in user
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
  if (!body || body.length > 2000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
  }

  // Only participants can send
  const { data: membership } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await client
    .from('messages')
    .insert({ conversation_id: id, sender_id: user.id, body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}