import { NextResponse } from 'next/server'
import { dbListingToMatchListing, type Listing as MatchListing, type MatchContext, SAMPLE_CONTEXT, SAMPLE_LISTINGS } from '../../../components/matches/listings'
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

  const context: MatchContext = {
    company: userProfile?.company_name || SAMPLE_CONTEXT.company,
    office: userProfile?.office_address || SAMPLE_CONTEXT.office,
    city: userProfile?.user_city || (userProfile?.office_address ? userProfile.office_address.split(',').slice(-2).join(', ').trim() : SAMPLE_CONTEXT.city),
  }

  let dbMatched: MatchListing[] = []
  try {
    const { listings: dbListings } = await getListings({ pageSize: 50 })
    if (dbListings?.length) {
      dbMatched = dbListings.map(dbListingToMatchListing)
    }
  } catch (err) {
    console.error('Error loading DB listings in /api/matches:', err)
  }

  const combined = includeSamples ? [...dbMatched, ...SAMPLE_LISTINGS] : dbMatched

  // 1. Primary: Run Python Machine Learning & Vector Matching Engine (ml/vector_matcher.py)
  let scored: MatchListing[] = []
  let mlAnalytics: any[] = []
  let engine = 'python'

  const pythonResult = await runPythonVectorMatcher(combined, userProfile)
  if (pythonResult?.scored?.length) {
    scored = pythonResult.scored
    mlAnalytics = pythonResult.mlAnalytics
  } else {
    // 2. High-performance fallback: In-process JS Vector Matching Engine
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
    total: scored.length,
    matches: scored,
    mlAnalytics,
  })
}

