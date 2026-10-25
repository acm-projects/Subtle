'use client'

import { useEffect, useRef, useState } from 'react'
import HouseMascot, { type Mood } from '../HouseMascot'

/*
  The quiz journey: our house mascot walks a winding path toward a friend's house.
  Every answered question moves it one stop closer; on the last stop it arrives and they both jump.
*/

// winding path, in % of the panel (bottom-left start, friend's house top-right)
const WAYPOINTS: [number, number][] = [
  [14, 78],
  [44, 72],
  [70, 63],
  [56, 51],
  [26, 44],
  [32, 32],
  [58, 27],
  [80, 21],
]

// point a fraction t (0..1) along the waypoint polyline
function pointAt(t: number, path: [number, number][] = WAYPOINTS): [number, number] {
  const segs = path.slice(1).map((p, i) => {
    const q = path[i]
    return { a: q, b: p, len: Math.hypot(p[0] - q[0], p[1] - q[1]) }
  })
  const total = segs.reduce((n, s) => n + s.len, 0)
  let d = Math.max(0, Math.min(1, t)) * total
  for (const s of segs) {
    if (d <= s.len) {
      const k = s.len ? d / s.len : 0
      return [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k]
    }
    d -= s.len
  }
  return path[path.length - 1]
}

const MOODS: Mood[] = ['happy', 'wink', 'proud', 'excited']
// cheers by how far along the path we are, a few options each so it doesn't repeat
const CHEERS: [number, string[]][] = [
  [0.08, ['let’s go!']],
  [0.3, ['nice pick', 'ooh, good one', 'love that']],
  [0.55, ['getting closer', 'you’re on a roll', 'halfway-ish!']],
  [0.8, ['almost home', 'i can see it!', 'keep going']],
  [1, ['so close!', 'one more hop']],
]
const cheerFor = (t: number, i: number) => {
  const bucket = (CHEERS.find(([max]) => t <= max) ?? CHEERS[CHEERS.length - 1])[1]
  return bucket[i % bucket.length]
}

