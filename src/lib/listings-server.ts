import { admin } from './supabase-admin'
import type { Listing } from './listings'

/**
 * SERVER ONLY. One listing by id, including ones that are booked (taken down from Matches), so
 * links in messages, bookings and the host's dashboard still open. null if it doesn't exist.
 */
export async function getListingById(id: string): Promise<Listing | null> {
  const { data, error } = await admin().from('listing_table').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Couldn't load listing: ${error.message}`)
  return (data as Listing | null) ?? null
}
