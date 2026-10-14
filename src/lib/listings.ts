import { supabase } from './supabase'

// ---------------------------------------------------------------------
// Types — mirror public.listing_table (after 20261012_listings.sql)
// ---------------------------------------------------------------------

export type Listing = {
  id: string
  user_id: string | null
  title: string | null
  about: string | null
  building_type: string
  monthly_rent: number | null
  address: string | null
  neighborhood: string | null
  city: string | null
  start_date: string | null // 'YYYY-MM-DD'
  end_date: string | null   // 'YYYY-MM-DD'
  beds: number
  baths: number | null
  amenities: string[] | null
  company_tags: string[]
  image_urls: string[]
  latitude: number | null
  longitude: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Fields a user fills in when creating a listing. */
export type NewListing = {
  title: string
  building_type: string
  room_type?: string | null
  beds: number
  baths?: number | null
  monthly_rent?: number | null
  address?: string | null
  neighborhood?: string | null
  city?: string | null
  start_date?: string | null
  end_date?: string | null
  amenities?: string[]
  company_tags?: string[]
  about?: string | null
}

export type ListingUpdate = Partial<NewListing> & {
  is_active?: boolean
  image_urls?: string[]
}

// Known enum values if Postgres amenities column is currently typed as amenity_type[]
const VALID_ENUM_AMENITIES = new Set(['Gym', 'Pool', 'Washer/Dryer', 'Furnished', 'Pets Allowed'])

const AMENITY_MAP: Record<string, string> = {
  'pets allowed': 'Pets Allowed',
  'pets': 'Pets Allowed',
  'pet friendly': 'Pets Allowed',
  'furnished': 'Furnished',
  'washer': 'Washer/Dryer',
  'dryer': 'Washer/Dryer',
  'washer/dryer': 'Washer/Dryer',
  'laundry': 'Washer/Dryer',
  'in-unit laundry': 'Washer/Dryer',
  'gym': 'Gym',
  'gym access': 'Gym',
  'pool': 'Pool',
}

function sanitizeAmenitiesForEnum(amenities: string[]): string[] {
  const result = new Set<string>()
  for (const a of amenities) {
    const trimmed = a.trim()
    if (VALID_ENUM_AMENITIES.has(trimmed)) {
      result.add(trimmed)
    } else {
      const mapped = AMENITY_MAP[trimmed.toLowerCase()]
      if (mapped) result.add(mapped)
    }
  }
  return Array.from(result)
}

/**
 * Create a listing, then upload its photos and attach their URLs.
 * Automatically handles amenity_type enum compatibility and room_type column fallback.
 */
export async function createListing(input: NewListing, files: File[] = []): Promise<Listing> {
  const userId = await requireUserId()
  validateListing(input)

  const id = crypto.randomUUID()
  let insertPayload: Record<string, any> = { ...input, id, user_id: userId }

  let { data, error } = await supabase.from(TABLE).insert(insertPayload).select().single()

  // Fallback 1: If room_type column doesn't exist yet in the database schema cache
  if (error && error.message?.includes('room_type')) {
    const { room_type, ...rest } = insertPayload
    insertPayload = {
      ...rest,
      company_tags: room_type ? Array.from(new Set([...(rest.company_tags || []), room_type])) : (rest.company_tags || []),
    }
    const retry = await supabase.from(TABLE).insert(insertPayload).select().single()
    data = retry.data
    error = retry.error
  }

  // Fallback 2: If amenities column uses the restricted amenity_type enum
  if (error && (error.code === '22P02' || error.message?.includes('amenity_type') || error.message?.includes('amenities'))) {
    const rawAmenities = (insertPayload.amenities || input.amenities || []) as string[]
    const sanitized = sanitizeAmenitiesForEnum(rawAmenities)
    const unmapped = rawAmenities.filter((a) => !sanitized.includes(a))
    insertPayload = {
      ...insertPayload,
      amenities: sanitized,
      company_tags: Array.from(new Set([...(insertPayload.company_tags || []), ...unmapped])),
    }
    const retry = await supabase.from(TABLE).insert(insertPayload).select().single()
    data = retry.data
    error = retry.error
  }

  if (error) throw new Error(`Couldn't create listing: ${error.message}`)

  if (!files.length) return data as Listing

  try {
    const image_urls = await uploadListingImages(id, files)
    return await updateListing(id, { image_urls })
  } catch (e) {
    // Listing exists but photos failed — surface the error; user can retry from edit page.
    throw new Error(`Listing created, but photos failed to upload. ${(e as Error).message}`)
  }
}

export type ListingFilters = {
  /** Free-text search across title, about, neighborhood, address, city. */
  search?: string
  city?: string
  neighborhood?: string
  buildingType?: string
  minRent?: number
  maxRent?: number
  /** Listing must be available for the whole moveIn → moveOut window. */
  moveIn?: string
  moveOut?: string
  minBeds?: number
  minBaths?: number
  /** Listing must include every amenity in this list. */
  amenities?: string[]
  companyTag?: string
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'soonest'
  page?: number     // 0-based
  pageSize?: number // default 12
}

export type ListingPage = {
  listings: Listing[]
  total: number
  page: number
  pageSize: number
}

// Placeholder option lists for form dropdowns — adjust to match the Figma design.
export const BUILDING_TYPES = ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Dorm'] as const
export const AMENITIES = [
  'Furnished',
  'In-unit laundry',
  'Parking',
  'Gym',
  'Pool',
  'Wi-Fi',
  'Air conditioning',
  'Pet friendly',
  'Utilities included',
  'Dishwasher',
] as const

const TABLE = 'listing_table'
const BUCKET = 'listing-images'
const DEFAULT_PAGE_SIZE = 12

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/** Strip characters that would break PostgREST's `or=(...)` filter syntax. */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()*%\\]/g, ' ').trim()
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('You must be logged in to do that.')
  return data.user.id
}

