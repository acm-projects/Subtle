'use client'

import { useEffect, useRef, useState } from 'react'
import HouseMascot from './HouseMascot'

export default function Section4() {
  const ref = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const reveal = seen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'

  return (
    <section id="cities" ref={ref} className="relative scroll-mt-24 px-4 pb-10 md:px-8">
      {/* call to action */}
      <div
        className={`relative mx-auto grid max-w-[1000px] items-center gap-10 overflow-hidden rounded-[36px] bg-[#1E2B44] px-8 pt-16 transition-all duration-1000 ease-out md:grid-cols-2 md:px-14 ${reveal}`}
      >
        <div aria-hidden="true" className="absolute right-10 top-16 h-[360px] w-[360px] rounded-full bg-[#F3C9A0] opacity-25 blur-[110px]" />
        <div className="relative pb-4 md:pb-16">
          <h2 className="font-[family-name:var(--font-serif)] text-5xl font-medium leading-[1.04] tracking-[-0.02em] text-white md:text-[54px]">
            find your home today with subtle.
          </h2>
          <p className="mt-4 max-w-sm text-[17px] text-white">Join the students and interns booking safely with Subtle.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/login?mode=signup" className="rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-[#1E2B44] transition hover:-translate-y-0.5 hover:bg-[#FBF3EA]">
              Create your account
            </a>
            <a href="#cities" className="rounded-full border border-white/60 bg-white/10 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20">
              Browse cities
            </a>
          </div>
        </div>
        <div
          className={`relative mx-auto h-[260px] w-[232px] self-end transition-all delay-300 duration-1000 ease-out md:h-[380px] md:w-[340px] ${
            seen ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
          }`}
        >
          <HouseMascot label="Subtle's house mascot waving hello" shadowColor="#0B1322" className="h-full w-full" />
        </div>
      </div>

      {/* footer */}
      <footer className="mx-auto mt-20 max-w-[1000px] rounded-[28px] border border-white bg-white/60 px-9 pb-5 pt-9 backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <a href="/" className="font-[family-name:var(--font-serif)] text-[28px] font-medium">
              subtle.
            </a>
            <p className="mt-2 text-sm text-[#4A5A75]">
              Simplifying, vetting, and unifying summer housing for the next generation of industry leaders.
            </p>
          </div>
        </div>
        <div className="mt-7 flex flex-col justify-between gap-3 border-t border-[#E4EAF1] pt-4 text-[13px] text-[#4A5A75] md:flex-row">
          <span>&copy; 2026 Subtle Technologies, Inc. All rights reserved.</span>
          <span className="flex gap-3.5">
            <a href="#" className="hover:text-[#1E2B44]">Terms of Service</a>
            <a href="#" className="hover:text-[#1E2B44]">Privacy Policy</a>
          </span>
        </div>
      </footer>
    </section>
  )
}
