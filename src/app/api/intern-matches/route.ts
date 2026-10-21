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
  angle: number
  radius: number
  match?: number
}

const DEFAULT_INTERESTS = ['Hiking', 'Cooking', 'Film', 'Photography', 'Basketball', 'Live music']

const SEED_INTERNS: Omit<InternProfile, 'shared'>[] = [
  { id: 'aisha', name: 'Aisha Rahman', initials: 'AR', role: 'Product design intern', school: 'UCLA', interests: ['Hiking', 'Cooking', 'Film', 'Photography', 'Pottery'], angle: -60, radius: 0.3, match: 96 },
  { id: 'leo', name: 'Leo Martinez', initials: 'LM', role: 'Software intern', school: 'USC', interests: ['Basketball', 'Live music', 'Cooking', 'Film', 'Gaming'], angle: 20, radius: 0.34, match: 92 },
  { id: 'priya', name: 'Priya Shah', initials: 'PS', role: 'Data intern', school: 'Stanford', interests: ['Hiking', 'Photography', 'Live music', 'Chess'], angle: 110, radius: 0.28, match: 89 },
  { id: 'marcus', name: 'Marcus Tran', initials: 'MT', role: 'Marketing intern', school: 'UC Berkeley', interests: ['Cooking', 'Hiking', 'Basketball', 'Soccer'], angle: 165, radius: 0.36, match: 86 },
  { id: 'sofia', name: 'Sofia Lopez', initials: 'SL', role: 'Finance intern', school: 'NYU', interests: ['Film', 'Live music', 'Yoga', 'Travel'], angle: 230, radius: 0.32, match: 82 },
  { id: 'daniel', name: 'Daniel Kim', initials: 'DK', role: 'Research intern', school: 'Michigan', interests: ['Photography', 'Basketball', 'Reading', 'Chess'], angle: 300, radius: 0.38, match: 78 },
  { id: 'emma', name: 'Emma Walsh', initials: 'EW', role: 'Design intern', school: 'Brown', interests: ['Painting', 'Yoga', 'Thrifting'], angle: -15, radius: 0.44 },
  { id: 'jon', name: 'Jon Park', initials: 'JP', role: 'Software intern', school: 'UCSD', interests: ['Gaming', 'Anime', 'Running'], angle: 55, radius: 0.43 },
  { id: 'nia', name: 'Nia Brooks', initials: 'NB', role: 'Policy intern', school: 'Howard', interests: ['Debate', 'Dance', 'Reading'], angle: 85, radius: 0.41 },
  { id: 'omar', name: 'Omar Haddad', initials: 'OH', role: 'Software intern', school: 'UT Austin', interests: ['Soccer', 'Coding', 'Coffee'], angle: 140, radius: 0.44 },
  { id: 'chloe', name: 'Chloe Evans', initials: 'CE', role: 'Media intern', school: 'Northwestern', interests: ['Writing', 'Theatre', 'Baking'], angle: 195, radius: 0.42 },
  { id: 'ravi', name: 'Ravi Patel', initials: 'RP', role: 'Data intern', school: 'Georgia Tech', interests: ['Cricket', 'Chess', 'Travel'], angle: 255, radius: 0.44 },
  { id: 'zoe', name: 'Zoe Chen', initials: 'ZC', role: 'Product intern', school: 'Columbia', interests: ['Surfing', 'Pottery', 'Fashion'], angle: 330, radius: 0.43 },
  { id: 'sam', name: 'Sam Okafor', initials: 'SO', role: 'Finance intern', school: 'Duke', interests: ['Golf', 'Podcasts', 'Cars'], angle: -100, radius: 0.42 },
  { id: 'lily', name: 'Lily Nguyen', initials: 'LN', role: 'Design intern', school: 'RISD', interests: ['Illustration', 'Anime', 'Baking'], angle: 40, radius: 0.22 },
  { id: 'ben', name: 'Ben Carter', initials: 'BC', role: 'Software intern', school: 'MIT', interests: ['Robotics', 'Climbing', 'Gaming'], angle: 205, radius: 0.22 },
  { id: 'maya', name: 'Maya Singh', initials: 'MS', role: 'Policy intern', school: 'Yale', interests: ['Volunteering', 'Reading', 'Yoga'], angle: 120, radius: 0.45 },
  { id: 'theo', name: 'Theo Grant', initials: 'TG', role: 'Data intern', school: 'Rice', interests: ['Running', 'Board games', 'Coffee'], angle: 275, radius: 0.24 },
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
 * GET /api/intern-matches
 * Query params:
 *   - email: optional student_email of the current user to compute shared interests
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  const { data: rows } = await supabase.from('users_table').select('*')

  // Deduplicate users_table by student_email (keep latest entry per email)
  const byEmail = new Map<string, Record<string, any>>()
  for (const r of rows ?? []) {
    if (r.student_email) {
      byEmail.set(r.student_email.toLowerCase(), r)
    }
  }

  const currentUser = email ? byEmail.get(email.toLowerCase()) : null
  const myInterests: string[] =
    Array.isArray(currentUser?.user_interests) && currentUser.user_interests.length > 0
      ? currentUser.user_interests
      : DEFAULT_INTERESTS

  const dbInterns: InternProfile[] = []
  let idx = 0
  for (const [userEmail, u] of byEmail.entries()) {
    if (email && userEmail === email.toLowerCase()) continue
    const interests: string[] = Array.isArray(u.user_interests) && u.user_interests.length > 0
      ? u.user_interests
      : ['Cooking', 'Hiking', 'Music']
    const shared = interests.filter((x) =>
      myInterests.some((m) => m.toLowerCase() === x.toLowerCase()),
    )
    const fullName = `${u.first_name ?? 'Intern'} ${u.last_name ?? ''}`.trim()
    const initials = fullName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const matchScore = shared.length > 0 ? Math.min(98, 76 + shared.length * 7) : 74
    const angle = (idx * 65 + 45) % 360
    const radius = 0.25 + ((idx % 4) * 0.04)
    idx++

    dbInterns.push({
      id: `db-${userEmail}`,
      name: fullName,
      initials: initials || 'IN',
      email: u.student_email,
      role: u.company_name ? `Intern at ${u.company_name}` : 'Summer Intern',
      company: u.company_name ?? undefined,
      school: schoolFromEmail(u.student_email),
      interests,
      shared,
      angle,
      radius,
      match: matchScore,
    })
  }

  const seededWithShared: InternProfile[] = SEED_INTERNS.map((i) => {
    const shared = i.interests.filter((x) =>
      myInterests.some((m) => m.toLowerCase() === x.toLowerCase()),
    )
    return {
      ...i,
      shared,
    }
  })

  const allInterns = [...dbInterns, ...seededWithShared]
  const topMatches = allInterns
    .filter((i) => i.match !== undefined)
    .sort((a, b) => (b.match ?? 0) - (a.match ?? 0))

  return NextResponse.json({
    myInterests,
    totalInterns: allInterns.length,
    matchedCount: topMatches.length,
    interns: allInterns,
    topMatches,
  })
}

