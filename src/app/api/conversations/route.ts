import { NextResponse } from 'next/server'
import { createUserClient, supabaseAdmin } from '../../../lib/supabaseServer'

// GET: list the logged-in user's conversations
// GET: list the logged-in user's conversations
export async function GET(req: Request) {
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS only lets users see their own participant rows
  const { data: mine, error } = await client
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!mine || mine.length === 0) return NextResponse.json([])

  const ids = mine.map((m) => m.conversation_id)

  // Which listing (if any) each conversation is about
  const { data: convos } = await supabaseAdmin
    .from('conversations')
    .select('id, listing_id')
    .in('id', ids)

  // The OTHER person in each conversation
  const { data: others } = await supabaseAdmin
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', ids)
    .neq('user_id', user.id)

  // Look up each other person's display name by their auth user id
  const otherIds = [...new Set((others ?? []).map((o) => o.user_id))]
  const names = new Map<string, string>()

  await Promise.all(
    otherIds.map(async (uid) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid)
      const meta = data?.user?.user_metadata ?? {}

      // console.log('USER METADATA:', JSON.stringify(meta)) // uncomment to find the right key

      const fullFromParts = [meta.first_name, meta.last_name].filter(Boolean).join(' ')

      names.set(
        uid,
        meta.display_name ??
          meta.displayName ??
          meta.full_name ??
          meta.fullName ??
          meta.name ??
          (fullFromParts || undefined) ??
          data?.user?.email?.split('@')[0] ??
          'User'
      )
    })
  )

  // Latest message for each conversation
  const latest = await Promise.all(
    ids.map(async (cid) => {
      const { data } = await supabaseAdmin
        .from('messages')
        .select('body, created_at, sender_id')
        .eq('conversation_id', cid)
        .order('created_at', { ascending: false })
        .limit(1)
      return { cid, last: data?.[0] ?? null }
    })
  )

  const result = mine.map((m) => {
    const listingId = convos?.find((c) => c.id === m.conversation_id)?.listing_id ?? null
    const otherId = others?.find((o) => o.conversation_id === m.conversation_id)?.user_id ?? null

    return {
      conversation_id: m.conversation_id,
      listing_id: listingId,
      kind: listingId ? 'listing' : 'intern',
      last_read_at: m.last_read_at,
      other_user_id: otherId,
      other_user_name: otherId ? names.get(otherId) ?? 'User' : 'User',
      last_message: latest.find((l) => l.cid === m.conversation_id)?.last ?? null,
    }
  })

  return NextResponse.json(result)
}

// POST: start (or reuse) a conversation with another user, optionally about a listing
export async function POST(req: Request) {
  const { client, token } = createUserClient(req)

  const { data: { user } } = await client.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let otherUserId: unknown
  let listingId: unknown // NEW
  try {
    ({ otherUserId, listingId } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof otherUserId !== 'string' || !otherUserId) {
    return NextResponse.json({ error: 'otherUserId is required' }, { status: 400 })
  }
  if (otherUserId === user.id) {
    return NextResponse.json({ error: "You can't message yourself" }, { status: 400 })
  }

  // NEW: listingId is optional; null means a general chat not tied to a listing
  const listing = typeof listingId === 'string' && listingId ? listingId : null

  // 1. Does a conversation between these two users about this listing already exist?
  const { data: myRows } = await supabaseAdmin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  const myIds = (myRows ?? []).map((r) => r.conversation_id)

  if (myIds.length > 0) {
    const { data: shared } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myIds)

    const sharedIds = (shared ?? []).map((r) => r.conversation_id)

    if (sharedIds.length > 0) {
      // NEW: of the shared conversations, find one for the same listing
      let query = supabaseAdmin.from('conversations').select('id').in('id', sharedIds)
      query = listing ? query.eq('listing_id', listing) : query.is('listing_id', null)
      const { data: match } = await query.limit(1)

      if (match && match.length > 0) {
        return NextResponse.json({ id: match[0].id, existing: true })
      }
    }
  }

  // 2. Otherwise create the conversation, with the listing attached
  const { data: convo, error: convoError } = await supabaseAdmin
    .from('conversations')
    .insert({ listing_id: listing }) // CHANGED: was insert({})
    .select()
    .single()

  if (convoError || !convo) {
    return NextResponse.json({ error: convoError?.message ?? 'Failed to create' }, { status: 400 })
  }

  // 3. Add both participants
  const { error: partError } = await supabaseAdmin
    .from('conversation_participants')
    .insert([
      { conversation_id: convo.id, user_id: user.id },
      { conversation_id: convo.id, user_id: otherUserId },
    ])

  if (partError) {
    // clean up so we don't leave an empty conversation behind
    await supabaseAdmin.from('conversations').delete().eq('id', convo.id)
    return NextResponse.json({ error: partError.message }, { status: 400 })
  }

  return NextResponse.json({ id: convo.id, existing: false }, { status: 201 })
}