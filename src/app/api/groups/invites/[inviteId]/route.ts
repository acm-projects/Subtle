import { NextResponse } from 'next/server'
import { admin, callerFrom } from '../../../../../lib/supabase-admin'

// POST { accept: true | false }: answer a group invite. Yes adds you to the chat; no just closes the invite.
export async function POST(request: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  const { inviteId } = await params
  const caller = await callerFrom(request)
  if (!caller) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (typeof body?.accept !== 'boolean') return NextResponse.json({ error: 'accept must be true or false' }, { status: 400 })

  const { data: invite } = await admin()
    .from('conversation_invites')
    .select('id, conversation_id, invited_user_id, status')
    .eq('id', inviteId)
    .maybeSingle()
  // only the person invited can answer, and only once
  if (!invite || invite.invited_user_id !== caller.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'Already answered' }, { status: 409 })

  if (body.accept) {
    const { error } = await admin()
      .from('conversation_participants')
      .upsert({ conversation_id: invite.conversation_id, user_id: caller.id }, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { error } = await admin()
    .from('conversation_invites')
    .update({ status: body.accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ conversationId: body.accept ? invite.conversation_id : null })
}
