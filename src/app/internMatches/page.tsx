'use client'

import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../components/AppNavbar'
import { supabase } from '../../lib/supabase'

//Backend: replace these 
const MY_INTERESTS = ['Hiking', 'Cooking', 'Film', 'Photography', 'Basketball', 'Live music']

// angle and radius from older versions of the API are no longer used: dots are placed by the layout below.
type Intern = {
  id: string
  name: string
  initials: string
  role: string
  school: string
  interests: string[]
  match?: number // 0-100. Only set for interns who matched with the user.
}

const INTERNS: Intern[] = [
  //backend Replace with user data
  { id: 'aisha', name: 'Aisha Rahman', initials: 'AR', role: 'Product design intern', school: 'UCLA', interests: ['Hiking', 'Cooking', 'Film', 'Photography', 'Pottery'], match: 96 },
  { id: 'leo', name: 'Leo Martinez', initials: 'LM', role: 'Software intern', school: 'USC', interests: ['Basketball', 'Live music', 'Cooking', 'Film', 'Gaming'], match: 92 },
  { id: 'priya', name: 'Priya Shah', initials: 'PS', role: 'Data intern', school: 'Stanford', interests: ['Hiking', 'Photography', 'Live music', 'Chess'], match: 89 },
  { id: 'marcus', name: 'Marcus Tran', initials: 'MT', role: 'Marketing intern', school: 'UC Berkeley', interests: ['Cooking', 'Hiking', 'Basketball', 'Soccer'], match: 86 },
  { id: 'sofia', name: 'Sofia Lopez', initials: 'SL', role: 'Finance intern', school: 'NYU', interests: ['Film', 'Live music', 'Yoga', 'Travel'], match: 82 },
  { id: 'daniel', name: 'Daniel Kim', initials: 'DK', role: 'Research intern', school: 'Michigan', interests: ['Photography', 'Basketball', 'Reading', 'Chess'], match: 78 },
  // also in the city, not matched
  { id: 'emma', name: 'Emma Walsh', initials: 'EW', role: 'Design intern', school: 'Brown', interests: ['Painting', 'Yoga', 'Thrifting'] },
  { id: 'jon', name: 'Jon Park', initials: 'JP', role: 'Software intern', school: 'UCSD', interests: ['Gaming', 'Anime', 'Running'] },
  { id: 'nia', name: 'Nia Brooks', initials: 'NB', role: 'Policy intern', school: 'Howard', interests: ['Debate', 'Dance', 'Reading'] },
  { id: 'omar', name: 'Omar Haddad', initials: 'OH', role: 'Software intern', school: 'UT Austin', interests: ['Soccer', 'Coding', 'Coffee'] },
  { id: 'chloe', name: 'Chloe Evans', initials: 'CE', role: 'Media intern', school: 'Northwestern', interests: ['Writing', 'Theatre', 'Baking'] },
  { id: 'ravi', name: 'Ravi Patel', initials: 'RP', role: 'Data intern', school: 'Georgia Tech', interests: ['Cricket', 'Chess', 'Travel'] },
  { id: 'zoe', name: 'Zoe Chen', initials: 'ZC', role: 'Product intern', school: 'Columbia', interests: ['Surfing', 'Pottery', 'Fashion'] },
  { id: 'sam', name: 'Sam Okafor', initials: 'SO', role: 'Finance intern', school: 'Duke', interests: ['Golf', 'Podcasts', 'Cars'] },
  { id: 'lily', name: 'Lily Nguyen', initials: 'LN', role: 'Design intern', school: 'RISD', interests: ['Illustration', 'Anime', 'Baking'] },
  { id: 'ben', name: 'Ben Carter', initials: 'BC', role: 'Software intern', school: 'MIT', interests: ['Robotics', 'Climbing', 'Gaming'] },
  { id: 'maya', name: 'Maya Singh', initials: 'MS', role: 'Policy intern', school: 'Yale', interests: ['Volunteering', 'Reading', 'Yoga'] },
  { id: 'theo', name: 'Theo Grant', initials: 'TG', role: 'Data intern', school: 'Rice', interests: ['Running', 'Board games', 'Coffee'] },
]

