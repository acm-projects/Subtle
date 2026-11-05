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
    [50, 84],
    [24, 76],
    [26, 66],
    [72, 60],
    [76, 51],
    [32, 45],
    [28, 39],
    [56, 34],
    [70, 31],
  ] as [number, number][],
}
// The short finish banner: a lower horizon and a path along the front, so both houses stay big.
const SHORT = {
  horizon: 44,
  front: 88,
  path: [
    [6, 84],
    [22, 76],
    [38, 86],
    [52, 76],
    [64, 82],
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

type Kind = 'tree' | 'pine' | 'bush' | 'flowers' | 'lamp'
// trees, bushes, flowers and lamps sitting on the ground, for depth (x, y in %, size in px at the front)
const SCENERY: { x: number; y: number; s: number; kind: Kind }[] = [
  { x: 6, y: 60, s: 80, kind: 'tree' },
  { x: 94, y: 76, s: 92, kind: 'tree' },
  { x: 92, y: 44, s: 58, kind: 'pine' },
  { x: 8, y: 40, s: 54, kind: 'pine' },
  { x: 16, y: 33, s: 40, kind: 'tree' },
  { x: 86, y: 33, s: 40, kind: 'tree' },
  { x: 94, y: 58, s: 48, kind: 'pine' },
  { x: 6, y: 78, s: 54, kind: 'pine' },
  { x: 80, y: 92, s: 46, kind: 'bush' },
  { x: 14, y: 93, s: 50, kind: 'bush' },
  { x: 88, y: 64, s: 32, kind: 'bush' },
  { x: 12, y: 50, s: 30, kind: 'bush' },
  { x: 50, y: 74, s: 34, kind: 'flowers' },
  { x: 50, y: 54, s: 28, kind: 'flowers' },
  { x: 44, y: 40, s: 22, kind: 'flowers' },
  { x: 86, y: 52, s: 26, kind: 'flowers' },
  { x: 16, y: 70, s: 30, kind: 'flowers' },
  { x: 66, y: 88, s: 30, kind: 'flowers' },
  { x: 34, y: 88, s: 26, kind: 'flowers' },
  { x: 82, y: 70, s: 74, kind: 'lamp' },
  { x: 16, y: 58, s: 56, kind: 'lamp' },
]

function Scenery({ kind, size }: { kind: Kind; size: number }) {
  if (kind === 'tree')
    return (
      <svg width={size} height={size * 1.3} viewBox="0 0 40 52" aria-hidden="true">
        <ellipse cx="20" cy="50" rx="11" ry="2.4" fill="#2F4161" opacity="0.15" />
        <rect x="18" y="32" width="4" height="18" rx="2" fill="#B58E6B" />
        <circle cx="20" cy="20" r="15" fill="#A9C7A0" />
        <circle cx="13" cy="25" r="9" fill="#9DBD94" />
        <circle cx="27" cy="24" r="9.5" fill="#B4D0AB" />
      </svg>
    )
  if (kind === 'pine')
    return (
      <svg width={size * 0.8} height={size * 1.4} viewBox="0 0 32 56" aria-hidden="true">
        <ellipse cx="16" cy="54" rx="9" ry="2" fill="#2F4161" opacity="0.15" />
        <rect x="14.5" y="42" width="3" height="12" rx="1.5" fill="#B58E6B" />
        <path d="M16 4 L28 26 H4 Z" fill="#8FB389" />
        <path d="M16 14 L30 40 H2 Z" fill="#9DBD94" />
        <path d="M16 26 L31 46 H1 Z" fill="#8FB389" />
      </svg>
    )
  if (kind === 'flowers')
    return (
      <svg width={size} height={size * 0.6} viewBox="0 0 40 24" aria-hidden="true">
        <ellipse cx="20" cy="22" rx="15" ry="2" fill="#2F4161" opacity="0.1" />
        <path d="M8 22 V13 M15 22 V9 M22 22 V12 M29 22 V8 M34 22 V14" stroke="#8FB389" strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="12" r="3" fill="#F3C9A0" />
        <circle cx="15" cy="8" r="3.4" fill="#FBF3EA" />
        <circle cx="22" cy="11" r="3" fill="#E9A0A0" />
        <circle cx="29" cy="7" r="3.4" fill="#F3C9A0" />
        <circle cx="34" cy="13" r="2.6" fill="#C9DBEA" />
      </svg>
    )
  if (kind === 'lamp')
    return (
      <svg width={size * 0.35} height={size} viewBox="0 0 14 40" aria-hidden="true">
        <ellipse cx="7" cy="39" rx="5" ry="1.2" fill="#2F4161" opacity="0.15" />
        <rect x="6" y="8" width="2" height="31" rx="1" fill="#2F4161" />
        <rect x="2.5" y="2" width="9" height="8" rx="2.5" fill="#2F4161" />
        <rect x="4" y="3.5" width="6" height="5" rx="1.5" fill="#F3C9A0" />
      </svg>
    )
  return (
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
  const segments = PATH.slice(1).map((p, i) => ({ a: PATH[i], b: p, w: 18 + 52 * depth((PATH[i][1] + p[1]) / 2) }))

  return (
    <div
      role="img"
      aria-label={complete ? 'The house made it to its friend' : `Quiz progress: step ${here + 1} of ${stops - 1}`}
      className={`relative overflow-hidden rounded-[28px] ${compact ? 'h-[300px]' : 'hidden min-h-[600px] md:block'}`}
    >
      {/* sky */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#BCD5EC] to-[#E9EEF2]" />
      {/* sun and clouds use inline colors so the scene looks the same in dark mode */}
      <div aria-hidden="true" className="absolute left-[12%] top-[7%] h-9 w-9 rounded-full shadow-[0_0_40px_rgba(251,243,234,0.95)]" style={{ background: '#FBF3EA' }} />
      <div aria-hidden="true" className="absolute right-[10%] top-[9%] h-5 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} />
      <div aria-hidden="true" className="absolute left-[32%] top-[14%] h-4 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.6)' }} />
      <div aria-hidden="true" className="absolute left-[58%] top-[5%] h-4 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.6)' }} />
      {/* birds */}
      <svg aria-hidden="true" className="absolute left-[64%] top-[12%] w-16" viewBox="0 0 60 20" fill="none" stroke="#2F4161" strokeWidth="1.6" strokeLinecap="round" opacity="0.45">
        <path d="M2 10 q4 -5 8 0 q4 -5 8 0" />
        <path d="M30 4 q3 -4 6 0 q3 -4 6 0" />
        <path d="M44 14 q2.5 -3 5 0 q2.5 -3 5 0" />
      </svg>

      {/* distant hills on the horizon */}
      <svg aria-hidden="true" className="absolute inset-x-0 w-full" style={{ top: `${HORIZON - 9}%`, height: '11%' }} viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0 20 Q14 4 30 12 T62 8 T100 12 L100 20 Z" fill="#C9D9E6" />
        <path d="M0 20 Q22 10 44 15 T100 13 L100 20 Z" fill="#B9CFC3" />
      </svg>

      {/* a little neighborhood on the horizon */}
      <svg aria-hidden="true" className="absolute inset-x-0 w-full" style={{ top: `${HORIZON - 4.5}%`, height: '5%' }} viewBox="0 0 200 20" preserveAspectRatio="xMidYMax meet">
        {[18, 30, 44, 140, 154, 170, 184].map((hx, i) => (
          <g key={hx} transform={`translate(${hx} ${i % 2 ? 6 : 4})`}>
            <rect x="0" y="6" width="10" height="10" fill={i % 3 === 0 ? '#FBF3EA' : i % 3 === 1 ? '#E4EAF1' : '#F4E2CD'} />
            <path d="M-1.5 6.5 L5 1 L11.5 6.5 Z" fill={i % 2 ? '#C27A4A' : '#8FA6BF'} />
            <rect x="3.5" y="10" width="3" height="3" fill="#F3C9A0" />
          </g>
        ))}
      </svg>

      {/* the ground */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#CFE0C6] via-[#DCE6CC] to-[#EADFC9]" style={{ top: `${HORIZON}%` }} />

      {/* the path, narrowing toward the horizon */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {segments.map((s, i) => (
          <line key={`e${i}`} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke="#D8C4A6" strokeWidth={s.w + 10} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
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
            style={{ left: `${px}%`, top: `${py}%`, width: 34 * sc, height: 13 * sc, boxShadow: 'inset 0 -2px 0 rgba(30,43,68,0.15)' }}
          />
        )
      })}

      {/* scenery, drawn back to front so nearer things overlap farther ones */}
      {SCENERY.map((t) => ({ ...t, y: sceneryY(t.y) }))
        .filter((t) => !compact || ((t.x < 4 || t.x > 74 || t.y < 70) && t.kind !== 'lamp'))
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
              label="House mascot"
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
          <strong className="min-w-0 truncate text-[15px] leading-snug">{caption.title}</strong>
          <span className="shrink-0 rounded-full bg-[#1E2B44] px-3.5 py-1.5 text-sm font-semibold text-white">
            {toGo === 1 ? '1 step to go' : `${toGo} steps to go`}
          </span>
        </div>
      )}
    </div>
  )
}
