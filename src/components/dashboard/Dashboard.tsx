'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { commuteIcon, commuteText, Icon, ListingPhoto, ScoreBadge } from '../matches/parts'
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

  return (
    <>
      <AppNavbar firstName={d.firstName} />
      <section className="px-4 pb-16 pt-32 md:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          <header className="animate-[fadeIn_.5s_ease-out]">
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
                    <p className={eyebrow}>Ranked by Subtle score</p>
                    <h2 className={`${serif} mt-1 text-4xl font-medium`}>Your best matches</h2>
                  </div>
                  <Link href="/matches" className={btnLight}>
                    See all matches <Icon name="arrowR" size={16} />
                  </Link>
                </div>
                <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {d.topMatches.map((l, i) => (
                    <li key={l.id} className="animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both]" style={{ animationDelay: `${120 + i * 70}ms` }}>
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
                  <div className="mt-7">
                    <Link href="/questionnaire" className={btnDark}>
                      {d.quizStatus === 'started' ? 'Finish the quiz' : 'Take the quiz'} <Icon name="arrowR" size={16} />
                    </Link>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-4">
                  {QUIZ_TOPICS.map((t, i) => (
                    <li
                      key={t.title}
                      className="flex animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] flex-col gap-3 rounded-[24px] border border-white bg-white/80 p-5"
                      style={{ animationDelay: `${200 + i * 80}ms` }}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF3F8]">
                        <Icon name={t.icon} size={18} />
                      </span>
                      <span className="text-sm font-semibold leading-snug">{t.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* intern community (its only link now that it's out of the top bar) */}
          <section className={`${glass} mt-6 flex animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] flex-wrap items-center justify-between gap-6 p-7 [animation-delay:160ms] md:px-10`}>
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
        </div>
        <p className="mt-12 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
