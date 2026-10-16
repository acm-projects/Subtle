'use client'

import { useEffect, useRef, useState } from 'react'

const quotes = [
  { text: 'I came for a sublet and left with a roommate I still talk to.', who: 'Aisha' },
  { text: 'Subtle took the stress out of finding a place to live.', who: 'Leo' },
]

// Intern quotes (the interns graph was removed)
export default function Section3() {
  const ref = useRef<HTMLElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => entry.isIntersecting && setStarted(true), { threshold: 0.35 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative px-4 pb-32 pt-4 md:px-8">
      <div className="mx-auto max-w-[1000px]">
        <h2
          className={`mb-8 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] transition-all duration-1000 ease-out md:text-[56px] ${
            started ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          What interns say
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {quotes.map((q, i) => (
            <figure
              key={q.who}
              className={`rounded-3xl border border-white bg-white/85 p-7 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl transition-all duration-1000 ease-out hover:-translate-y-1 ${
                started ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
              style={{ transitionDelay: started ? `${200 + i * 300}ms` : '0ms' }}
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
