import { NextResponse } from 'next/server'
import { dbListingToMatchListing, type Listing as MatchListing, type MatchContext, NEARBY_MILES } from '../../../components/matches/listings'
import { type CommuteMode, estimateCommuteMinutes, geocodeAddress, haversineDistanceKm, pickOptimalCommuteMode } from '../../../lib/geocoding'
import { googleCommuteMinutes, hasGoogleMapsKey } from '../../../lib/google-maps'
import { safetyFit, safetyForMany, safetyReason, type SafetyInfo } from '../../../lib/safety'
import { getListings } from '../../../lib/listings'
import { runPythonVectorMatcher } from '../../../lib/python-matcher'
import { supabase } from '../../../lib/supabase'
import { computeSubtleScore } from '../../../lib/vector-matching'

/**
 * GET /api/matches
 * Query params:
 *   - email: optional student_email to personalize scores using their public.users_table profile
 *   - sort: 'score' | 'price' | 'commute' (default 'score')
 */
// NEARBY_MILES (listings.ts) in km
const NEARBY_KM = NEARBY_MILES * 1.609
// longest one-way commute we'll show
const MAX_COMMUTE_MIN = 90

/**
 * "Houston, TX" from an office address like "315 Capitol St Unit 205, Houston, TX 77002".
 * The office address wins over users_table.user_city, which the quiz doesn't update.
 */
function cityLabel(userCity?: string | null, office?: string | null): string {
  const parts = (office ?? '').split(/,|\s+in\s+/i).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]
    const state = last.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/)
    if (state) return `${parts[parts.length - 2]}, ${state[1].toUpperCase()}`
    return parts.slice(-2).join(', ').replace(/\s*\d{5}(-\d{4})?$/, '')
  }
  return userCity?.trim() ?? ''
}

