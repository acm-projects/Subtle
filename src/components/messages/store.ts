// Messages data store.
// Real conversations come from /api/conversations (Supabase). Sample listings and
// logged-out visitors fall back to demo threads kept in localStorage.
import { apiFetch } from '../../lib/apiFetch'
import { supabase } from '../../lib/supabase'

export type Message = {
  id: string
  from: 'me' | 'them'
  senderName?: string // who sent it (shown in group chats)
  body: string
  sentAt: string // ISO timestamp
}

export type Conversation = {
  id: string
  listingId: string
  listingTitle: string
  listingScore?: number
  hostName: string // the other person in the conversation
  iAmHost?: boolean // true when the listing is mine, so the other person is the guest
  isGroup?: boolean // group chat: hostName is the group's name
  members?: { id: string; name: string }[] // everyone else in the chat
  messages: Message[]
  unread?: boolean
  sample?: boolean // true for the made-up starter conversations
}

const KEY = 'subtle-messages-v1'
const READ_KEY = 'subtle-read-v1' // { [conversationId]: ISO time last opened } for real conversations
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()


// Compare timestamps as numbers (Supabase sends "+00:00", JS sends "Z", so strings can compare wrongly)
const time = (iso?: string | null) => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isNaN(t) ? 0 : t
}


// Demo threads use ids like "c-soma-loft"; real conversations use Supabase UUIDs
const isDemo = (id: string) => id.startsWith('c-')

function readLocal(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY)
    // only real conversations (skip any marked sample)
    if (raw) return (JSON.parse(raw) as Conversation[]).filter((c) => !c.sample)
  } catch {}
  return []
}

function writeLocal(list: Conversation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

function readReadMarkers(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function setReadMarker(conversationId: string) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify({ ...readReadMarkers(), [conversationId]: new Date().toISOString() }))
  } catch {}
  try {
    window.dispatchEvent(new Event('messages-read'))
  } catch {}
}

const lastAt = (c: Conversation) => c.messages[c.messages.length - 1]?.sentAt ?? ''
const newestFirst = (list: Conversation[]) => [...list].sort((a, b) => lastAt(b).localeCompare(lastAt(a)))

// ---------- Conversations ----------

// Real conversations from /api/conversations, mapped to the shape the inbox expects.
// Falls back to the demo threads when the user isn't logged in.
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const res = await apiFetch('/api/conversations', { cache: 'no-store' })
    if (res.ok) {
      const rows: any[] = await res.json()
      const markers = readReadMarkers()
      const { data: auth } = await supabase.auth.getUser()
      const myId = auth.user?.id ?? null

      const real = await Promise.all(
        rows.map(async (r): Promise<Conversation> => {
          const [msgRes, listingRes] = await Promise.all([
            apiFetch(`/api/conversations/${r.conversation_id}/messages`, { cache: 'no-store' }),
            r.listing_id ? fetch(`/api/listings/${r.listing_id}`) : Promise.resolve(null),
          ])
          const raw: any[] = msgRes.ok ? await msgRes.json() : []
          const listingData = listingRes?.ok ? await listingRes.json() : null

          const members: { id: string; name: string }[] = r.members ?? []
          const nameOf = new Map(members.map((p) => [p.id, p.name]))
          const messages: Message[] = raw.map((m) => ({
            id: m.id,
            from: m.sender_id === r.my_user_id ? 'me' : 'them',
            senderName: m.sender_id === r.my_user_id ? undefined : nameOf.get(m.sender_id) ?? 'Former member',
            body: m.body,
            sentAt: m.created_at,
          }))

          // Unread = their latest message is newer than the last time this thread was opened
          const last = r.last_message
          const readAt = [r.last_read_at, markers[r.conversation_id]].filter(Boolean).sort().pop() as string | undefined
          const unread = !!last && last.sender_id !== r.my_user_id && (!readAt || time(last.created_at) > time(readAt))

          return {
            id: r.conversation_id,
            listingId: r.listing_id ?? '',
            listingTitle: r.is_group ? `Group · ${members.length + 1} people` : listingData?.listing?.title ?? 'Direct message',
            iAmHost: !!myId && listingData?.listing?.user_id === myId,
            hostName: r.is_group ? r.title ?? 'Group chat' : r.other_user_name,
            isGroup: !!r.is_group,
            members,
            messages,
            unread,
          }
        }),
      )
      return newestFirst(real)
    }
  } catch {}
  return newestFirst(readLocal()) // not logged in: demo threads
}

// Send a reply inside an existing conversation
export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  // Demo threads stay local
  if (isDemo(conversationId)) {
    const msg: Message = { id: uid(), from: 'me', body, sentAt: new Date().toISOString() }
    writeLocal(readLocal().map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c)))
    return msg
  }

  const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error ?? 'Could not send message')
  }
  const m = await res.json()
  return { id: m.id, from: 'me', body: m.body, sentAt: m.created_at }
}

// Mark a conversation read. Real threads are tracked locally for now
// (TODO: add a route that updates last_read_at on conversation_participants).
export async function markRead(conversationId: string) {
  if (isDemo(conversationId)) {
    writeLocal(readLocal().map((c) => (c.id === conversationId ? { ...c, unread: false } : c)))
    return
  }
  setReadMarker(conversationId)
}

