'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { SAMPLE_CONTEXT, SAMPLE_LISTINGS, type Listing, type MatchContext } from './listings'
import { commuteIcon, commuteText, Icon, ListingPhoto, ScoreBadge } from './parts'
import { loadSaved, toggleSavedId } from './activity'

type Sort = 'score' | 'price' | 'commute'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'score', label: 'Best match' },
  { id: 'price', label: 'Lowest price' },
  { id: 'commute', label: 'Shortest commute' },
]

/*
  Backend hook-up points (everything else is UI):
  - listings / context props: pass the user's real matches and quiz answers
  - toggleSaved: replace the TODO with an API call (Book and Contact are their own pages)
*/
export default function Matches({
  listings = SAMPLE_LISTINGS,
  context: initialContext = SAMPLE_CONTEXT,
}: {
  listings?: Listing[]
  context?: MatchContext
}) {
  const [sort, setSort] = useState<Sort>('score')
  const [savedOnly, setSavedOnly] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [context, setContext] = useState<MatchContext>(initialContext)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('subtle-quiz-v1')
      if (raw) {
        const q = JSON.parse(raw)
        if (q.company || q.address) {
          const addr = (q.address as string | undefined)?.trim() || initialContext.office
          const parts = addr.split(',').map((s) => s.trim()).filter(Boolean)
          const city = parts.length >= 2 ? parts.slice(-2).join(', ') : initialContext.city
          setContext({
            company: (q.company as string | undefined)?.trim() || initialContext.company,
            office: addr,
            city,
          })
        }
      }
    } catch {}
  }, [initialContext])

  const shown = useMemo(() => {
    const list = savedOnly ? listings.filter((l) => saved.includes(l.id)) : [...listings]
    return list.sort((a, b) => (sort === 'score' ? b.score - a.score : sort === 'price' ? a.price - b.price : a.commuteMinutes - b.commuteMinutes))
  }, [listings, saved, savedOnly, sort])

  // saved homes live in activity.ts (TODO(backend) there)
  useEffect(() => setSaved(loadSaved()), [])
  const toggleSaved = (id: string) => setSaved(toggleSavedId(id))
  return (
    <>
      <AppNavbar firstName="" />
      <section className="px-4 pb-16 pt-28 md:px-8">
        <div className="mx-auto w-full max-w-[1240px] rounded-[36px] border border-white bg-white/60 p-5 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-9">
          {/* header */}
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">Ranked for you</p>
              <h1 className="mt-2 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-6xl">Your matches</h1>
              <p className="mt-2 text-[17px] text-[#4A5A75]">
                Highest Subtle score first. Every home is near {context.office}.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 text-sm font-semibold">
                <Icon name="pin" size={15} /> {context.city} · {context.company}
              </span>
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                <Link
                  href="/internMatches"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1E2B44] px-4 py-2 text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]"
                >
                  <Icon name="user" size={14} /> Intern matches
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D5DFEA] bg-white px-4 py-2 transition hover:-translate-y-0.5"
                >
                  Messages
                </Link>
                <Link href="/questionnaire" className="underline underline-offset-2 hover:text-[#A35F33]">
                  Edit my answers
                </Link>
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#E4EAF1] pb-5">
            <div role="radiogroup" aria-label="Sort matches" className="flex flex-wrap gap-1 rounded-full bg-[#EEF3F8] p-1">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={sort === s.id}
                  onClick={() => setSort(s.id)}
                  className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${sort === s.id ? 'bg-[#1E2B44] text-white' : 'hover:bg-white'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#4A5A75]">
                {shown.length} {shown.length === 1 ? 'home' : 'homes'} · sample listings
              </span>
              <button
                type="button"
                aria-pressed={savedOnly}
                onClick={() => setSavedOnly((v) => !v)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold transition ${
                  savedOnly ? 'border-[#1E2B44] bg-[#1E2B44] text-white' : 'border-[#D5DFEA] bg-white/70 hover:bg-white'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={savedOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
                </svg>
                Saved ({saved.length})
              </button>
            </div>
          </div>

          {/* list */}
          <ul className="mt-6 space-y-5">
            {shown.map((l, i) => {
              const isSaved = saved.includes(l.id)
              return (
                <li
                  key={l.id}
                  className="group animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] rounded-[28px] border border-white bg-white/75 p-3 transition-shadow hover:shadow-[0_30px_60px_-36px_rgba(30,43,68,0.45)]"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                    <ListingPhoto listing={l} seed={i} />
                    <div className="flex flex-col p-2 md:py-3 md:pr-3">
                      <div className="flex items-start gap-4">
                        <ScoreBadge score={l.score} />
                        <div className="min-w-0 flex-1">
                          <h2 className="font-[family-name:var(--font-serif)] text-3xl font-medium leading-tight">
                            <Link href={`/matches/${l.id}`} className="hover:underline hover:underline-offset-4">
                              {l.title}
                            </Link>
                          </h2>
                          <p className="mt-0.5 text-[15px]">
                            <strong className="text-lg">${l.price.toLocaleString()}</strong> / month
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-pressed={isSaved}
                          aria-label={isSaved ? `Remove ${l.title} from saved` : `Save ${l.title}`}
                          onClick={() => toggleSaved(l.id)}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-[#EEF3F8] ${isSaved ? 'text-[#A35F33]' : ''}`}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
                          </svg>
                        </button>
                      </div>

                      <p className="mt-3 flex items-center gap-2 text-[15px] text-[#4A5A75]">
                        <Icon name={commuteIcon(l)} size={17} /> {commuteText(l)}
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-2 text-[13px] font-medium">
                        {[l.homeType, l.roomType, ...l.tags, `From ${l.availableFrom}`].map((t) => (
                          <li key={t} className="rounded-full border border-[#D5DFEA] bg-white px-3 py-1">
                            {t}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                        <Link href={`/matches/${l.id}/book`} className="flex min-h-12 items-center justify-center rounded-full bg-[#1E2B44] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
                          Book
                        </Link>
                        <Link
                          href={`/matches/${l.id}`}
                          className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5"
                        >
                          Details
                        </Link>
                        <Link href={`/matches/${l.id}/contact`} className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5">
                          Contact
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {shown.length === 0 && (
            <div className="mt-6 rounded-[28px] border border-dashed border-[#C9DBEA] p-10 text-center">
              <p className="font-[family-name:var(--font-serif)] text-3xl">No saved homes yet.</p>
              <p className="mt-2 text-[#4A5A75]">Tap the heart on any home to keep it here.</p>
              <button type="button" onClick={() => setSavedOnly(false)} className="mt-5 rounded-full bg-[#1E2B44] px-6 py-3 font-semibold text-white">
                Show all matches
              </button>
            </div>
          )}
        </div>
        <p className="mt-8 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
