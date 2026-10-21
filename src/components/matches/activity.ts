// Saved homes and booking requests, kept in this browser for now.
// Backend: swap the bodies of these functions for Supabase calls; the pages only use these.

import type { Listing } from './listings'

const SAVED_KEY = 'subtle-saved-v1'
const BOOKINGS_KEY = 'subtle-bookings-v1'

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

// TODO(backend): load the ids of homes this user saved
export function loadSaved(): string[] {
  return read<string[]>(SAVED_KEY, [])
}

// TODO(backend): save or unsave this listing for the user
export function toggleSavedId(id: string): string[] {
  const now = loadSaved()
  const next = now.includes(id) ? now.filter((x) => x !== id) : [id, ...now]
  write(SAVED_KEY, next)
  return next
}

// ---- booking requests ----

export type BookingStatus = 'requested' | 'accepted' | 'booked'

export type Booking = {
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
  { id: 'accepted', label: 'Host accepted' },
  { id: 'booked', label: 'Booked' },
]

// TODO(backend): load this user's booking requests with their current status
export function loadBookings(): Booking[] {
  return read<Booking[]>(BOOKINGS_KEY, [])
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