/** Turn a public storage URL back into its object path inside the bucket. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length))
}

// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

/** Browse / search listings with filters + pagination. */
export async function getListings(filters: ListingFilters = {}): Promise<ListingPage> {
  const page = Math.max(0, filters.page ?? 0)
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from(TABLE)
    .select('*', { count: 'exact' })
    .eq('is_active', true)

  if (filters.search) {
    const q = sanitizeSearch(filters.search)
    if (q) {
      query = query.or(
        ['title', 'about', 'neighborhood', 'address', 'city']
          .map((col) => `${col}.ilike.%${q}%`)
          .join(','),
      )
    }
  }
  if (filters.city) query = query.ilike('city', filters.city)
  if (filters.neighborhood) query = query.ilike('neighborhood', `%${filters.neighborhood}%`)
  if (filters.buildingType) query = query.eq('building_type', filters.buildingType)
  if (filters.minRent != null) query = query.gte('monthly_rent', filters.minRent)
  if (filters.maxRent != null) query = query.lte('monthly_rent', filters.maxRent)
  if (filters.moveIn) query = query.lte('start_date', filters.moveIn)
  if (filters.moveOut) query = query.gte('end_date', filters.moveOut)
  if (filters.minBeds != null) query = query.gte('beds', filters.minBeds)
  if (filters.minBaths != null) query = query.gte('baths', filters.minBaths)
  if (filters.amenities?.length) query = query.contains('amenities', filters.amenities)
  if (filters.companyTag) query = query.contains('company_tags', [filters.companyTag])

  switch (filters.sort) {
    case 'price_asc':
      query = query.order('monthly_rent', { ascending: true, nullsFirst: false })
      break
    case 'price_desc':
      query = query.order('monthly_rent', { ascending: false, nullsFirst: false })
      break
    case 'soonest':
      query = query.order('start_date', { ascending: true, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(`Couldn't load listings: ${error.message}`)

  return { listings: (data ?? []) as Listing[], total: count ?? 0, page, pageSize }
}

/** A single listing, or null if it doesn't exist / isn't visible to you. */
export async function getListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Couldn't load listing: ${error.message}`)
  return data as Listing | null
}

/** Everything the logged-in user has posted (including inactive ones). */
export async function getMyListings(): Promise<Listing[]> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Couldn't load your listings: ${error.message}`)
  return (data ?? []) as Listing[]
}

// ---------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------

/** Upload photos for a listing and return their public URLs. */
export async function uploadListingImages(listingId: string, files: File[]): Promise<string[]> {
  if (!files.length) return []
  const userId = await requireUserId()

  return Promise.all(
    files.map(async (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) {
        if (error.message?.includes('Bucket not found') || (error as any).statusCode === '404' || (error as any).code === 'NoSuchBucket') {
          throw new Error(`Storage bucket "${BUCKET}" not found. Please create a public bucket named "${BUCKET}" in Supabase Dashboard > Storage.`)
        }
        throw new Error(`Couldn't upload ${file.name}: ${error.message}`)
      }
      return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }),
  )
}


export async function updateListing(id: string, patch: ListingUpdate): Promise<Listing> {
  validateListing(patch, true)
  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select().single()
  if (error) throw new Error(`Couldn't update listing: ${error.message}`)
  return data as Listing
}

/** Delete a listing and its photos. */
export async function deleteListing(id: string): Promise<void> {
  const listing = await getListing(id)
  if (!listing) return

  const paths = (listing.image_urls ?? [])
    .map(storagePathFromUrl)
    .filter((p): p is string => !!p)
  if (paths.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) console.warn('Some listing photos could not be removed:', error.message)
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`Couldn't delete listing: ${error.message}`)
}

/** Remove a single photo from a listing. */
export async function removeListingImage(listing: Listing, url: string): Promise<Listing> {
  const path = storagePathFromUrl(url)
  if (path) await supabase.storage.from(BUCKET).remove([path])
  return updateListing(listing.id, { image_urls: listing.image_urls.filter((u) => u !== url) })
}

// ---------------------------------------------------------------------
// Validation (client-side; DB constraints are the final word)
// ---------------------------------------------------------------------

export function validateListing(input: Partial<NewListing>, partial = false): void {
  const errors: string[] = []

  if (!partial || 'title' in input) {
    if (!input.title?.trim()) errors.push('Title is required.')
  }
  if (!partial || 'building_type' in input) {
    if (!input.building_type?.trim()) errors.push('Building type is required.')
  }
  if (!partial || 'beds' in input) {
    if (input.beds == null || !Number.isInteger(input.beds) || input.beds < 0)
      errors.push('Beds must be a whole number of 0 or more.')
  }
  if (input.baths != null && (!Number.isInteger(input.baths) || input.baths < 0))
    errors.push('Baths must be a whole number of 0 or more.')
  if (input.monthly_rent != null && (!Number.isInteger(input.monthly_rent) || input.monthly_rent < 0))
    errors.push('Monthly rent must be a whole dollar amount of 0 or more.')
  if (input.start_date && input.end_date && input.end_date < input.start_date)
    errors.push('End date must be on or after the start date.')

  if (errors.length) throw new Error(errors.join(' '))
}
