// Messages data store.
// Real conversations come from /api/conversations (Supabase). Sample listings and
// logged-out visitors fall back to demo threads kept in localStorage.
import { apiFetch } from '../../lib/apiFetch'

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
  hostName: string // the other person in the conversation
  messages: Message[]
  unread?: boolean
  sample?: boolean // true for the made-up starter conversations
}

const KEY = 'subtle-messages-v1'
const READ_KEY = 'subtle-read-v1' // { [conversationId]: ISO time last opened } for real conversations
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

// Demo threads use ids like "c-soma-loft"; real conversations use Supabase UUIDs
const isDemo = (id: string) => id.startsWith('c-')

function readLocal(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY)
    // older versions seeded made-up conversations (sample: true); drop them
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

      const real = await Promise.all(
        rows.map(async (r): Promise<Conversation> => {
          const [msgRes, listingRes] = await Promise.all([
            apiFetch(`/api/conversations/${r.conversation_id}/messages`, { cache: 'no-store' }),
            r.listing_id ? fetch(`/api/listings/${r.listing_id}`) : Promise.resolve(null),
          ])
          const raw: any[] = msgRes.ok ? await msgRes.json() : []
          const listingData = listingRes?.ok ? await listingRes.json() : null

          const messages: Message[] = raw.map((m) => ({
            id: m.id,
            from: m.sender_id === r.other_user_id ? 'them' : 'me',
            body: m.body,
            sentAt: m.created_at,
          }))

          // Unread = their latest message is newer than the last time this thread was opened
          const last = r.last_message
          const readAt = [r.last_read_at, markers[r.conversation_id]].filter(Boolean).sort().pop() as string | undefined
          const unread = !!last && last.sender_id === r.other_user_id && (!readAt || last.created_at > readAt)

          return {
            id: r.conversation_id,
            listingId: r.listing_id ?? '',
            listingTitle: listingData?.listing?.title ?? 'Direct message',
            hostName: r.other_user_name,
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