'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../components/AppNavbar'
import { supabase } from '../../lib/supabase'

type Intern = {
  id: string
  name: string
  initials: string
  role: string
  school: string
  interests: string[]
  match?: number // 0-100. Only set for interns who matched with the user.
}

// What /api/intern-matches sends for each person. Only the email and the match score are used from it:
// the id and interests come straight from users_table, so they are always the real ones.
type ApiIntern = { email?: string; match?: number | null; role?: string; school?: string }

type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
  student_email: string | null
  company_name: string | null
  user_interests: string[] | null
}

// Turns the API's list into real people from Supabase. Anyone the API lists without an email (its built-in
// demo people) is dropped, and so is anyone who hasn't picked interests yet.
async function loadInterns(raw: ApiIntern[], me: string | null): Promise<Intern[]> {
  const byEmail = new Map<string, ApiIntern>()
  raw.forEach((r) => r.email && byEmail.set(r.email.toLowerCase(), r))
  const emails = [...byEmail.values()].map((r) => r.email as string)
  if (emails.length === 0) return []

  const { data } = await supabase
    .from('users_table')
    .select('id, first_name, last_name, student_email, company_name, user_interests')
    .in('student_email', emails)

  return ((data ?? []) as UserRow[]).flatMap((u) => {
    const api = byEmail.get((u.student_email ?? '').toLowerCase())
    const interests = Array.isArray(u.user_interests) ? u.user_interests.map(String).filter(Boolean) : []
    if (!api || u.id === me || interests.length === 0) return []
    const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || (u.student_email ?? 'Intern').split('@')[0]
    const school = api.school && api.school !== 'University Student' ? api.school : ''
    return [
      {
        id: u.id, // users_table.id is also the person's login id, which is what connections use
        name,
        initials: name.split(' ').map((w) => w[0]).join('').slice(0, 2),
        role: u.company_name ? `Intern at ${u.company_name}` : api.role ?? 'Summer intern',
        school,
        interests,
        match: api.match == null || Number.isNaN(Number(api.match)) ? undefined : Number(api.match),
      },
    ]
  })
}

// sample meetup ideas by interest (replace with real events later)
const MEETUP_IDEAS: Record<string, string> = {
  Hiking: 'Sunrise hike at Griffith Park',
  Cooking: 'Potluck dinner in Silver Lake',
  Film: 'Outdoor movie night downtown',
  Photography: 'Golden hour photo walk',
  Basketball: 'Pickup game at the park',
  'Live music': 'Live music night in Echo Park',
  Running: 'Sunrise run along Venice Beach',
  Yoga: 'Rooftop yoga in Downtown LA',
  Soccer: 'Pickup soccer at Griffith Park',
  Gaming: 'Arcade and board game night in Koreatown',
  Reading: 'Book swap at a Highland Park café',
  Travel: 'Weekend trip to Joshua Tree',
  Coffee: 'Coffee crawl through Silver Lake',
  Surfing: 'Early surf session in Santa Monica',
  Climbing: 'Bouldering night at a climbing gym',
  Dance: 'Salsa night in Hollywood',
  Art: 'Gallery hop in the Arts District',
  Volunteering: 'Volunteer day at a local food bank',
  Music: 'Live music night in Echo Park',
}
const IDEAS_BY_LOWER: Record<string, string> = Object.fromEntries(Object.entries(MEETUP_IDEAS).map(([k, v]) => [k.toLowerCase(), v]))

const serif = 'font-[family-name:var(--font-serif)]'
const label = 'text-[13px] font-semibold text-[#4A5A75]'
const card = 'rounded-[28px] border border-white bg-white/80 p-6 shadow-[0_20px_50px_-30px_rgba(30,43,68,0.35)]'
const pill = 'rounded-full border border-[#D5DFEA] bg-white px-3 py-1 text-xs font-medium text-[#1E2B44]'
const pillShared = 'rounded-full border border-[#86abcc] bg-[#86abcc] px-3 py-1 text-xs font-medium text-white'
const btnDark = 'rounded-full bg-[#1E2B44] text-sm font-semibold text-white transition hover:bg-[#2F4161] disabled:cursor-default disabled:bg-[#9CB5CE]'
const btnLight = 'rounded-full border border-[#D5DFEA] bg-white text-sm font-semibold text-[#1E2B44] transition hover:bg-[#F7F9FB] disabled:cursor-default disabled:text-[#4A5A75]'

