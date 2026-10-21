'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { commuteIcon, commuteText, Icon, ListingPhoto, ScoreBadge } from '../matches/parts'
import { initials, shortTime } from '../messages/store'
import { BUDGETS, COMMUTE_MODES, label, MOVE_IN } from '../quiz/options'
import { useDashboardData } from './useDashboardData'

const glass = 'rounded-[32px] border border-white bg-white/65 shadow-[0_30px_70px_-40px_rgba(30,43,68,0.38)] backdrop-blur-xl'
const eyebrow = 'text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]'
const serif = 'font-[family-name:var(--font-serif)]'
const btnDark = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1E2B44] px-6 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]'
const btnLight = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D5DFEA] bg-white/80 px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-white'

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

function Card({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`${glass} animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </section>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#E4EAF1] ${className}`} />
}

export default function Dashboard() {
  const d = useDashboardData()
  const [hello, setHello] = useState('Welcome back')
  useEffect(() => setHello(greeting()), [])

  const name = d.firstName || 'there'
  const unread = d.conversations.filter((c) => c.unread).length
  const search = [
    [d.quiz.company, d.quiz.address].filter(Boolean).join(', '),
    label(BUDGETS, d.quiz.budget),
    d.quiz.moveIn && (d.quiz.moveIn === 'flexible' ? 'Flexible move-in' : `Moving in ${label(MOVE_IN, d.quiz.moveIn)}`),
    d.quiz.commuteMode && `${label(COMMUTE_MODES, d.quiz.commuteMode)}, up to ${d.quiz.maxCommute} min`,
  ].filter(Boolean) as string[]

  return (
    <>
      <AppNavbar firstName={d.firstName} />
      <section className="px-4 pb-16 pt-28 md:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          {/* header */}
          <header className="flex animate-[fadeIn_.5s_ease-out] flex-wrap items-end justify-between gap-6">
            <div>
              <p className={eyebrow}>Your dashboard</p>
              <h1 className={`${serif} mt-2 text-5xl font-medium tracking-[-0.02em] md:text-6xl`}>
                {hello}, {name}.
              </h1>
              <p className="mt-2 text-[17px] text-[#4A5A75]">
                {d.quizStatus === 'done'
                  ? 'Here is everything for your move, in one place.'
                  : 'Everything for your move lives here. Start wherever you like.'}
              </p>
              {d.quizStatus !== 'none' && search.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {search.map((t) => (
                    <span key={t} className="rounded-full border border-white bg-white/70 px-3.5 py-1.5 text-sm font-medium">
                      {t}
                    </span>
                  ))}
                  <Link href="/questionnaire" className="px-2 py-1.5 text-sm font-semibold underline underline-offset-4 hover:text-[#A35F33]">
                    Edit
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/matches" className={btnLight}>
                <Icon name="home" size={16} /> Browse homes
              </Link>
              <Link href="/post" className={btnLight}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Post a listing
              </Link>
            </div>
          </header>

          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            {/* matches, or the quiz invite */}
            <Card className="p-7 md:p-10 lg:col-span-12">
              {d.loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56" />
                    <Skeleton className="h-56" />
                  </div>
                </div>
              ) : d.quizStatus === 'done' ? (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className={eyebrow}>Your top matches</p>
                      <h2 className={`${serif} mt-1 text-3xl font-medium`}>Picked for your commute</h2>
                    </div>
                    <Link href="/matches" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline hover:underline-offset-4">
                      See all matches <Icon name="arrowR" size={16} />
                    </Link>
                  </div>
                  <ul className="mt-7 grid gap-5 sm:grid-cols-3">
                    {d.topMatches.map((l, i) => (
                      <li key={l.id}>
                        <Link href={`/matches/${l.id}`} className="group block rounded-[24px] border border-white bg-white/80 p-2.5 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(30,43,68,0.5)]">
                          <div className="relative">
                            <ListingPhoto listing={l} seed={i} className="h-52" />
                            <span className="absolute bottom-2.5 right-2.5">
                              <ScoreBadge score={l.score} size={42} />
                            </span>
                          </div>
                          <div className="px-1.5 pb-1.5 pt-3">
                            <p className={`${serif} truncate text-xl font-medium`}>{l.title}</p>
                            <p className="text-sm">
                              <strong>${l.price.toLocaleString()}</strong> / month
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-[#4A5A75]">
                              <Icon name={commuteIcon(l)} size={14} /> {commuteText(l)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
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
                        ? 'Your answers are saved. Finish the last few questions and your matches show up right here.'
                        : `Take the quick housing quiz, ${name}, and your best matches will show up right here, ranked by commute, budget and lifestyle.`}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link href="/questionnaire" className={btnDark}>
                        {d.quizStatus === 'started' ? 'Finish the quiz' : 'Take the quiz'} <Icon name="arrowR" size={16} />
                      </Link>
                      <Link href="/matches" className="text-sm font-semibold underline underline-offset-4 hover:text-[#A35F33]">
                        Just browse for now
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
            </Card>

            {/* messages */}
            <Card className="p-7 md:p-8 lg:col-span-4" delay={200}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className={eyebrow}>Messages</p>
                  {unread > 0 && <span className="rounded-full bg-[#1E2B44] px-2 py-0.5 text-xs font-bold text-white">{unread} new</span>}
                </div>
                <Link href="/messages" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline hover:underline-offset-4">
                  Open <Icon name="arrowR" size={16} />
                </Link>
              </div>
              {d.loading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : d.conversations.length === 0 ? (
                <p className="mt-4 text-[15px] text-[#4A5A75]">No messages yet. Contact a host from any listing and the chat shows up here.</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {d.conversations.slice(0, 2).map((c) => {
                    const last = c.messages[c.messages.length - 1]
                    return (
                      <li key={c.id}>
                        <Link href={`/messages?c=${c.id}`} className="flex items-center gap-3 rounded-[18px] p-2.5 transition hover:bg-white/80">
                          <span aria-hidden="true" className={`${serif} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C9DBEA] text-lg font-medium`}>
                            {initials(c.hostName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={`truncate text-[15px] ${c.unread ? 'font-bold' : 'font-semibold'}`}>
                                {c.hostName}
                              </span>
                              <span className="shrink-0 text-xs text-[#4A5A75]">{last ? shortTime(last.sentAt) : ''}</span>
                            </span>
                            <span className={`flex items-center gap-2 text-sm ${c.unread ? 'font-semibold' : 'text-[#4A5A75]'}`}>
                              <span className="truncate">
                                {last?.from === 'me' ? 'You: ' : ''}
                                {last?.body}
                              </span>
                              {c.unread && <span aria-label="Unread" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#C27A4A]" />}
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
              {d.conversations.some((c) => c.sample) && <p className="mt-2 text-[11px] text-[#4A5A75]">Includes sample conversations.</p>}
            </Card>

            {/* my listings */}
            <Card className="flex flex-col p-7 md:p-8 lg:col-span-4" delay={260}>
              <p className={eyebrow}>Your listings</p>
              {d.loading ? (
                <Skeleton className="mt-4 h-24" />
              ) : d.myListings.length === 0 ? (
                <>
                  <h3 className={`${serif} mt-2 text-2xl font-medium leading-snug`}>Have a place to sublet?</h3>
                  <p className="mt-2 text-[15px] text-[#4A5A75]">Post it and interns whose answers fit your home will see it in their matches.</p>
                  <div className="mt-auto pt-5">
                    <Link href="/post" className={btnDark}>
                      Post a listing
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {d.myListings.slice(0, 2).map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-white bg-white/80 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{l.title || 'Your place'}</span>
                          <span className="text-sm text-[#4A5A75]">
                            {l.monthly_rent ? `$${l.monthly_rent.toLocaleString()} / month` : 'Rent not set'}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-[#EEF3F8] px-2.5 py-1 text-xs font-bold">Live</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-4">
                    <Link href="/post" className={btnLight}>
                      Post another place
                    </Link>
                  </div>
                </>
              )}
            </Card>

            {/* intern community */}
            <Card className="flex flex-col p-7 md:p-8 lg:col-span-4" delay={320}>
              <p className={eyebrow}>Community</p>
              <div aria-hidden="true" className="mt-4 flex -space-x-3">
                {['bg-[#1E2B44] text-white', 'bg-[#F3C9A0]', 'bg-[#C9DBEA]', 'bg-[#E4EAF1]'].map((tone, i) => (
                  <span key={tone} className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-white ${tone}`}>
                    <Icon name={['user', 'music', 'pot', 'book'][i]} size={16} />
                  </span>
                ))}
              </div>
              <h3 className={`${serif} mt-3 text-2xl font-medium leading-snug`}>Meet interns near you</h3>
              <p className="mt-1.5 text-[15px] text-[#4A5A75]">Find people with your interests in your city this summer.</p>
              <div className="mt-auto pt-5">
                <Link href="/internMatches" className={btnLight}>
                  See intern matches
                </Link>
              </div>
            </Card>
          </div>
        </div>
        <p className="mt-12 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
