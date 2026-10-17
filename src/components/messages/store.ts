// Messages data + a tiny store kept in this browser for now.
// Backend: replace the functions marked TODO(backend) with Supabase calls; the UI only uses these.

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

// SAMPLE DATA ONLY (made up) so the inbox isn't empty in the demo.
function sampleConversations(): Conversation[] {
  return [
    {
      id: 'c-soma-loft',
      listingId: 'soma-loft',
      listingTitle: 'SoMa loft',
      listingScore: 96,
      hostName: 'Maya',
      unread: true,
      sample: true,
      messages: [
        { id: uid(), from: 'me', body: "Hi Maya, I'm interning at Stripe this summer and I'm interested in the SoMa loft.", sentAt: ago(60 * 26) },
        { id: uid(), from: 'them', body: 'Hi! Thanks for reaching out. The room is open from June 1. Want to set up a video tour?', sentAt: ago(60 * 25) },
        { id: uid(), from: 'me', body: 'That would be great. Does Thursday evening work?', sentAt: ago(60 * 3) },
        { id: uid(), from: 'them', body: 'Thursday at 6 works. I will send a link here.', sentAt: ago(12) },
      ],
    },
    {
      id: 'c-hayes-valley-studio',
      listingId: 'hayes-valley-studio',
      listingTitle: 'Hayes Valley studio',
      listingScore: 87,
      hostName: 'Daniel',
      sample: true,
      messages: [
        { id: uid(), from: 'me', body: 'Hi Daniel, is the studio still available for the summer?', sentAt: ago(60 * 50) },
        { id: uid(), from: 'them', body: 'It is! Utilities are included. Let me know if you have questions.', sentAt: ago(60 * 48) },
      ],
    },
    {
      id: 'c-mission-apartment',
      listingId: 'mission-apartment',
      listingTitle: 'Mission apartment',
      listingScore: 73,
      hostName: 'Priya',
      sample: true,
      messages: [{ id: uid(), from: 'me', body: 'Hi Priya, are the other two roommates interns too?', sentAt: ago(60 * 24 * 4) }],
    },
  ]
}

function read(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  const seeded = sampleConversations()
  write(seeded)
  return seeded
}

function write(list: Conversation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

const lastAt = (c: Conversation) => c.messages[c.messages.length - 1]?.sentAt ?? ''
const newestFirst = (list: Conversation[]) => [...list].sort((a, b) => lastAt(b).localeCompare(lastAt(a)))

// TODO(backend): fetch the logged-in user's conversations (with their messages)
export async function loadConversations(): Promise<Conversation[]> {
  return newestFirst(read())
}

// TODO(backend): insert the message for this conversation
export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const msg: Message = { id: uid(), from: 'me', body, sentAt: new Date().toISOString() }
  write(read().map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c)))
  return msg
}

// TODO(backend): mark the conversation as read for this user
export async function markRead(conversationId: string) {
  write(read().map((c) => (c.id === conversationId ? { ...c, unread: false } : c)))
}

// Used by the Contact page: adds to an existing thread with this host or starts a new one.
// TODO(backend): find-or-create the conversation for (user, listing), then insert the message
export async function startConversation(
  listing: { id: string; title: string; score?: number; hostName: string },
  body: string,
): Promise<string> {
  const list = read()
  const existing = list.find((c) => c.listingId === listing.id)
  const msg: Message = { id: uid(), from: 'me', body, sentAt: new Date().toISOString() }
  if (existing) {
    write(list.map((c) => (c.id === existing.id ? { ...c, messages: [...c.messages, msg] } : c)))
    return existing.id
  }
  const id = `c-${listing.id}-${uid()}`
  write([{ id, listingId: listing.id, listingTitle: listing.title, listingScore: listing.score, hostName: listing.hostName, messages: [msg] }, ...list])
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
