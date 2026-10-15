'use client'

import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../../components/AppNavbar'
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
  angle: number // degrees around the circle
  radius: number // 0 to 0.46, distance from the center as a fraction of the circle
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

const serif = 'font-[family-name:var(--font-serif)]'

// Round so the server and the browser always produce identical numbers.
const round2 = (n: number) => Math.round(n * 100) / 100

const polar = (angle: number, radius: number) => ({
  x: round2(50 + radius * 100 * Math.cos((angle * Math.PI) / 180)),
  y: round2(50 + radius * 100 * Math.sin((angle * Math.PI) / 180)),
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
    <div className="w-[250px] rounded-[20px] bg-white p-4 text-left text-[#123B5C] shadow-[0_24px_50px_rgba(18,59,92,0.28)]">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-[13px] font-bold text-white ${matched ? 'bg-[#2E7DB5]' : 'bg-[#9CB5CE]'}`}>
          {intern.initials}
        </span>
        <div className="min-w-0">
          <div className={`${serif} text-[17px] font-bold`}>{intern.name}</div>
          <div className="text-xs text-[#5C7FA0]">
            {intern.role} · {intern.school}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {intern.interests.map((i) => (
          <span
            key={i}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              matched && intern.shared.includes(i) ? 'bg-[#DCEBF6] text-[#245F90] ring-[1.5px] ring-inset ring-[#2E7DB5]' : 'bg-[#EEF4FB]'
            }`}
          >
            {i}
          </span>
        ))}
      </div>

      {matched ? (
        <>
          <div className="mb-1.5 mt-2.5 flex justify-between text-xs font-semibold">
            <span>{intern.match}% match</span>
            <span className="text-[#5C7FA0]">{intern.shared.length} shared interests</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E3ECF5]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#2E7DB5] to-[#6BA9D4]" style={{ width: `${intern.match}%` }} />
          </div>
          <p className="mt-2 text-xs leading-snug text-[#3C6285]">You both like {joinNames(intern.shared)}.</p>
        </>
      ) : (
        <p className="mb-0.5 mt-2.5 text-xs font-semibold text-[#75655F]">Not matched yet</p>
      )}

      <button
        type="button"
        disabled={contacted}
        onClick={() => onContact(intern.id)}
        className="mt-3.5 w-full rounded-full bg-[#2E7DB5] py-2.5 text-sm font-semibold text-white transition hover:bg-[#245F90] disabled:cursor-default disabled:bg-[#9CB5CE]"
      >
        {contacted ? 'Request sent' : `Contact ${intern.name.split(' ')[0]}`}
      </button>
    </div>
  )
}