// Used by ContactHost and InternMatches: starts (or reuses) a conversation, then sends the first message.
// Real listings (with hostId) go through the API and throw on failure; sample listings stay local.
export async function startConversation(
  listing: { id: string; title: string; score?: number; hostName: string; hostId?: string },
  body: string,
): Promise<string> {
  if (listing.hostId) {
    const convoRes = await apiFetch('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ otherUserId: listing.hostId, listingId: listing.id }),
    })
    if (!convoRes.ok) {
      const err = await convoRes.json().catch(() => null)
      throw new Error(err?.error ?? 'Could not start conversation')
    }
    const { id } = await convoRes.json()

    const msgRes = await apiFetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    if (!msgRes.ok) {
      const err = await msgRes.json().catch(() => null)
      throw new Error(err?.error ?? 'Could not send message')
    }
    return id as string
  }

  // Sample listing (no host): demo thread in localStorage
  const list = readLocal()
  const existing = list.find((c) => c.listingId === listing.id)
  const msg: Message = { id: uid(), from: 'me', body, sentAt: new Date().toISOString() }
  if (existing) {
    writeLocal(list.map((c) => (c.id === existing.id ? { ...c, messages: [...c.messages, msg] } : c)))
    return existing.id
  }
  const id = `c-${listing.id}-${uid()}`
  writeLocal([{ id, listingId: listing.id, listingTitle: listing.title, listingScore: listing.score, hostName: listing.hostName, messages: [msg] }, ...list])
  return id
}

// How many real conversations have an unread message. Cheap: uses only the inbox list.
// Same rule as the inbox: their latest message is newer than the last time you opened the thread.
export async function loadUnreadCount(): Promise<number> {
  const res = await apiFetch('/api/conversations', { cache: 'no-store' })
  if (res.status === 401 || res.status === 403) return 0 // logged out
  if (!res.ok) throw new Error('Could not check messages')

  const rows: any[] = await res.json()
  const markers = readReadMarkers()
  // group invites waiting for a yes / no count as new too
  const invites = await loadGroupStuff().then((g) => g.invites.length).catch(() => 0)

  return invites + rows.filter((r) => {
    const last = r.last_message
    if (!last || last.sender_id === r.my_user_id) return false
    const readAt = Math.max(time(r.last_read_at), time(markers[r.conversation_id]))
    return time(last.created_at) > readAt
  }).length
}

// Called right after a booking request is sent: opens (or reuses) the thread with the host
// and posts a short summary of the request as the first message.
// Returns the conversation id, or null for sample listings (no real host to message).
export async function startBookingConversation(
  listing: { id: string; title: string; score?: number; hostName: string; hostId?: string },
  details: { moveIn?: string; moveOut?: string; note?: string },
): Promise<string | null> {
  if (!listing.hostId) return null

  const host = listing.hostName.split(' ')[0] || 'there'
  const dates = [details.moveIn, details.moveOut].filter(Boolean).join(' – ')
  const lines = [`Hi ${host}, I just requested to book ${listing.title}${dates ? ` for ${dates}` : ''}.`]
  const note = details.note?.trim()
  if (note) lines.push(`Note from me: ${note.slice(0, 1500)}`)

  return startConversation(listing, lines.join('\n\n').slice(0, 2000))
}


// ---------- Group chats ----------

export type GroupInvite = { id: string; conversationId: string; title: string; invitedBy: string; members: string[]; createdAt: string }
export type Person = { id: string; name: string }

async function json(res: Response) {
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error ?? 'Something went wrong')
  return data
}

// My accepted connections (who I can add to a group) and the group invites waiting for my answer
export async function loadGroupStuff(): Promise<{ connections: Person[]; invites: GroupInvite[] }> {
  const res = await apiFetch('/api/groups', { cache: 'no-store' })
  if (!res.ok) return { connections: [], invites: [] }
  return res.json()
}

// Start a group: I'm in right away, the others get a yes / no invite in Messages
export async function createGroup(title: string, userIds: string[]): Promise<string> {
  const data = await json(await apiFetch('/api/groups', { method: 'POST', body: JSON.stringify({ title, userIds }) }))
  return data.id as string
}

export async function inviteToGroup(conversationId: string, userIds: string[]): Promise<number> {
  const data = await json(await apiFetch(`/api/groups/${conversationId}/invite`, { method: 'POST', body: JSON.stringify({ userIds }) }))
  return data.invited as number
}

// Yes joins the chat (returns its id); no just closes the invite
export async function answerInvite(inviteId: string, accept: boolean): Promise<string | null> {
  const data = await json(await apiFetch(`/api/groups/invites/${inviteId}`, { method: 'POST', body: JSON.stringify({ accept }) }))
  return data.conversationId ?? null
}


// ---------- Display helpers ----------

// Time labels without years: "3:42 PM", "Yesterday", "Mon", "Oct 12"
export function shortTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((day(now) - day(d)) / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function dayLabel(iso: string) {
  const t = shortTime(iso)
  if (t.includes(':')) return 'Today'
  return t === 'Yesterday' ? t : new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()