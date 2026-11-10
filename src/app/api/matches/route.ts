import { NextResponse } from 'next/server'
import { dbListingToMatchListing, type Listing as MatchListing, type MatchContext, NEARBY_MILES } from '../../../components/matches/listings'
import { type CommuteMode, estimateCommuteMinutes, geocodeAddress, haversineDistanceKm, pickOptimalCommuteMode } from '../../../lib/geocoding'
import { googleCommuteMinutes, hasGoogleMapsKey } from '../../../lib/google-maps'
import { safetyForMany, safetyReason, type SafetyInfo } from '../../../lib/safety'
import { neighborhoodFit, neighborhoodForMany, neighborhoodReason, type NeighborhoodInfo } from '../../../lib/neighborhood'
import { safetyFitFromRatio, subtleScore, type ScoreParts } from '../../../lib/subtle-score'
import { getListings } from '../../../lib/listings'
import { runPythonVectorMatcher } from '../../../lib/python-matcher'
import { admin, callerFrom } from '../../../lib/supabase-admin'
import { computeSubtleScore } from '../../../lib/vector-matching'

/**
 * GET /api/matches
 * Query params:
 *   (personalized for the signed-in caller: send their login token, see lib/auth-fetch.ts)
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
  const sort = searchParams.get('sort') ?? 'score'

  // the signed-in caller (login token); nobody can ask for someone else's matches
  const me = await callerFrom(request)
  let userProfile: Record<string, any> | null = null
  if (me) {
    const { data } = await admin().from('users_table').select('*').eq('id', me.id).maybeSingle()
    userProfile = data ?? null
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
  // Needs from the quiz ("Pets allowed", "Wheelchair accessible"): only homes that list them
  const needs: string[] = Array.isArray(userProfile?.user_accommodations) ? userProfile.user_accommodations : []
  const wantsPets = needs.some((n) => /pet/i.test(n))
  const wantsAccessible = needs.some((n) => /wheelchair|accessib/i.test(n))
  const fitsNeeds = (l: MatchListing) => {
    const has = (re: RegExp) => [...(l.amenities ?? []), ...(l.tags ?? [])].some((a) => re.test(a))
    if (wantsPets && !has(/pet/i)) return false
    if (wantsAccessible && !has(/wheelchair|accessib/i)) return false
    return true
  }

  const datesOk = nearbyOnes.filter(fitsDates)
  const wrongDates = nearbyOnes.length - datesOk.length
  const combined: MatchListing[] = datesOk.filter(fitsNeeds)
  const missingNeeds = datesOk.length - combined.length
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

  // 5. Safety (SF only) and neighborhood access (everywhere), fetched side by side
  const coordsList = combined.map((l) => (l.latitude != null && l.longitude != null ? { lat: l.latitude, lon: l.longitude } : null))
  const [safetyList, nearbyList] = await Promise.all([safetyForMany(coordsList), neighborhoodForMany(coordsList)])
  const safetyById = new Map<string, SafetyInfo>()
  const nearbyById = new Map<string, NeighborhoodInfo>()
  combined.forEach((l, i) => {
    if (safetyList[i]) safetyById.set(l.id, safetyList[i] as SafetyInfo)
    if (nearbyList[i]) nearbyById.set(l.id, nearbyList[i] as NeighborhoodInfo)
  })

  // 6. Final Subtle score: Budget 35%, Lifestyle 25%, Commute 15%, Safety 15%, Neighborhood 10%
  //    (see lib/subtle-score.ts). Parts with no real data are left out and the rest re-weighted.
  const fitsById = new Map<string, any>(mlAnalytics.map((m) => [m.id, m]))
  scored = scored.map((l) => {
    const fits = fitsById.get(l.id)
    const safety = safetyById.get(l.id)
    const nearby = nearbyById.get(l.id)
    const parts: ScoreParts = {}
    if (fits) {
      parts.budget = Math.min(1, Number(fits.budgetFit))
      parts.lifestyle = Number(fits.vectorSimilarity)
      if (workplaceCoords) parts.commute = Math.min(1, Number(fits.commuteFit))
    }
    if (safety) parts.safety = safetyFitFromRatio(safety.ratio)
    if (nearby) parts.neighborhood = neighborhoodFit(nearby)
    if (!fits) return { ...l, safety, nearby }
    const { score, weightsUsed } = subtleScore(parts)
    const round = (n: number) => Math.round(n * 100) / 100
    const scoreParts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, round(v as number)])) as ScoreParts
    const reasons = [...(l.whyScore ?? [])]
    if (safety) reasons.push(safetyReason(safety))
    if (nearby) reasons.push(neighborhoodReason(nearby))
    return { ...l, score, scoreParts, scoreWeights: weightsUsed, safety, nearby, whyScore: reasons }
  })

  // Real host names and the .edu "verified host" check (same as the listing page)
  const hostIds = Array.from(new Set(scored.map((l) => l.hostId).filter((x): x is string => !!x)))
  if (hostIds.length) {
    const { data: hosts } = await admin().from('host_profiles').select('user_id, first_name, last_initial, is_edu').in('user_id', hostIds)
    const byHost = new Map((hosts ?? []).map((h) => [h.user_id as string, h]))
    scored = scored.map((l) => {
      const h = l.hostId ? byHost.get(l.hostId) : undefined
      return h ? { ...l, hostName: `${h.first_name} ${h.last_initial}.`, hostVerified: !!h.is_edu } : l
    })
  }

  // No office yet: there's no commute to show, so don't pretend there is one
  if (!workplaceCoords) {
    scored = scored.map((l) => ({
      ...l,
      commuteKnown: false,
      whyScore: (l.whyScore ?? []).filter((w) => !/commute|to work|to the office/i.test(w)),
    }))
  }

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
    missingNeeds, // nearby homes left out because they don't allow pets / aren't accessible (from the quiz)
    moveIn: moveIn ? moveIn.toISOString().slice(0, 10) : null,
    nearest: combined.length === 0 ? nearest : [],
    radiusKm: workplaceCoords ? NEARBY_KM : null,
    safetyCoverage: { withData: safetyById.size, without: combined.length - safetyById.size },
    neighborhoodCoverage: { withData: nearbyById.size, without: combined.length - nearbyById.size },
    total: scored.length,
    matches: scored,
    mlAnalytics,
  })
}
