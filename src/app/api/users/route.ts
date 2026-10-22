import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'

// '' (unanswered) -> null, so integer and enum columns don't reject it
const orNull = (v: unknown) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

const toInt = (v: unknown) => {
  if (typeof v === 'number') return Math.round(v)
  const m = typeof v === 'string' ? v.match(/\d+/) : null
  return m ? parseInt(m[0], 10) : null
}

const S = '$'

// Mapping functions to adapt questionnaire UI values to database enum types
function mapBudget(b: unknown): string | null {
  if (!b || typeof b !== 'string') return null
  const val = b.trim()
  if (val === 'under-1500') return `Under ${S}1,500`
  if (val === '1500-2000') return `${S}1,500 - ${S}2,000`
  if (val === '2000-2500') return `${S}2,000 - ${S}2,500`
  if (val === '2500-plus') return `${S}2,500+`
  return val
}

function mapHousing(h: unknown): string | null {
  if (!h || typeof h !== 'string') return null
  const val = h.trim().toLowerCase()
  if (val === 'house') return 'House'
  if (val === 'apartment') return 'Apartment'
  if (val === 'any') return 'Any'
  return h.toString()
}

function mapMoveIn(m: unknown): string | null {
  if (!m || typeof m !== 'string') return null
  const val = m.trim().toLowerCase()
  if (val === 'may') return '2026-05-01'
  if (val === 'june') return '2026-06-01'
  if (val === 'july') return '2026-07-01'
  if (val === 'flexible') return 'Flexible'
  return m.toString()
}

function mapTransportation(t: unknown): string | null {
  if (!t || typeof t !== 'string') return null
  const val = t.trim().toLowerCase()
  if (val === 'walking') return 'Walking'
  if (val === 'transit') return 'Public Transit'
  if (val === 'driving') return 'Car'
  if (val === 'rideshare') return 'Rideshare'
  if (val === 'biking') return 'Walking' // fallback to closest valid enum
  return 'Public Transit'
}

function mapCar(c: unknown): boolean | null {
  if (c === true || c === 'car') return true
  if (c === false || c === 'transit') return false
  return null
}

function mapInterests(arr: unknown): string[] | null {
  if (!Array.isArray(arr) || !arr.length) return null
  const map: Record<string, string> = {
    cooking: 'Cooking',
    fitness: 'Fitness',
    music: 'Music',
    outdoors: 'Outdoors',
    nightlife: 'Nightlife',
    reading: 'Reading',
  }
  const result = arr
    .map((x) => (typeof x === 'string' ? map[x.toLowerCase()] ?? x : null))
    .filter((x): x is string => Boolean(x))
  return result.length ? result : null
}

function mapAccommodations(arr: unknown): string[] | null {
  if (!Array.isArray(arr) || !arr.length) return null
  const map: Record<string, string> = {
    pets: 'Pets Allowed',
    accessible: 'Wheelchair Accessible',
  }
  const result = arr
    .map((x) => (typeof x === 'string' ? map[x.toLowerCase()] ?? x : null))
    .filter((x): x is string => Boolean(x && x !== 'none'))
  return result.length ? result : null
}

function mapAgeGroup(a: unknown): string | null {
  if (!a || typeof a !== 'string') return null
  if (a.includes('18')) return '18-22'
  if (a.includes('23')) return '23-26'
  if (a.includes('27')) return '27+'
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const id = searchParams.get('id')

  if (email) {
    const { data, error } = await supabase
      .from('users_table')
      .select('*')
      .eq('student_email', email)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data && data.length > 0 ? data[data.length - 1] : null)
  }

  if (id) {
    const { data, error } = await supabase
      .from('users_table')
      .select('*')
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data && data.length > 0 ? data[data.length - 1] : null)
  }

  const { data, error } = await supabase.from('users_table').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

