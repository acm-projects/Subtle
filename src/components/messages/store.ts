import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/apiFetch'

// ---------- Types the UI uses ----------

export type Message = {
  id: string
  from: 'me' | 'them'
  body: string
  sentAt: string // ISO timestamp
}

export type Conversation = {
  id: string
  listingId: string
  listingTitle: string
  listingScore?: number
  hostName: string
  kind: 'listing' | 'intern'
  messages: Message[]
  unread?: boolean
  sample?: boolean
}

// ---------- Shapes the API returns ----------

type ApiMessage = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

type ApiConversation = {
  conversation_id: string
  listing_id: string | null
  kind: 'listing' | 'intern'
  last_read_at: string
  other_user_id: string | null
  last_message: { body: string; created_at: string; sender_id: string } | null
  other_user_name?: string
  listing_title?: string
}

// ---------- Helpers ----------

async function myUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

const toMessage = (m: ApiMessage, me: string | null): Message => ({
  id: m.id,
  from: m.sender_id === me ? 'me' : 'them',
  body: m.body,
  sentAt: m.created_at,
})

const lastAt = (c: Conversation) => c.messages[c.messages.length - 1]?.sentAt ?? ''
const newestFirst = (list: Conversation[]) =>
  [...list].sort((a, b) => Date.parse(lastAt(b)) - Date.parse(lastAt(a)))

// ---------- Backend calls ----------

export async function loadConversations(): Promise<Conversation[]> {
  const me = await myUserId()
  const res = await apiFetch('/api/conversations')
  if (!res.ok) return []
  const items: ApiConversation[] = await res.json()

  // One extra request per conversation for now; fine at this size
  const list = await Promise.all(
    items.map(async (c): Promise<Conversation> => {
      const mres = await apiFetch(`/api/conversations/${c.conversation_id}/messages`)
      const raw: ApiMessage[] = mres.ok ? await mres.json() : []
      const last = c.last_message

      return {
        id: c.conversation_id,
        listingId: c.listing_id ?? '',
        listingTitle: c.listing_title ?? 'Conversation', // TODO: real title
        hostName: c.other_user_name ?? 'Host',
        kind: c.kind,
        messages: raw.map((m) => toMessage(m, me)),
        unread:
          !!last &&
          last.sender_id !== me &&
          Date.parse(last.created_at) > Date.parse(c.last_read_at),
      }
    }),
  )
  return newestFirst(list)
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const me = await myUserId()
  const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error('Could not send message')
  return toMessage(await res.json(), me)
}

export async function markRead(conversationId: string) {
  await apiFetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
}

// Used by ContactHost (with a listing id) and InternMatches (no listing id)
export async function startConversation(
  listing: { id?: string; title?: string; score?: number; hostName?: string; hostUserId: string },
  body: string,
): Promise<string> {
  const res = await apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ otherUserId: listing.hostUserId, listingId: listing.id }),
  })
  if (!res.ok) throw new Error('Could not start conversation')
  const { id } = await res.json()

  await sendMessage(id, body)
  return id
}

// ---------- Display helpers (unchanged) ----------

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