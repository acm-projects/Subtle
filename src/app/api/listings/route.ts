import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getListings, type ListingFilters, validateListing } from '../../../lib/listings'
import { supabase } from '../../../lib/supabase'

const TABLE = 'listing_table'
const VALID_ENUM_AMENITIES = new Set(['Gym', 'Pool', 'Washer/Dryer', 'Furnished', 'Pets Allowed'])
const AMENITY_MAP: Record<string, string> = {
  'pets allowed': 'Pets Allowed',
  pets: 'Pets Allowed',
  'pet friendly': 'Pets Allowed',
  furnished: 'Furnished',
  washer: 'Washer/Dryer',
  dryer: 'Washer/Dryer',
  'washer/dryer': 'Washer/Dryer',
  laundry: 'Washer/Dryer',
  'in-unit laundry': 'Washer/Dryer',
  gym: 'Gym',
  'gym access': 'Gym',
  pool: 'Pool',
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
 * GET /api/listings
 * Query params: search, city, neighborhood, buildingType, minRent, maxRent,
 *               moveIn, moveOut, minBeds, minBaths, amenities (comma-separated),
 *               companyTag, sort ('newest'|'price_asc'|'price_desc'|'soonest'),
 *               page, pageSize
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const num = (key: string) => {
    const v = searchParams.get(key)
    return v !== null && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined
  }

  const amenitiesParam = searchParams.get('amenities')
  const filters: ListingFilters = {
    search: searchParams.get('search') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    neighborhood: searchParams.get('neighborhood') ?? undefined,
    buildingType: searchParams.get('buildingType') ?? searchParams.get('building_type') ?? undefined,
    minRent: num('minRent'),
    maxRent: num('maxRent'),
    moveIn: searchParams.get('moveIn') ?? undefined,
    moveOut: searchParams.get('moveOut') ?? undefined,
    minBeds: num('minBeds'),
    minBaths: num('minBaths'),
    amenities: amenitiesParam ? amenitiesParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    companyTag: searchParams.get('companyTag') ?? undefined,
    sort: (searchParams.get('sort') as ListingFilters['sort']) ?? undefined,
    page: num('page'),
    pageSize: num('pageSize'),
  }

  try {
    const pageData = await getListings(filters)
    return NextResponse.json(pageData)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch listings' }, { status: 500 })
  }
}

/**
 * POST /api/listings
 * Headers: Authorization: Bearer <access_token> (optional if user_id or session is present)
 * Body: {
 *   title: string,
 *   building_type: string (or homeType),
 *   room_type?: string (or roomType),
 *   beds?: number,
 *   baths?: number,
 *   monthly_rent?: number (or rent),
 *   address?: string,
 *   neighborhood?: string,
 *   city?: string,
 *   start_date?: string (or availableFrom),
 *   end_date?: string (or availableTo),
 *   amenities?: string[] (or included),
 *   company_tags?: string[],
 *   image_urls?: string[],
 *   about?: string
 * }
 */
export async function POST(request: Request) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sb = getSupabaseForRequest(request)
  const { data: authData } = await sb.auth.getUser()
  const userId = authData.user?.id ?? body.user_id ?? null

  const title = (body.title ?? '').toString().trim()
  const building_type = (body.building_type ?? body.homeType ?? 'Apartment').toString().trim()
  const room_type = body.room_type ?? body.roomType ?? null
  const beds = body.beds !== undefined ? Number(body.beds) : 1
  const baths = body.baths !== undefined ? Number(body.baths) : 1
  const monthly_rent = body.monthly_rent !== undefined ? Number(body.monthly_rent) : body.rent !== undefined ? Number(body.rent) : null
  const address = body.address ? body.address.toString().trim() : null

  const addrParts = address ? address.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  const neighborhood = body.neighborhood ?? addrParts[0] ?? null
  const city = body.city ?? (addrParts.length > 1 ? addrParts[1] : null)

  const start_date = body.start_date ?? body.availableFrom ?? null
  const end_date = body.end_date ?? body.availableTo ?? null
  const amenities = Array.isArray(body.amenities)
    ? body.amenities
    : Array.isArray(body.included)
      ? body.included
      : []
  const company_tags = Array.isArray(body.company_tags)
    ? body.company_tags
    : room_type
      ? [room_type]
      : []
  const image_urls = Array.isArray(body.image_urls) ? body.image_urls : []
  const about = body.about ? body.about.toString().trim() : null

  try {
    validateListing({ title, building_type, beds, baths, monthly_rent, start_date, end_date })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const id = body.id ?? crypto.randomUUID()
  let insertPayload: Record<string, any> = {
    id,
    user_id: userId,
    title,
    building_type,
    room_type,
    monthly_rent,
    address,
    neighborhood,
    city,
    move_in: start_date,
    end_date,
    amenities,
    company_tags,
    image_urls,
    about,
  }

  let { data, error } = await sb.from(TABLE).insert(insertPayload).select().single()

  // Fallback 1: If room_type column doesn't exist in schema cache
  if (error && error.message?.includes('room_type')) {
    const { room_type: rt, ...rest } = insertPayload
    insertPayload = {
      ...rest,
      company_tags: rt ? Array.from(new Set([...(rest.company_tags || []), rt])) : (rest.company_tags || []),
    }
    const retry = await sb.from(TABLE).insert(insertPayload).select().single()
    data = retry.data
    error = retry.error
  }

  // Fallback 2: If amenities column uses the restricted amenity_type enum
  if (error && (error.code === '22P02' || error.message?.includes('amenity_type') || error.message?.includes('amenities'))) {
    const rawAmenities = (insertPayload.amenities || amenities || []) as string[]
    const sanitized = sanitizeAmenitiesForEnum(rawAmenities)
    const unmapped = rawAmenities.filter((a) => !sanitized.includes(a))
    insertPayload = {
      ...insertPayload,
      amenities: sanitized,
      company_tags: Array.from(new Set([...(insertPayload.company_tags || []), ...unmapped])),
    }
    const retry = await sb.from(TABLE).insert(insertPayload).select().single()
    data = retry.data
    error = retry.error
  }

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        hint: error.code === '42501'
          ? 'Row-Level Security requires an authenticated user. Include header "Authorization: Bearer <access_token>" from POST /api/auth.'
          : undefined,
      },
      { status: error.code === '42501' ? 401 : 500 },
    )
  }

  return NextResponse.json(data, { status: 201 })
}