export default function Journey({
  position,
  total,
  complete = false,
  caption,
  compact = false,
}: {
  position: number // 0-based stop the mascot is on (questions answered)
  total: number // number of questions (the friend's house is one stop past the last question)
  complete?: boolean
  caption?: { tag: string; title: string; text: string }
  compact?: boolean
}) {
  const stops = Math.max(total, 1) + 1
  const here = complete ? stops - 1 : Math.min(position, stops - 2)
  // the short version (finish screen) squeezes the path lower so the houses fit
  const path: [number, number][] = compact ? WAYPOINTS.map(([px, py]) => [px, 38 + py * 0.6]) : WAYPOINTS
  const pts = Array.from({ length: stops }, (_, i) => pointAt(i / (stops - 1), path))
  const [x, y] = pts[here]
  const [fx, fy] = pts[stops - 1]

  // a little hop every time the mascot moves to a new stop
  const [hopKey, setHopKey] = useState(0)
  const last = useRef(here)
  useEffect(() => {
    if (last.current !== here) {
      last.current = here
      setHopKey((k) => k + 1)
    }
  }, [here])

  const mood: Mood = complete ? 'excited' : MOODS[here % MOODS.length]
  const cheer = complete ? 'we made it!' : cheerFor(here / (stops - 1), here)
  const toGo = stops - 1 - here
  const facingLeft = !complete && pts[Math.min(here + 1, stops - 1)][0] < x
  const size = compact ? 'h-20 w-20' : 'h-28 w-28'

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#A9C7E8] via-[#C9DBEA] to-[#F3E3D2] ${compact ? 'h-[280px]' : 'hidden min-h-[600px] md:block'}`}
      aria-label={complete ? 'Your house made it to its friend' : `Quiz progress: ${here} of ${stops - 1} steps`}
      role="img"
    >
      {/* sky */}
      <div aria-hidden="true" className="absolute left-[18%] top-8 h-14 w-14 rounded-full bg-[#FBF3EA] shadow-[0_0_60px_rgba(251,243,234,0.9)]" />
      <div aria-hidden="true" className="absolute -left-6 top-24 h-8 w-36 rounded-full bg-white/60 blur-[2px]" />
      <div aria-hidden="true" className="absolute right-24 top-28 h-6 w-24 rounded-full bg-white/50 blur-[2px]" />
      {/* hills */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[46%] bg-[#C9DBC4]/45 [clip-path:ellipse(80%_60%_at_30%_100%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[34%] bg-[#E6D3BE]/70 [clip-path:ellipse(70%_70%_at_80%_100%)]" />

      {/* the path */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={path.map((p) => p.join(',')).join(' ')} fill="none" stroke="#FBF3EA" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
        <polyline points={path.map((p) => p.join(',')).join(' ')} fill="none" stroke="#C9B49B" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* stepping stones */}
      {pts.slice(0, -1).map(([px, py], i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-500 ${
            i < here || complete ? 'border-[#1E2B44] bg-[#1E2B44]' : i === here ? 'border-[#1E2B44] bg-white' : 'border-white bg-white/70'
          }`}
          style={{ left: `${px}%`, top: `${py}%` }}
        />
      ))}

      {/* friend waiting at the end */}
      <div className="absolute -translate-x-1/2 -translate-y-[88%] drop-shadow-[0_10px_14px_rgba(30,43,68,0.28)]" style={{ left: `${fx + 6}%`, top: `${fy}%` }}>
        <HouseMascot
          label="A friend's house waiting at the end"
          gradientStart="#EDB98A"
          gradientEnd="#FBF3EA"
          footColor="#E9B98E"
          flip
          jump={complete}
          speed={complete ? 1.4 : 0.8}
          mood={complete ? 'excited' : toGo <= 2 ? 'wink' : 'happy'}
          className={size}
        />
        {complete && (
          <span aria-hidden="true" className="absolute -top-3 left-1/2 -translate-x-1/2 animate-[popIn_.5s_ease-out] text-[#C27A4A]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
            </svg>
          </span>
        )}
      </div>

      {/* our mascot, walking */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-[88%] drop-shadow-[0_10px_14px_rgba(30,43,68,0.3)] transition-[left,top] duration-700 ease-[cubic-bezier(.4,1.4,.5,1)]"
        style={{ left: `${complete ? x - 8 : x}%`, top: `${y}%` }}
      >
        <div key={hopKey} className={hopKey ? 'animate-[journeyHop_.7s_ease-out]' : ''}>
          <HouseMascot label="Your house mascot" gradientStart="#9EC2EA" gradientEnd="#F4E2CD" mood={mood} jump={complete} speed={complete ? 1.4 : 1} flip={facingLeft} className={size} />
        </div>
        <span
          key={`c-${here}-${complete}`}
          className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full animate-[popIn_.35s_cubic-bezier(.2,.9,.3,1.3)] whitespace-nowrap rounded-full border border-white bg-white/90 px-3 py-1 text-xs font-semibold text-[#1E2B44] shadow-sm"
        >
          {cheer}
        </span>
      </div>

      {/* caption */}
      {caption && !compact && (
        <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3 rounded-[18px] border border-white bg-white/85 px-4 py-3 text-[#1E2B44] backdrop-blur-xl">
          <span className="min-w-0 leading-snug">
            <strong className="block truncate text-sm">{caption.title}</strong>
            <span className="text-xs text-[#4A5A75]">{caption.text}</span>
          </span>
          <span className="shrink-0 rounded-full bg-[#1E2B44] px-3 py-1.5 text-xs font-semibold text-white">
            {toGo === 1 ? '1 step to go' : `${toGo} steps to go`}
          </span>
        </div>
      )}
    </div>
  )
}
