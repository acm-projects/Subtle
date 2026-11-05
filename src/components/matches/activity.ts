// Saved homes and booking requests.
// Saved homes: public.saved_homes in Supabase, with a copy in this browser so pages can read it instantly.
// Booking requests: public.bookings through /api/bookings.

import type { Listing } from './listings'
import { supabase } from '../../lib/supabase'
import { authFetch } from '../../lib/auth-fetch'

const SAVED_KEY = 'subtle-saved-v1'
const BOOKINGS_KEY = 'subtle-bookings-v1'
// ids of the made-up San Francisco listings that used to ship with the app; anything saved for them is dropped
const OLD_SAMPLE_IDS = new Set(['soma-loft', 'hayes-valley-studio', 'mission-apartment', 'nob-hill-room', 'potrero-house'])

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// ---- saved homes ----

// The ids of homes this user saved, from this browser's copy (instant). Call syncSaved() to refresh it.
export function loadSaved(): string[] {
  return read<string[]>(SAVED_KEY, []).filter((id) => !OLD_SAMPLE_IDS.has(id))
}

// Pull the signed-in user's saved homes from Supabase into this browser's copy. Returns the ids.
// Hearts saved in this browser before saved homes moved to Supabase are uploaded once.
export async function syncSaved(): Promise<string[]> {
  const local = loadSaved()
  try {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return local
    const { data, error } = await supabase.from('saved_homes').select('listing_id').order('created_at', { ascending: false })
    if (error) return local
    const remote = (data ?? []).map((r) => r.listing_id as string)
    const missing = local.filter((id) => !remote.includes(id))
    if (missing.length) {
      // only real listings can be saved (old ids that no longer exist are dropped by the foreign key)
      await Promise.all(missing.map((listing_id) => supabase.from('saved_homes').insert({ listing_id })))
      const { data: again } = await supabase.from('saved_homes').select('listing_id').order('created_at', { ascending: false })
      const ids = (again ?? []).map((r) => r.listing_id as string)
      write(SAVED_KEY, ids)
      return ids
    }
    write(SAVED_KEY, remote)
    return remote
  } catch {
    return local
  }
}

// Save or unsave a home: updates this browser's copy right away and Supabase in the background.
export function toggleSavedId(id: string): string[] {
  const now = loadSaved()
  const saving = !now.includes(id)
  const next = saving ? [id, ...now] : now.filter((x) => x !== id)
  write(SAVED_KEY, next)
  void (async () => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      if (saving) await supabase.from('saved_homes').upsert({ listing_id: id }, { onConflict: 'user_id,listing_id' })
      else await supabase.from('saved_homes').delete().eq('listing_id', id)
    } catch {}
  })()
  return next
}

// ---- booking requests ----

export type BookingStatus = 'requested' | 'accepted' | 'booked' | 'declined'

export type Booking = {
  id?: string // server id (from /api/bookings)
  listingId: string
  title: string
  hostName: string
  availableFrom: string
  availableTo: string
  price: number
  status: BookingStatus
  requestedAt: string // ISO
}

export const BOOKING_STEPS: { id: BookingStatus; label: string }[] = [
  { id: 'requested', label: 'Requested' },
  { id: 'booked', label: 'Booked' },
]

// TODO(backend): load this user's booking requests with their current status
export function loadBookings(): Booking[] {
  return read<Booking[]>(BOOKINGS_KEY, []).filter((b) => !OLD_SAMPLE_IDS.has(b.listingId))
}

// TODO(backend): create the booking request
export function addBookingRequest(l: Listing): Booking {
  const booking: Booking = {
    listingId: l.id,
    title: l.title,
    hostName: l.hostName,
    availableFrom: l.availableFrom,
    availableTo: l.availableTo,
    price: l.price,
    status: 'requested',
    requestedAt: new Date().toISOString(),
  }
  write(BOOKINGS_KEY, [booking, ...loadBookings().filter((b) => b.listingId !== l.id)])
  return booking
}

// Booking requests this user sent, from the server (so a host's accept/decline shows up),
// merged with any older ones saved in this browser. Newest first.
export async function loadMyBookings(email: string | null): Promise<Booking[]> {
  const local = loadBookings()
  if (!email) return local
  let server: Booking[] = []
  let reached = false
  try {
    const res = await authFetch('/api/bookings', { cache: 'no-store' })
    if (res.ok) {
      reached = true
      const json = await res.json()
      server = (Array.isArray(json.bookings) ? json.bookings : []).map(
        (b: { id: string; listingId: string; listingTitle: string; hostName: string; moveIn: string; moveOut: string; monthlyRent: number; status: string; createdAt: string }) => ({
          id: b.id,
          listingId: b.listingId,
          title: b.listingTitle,
          hostName: b.hostName,
          availableFrom: b.moveIn,
          availableTo: b.moveOut,
          price: b.monthlyRent,
          status: b.status === 'accepted' ? 'booked' : b.status === 'declined' ? 'declined' : 'requested',
          requestedAt: b.createdAt,
        }),
      )
    }
  } catch {}
  server = server.filter((b) => !OLD_SAMPLE_IDS.has(b.listingId))
  // requests live in Supabase now; this browser's old copies are only shown if the server can't be reached
  if (reached) return server.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  return local
}
