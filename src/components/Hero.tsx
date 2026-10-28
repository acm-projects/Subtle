'use client'

import { useEffect, useRef, useState } from 'react'

const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'
const SWAP_AT = 1600 // ms before the swap starts
const SWAP_MS = 700 // how long the swap takes

const features = [
  { title: 'Verified housing', body: 'Every listing checked first.', icon: 'home' },
  { title: 'Post a Listing', body: 'Lease a home to interns.', icon: 'clock' },
  { title: 'Built-in community', body: 'Meet interns nearby.', icon: 'people' },
] as const

function Icon({ name }: { name: 'home' | 'clock' | 'people' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'home' && <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
      {name === 'clock' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {name === 'people' && (
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
        </>
      )}
    </svg>
  )
}

export default function Hero() {
  const [show, setShow] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const [w, setW] = useState({ l: 0, e: 0, t: 0 })
  const lRef = useRef<HTMLSpanElement>(null)
  const eRef = useRef<HTMLSpanElement>(null)
  const tRef = useRef<HTMLSpanElement>(null)

  // measure letter widths so the swap lines up at any screen size
  useEffect(() => {
    const measure = () =>
      setW({
        l: lRef.current?.offsetWidth ?? 0,
        e: eRef.current?.offsetWidth ?? 0,
        t: tRef.current?.offsetWidth ?? 0,
      })
    measure()
    document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    setShow(true)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // sublet -> subtle
  useEffect(() => {
    const timer = setTimeout(() => {
      const l = lRef.current
      const e = eRef.current
      const t = tRef.current
      if (!l || !e || !t) {
        setSwapped(true)
        return
      }
      const wl = l.offsetWidth
      const we = e.offsetWidth
      const wt = t.offsetWidth
      const opts = { duration: SWAP_MS, easing: EASE, fill: 'forwards' as const }

      // l and e slide right by the width of t
      l.animate([{ transform: `translateX(${-wt}px)` }, { transform: 'translateX(0)' }], opts)
      e.animate([{ transform: `translateX(${-wt}px)` }, { transform: 'translateX(0)' }], opts)

      // t hops up and over l and e to the front
      const hop = t.animate(
        [
          { transform: `translate(${wl + we}px, 0)` },
          { transform: `translate(${(wl + we) / 2}px, -0.16em)`, offset: 0.5 },
          { transform: 'translate(0, 0)' },
        ],
        opts
      )
      hop.onfinish = () => setSwapped(true)
    }, SWAP_AT)
    return () => clearTimeout(timer)
  }, [])

  const state = show ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
  const start = (px: number) => ({ transform: swapped ? 'none' : `translateX(${px}px)` })

  return (
    <section className="relative flex min-h-screen flex-col px-4 pb-10 pt-28 text-white md:px-8">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#1E2B44]/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur-xl transition-all delay-100 duration-1000 ease-out ${state}`}
        >
          <Icon name="home" />
          Verified student housing
        </span>

        <h1
          aria-label="subtle."
          className={`mt-4 font-[family-name:var(--font-serif)] text-8xl font-medium leading-[0.92] tracking-[-0.045em] [text-shadow:0_10px_40px_rgba(30,43,68,0.35)] transition-all delay-200 duration-1000 ease-out md:text-[12.5rem] ${state}`}
        >
          <span aria-hidden="true">
            sub
            <span ref={tRef} className="inline-block" style={start(w.l + w.e)}>t</span>
            <span ref={lRef} className="inline-block" style={start(-w.t)}>l</span>
            <span ref={eRef} className="inline-block" style={start(-w.t)}>e</span>
            .
          </span>
        </h1>

        <p
          className={`mt-4 font-[family-name:var(--font-serif)] text-3xl italic transition-all delay-500 duration-1000 ease-out md:text-[32px] ${state}`}
        >
          find your home today with subtle.
        </p>
      
      </div>

      <div className={`relative mx-auto w-full max-w-6xl transition-all delay-1000 duration-1000 ease-out ${state}`}>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3.5 rounded-[20px] border border-white/25 bg-[#1E2B44]/40 px-[18px] py-4 backdrop-blur-xl transition hover:-translate-y-1"
            >
              <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white/20">
                <Icon name={f.icon} />
              </span>
              <span className="leading-snug">
                <strong className="block font-[family-name:var(--font-serif)] text-[21px] font-medium">{f.title}</strong>
                <span className="text-[13px]">{f.body}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
