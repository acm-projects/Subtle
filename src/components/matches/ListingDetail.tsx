'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { SAMPLE_CONTEXT, type Listing, type MatchContext } from './listings'
import { commuteIcon, Icon, ListingPhoto, ScoreBadge, scoreColor } from './parts'
import { loadSaved, toggleSavedId } from './activity'

const commuteTo = (l: Listing, office: string) => {
  const how = l.commuteMode === 'walk' ? 'walk' : l.commuteMode === 'transit' ? 'by transit' : l.commuteMode === 'bike' ? 'bike ride' : 'drive'
  return `${l.commuteMinutes} min ${how} to ${office}`
}

// Fallbacks so the page still reads well if the backend only sends the basic fields.
const subtitleFor = (l: Listing) =>
  l.subtitle ?? (l.roomType === 'Entire place' ? `Entire ${l.homeType.toLowerCase()}` : `${l.roomType} in a ${l.homeType.toLowerCase()}`)
const whyFor = (l: Listing) =>
  l.whyScore ?? [
    `${l.commuteMode === 'walk' ? 'Walk' : 'Commute'} to the office · ${l.commuteMinutes} minutes`,
    `Dates match your summer · ${l.availableFrom}`,
    l.tags.length ? l.tags.join(' · ') : l.roomType,
  ]
const featuresFor = (l: Listing) => l.features ?? Array.from(new Set([l.homeType, l.roomType, ...l.tags, ...l.amenities]))

/*
  Backend hook-up points:
  - listing / context props: pass the real listing (fetched by id) and the user's quiz context
  - toggleSaved: persist; Book and Contact are their own pages (/matches/[id]/book and /contact)
*/
export default function ListingDetail({ listing, context: initialContext = SAMPLE_CONTEXT }: { listing: Listing; context?: MatchContext }) {
  const [saved, setSaved] = useState(false)
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

  // saved homes live in activity.ts (TODO(backend) there)
  useEffect(() => setSaved(loadSaved().includes(listing.id)), [listing.id])
  const toggleSaved = () => setSaved(toggleSavedId(listing.id).includes(listing.id))

  const facts = [
    { icon: 'dollar', label: 'Rent', value: `$${listing.price.toLocaleString()} / month` },
    { icon: commuteIcon(listing), label: 'Commute', value: commuteTo(listing, context.office) },
    { icon: 'calendar', label: 'Available', value: `${listing.availableFrom} – ${listing.availableTo}` },
  ]

  return (
    <>
      <AppNavbar firstName="" />
      <section className="px-4 pb-16 pt-28 md:px-8">
        <article className="mx-auto w-full max-w-[1240px] animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] rounded-[36px] border border-white bg-white/60 p-5 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-9">
          {/* header */}
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Link href="/matches" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#4A5A75] hover:text-[#1E2B44]">
                <Icon name="arrowL" size={16} /> All matches
              </Link>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">Listing details</p>
              <h1 className="mt-2 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-6xl">{listing.title}</h1>
              <p className="mt-2 text-[17px] text-[#4A5A75]">{subtitleFor(listing)}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button
                type="button"
                aria-pressed={saved}
                aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
                onClick={toggleSaved}
                className={`flex h-12 w-12 items-center justify-center rounded-full border border-white bg-white/80 transition hover:scale-105 ${saved ? 'text-[#A35F33]' : ''}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />
                </svg>
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 text-sm font-semibold">
                <Icon name="pin" size={15} /> {context.city} · {context.company}
              </span>
            </div>
          </header>

          {/* bento */}
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* photo + quick facts */}
            <div className="flex flex-col gap-5">
              <div className="group relative">
                <ListingPhoto listing={listing} seed={0} className="min-h-[300px] md:min-h-[440px]" />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-3 rounded-full border border-white bg-white/85 py-1.5 pl-1.5 pr-5 shadow-[0_12px_30px_-14px_rgba(30,43,68,0.5)] backdrop-blur">
                  <ScoreBadge score={listing.score} size={44} />
                  <span className="text-[15px] font-semibold">Subtle score</span>
                </span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-3">
                {facts.map((f, i) => (
                  <li
                    key={f.label}
                    className="animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] rounded-[22px] border border-white bg-white/75 p-4"
                    style={{ animationDelay: `${150 + i * 70}ms` }}
                  >
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#4A5A75]">
                      <Icon name={f.icon} size={15} /> {f.label}
                    </span>
                    <p className="mt-1.5 text-[15px] font-semibold leading-snug">{f.value}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* why, the place, about, actions */}
            <div className="flex flex-col gap-5">
              <section aria-labelledby="why-title" className="rounded-[28px] border border-white bg-white/75 p-6">
                <h2 id="why-title" className="text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">
                  Why this score
                </h2>
                <ul className="mt-4 space-y-3">
                  {whyFor(listing).map((reason) => (
                    <li key={reason} className="flex items-start gap-3 text-[15px]">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: scoreColor(listing.score) }}
                      >
                        <Icon name="check" size={13} />
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="place-title" className="rounded-[28px] border border-white bg-white/75 p-6">
                <h2 id="place-title" className="text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">
                  The place
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2 text-[13px] font-medium">
                  {featuresFor(listing).map((f) => (
                    <li key={f} className="rounded-full border border-[#D5DFEA] bg-white px-3 py-1.5">
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-[15px] leading-relaxed">{listing.description}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-[#4A5A75]">
                  <Icon name="user" size={15} /> Hosted by {listing.hostName}
                </p>
              </section>

              <div className="mt-auto flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href="/matches"
                    className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5"
                  >
                    Back
                  </Link>
                  <Link href={`/matches/${listing.id}/book`} className="flex min-h-12 items-center justify-center rounded-full bg-[#1E2B44] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
                    Book
                  </Link>
                  <Link href={`/matches/${listing.id}/contact`} className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5">
                    Contact
                  </Link>
                </div>
                <Link
                  href={`/my-listings/${listing.id}/edit`}
                  className="flex min-h-10 items-center justify-center rounded-full border border-dashed border-[#A9C7E8] bg-white/70 text-xs font-semibold text-[#1E2B44] transition hover:bg-white"
                >
                  Edit this listing
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-6 text-[13px] text-[#4A5A75]">Sample listing for design only. Real listings will come from verified hosts.</p>
        </article>
        <p className="mt-8 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>

    </>
  )
}
