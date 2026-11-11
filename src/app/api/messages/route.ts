import { NextResponse } from 'next/server'
import { createUserClient } from '../../../lib/supabaseServer'

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

/**
 * GET /api/messages?conversationId=<id>&limit=<n>
 * Returns the messages in one conversation, oldest first.
 * RLS on `messages` makes sure only participants can read them.
 * (The conversation list lives in /api/conversations.)
 */
export async function GET(req: Request) {
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId') ?? searchParams.get('c')
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }

  const limitParam = Number(searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 200

  // Grab the newest `limit` messages, then flip them to oldest-first for display
  const { data, error } = await client
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json((data ?? []).reverse() as MessageRow[])
}

/**
 * POST /api/messages
 * Body: { conversationId: string, body: string }
 * Inserts the message as the logged-in user and returns the saved row.
 * Supabase Realtime picks up the INSERT and pushes it to subscribed clients.
 */
export async function POST(req: Request) {
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let conversationId: unknown
  let body: unknown
  try {
    ({ conversationId, body } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const text = typeof body === 'string' ? body.trim() : ''
  if (typeof conversationId !== 'string' || !conversationId || !text) {
    return NextResponse.json({ error: 'conversationId and body are required' }, { status: 400 })
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
  }

  // sender_id always comes from the verified session, never from the request body.
  // The INSERT policy on `messages` checks the sender is a participant.
  const { data, error } = await client
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    .select('id, conversation_id, sender_id, body, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data as MessageRow, { status: 201 })
}

/**
 * PATCH /api/messages
 * Body: { conversationId: string }
 * Marks the conversation as read for the logged-in user by bumping last_read_at.
 */
export async function PATCH(req: Request) {
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let conversationId: unknown
  try {
    const payload = await req.json()
    conversationId = payload.conversationId ?? payload.id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof conversationId !== 'string' || !conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }

  const { data, error } = await client
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .select('conversation_id, last_read_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  return NextResponse.json(data)
}