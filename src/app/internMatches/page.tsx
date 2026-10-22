'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../components/AppNavbar'
import { startConversation } from '../../components/messages/store'
import { supabase } from '../../lib/supabase'

//Backend: replace these 
const MY_INTERESTS = ['Hiking', 'Cooking', 'Film', 'Photography', 'Basketball', 'Live music']

type Intern = {
  id: string
  name: string
  initials: string
  role: string
  school: string
  interests: string[]
  angle: number // degrees around the "You" dot
  radius: number // 0 to 0.46, distance from the center
  match?: number // 0-100. Only set for interns who matched with the user.
}

const INTERNS: Intern[] = [
  //backend Replace with user data
  { id: 'aisha', name: 'Aisha Rahman', initials: 'AR', role: 'Product design intern', school: 'UCLA', interests: ['Hiking', 'Cooking', 'Film', 'Photography', 'Pottery'], angle: -60, radius: 0.3, match: 96 },
  { id: 'leo', name: 'Leo Martinez', initials: 'LM', role: 'Software intern', school: 'USC', interests: ['Basketball', 'Live music', 'Cooking', 'Film', 'Gaming'], angle: 20, radius: 0.34, match: 92 },
  { id: 'priya', name: 'Priya Shah', initials: 'PS', role: 'Data intern', school: 'Stanford', interests: ['Hiking', 'Photography', 'Live music', 'Chess'], angle: 110, radius: 0.28, match: 89 },
  { id: 'marcus', name: 'Marcus Tran', initials: 'MT', role: 'Marketing intern', school: 'UC Berkeley', interests: ['Cooking', 'Hiking', 'Basketball', 'Soccer'], angle: 165, radius: 0.36, match: 86 },
  { id: 'sofia', name: 'Sofia Lopez', initials: 'SL', role: 'Finance intern', school: 'NYU', interests: ['Film', 'Live music', 'Yoga', 'Travel'], angle: 230, radius: 0.32, match: 82 },
  { id: 'daniel', name: 'Daniel Kim', initials: 'DK', role: 'Research intern', school: 'Michigan', interests: ['Photography', 'Basketball', 'Reading', 'Chess'], angle: 300, radius: 0.38, match: 78 },
  // also in the city, not matched
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

// Round so the server and the browser always produce identical numbers.
const round2 = (n: number) => Math.round(n * 100) / 100

// Spread the interns across a wide rectangle (x uses the full width, y a little less)
const polar = (angle: number, radius: number) => ({
  x: round2(50 + radius * 100 * Math.cos((angle * Math.PI) / 180)),
  y: round2(50 + radius * 100 * 0.86 * Math.sin((angle * Math.PI) / 180)),
})

const joinNames = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] ?? '')

type Placed = Intern & { x: number; y: number; shared: string[] }

