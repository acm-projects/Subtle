import { NextResponse } from 'next/server'
import { admin, callerFrom } from '../../../lib/supabase-admin'
import { connectedIds, inviteToGroup, namesFor } from '../../../lib/groups'

// GET: people I can add to a group (my accepted connections) and group invites waiting for my yes / no
export async function GET(request: Request) {
  const caller = await callerFrom(request)
  if (!caller) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const friends = [...(await connectedIds(caller.id))]
  const { data: pending } = await admin()
    .from('conversation_invites')
    .select('id, conversation_id, invited_by, created_at')
    .eq('invited_user_id', caller.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const convoIds = (pending ?? []).map((p) => p.conversation_id)
  const [{ data: convos }, { data: members }] = await Promise.all([
    convoIds.length ? admin().from('conversations').select('id, title').in('id', convoIds) : Promise.resolve({ data: [] as any[] }),
    convoIds.length ? admin().from('conversation_participants').select('conversation_id, user_id').in('conversation_id', convoIds) : Promise.resolve({ data: [] as any[] }),
  ])
  const names = await namesFor([...friends, ...(pending ?? []).map((p) => p.invited_by), ...(members ?? []).map((m) => m.user_id)])

  return NextResponse.json({
    connections: friends.map((id) => ({ id, name: names.get(id) ?? 'Subtle intern' })).sort((a, b) => a.name.localeCompare(b.name)),
    invites: (pending ?? []).map((p) => ({
      id: p.id,
      conversationId: p.conversation_id,
      title: (convos ?? []).find((c) => c.id === p.conversation_id)?.title ?? 'Group chat',
      invitedBy: names.get(p.invited_by) ?? 'Someone',
      members: (members ?? []).filter((m) => m.conversation_id === p.conversation_id).map((m) => names.get(m.user_id) ?? 'Subtle intern'),
      createdAt: p.created_at,
    })),
  })
}

// POST { title, userIds }: start a group. You're in it right away; everyone else gets a yes / no invite.
export async function POST(request: Request) {
  const caller = await callerFrom(request)
  if (!caller) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 60) : ''
  if (!title) return NextResponse.json({ error: 'Give the group a name' }, { status: 400 })
  if (!Array.isArray(body?.userIds) || body.userIds.length === 0) return NextResponse.json({ error: 'Pick at least one person' }, { status: 400 })

  const friends = await connectedIds(caller.id)
  if (body.userIds.some((u: unknown) => typeof u !== 'string' || !friends.has(u))) {
    return NextResponse.json({ error: 'You can only add people you are connected with' }, { status: 400 })
  }

  const { data: convo, error } = await admin()
    .from('conversations')
    .insert({ listing_id: null, is_group: true, title, created_by: caller.id })
    .select('id')
    .single()
  if (error || !convo) return NextResponse.json({ error: error?.message ?? 'Could not create the group' }, { status: 400 })

  const { error: partError } = await admin().from('conversation_participants').insert({ conversation_id: convo.id, user_id: caller.id })
  if (partError) {
    await admin().from('conversations').delete().eq('id', convo.id)
    return NextResponse.json({ error: partError.message }, { status: 400 })
  }

  const result = await inviteToGroup(convo.id, caller.id, body.userIds)
  if ('error' in result) return NextResponse.json({ id: convo.id, error: result.error }, { status: 400 })
  return NextResponse.json({ id: convo.id, invited: result.invited }, { status: 201 })
}
