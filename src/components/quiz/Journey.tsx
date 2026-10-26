'use client'

import { useEffect, useRef, useState } from 'react'
import HouseMascot, { type Mood } from '../HouseMascot'

/*
  The quiz journey: our house mascot walks along a garden path toward a friend's house.
  Everything stands on the ground: the path winds back toward the horizon, so the mascot
  gets a little smaller as it walks farther away. Every answered question moves it one stop;
  at the last stop it reaches the friend and they both jump.
*/

// The tall panel (next to each question): sky on top, a garden path winding back to the horizon.
const TALL = {
  horizon: 27, // % from the top where the sky meets the ground
  front: 82, // nearest point of the path (kept above the caption card)
  path: [
    [48, 82],
    [32, 74],
    [38, 64],
    [62, 58],
    [68, 50],
    [50, 44],
    [40, 38],
    [52, 34],
    [64, 31],
  ] as [number, number][],
}
// The short finish banner: a lower horizon and a path along the front, so both houses stay big.
const SHORT = {
  horizon: 44,
  front: 88,
  path: [
    [8, 86],
    [22, 80],
    [36, 85],
    [50, 79],
    [62, 82],
  ] as [number, number][],
}

function pointAt(t: number, PATH: [number, number][]): [number, number] {
  const segs = PATH.slice(1).map((p, i) => ({ a: PATH[i], b: p, len: Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]) }))
  const total = segs.reduce((n, s) => n + s.len, 0)
  let d = Math.max(0, Math.min(1, t)) * total
  for (const s of segs) {
    if (d <= s.len) {
      const k = s.len ? d / s.len : 0
      return [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k]
    }
    d -= s.len
  }
  return PATH[PATH.length - 1]
}


const MOODS: Mood[] = ['happy', 'wink', 'proud', 'excited']

// a few bushes and trees sitting on the ground, for depth (x, y in %, size in px at the front)
const SCENERY: { x: number; y: number; s: number; kind: 'tree' | 'bush' }[] = [
  { x: 12, y: 60, s: 70, kind: 'tree' },
  { x: 86, y: 74, s: 84, kind: 'tree' },
  { x: 82, y: 40, s: 54, kind: 'tree' },
  { x: 20, y: 38, s: 46, kind: 'tree' },
  { x: 74, y: 88, s: 40, kind: 'bush' },
  { x: 14, y: 90, s: 46, kind: 'bush' },
  { x: 88, y: 56, s: 30, kind: 'bush' },
  { x: 28, y: 50, s: 26, kind: 'bush' },
]