// Match color: light to dark through #d5dfea, #c7d9ed and #a9c2de, spread across the top matches
// (the weakest of them is the lightest, the strongest is the darkest). All three keep dark text readable.
const GRADIENT = [
  [213, 223, 234], // #d5dfea
  [199, 217, 237], // #c7d9ed
  [169, 194, 222], // #a9c2de
]
function scoreStyle(score: number, low: number, high: number) {
  const t = high > low ? Math.min(1, Math.max(0, (score - low) / (high - low))) : 1
  const seg = t * (GRADIENT.length - 1)
  const i = Math.min(GRADIENT.length - 2, Math.floor(seg))
  const f = seg - i
  const [r, g, b] = GRADIENT[i].map((c, k) => Math.round(c + (GRADIENT[i + 1][k] - c) * f))
  return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: '#1E2B44' }
}

// the small dots for everyone who isn't a top match: pale, but a little darker than before
const DOT_FILL = '#D3DEEB'
const DOT_RING = '#BBCADD'

const joinNames = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] ?? '')

// First letter capital, the rest as written: "live music" becomes "Live music".
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Names start every word with a capital letter, even if they were typed in lowercase.
const nameCase = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

/* ---------- map layout ----------
   The 10 best matches sit on a rectangle around "You": a row across the top, a row across the bottom and
   a column on each side, ranked clockwise from the top middle. Everyone else is a small, pale dot scattered
   around it (and, if the outside fills up, in the gaps inside it). Positions are the same on every visit.
   Units: the map is 16:10, so it is 100 wide and 62.5 tall in the same units. */

const MAP_H = 62.5
const CX = 50
const CY = MAP_H / 2
const R_YOU = 6 // the "You" circle
const R_BIG = 4.6 // a top-10 match (big circle, 56px)
const R_SMALL = 1.6 // everyone else (small dot)
const RECT_W = 33 // the rectangle reaches this far left and right of "You"
const RECT_H = 18 // ...and this far up and down
const GAP_SMALL = 3 // clear space wanted around a small dot
const TRIES = 200
const MAX_BIG = 10

