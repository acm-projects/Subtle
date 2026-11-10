'use client'

import Link from 'next/link'
import { useMatchContext, useScoredListing } from './useScored'
import { supabase } from '../../lib/supabase'
import { authFetch } from '../../lib/auth-fetch'
import { useEffect, useRef, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { EMPTY_CONTEXT, NEARBY_MILES, type Listing, type MatchContext } from './listings'
import { commuteIcon, Icon, ListingPhoto, ScoreBadge, scoreColor } from './parts'
import { loadSaved, syncSaved, toggleSavedId } from './activity'

const commuteTo = (l: Listing, office: string) => {
  const how = l.commuteMode === 'walk' ? 'walk' : l.commuteMode === 'transit' ? 'by transit' : l.commuteMode === 'bike' ? 'bike ride' : 'drive'
  return `${l.commuteMinutes} min ${how} to ${office}`
}

// Reasons come from /api/matches; never make one up (no office means no commute reason).
const whyFor = (l: Listing): string[] => {
  const reasons = (l.whyScore ?? []).filter((w) => l.commuteKnown !== false || !/commute|to work|to the office/i.test(w))
  if (reasons.length) return reasons
  return l.commuteKnown === false
    ? ['Add your office in the quiz to see the commute and a full score.']
    : ['Finish the quiz to see why this home fits you.']
}
const featuresFor = (l: Listing) => l.features ?? Array.from(new Set([l.homeType, l.roomType, ...l.tags, ...l.amenities]))

/*
  Backend hook-up points:
  - listing / context props: pass the real listing (fetched by id) and the user's quiz context
  - toggleSaved: persist; Book and Contact are their own pages (/matches/[id]/book and /contact)
*/
export default function ListingDetail({ listing: loadedListing, context: initialContext = EMPTY_CONTEXT }: { listing: Listing; context?: MatchContext }) {
  // same score, commute and safety as the Matches page and dashboard
  const listing = useScoredListing(loadedListing)
  const [saved, setSaved] = useState(false)
  // the user's company and office come from users_table via /api/matches
  const context = useMatchContext(initialContext)
  const far = listing.nearWork === false
  const place = listing.city || listing.neighborhood
  // only the person who posted a listing can edit it
  const [isHost, setIsHost] = useState(false)
  useEffect(() => {
    if (!listing.hostId) return setIsHost(false)
    supabase.auth.getUser().then(({ data }) => setIsHost(data.user?.id === listing.hostId)).catch(() => setIsHost(false))
  }, [listing.hostId])

  // saved homes live in activity.ts (TODO(backend) there)
  useEffect(() => {
    setSaved(loadSaved().includes(listing.id))
    syncSaved().then((ids) => setSaved(ids.includes(listing.id)))
  }, [listing.id])
  // count a view for the host's listing page (once per visit)
  const counted = useRef<string | null>(null)
  useEffect(() => {
    if (counted.current === listing.id) return
    counted.current = listing.id
    // a random id for logged-out visitors, so each person counts once
    let visitorId = ''
    try {
      visitorId = localStorage.getItem('subtle-visitor-id') ?? ''
      if (!visitorId) {
        visitorId = crypto.randomUUID()
        localStorage.setItem('subtle-visitor-id', visitorId)
      }
    } catch {}
    authFetch('/api/listing-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, visitorId }),
    }).catch(() => {})
  }, [listing.id])
  const toggleSaved = () => setSaved(toggleSavedId(listing.id).includes(listing.id))

  const facts = [
    { icon: 'dollar', label: 'Rent', value: `$${listing.price.toLocaleString()} / month` },
    {
      icon: commuteIcon(listing),
      label: 'Commute',
      value:
        listing.commuteKnown === false || !context.office
          ? 'Add your office to see it'
          : far
            ? `Far from ${context.office}`
            : commuteTo(listing, context.office),
    },
    { icon: 'calendar', label: 'Available', value: `${listing.availableFrom} – ${listing.availableTo}` },
  ]

  return (
    <>
      <AppNavbar firstName="" />
      <section className="px-4 pb-16 pt-32 md:px-8">
        <header className="mx-auto w-full max-w-[1240px] animate-[fadeIn_.5s_ease-out] md:pl-10">
          <h1 className="font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-6xl">{listing.title}</h1>
        </header>
        <article className="mx-auto mt-6 w-full max-w-[1240px] animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] rounded-[36px] border border-white bg-white/60 p-5 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-9">
          {/* header */}
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Link href="/matches" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#4A5A75] hover:text-[#1E2B44]">
                <Icon name="arrowL" size={16} /> All matches
              </Link>
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
                <Icon name="pin" size={15} /> {place}
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
                  <ScoreBadge score={listing.score} size={44} listing={listing} />
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
                    <span className="flex items-center gap-2 text-[15px] font-semibold text-[#4A5A75]">
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
                <h2 id="why-title" className="font-[family-name:var(--font-serif)] text-2xl font-medium">
                  Why This Score
                </h2>
                <ul className="mt-4 space-y-3">
                  {(far ? [`This home is more than ${NEARBY_MILES} miles from ${context.office || 'your office'}, so it isn't scored for you.`] : whyFor(listing)).map((reason) => (
                    <li key={reason} className="flex items-start gap-3 text-[15px]">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: far ? '#4A5A75' : scoreColor(listing.score) }}
                      >
                        <Icon name="check" size={13} />
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="place-title" className="rounded-[28px] border border-white bg-white/75 p-6">
                <h2 id="place-title" className="font-[family-name:var(--font-serif)] text-2xl font-medium">
                  The Place
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2 text-[13px] font-medium">
                  {featuresFor(listing).map((f, idx) => (
                    <li key={`${f}-${idx}`} className="rounded-full border border-[#D5DFEA] bg-white px-3 py-1.5">
                      {f}
                    </li>
                  ))}
                </ul>
                {listing.description && <p className="mt-5 text-[15px] leading-relaxed">{listing.description}</p>}
                <p className="mt-3 flex items-center gap-2 text-sm text-[#4A5A75]">
                  <Icon name="user" size={15} /> Hosted by {listing.hostName}
                </p>
              </section>

              <div className="mt-auto flex flex-col gap-2">
                {listing.isActive === false && (
                  <p role="status" className="rounded-2xl border border-[#D5DFEA] bg-white/80 px-4 py-3 text-center text-sm font-semibold">
                    This place is booked, so it&apos;s no longer taking requests.
                  </p>
                )}
                {/* hosts don't book or message their own listing; nobody books a place that's taken */}
                <div className={`grid gap-2 ${isHost || listing.isActive === false ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  <Link
                    href="/matches"
                    className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5"
                  >
                    Back
                  </Link>
                  {!isHost && listing.isActive !== false && (
                    <>
                      <Link href={`/matches/${listing.id}/book`} className="flex min-h-12 items-center justify-center rounded-full bg-[#1E2B44] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
                        Book
                      </Link>
                      <Link href={`/matches/${listing.id}/contact`} className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5">
                        Contact
                      </Link>
                    </>
                  )}
                </div>
                {isHost && (
                <Link
                  href={`/my-listings/${listing.id}/edit`}
                  className="flex min-h-10 items-center justify-center rounded-full border border-dashed border-[#A9C7E8] bg-white/70 text-xs font-semibold text-[#1E2B44] transition hover:bg-white"
                >
                  Edit this listing
                </Link>
                )}
              </div>
            </div>
          </div>
        </article>
        <p className="mt-8 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>

    </>
  )
}
