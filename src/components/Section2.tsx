'use client'

import { useEffect, useRef, useState } from 'react'

// sample listings (made up, labeled as sample on the page)
const listings = [
  { x: 31, y: 29, area: 'Echo Park', score: 84, price: 800, type: 'Private room', commute: '4 min to work', dates: 'Jun - Aug' },
  { x: 38, y: 38, area: 'Silver Lake', score: 91, price: 950, type: 'Shared room', commute: '12 min to work', dates: 'Jun - Aug' },
  { x: 50, y: 41, area: 'Downtown', score: 96, price: 1250, type: 'Studio', commute: '6 min to work', dates: 'May - Aug' },
  { x: 53, y: 21, area: 'Chinatown', score: 78, price: 900, type: 'Private room', commute: '10 min to work', dates: 'Jun - Sep' },
  { x: 60, y: 31, area: 'Little Tokyo', score: 89, price: 1100, type: '2 bed, 1 spot open', commute: '8 min to work', dates: 'Jun - Aug' },
  { x: 55, y: 47, area: 'Arts District', score: 82, price: 1300, type: 'Studio', commute: '9 min to work', dates: 'Jun - Aug' },
  { x: 52, y: 55, area: 'Historic Core', score: 93, price: 1050, type: 'Private room', commute: '5 min to work', dates: 'May - Aug' },
  { x: 26, y: 59, area: 'Koreatown', score: 74, price: 750, type: 'Shared room', commute: '15 min to work', dates: 'Jun - Aug' },
  { x: 16, y: 73, area: 'Mid-Wilshire', score: 71, price: 850, type: 'Private room', commute: '18 min to work', dates: 'Jun - Aug' },
  { x: 52, y: 85, area: 'Pico-Union', score: 68, price: 700, type: 'Shared room', commute: '14 min to work', dates: 'Jun - Aug' },
  { x: 71, y: 59, area: 'Boyle Heights', score: 80, price: 800, type: 'Private room', commute: '11 min to work', dates: 'Jun - Sep' },
  { x: 77, y: 54, area: 'Lincoln Heights', score: 76, price: 775, type: '3 bed, 1 spot open', commute: '16 min to work', dates: 'Jun - Aug' },
  { x: 84, y: 69, area: 'El Sereno', score: 65, price: 725, type: 'Private room', commute: '20 min to work', dates: 'Jun - Aug' },
]

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5

// Subtle score (sample): green for great matches, warmer as the score drops.
// Every color keeps white text above 4.5:1 contrast.
function scoreColor(score: number) {
  if (score >= 90) return '#2E7D4F'
  if (score >= 80) return '#4F7F2F'
  if (score >= 70) return '#7A6A12'
  return '#A35F33'
}

function Pin({ item, px, py, hidden }: { item: (typeof listings)[number]; px: number; py: number; hidden: boolean }) {
  const below = py < 50
  const hAlign = px < 24 ? 'left-0' : px > 76 ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <button
      type="button"
      tabIndex={hidden ? -1 : 0}
      className={`group absolute z-10 -translate-x-1/2 -translate-y-full transition-[left,top,opacity] duration-300 ease-out hover:z-30 focus:z-30 focus:outline-none ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ left: `${px}%`, top: `${py}%` }}
      aria-label={`Sample listing: ${item.area}, ${item.type}, $${item.price} per month, Subtle score ${item.score}`}
    >
      {/* house-shaped pin */}
      <svg
        className="origin-bottom drop-shadow-[0_6px_10px_rgba(30,43,68,0.35)] transition-transform duration-200 group-hover:scale-125 group-focus:scale-125"
        width="30"
        height="33"
        viewBox="0 0 44 48"
        aria-hidden="true"
      >
        <path
          className="fill-[#1E2B44] transition-colors group-hover:fill-[#C27A4A] group-focus:fill-[#C27A4A]"
          d="M22 2 L42 18 V36 a4 4 0 0 1 -4 4 H28 L22 47 L16 40 H6 a4 4 0 0 1 -4 -4 V18 Z"
        />
        <rect x="17" y="22" width="10" height="12" rx="2" fill="#FFFFFF" />
      </svg>

      <div
        className={`pointer-events-none invisible absolute w-64 rounded-[18px] bg-white p-4 text-left text-xs text-[#1E2B44] opacity-0 shadow-[0_24px_50px_-20px_rgba(30,43,68,0.45)] transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 ${hAlign} ${
          below ? 'top-full mt-2' : 'bottom-full mb-10'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-[0_6px_14px_-6px_rgba(30,43,68,0.6)]"
            style={{ backgroundColor: scoreColor(item.score) }}
            aria-label={`Subtle score ${item.score} out of 100`}
          >
            {item.score}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-bold">{item.area}</span>
              <span className="text-sm font-bold text-[#A35F33]">${item.price.toLocaleString()}/mo</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A5A75]">Subtle score</span>
          </span>
        </div>
        <p className="mt-1 text-[13px] text-[#4A5A75]">
          {item.type} · {item.commute}
        </p>
        <span className="mt-2.5 inline-block rounded-full bg-[#1E2B44] px-2.5 py-1 text-[11px] font-bold text-white">
          Available {item.dates}
        </span>
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A5A75]">Sample listing</span>
      </div>
    </button>
  )
}

