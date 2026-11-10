import { NextResponse } from 'next/server'
import { admin, callerFrom } from '../../../../../lib/supabase-admin'
import { inviteToGroup } from '../../../../../lib/groups'

// POST { userIds }: someone already in the group asks more of their connections to join
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caller = await callerFrom(request)
  if (!caller) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const [{ data: convo }, { data: member }] = await Promise.all([
    admin().from('conversations').select('id, is_group').eq('id', id).maybeSingle(),
    admin().from('conversation_participants').select('user_id').eq('conversation_id', id).eq('user_id', caller.id).maybeSingle(),
  ])
  if (!convo || !convo.is_group || !member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const result = await inviteToGroup(id, caller.id, body?.userIds)
  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
