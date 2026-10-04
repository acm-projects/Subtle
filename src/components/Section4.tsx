'use client'

import { useEffect, useRef, useState } from 'react'

const explore = ['How It Works', 'Browse Cities']

export default function Section4() {
  const ref = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setSeen(true),
      { threshold: 0.3 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const reveal = seen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'

  return (
    <section ref={ref} className="relative bg-[#392b22] font-[family-name:var(--font-body)]">
      {/* call to action */}
      <div className="px-8 py-32 text-center md:px-20">
        <div className={`mx-auto max-w-3xl transition-all duration-1000 ease-out ${reveal}`}>
          <h2 className="font-[family-name:var(--font-serif)] text-4xl font-semibold text-[#d5b894] md:text-5xl">
            find your home today with subtle.
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-[family-name:var(--font-serif)] text-xl italic leading-relaxed text-[#eadfce] md:text-2xl">
            Join the summer program students and tech interns booking safely for Summer 2027.
          </p>
        </div>
      </div>

      {/* footer */}
      <footer className="bg-[#2c2119] px-8 pb-8 pt-14 md:px-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#d5b894]">subtle.</div>
            <p className="mt-4 text-sm leading-relaxed text-[#b0a08c]">
              Simplifying, vetting, and unifying summer housing for the next generation of industry leaders.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#f1e6d6]">Explore</h4>
            <ul className="mt-4 space-y-3 text-sm text-[#b0a08c]">
              {explore.map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-[#d5b894]">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#9c8b77] md:flex-row md:justify-between">
          <span>&copy; 2027 Subtle Technologies, Inc. All rights reserved.</span>
          <span>
            <a href="#" className="hover:text-[#d5b894]">Terms of Service</a>
            {' · '}
            <a href="#" className="hover:text-[#d5b894]">Privacy Policy</a>
          </span>
        </div>
      </footer>
    </section>
  )
}