// the legend (bottom left) and the hint chip (top right) sit on top of the map, so keep dots out of them
const KEEP_OUT = [
  { x0: 0, y0: MAP_H - 7, x1: 52, y1: MAP_H },
  { x0: 58, y0: 0, x1: 100, y1: 6.5 },
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

// n spots around the rectangle, in rank order: rank 1 at the top middle, then clockwise
function rectangleSpots(n: number) {
  if (n === 0) return []
  const top = CY - RECT_H
  const bottom = CY + RECT_H
  // a row of evenly spaced points, with the first and last on the rectangle's corners
  const row = (count: number, y: number) =>
    Array.from({ length: count }, (_, i) => ({ x: count === 1 ? CX : CX - RECT_W + (2 * RECT_W * i) / (count - 1), y }))
  // a column of points between the corners
  const col = (count: number, x: number) =>
    Array.from({ length: count }, (_, j) => ({ x, y: top + (2 * RECT_H * (j + 1)) / (count + 1) }))

  let ring: { x: number; y: number }[]
  let startAt: number
  if (n < 4) {
    // too few for a full rectangle: one row above "You"
    ring = row(n, top)
    startAt = Math.floor((n - 1) / 2)
  } else {
    const nTop = Math.max(2, Math.round((n / 2) * (RECT_W / (RECT_W + RECT_H))))
    const nSide = Math.floor((n - 2 * nTop) / 2)
    const nBottom = n - nTop - 2 * nSide
    ring = [
      ...row(nTop, top), // left to right
      ...col(nSide, CX + RECT_W), // top to bottom
      ...row(nBottom, bottom).reverse(), // right to left
      ...col(nSide, CX - RECT_W).reverse(), // bottom to top
    ]
    startAt = Math.floor((nTop - 1) / 2)
  }
  return Array.from({ length: n }, (_, k) => ring[(startAt + k) % n])
}

function layoutInterns(list: Intern[]): Record<string, { x: number; y: number }> {
  const rand = mulberry32(hashString(list.map((i) => i.id).join('|')))
  const big = bigIdsOf(list)
  const bigOrder = list.filter((i) => big.has(i.id)).sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
  const rest = list.filter((i) => !big.has(i.id))

  const placed: { x: number; y: number; r: number }[] = []
  const out: Record<string, { x: number; y: number }> = {}
  const save = (id: string, x: number, y: number, r: number) => {
    placed.push({ x, y, r })
    out[id] = { x: round2(x), y: round2((y / MAP_H) * 100) } // y becomes a % of the height
  }

  // big circles: the rectangle, best match first
  const spots = rectangleSpots(bigOrder.length)
  bigOrder.forEach((intern, k) => save(intern.id, spots[k].x, spots[k].y, R_BIG))

  // free space between a small dot at (x, y) and "You" plus everything placed so far
  const clearAt = (x: number, y: number) => {
    let c = Math.hypot(x - CX, y - CY) - (R_YOU + R_SMALL)
    for (const p of placed) c = Math.min(c, Math.hypot(x - p.x, y - p.y) - (p.r + R_SMALL))
    return c
  }
  // the area the rectangle and its circles use up
  const insideRing = (x: number, y: number) => Math.abs(x - CX) < RECT_W + R_BIG + 3 && Math.abs(y - CY) < RECT_H + R_BIG + 3
  // distance from a point to the line running from "You" to a big circle
  const distToLine = (x: number, y: number, b: { x: number; y: number }) => {
    const dx = b.x - CX
    const dy = b.y - CY
    const t = Math.max(0, Math.min(1, ((x - CX) * dx + (y - CY) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(x - (CX + t * dx), y - (CY + t * dy))
  }

  // small dots: scattered at random around the rectangle. If the outside fills up, the later tries also use
  // the gaps inside it (staying off the lines to "You"). Nothing is ever placed on top of anything else.
  for (const intern of rest) {
    let best: { x: number; y: number } | null = null
    let bestClear = -Infinity
    for (let n = 0; n < TRIES * 2; n++) {
      const outsideOnly = n < TRIES
      const x = 3 + rand() * 94
      const y = 3 + rand() * (MAP_H - 6)
      if (KEEP_OUT.some((b) => hitsRect(x, y, R_SMALL + 1, b))) continue
      if (outsideOnly ? insideRing(x, y) : spots.some((b) => distToLine(x, y, b) < 3.5)) continue
      const c = clearAt(x, y)
      if (c >= GAP_SMALL) {
        best = { x, y }
        break
      }
      if (c > bestClear) {
        bestClear = c
        best = { x, y }
      }
    }
    if (!best) best = { x: 3 + rand() * 94, y: 3 } // only if the whole map is completely full
    save(intern.id, best.x, best.y, R_SMALL)
  }
  return out
}

type Placed = Intern & { x: number; y: number; shared: string[]; big: boolean }
type RequestState = 'none' | 'sent' | 'connected'

function Tooltip({
  intern,
  state,
  badge,
  onConnect,
}: {
  intern: Placed
  state: RequestState
  badge: React.CSSProperties
  onConnect: (id: string) => void
}) {
  const matched = intern.match !== undefined
  return (
    <div className="w-[260px] rounded-[22px] border border-white bg-white p-4 text-left text-[#1E2B44] shadow-[0_30px_60px_-24px_rgba(30,43,68,0.5)]">
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold"
          style={matched ? badge : { backgroundColor: DOT_FILL, color: '#1E2B44' }}
        >
          {matched ? intern.match : intern.initials}
        </span>
        <div className="min-w-0">
          <div className={`${serif} text-[18px] font-medium leading-tight`}>{intern.name}</div>
          <div className="text-xs text-[#829fcf]">
            {cap(intern.role)}
            {intern.school ? ` · ${intern.school}` : ''}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {intern.interests.map((i) => (
          <span key={i} className={matched && intern.shared.includes(i) ? pillShared : pill}>
            {cap(i)}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs leading-snug text-[#829fcf]">
        {matched ? `Subtle score ${intern.match}. You both like ${joinNames(intern.shared.map(cap))}.` : 'Not matched yet.'}
      </p>

      <button type="button" disabled={state !== 'none'} onClick={() => onConnect(intern.id)} className={`mt-3.5 w-full py-2.5 ${state === 'none' ? btnDark : btnLight}`}>
        {state === 'connected' ? 'Connected' : state === 'sent' ? 'Request sent' : `Connect with ${intern.name.split(' ')[0]}`}
      </button>
    </div>
  )
}

export default function MatchesPage() {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [requested, setRequested] = useState<Set<string>>(new Set()) // requests I sent that are still waiting
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [firstName, setFirstName] = useState('')
  const [matchesOnly, setMatchesOnly] = useState(false)
  const [myInterests, setMyInterests] = useState<string[]>([])
  const [internList, setInternList] = useState<Intern[]>([]) // only real data from /api/intern-matches
  const [loaded, setLoaded] = useState(false)
  const [needsQuiz, setNeedsQuiz] = useState(false) // true when you haven't picked interests yet

  const flash = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ tone, text })
    window.setTimeout(() => setToast(null), 3500)
  }

  // Load who you are, your interests and your matches, all from Supabase.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const meta = data.user?.user_metadata
      const email = data.user?.email ?? ''
      setFirstName(meta?.first_name ?? email.split('@')[0] ?? '')

      const me = data.user?.id ?? null
      if (data.user && me) {
        setUserId(me)

        // remember who the user has already connected with or asked
        const { data: rows } = await supabase
          .from('connections')
          .select('requester_id, addressee_id, status')
          .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
        const asked = new Set<string>()
        const linked = new Set<string>()
        ;(rows ?? []).forEach((r) => {
          const other = r.requester_id === me ? r.addressee_id : r.requester_id
          if (r.status === 'accepted') linked.add(other)
          // only requests I sent count as "sent". If they asked me first, Connect accepts their request.
          else if (r.requester_id === me) asked.add(other)
        })
        setRequested(asked)
        setConnectedIds(linked)
      }

      // your interests: from your row in users_table, or the answers saved in this browser
      let mine: string[] = []
      if (me) {
        const { data: row } = await supabase.from('users_table').select('user_interests').eq('id', me).maybeSingle()
        if (Array.isArray(row?.user_interests)) mine = row.user_interests.map(String).filter(Boolean)
      }
      if (mine.length === 0) {
        try {
          const parsed = JSON.parse(localStorage.getItem('subtle-quiz-v1') ?? '{}')
          if (Array.isArray(parsed.interests)) mine = parsed.interests.map(String).filter(Boolean)
        } catch {}
      }
      setMyInterests(mine)

      // no interests means nothing to match on. Skip the API so it can't fall back to made-up interests.
      if (mine.length === 0) {
        setNeedsQuiz(true)
        setLoaded(true)
        return
      }

      try {
        const params = new URLSearchParams({ interests: mine.join(',') })
        if (email) params.set('email', email)
        const res = await fetch(`/api/intern-matches?${params.toString()}`)
        if (res.ok) {
          const json = await res.json()
          setInternList(await loadInterns(Array.isArray(json.interns) ? json.interns : [], me))
        }
      } catch {
        // network error: the page just shows no matches
      }
      setLoaded(true)
    })
  }, [])

  // your interests in lowercase, so "Live Music" and "Live music" count as the same thing
  const mineLower = useMemo(() => new Set(myInterests.map((x) => x.toLowerCase())), [myInterests])

  // only people who share at least one interest with you
  const eligible = useMemo(() => internList.filter((i) => i.interests.some((x) => mineLower.has(x.toLowerCase()))), [internList, mineLower])

  // positions are worked out once for everyone, so dots stay put when you switch filters
  const positions = useMemo(() => layoutInterns(eligible), [eligible])
  // the 10 best matches get the big circles
  const bigIds = useMemo(() => bigIdsOf(eligible), [eligible])

  const interns: Placed[] = useMemo(
    () =>
      eligible.map((i) => ({
        ...i,
        name: nameCase(i.name), // every name shown on the page starts with capitals
        initials: i.initials.toUpperCase(),
        ...(positions[i.id] ?? { x: 50, y: 50 }),
        shared: i.interests.filter((x) => mineLower.has(x.toLowerCase())),
        big: bigIds.has(i.id),
      })),
    [eligible, mineLower, positions, bigIds],
  )
  const matches = interns.filter((i) => i.match !== undefined).sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
  const topMatches = matches.filter((m) => m.big)
  const visible = matchesOnly ? topMatches : interns

  // the gradient runs from the weakest to the strongest of the top matches
  const scores = topMatches.map((m) => m.match ?? 0)
  const low = scores.length ? Math.min(...scores) : 0
  const high = scores.length ? Math.max(...scores) : 100
  const styleFor = (score: number) => scoreStyle(score, low, high)

  const stateOf = (id: string): RequestState => (connectedIds.has(id) ? 'connected' : requested.has(id) ? 'sent' : 'none')

  // how common each interest is among all interns in the city
  const popular = useMemo(() => {
    const counts = new Map<string, number>()
    interns.forEach((i) => i.interests.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8)
  }, [interns])
  const popularMax = popular[0]?.[1] ?? 1

  // meetup ideas: your own interests first, then whatever is popular in the city, so the card is always full
  const meetups = useMemo(() => {
    const ideaOf = (interest: string) => IDEAS_BY_LOWER[interest.toLowerCase()]
    const mine = myInterests.filter((x) => ideaOf(x))
    const city = popular.map(([i]) => i).filter((i) => ideaOf(i) && !mineLower.has(i.toLowerCase()))
    // people who like it, matches first
    const peopleFor = (interest: string) => {
      const all = interns.filter((i) => i.interests.some((x) => x.toLowerCase() === interest.toLowerCase()))
      return [...all.filter((i) => i.match !== undefined), ...all.filter((i) => i.match === undefined)]
    }
    const list = [...mine.map((interest) => ({ interest, mine: true })), ...city.map((interest) => ({ interest, mine: false }))]
      .map((m) => ({ ...m, idea: ideaOf(m.interest), people: peopleFor(m.interest) }))
      .filter((m) => m.people.length > 0)
    return list.sort((a, b) => Number(b.mine) - Number(a.mine) || b.people.length - a.people.length).slice(0, 4)
  }, [interns, myInterests, mineLower, popular])

  // Send a connection request. It is saved in the connections table, so it shows up under "Sent" on your
  // profile and under "Requests" on theirs. If they had already asked you, this accepts their request instead.
  // Needs 02-connections.sql (the request_connection function) to be run in Supabase.
  const connect = async (id: string) => {
    const intern = interns.find((x) => x.id === id)
    if (!intern || stateOf(id) !== 'none') return
    const first = intern.name.split(' ')[0]

    if (!userId) return flash('Log in to send connection requests.', 'err')
    if (intern.id === userId) return

    // mark it right away so a double-click can't send two requests
    setRequested((prev) => new Set(prev).add(id))

    const { data: status, error } = await supabase.rpc('request_connection', {
      other_user: intern.id,
      p_score: intern.match ?? null,
    })

    if (error) {
      console.error('Could not send the connection request', error)
      // undo the "sent" state so the button works again
      setRequested((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      const reason =
        error.code === '23503'
          ? "That person doesn't have a login yet, so they can't get requests."
          : `Couldn't send the request: ${error.message}${error.code ? ` (${error.code})` : ''}`
      return flash(reason, 'err')
    }

    if (status === 'accepted') {
      // they had already asked you, so this completed the connection
      setRequested((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setConnectedIds((prev) => new Set(prev).add(id))
      return flash(`You're now connected with ${first}.`)
    }
    flash(`Connection request sent to ${first}.`)
  }

  return (
    // [&_*]:!normal-case shows every piece of text exactly as it is written here, even if a global
    // stylesheet lowercases everything
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_92%_100%,rgba(246,214,180,0.85),transparent_42%),linear-gradient(180deg,#c3d8ec_0%,#dde8f3_38%,#f1eeea_72%,#f7e8d8_100%)] text-[#1E2B44] [&_*]:!normal-case">
      <AppNavbar firstName={firstName} />

      {/* pt-32 leaves room for the fixed navbar */}
      <div className="relative mx-auto flex max-w-[1240px] flex-col gap-7 px-3 pb-10 pt-32 md:px-4">
        {/* heading sits above the white box, like the profile page */}
        <header className="animate-[fadeIn_.5s_ease-out] md:pl-10">
          <h1 className={`${serif} text-5xl font-medium tracking-[-0.02em] md:text-6xl`}>Matches</h1>
          <p className="mt-2 text-[17px] text-[#4A5A75]">Interns living in Los Angeles this summer who share your interests.</p>
        </header>

        <div className="min-w-0 rounded-[40px] border border-white bg-white/65 p-5 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-7">
          {/* filters on the left, how many matches are shown on the right */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMatchesOnly(false)} aria-pressed={!matchesOnly} className={`px-4 py-2 ${!matchesOnly ? btnDark : btnLight}`}>
                Everyone
              </button>
              <button type="button" onClick={() => setMatchesOnly(true)} aria-pressed={matchesOnly} className={`px-4 py-2 ${matchesOnly ? btnDark : btnLight}`}>
                Matches only
              </button>
            </div>
            <span className="text-xs text-[#4A5A75]">
              {topMatches.length} of {matches.length} matches on the map
            </span>
          </div>

          {/* map + side column. Every column is minmax(0,1fr) so nothing can be pushed past the white box:
              on narrow screens the map scrolls sideways inside its own frame instead. */}
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 overflow-x-auto rounded-[28px]">
              <div className="relative aspect-[16/10] min-w-[640px] overflow-hidden rounded-[28px] border border-white bg-[#F5F8FC] bg-[linear-gradient(#E3ECF5_1px,transparent_1px),linear-gradient(90deg,#E3ECF5_1px,transparent_1px)] bg-[length:48px_48px] shadow-[inset_0_0_0_1px_rgba(213,223,234,0.8)]">
                {/* lines from you to each of the top 10 matches */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {topMatches.map((m) => (
                    <line
                      key={m.id}
                      x1="50"
                      y1="50"
                      x2={m.x}
                      y2={m.y}
                      stroke="#A9C2DE"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      strokeWidth={hoverId === m.id ? 3 : 1.5}
                      strokeOpacity={hoverId === m.id ? 0.85 : 0.35}
                      style={{ transition: 'stroke-opacity .2s, stroke-width .2s' }}
                    />
                  ))}
                </svg>

                {/* you */}
                <div className="absolute left-1/2 top-1/2 z-20 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#1E2B44] text-sm font-bold text-white">
                  <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#1E2B44]/60" />
                  <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#1E2B44]/60" style={{ animationDelay: '1.4s' }} />
                  You
                </div>

                {!loaded && <p className="absolute inset-x-0 top-[calc(50%+56px)] text-center text-sm text-[#4A5A75]">Loading matches…</p>}
                {loaded && needsQuiz && (
                  <p className="absolute inset-x-0 top-[calc(50%+56px)] px-6 text-center text-sm text-[#4A5A75]">
                    Pick your interests in the{' '}
                    <Link href="/questionnaire" className="font-semibold text-[#1E2B44] underline underline-offset-2">
                      questionnaire
                    </Link>{' '}
                    to see your matches.
                  </p>
                )}
                {loaded && !needsQuiz && eligible.length === 0 && (
                  <p className="absolute inset-x-0 top-[calc(50%+56px)] text-center text-sm text-[#4A5A75]">No matches yet. Check back soon.</p>
                )}

                {/* intern dots: big circles for the top 10, small pale dots for everyone else */}
                {loaded &&
                  visible.map((i) => {
                    const matched = i.match !== undefined
                    const active = hoverId === i.id
                    const up = i.y > 52
                    const horizontal = i.x < 28 ? 'left-[-6px]' : i.x > 72 ? 'right-[-6px]' : 'left-1/2 -translate-x-1/2'
                    const badge = styleFor(i.match ?? 0)
                    return (
                      <div
                        key={i.id}
                        role="group"
                        tabIndex={0}
                        aria-label={`${i.name}, ${cap(i.role)}${matched ? `, Subtle score ${i.match}` : ''}`}
                        onMouseEnter={() => setHoverId(i.id)}
                        onMouseLeave={() => setHoverId(null)}
                        onFocus={() => setHoverId(i.id)}
                        onBlur={() => setHoverId(null)}
                        className={`group absolute -translate-x-1/2 -translate-y-1/2 outline-none ${active ? 'z-30' : 'z-10'}`}
                        style={{ left: `${i.x}%`, top: `${i.y}%` }}
                      >
                        {/* flat circles: no shadow */}
                        <span
                          className={`grid place-items-center rounded-full font-bold transition duration-200 group-hover:scale-125 group-focus:scale-125 ${
                            i.big
                              ? 'h-[56px] w-[56px] border-[3px] border-white text-sm ring-1 ring-[#BFD0E2]'
                              : 'h-[16px] w-[16px] border-2 border-white group-hover:!bg-[#A9C2DE]'
                          } ${active ? 'scale-125' : ''}`}
                          style={i.big ? badge : { backgroundColor: DOT_FILL, boxShadow: `0 0 0 1px ${DOT_RING}` }}
                        >
                          {i.big ? i.initials : null}
                        </span>

                        {/* padding keeps the card attached to the dot so hover never drops */}
                        <div
                          className={`invisible absolute z-40 opacity-0 transition-opacity duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${horizontal} ${
                            up ? 'bottom-full pb-3' : 'top-full pt-3'
                          } ${active ? '!visible !opacity-100' : ''}`}
                        >
                          <Tooltip intern={i} state={stateOf(i.id)} badge={badge} onConnect={connect} />
                        </div>
                      </div>
                    )
                  })}

                {/* legend */}
                <div className="absolute bottom-3.5 left-3.5 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-full border border-white bg-white/85 px-4 py-2 text-[11px] font-semibold shadow-sm backdrop-blur">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#1E2B44]" />You</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-6 rounded-full bg-gradient-to-r from-[#d5dfea] via-[#c7d9ed] to-[#a9c2de] ring-1 ring-[#BFD0E2]" />
                    Top 10 (darker = stronger)
                  </span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: DOT_FILL, boxShadow: `0 0 0 1px ${DOT_RING}` }} />Also in LA</span>
                </div>
                <div className="absolute right-3.5 top-3.5 z-10 rounded-full border border-white bg-white/85 px-3.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur">Hover a dot to see who they are</div>
              </div>
            </div>

            {/* side column */}
            <div className="grid min-w-0 content-start gap-5">
              <div className={card}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className={`${serif} text-2xl font-medium`}>Top matches</h2>
                  <span className={label}>Score</span>
                </div>
                {/* 5 rows (57px each) are visible; scroll for the rest */}
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="All matches, scrollable"
                  className="max-h-[285px] overflow-y-auto overscroll-contain rounded-xl pr-1 outline-none focus-visible:ring-2 focus-visible:ring-[#1E2B44]/40"
                >
                  {loaded && matches.length === 0 && <p className="border-t border-[#E3ECF5] py-4 text-sm text-[#4A5A75]">No matches yet.</p>}
                  {matches.map((m) => {
                    const state = stateOf(m.id)
                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setHoverId(m.id)}
                        onMouseLeave={() => setHoverId(null)}
                        className={`flex h-[57px] items-center gap-3 border-t border-[#E3ECF5] px-1 transition-colors ${hoverId === m.id ? 'bg-[#F4F7FB]' : ''}`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={styleFor(m.match ?? 0)}>
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
                <div className={label}>Matched on your interests</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {myInterests.map((i) => (
                    <span key={i} className={pillShared}>
                      {cap(i)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* popular interests + meetup ideas */}
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
            <div className={card}>
              <h2 className={`${serif} text-2xl font-medium`}>Popular in Los Angeles</h2>
              <p className="mb-5 mt-1 text-sm text-[#4A5A75]">What interns in your city are into. Yours are in navy.</p>
              <div className="grid gap-3.5">
                {popular.map(([interest, count]) => {
                  const mine = mineLower.has(interest.toLowerCase())
                  return (
                    <div key={interest}>
                      <div className="mb-1 flex justify-between text-sm font-semibold">
                        <span className={mine ? 'text-[#1E2B44]' : 'text-[#4A5A75]'}>{cap(interest)}</span>
                        <span className="text-xs font-medium text-[#4A5A75]">{count} interns</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#E3ECF5]">
                        <div className={`h-full rounded-full ${mine ? 'bg-[#A9C2DE]' : 'bg-[#D8E2EB]'}`} style={{ width: `${(count / popularMax) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={card}>
              <h2 className={`${serif} text-2xl font-medium`}>Ways to meet up</h2>
              <p className="mb-5 mt-1 text-sm text-[#4A5A75]">Ideas based on what you and the interns around you are into. Sample ideas.</p>
              <div className="grid gap-3">
                {meetups.map((m) => (
                  // fixed first column so every idea title starts at the same x position
                  <div key={m.interest} className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-[#EADFD0] bg-[#e6eff7] p-4">
                    <span className={`${pillShared} block truncate text-center`}>{cap(m.interest)}</span>
                    <div className="min-w-0">
                      <div className={`${serif} text-[17px] font-medium leading-snug`}>{m.idea}</div>
                      <div className="text-xs text-[#4A5A75]">
                        {joinNames(m.people.slice(0, 3).map((p) => p.name.split(' ')[0]))}
                        {m.people.length > 3 ? ` +${m.people.length - 3}` : ''} could join
                      </div>
                    </div>
                  </div>
                ))}
                {loaded && meetups.length === 0 && <p className="text-sm text-[#4A5A75]">Ideas will show up here once there are matches.</p>}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#4A5A75]">© 2026 Subtle Technologies, Inc. All rights reserved.</p>
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