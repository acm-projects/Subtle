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
    <section
      ref={ref}
      className="relative overflow-hidden bg-[#140e0b] px-8 py-24 font-[family-name:var(--font-body)] md:px-20"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-[1.7fr_1fr]">
        {/* graph */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h3 className="font-[family-name:var(--font-serif)] text-3xl text-[#e6ddd2] md:text-4xl">
              Interns joining Subtle
            </h3>
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums text-[#d9a06b]">
                {count}
              </div>
              <div className="text-xs uppercase tracking-widest text-[#a8957f]">interns and counting</div>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mt-6 w-full overflow-visible"
            role="img"
            aria-label="Interns joining Subtle over the summer"
          >
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8a5328" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#8a5328" stopOpacity="0.04" />
              </linearGradient>
              <clipPath id="reveal">
                <rect x="0" y="0" width={clipWidth} height={H} />
              </clipPath>
            </defs>

            <text x="4" y="24" fontSize="16" fill="#d8cfc4">
              Interns
            </text>

            {/* y labels */}
            {yLabels.map((n) => (
              <text key={n} x={L - 12} y={yAt(n) + 5} textAnchor="end" fontSize="16" fill="#d8cfc4">
                {n}
              </text>
            ))}

            {/* axes */}
            <line x1={L} x2={L} y1={T} y2={H - B} stroke="#8c8279" strokeWidth="1.5" />
            <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#8c8279" strokeWidth="1.5" />

            {/* month labels */}
            {periods.map((p, i) =>
              p.month ? (
                <text key={p.label} x={xAt(i)} y={H - 14} textAnchor="middle" fontSize="17" fill="#d8cfc4">
                  {p.month}
                </text>
              ) : null
            )}

            {/* area + line, revealed left to right */}
            <g clipPath="url(#reveal)">
              <path d={areaPath} fill="url(#areaFill)" />
              <path d={linePath} fill="none" stroke="#cc8a52" strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* dots appear as the line reaches them */}
            {points.map(([x, y], i) => {
              if (x > clipWidth) return null
              const active = hover === i
              return (
                <g key={periods[i].label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <circle cx={x} cy={y} r="16" fill="transparent" />
                  <circle cx={x} cy={y} r={active ? 8 : 6} fill="#cc8a52" stroke="#140e0b" strokeWidth="2" />
                  {active && (
                    <g>
                      <rect x={x - 62} y={y - 58} width="124" height="42" rx="8" fill="#2a211b" stroke="#3a2f27" />
                      <text x={x} y={y - 40} textAnchor="middle" fontSize="12" fill="#b9a994">
                        {periods[i].label}
                      </text>
                      <text x={x} y={y - 24} textAnchor="middle" fontSize="14" fontWeight="700" fill="#f3ece3">
                        {cumulative[i]} interns (+{periods[i].joined})
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>

          <p className="mt-2 text-center text-sm tracking-wide text-[#a8957f]">Summer 2026 · Sample data</p>
        </div>

        {/* quotes slide in from the right, one after the other */}
        <div className="flex flex-col gap-6">
          {quotes.map((q, i) => (
            <figure
              key={q.who}
              className={`rounded-2xl border border-[#3a2f27] bg-[#2a211b] p-8 transition-all duration-1000 ease-out ${
                started ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'
              }`}
              style={{ transitionDelay: started ? `${500 + i * 350}ms` : '0ms' }}
            >
              <blockquote className="font-[family-name:var(--font-serif)] text-2xl font-semibold leading-snug text-[#f3ece3]">
                &ldquo;{q.text}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm text-[#b98b5e]">
                {q.who} · {q.when}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}