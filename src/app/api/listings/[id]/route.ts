import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { dbListingToMatchListing, getListing as getSampleListing } from '../../../../components/matches/listings'
import { getListing as getDbListing, validateListing } from '../../../../lib/listings'
import { supabase } from '../../../../lib/supabase'

const TABLE = 'listing_table'

type Context = { params: Promise<{ id: string }> }

function getSupabaseForRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (token) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
  }
  return supabase
}

/**
 * GET /api/listings/[id]
 * Returns a single listing by ID (checks Supabase listing_table first, then sample listings).
 */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  try {
    const dbListing = await getDbListing(id)
    if (dbListing) {
      return NextResponse.json({
        listing: dbListing,
        matchView: dbListingToMatchListing(dbListing),
      })
    }
  } catch (err) {
    console.error('Error querying listing from DB:', err)
  }

  const sample = getSampleListing(id)
  if (sample) {
    return NextResponse.json({
      listing: sample,
      matchView: sample,
      sample: true,
    })
  }

  return NextResponse.json({ error: `Listing "${id}" not found` }, { status: 404 })
}

/**
 * PATCH /api/listings/[id]
 * Updates fields on a listing in Supabase listing_table.
 */
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    validateListing(body, true)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const sb = getSupabaseForRequest(request)
  const { data, error } = await sb.from(TABLE).update(body).eq('id', id).select().single()

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/listings/[id]
 * Deletes a listing by ID from Supabase listing_table.
 */
export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params
  const sb = getSupabaseForRequest(request)
  const { error } = await sb.from(TABLE).delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, id })
}

