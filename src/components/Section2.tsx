'use client'

import { useEffect, useRef, useState } from 'react'

const listings = [
  { x: 31, y: 29, area: 'Echo Park', price: 800, type: 'Private room', commute: '4 min to work', dates: 'Jun - Aug' },
  { x: 38, y: 38, area: 'Silver Lake', price: 950, type: 'Shared room', commute: '12 min to work', dates: 'Jun - Aug' },
  { x: 50, y: 41, area: 'Downtown', price: 1250, type: 'Studio', commute: '6 min to work', dates: 'May - Aug' },
  { x: 53, y: 21, area: 'Chinatown', price: 900, type: 'Private room', commute: '10 min to work', dates: 'Jun - Sep' },
  { x: 60, y: 31, area: 'Little Tokyo', price: 1100, type: '2 bed, 1 spot open', commute: '8 min to work', dates: 'Jun - Aug' },
  { x: 55, y: 47, area: 'Arts District', price: 1300, type: 'Studio', commute: '9 min to work', dates: 'Jun - Aug' },
  { x: 52, y: 55, area: 'Historic Core', price: 1050, type: 'Private room', commute: '5 min to work', dates: 'May - Aug' },
  { x: 26, y: 59, area: 'Koreatown', price: 750, type: 'Shared room', commute: '15 min to work', dates: 'Jun - Aug' },
  { x: 16, y: 73, area: 'Mid-Wilshire', price: 850, type: 'Private room', commute: '18 min to work', dates: 'Jun - Aug' },
  { x: 52, y: 85, area: 'Pico-Union', price: 700, type: 'Shared room', commute: '14 min to work', dates: 'Jun - Aug' },
  { x: 71, y: 59, area: 'Boyle Heights', price: 800, type: 'Private room', commute: '11 min to work', dates: 'Jun - Sep' },
  { x: 77, y: 54, area: 'Lincoln Heights', price: 775, type: '3 bed, 1 spot open', commute: '16 min to work', dates: 'Jun - Aug' },
  { x: 84, y: 69, area: 'El Sereno', price: 725, type: 'Private room', commute: '20 min to work', dates: 'Jun - Aug' },
]

// real aerial imagery of downtown LA (Esri World Imagery), high-res so zooming stays sharp
const SATELLITE_URL = '/images/la-satellite.jpg'

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5

