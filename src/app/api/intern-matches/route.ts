import { NextResponse } from 'next/server'
import { admin, callerFrom } from '../../../lib/supabase-admin'
import { geocodeAddress, haversineDistanceKm, type Coordinates } from '../../../lib/geocoding'
import { NEARBY_MILES } from '../../../components/matches/listings'

export type InternProfile = {
  id: string
  name: string
  initials: string
  role: string
  company?: string
  school: string
  interests: string[]
  shared: string[]
  angle?: number
  radius?: number
  match?: number
}


// Semantic interest clusters for soft-cosine affinity matching
const INTEREST_CLUSTERS: Record<string, string[]> = {
  outdoors: ['hiking', 'camping', 'running', 'nature', 'surfing', 'climbing', 'outdoors'],
  sports: ['basketball', 'soccer', 'golf', 'cricket', 'fitness', 'gym', 'yoga', 'tennis', 'running'],
  culinary: ['cooking', 'baking', 'coffee', 'food', 'culinary'],
  arts_creative: ['film', 'photography', 'pottery', 'painting', 'illustration', 'design', 'theatre', 'writing', 'thrifting', 'fashion', 'art'],
  tech_gaming: ['gaming', 'anime', 'coding', 'robotics', 'chess', 'board games', 'tech'],
  social_culture: ['live music', 'music', 'concerts', 'podcasts', 'travel', 'reading', 'volunteering', 'debate', 'dance'],
}


function schoolFromEmail(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (domain.includes('utdallas')) return 'UT Dallas'
  if (domain.includes('stanford')) return 'Stanford'
  if (domain.includes('berkeley')) return 'UC Berkeley'
  if (domain.includes('ucla')) return 'UCLA'
  if (domain.includes('usc')) return 'USC'
  if (domain.includes('mit')) return 'MIT'
  return 'University Student'
}

/**
 * Calculates interest-based match score between user and candidate.
 * Combines direct interest intersections with cluster semantic affinities.
 */
function scoreInternMatch(userInterests: string[], candidateInterests: string[]): {
  score?: number
  shared: string[]
  related: string[]
} {
  const normUser = userInterests.map((x) => x.trim().toLowerCase())
  const shared = candidateInterests.filter((c) => normUser.includes(c.trim().toLowerCase()))

  // Identify semantic affinity clusters the user belongs to
  const userClusters = new Set<string>()
  for (const [cluster, items] of Object.entries(INTEREST_CLUSTERS)) {
    if (normUser.some((u) => items.includes(u))) {
      userClusters.add(cluster)
    }
  }

  // Related interests (in same cluster but not exact string match)
  const related = candidateInterests.filter((c) => {
    const cLower = c.trim().toLowerCase()
    if (normUser.includes(cLower)) return false
    for (const cluster of userClusters) {
      if (INTEREST_CLUSTERS[cluster].includes(cLower)) return true
    }
    return false
  })

  if (normUser.length === 0) {
    return { shared: [], related: [] }
  }

  // If there are shared or strongly related interests, score them
  let score: number | undefined
  if (shared.length >= 4) {
    score = Math.min(98, 92 + (shared.length - 4) * 2)
  } else if (shared.length === 3) {
    score = 88 + Math.min(4, related.length * 2)
  } else if (shared.length === 2) {
    score = 79 + Math.min(6, related.length * 2)
  } else if (shared.length === 1) {
    score = 70 + Math.min(6, related.length * 2)
  } else if (related.length >= 2) {
    score = 64
  }

  return { score, shared, related }
}

/**
 * GET /api/intern-matches
 * Query params:
 *   - email: optional student_email of current user
 *   - interests: optional comma-separated list of interests to override or supplement
 */
export async function GET(request: Request) {
  // the signed-in caller (login token); nobody can ask on someone else's behalf
  const caller = await callerFrom(request)
  if (!caller) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const email = (caller.email ?? '').toLowerCase()

  // 1. Everyone in users_table (latest row per email). Interests, company and office come from the quiz.
  //    Read with the server key; only names, schools, companies and interests go back to the browser.
  const { data: rows } = await admin().from('users_table').select('id, student_email, first_name, last_name, company_name, office_address, user_interests, university')
  const byEmail = new Map<string, Record<string, any>>()
  for (const r of rows ?? []) {
    if (r.student_email) byEmail.set(String(r.student_email).toLowerCase(), r)
  }
  const me = email ? byEmail.get(email) : undefined

  const myInterests: string[] = Array.isArray(me?.user_interests) ? me!.user_interests : []
  const myOffice = String(me?.office_address ?? '').trim()
  const city = cityLabel(myOffice)

  // 2. Where I work. Without an office address there's no "near you", so nobody is shown.
  const myCoords = myOffice ? await geocodeAddress(myOffice) : null
  if (!myCoords) {
    return NextResponse.json({ myInterests, city, needsOffice: !myOffice, totalInterns: 0, matchedCount: 0, interns: [], topMatches: [] })
  }

  // 3. Other interns whose office is within NEARBY_MILES of mine, scored on shared interests
  const nearbyKm = NEARBY_MILES * 1.609
  const interns: InternProfile[] = []
  for (const [userEmail, u] of byEmail.entries()) {
    if (userEmail === email || !u.id) continue
    const office = String(u.office_address ?? '').trim()
    if (!office) continue
    const coords: Coordinates | null = await geocodeAddress(office)
    if (!coords || haversineDistanceKm(coords, myCoords) > nearbyKm) continue

    const interests: string[] = Array.isArray(u.user_interests) ? u.user_interests : []
    const { score, shared } = scoreInternMatch(myInterests, interests)
    if (shared.length === 0) continue

    const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Subtle intern'
    const initials = fullName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    interns.push({
      // the auth user id, so "Connect" can save a row in the connections table
      id: String(u.id),
      name: fullName,
      initials: initials || 'IN',
      role: u.company_name ? `Intern at ${u.company_name}` : 'Summer intern',
      company: u.company_name ?? undefined,
      school: String(u.university ?? '').trim() || schoolFromEmail(u.student_email),
      interests,
      shared,
      match: score,
    })
  }

  interns.sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || (b.shared?.length ?? 0) - (a.shared?.length ?? 0))
  const topMatches = interns.filter((i) => i.match !== undefined && i.match >= 65)

  // no emails in the response: other users' addresses shouldn't reach the browser
  return NextResponse.json({
    myInterests,
    city,
    needsOffice: false,
    totalInterns: interns.length,
    matchedCount: topMatches.length,
    interns,
    topMatches,
  })
}

/** "Houston, TX" from "315 Capitol St Unit 205, Houston, TX 77002" */
function cityLabel(office: string): string {
  const parts = office.split(/,|\s+in\s+/i).map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return ''
  const last = parts[parts.length - 1]
  const state = last.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/)
  if (state) return `${parts[parts.length - 2]}, ${state[1].toUpperCase()}`
  return parts.slice(-2).join(', ').replace(/\s*\d{5}(-\d{4})?$/, '')
}
