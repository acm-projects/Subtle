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
  // a month on its own means the next one coming up (in Nov 2026, "june" is June 2027)
  const month = { may: 5, june: 6, july: 7 }[val]
  if (month) {
    const now = new Date()
    const year = now.getMonth() + 1 >= month ? now.getFullYear() + 1 : now.getFullYear()
    return `${year}-${String(month).padStart(2, '0')}-01`
  }
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
  if (val === 'biking') return 'Bike/Scooter'
  return 'Public Transit'
}

function mapCar(c: unknown): boolean | null {
  if (c === true || c === 'car') return true
  if (c === false || c === 'transit') return false
  return null
}

function mapInterests(arr: unknown): string[] | null {
  if (!Array.isArray(arr) || !arr.length) return null

  // Allowed database enum values for interest_types:
  const ALLOWED_ENUM_VALUES = new Set([
    'Cooking',
    'Nightlife',
    'Reading',
    'Basketball',
    'Film',
    'Gaming',
    'Hiking',
    'Live Music',
    'Baking',
    'Art',
    'Photography',
    'Soccer',
    'Yoga',
    'Coffee',
    'Travel',
    'Volunteering',
  ])

  // Mapping from variations/aliases (lowercase) to valid database enum values
  const aliasMap: Record<string, string> = {
    fitness: 'Basketball',
    music: 'Live Music',
    'live music': 'Live Music',
    outdoors: 'Hiking',
    hiking: 'Hiking',
    sports: 'Basketball',
    biking: 'Hiking',
    'pickup sports': 'Basketball',
    'exploring the city': 'Travel',
    'trying food spots': 'Coffee',
    'concerts and shows': 'Live Music',
    'game nights': 'Gaming',
    'outdoor trips': 'Hiking',
    'co-working': 'Coffee',
    'quiet nights': 'Reading',
  }

  const result: string[] = []
  for (const item of arr) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue

    if (ALLOWED_ENUM_VALUES.has(trimmed)) {
      result.push(trimmed)
    } else {
      const lower = trimmed.toLowerCase()
      const mapped = aliasMap[lower]
      if (mapped && ALLOWED_ENUM_VALUES.has(mapped)) {
        result.push(mapped)
      }
    }
  }

  const unique = Array.from(new Set(result))
  return unique.length ? unique : null
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

  // listing every user (with their emails and addresses) isn't something any page needs
  return NextResponse.json({ error: 'Pass ?email= or ?id=' }, { status: 400 })
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

  // Look up existing user by email or ID using the base supabase client (to avoid RLS read restrictions)
  let existingUser: any = null

  const { data: existingRows } = await supabase
    .from('users_table')
    .select('*')
    .eq('student_email', email)

  if (existingRows && existingRows.length > 0) {
    existingUser = existingRows[existingRows.length - 1]
  }

  // If not found by email, try by ID if available from body or token
  let authUserId: string | null = body.id ?? null
  if (!authUserId && token) {
    try {
      const { data: authData } = await client.auth.getUser(token)
      if (authData?.user?.id) authUserId = authData.user.id
    } catch {}
  }

  if (!existingUser && authUserId) {
    const { data: byId } = await supabase
      .from('users_table')
      .select('*')
      .eq('id', authUserId)
    if (byId && byId.length > 0) {
      existingUser = byId[byId.length - 1]
    }
  }

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
  if (authUserId || existingUser?.id) {
    const finalId = existingUser?.id ?? authUserId
    row.id = finalId
    row.user_id = finalId
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

  let saveResult: any
  let saveError: any

  const targetId = existingUser?.id ?? row.id

  if (targetId) {
    // 1. Try updating by ID with authenticated client first
    const { data: updateData, error: updateErr } = await client
      .from('users_table')
      .update(row)
      .eq('id', targetId)
      .select()

    if (!updateErr && updateData && updateData.length > 0) {
      saveResult = updateData
    } else {
      // 2. Fallback: update with base supabase client (in case of RLS update policy mismatch)
      const { data: fbData, error: fbErr } = await supabase
        .from('users_table')
        .update(row)
        .eq('id', targetId)
        .select()

      if (!fbErr && fbData && fbData.length > 0) {
        saveResult = fbData
      } else {
        // 3. Fallback: upsert on conflict 'id' so duplicate key can NEVER be thrown
        const { data: upsertData, error: upsertErr } = await (token ? client : supabase)
          .from('users_table')
          .upsert(row, { onConflict: 'id' })
          .select()

        saveResult = upsertData
        saveError = upsertErr ?? updateErr ?? fbErr
      }
    }
  } else {
    // Insert new user row using upsert to guarantee idempotency
    const { data, error } = await (token ? client : supabase)
      .from('users_table')
      .upsert(row, { onConflict: 'student_email' })
      .select()
    saveResult = data
    saveError = error
  }

  if (saveError) {
    console.error('Error saving to users_table:', saveError)
    return NextResponse.json(
      { error: saveError.message || saveError.details || saveError.hint || saveError.code || 'Could not save the row' },
      { status: 500 }
    )
  }

  return NextResponse.json(saveResult, { status: 201 })
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
