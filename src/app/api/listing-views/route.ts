import { NextResponse } from 'next/server'
import { admin, callerFrom } from '../../../lib/supabase-admin'

// Listing views live in public.listing_views (one row per person per listing, so refreshing
// doesn't inflate the count). Signed-in viewers are counted by their account; logged-out
// viewers by a random id their browser keeps. The host's own visits don't count.

/** GET /api/listing-views?listingId=abc  ->  { listingId, views } */
export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get('listingId')
  if (!listingId) return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
  const { count, error } = await admin()
    .from('listing_views')
    .select('viewer_key', { count: 'exact', head: true })
    .eq('listing_id', listingId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listingId, views: count ?? 0 })
}

/** POST /api/listing-views  body: { listingId, visitorId? }  ->  { listingId, counted } */
export async function POST(request: Request) {
  let body: { listingId?: string; visitorId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : ''
  if (!listingId) return NextResponse.json({ error: 'listingId is required' }, { status: 400 })

  const db = admin()
  const me = await callerFrom(request)
  const visitor = typeof body.visitorId === 'string' ? body.visitorId.trim().slice(0, 64) : ''
  const viewerKey = me ? `user:${me.id}` : visitor ? `anon:${visitor}` : ''
  if (!viewerKey) return NextResponse.json({ listingId, counted: false })

  // the host looking at their own listing isn't a view
  const { data: listing } = await db.from('listing_table').select('user_id').eq('id', listingId).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (me && listing.user_id === me.id) return NextResponse.json({ listingId, counted: false })

  const { error } = await db
    .from('listing_views')
    .upsert({ listing_id: listingId, viewer_key: viewerKey }, { onConflict: 'listing_id,viewer_key', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listingId, counted: true })
}
