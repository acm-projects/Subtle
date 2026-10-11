'use client'

import { useEffect, useRef, useState } from 'react'

// a lit-up house at dusk
function House() {
  return (
    <div aria-hidden="true" className="relative hidden h-[360px] self-end md:block">
      <div className="absolute right-8 top-8 h-[54px] w-[54px] rounded-full bg-[#FBF3EA] shadow-[0_0_40px_rgba(251,243,234,0.5)]" />
      <div className="absolute bottom-0 left-1/2 h-[300px] w-[340px] -translate-x-1/2">
        <div className="absolute right-16 top-2.5 h-[70px] w-9 bg-[#2F4161]" />
        <div className="absolute inset-x-0 top-[30px] h-[120px] bg-[#3A5079] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
        <div className="animate-glow absolute left-1/2 top-[92px] h-11 w-11 -translate-x-1/2 rounded-full bg-[#F3C9A0] shadow-[0_0_24px_rgba(243,201,160,0.8)]" />
        <div className="absolute inset-x-6 bottom-0 h-[150px] rounded-t bg-[#2F4161]">
          <div className="animate-glow absolute left-[26px] top-[26px] h-[52px] w-[58px] rounded-md bg-[#F3C9A0] shadow-[0_0_30px_rgba(243,201,160,0.7)]" />
          <div className="animate-glow-slow absolute right-[26px] top-[26px] h-[52px] w-[58px] rounded-md bg-[#F3C9A0] shadow-[0_0_30px_rgba(243,201,160,0.7)]" />
          <div className="absolute left-[54px] top-[26px] h-[52px] w-[3px] bg-[#2F4161]" />
          <div className="absolute right-[54px] top-[26px] h-[52px] w-[3px] bg-[#2F4161]" />
          <div className="absolute bottom-0 left-1/2 h-[92px] w-[52px] -translate-x-1/2 rounded-t-[26px] bg-[#C27A4A]">
            <span className="absolute right-2.5 top-[50px] h-1.5 w-1.5 rounded-full bg-[#FBF3EA]" />
          </div>
        </div>
      </div>
    </div>
  )
}

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
        <div className="relative pb-16">
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
        <House />
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
