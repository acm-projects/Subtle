import { NextResponse } from 'next/server'
import { dbListingToMatchListing, type Listing as MatchListing, type MatchContext, SAMPLE_CONTEXT, SAMPLE_LISTINGS } from '../../../components/matches/listings'
import { estimateCommuteMinutes, geocodeAddress, haversineDistanceKm, pickOptimalCommuteMode } from '../../../lib/geocoding'
import { getListings } from '../../../lib/listings'
import { runPythonVectorMatcher } from '../../../lib/python-matcher'
import { supabase } from '../../../lib/supabase'
import { computeSubtleScore } from '../../../lib/vector-matching'

/**
 * GET /api/matches
 * Query params:
 *   - email: optional student_email to personalize scores using their public.users_table profile
 *   - sort: 'score' | 'price' | 'commute' (default 'score')
 *   - includeSamples: 'true' | 'false' (default 'true')
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const sort = searchParams.get('sort') ?? 'score'
  const includeSamples = searchParams.get('includeSamples') !== 'false'

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

  const officeAddress = userProfile?.office_address || SAMPLE_CONTEXT.office
  const preferredMode = userProfile?.user_transportation || 'Public Transit'

  const context: MatchContext = {
    company: userProfile?.company_name || SAMPLE_CONTEXT.company,
    office: officeAddress,
    city: userProfile?.user_city || (officeAddress ? officeAddress.split(',').slice(-2).join(', ').trim() : SAMPLE_CONTEXT.city),
  }

  // 1. Geocode the user's workplace address with Nominatim
  const workplaceCoords = await geocodeAddress(officeAddress)

  let dbMatched: MatchListing[] = []
  try {
    const { listings: dbListings } = await getListings({ pageSize: 50 })
    if (dbListings?.length) {
      dbMatched = dbListings.map(dbListingToMatchListing)
    }
  } catch (err) {
    console.error('Error loading DB listings in /api/matches:', err)
  }

  const rawCombined = includeSamples ? [...dbMatched, ...SAMPLE_LISTINGS] : dbMatched

  // 2. Geocode listings and compute approximate commute duration based on real coordinates
  const combined: MatchListing[] = await Promise.all(
    rawCombined.map(async (l) => {
      // If we don't have workplace coords, preserve listing defaults
      if (!workplaceCoords) return l

      // Determine listing coordinates: check explicit lat/lon, or geocode address/neighborhood
      let listingCoords = l.latitude && l.longitude ? { lat: l.latitude, lon: l.longitude } : null
      if (!listingCoords) {
        const query = l.address || `${l.neighborhood}, ${context.city}`
        listingCoords = await geocodeAddress(query)
      }

      if (listingCoords) {
        const distKm = haversineDistanceKm(listingCoords, workplaceCoords)
        const optimalMode = pickOptimalCommuteMode(distKm, preferredMode)
        const commuteMinutes = estimateCommuteMinutes(distKm, optimalMode)

        return {
          ...l,
          commuteMinutes,
          commuteMode: optimalMode,
          latitude: listingCoords.lat,
          longitude: listingCoords.lon,
        }
      }

      return l
    }),
  )

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

  scored.sort((a, b) => {
    if (sort === 'price') return a.price - b.price
    if (sort === 'commute') return a.commuteMinutes - b.commuteMinutes
    return b.score - a.score
  })

  return NextResponse.json({
    context,
    userProfile,
    engine,
    geocodedWorkplace: workplaceCoords,
    total: scored.length,
    matches: scored,
    mlAnalytics,
  })
}
