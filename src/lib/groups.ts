// Shared helpers for group chats (server only).
import { admin } from './supabase-admin'

/** "Aisha K." for each user id, from users_table */
export async function namesFor(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return names
  const { data } = await admin().from('users_table').select('id, first_name, last_name').in('id', unique)
  for (const p of data ?? []) {
    const initial = p.last_name ? ` ${String(p.last_name)[0]}.` : ''
    names.set(String(p.id), `${p.first_name ?? 'Subtle intern'}${initial}`)
  }
  return names
}

/** Ids of everyone the user has an accepted connection with */
export async function connectedIds(userId: string): Promise<Set<string>> {
  const { data } = await admin()
    .from('connections')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  return new Set((data ?? []).map((c) => (c.requester_id === userId ? String(c.addressee_id) : String(c.requester_id))))
}

/** Invite people to a group. Only the inviter's accepted connections, and not people already in it. */
export async function inviteToGroup(conversationId: string, inviterId: string, userIds: unknown): Promise<{ invited: number } | { error: string }> {
  if (!Array.isArray(userIds) || userIds.some((u) => typeof u !== 'string')) return { error: 'userIds must be a list of ids' }
  const wanted = [...new Set(userIds as string[])].filter((u) => u !== inviterId)
  if (!wanted.length) return { invited: 0 }

  const friends = await connectedIds(inviterId)
  if (wanted.some((u) => !friends.has(u))) return { error: 'You can only add people you are connected with' }

  const { data: members } = await admin().from('conversation_participants').select('user_id').eq('conversation_id', conversationId)
  const inGroup = new Set((members ?? []).map((m) => String(m.user_id)))
  const rows = wanted
    .filter((u) => !inGroup.has(u))
    .map((u) => ({ conversation_id: conversationId, invited_user_id: u, invited_by: inviterId, status: 'pending', responded_at: null }))
  if (!rows.length) return { invited: 0 }

  // a person who said no before can be asked again
  const { error } = await admin().from('conversation_invites').upsert(rows, { onConflict: 'conversation_id,invited_user_id' })
  if (error) return { error: error.message }
  return { invited: rows.length }
}
