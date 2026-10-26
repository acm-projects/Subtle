import { NextResponse } from 'next/server'
import { dbListingToMatchListing, type Listing as MatchListing, type MatchContext, SAMPLE_CONTEXT, SAMPLE_LISTINGS } from '../../../components/matches/listings'
import { getListings } from '../../../lib/listings'
import { supabase } from '../../../lib/supabase'

function parseMaxBudget(budgetStr: string | null | undefined): number | null {
  if (!budgetStr) return null
  const s = budgetStr.toLowerCase()
  if (s.includes('under') && s.includes('1,500')) return 1500
  if (s.includes('1,500') && s.includes('2,000')) return 2000
  if (s.includes('2,000') && s.includes('2,500')) return 2500
  if (s.includes('2,500+')) return 5000
  return null
}

function scoreListingForUser(listing: MatchListing, userProfile: Record<string, any> | null): MatchListing {
  if (!userProfile) return listing

  let score = listing.score || 85
  const reasons: string[] = []

  // 1. Budget match
  const maxBudget = parseMaxBudget(userProfile.monthly_budget)
  if (maxBudget !== null) {
    if (listing.price <= maxBudget) {
      score += 5
      reasons.push(`Within your ${userProfile.monthly_budget} monthly budget ($${listing.price}/mo)`)
    } else {
      const overBy = listing.price - maxBudget
      score -= Math.min(18, Math.round(overBy / 50))
    }
  }

  // 2. Housing style match
  const prefStyle = (userProfile.housing_style ?? '').toString().toLowerCase()
  if (prefStyle && prefStyle !== 'any' && prefStyle !== 'no preference') {
    if (listing.homeType.toLowerCase() === prefStyle) {
      score += 4
      reasons.push(`Matches your preferred housing style (${listing.homeType})`)
    } else {
      score -= 4
    }
  }

  // 3. Roommates match
  if (userProfile.wants_roommates === false && listing.roomType === 'Entire place') {
    score += 4
    reasons.push('Private entire place — no roommates')
  } else if (userProfile.wants_roommates === true && listing.roomType !== 'Entire place') {
    score += 3
    reasons.push(`${listing.roomType} with fellow summer interns`)
  }

  // 4. Commute time match
  const targetCommute = typeof userProfile.commute_time === 'number' ? userProfile.commute_time : null
  if (targetCommute !== null) {
    if (listing.commuteMinutes <= targetCommute) {
      score += 3
      reasons.push(`${listing.commuteMinutes} min commute is within your ${targetCommute} min target`)
    } else {
      score -= Math.min(10, Math.round((listing.commuteMinutes - targetCommute) / 3))
    }
  }

  // 5. Accommodations match (e.g., Pets Allowed)
  const accs: string[] = Array.isArray(userProfile.user_accommodations) ? userProfile.user_accommodations : []
  if (accs.some((a) => a.toLowerCase().includes('pet'))) {
    const hasPets = [...listing.tags, ...listing.amenities].some((t) => t.toLowerCase().includes('pet'))
    if (hasPets) {
      score += 4
      reasons.push('Pet-friendly verified sublet')
    }
  }

  const clampedScore = Math.max(50, Math.min(99, score))
  return {
    ...listing,
    score: clampedScore,
    whyScore: reasons.length > 0 ? reasons : listing.whyScore,
  }
}

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
  const scored = combined.map((l) => scoreListingForUser(l, userProfile))

  scored.sort((a, b) => {
    if (sort === 'price') return a.price - b.price
    if (sort === 'commute') return a.commuteMinutes - b.commuteMinutes
    return b.score - a.score
  })

  return NextResponse.json({
    context,
    userProfile,
    total: scored.length,
    matches: scored,
  })
}

