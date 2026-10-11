'use client'

import { useEffect, useRef, useState } from 'react'

// made-up sign-ups per period for Summer 2026 (swap for real data later)
const periods = [
  { label: 'May 1', month: 'May', joined: 60 },
  { label: 'May 15', month: '', joined: 40 },
  { label: 'Jun 1', month: 'Jun', joined: 55 },
  { label: 'Jun 15', month: '', joined: 20 },
  { label: 'Jul 1', month: 'Jul', joined: 70 },
  { label: 'Jul 15', month: '', joined: 55 },
  { label: 'Aug 1', month: 'Aug', joined: 60 },
  { label: 'Aug 15', month: '', joined: 40 },
]

// running total of interns, computed from the sign-ups above
const cumulative = periods.reduce<number[]>((acc, p) => {
  acc.push((acc[acc.length - 1] ?? 0) + p.joined)
  return acc
}, [])
const total = cumulative[cumulative.length - 1]

const quotes = [
  { text: 'I came for a sublet and left with a roommate I still talk to.', who: 'Aisha', when: 'Summer 2026' },
  { text: 'Subtle took the stress out of finding a place to live.', who: 'Leo', when: 'Summer 2026' },
]

// chart geometry
const W = 640
const H = 380
const L = 56
const R = 24
const T = 56
const B = 48
const Y_MAX = 400
const yLabels = [0, 100, 200, 300, 400]

const xAt = (i: number) => L + (i * (W - L - R)) / (periods.length - 1)
const yAt = (n: number) => T + (1 - n / Y_MAX) * (H - T - B)

const points: [number, number][] = cumulative.map((n, i) => [xAt(i), yAt(n)])

function smoothPath(pts: [number, number][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

const linePath = smoothPath(points)
const areaPath = `${linePath} L${points[points.length - 1][0]},${H - B} L${points[0][0]},${H - B} Z`

export default function Section3() {
  const ref = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setStarted(true),
      { threshold: 0.35 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const duration = 2600
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setProgress(1 - Math.pow(1 - t, 3)) // ease out
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started])

  const clipWidth = L + progress * (W - L - R) + 2
  const count = Math.round(progress * total)

  return (
    <section ref={ref} className="relative px-4 pb-32 pt-4 md:px-8">
      <div className="mx-auto max-w-[1000px]">
        <h2
          className={`mb-8 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] transition-all duration-1000 ease-out md:text-[56px] ${
            started ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          Interns joining Subtle
        </h2>

        {/* graph card */}
        <div className="rounded-[32px] border border-white bg-white/85 px-6 pb-24 pt-7 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-[#4A5A75]">
              Total interns, May to August · Summer 2026 · <strong className="text-[#1E2B44]">Sample data</strong>
            </span>
            <span className="inline-flex items-baseline gap-2 rounded-full bg-[#1E2B44] px-4 py-2 text-white">
              <strong className="font-[family-name:var(--font-serif)] text-[26px] leading-none tabular-nums">{count}</strong>
              <span className="text-xs">interns and counting</span>
            </span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full overflow-visible" role="img" aria-label="Sample line graph of interns joining Subtle, May to August, ending at 400">
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A9C7E8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#A9C7E8" stopOpacity="0" />
              </linearGradient>
              <clipPath id="reveal">
                <rect x="0" y="0" width={clipWidth} height={H} />
              </clipPath>
            </defs>

            {/* gridlines + y labels */}
            {yLabels.map((n) => (
              <g key={n}>
                <line x1={L} x2={W - R} y1={yAt(n)} y2={yAt(n)} stroke={n === 0 ? '#C9DBEA' : '#E4EAF1'} strokeWidth="1" />
                <text x={L - 12} y={yAt(n) + 5} textAnchor="end" fontSize="13" fill="#4A5A75">
                  {n}
                </text>
              </g>
            ))}

            {/* month labels */}
            {periods.map((p, i) =>
              p.month ? (
                <text key={p.label} x={xAt(i)} y={H - 14} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1E2B44">
                  {p.month}
                </text>
              ) : null
            )}

            {/* area + line, revealed left to right */}
            <g clipPath="url(#reveal)">
              <path d={areaPath} fill="url(#areaFill)" />
              <path d={linePath} fill="none" stroke="#2F4161" strokeWidth="3.5" strokeLinecap="round" />
            </g>

            {/* dots appear as the line reaches them */}
            {points.map(([x, y], i) => {
              if (x > clipWidth) return null
              const active = hover === i
              return (
                <g key={periods[i].label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <circle cx={x} cy={y} r="16" fill="transparent" />
                  <circle cx={x} cy={y} r={active ? 8 : 6} fill="#C27A4A" stroke="#FFFFFF" strokeWidth="2.5" />
                  {active && (
                    <g>
                      <rect x={x - 66} y={y - 60} width="132" height="44" rx="10" fill="#1E2B44" />
                      <text x={x} y={y - 42} textAnchor="middle" fontSize="12" fill="#C9DBEA">
                        {periods[i].label}
                      </text>
                      <text x={x} y={y - 25} textAnchor="middle" fontSize="14" fontWeight="700" fill="#FFFFFF">
                        {cumulative[i]} interns (+{periods[i].joined})
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* quotes overlap the bottom of the graph card */}
        <div className="relative -mt-16 grid gap-6 px-4 md:grid-cols-2 md:px-7">
          {quotes.map((q, i) => (
            <figure
              key={q.who}
              className={`rounded-3xl bg-white p-7 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] transition-all duration-1000 ease-out hover:-translate-y-1 ${
                started ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
              style={{ transitionDelay: started ? `${600 + i * 300}ms` : '0ms' }}
            >
              <blockquote className="font-[family-name:var(--font-serif)] text-[23px] leading-snug">&ldquo;{q.text}&rdquo;</blockquote>
              <figcaption className="mt-5 flex items-center gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white ${i === 0 ? 'bg-[#1E2B44]' : 'bg-[#A35F33]'}`}
                >
                  {q.who[0]}
                </span>
                <span>
                  {q.who} · {q.when} · <span className="text-[#4A5A75]">sample quote</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