// sample meetup ideas by interest (replace with real events later)
const MEETUP_IDEAS: Record<string, string> = {
  Hiking: 'Sunrise hike at Griffith Park',
  Cooking: 'Potluck dinner in Silver Lake',
  Film: 'Outdoor movie night downtown',
  Photography: 'Golden hour photo walk',
  Basketball: 'Pickup game at the park',
  'Live music': 'Live music night in Echo Park',
}

const serif = 'font-[family-name:var(--font-serif)]'
const label = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A5A75]'
const card = 'rounded-[28px] border border-white bg-white/80 p-6 shadow-[0_20px_50px_-30px_rgba(30,43,68,0.35)]'
const pill = 'rounded-full border border-[#D5DFEA] bg-white px-3 py-1 text-xs font-medium text-[#1E2B44]'
const pillShared = 'rounded-full border border-[#86abcc] bg-[#86abcc] px-3 py-1 text-xs font-medium text-white'
const btnDark = 'rounded-full bg-[#1E2B44] text-sm font-semibold text-white transition hover:bg-[#2F4161] disabled:cursor-default disabled:bg-[#9CB5CE]'
const btnLight = 'rounded-full border border-[#D5DFEA] bg-white text-sm font-semibold text-[#1E2B44] transition hover:bg-[#F7F9FB] disabled:cursor-default disabled:text-[#4A5A75]'

// Score colors: navy for the best matches, then blue, then brown as the score drops.
// All keep white text above 4.5:1 contrast.
function scoreColor(score: number) {
  if (score >= 90) return '#739dc2'
  if (score >= 80) return '#a0c8ec'
  if (score >= 70) return '#B9D6F0' 
  return 'rgb(221, 167, 131)'
}

const joinNames = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] ?? '')

// Title Case for names, roles, interests and headings; short words like "at" and "in" stay lowercase.
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs'])
const titleCase = (s: string) =>
  s
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* ---------- map layout ----------
   Only the 10 best matches get big circles. They fan out in a spiral around "You": each one is a new
   angle (golden angle apart) and the distance grows with rank, so they spread in every direction.
   Everyone else is a small dot scattered farther out. Positions are random but the same on every visit.
   Units: the map is 16:11, so it is 100 wide and 68.75 tall in the same units. */

const MAP_H = 68.75
const CX = 50
const CY = MAP_H / 2
const R_YOU = 6 // the "You" circle
const R_BIG = 4.2 // a top-10 match (big circle)
const R_SMALL = 1.6 // everyone else (small dot)
const EDGE = 6 // keep dots this far from the map edge
const GAP_BIG = 4.5 // clear space wanted around a big circle
const GAP_SMALL = 3 // clear space wanted around a small dot
const TRIES = 160
const MAX_BIG = 10
const GOLDEN = 2.399963 // about 137.5 degrees, spreads items evenly around a circle

// the legend (bottom left) and the hint chip (top right) sit on top of the map, so keep dots out of them
const KEEP_OUT = [
  { x0: 0, y0: MAP_H - 10, x1: 40, y1: MAP_H },
  { x0: 60, y0: 0, x1: 100, y1: 9 },
]

const hitsRect = (x: number, y: number, r: number, b: (typeof KEEP_OUT)[number]) => {
  const dx = x - Math.max(b.x0, Math.min(x, b.x1))
  const dy = y - Math.max(b.y0, Math.min(y, b.y1))
  return dx * dx + dy * dy < r * r
}

// small seeded random number generator, so the server and the browser always agree
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hashString = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
const round2 = (n: number) => Math.round(n * 100) / 100