export default function Section2() {
  const [seen, setSeen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const zoomIn = () => setZoom((z) => Math.min(+(z + ZOOM_STEP).toFixed(1), MAX_ZOOM))
  const zoomOut = () => setZoom((z) => Math.max(+(z - ZOOM_STEP).toFixed(1), MIN_ZOOM))

  const reveal = seen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'

  return (
    <section id="how" ref={ref} className="relative scroll-mt-24 px-4 pb-24 pt-28 md:px-8">
      <div className={`mx-auto max-w-3xl text-center transition-all duration-1000 ease-out ${reveal}`}>
        <h2 className="font-[family-name:var(--font-serif)] text-5xl font-medium leading-[1.02] tracking-[-0.02em] md:text-[64px]">
          Let subtle do the work.
        </h2>
        <p className="mt-2 font-[family-name:var(--font-serif)] text-[34px] italic text-[#2F4161]">So you can do yours.</p>
        <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-[#4A5A75]">
          Subtle makes moving somewhere new for an internship or summer program feel easier, safer, and more social.
        </p>
      </div>

      {/* commute map card */}
      <div
        className={`mx-auto mt-14 max-w-[1000px] rounded-[32px] border border-white bg-white/85 px-3 pt-3 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl transition-all delay-200 duration-1000 ease-out ${reveal}`}
      >
        <div className="relative aspect-[980/400] overflow-hidden rounded-3xl bg-white">
          {/* zoomable background (pins are separate so they keep their size) */}
          <div
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}
          >
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 980 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <defs>
                <pattern id="mapGrid" width="44" height="44" patternUnits="userSpaceOnUse">
                  <path d="M44 0H0V44" fill="none" stroke="#EEF3F8" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="980" height="520" fill="#FFFFFF" />
              <rect width="980" height="520" fill="url(#mapGrid)" />
              <ellipse cx="220" cy="150" rx="80" ry="46" fill="#F4EBE0" />
              <ellipse cx="760" cy="400" rx="70" ry="40" fill="#F4EBE0" />
              <g fill="none" stroke="#C9DBEA" strokeLinecap="round">
                <path d="M40 520 L470 250 L960 0" strokeWidth="14" />
                <path d="M0 300 L980 270" strokeWidth="12" />
                <path d="M420 0 L520 520" strokeWidth="16" />
                <path d="M120 0 L540 330 L760 520" strokeWidth="9" />
                <path d="M980 120 L470 250" strokeWidth="7" />
              </g>
            </svg>
          </div>

          {listings.map((item) => {
            const px = 50 + (item.x - 50) * zoom
            const py = 50 + (item.y - 50) * zoom
            const hidden = px < 3 || px > 97 || py < 8 || py > 97
            return <Pin key={`${item.x}-${item.y}`} item={item} px={px} py={py} hidden={hidden} />
          })}

          <div className="absolute right-3.5 top-3.5 z-20 flex flex-col rounded-[14px] border border-white bg-white/85 p-1 text-[#1E2B44] shadow-sm backdrop-blur">
            <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className="h-11 w-11 rounded-[10px] text-xl hover:bg-[#EEF3F8] disabled:opacity-40">
              +
            </button>
            <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" className="h-11 w-11 rounded-[10px] text-xl hover:bg-[#EEF3F8] disabled:opacity-40">
              −
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-2.5 pb-4 pt-3.5 text-[13px] font-semibold">
          <span>Interactive commute map</span>
          <span className="text-[#4A5A75]">Hover a home · sample listings</span>
        </div>
      </div>
    </section>
  )
}
