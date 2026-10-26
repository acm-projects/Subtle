import { NextResponse } from 'next/server'

// Listing view counts for the renter page.
// Kept in server memory (resets when the server restarts), same pattern as /api/bookings.
// TODO(backend): store views in Supabase (e.g. a listing_views table or a views column on listing_table).

declare global {
  // eslint-disable-next-line no-var
  var __subtleListingViews: Map<string, number> | undefined
}

function store() {
  if (!globalThis.__subtleListingViews) globalThis.__subtleListingViews = new Map()
  return globalThis.__subtleListingViews
}

/** GET /api/listing-views?listingId=abc  ->  { listingId, views } */
export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get('listingId')
  if (!listingId) return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
  return NextResponse.json({ listingId, views: store().get(listingId) ?? 0 })
}

/** POST /api/listing-views  body: { listingId }  ->  { listingId, views } */
export async function POST(request: Request) {
  let body: { listingId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const id = typeof body.listingId === 'string' ? body.listingId.trim() : ''
  if (!id) return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
  const views = (store().get(id) ?? 0) + 1
  store().set(id, views)
  return NextResponse.json({ listingId: id, views })
}