// the 10 best matches get the big circles
const bigIdsOf = (list: Intern[]) =>
  new Set(
    list
      .filter((i) => i.match !== undefined)
      .sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
      .slice(0, MAX_BIG)
      .map((i) => i.id),
  )

function layoutInterns(list: Intern[]): Record<string, { x: number; y: number }> {
  const rand = mulberry32(hashString(list.map((i) => i.id).join('|')))
  const big = bigIdsOf(list)
  const bigOrder = list.filter((i) => big.has(i.id)).sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
  const rest = list.filter((i) => !big.has(i.id))

  const placed: { x: number; y: number; r: number }[] = []
  const out: Record<string, { x: number; y: number }> = {}

  // free space between a circle at (x, y) and "You" plus everything placed so far
  const clearAt = (x: number, y: number, r: number) => {
    let c = Math.hypot(x - CX, y - CY) - (R_YOU + r)
    for (const p of placed) c = Math.min(c, Math.hypot(x - p.x, y - p.y) - (p.r + r))
    return c
  }
  const at = (angle: number, t: number) => ({
    x: CX + Math.cos(angle) * t * (50 - EDGE),
    y: CY + Math.sin(angle) * t * (MAP_H / 2 - EDGE),
  })
  const save = (id: string, x: number, y: number, r: number) => {
    placed.push({ x, y, r })
    out[id] = { x: round2(x), y: round2((y / MAP_H) * 100) } // y becomes a % of the height
  }

  // big circles: a spiral around "You"
  const startAngle = rand() * Math.PI * 2
  bigOrder.forEach((intern, k) => {
    const baseAngle = startAngle + k * GOLDEN
    const baseT = 0.4 + 0.5 * (k / Math.max(1, bigOrder.length - 1))
    let best = at(baseAngle, baseT)
    let bestClear = -Infinity
    for (let n = 0; n < TRIES; n++) {
      const wiggle = 0.3 + (n / TRIES) * 3 // search wider the longer it takes
      const p = at(baseAngle + (rand() - 0.5) * 0.35 * wiggle, Math.min(0.95, Math.max(0.3, baseT + (rand() - 0.5) * 0.16 * wiggle)))
      if (KEEP_OUT.some((b) => hitsRect(p.x, p.y, R_BIG + 1, b))) continue
      const c = clearAt(p.x, p.y, R_BIG)
      if (c >= GAP_BIG) {
        best = p
        bestClear = c
        break
      }
      if (c > bestClear) {
        bestClear = c
        best = p
      }
    }
    save(intern.id, best.x, best.y, R_BIG)
  })

  // small dots: scattered at random, farther out
  for (const intern of rest) {
    let best = at(rand() * Math.PI * 2, 0.8)
    let bestClear = -Infinity
    for (let n = 0; n < TRIES; n++) {
      const p = at(rand() * Math.PI * 2, 0.3 + rand() * 0.7)
      if (KEEP_OUT.some((b) => hitsRect(p.x, p.y, R_SMALL + 1, b))) continue
      const c = clearAt(p.x, p.y, R_SMALL)
      if (c >= GAP_SMALL) {
        best = p
        bestClear = c
        break
      }
      if (c > bestClear) {
        bestClear = c
        best = p
      }
    }
    save(intern.id, best.x, best.y, R_SMALL)
  }
  return out
}

type Placed = Intern & { x: number; y: number; shared: string[]; big: boolean }
type RequestState = 'none' | 'sent' | 'connected'

