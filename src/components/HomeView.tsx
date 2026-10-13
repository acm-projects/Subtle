'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AppNavbar from './AppNavbar'

// a cozy house at dusk inside a glass card (no photo, matches the landing page's closing house)
function HouseScene() {
  return (
    <div className="relative h-full min-h-[440px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#A9C7E8] via-[#C9DBEA] to-[#F3E3D2]">
      <div aria-hidden="true">
        <div className="absolute right-12 top-14 h-16 w-16 rounded-full bg-[#FBF3EA] shadow-[0_0_60px_rgba(251,243,234,0.9)]" />
        <div className="absolute -left-10 top-24 h-10 w-44 rounded-full bg-white/60 blur-[2px]" />
        <div className="absolute right-24 top-40 h-8 w-32 rounded-full bg-white/50 blur-[2px]" />
        {/* far hills */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[#8FA6BF]/60 [clip-path:ellipse(70%_60%_at_30%_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[#2F4161]/25 [clip-path:ellipse(60%_70%_at_85%_100%)]" />
        {/* house */}
        <div className="absolute bottom-10 left-1/2 h-[250px] w-[300px] -translate-x-1/2">
          <div className="absolute right-14 top-0 h-[60px] w-8 bg-[#2F4161]" />
          <div className="absolute inset-x-0 top-[20px] h-[100px] bg-[#3A5079] [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
          <div className="animate-glow absolute left-1/2 top-[70px] h-10 w-10 -translate-x-1/2 rounded-full bg-[#F3C9A0] shadow-[0_0_24px_rgba(243,201,160,0.8)]" />
          <div className="absolute inset-x-5 bottom-0 h-[130px] rounded-t bg-[#2F4161]">
            <div className="animate-glow absolute left-6 top-6 h-[46px] w-[52px] rounded-md bg-[#F3C9A0] shadow-[0_0_30px_rgba(243,201,160,0.7)]" />
            <div className="animate-glow-slow absolute right-6 top-6 h-[46px] w-[52px] rounded-md bg-[#F3C9A0] shadow-[0_0_30px_rgba(243,201,160,0.7)]" />
            <div className="absolute left-[50px] top-6 h-[46px] w-[3px] bg-[#2F4161]" />
            <div className="absolute right-[50px] top-6 h-[46px] w-[3px] bg-[#2F4161]" />
            <div className="absolute bottom-0 left-1/2 h-20 w-12 -translate-x-1/2 rounded-t-3xl bg-[#C27A4A]">
              <span className="absolute right-2 top-11 h-1.5 w-1.5 rounded-full bg-[#FBF3EA]" />
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-[#E6D3BE]" />
      </div>


      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-[18px] border border-white bg-white/80 px-4 py-3 text-[#1E2B44] backdrop-blur-xl">
        <span className="leading-snug">
          <strong className="block text-sm">Curated verified sublets</strong>
          <span className="text-xs text-[#4A5A75]">Matched to your commute and lifestyle</span>
        </span>
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E2B44] text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
          </svg>
        </span>
      </div>
    </div>
  )
}

// Real photos of the places interns move to. Drop the files in public/images/home/.
// If any photo is missing, the drawn house scene shows instead.
const PHOTOS = [
  { src: '/images/home/place-1.jpg', city: 'San Francisco, CA' },
  { src: '/images/home/place-2.jpg', city: 'New York, NY' },
  { src: '/images/home/place-3.jpg', city: 'Seattle, WA' },
]

function PlacePhotos() {
  const [index, setIndex] = useState(0)
  const [broken, setBroken] = useState(false)

  // crossfade to the next photo every 5 seconds
  useEffect(() => {
    if (broken || PHOTOS.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % PHOTOS.length), 5000)
    return () => clearInterval(id)
  }, [broken])

  if (broken) return <HouseScene />

  return (
    <div className="relative h-full min-h-[440px] overflow-hidden rounded-[28px] bg-[#C9DBEA]">
      {PHOTOS.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.src}
          src={p.src}
          alt=""
          onError={() => setBroken(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1400ms] ease-out ${
            i === index ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
          }`}
        />
      ))}
      {/* soft navy wash at the bottom so the glass strip always reads */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1E2B44]/45 to-transparent" />

      <span
        key={PHOTOS[index].city}
        className="absolute left-4 top-4 inline-flex animate-[fadeIn_.6s_ease-out] items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#1E2B44] backdrop-blur"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        {PHOTOS[index].city}
      </span>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-[18px] border border-white bg-white/85 px-4 py-3 text-[#1E2B44] backdrop-blur-xl">
        <span className="leading-snug">
          <strong className="block text-sm">Curated verified sublets</strong>
          <span className="text-xs text-[#4A5A75]">Matched to your commute and lifestyle</span>
        </span>
        <span className="flex gap-1.5" aria-hidden="true">
          {PHOTOS.map((p, i) => (
            <span key={p.src} className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-5 bg-[#1E2B44]' : 'w-1.5 bg-[#1E2B44]/25'}`} />
          ))}
        </span>
      </div>
    </div>
  )
}

