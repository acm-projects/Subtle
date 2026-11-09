import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export type InternProfile = {
  id: string
  name: string
  initials: string
  email?: string
  role: string
  company?: string
  school: string
  interests: string[]
  shared: string[]
  angle?: number
  radius?: number
  match?: number
}

const DEFAULT_INTERESTS = ['Hiking', 'Cooking', 'Film', 'Photography', 'Basketball', 'Live music']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Semantic interest clusters for soft-cosine affinity matching
const INTEREST_CLUSTERS: Record<string, string[]> = {
  outdoors: ['hiking', 'camping', 'running', 'nature', 'surfing', 'climbing', 'outdoors'],
  sports: ['basketball', 'soccer', 'golf', 'cricket', 'fitness', 'gym', 'yoga', 'tennis', 'running'],
  culinary: ['cooking', 'baking', 'coffee', 'food', 'culinary'],
  arts_creative: ['film', 'photography', 'pottery', 'painting', 'illustration', 'design', 'theatre', 'writing', 'thrifting', 'fashion', 'art'],
  tech_gaming: ['gaming', 'anime', 'coding', 'robotics', 'chess', 'board games', 'tech'],
  social_culture: ['live music', 'music', 'concerts', 'podcasts', 'travel', 'reading', 'volunteering', 'debate', 'dance'],
}

