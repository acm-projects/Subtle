import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export type MessageItem = {
  id: string
  from: 'me' | 'them'
  body: string
  sentAt: string
}

export type ConversationItem = {
  id: string
  listingId: string
  listingTitle: string
  listingScore?: number
  hostName: string
  messages: MessageItem[]
  unread?: boolean
  sample?: boolean
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

declare global {
  // eslint-disable-next-line no-var
  var __subtleConversations: ConversationItem[] | undefined
}

function getServerStore(): ConversationItem[] {
  if (!globalThis.__subtleConversations) {
    globalThis.__subtleConversations = [
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
  return globalThis.__subtleConversations
}

const lastAt = (c: ConversationItem) => c.messages[c.messages.length - 1]?.sentAt ?? ''
const newestFirst = (list: ConversationItem[]) => [...list].sort((a, b) => lastAt(b).localeCompare(lastAt(a)))

/**
 * GET /api/messages
 * Query params:
 *   - conversationId (or c): optional ID to retrieve a single conversation
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId') ?? searchParams.get('c')

  // Check if a Supabase messages_table exists; if so, merge with in-memory store
  const store = getServerStore()
  try {
    const { data, error } = await supabase.from('messages_table').select('*')
    if (!error && Array.isArray(data) && data.length > 0) {
      // Optional future Supabase table sync
    }
  } catch {}

  if (conversationId) {
    const found = store.find((c) => c.id === conversationId)
    if (!found) {
      return NextResponse.json({ error: `Conversation "${conversationId}" not found` }, { status: 404 })
    }
    return NextResponse.json(found)
  }

  return NextResponse.json({
    total: store.length,
    conversations: newestFirst(store),
  })
}

/**
 * POST /api/messages
 * Body can be:
 * 1) Reply to existing conversation:
 *    { conversationId: string, body: string, from?: 'me' | 'them' }
 * 2) Start or append to a conversation for a listing/intern:
 *    { listingId: string, listingTitle?: string, listingScore?: number, hostName: string, body: string }
 */
export async function POST(request: Request) {
  let payload: Record<string, any>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const text = (payload.body ?? payload.message ?? '').toString().trim()
  if (!text) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
  }

  const store = getServerStore()
  const msg: MessageItem = {
    id: uid(),
    from: payload.from === 'them' ? 'them' : 'me',
    body: text,
    sentAt: new Date().toISOString(),
  }

  // Case 1: Append to existing conversationId
  if (payload.conversationId) {
    const existing = store.find((c) => c.id === payload.conversationId)
    if (!existing) {
      return NextResponse.json({ error: `Conversation "${payload.conversationId}" not found` }, { status: 404 })
    }
    existing.messages.push(msg)
    return NextResponse.json({ conversation: existing, message: msg }, { status: 201 })
  }

  // Case 2: Start or append by listingId
  const listingId = (payload.listingId ?? payload.id ?? 'general').toString()
  const listingTitle = (payload.listingTitle ?? payload.title ?? 'Sublet listing').toString()
  const hostName = (payload.hostName ?? 'Host').toString()
  const listingScore = typeof payload.listingScore === 'number' ? payload.listingScore : payload.score

  let conv = store.find((c) => c.listingId === listingId)
  if (conv) {
    conv.messages.push(msg)
  } else {
    conv = {
      id: `c-${listingId}-${uid()}`,
      listingId,
      listingTitle,
      listingScore,
      hostName,
      messages: [msg],
    }
    store.unshift(conv)
  }

  return NextResponse.json({ conversationId: conv.id, conversation: conv, message: msg }, { status: 201 })
}

/**
 * PATCH /api/messages
 * Body: { conversationId: string, unread?: boolean }
 */
export async function PATCH(request: Request) {
  let payload: Record<string, any>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const conversationId = payload.conversationId ?? payload.id
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }

  const store = getServerStore()
  const conv = store.find((c) => c.id === conversationId)
  if (!conv) {
    return NextResponse.json({ error: `Conversation "${conversationId}" not found` }, { status: 404 })
  }

  conv.unread = payload.unread ?? false
  return NextResponse.json(conv)
}