function Tooltip({
  intern,
  contacted,
  onContact,
}: {
  intern: Placed
  contacted: boolean
  onContact: (id: string) => void
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
            {intern.role} · {intern.school}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {intern.interests.map((i) => (
          <span key={i} className={matched && intern.shared.includes(i) ? pillShared : pill}>
            {i}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs leading-snug text-[#4A5A75]">
        {matched ? `Subtle score ${intern.match}. You both like ${joinNames(intern.shared)}.` : 'Not matched yet.'}
      </p>

      <button type="button" disabled={contacted} onClick={() => onContact(intern.id)} className={`mt-3.5 w-full py-2.5 ${contacted ? btnLight : btnDark}`}>
        {contacted ? 'Request sent' : `Contact ${intern.name.split(' ')[0]}`}
      </button>
    </div>
  )
}

export default function MatchesPage() {
  const router = useRouter()
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [contacted, setContacted] = useState<Set<string>>(new Set())
  const [firstName, setFirstName] = useState('')
  const [matchesOnly, setMatchesOnly] = useState(false)
  const [myInterests, setMyInterests] = useState<string[]>(MY_INTERESTS)
  const [internList, setInternList] = useState<Intern[]>(INTERNS)

  // AppNavbar takes the user's first name; also fetch live intern matches from /api/intern-matches
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const meta = data.user?.user_metadata
      const email = data.user?.email ?? ''
      setFirstName(meta?.first_name ?? email.split('@')[0] ?? '')

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

  const interns: Placed[] = useMemo(
    () =>
      internList.map((i) => ({
        ...i,
        ...polar(i.angle, i.radius),
        shared: i.interests.filter((x) => myInterests.includes(x)),
      })),
    [internList, myInterests],
  )
  const matches = interns.filter((i) => i.match !== undefined).sort((a, b) => (b.match ?? 0) - (a.match ?? 0))
  const visible = matchesOnly ? matches : interns

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

const contact = async (id: string) => {
  const intern = interns.find((x) => x.id === id)
  if (!intern || contacted.has(id)) return

  // mark it right away so a double-click can't send two requests
  setContacted((prev) => new Set(prev).add(id))

  const first = intern.name.split(' ')[0]
  const sharedText = intern.shared.length ? ` I saw we both enjoy ${joinNames(intern.shared)}!` : ''

  try {
    const convId = await startConversation(
      {
        id: `intern-${intern.id}`,
        title: `${intern.role} · ${intern.school}`,
        score: intern.match,
        hostName: intern.name,
      },
      `Hi ${first}! I'm also interning in the city this summer.${sharedText} Would love to connect or look for housing together!`,
    )
    router.push(`/messages?c=${convId}`)
  } catch (err) {
    console.error('Could not start the conversation', err)
    // undo the "sent" state so the button works again
    setContacted((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }
}

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_92%_100%,rgba(246,214,180,0.85),transparent_42%),linear-gradient(180deg,#c3d8ec_0%,#dde8f3_38%,#f1eeea_72%,#f7e8d8_100%)] text-[#1E2B44]">
      <AppNavbar firstName={firstName} />

      {/* pt-28 leaves room for the fixed navbar */}
      <div className="relative mx-auto max-w-[1240px] px-3 pb-10 pt-28 md:px-4">
        <div className="rounded-[40px] border border-white bg-white/65 p-6 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-9">
          {/* header */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className={label}>Ranked for you</div>
              <h1 className={`${serif} mt-1.5 text-[44px] font-medium leading-[1.02] tracking-[-0.02em] md:text-[56px]`}>Your matches</h1>
              <p className="mt-2 text-[15px] text-[#4A5A75]">Interns living in Los Angeles this summer who share your interests.</p>
            </div>

            <div className="mb-2.5 mt-[22px] text-[13px] font-semibold uppercase tracking-[0.08em] text-[#3C6285]">Your interests</div>
            <div className="flex flex-wrap gap-1.5">
              {myInterests.map((i) => (
                <span key={i} className="rounded-full bg-[#DCEBF6] px-2.5 py-1 text-[11px] font-semibold text-[#245F90] ring-[1.5px] ring-inset ring-[#2E7DB5]">
                  {i}
                </span>
              ))}
            </div>
          </header>

          {/* filters */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMatchesOnly(false)} aria-pressed={!matchesOnly} className={`px-4 py-2 ${!matchesOnly ? btnDark : btnLight}`}>
                Everyone
              </button>
              <button type="button" onClick={() => setMatchesOnly(true)} aria-pressed={matchesOnly} className={`px-4 py-2 ${matchesOnly ? btnDark : btnLight}`}>
                Matches only
              </button>
            </div>
            <span className="text-xs text-[#4A5A75]">
              {matches.length} matches · sample interns
            </span>
          </div>

          {/* map + side column */}
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="relative aspect-[16/11] min-h-[400px] overflow-hidden rounded-[28px] border border-white bg-[#F5F8FC] bg-[linear-gradient(#E3ECF5_1px,transparent_1px),linear-gradient(90deg,#E3ECF5_1px,transparent_1px)] bg-[length:48px_48px] shadow-[inset_0_0_0_1px_rgba(213,223,234,0.8)]">
              {/* distance zones */}
              <div className="pointer-events-none absolute inset-[14%] rounded-[28px] border border-dashed border-[#BFD0E2]" />
              <div className="pointer-events-none absolute inset-[30%] rounded-[24px] border border-dashed border-[#BFD0E2]" />

              {/* lines from you to each match */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {matches.map((m) => (
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

              {/* intern dots */}
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
                    aria-label={`${i.name}, ${i.role}${matched ? `, Subtle score ${i.match}` : ''}`}
                    onMouseEnter={() => setHoverId(i.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(i.id)}
                    onBlur={() => setHoverId(null)}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 outline-none ${active ? 'z-30' : 'z-10'}`}
                    style={{ left: `${i.x}%`, top: `${i.y}%` }}
                  >
                    <span
                      className={`grid place-items-center rounded-full border-[3px] border-white font-bold text-white transition duration-200 group-hover:scale-125 group-focus:scale-125 ${
                        matched ? 'h-[44px] w-[44px] text-xs shadow-[0_10px_20px_-8px_rgba(30,43,68,0.6)]' : 'h-[16px] w-[16px] bg-[#9CB5CE] shadow-[0_4px_10px_rgba(30,43,68,0.2)] group-hover:bg-[#1E2B44]'
                      } ${active ? 'scale-125' : ''}`}
                      style={matched ? { backgroundColor: scoreColor(i.match ?? 0) } : undefined}
                    >
                      {matched ? i.initials : null}
                    </span>

                    {/* padding keeps the card attached to the dot so hover never drops */}
                    <div
                      className={`invisible absolute z-40 opacity-0 transition-opacity duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${horizontal} ${
                        up ? 'bottom-full pb-3' : 'top-full pt-3'
                      } ${active ? '!visible !opacity-100' : ''}`}
                    >
                      <Tooltip intern={i} contacted={contacted.has(i.id)} onContact={contact} />
                    </div>
                  </div>
                )
              })}

              {/* legend */}
              <div className="absolute bottom-3.5 left-3.5 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-full border border-white bg-white/85 px-4 py-2 text-[11px] font-semibold shadow-sm backdrop-blur">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#B9D6F0]" />You</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#2F5D8C]" />Matched</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#9CB5CE]" />Also in LA</span>
              </div>
              <div className="absolute right-3.5 top-3.5 z-10 rounded-full border border-white bg-white/85 px-3.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur">Hover a dot to see who they are</div>
            </div>

            {/* side column */}
            <div className="grid gap-5 lg:grid-rows-[1fr_auto]">
              <div className={card}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className={`${serif} text-2xl font-medium`}>Top matches</h2>
                  <span className={label}>Score</span>
                </div>
                <div>
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      onMouseEnter={() => setHoverId(m.id)}
                      onMouseLeave={() => setHoverId(null)}
                      className={`flex items-center gap-3 border-t border-[#E3ECF5] px-1 py-2.5 transition-colors ${hoverId === m.id ? 'bg-[#F4F7FB]' : ''}`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ backgroundColor: scoreColor(m.match ?? 0) }}>
                        {m.match}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{m.name}</div>
                        <div className="text-xs text-[#4A5A75]">{m.shared.length} shared interests</div>
                      </div>
                      <button type="button" disabled={contacted.has(m.id)} onClick={() => contact(m.id)} className={`px-3 py-1.5 text-xs ${btnLight}`}>
                        {contacted.has(m.id) ? 'Sent' : 'Contact'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={card}>
                <div className={label}>Matched on your interests</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {MY_INTERESTS.map((i) => (
                    <span key={i} className={pillShared}>
                      {i}
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
                        <span className={mine ? 'text-[#1E2B44]' : 'text-[#4A5A75]'}>{interest}</span>
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
              <h2 className={`${serif} text-2xl font-medium`}>Ways to meet up</h2>
              <p className="mb-5 mt-1 text-sm text-[#4A5A75]">Ideas based on what you share with your matches. Sample ideas.</p>
              <div className="grid gap-3">
                {meetups.map((m) => (
                  <div key={m.interest} className="flex items-center gap-4 rounded-2xl border border-[#EADFD0] bg-[#e6eff7] p-4">
                    <span className={`${pillShared} shrink-0`}>{m.interest}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`${serif} text-[17px] font-medium leading-snug`}>{m.idea}</div>
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
    </div>
  )
}