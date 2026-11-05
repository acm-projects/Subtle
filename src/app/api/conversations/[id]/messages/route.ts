import { NextResponse } from 'next/server'
import { createUserClient } from '../../../../../lib/supabaseServer'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { client } = createUserClient(req)

  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data.reverse())
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body || body.length > 2000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
  }

  const { data, error } = await client
    .from('messages')
    .insert({ conversation_id: id, sender_id: user.id, body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

