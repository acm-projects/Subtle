import { admin } from './supabase-admin'
import type { Listing } from '../components/matches/listings'

/** Fills in host fields on a match-view listing from the host_profiles view. */
export async function withHost(listing: Listing, userId?: string | null): Promise<Listing> {
  if (!userId) return listing

  // server only: host_profiles is read with the server key
  const { data, error } = await admin()
    .from('host_profiles')
    .select('user_id, first_name, last_initial, is_edu')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) console.error('host lookup failed:', error)
  if (!data) return listing

  return {
    ...listing,
    hostId: data.user_id,
    hostName: `${data.first_name} ${data.last_initial}.`,
    hostVerified: data.is_edu,
  }
}