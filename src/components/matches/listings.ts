// Shape of a matched listing. Backend: return this shape (sorted or not) and the page handles the rest.
export type Listing = {
  id: string
  title: string
  neighborhood: string
  price: number // per month, USD
  score: number // Subtle score, 0 to 100
  commuteMinutes: number
  commuteMode: 'walk' | 'transit' | 'bike' | 'drive'
  commuteSource?: 'google' | 'estimate' // where commuteMinutes came from (see /api/matches)
  safety?: import('../../lib/safety').SafetyInfo // reported incidents nearby (SF only, see lib/safety.ts)
  homeType: 'Apartment' | 'House' | 'Studio'
  roomType: 'Private room' | 'Shared room' | 'Entire place'
  tags: string[]
  availableFrom: string // e.g. "June 1"
  availableTo: string // e.g. "Aug 20"
  description: string
  amenities: string[]
  hostName: string
  subtitle?: string // e.g. "Private room in a furnished apartment"
  whyScore?: string[] // short reasons behind the score; derived from the fields above if missing
  features?: string[] // chips under "The place"; derived if missing
  imageUrl?: string // image URL (uploaded or remote)
  hostEmail?: string // shown on the contact page
  hostVerified?: boolean // verified .edu sub-leaser
  hostReplyTime?: string // e.g. "Replies within a day"
  address?: string
  city?: string // the listing's own city (listing_table.city); used to place it on the map
  nearWork?: boolean // false when /api/matches left it out for being too far from the user's office
  hostId?: string | null // listing_table.user_id: the lister's auth id (only they can edit it; messages go to them)
  startDate?: string | null // 'YYYY-MM-DD' first day available (listing_table.move_in)
  endDate?: string | null // 'YYYY-MM-DD' last day available (listing_table.end_date)
  distanceMiles?: number // straight-line miles to the user's office (only on /api/matches `nearest`)
  latitude?: number | null
  longitude?: number | null
}

// Homes (and Intern Matches) only count as "near" within this many miles of the user's office.
// Change it here and the API and every page follow.
export const NEARBY_MILES = 50

export type MatchContext = {
  city: string
  company: string
  office: string
}

// Used until the user's own company / office load (from users_table via /api/matches).
export const EMPTY_CONTEXT: MatchContext = { city: '', company: '', office: '' }


// Convert a database row to the UI matched listing format
export function dbListingToMatchListing(db: any): Listing {
  const roomType: Listing['roomType'] = db.amenities?.includes('Shared room')
    ? 'Shared room'
    : db.amenities?.includes('Entire place')
    ? 'Entire place'
    : 'Private room'

  const homeType: Listing['homeType'] =
    db.building_type === 'Studio' ? 'Studio' : db.building_type === 'House' ? 'House' : 'Apartment'

  // listing_table stores the first available day in `move_in`
  const startDate: string | null = db.move_in ?? db.start_date ?? null
  const formattedStart = startDate
    ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Flexible'
  const formattedEnd = db.end_date
    ? new Date(db.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Flexible'

  const coverImage = db.image_urls?.[0]

  return {
    id: db.id,
    title: db.title || 'Sublet near campus',
    neighborhood: db.neighborhood || db.city || 'Central',
    price: db.monthly_rent || 0,
    score: 88,
    commuteMinutes: 15,
    commuteMode: 'transit',
    homeType,
    roomType,
    tags: db.company_tags?.length ? db.company_tags : (db.amenities?.slice(0, 2) ?? []),
    availableFrom: formattedStart,
    availableTo: formattedEnd,
    description: db.about || 'Comfortable sublet, fully furnished and close to transit.',
    amenities: db.amenities || [],
    hostName: 'Student Host', // replaced by withHost() in lib/hosts.ts when the lister has a profile
    hostVerified: true,
    hostReplyTime: 'Replies within a few hours',
    subtitle: `${roomType} in ${homeType === 'Apartment' ? 'an' : 'a'} ${homeType.toLowerCase()}`,
    features: [homeType, roomType, ...(db.amenities || [])],
    imageUrl: coverImage,
    address: db.address || undefined,
    city: db.city || undefined,
    hostId: db.user_id ?? null,
    startDate,
    endDate: db.end_date ?? null,
    latitude: db.latitude || null,
    longitude: db.longitude || null,
  }
}

// Rough number of rent months between two dates like "June 1" and "Aug 22" (rounded). Null if unreadable.
export function stayMonths(from: string, to: string) {
  const a = new Date(`${from}, 2001`).getTime()
  const b = new Date(`${to}, 2001`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24 * 30)))
}