function Tooltip({
  intern,
  state,
  onConnect,
}: {
  intern: Placed
  state: RequestState
  onConnect: (id: string) => void
}) {
  const matched = intern.match !== undefined
  return (
    <div className="w-[260px] rounded-[22px] border border-white bg-white p-4 text-left text-[#1E2B44] shadow-[0_30px_60px_-24px_rgba(30,43,68,0.5)]">
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: matched ? scoreColor(intern.match ?? 0) : '#9CB5CE' }}
        >
          {matched ? intern.match : intern.initials}
        </span>
        <div className="min-w-0">
          <div className={`${serif} text-[18px] font-medium leading-tight`}>{intern.name}</div>
          <div className="text-xs text-[#4A5A75]">
            {titleCase(intern.role)} · {intern.school}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {intern.interests.map((i) => (
          <span key={i} className={matched && intern.shared.includes(i) ? pillShared : pill}>
            {titleCase(i)}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs leading-snug text-[#4A5A75]">
        {matched ? `Subtle score ${intern.match}. You both like ${joinNames(intern.shared.map(titleCase))}.` : 'Not matched yet.'}
      </p>

      <button type="button" disabled={state !== 'none'} onClick={() => onConnect(intern.id)} className={`mt-3.5 w-full py-2.5 ${state === 'none' ? btnDark : btnLight}`}>
        {state === 'connected' ? 'Connected' : state === 'sent' ? 'Request Sent' : `Connect with ${intern.name.split(' ')[0]}`}
      </button>
    </div>
  )
}

export default function MatchesPage() {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [requested, setRequested] = useState<Set<string>>(new Set()) // requests sent or waiting
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [firstName, setFirstName] = useState('')
  const [matchesOnly, setMatchesOnly] = useState(false)
  const [myInterests, setMyInterests] = useState<string[]>(MY_INTERESTS)
  const [internList, setInternList] = useState<Intern[]>(INTERNS)

  const flash = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ tone, text })
    window.setTimeout(() => setToast(null), 3500)
  }

  // AppNavbar takes the user's first name; also fetch live intern matches from /api/intern-matches
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const meta = data.user?.user_metadata
      const email = data.user?.email ?? ''
      setFirstName(meta?.first_name ?? email.split('@')[0] ?? '')

      // remember who the user has already connected with or asked
      if (data.user) {
        const me = data.user.id
        setUserId(me)
        const { data: rows } = await supabase
          .from('connections')
          .select('requester_id, addressee_id, status')
          .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
        const asked = new Set<string>()
        const linked = new Set<string>()
        ;(rows ?? []).forEach((r) => {
          const other = r.requester_id === me ? r.addressee_id : r.requester_id
          if (r.status === 'accepted') linked.add(other)
          else asked.add(other)
        })
        setRequested(asked)
        setConnectedIds(linked)
      }

      try {
        const query = email ? `?email=${encodeURIComponent(email)}` : ''
        const res = await fetch(`/api/intern-matches${query}`)
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.myInterests) && json.myInterests.length > 0) {
            setMyInterests(json.myInterests)
          }
          if (Array.isArray(json.interns) && json.interns.length > 0) {
            setInternList(json.interns)
          }
        }
      } catch {
        // Fallback to static INTERNS on network error
      }
    })
  }, [])

  // positions are worked out once for everyone, so dots stay put when you switch filters
  const positions = useMemo(() => layoutInterns(internList), [internList])
  // the 10 best matches get the big circles
  const bigIds = useMemo(() => bigIdsOf(internList), [internList])

  const interns: Placed[] = useMemo(
    () =>
      internList.map((i) => ({
        ...i,
        ...(positions[i.id] ?? { x: 50, y: 50 }),
        shared: i.interests.filter((x) => myInterests.includes(x)),
        big: bigIds.has(i.id),
      })),
    [internList, myInterests, positions, bigIds],
  )
  const matches = interns.filter((i) => i.match !== undefined).sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
  const topMatches = matches.filter((m) => m.big)
  const visible = matchesOnly ? topMatches : interns

  const stateOf = (id: string): RequestState => (connectedIds.has(id) ? 'connected' : requested.has(id) ? 'sent' : 'none')

  // how common each interest is among all interns in the city
  const popular = useMemo(() => {
    const counts = new Map<string, number>()
    interns.forEach((i) => i.interests.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8)
  }, [interns])
  const popularMax = popular[0]?.[1] ?? 1

  // meetup ideas for the interests you share with your matches
  const meetups = useMemo(
    () =>
      MY_INTERESTS.filter((x) => MEETUP_IDEAS[x])
        .map((interest) => ({ interest, idea: MEETUP_IDEAS[interest], people: matches.filter((m) => m.shared.includes(interest)) }))
        .filter((m) => m.people.length > 0)
        .sort((a, b) => b.people.length - a.people.length)
        .slice(0, 4),
    [matches],
  )

  // send a connection request to this intern; they accept or decline it from their profile
  const connect = async (id: string) => {
    const intern = interns.find((x) => x.id === id)
    if (!intern || stateOf(id) !== 'none') return
    const first = intern.name.split(' ')[0]

    if (!userId) return flash('Log in to send connection requests.', 'err')

    // mark it right away so a double-click can't send two requests
    setRequested((prev) => new Set(prev).add(id))

    // sample interns have no account to send to, so only the button changes
    if (!UUID.test(intern.id)) return flash(`Connection request sent to ${first}.`)

    const { error } = await supabase.from('connections').insert({
      requester_id: userId,
      addressee_id: intern.id,
      status: 'pending',
      score: intern.match ?? null,
    })
    // 23505 means a request to this person already exists, which is fine
    if (error && error.code !== '23505') {
      console.error('Could not send the connection request', error)
      // undo the "sent" state so the button works again
      setRequested((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      return flash("Couldn't send the request. Try again.", 'err')
    }
    flash(`Connection request sent to ${first}.`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_92%_100%,rgba(246,214,180,0.85),transparent_42%),linear-gradient(180deg,#c3d8ec_0%,#dde8f3_38%,#f1eeea_72%,#f7e8d8_100%)] text-[#1E2B44]">
      <AppNavbar firstName={firstName} />

      {/* pt-28 leaves room for the fixed navbar */}
      <div className="relative mx-auto max-w-[1240px] px-3 pb-10 pt-28 md:px-4">
        <div className="rounded-[40px] border border-white bg-white/65 p-6 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-9">
          {/* header: the interests block sits on the right, label directly above its tags */}
          <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div>
              <h1 className={`${serif} text-[44px] font-medium leading-[1.02] tracking-[-0.02em] md:text-[56px]`}>Matches</h1>
              <p className="mt-2 text-[15px] text-[#4A5A75]">Interns living in Los Angeles this summer who share your interests.</p>
            </div>

            <div className="max-w-[460px]">
              <div className={`${label} mb-2`}>Your Interests</div>
              <ul className="flex flex-wrap gap-1.5" aria-label="Your interests">
                {myInterests.map((i) => (
                  <li key={i} className="rounded-full bg-[#DCEBF6] px-2.5 py-1 text-[11px] font-semibold text-[#245F90] ring-[1.5px] ring-inset ring-[#2E7DB5]">
                    {titleCase(i)}
                  </li>
                ))}
              </ul>
            </div>
          </header>

          {/* filters */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMatchesOnly(false)} aria-pressed={!matchesOnly} className={`px-4 py-2 ${!matchesOnly ? btnDark : btnLight}`}>
                Everyone
              </button>
              <button type="button" onClick={() => setMatchesOnly(true)} aria-pressed={matchesOnly} className={`px-4 py-2 ${matchesOnly ? btnDark : btnLight}`}>
                Matches Only
              </button>
            </div>
            <span className="text-xs text-[#4A5A75]">
              {topMatches.length} of {matches.length} matches on the map · sample interns
            </span>
          </div>

          {/* map + side column */}
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="relative aspect-[16/11] min-h-[400px] overflow-hidden rounded-[28px] border border-white bg-[#F5F8FC] bg-[linear-gradient(#E3ECF5_1px,transparent_1px),linear-gradient(90deg,#E3ECF5_1px,transparent_1px)] bg-[length:48px_48px] shadow-[inset_0_0_0_1px_rgba(213,223,234,0.8)]">
              {/* distance zones */}
              <div className="pointer-events-none absolute inset-[14%] rounded-[28px] border border-dashed border-[#BFD0E2]" />
              <div className="pointer-events-none absolute inset-[30%] rounded-[24px] border border-dashed border-[#BFD0E2]" />

              {/* lines from you to each of the top 10 matches */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {topMatches.map((m) => (
                  <line
                    key={m.id}
                    x1="50"
                    y1="50"
                    x2={m.x}
                    y2={m.y}
                    stroke="#B9D6F0"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    strokeWidth={hoverId === m.id ? 3 : 1.2 + ((m.match ?? 0) / 100) * 1.2}
                    strokeOpacity={hoverId === m.id ? 0.85 : 0.22}
                    style={{ transition: 'stroke-opacity .2s, stroke-width .2s' }}
                  />
                ))}
              </svg>

              {/* you */}
              <div className="absolute left-1/2 top-1/2 z-20 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#1E2B44] text-sm font-bold text-white shadow-[0_14px_30px_-8px_rgba(30,43,68,0.6)]">
                <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#1E2B44]/60" />
                <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#1E2B44]/60" style={{ animationDelay: '1.4s' }} />
                You
              </div>

              {/* intern dots: big circles for the top 10, small dots for everyone else */}
              {visible.map((i) => {
                const matched = i.match !== undefined
                const active = hoverId === i.id
                const up = i.y > 52
                const horizontal = i.x < 28 ? 'left-[-6px]' : i.x > 72 ? 'right-[-6px]' : 'left-1/2 -translate-x-1/2'
                return (
                  <div
                    key={i.id}
                    role="group"
                    tabIndex={0}
                    aria-label={`${i.name}, ${titleCase(i.role)}${matched ? `, Subtle score ${i.match}` : ''}`}
                    onMouseEnter={() => setHoverId(i.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(i.id)}
                    onBlur={() => setHoverId(null)}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 outline-none ${active ? 'z-30' : 'z-10'}`}
                    style={{ left: `${i.x}%`, top: `${i.y}%` }}
                  >
                    <span
                      className={`grid place-items-center rounded-full border-[3px] border-white font-bold text-white transition duration-200 group-hover:scale-125 group-focus:scale-125 ${
                        i.big
                          ? 'h-[52px] w-[52px] text-sm shadow-[0_10px_20px_-8px_rgba(30,43,68,0.6)]'
                          : 'h-[16px] w-[16px] bg-[#9CB5CE] shadow-[0_4px_10px_rgba(30,43,68,0.2)] group-hover:bg-[#1E2B44]'
                      } ${active ? 'scale-125' : ''}`}
                      style={i.big ? { backgroundColor: scoreColor(i.match ?? 0) } : undefined}
                    >
                      {i.big ? i.initials : null}
                    </span>

                    {/* padding keeps the card attached to the dot so hover never drops */}
                    <div
                      className={`invisible absolute z-40 opacity-0 transition-opacity duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${horizontal} ${
                        up ? 'bottom-full pb-3' : 'top-full pt-3'
                      } ${active ? '!visible !opacity-100' : ''}`}
                    >
                      <Tooltip intern={i} state={stateOf(i.id)} onConnect={connect} />
                    </div>
                  </div>
                )
              })}

              {/* legend */}
              <div className="absolute bottom-3.5 left-3.5 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-full border border-white bg-white/85 px-4 py-2 text-[11px] font-semibold shadow-sm backdrop-blur">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#B9D6F0]" />You</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#2F5D8C]" />Top 10 Matches</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#9CB5CE]" />Also in LA</span>
              </div>
              <div className="absolute right-3.5 top-3.5 z-10 rounded-full border border-white bg-white/85 px-3.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur">Hover a dot to see who they are</div>
            </div>

            {/* side column */}
            <div className="grid content-start gap-5">
              <div className={card}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className={`${serif} text-2xl font-medium`}>Top Matches</h2>
                  <span className={label}>Score</span>
                </div>
                {/* 5 rows (57px each) are visible; scroll for the rest */}
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="All matches, scrollable"
                  className="max-h-[285px] overflow-y-auto overscroll-contain rounded-xl pr-1 outline-none focus-visible:ring-2 focus-visible:ring-[#1E2B44]/40"
                >
                  {matches.map((m) => {
                    const state = stateOf(m.id)
                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setHoverId(m.id)}
                        onMouseLeave={() => setHoverId(null)}
                        className={`flex h-[57px] items-center gap-3 border-t border-[#E3ECF5] px-1 transition-colors ${hoverId === m.id ? 'bg-[#F4F7FB]' : ''}`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ backgroundColor: scoreColor(m.match ?? 0) }}>
                          {m.match}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{m.name}</div>
                          <div className="text-xs text-[#4A5A75]">{m.shared.length} shared interests</div>
                        </div>
                        <button type="button" disabled={state !== 'none'} onClick={() => connect(m.id)} className={`px-3 py-1.5 text-xs ${btnLight}`}>
                          {state === 'connected' ? 'Connected' : state === 'sent' ? 'Sent' : 'Connect'}
                        </button>
                      </div>
                    )
                  })}
                </div>
                {matches.length > 5 && <p className="mt-2 text-center text-[11px] text-[#4A5A75]">Scroll for {matches.length - 5} more</p>}
              </div>

              <div className={card}>
                <div className={label}>Matched on Your Interests</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {MY_INTERESTS.map((i) => (
                    <span key={i} className={pillShared}>
                      {titleCase(i)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* popular interests + meetup ideas */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className={card}>
              <h2 className={`${serif} text-2xl font-medium`}>Popular in Los Angeles</h2>
              <p className="mb-5 mt-1 text-sm text-[#4A5A75]">What interns in your city are into. Yours are in navy.</p>
              <div className="grid gap-3.5">
                {popular.map(([interest, count]) => {
                  const mine = MY_INTERESTS.includes(interest)
                  return (
                    <div key={interest}>
                      <div className="mb-1 flex justify-between text-sm font-semibold">
                        <span className={mine ? 'text-[#1E2B44]' : 'text-[#4A5A75]'}>{titleCase(interest)}</span>
                        <span className="text-xs font-medium text-[#4A5A75]">{count} interns</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#E3ECF5]">
                        <div className={`h-full rounded-full ${mine ? 'bg-[#B9D6F0]' : 'bg-[#D8E2EB]'}`} style={{ width: `${(count / popularMax) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={card}>
              <h2 className={`${serif} text-2xl font-medium`}>Ways to Meet Up</h2>
              <p className="mb-5 mt-1 text-sm text-[#4A5A75]">Ideas based on what you share with your matches. Sample ideas.</p>
              <div className="grid gap-3">
                {meetups.map((m) => (
                  // fixed first column so every idea title starts at the same x position
                  <div key={m.interest} className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-[#EADFD0] bg-[#e6eff7] p-4">
                    <span className={`${pillShared} block truncate text-center`}>{titleCase(m.interest)}</span>
                    <div className="min-w-0">
                      <div className={`${serif} text-[17px] font-medium leading-snug`}>{titleCase(m.idea)}</div>
                      <div className="text-xs text-[#4A5A75]">
                        {joinNames(m.people.slice(0, 3).map((p) => p.name.split(' ')[0]))}
                        {m.people.length > 3 ? ` +${m.people.length - 3}` : ''} could join
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#4A5A75]">© 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <p className={`pointer-events-auto rounded-full px-5 py-3 text-[13px] font-semibold text-white shadow-lg ${toast.tone === 'ok' ? 'bg-[#1E2B44]' : 'bg-[#8A3A2A]'}`}>
            {toast.text}
          </p>
        )}
      </div>
    </div>
  )
}