/** 'YYYY-MM-DD' (or anything starting with it) -> Date at UTC midnight; null for 'Flexible' / empty / junk */
function parseDay(v: unknown): Date | null {
  const m = typeof v === 'string' ? v.match(/^(\d{4})-(\d{2})-(\d{2})/) : null
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const sort = searchParams.get('sort') ?? 'score'

  let userProfile: Record<string, any> | null = null
  if (email) {
    const { data: rows } = await supabase
      .from('users_table')
      .select('*')
      .eq('student_email', email)
    if (rows && rows.length > 0) {
      userProfile = rows[rows.length - 1]
    }
  }

  // whatever company and office address the user typed in the quiz / preferences (free text)
  const officeAddress: string = (userProfile?.office_address ?? '').trim()

  const preferredMode = userProfile?.user_transportation || 'Public Transit'

  const context: MatchContext = {
    company: (userProfile?.company_name ?? '').trim(),
    office: officeAddress,
    city: cityLabel(userProfile?.user_city, officeAddress),
  }

  // 1. Geocode the user's workplace address with Nominatim
  const workplaceCoords = officeAddress ? await geocodeAddress(officeAddress) : null

  let dbMatched: MatchListing[] = []
  try {
    const { listings: dbListings } = await getListings({ pageSize: 50 })
    if (dbListings?.length) {
      dbMatched = dbListings.map(dbListingToMatchListing)
    }
  } catch (err) {
    console.error('Error loading DB listings in /api/matches:', err)
  }

  const rawCombined = dbMatched

  // 2. Geocode listings and compute approximate commute duration based on real coordinates
  const located: { listing: MatchListing; distKm: number | null }[] = await Promise.all(
    rawCombined.map(async (l) => {
      // If we don't have workplace coords, preserve listing defaults
      if (!workplaceCoords) return { listing: l, distKm: null }

      // Listing coordinates: explicit lat/lon, else its address, else its neighborhood + its own city.
      // Never the user's city: a listing with no location of its own would look "nearby" everywhere.
      let listingCoords = l.latitude && l.longitude ? { lat: l.latitude, lon: l.longitude } : null
      if (!listingCoords) {
        const address = l.address?.trim()
        const city = l.city?.trim()
        const query = address
          ? city && !address.toLowerCase().includes(city.toLowerCase())
            ? `${address}, ${city}`
            : address
          : city
          ? `${l.neighborhood}, ${city}`
          : ''
        listingCoords = query ? await geocodeAddress(query) : null
      }

      if (listingCoords) {
        const distKm = haversineDistanceKm(listingCoords, workplaceCoords)
        const optimalMode = pickOptimalCommuteMode(distKm, preferredMode)
        const commuteMinutes = estimateCommuteMinutes(distKm, optimalMode)

        return {
          listing: {
            ...l,
            commuteMinutes,
            commuteMode: optimalMode,
            commuteSource: 'estimate' as const,
            latitude: listingCoords.lat,
            longitude: listingCoords.lon,
          },
          distKm,
        }
      }

      return { listing: l, distKm: null }
    }),
  )

  // 2a. Only homes within NEARBY_KM of the workplace. A listing we couldn't place on the map is left out,
  //     since we can't tell if it's near. If the workplace itself couldn't be found, nothing is filtered.
  const nearbyOnes = workplaceCoords
    ? located.filter((x) => x.distKm != null && x.distKm <= NEARBY_KM).map((x) => x.listing)
    : located.map((x) => x.listing)

  // 2a'. Dates: drop homes that aren't free around the user's move-in day. A home counts if it opens no
  //      more than 3 weeks after they arrive and is still free 4 weeks after. Homes or users with no
  //      dates ("Flexible") are kept.
  const moveIn = parseDay(userProfile?.move_in_date)
  const fitsDates = (l: MatchListing) => {
    if (!moveIn) return true
    const from = parseDay(l.startDate)
    const to = parseDay(l.endDate)
    if (from && from > addDays(moveIn, 21)) return false
    if (to && to < addDays(moveIn, 28)) return false
    return true
  }
  const combined: MatchListing[] = nearbyOnes.filter(fitsDates)
  const wrongDates = nearbyOnes.length - combined.length
  let filteredOut = rawCombined.length - combined.length

  // 2a''. If nothing is nearby, the closest few within 3x the radius (with the right dates), so the page isn't a dead end
  const nearest: MatchListing[] = workplaceCoords
    ? located
        .filter((x) => x.distKm != null && x.distKm > NEARBY_KM && x.distKm <= NEARBY_KM * 3 && fitsDates(x.listing))
        .sort((a, b) => (a.distKm as number) - (b.distKm as number))
        .slice(0, 3)
        .map((x) => ({ ...x.listing, nearWork: false, distanceMiles: Math.round((x.distKm as number) / 1.609) }))
    : []

  // 2b. Replace the estimate with real Google Maps travel times wherever Google has a route.
  //     Listings are grouped by travel mode so each mode is one request (in batches).
  let googleCount = 0
  if (workplaceCoords && hasGoogleMapsKey()) {
    const byMode = new Map<CommuteMode, number[]>()
    combined.forEach((l, i) => {
      if (l.latitude == null || l.longitude == null) return
      const mode = l.commuteMode as CommuteMode
      byMode.set(mode, [...(byMode.get(mode) ?? []), i])
    })
    for (const [mode, indexes] of byMode) {
      const minutes = await googleCommuteMinutes(
        indexes.map((i) => ({ lat: combined[i].latitude as number, lon: combined[i].longitude as number })),
        workplaceCoords,
        mode,
      )
      indexes.forEach((i, k) => {
        const m = minutes[k]
        if (m == null) return
        combined[i] = { ...combined[i], commuteMinutes: m, commuteSource: 'google' }
        googleCount++
      })
    }
  }

  // 2c. Drop homes Google says are more than MAX_COMMUTE_MIN away by the user's travel mode
  //     (inside the radius but across a bay or with no good transit, e.g. Mountain View to SF).
  const reachable = combined.filter((l) => !(l.commuteSource === 'google' && l.commuteMinutes > MAX_COMMUTE_MIN))
  filteredOut += combined.length - reachable.length
  googleCount -= combined.filter((l) => l.commuteSource === 'google' && l.commuteMinutes > MAX_COMMUTE_MIN).length
  combined.splice(0, combined.length, ...reachable)

  // 3. Primary: Run Python Machine Learning & Vector Matching Engine (ml/vector_matcher.py)
  let scored: MatchListing[] = []
  let mlAnalytics: any[] = []
  let engine = 'python'

  const pythonResult = await runPythonVectorMatcher(combined, userProfile)
  if (pythonResult?.scored?.length) {
    scored = pythonResult.scored
    mlAnalytics = pythonResult.mlAnalytics
  } else {
    // 4. High-performance fallback: In-process JS Vector Matching Engine
    engine = 'typescript-fallback'
    const fallbackResults = combined.map((l) => computeSubtleScore(l, userProfile))
    scored = fallbackResults.map((r) => r.listing)
    mlAnalytics = fallbackResults.map((r) => ({
      id: r.listing.id,
      title: r.listing.title,
      finalScore: r.finalScore,
      vectorSimilarity: r.vectorSimilarity,
      budgetFit: r.budgetFit,
      commuteFit: r.commuteFit,
    }))
  }

  // 5. Safety: nudge each score by real reported incidents near the listing (San Francisco only;
  //    anywhere else there is no data, so the score is left as is).
  const safetyById = new Map<string, SafetyInfo>()
  const safetyList = await safetyForMany(
    combined.map((l) => (l.latitude != null && l.longitude != null ? { lat: l.latitude, lon: l.longitude } : null)),
  )
  combined.forEach((l, i) => {
    const info = safetyList[i]
    if (info) safetyById.set(l.id, info)
  })
  scored = scored.map((l) => {
    const info = safetyById.get(l.id)
    if (!info) return l
    return {
      ...l,
      score: Math.max(58, Math.min(99, Math.round(l.score * safetyFit(info)))),
      safety: info,
      whyScore: [...(l.whyScore ?? []), safetyReason(info)],
    }
  })

  scored.sort((a, b) => {
    if (sort === 'price') return a.price - b.price
    if (sort === 'commute') return a.commuteMinutes - b.commuteMinutes
    return b.score - a.score
  })

  return NextResponse.json({
    context,
    engine,
    geocodedWorkplace: workplaceCoords,
    // how many commute times came from Google Maps vs. the distance estimate
    commuteSources: { google: googleCount, estimate: combined.length - googleCount },
    // homes within NEARBY_MILES of the workplace, and how many were left out for being too far or unplaceable
    nearby: combined.length,
    filteredOut,
    wrongDates, // nearby homes left out because they aren't free around the user's move-in day
    moveIn: moveIn ? moveIn.toISOString().slice(0, 10) : null,
    nearest: combined.length === 0 ? nearest : [],
    radiusKm: workplaceCoords ? NEARBY_KM : null,
    safetyCoverage: { withData: safetyById.size, without: combined.length - safetyById.size },
    total: scored.length,
    matches: scored,
    mlAnalytics,
  })
}