function Pin({
  item,
  px,
  py,
  satellite,
  hidden,
}: {
  item: (typeof listings)[number]
  px: number
  py: number
  satellite: boolean
  hidden: boolean
}) {
  const below = py < 38
  const hAlign = px < 24 ? 'left-0' : px > 76 ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <button
      type="button"
      tabIndex={hidden ? -1 : 0}
      className={`group absolute z-10 -translate-x-1/2 -translate-y-full transition-[left,top,opacity] duration-300 ease-out hover:z-30 focus:z-30 focus:outline-none ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ left: `${px}%`, top: `${py}%` }}
      aria-label={`${item.area}, $${item.price} per month`}
    >
      <svg
        className="origin-bottom drop-shadow-md transition-transform duration-200 group-hover:scale-125 group-focus:scale-125"
        width="22"
        height="28"
        viewBox="0 0 24 30"
        fill="none"
      >
        <path
          d="M12 0C5.4 0 0 5.2 0 11.6 0 20 12 30 12 30s12-10 12-18.4C24 5.2 18.6 0 12 0z"
          fill={satellite ? '#2a1f1a' : '#c9a07a'}
          stroke={satellite ? '#c9a07a' : 'none'}          strokeWidth="1.5"
        />
        <circle cx="12" cy="11.5" r="4.2" fill={satellite ? '#c9a07a' : '#2a1f1a'} />      </svg>
      <div
        className={`pointer-events-none invisible absolute w-52 rounded-xl border border-white/15 bg-[#2a1f1a] p-3.5 text-left text-xs opacity-0 shadow-2xl transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 ${hAlign} ${
          below ? 'top-full mt-2' : 'bottom-full mb-9'
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-[#f1e6d6]">{item.area}</span>
          <span className="font-bold text-[#d1b89a]">${item.price}/mo</span>
        </div>
        <p className="mt-1.5 text-[#e8dccb]">{item.type}</p>
        <p className="mt-0.5 text-[#c9b9a4]">{item.commute}</p>
        <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2.5">
          <span className="text-[#c9b9a4]">{item.dates}</span>
          <span className="rounded-full bg-[#b89168] px-2.5 py-0.5 font-semibold text-white">Available</span>
        </div>
      </div>
    </button>
  )
}

export default function Section2() {
  const [dim, setDim] = useState(0)
  const [seen, setSeen] = useState(false)
  const [tab, setTab] = useState<'map' | 'satellite'>('map')
  const [zoom, setZoom] = useState(1)
  const ref = useRef<HTMLElement>(null)

    useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight
      const p = Math.min(window.scrollY / (vh * 0.8), 1)
      let extra = 0
      if (ref.current) {
        const bottom = ref.current.getBoundingClientRect().bottom
        extra = Math.min(Math.max((vh * 0.6 - bottom) / (vh * 0.6 - 80), 0), 1)
      }
      setDim(p * 0.65 + extra * 0.35)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setSeen(true),
      { threshold: 0.25 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const zoomIn = () => setZoom((z) => Math.min(+(z + ZOOM_STEP).toFixed(1), MAX_ZOOM))
  const zoomOut = () => setZoom((z) => Math.max(+(z - ZOOM_STEP).toFixed(1), MIN_ZOOM))

  const reveal = seen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
  const satellite = tab === 'satellite'

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center px-8 pb-16 pt-24 font-[family-name:var(--font-body)] md:px-20"
    >
      {/* dims the fixed photo as you scroll */}
      <div
        className="pointer-events-none fixed inset-0 -z-[5] bg-[#140e0b]"
        style={{ opacity: dim }}
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 md:grid-cols-[1.1fr_1fr]">
        {/* left column */}
        <div className={`transition-all duration-1000 ease-out ${reveal}`}>
          <span className="inline-block rounded-full border border-[#d1b89a]/60 bg-black/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#e8dccb]">
            Summer 2027 Enrollment Open
          </span>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-5xl font-bold text-white md:text-6xl">
            Let subtle do the work.
          </h2>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl italic text-[#f1e6d6]">
            So you can do yours.
          </p>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#f1e6d6]">
            Subtle makes moving somewhere new for an internship or summer program feel easier, safer, and more social.
          </p>
    
        </div>

        {/* map card */}
        <div
          className={`rounded-[2rem] border border-white/10 bg-[#33271f]/95 p-4 shadow-2xl transition-all delay-300 duration-1000 ease-out ${reveal}`}
        >
          <div className="relative aspect-[612/546] overflow-hidden rounded-2xl bg-[#1f1612]">
            {/* zoomable background (pins are separate so they keep their size) */}
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{ transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}
            >
              {!satellite ? (
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 612 546" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                    </pattern>
                  </defs>
                  <rect width="612" height="546" fill="url(#grid)" />
                  <g stroke="#b88a66" strokeWidth="7" strokeLinecap="round" fill="none">
                    <path d="M0 240 Q300 252 612 212" />
                    <path d="M255 0 L318 546" />
                    <path d="M115 0 L495 546" />
                    <path d="M520 0 L95 546" />
                  </g>
                </svg>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SATELLITE_URL}
                    alt="Satellite view of Los Angeles"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/15" />
                </>
              )}
            </div>

            {listings.map((item) => {
              const px = 50 + (item.x - 50) * zoom
              const py = 50 + (item.y - 50) * zoom
              const hidden = px < 3 || px > 97 || py < 6 || py > 97
              return (
                <Pin
                  key={`${item.x}-${item.y}`}
                  item={item}
                  px={px}
                  py={py}
                  satellite={satellite}
                  hidden={hidden}
                />
              )
            })}

            <div className="absolute left-3 top-3 z-20 flex overflow-hidden rounded-lg border border-white/10 bg-[#2a1f1a] text-xs font-semibold">
              <button
                onClick={() => setTab('map')}
                className={`px-4 py-2 ${tab === 'map' ? 'bg-[#b89168] text-white' : 'text-[#e8dccb]'}`}
              >
                Map
              </button>
              <button
                onClick={() => setTab('satellite')}
                className={`px-4 py-2 ${tab === 'satellite' ? 'bg-[#b89168] text-white' : 'text-[#e8dccb]'}`}
              >
                Satellite
              </button>
            </div>

            <div className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#2a1f1a] text-[#f1e6d6]">
              <button
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                className="px-3 py-1.5 text-sm font-bold hover:bg-[#3d312a] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                +
              </button>
              <button
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                className="border-t border-white/10 px-3 py-1.5 text-sm font-bold hover:bg-[#3d312a] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                −
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pb-1 pt-4 text-sm text-[#f1e6d6]">
            <span className="flex items-center gap-2 font-semibold">
              <svg width="14" height="16" viewBox="0 0 24 30" fill="#c9a07a">
                <path d="M12 0C5.4 0 0 5.2 0 11.6 0 20 12 30 12 30s12-10 12-18.4C24 5.2 18.6 0 12 0z" />
              </svg>
              Interactive Commute Map
            </span>
            <span className="text-[#d8c9b5]">Verified Housing</span>
          </div>
        </div>
      </div>
    </section>
  )
}