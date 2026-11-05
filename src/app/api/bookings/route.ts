import { NextResponse } from 'next/server'
import { supabaseForRequest } from '../../../lib/supabase-server'
import { admin } from '../../../lib/supabase-admin'

// Booking requests live in public.bookings. Every call runs as the signed-in caller, and the table's
// access rules decide what they see: the guest sees their own requests, the host sees requests for
// their listings and is the only one who can accept or decline them.

export type BookingRequest = {
  id: string
  listingId: string
  listingTitle: string
  hostName: string
  guestEmail: string
  guestName: string
  moveIn: string
  moveOut: string
  monthlyRent: number
  note: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

type Row = {
  id: string
  listing_id: string
  guest_id: string
  guest_name: string | null
  move_in: string | null
  move_out: string | null
  monthly_rent: number | null
  note: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  listing_table?: { title: string | null } | null
}

const toBooking = (r: Row, emails: Map<string, string>): BookingRequest => ({
  id: r.id,
  listingId: r.listing_id,
  listingTitle: r.listing_table?.title ?? 'Sublet listing',
  hostName: 'Student Host',
  guestEmail: emails.get(r.guest_id) ?? '',
  guestName: r.guest_name ?? 'An intern',
  moveIn: r.move_in ?? '',
  moveOut: r.move_out ?? '',
  monthlyRent: r.monthly_rent ?? 0,
  note: r.note ?? '',
  status: r.status,
  createdAt: r.created_at,
})

const SELECT = 'id, listing_id, guest_id, guest_name, move_in, move_out, monthly_rent, note, status, created_at, listing_table(title)'

/**
 * GET /api/bookings            -> the caller's own requests (as a guest)
 * GET /api/bookings?listingId= -> requests for that listing (only its host gets any back)
 */
export async function GET(request: Request) {
  const auth = supabaseForRequest(request)
  if (!auth) return NextResponse.json({ total: 0, bookings: [] })
  const { client } = auth
  const { data: me } = await client.auth.getUser(auth.token)
  if (!me.user) return NextResponse.json({ total: 0, bookings: [] })

  const listingId = new URL(request.url).searchParams.get('listingId')
  let query = client.from('bookings').select(SELECT).order('created_at', { ascending: false })
  query = listingId ? query.eq('listing_id', listingId) : query.eq('guest_id', me.user.id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as Row[]
  // guest emails for the host's view
  const emails = new Map<string, string>()
  const guestIds = Array.from(new Set(rows.map((r) => r.guest_id)))
  if (guestIds.length) {
    // the host can't read other users' rows directly; the server key looks up just these guests' emails
    const { data: people } = await admin().from('users_table').select('id, student_email').in('id', guestIds)
    for (const p of people ?? []) if (p.student_email) emails.set(p.id, p.student_email)
  }
  const bookings = rows.map((r) => toBooking(r, emails))
  return NextResponse.json({ total: bookings.length, bookings })
}

/**
 * POST /api/bookings  body: { listingId, moveIn?, moveOut?, monthlyRent?, note?, guestName? }
 * One request per guest per listing; sending again updates it (and puts it back to pending).
 */
export async function POST(request: Request) {
  const auth = supabaseForRequest(request)
  if (!auth) return NextResponse.json({ error: 'Log in to request a booking' }, { status: 401 })
  const { data: me } = await auth.client.auth.getUser(auth.token)
  if (!me.user) return NextResponse.json({ error: 'Log in to request a booking' }, { status: 401 })

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const listingId = String(body.listingId ?? '').trim()
  if (!listingId) return NextResponse.json({ error: 'listingId is required' }, { status: 400 })

  const row = {
    listing_id: listingId,
    guest_id: me.user.id,
    guest_name: String(body.guestName ?? '').trim() || null,
    move_in: body.moveIn ? String(body.moveIn) : null,
    move_out: body.moveOut ? String(body.moveOut) : null,
    monthly_rent: Number.isFinite(Number(body.monthlyRent)) ? Math.round(Number(body.monthlyRent)) : null,
    note: String(body.note ?? '').trim() || null,
    status: 'pending' as const,
  }
  const { data, error } = await auth.client.from('bookings').upsert(row, { onConflict: 'listing_id,guest_id' }).select(SELECT).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toBooking(data as unknown as Row, new Map([[me.user.id, me.user.email ?? '']])), { status: 201 })
}

/**
 * PATCH /api/bookings  body: { id, status: 'accepted' | 'declined' | 'pending' }
 * Only the listing's host can do this (the table's rules enforce it).
 */
export async function PATCH(request: Request) {
  const auth = supabaseForRequest(request)
  if (!auth) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const id = String(body.id ?? '').trim()
  const status = body.status
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (status !== 'accepted' && status !== 'declined' && status !== 'pending') {
    return NextResponse.json({ error: "status must be 'accepted', 'declined' or 'pending'" }, { status: 400 })
  }

  const { data, error } = await auth.client.from('bookings').update({ status }).eq('id', id).select(SELECT).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Booking not found, or it is not for one of your listings' }, { status: 404 })
  return NextResponse.json(toBooking(data as unknown as Row, new Map()))
}
