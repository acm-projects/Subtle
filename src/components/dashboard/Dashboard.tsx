'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import AppNavbar from '../AppNavbar'
import HouseMascot from '../HouseMascot'
import { commuteIcon, commuteText, Icon, ListingPhoto, ScoreBadge } from '../matches/parts'
import { BOOKING_STEPS } from '../matches/activity'
import { useDashboardData } from './useDashboardData'

const glass = 'rounded-[32px] border border-white bg-white/65 shadow-[0_30px_70px_-40px_rgba(30,43,68,0.38)] backdrop-blur-xl'
const eyebrow = 'text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]'
const serif = 'font-[family-name:var(--font-serif)]'
const btnDark = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1E2B44] px-6 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]'
const btnLight = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D5DFEA] bg-white/80 px-6 text-[15px] font-semibold transition hover:-translate-y-0.5 hover:bg-white'

const QUIZ_TOPICS = [
  { icon: 'building', title: 'Where you work' },
  { icon: 'dollar', title: 'Your budget' },
  { icon: 'home', title: 'Your kind of home' },
  { icon: 'people', title: 'Roommates and interests' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#E4EAF1] ${className}`} />
}

export default function Dashboard() {
  const d = useDashboardData()
  const [hello, setHello] = useState('Welcome back')
  useEffect(() => setHello(greeting()), [])
  const name = d.firstName || 'there'
  const rowRef = useRef<HTMLOListElement>(null)
  const scrollRow = (dir: number) => rowRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' })

  return (
    <>
      <AppNavbar firstName={d.firstName} />
      <section className="px-4 pb-16 pt-32 md:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          <header className="animate-[fadeIn_.5s_ease-out] pl-2 md:pl-10">
            <p className={eyebrow}>Your dashboard</p>
            <h1 className={`${serif} mt-2 text-5xl font-medium tracking-[-0.02em] md:text-6xl`}>
              {hello}, {name}.
            </h1>
          </header>

          {/* best matches by Subtle score, or the quiz invite */}
          <section className={`${glass} mt-10 animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] p-7 md:p-10`}>
            {d.loading ? (
              <div className="space-y-5">
                <Skeleton className="h-7 w-56" />
                <div className="grid gap-5 sm:grid-cols-3">
                  <Skeleton className="h-72" />
                  <Skeleton className="h-72" />
                  <Skeleton className="h-72" />
                </div>
              </div>
            ) : d.quizStatus === 'done' ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className={eyebrow}>Ranked by Subtle score · scroll for more</p>
                    <h2 className={`${serif} mt-1 text-4xl font-medium`}>Your best matches</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => scrollRow(-1)} aria-label="Scroll matches left" className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white/80 transition hover:bg-white">
                      <Icon name="arrowL" size={18} />
                    </button>
                    <button type="button" onClick={() => scrollRow(1)} aria-label="Scroll matches right" className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white/80 transition hover:bg-white">
                      <Icon name="arrowR" size={18} />
                    </button>
                    <Link href="/matches" className={btnLight}>
                      See all matches
                    </Link>
                  </div>
                </div>
                <ol
                  ref={rowRef}
                  aria-label="Your best matches, scroll sideways for more"
                  tabIndex={0}
                  className="-mx-2 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-2 px-2 pb-4 outline-none [scrollbar-color:#C9DBEA_transparent] [scrollbar-width:thin] focus-visible:ring-4 focus-visible:ring-[#A9C7E8]/60"
                >
                  {d.topMatches.map((l, i) => (
                    <li key={l.id} className="w-[min(320px,80vw)] shrink-0 snap-start animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both]" style={{ animationDelay: `${120 + Math.min(i, 4) * 70}ms` }}>
                      <Link
                        href={`/matches/${l.id}`}
                        aria-label={`Number ${i + 1}: ${l.title}, Subtle score ${l.score}`}
                        className="group block rounded-[26px] border border-white bg-white/80 p-2.5 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(30,43,68,0.5)]"
                      >
                        <div className="relative">
                          <ListingPhoto listing={l} seed={i} className="h-52" />
                          <span className="absolute right-2.5 top-2.5 rounded-full bg-[#1E2B44] px-2.5 py-1 text-xs font-bold text-white">#{i + 1}</span>
                        </div>
                        <div className="flex items-start gap-3 px-1.5 pb-1.5 pt-4">
                          <ScoreBadge score={l.score} size={44} />
                          <div className="min-w-0">
                            <p className={`${serif} truncate text-xl font-medium`}>{l.title}</p>
                            <p className="text-sm">
                              <strong>${l.price.toLocaleString()}</strong> / month
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-[#4A5A75]">
                              <Icon name={commuteIcon(l)} size={14} /> {commuteText(l)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="grid items-center gap-10 py-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div>
                  <p className={eyebrow}>{d.quizStatus === 'started' ? 'Almost there' : 'Your matches'}</p>
                  <h2 className={`${serif} mt-2 text-4xl font-medium leading-tight`}>
                    {d.quizStatus === 'started' ? `Pick up where you left off, ${name}.` : 'Don’t see anything yet? No worries.'}
                  </h2>
                  <p className="mt-3 max-w-md text-[16px] leading-relaxed text-[#4A5A75]">
                    {d.quizStatus === 'started'
                      ? 'Your answers are saved. Finish the last few questions and your best matches show up right here.'
                      : `Take the quick housing quiz, ${name}, and your best matches will show up right here, ranked by Subtle score.`}
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="What the quiz asks">
                    {QUIZ_TOPICS.map((t) => (
                      <li key={t.title} className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 py-1.5 text-[13px] font-medium">
                        <Icon name={t.icon} size={14} /> {t.title}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7">
                    <Link href="/questionnaire" className={btnDark}>
                      {d.quizStatus === 'started' ? 'Finish the quiz' : 'Begin the quiz'} <Icon name="arrowR" size={16} />
                    </Link>
                  </div>
                </div>
                <div className="relative mx-auto flex h-64 w-full max-w-[300px] items-end justify-center md:h-72">
                  <div aria-hidden="true" className="absolute inset-x-6 bottom-6 top-10 rounded-full bg-[#F3C9A0]/35 blur-3xl" />
                  <HouseMascot label="Subtle's house mascot waving hello" className="relative h-full w-full" />
                </div>
              </div>
            )}
          </section>

          {(d.quizStatus === 'done' || d.bookings.length > 0 || d.savedHomes.length > 0) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            {/* saved homes */}
            <section className={`${glass} animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] p-7 [animation-delay:120ms] md:p-8 lg:col-span-7`}>
              <div className="flex items-center justify-between gap-3">
                <p className={eyebrow}>Saved homes</p>
                {d.savedHomes.length > 0 && (
                  <Link href="/matches" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline hover:underline-offset-4">
                    All matches <Icon name="arrowR" size={16} />
                  </Link>
                )}
              </div>
              {d.loading ? (
                <div className="mt-5 space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : d.savedHomes.length === 0 ? (
                <div className="mt-4 flex items-start gap-4">
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEF3F8] text-[#A35F33]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
                    </svg>
                  </span>
                  <div>
                    <h2 className={`${serif} text-2xl font-medium`}>Nothing saved yet</h2>
                    <p className="mt-1 text-[15px] text-[#4A5A75]">Tap the heart on any home and it waits for you here.</p>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {d.savedHomes.map((l, i) => (
                    <li key={l.id}>
                      <Link href={`/matches/${l.id}`} className="flex items-center gap-4 rounded-[22px] border border-white bg-white/80 p-2.5 pr-4 transition hover:-translate-y-0.5 hover:bg-white">
                        <ListingPhoto listing={l} seed={i + 1} className="h-16 w-24 shrink-0 [&>span]:hidden" />
                        <span className="min-w-0 flex-1">
                          <span className={`${serif} block truncate text-lg font-medium`}>{l.title}</span>
                          <span className="text-sm text-[#4A5A75]">
                            ${l.price.toLocaleString()} / month · {commuteText(l)}
                          </span>
                        </span>
                        <ScoreBadge score={l.score} size={38} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* booking requests */}
            <section className={`${glass} animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] p-7 [animation-delay:180ms] md:p-8 lg:col-span-5`}>
              <p className={eyebrow}>Booking requests</p>
              {d.loading ? (
                <Skeleton className="mt-5 h-28" />
              ) : d.bookings.length === 0 ? (
                <div className="mt-4">
                  <h2 className={`${serif} text-2xl font-medium`}>No requests yet</h2>
                  <p className="mt-1 text-[15px] text-[#4A5A75]">When you request to book a home, you can follow it here from request to keys.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-4">
                  {d.bookings.slice(0, 3).map((b) => {
                    const at = BOOKING_STEPS.findIndex((s) => s.id === b.status)
                    return (
                      <li key={b.id ?? b.listingId} className="rounded-[22px] border border-white bg-white/80 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <Link href={`/matches/${b.listingId}`} className={`${serif} truncate text-xl font-medium hover:underline hover:underline-offset-4`}>
                            {b.title}
                          </Link>
                          <span className="shrink-0 text-sm text-[#4A5A75]">
                            {b.availableFrom} – {b.availableTo}
                          </span>
                        </div>
                        {b.status === 'declined' ? (
                          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-[#FBF3EA] px-3 py-2 text-sm">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#A35F33]" />
                            {b.hostName.split(' ')[0]} can't host you this time. Your other matches are still open.
                          </p>
                        ) : (
                        <ol className="mt-4 flex items-center" aria-label={`Status: ${BOOKING_STEPS[at]?.label}`}>
                          {BOOKING_STEPS.map((s, i) => (
                            <li key={s.id} className={`flex items-center ${i < BOOKING_STEPS.length - 1 ? 'flex-1' : ''}`}>
                              <span className="flex flex-col items-center gap-1.5">
                                <span
                                  aria-hidden="true"
                                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                                    i < at ? 'bg-[#1E2B44] text-white' : i === at ? 'bg-[#1E2B44] text-white ring-4 ring-[#C9DBEA]' : 'border-2 border-[#C9DBEA] bg-white'
                                  }`}
                                >
                                  {i <= at && <Icon name="check" size={13} />}
                                </span>
                                <span className={`whitespace-nowrap text-xs ${i === at ? 'font-bold' : 'text-[#4A5A75]'}`}>{s.label}</span>
                              </span>
                              {i < BOOKING_STEPS.length - 1 && <span aria-hidden="true" className={`mx-2 mb-5 h-0.5 flex-1 rounded ${i < at ? 'bg-[#1E2B44]' : 'bg-[#E4EAF1]'}`} />}
                            </li>
                          ))}
                        </ol>
                        )}
                        {b.status === 'accepted' && <p className="mt-3 text-sm font-semibold text-[#2E6B45]">{b.hostName.split(' ')[0]} accepted your request. Message them to sort out the next steps.</p>}
                        {b.status === 'requested' && <p className="mt-3 text-sm text-[#4A5A75]">Waiting on {b.hostName.split(' ')[0]} to reply.</p>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          )}

          {/* intern community: locked until the quiz tells us their city and interests */}
          {d.quizStatus === 'done' ? (
            <section className={`${glass} mt-6 flex animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] flex-wrap items-center justify-between gap-6 p-7 [animation-delay:240ms] md:px-10`}>
              <div className="flex items-center gap-5">
                <div aria-hidden="true" className="flex -space-x-3">
                  {['bg-[#1E2B44] text-white', 'bg-[#F3C9A0]', 'bg-[#C9DBEA]'].map((tone, i) => (
                    <span key={tone} className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-white ${tone}`}>
                      <Icon name={['user', 'music', 'pot'][i]} size={17} />
                    </span>
                  ))}
                </div>
                <div>
                  <h2 className={`${serif} text-2xl font-medium`}>Meet interns near you</h2>
                  <p className="text-[15px] text-[#4A5A75]">People with your interests in your city this summer.</p>
                </div>
              </div>
              <Link href="/internMatches" className={btnLight}>
                See intern matches <Icon name="arrowR" size={16} />
              </Link>
            </section>
          ) : (
            <section
              aria-label="Intern matches, locked until you take the quiz"
              className="mt-6 flex animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] flex-wrap items-center justify-between gap-6 rounded-[32px] border border-dashed border-[#C9DBEA] bg-white/40 p-7 [animation-delay:240ms] md:px-10"
            >
              <div className="flex items-center gap-5">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E4EAF1] text-[#4A5A75]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <div>
                  <h2 className={`${serif} text-2xl font-medium text-[#2F4161]`}>Meet interns near you</h2>
                  <p className="text-[15px] text-[#4A5A75]">Unlocks after the quiz, once we know your city and interests.</p>
                </div>
              </div>
              <span className="rounded-full bg-[#E4EAF1] px-4 py-2 text-sm font-semibold text-[#2F4161]">Locked</span>
            </section>
          )}
        </div>
        <p className="mt-12 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
