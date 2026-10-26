import { NextResponse } from 'next/server'
import { dbListingToMatchListing, getListing as getSampleListing } from '../../../components/matches/listings'
import { getListing as getDbListing } from '../../../lib/listings'

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

declare global {
  // eslint-disable-next-line no-var
  var __subtleBookings: BookingRequest[] | undefined
}

function getBookingsStore(): BookingRequest[] {
  if (!globalThis.__subtleBookings) {
    globalThis.__subtleBookings = []
  }
  return globalThis.__subtleBookings
}

/**
 * GET /api/bookings
 * Query params:
 *   - listingId: filter bookings for a specific listing
 *   - email: filter bookings requested by a specific student email
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listingId')
  const email = searchParams.get('email')

  let list = getBookingsStore()
  if (listingId) list = list.filter((b) => b.listingId === listingId)
  if (email) list = list.filter((b) => b.guestEmail.toLowerCase() === email.toLowerCase())

  return NextResponse.json({
    total: list.length,
    bookings: list,
  })
}

/**
 * POST /api/bookings
 * Body: {
 *   listingId: string,
 *   moveIn?: string,
 *   moveOut?: string,
 *   note?: string,
 *   guestEmail?: string,
 *   guestName?: string
 * }
 */
export async function POST(request: Request) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const listingId = (body.listingId ?? '').toString().trim()
  if (!listingId) {
    return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
  }

  let listing = getSampleListing(listingId)
  if (!listing) {
    try {
      const db = await getDbListing(listingId)
      if (db) listing = dbListingToMatchListing(db)
    } catch {}
  }

  const booking: BookingRequest = {
    id: `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    listingId,
    listingTitle: body.listingTitle ?? listing?.title ?? 'Sublet listing',
    hostName: body.hostName ?? listing?.hostName ?? 'Student Host',
    guestEmail: (body.guestEmail ?? body.email ?? 'intern@subtle.edu').toString().trim(),
    guestName: (body.guestName ?? body.name ?? 'Summer Intern').toString().trim(),
    moveIn: (body.moveIn ?? listing?.availableFrom ?? 'June 1').toString(),
    moveOut: (body.moveOut ?? listing?.availableTo ?? 'Aug 22').toString(),
    monthlyRent: Number(body.monthlyRent ?? listing?.price ?? 1800),
    note: (body.note ?? '').toString().trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  const store = getBookingsStore()
  store.unshift(booking)

  return NextResponse.json(booking, { status: 201 })
}


/**
 * PATCH /api/bookings
 * Body: { id: string, status: 'accepted' | 'declined' | 'pending' }
 * The host accepts or declines a request. Returns the updated booking.
 * TODO(backend): check that the caller owns the listing once bookings move to Supabase.
 */
export async function PATCH(request: Request) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id = (body.id ?? '').toString().trim()
  const status = body.status
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (status !== 'accepted' && status !== 'declined' && status !== 'pending') {
    return NextResponse.json({ error: "status must be 'accepted', 'declined' or 'pending'" }, { status: 400 })
  }

  const booking = getBookingsStore().find((b) => b.id === id)
  if (!booking) return NextResponse.json({ error: `Booking "${id}" not found` }, { status: 404 })

  booking.status = status
  return NextResponse.json(booking)
}