function Scenery({ kind, size }: { kind: 'tree' | 'bush'; size: number }) {
  return kind === 'tree' ? (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 52" aria-hidden="true">
      <ellipse cx="20" cy="50" rx="11" ry="2.4" fill="#2F4161" opacity="0.15" />
      <rect x="18" y="32" width="4" height="18" rx="2" fill="#B58E6B" />
      <circle cx="20" cy="20" r="15" fill="#A9C7A0" />
      <circle cx="13" cy="25" r="9" fill="#9DBD94" />
      <circle cx="27" cy="24" r="9.5" fill="#B4D0AB" />
    </svg>
  ) : (
    <svg width={size} height={size * 0.6} viewBox="0 0 40 24" aria-hidden="true">
      <ellipse cx="20" cy="22.5" rx="16" ry="2" fill="#2F4161" opacity="0.12" />
      <circle cx="12" cy="15" r="8" fill="#B4D0AB" />
      <circle cx="22" cy="12" r="10" fill="#A9C7A0" />
      <circle cx="31" cy="16" r="7" fill="#9DBD94" />
      <circle cx="17" cy="9" r="1.6" fill="#F3C9A0" />
      <circle cx="27" cy="11" r="1.6" fill="#FBF3EA" />
    </svg>
  )
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
  const scene = compact ? SHORT : TALL
  const HORIZON = scene.horizon
  const PATH = scene.path
  // things farther back (closer to the horizon) look smaller
  const depth = (yy: number) => Math.max(0, Math.min(1, (yy - HORIZON) / (scene.front - HORIZON)))
  const scaleAt = (yy: number) => 0.5 + 0.5 * depth(yy)
  // scenery is laid out for the tall panel; squeeze it below the horizon of the short one
  const sceneryY = (yy: number) => (compact ? HORIZON + 4 + ((yy - 27) * (96 - HORIZON - 4)) / 68 : yy)
  const stops = Math.max(total, 1) + 1
  const here = complete ? stops - 1 : Math.min(position, stops - 2)
  const pts = Array.from({ length: stops }, (_, i) => pointAt(i / (stops - 1), PATH))
  const [x, y] = pts[here]
  const [fx, fy] = pts[stops - 1]

  // a little hop each time the mascot moves to a new stop
  const [hopKey, setHopKey] = useState(0)
  const last = useRef(here)
  useEffect(() => {
    if (last.current !== here) {
      last.current = here
      setHopKey((k) => k + 1)
    }
  }, [here])

  const toGo = stops - 1 - here
  const mood: Mood = complete ? 'excited' : MOODS[here % MOODS.length]
  const nextX = pts[Math.min(here + 1, stops - 1)][0]
  const facingLeft = !complete && nextX < x - 0.5
  const base = compact ? 120 : 150 // mascot size in px at the very front of the path

  // path drawn in pieces so it gets narrower as it goes back
  const segments = PATH.slice(1).map((p, i) => ({ a: PATH[i], b: p, w: 10 + 30 * depth((PATH[i][1] + p[1]) / 2) }))

  return (
    <div
      role="img"
      aria-label={complete ? 'Your house made it to its friend' : `Quiz progress: step ${here + 1} of ${stops - 1}`}
      className={`relative overflow-hidden rounded-[28px] ${compact ? 'h-[300px]' : 'hidden min-h-[600px] md:block'}`}
    >
      {/* sky */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#BCD5EC] to-[#E9EEF2]" />
      <div aria-hidden="true" className="absolute left-[12%] top-[7%] h-9 w-9 rounded-full bg-[#FBF3EA] shadow-[0_0_40px_rgba(251,243,234,0.95)]" />
      <div aria-hidden="true" className="absolute right-[10%] top-[9%] h-5 w-24 rounded-full bg-white/70" />
      <div aria-hidden="true" className="absolute left-[32%] top-[14%] h-4 w-16 rounded-full bg-white/60" />

      {/* distant hills on the horizon */}
      <svg aria-hidden="true" className="absolute inset-x-0 w-full" style={{ top: `${HORIZON - 9}%`, height: '11%' }} viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0 20 Q14 4 30 12 T62 8 T100 12 L100 20 Z" fill="#C9D9E6" />
        <path d="M0 20 Q22 10 44 15 T100 13 L100 20 Z" fill="#B9CFC3" />
      </svg>

      {/* the ground */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#CFE0C6] via-[#DCE6CC] to-[#EADFC9]" style={{ top: `${HORIZON}%` }} />

      {/* the path, narrowing toward the horizon */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {segments.map((s, i) => (
          <line key={`e${i}`} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke="#D8C4A6" strokeWidth={s.w + 6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
        {segments.map((s, i) => (
          <line key={`p${i}`} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke="#F4E9D8" strokeWidth={s.w} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* stepping stones on the path */}
      {pts.slice(0, -1).map(([px, py], i) => {
        const sc = scaleAt(py)
        const done = i < here || complete
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] transition-colors duration-500 ${done ? 'bg-[#2F4161]' : i === here ? 'bg-[#8FA6BF]' : 'bg-[#E3D3BC]'}`}
            style={{ left: `${px}%`, top: `${py}%`, width: 22 * sc, height: 9 * sc, boxShadow: 'inset 0 -2px 0 rgba(30,43,68,0.15)' }}
          />
        )
      })}

      {/* scenery, drawn back to front so nearer things overlap farther ones */}
      {SCENERY.map((t) => ({ ...t, y: sceneryY(t.y) }))
        .filter((t) => !compact || t.x < 6 || t.x > 74 || t.y < 70)
        .sort((a, b) => a.y - b.y)
        .map((t, i) => (
          <div key={i} aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${t.x}%`, top: `${t.y}%`, zIndex: Math.round(t.y) }}>
            <Scenery kind={t.kind} size={t.s * scaleAt(t.y) * (compact ? 0.75 : 1)} />
          </div>
        ))}

      {/* the friend's house at the end of the path */}
      <div className="absolute" style={{ left: `${fx + 7}%`, top: `${fy}%`, zIndex: Math.round(fy) }}>
        <div style={{ width: base * scaleAt(fy), height: base * scaleAt(fy), transform: 'translate(-50%, -92%)' }}>
          <HouseMascot
            label="A friend's house waiting at the end"
            gradientStart="#EDB98A"
            gradientEnd="#FBF3EA"
            footColor="#E9B98E"
            shadowColor="#6E7F6A"
            flip
            jump={complete}
            speed={complete ? 1.4 : 0.8}
            mood={complete ? 'excited' : toGo <= 2 ? 'wink' : 'happy'}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* our mascot, walking on the path */}
      <div
        className="absolute transition-[left,top] duration-700 ease-[cubic-bezier(.45,.05,.3,1)]"
        style={{ left: `${complete ? x - (compact ? 9 : 7) : x}%`, top: `${y}%`, zIndex: Math.round(y) + 1 }}
      >
        <div
          className="transition-[width,height] duration-700 ease-[cubic-bezier(.45,.05,.3,1)]"
          style={{ width: base * scaleAt(y), height: base * scaleAt(y), transform: 'translate(-50%, -92%)' }}
        >
          <div key={hopKey} className={`h-full w-full ${hopKey ? 'animate-[journeyHop_.7s_ease-out]' : ''}`}>
            <HouseMascot
              label="Your house mascot"
              gradientStart="#9EC2EA"
              gradientEnd="#F4E2CD"
              shadowColor="#6E7F6A"
              mood={mood}
              jump={complete}
              speed={complete ? 1.4 : 1}
              flip={facingLeft}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      {complete && (
        <span aria-hidden="true" className="absolute animate-[popIn_.5s_ease-out] text-[#C27A4A]" style={{ left: `${fx - (compact ? 3 : 1)}%`, top: `${fy - (compact ? 52 : 26)}%`, zIndex: 200 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
          </svg>
        </span>
      )}

      {/* caption */}
      {caption && !compact && (
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-[18px] border border-white bg-white/85 px-4 py-3 text-[#1E2B44] backdrop-blur-xl" style={{ zIndex: 300 }}>
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
