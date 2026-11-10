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

/** "Google LLC", "google" and "Google, Inc." all become "google" */
export function normCompany(name: unknown): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const COMPANY_PREFIX = 'Interns at '

/**
 * Company group chats: one per company, made by Subtle (created_by is empty), titled "Interns at <company>".
 * When an intern opens Messages and someone else on Subtle works at the same company, they get one invite
 * to that company's group. Yes adds them; no closes it and they aren't asked again.
 * (A company invite has invited_by = the person themselves, which the app shows as "Subtle".)
 */
export async function ensureCompanyInvite(userId: string): Promise<void> {
  const db = admin()
  const { data: me } = await db.from('users_table').select('company_name').eq('id', userId).maybeSingle()
  const companyName = String(me?.company_name ?? '').trim()
  const key = normCompany(companyName)
  if (!key) return

  // only worth it if at least one other intern on Subtle is at the same company
  const { data: everyone } = await db.from('users_table').select('id, company_name').neq('id', userId).not('company_name', 'is', null)
  if (!(everyone ?? []).some((u) => normCompany(u.company_name) === key)) return

  // find this company's group (oldest one wins), or make it
  const { data: groups } = await db
    .from('conversations')
    .select('id, title, created_at')
    .eq('is_group', true)
    .is('created_by', null)
    .like('title', `${COMPANY_PREFIX}%`)
    .order('created_at', { ascending: true })
  let groupId = (groups ?? []).find((g) => normCompany(String(g.title).slice(COMPANY_PREFIX.length)) === key)?.id as string | undefined
  if (!groupId) {
    const { data: made, error } = await db
      .from('conversations')
      .insert({ listing_id: null, is_group: true, title: `${COMPANY_PREFIX}${companyName}`.slice(0, 60), created_by: null })
      .select('id')
      .single()
    if (error || !made) return
    groupId = made.id as string
  }

  // already in it, or already asked (yes or no): nothing to do
  const [{ data: member }, { data: invite }] = await Promise.all([
    db.from('conversation_participants').select('user_id').eq('conversation_id', groupId).eq('user_id', userId).maybeSingle(),
    db.from('conversation_invites').select('id').eq('conversation_id', groupId).eq('invited_user_id', userId).maybeSingle(),
  ])
  if (member || invite) return

  await db.from('conversation_invites').insert({ conversation_id: groupId, invited_user_id: userId, invited_by: userId, status: 'pending' })
}
