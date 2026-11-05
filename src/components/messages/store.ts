// Messages data store backed by /api/messages with localStorage sync so Postman and the UI stay in sync.

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
  messages: Message[]
  unread?: boolean
  sample?: boolean // true for the made-up starter conversations
}

const KEY = 'subtle-messages-v1'
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

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

const lastAt = (c: Conversation) => c.messages[c.messages.length - 1]?.sentAt ?? ''
const newestFirst = (list: Conversation[]) => [...list].sort((a, b) => lastAt(b).localeCompare(lastAt(a)))

// Fetch conversations from /api/messages and merge with any local threads
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const res = await fetch('/api/messages', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.conversations)) {
        writeLocal(data.conversations)
        return newestFirst(data.conversations)
      }
    }
  } catch {}
  return newestFirst(readLocal())
}

// Send message via POST /api/messages
export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, body }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.message) {
        writeLocal(readLocal().map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, data.message] } : c)))
        return data.message as Message
      }
    }
  } catch {}

  const msg: Message = { id: uid(), from: 'me', body, sentAt: new Date().toISOString() }
  writeLocal(readLocal().map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c)))
  return msg
}

// Mark conversation read via PATCH /api/messages
export async function markRead(conversationId: string) {
  writeLocal(readLocal().map((c) => (c.id === conversationId ? { ...c, unread: false } : c)))
  try {
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, unread: false }),
    })
  } catch {}
}

// Used by ContactHost and InternMatches: starts or appends to a conversation via POST /api/messages
export async function startConversation(
  listing: { id: string; title: string; score?: number; hostName: string },
  body: string,
): Promise<string> {
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: listing.id,
        listingTitle: listing.title,
        listingScore: listing.score,
        hostName: listing.hostName,
        body,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.conversationId) {
        await loadConversations()
        return data.conversationId as string
      }
    }
  } catch {}

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