const BASE_SEED_INTERNS = [
  { id: 'aisha', name: 'Aisha Rahman', initials: 'AR', role: 'Product design intern', school: 'UCLA', interests: ['Hiking', 'Cooking', 'Film', 'Photography', 'Pottery'] },
  { id: 'leo', name: 'Leo Martinez', initials: 'LM', role: 'Software intern', school: 'USC', interests: ['Basketball', 'Live music', 'Cooking', 'Film', 'Gaming'] },
  { id: 'priya', name: 'Priya Shah', initials: 'PS', role: 'Data intern', school: 'Stanford', interests: ['Hiking', 'Photography', 'Live music', 'Chess'] },
  { id: 'marcus', name: 'Marcus Tran', initials: 'MT', role: 'Marketing intern', school: 'UC Berkeley', interests: ['Cooking', 'Hiking', 'Basketball', 'Soccer'] },
  { id: 'sofia', name: 'Sofia Lopez', initials: 'SL', role: 'Finance intern', school: 'NYU', interests: ['Film', 'Live music', 'Yoga', 'Travel'] },
  { id: 'daniel', name: 'Daniel Kim', initials: 'DK', role: 'Research intern', school: 'Michigan', interests: ['Photography', 'Basketball', 'Reading', 'Chess'] },
  { id: 'emma', name: 'Emma Walsh', initials: 'EW', role: 'Design intern', school: 'Brown', interests: ['Painting', 'Yoga', 'Thrifting'] },
  { id: 'jon', name: 'Jon Park', initials: 'JP', role: 'Software intern', school: 'UCSD', interests: ['Gaming', 'Anime', 'Running', 'Coding'] },
  { id: 'nia', name: 'Nia Brooks', initials: 'NB', role: 'Policy intern', school: 'Howard', interests: ['Debate', 'Dance', 'Reading', 'Volunteering'] },
  { id: 'omar', name: 'Omar Haddad', initials: 'OH', role: 'Software intern', school: 'UT Austin', interests: ['Soccer', 'Coding', 'Coffee', 'Gaming'] },
  { id: 'chloe', name: 'Chloe Evans', initials: 'CE', role: 'Media intern', school: 'Northwestern', interests: ['Writing', 'Theatre', 'Baking', 'Film'] },
  { id: 'ravi', name: 'Ravi Patel', initials: 'RP', role: 'Data intern', school: 'Georgia Tech', interests: ['Cricket', 'Chess', 'Travel', 'Coding'] },
  { id: 'zoe', name: 'Zoe Chen', initials: 'ZC', role: 'Product intern', school: 'Columbia', interests: ['Surfing', 'Pottery', 'Fashion', 'Design'] },
  { id: 'sam', name: 'Sam Okafor', initials: 'SO', role: 'Finance intern', school: 'Duke', interests: ['Golf', 'Podcasts', 'Cars', 'Basketball'] },
  { id: 'lily', name: 'Lily Nguyen', initials: 'LN', role: 'Design intern', school: 'RISD', interests: ['Illustration', 'Anime', 'Baking', 'Art'] },
  { id: 'ben', name: 'Ben Carter', initials: 'BC', role: 'Software intern', school: 'MIT', interests: ['Robotics', 'Climbing', 'Gaming', 'Coding'] },
  { id: 'maya', name: 'Maya Singh', initials: 'MS', role: 'Policy intern', school: 'Yale', interests: ['Volunteering', 'Reading', 'Yoga', 'Travel'] },
  { id: 'theo', name: 'Theo Grant', initials: 'TG', role: 'Data intern', school: 'Rice', interests: ['Running', 'Board games', 'Coffee', 'Hiking'] },
]

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
 *   - uid: optional auth user id of current user (used to leave them out of their own results)
 *   - interests: optional comma-separated list of interests to override or supplement
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const uid = searchParams.get('uid')
  const interestsParam = searchParams.get('interests')

  // 1. Resolve current user's interests
  let myInterests: string[] = []

  if (interestsParam) {
    myInterests = interestsParam.split(',').map((s) => s.trim()).filter(Boolean)
  }

  // Also query users_table
  const { data: rows } = await supabase.from('users_table').select('*')
  const byEmail = new Map<string, Record<string, any>>()
  for (const r of rows ?? []) {
    if (r.student_email) {
      byEmail.set(String(r.student_email).toLowerCase(), r)
    }
  }

  // If email was given and no query param interests, pull from users_table
  if (myInterests.length === 0 && email) {
    const dbUser = byEmail.get(email.toLowerCase())
    if (Array.isArray(dbUser?.user_interests) && dbUser.user_interests.length > 0) {
      myInterests = dbUser.user_interests
    }
  }

  // Load profiles once: used for the user's own interests and for the candidate list
  let allProfiles: Record<string, any>[] = []
  try {
    const { data } = await supabase.from('profiles').select('*')
    allProfiles = data ?? []
  } catch {}

  // Also check profiles table
  if (myInterests.length === 0 && (uid || email)) {
    const matchedProfile = allProfiles.find(
      (p) =>
        (uid && p.id === uid) ||
        (email &&
          ((p.email && String(p.email).toLowerCase() === email.toLowerCase()) ||
            (p.student_email && String(p.student_email).toLowerCase() === email.toLowerCase()))),
    )
    if (Array.isArray(matchedProfile?.interests) && matchedProfile.interests.length > 0) {
      myInterests = matchedProfile.interests
    }
  }

  if (myInterests.length === 0) {
    myInterests = DEFAULT_INTERESTS
  }

  // 2. Build candidate interns. The id is always the auth user id (a valid UUID),
  // so connection requests can actually reach the person.
  // Every users_table row with a valid user_id is included, merged with its profiles row.
  type Candidate = {
    id: string
    email?: string
    firstName?: string
    lastName?: string
    company?: string
    interests: string[]
  }
  const candidates = new Map<string, Candidate>()

  for (const r of rows ?? []) {
    const id = String(r.user_id ?? '')
    if (!UUID.test(id)) continue // no valid user_id: they can't receive requests
    candidates.set(id, {
      id,
      email: r.student_email ? String(r.student_email).toLowerCase() : undefined,
      firstName: r.first_name ?? undefined,
      lastName: r.last_name ?? undefined,
      company: r.company_name ?? undefined,
      interests: Array.isArray(r.user_interests) ? r.user_interests : [],
    })
  }

  // profiles fill in anyone missing, and any gaps (interests, names) for people already added
  for (const p of allProfiles) {
    const id = String(p.id ?? '')
    if (!UUID.test(id)) continue
    const pEmail = String(p.email ?? p.student_email ?? '').toLowerCase() || undefined
    const u = pEmail ? byEmail.get(pEmail) : undefined
    const existing = candidates.get(id)
    const profileInterests: string[] = Array.isArray(p.interests) ? p.interests : []

    candidates.set(id, {
      id,
      email: existing?.email ?? pEmail,
      firstName: existing?.firstName ?? p.first_name ?? u?.first_name ?? undefined,
      lastName: existing?.lastName ?? p.last_name ?? u?.last_name ?? undefined,
      company: existing?.company ?? u?.company_name ?? undefined,
      interests: existing?.interests.length ? existing.interests : profileInterests,
    })
  }

  const dbInterns: InternProfile[] = []
  for (const c of candidates.values()) {
    if (c.id === uid) continue // skip yourself
    if (email && c.email && c.email === email.toLowerCase()) continue // skip yourself (by email)

    const { score, shared } = scoreInternMatch(myInterests, c.interests)

    const fullName = `${c.firstName ?? 'Intern'} ${c.lastName ?? ''}`.trim()
    const initials =
      fullName
        .split(' ')
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'IN'

    dbInterns.push({
      id: c.id,
      name: fullName,
      initials,
      email: c.email,
      role: c.company ? `Intern at ${c.company}` : 'Summer Intern',
      company: c.company,
      school: c.email ? schoolFromEmail(c.email) : 'University Student',
      interests: c.interests,
      shared,
      match: score,
    })
  }

  // 3. Build candidate interns from the seed pool with dynamic matching
  const seedInterns: InternProfile[] = BASE_SEED_INTERNS.map((seed) => {
    const { score, shared } = scoreInternMatch(myInterests, seed.interests)
    return {
      ...seed,
      shared,
      match: score,
    }
  })

  // 4. Combine and rank by match score (descending). Interns with no score go last,
  // so people who don't match still come back and show as small dots on the map.
  const allInterns = [...dbInterns, ...seedInterns]
  allInterns.sort((a, b) => {
    const scoreA = a.match ?? 0
    const scoreB = b.match ?? 0
    if (scoreB !== scoreA) return scoreB - scoreA
    return (b.shared?.length ?? 0) - (a.shared?.length ?? 0)
  })

  const topMatches = allInterns.filter((i) => i.match !== undefined && i.match >= 65)

  return NextResponse.json({
    myInterests,
    totalInterns: allInterns.length,
    matchedCount: topMatches.length,
    interns: allInterns,
    topMatches,
  })
}