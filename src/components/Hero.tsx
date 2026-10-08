'use client'

import { useEffect, useRef, useState } from 'react'

const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'
const SWAP_AT = 1600 // ms before the swap starts
const SWAP_MS = 700 // how long the swap takes

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
    <section className="flex min-h-screen flex-col items-center justify-between px-6 pb-20 pt-36 text-center">
      <h1
        aria-label="subtle."
        className={`font-[family-name:var(--font-serif)] text-8xl font-bold tracking-tight text-[#7d6d60] transition-all delay-200 duration-1000 ease-out md:text-[10rem] md:leading-none ${state}`}
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
        className={`font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#D1B89A] drop-shadow-md transition-all delay-700 duration-1000 ease-out md:text-4xl ${state}`}
      >
        find your home today with subtle.
      </p>
    </section>
  )
}