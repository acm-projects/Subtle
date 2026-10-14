'use client'

import { useEffect, useRef, useState } from 'react'

// Visual only: the line's shape, with no numbers or data behind it yet.
// Each value is a height from 0 (bottom) to 1 (top). Swap for real data later.
const shape = [0.1, 0.18, 0.3, 0.36, 0.53, 0.66, 0.8, 0.9]

const quotes = [
  { text: 'I came for a sublet and left with a roommate I still talk to.', who: 'Aisha' },
  { text: 'Subtle took the stress out of finding a place to live.', who: 'Leo' },
]

// chart geometry
const W = 640
const H = 380
const L = 24
const R = 24
const T = 40
const B = 32
const gridlines = [0, 0.25, 0.5, 0.75, 1]

const xAt = (i: number) => L + (i * (W - L - R)) / (shape.length - 1)
const yAt = (v: number) => T + (1 - v) * (H - T - B)

const points: [number, number][] = shape.map((v, i) => [xAt(i), yAt(v)])

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
              A growing intern community · <strong className="text-[#1E2B44]">Illustration, not real data</strong>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1E2B44] px-4 py-2 text-xs font-semibold text-white">
              <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-[#F3C9A0]" />
              Live numbers coming soon
            </span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full overflow-visible" role="img" aria-label="Illustration of a rising line graph. No real data yet.">
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A9C7E8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#A9C7E8" stopOpacity="0" />
              </linearGradient>
              <clipPath id="reveal">
                <rect x="0" y="0" width={clipWidth} height={H} />
              </clipPath>
            </defs>

            {/* gridlines only, no labels */}
            {gridlines.map((v) => (
              <line key={v} x1={L} x2={W - R} y1={yAt(v)} y2={yAt(v)} stroke={v === 0 ? '#C9DBEA' : '#E4EAF1'} strokeWidth="1" />
            ))}

            {/* area + line, revealed left to right */}
            <g clipPath="url(#reveal)">
              <path d={areaPath} fill="url(#areaFill)" />
              <path d={linePath} fill="none" stroke="#2F4161" strokeWidth="3.5" strokeLinecap="round" />
            </g>

            {/* dots appear as the line reaches them */}
            {points.map(([x, y], i) =>
              x > clipWidth ? null : (
                <circle key={i} cx={x} cy={y} r="6" fill="#C27A4A" stroke="#FFFFFF" strokeWidth="2.5" className="animate-[fadeIn_.4s_ease-out]" />
              )
            )}
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
                  {q.who} · <span className="text-[#4A5A75]">sample quote</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