const quizSteps = [
  {
    title: 'Your internship',
    body: 'City, office location and dates.',
    tint: 'bg-[#EEF3F8]',
    icon: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M9 7V4h6v3" />
      </>
    ),
  },
  {
    title: 'Your place',
    body: 'Budget, room type and commute.',
    tint: 'bg-[#FBF3EA]',
    icon: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    title: 'Your people',
    body: 'Lifestyle and roommate vibe.',
    tint: 'bg-[#E4EDF6]',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
      </>
    ),
  },
]

export default function HomeView() {
  const [firstName, setFirstName] = useState('')
  const [show, setShow] = useState(false)

  // Read-only: show the logged-in user's first name if their account has one saved.
  useEffect(() => {
    setShow(true)
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {}
      const name = (meta.first_name ?? meta.firstName ?? '') as string
      setFirstName(name.trim())
    })
  }, [])

  const reveal = show ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'

  return (
    <>
      <AppNavbar firstName={firstName} />
      <section className="relative flex min-h-screen flex-col justify-center px-4 pb-10 pt-28 md:px-8">
        <div
          className={`mx-auto grid w-full max-w-[1240px] gap-6 rounded-[36px] md:min-h-[640px] border border-white bg-white/60 p-4 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl transition-all duration-1000 ease-out md:grid-cols-[1.1fr_1fr] md:p-5 ${reveal}`}
        >
          {/* left: greeting + quiz */}
          <div className="flex flex-col p-4 md:p-8">
            <h1 className="font-[family-name:var(--font-serif)] text-6xl font-medium leading-none tracking-[-0.03em] md:text-[76px]">
              Hi {firstName || 'there'}
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-[#4A5A75]">
              Find your ideal summer housing and roommates tailored to your internship.
            </p>

            {/* what the quiz covers, fills the middle of the card */}
            <div className="mt-10 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">What we&apos;ll ask about</p>
              <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                {quizSteps.map((step, i) => (
                  <li
                    key={step.title}
                    className={`rounded-[20px] border border-white bg-white/70 p-4 transition-all duration-700 ease-out hover:-translate-y-1 ${reveal}`}
                    style={{ transitionDelay: `${300 + i * 120}ms` }}
                  >
                    <span aria-hidden="true" className={`flex h-10 w-10 items-center justify-center rounded-full ${step.tint}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {step.icon}
                      </svg>
                    </span>
                    <strong className="mt-3 block text-[15px]">{step.title}</strong>
                    <span className="mt-0.5 block text-[13px] leading-snug text-[#4A5A75]">{step.body}</span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-10 font-[family-name:var(--font-serif)] text-[28px] italic">Ready when you are.</p>
            <Link
              href="/questionnaire"
              className="group mt-4 flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#1E2B44] px-6 text-[15px] font-semibold tracking-wide text-white shadow-[0_14px_30px_-16px_rgba(30,43,68,0.7)] transition hover:-translate-y-0.5 hover:bg-[#2F4161]"
            >
              Begin quiz
              <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[#4A5A75]">
              <span>Takes a few minutes.</span>
              <span className="inline-flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                Verified .edu student sublets
              </span>
            </div>
          </div>

          {/* right: place photos (falls back to the drawn house) */}
          <PlacePhotos />
        </div>

        <p className="mt-8 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