async function upsertUser(request: Request) {
  // Build a per-request client that carries the caller's JWT so that
  // every PostgREST query runs as 'authenticated' with the correct auth.uid().
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const client = token
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      )
    : supabase

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = orNull(body.email ?? body.student_email)
  const firstName = orNull(body.firstName ?? body.first_name)
  const lastName = orNull(body.lastName ?? body.last_name)

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const { data: existingRows } = await client
    .from('users_table')
    .select('*')
    .eq('student_email', email)

  const existingUser = existingRows && existingRows.length > 0 ? existingRows[existingRows.length - 1] : null

  const wantsRoommates =
    body.roommates !== undefined
      ? body.roommates === 'yes' || body.roommates === true
      : body.wants_roommates !== undefined
        ? Boolean(body.wants_roommates)
        : (existingUser?.wants_roommates ?? null)

  const row: Record<string, unknown> = {
    student_email: email,
    first_name: firstName ?? existingUser?.first_name ?? 'Intern',
    last_name: lastName ?? existingUser?.last_name ?? 'Student',
  }

  // Resolve the row's id: prefer body/existing, then fall back to auth.uid()
  // so the RLS policy (auth.uid() = id) is satisfied for new rows.
  if (body.id || existingUser?.id) {
    row.id = body.id ?? existingUser?.id
  } else if (token) {
    const { data: authData } = await client.auth.getUser(token)
    if (authData?.user?.id) row.id = authData.user.id
  }
  if (body.city !== undefined) row.user_city = orNull(body.city)
  if (body.company !== undefined || body.company_name !== undefined) row.company_name = orNull(body.company ?? body.company_name)
  if (body.address !== undefined || body.office_address !== undefined) row.office_address = orNull(body.address ?? body.office_address)
  if (body.budget !== undefined || body.monthly_budget !== undefined) row.monthly_budget = mapBudget(body.budget ?? body.monthly_budget)
  if (body.roommates !== undefined || body.wants_roommates !== undefined) row.wants_roommates = wantsRoommates
  if (body.interests !== undefined || body.user_interests !== undefined) row.user_interests = mapInterests(body.interests ?? body.user_interests)
  if (body.housingType !== undefined || body.housing_style !== undefined) row.housing_style = mapHousing(body.housingType ?? body.housing_style)
  if (body.accommodations !== undefined || body.user_accommodations !== undefined) row.user_accommodations = mapAccommodations(body.accommodations ?? body.user_accommodations)
  if (body.moveIn !== undefined || body.move_in_date !== undefined) row.move_in_date = mapMoveIn(body.moveIn ?? body.move_in_date)
  if (body.commuteMode !== undefined || body.user_transportation !== undefined) row.user_transportation = mapTransportation(body.commuteMode ?? body.user_transportation)
  if (body.car !== undefined || body.has_car !== undefined) row.has_car = mapCar(body.car ?? body.has_car)
  if (body.maxCommute !== undefined || body.commute_time !== undefined) row.commute_time = toInt(body.maxCommute ?? body.commute_time)
  if (body.transitImportance !== undefined || body.public_transit_importance !== undefined) row.public_transit_importance = toInt(body.transitImportance ?? body.public_transit_importance)

  if (wantsRoommates) {
    if (body.gender !== undefined || body.preferred_roommate_gender !== undefined) row.preferred_roommate_gender = orNull(body.gender ?? body.preferred_roommate_gender)
    if (body.numRoommates !== undefined || body.number_of_roommates !== undefined) row.number_of_roommates = toInt(body.numRoommates ?? body.number_of_roommates)
    if (body.noise !== undefined || body.noise_level !== undefined) row.noise_level = orNull(body.noise ?? body.noise_level)
    if (body.cleanliness !== undefined) row.cleanliness = orNull(body.cleanliness)
    if (body.guests !== undefined || body.has_guests !== undefined) row.has_guests = orNull(body.guests ?? body.has_guests)
    if (body.sleep !== undefined || body.sleep_schedule !== undefined) row.sleep_schedule = orNull(body.sleep ?? body.sleep_schedule)
    if (body.temperature !== undefined) row.temperature = toInt(body.temperature)
    if (body.age !== undefined || body.age_group !== undefined) row.age_group = mapAgeGroup(body.age ?? body.age_group)
  }

  if (existingUser) {
    for (const [k, v] of Object.entries(existingUser)) {
      if (row[k] === undefined && v !== null && v !== undefined) {
        row[k] = v
      }
    }
  }

  const { data: inserted, error: insertError } = await client
    .from('users_table')
    .insert(row)
    .select()

  if (insertError) {
    console.error('Error saving to users_table:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(inserted, { status: 201 })
}

export async function POST(request: Request) {
  return upsertUser(request)
}

export async function PUT(request: Request) {
  return upsertUser(request)
}

export async function PATCH(request: Request) {
  return upsertUser(request)
}