export default function MatchesPage() {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [contacted, setContacted] = useState<Set<string>>(new Set())
  const [firstName, setFirstName] = useState('')

  // AppNavbar takes the user's first name; adjust to wherever you store it
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      setFirstName(meta?.first_name ?? data.user?.email?.split('@')[0] ?? '')
    })
  }, [])

  const interns: Placed[] = useMemo(
    () =>
      INTERNS.map((i) => ({
        ...i,
        ...polar(i.angle, i.radius),
        shared: i.interests.filter((x) => MY_INTERESTS.includes(x)),
      })),
    [],
  )
  const matches = interns.filter((i) => i.match !== undefined).sort((a, b) => (b.match ?? 0) - (a.match ?? 0))

  const contact = (id: string) => {
    // TODO: open a message composer / send a connection request through your backend
    setContacted((prev) => new Set(prev).add(id))
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#b9d6f0_0%,#d2e4f5_38%,#ededee_52%,#fbf3e8_62%,#fff6ea_100%)] text-[#123B5C]">
      {/* background circles: 2 cream (blue half), 2 blue (cream half) */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[140px] top-[6%] h-[540px] w-[540px] rounded-full bg-[#fff6ea] opacity-50 blur-[46px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[6%] top-[34%] h-[300px] w-[300px] rounded-full bg-[#fff6ea] opacity-[0.42] blur-[46px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-[120px] top-[66%] h-[500px] w-[500px] rounded-full bg-[#8fbde6] opacity-30 blur-[46px]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-[7%] top-[84%] h-[270px] w-[270px] rounded-full bg-[#8fbde6] opacity-[0.26] blur-[46px]" />

      <AppNavbar firstName={firstName} />

      {/* pt-28 leaves room for the fixed navbar */}
      <div className="relative mx-auto max-w-[1240px] px-7 pt-28">

        <header className="pb-7 pt-5 text-center">
          <h1 className={`${serif} text-[44px] font-bold leading-[1.02] tracking-[-0.02em] md:text-[60px]`}>Your matches.</h1>
          <p className={`${serif} mt-1.5 text-[28px] italic text-[#2E7DB5]`}>Interns in Los Angeles who share your interests.</p>
        </header>

        <div className="grid items-center gap-6 lg:grid-cols-[270px_1fr_300px]">
          {/* left: stats, legend, interests */}
          <aside className="rounded-[28px] bg-white/85 p-6 shadow-[0_12px_36px_rgba(18,59,92,0.08)]">
            <div className="mb-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#3C6285]">Los Angeles</div>
            <div className={`${serif} text-5xl font-bold leading-none`}>{interns.length}</div>
            <div className="mb-[18px] text-sm text-[#3C6285]">interns in your city</div>
            <div className={`${serif} text-5xl font-bold leading-none text-[#2E7DB5]`}>{matches.length}</div>
            <div className="mb-[22px] text-sm text-[#3C6285]">matched with you</div>

            <div className="grid gap-3 text-sm font-medium">
              <div className="flex items-center gap-2.5"><span className="h-[18px] w-[18px] rounded-full bg-[#123B5C]" />You</div>
              <div className="flex items-center gap-2.5"><span className="h-[18px] w-[18px] rounded-full bg-[#2E7DB5]" />Matched with you</div>
              <div className="flex items-center gap-2.5"><span className="h-[18px] w-[18px] rounded-full bg-[#9CB5CE]" />Also in Los Angeles</div>
            </div>

            <div className="mb-2.5 mt-[22px] text-[13px] font-semibold uppercase tracking-[0.08em] text-[#3C6285]">Your interests</div>
            <div className="flex flex-wrap gap-1.5">
              {MY_INTERESTS.map((i) => (
                <span key={i} className="rounded-full bg-[#DCEBF6] px-2.5 py-1 text-[11px] font-semibold text-[#245F90] ring-[1.5px] ring-inset ring-[#2E7DB5]">
                  {i}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-normal text-[#5C7FA0]">Matches are based on shared interests. Hover a dot to see who they are.</p>
          </aside>

          {/* center: the circle */}
          <main className="relative mx-auto aspect-square w-full max-w-[640px]">
            <div className="absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_50%,#fff_0%,#f3f8fd_55%,#e4eff9_100%)] shadow-[0_30px_80px_rgba(18,59,92,0.18),inset_0_0_0_2px_#fff]">
              {[94, 66, 33].map((size) => (
                <div key={size} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-[#BFD9EE]" style={{ width: `${size}%`, height: `${size}%` }} />
              ))}
            </div>

            {/* lines from you to each match */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {matches.map((m) => (
                <line
                  key={m.id}
                  x1="50"
                  y1="50"
                  x2={m.x}
                  y2={m.y}
                  stroke="#2E7DB5"
                  strokeLinecap="round"
                  strokeWidth={hoverId === m.id ? 0.7 : 0.18 + ((m.match ?? 0) / 100) * 0.3}
                  strokeOpacity={hoverId === m.id ? 0.95 : 0.38}
                  style={{ transition: 'stroke-opacity .2s, stroke-width .2s' }}
                />
              ))}
            </svg>

            {/* you */}
            <div className="absolute left-1/2 top-1/2 z-20 grid h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-[#123B5C] text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(18,59,92,0.4)]">
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#2E7DB5]" />
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#2E7DB5]" style={{ animationDelay: '1.4s' }} />
              You
            </div>

            {/* intern dots */}
            {interns.map((i) => {
              const matched = i.match !== undefined
              const active = hoverId === i.id
              const up = i.y > 52
              const horizontal = i.x < 30 ? 'left-[-6px]' : i.x > 70 ? 'right-[-6px]' : 'left-1/2 -translate-x-1/2'
              return (
                <div
                  key={i.id}
                  role="group"
                  tabIndex={0}
                  aria-label={`${i.name}, ${i.role}${matched ? `, ${i.match} percent match` : ''}`}
                  onMouseEnter={() => setHoverId(i.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(i.id)}
                  onBlur={() => setHoverId(null)}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 outline-none ${active ? 'z-30' : 'z-10'}`}
                  style={{ left: `${i.x}%`, top: `${i.y}%` }}
                >
                  <span
                    className={`grid place-items-center rounded-full border-[3px] border-white font-bold text-white transition duration-200 group-hover:scale-125 group-focus:scale-125 ${
                      matched
                        ? 'h-[46px] w-[46px] bg-[#2E7DB5] text-[13px] shadow-[0_8px_20px_rgba(46,125,181,0.4)]'
                        : 'h-[18px] w-[18px] bg-[#9CB5CE] shadow-[0_4px_10px_rgba(18,59,92,0.2)] group-hover:bg-[#75655F]'
                    } ${active ? 'scale-125' : ''}`}
                  >
                    {matched ? i.initials : null}
                  </span>

                  {/* the wrapper has padding so there is no gap between the dot and the card */}
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
          </main>

          {/* right: top matches */}
          <aside className="rounded-[28px] bg-white/85 p-6 shadow-[0_12px_36px_rgba(18,59,92,0.08)]">
            <div className={`${serif} mb-2.5 text-[26px] font-bold`}>Top matches</div>
            {matches.map((m) => (
              <div
                key={m.id}
                onMouseEnter={() => setHoverId(m.id)}
                onMouseLeave={() => setHoverId(null)}
                className={`flex items-center gap-3 rounded-xl border-t border-[#E3ECF5] px-1 py-2.5 transition-colors ${hoverId === m.id ? 'bg-[#EEF4FB]' : ''}`}
              >
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#2E7DB5] text-[13px] font-bold text-white">{m.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs text-[#5C7FA0]">{m.shared.length} shared interests</div>
                </div>
                <span className={`${serif} text-lg font-bold text-[#2E7DB5]`}>{m.match}%</span>
              </div>
            ))}
          </aside>
        </div>

        <footer className="flex justify-between pb-10 pt-12 text-sm text-[#5C7FA0]">
          <span className={`${serif} text-[22px] font-bold text-[#123B5C]`}></span>
          <span></span>
        </footer>
      </div>
    </div>
  )
}
