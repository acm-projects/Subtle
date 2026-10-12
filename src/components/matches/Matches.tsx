'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { SAMPLE_CONTEXT, SAMPLE_LISTINGS, type Listing, type MatchContext } from './listings'
import { commuteIcon, commuteText, Dialog, Icon, ListingPhoto, ScoreBadge } from './parts'

type Sort = 'score' | 'price' | 'commute'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'score', label: 'Best match' },
  { id: 'price', label: 'Lowest price' },
  { id: 'commute', label: 'Shortest commute' },
]

/*
  Backend hook-up points (everything else is UI):
  - listings / context props: pass the user's real matches and quiz answers
  - requestBooking, sendMessage, toggleSaved: replace the TODOs with API calls
*/
export default function Matches({
  listings = SAMPLE_LISTINGS,
  context = SAMPLE_CONTEXT,
}: {
  listings?: Listing[]
  context?: MatchContext
}) {
  const [sort, setSort] = useState<Sort>('score')
  const [savedOnly, setSavedOnly] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ kind: 'book' | 'contact'; listing: Listing } | null>(null)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')

  const shown = useMemo(() => {
    const list = savedOnly ? listings.filter((l) => saved.includes(l.id)) : [...listings]
    return list.sort((a, b) => (sort === 'score' ? b.score - a.score : sort === 'price' ? a.price - b.price : a.commuteMinutes - b.commuteMinutes))
  }, [listings, saved, savedOnly, sort])

  // TODO(backend): persist saved homes
  const toggleSaved = (id: string) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  // TODO(backend): create a booking request
  const requestBooking = () => setSent(true)
  // TODO(backend): send the message to the host
  const sendMessage = () => setSent(true)

  const openDialog = (kind: 'book' | 'contact', listing: Listing) => {
    setSent(false)
    setMessage(kind === 'contact' ? `Hi ${listing.hostName}, I'm interning at ${context.company} this summer and I'm interested in your place in ${listing.neighborhood}.` : '')
    setDialog({ kind, listing })
  }

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
              <Link href="/questionnaire" className="text-sm font-semibold underline underline-offset-2 hover:text-[#A35F33]">
                Edit my answers
              </Link>
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
              const isOpen = open === l.id
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
                          <h2 className="font-[family-name:var(--font-serif)] text-3xl font-medium leading-tight">{l.title}</h2>
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

                      {isOpen && (
                        <div className="mt-4 animate-[fadeIn_.3s_ease-out] rounded-[20px] bg-[#F4F7FA] p-4 text-sm">
                          <p className="leading-relaxed">{l.description}</p>
                          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
                            <div>
                              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#4A5A75]">Available</dt>
                              <dd>
                                {l.availableFrom} to {l.availableTo}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#4A5A75]">Host</dt>
                              <dd>{l.hostName}</dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#4A5A75]">Amenities</dt>
                              <dd>{l.amenities.join(' · ')}</dd>
                            </div>
                          </dl>
                        </div>
                      )}

                      <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                        <button
                          type="button"
                          onClick={() => openDialog('book', l)}
                          className="min-h-12 rounded-full bg-[#1E2B44] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]"
                        >
                          Book
                        </button>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpen(isOpen ? null : l.id)}
                          className="min-h-12 rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5"
                        >
                          {isOpen ? 'Hide details' : 'Details'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDialog('contact', l)}
                          className="min-h-12 rounded-full border border-[#D5DFEA] bg-white text-[15px] font-semibold transition hover:-translate-y-0.5"
                        >
                          Contact
                        </button>
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

      {dialog && (
        <Dialog title={dialog.kind === 'book' ? `Book ${dialog.listing.title}` : `Contact ${dialog.listing.hostName}`} onClose={() => setDialog(null)}>
          {sent ? (
            <div className="text-center">
              <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2B44] text-white">
                <Icon name="check" size={24} />
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-serif)] text-3xl font-medium">
                {dialog.kind === 'book' ? 'Request sent.' : 'Message sent.'}
              </h2>
              <p className="mt-2 text-[15px] text-[#4A5A75]">
                {dialog.listing.hostName} will get back to you here. (Demo only for now.)
              </p>
              <button type="button" onClick={() => setDialog(null)} className="mt-6 min-h-12 w-full rounded-full bg-[#1E2B44] font-semibold text-white">
                Done
              </button>
            </div>
          ) : dialog.kind === 'book' ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4A5A75]">Request to book</p>
              <h2 className="mt-1 font-[family-name:var(--font-serif)] text-3xl font-medium">{dialog.listing.title}</h2>
              <dl className="mt-4 space-y-2 rounded-[18px] bg-[#F4F7FA] p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5A75]">Dates</dt>
                  <dd className="font-semibold">
                    {dialog.listing.availableFrom} to {dialog.listing.availableTo}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5A75]">Monthly rent</dt>
                  <dd className="font-semibold">${dialog.listing.price.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5A75]">Commute</dt>
                  <dd className="font-semibold">{commuteText(dialog.listing)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-[#4A5A75]">You won&apos;t be charged yet. {dialog.listing.hostName} reviews requests first.</p>
              <button type="button" onClick={requestBooking} className="mt-5 min-h-12 w-full rounded-full bg-[#1E2B44] font-semibold text-white transition hover:bg-[#2F4161]">
                Send request
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4A5A75]">Message the host</p>
              <h2 className="mt-1 font-[family-name:var(--font-serif)] text-3xl font-medium">{dialog.listing.hostName}</h2>
              <label htmlFor="contact-message" className="mt-4 block text-xs font-bold uppercase tracking-[0.1em]">
                Your message
              </label>
              <textarea
                id="contact-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 w-full resize-none rounded-2xl border border-[#D5DFEA] bg-white p-3 text-[15px] outline-none focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!message.trim()}
                className="mt-4 min-h-12 w-full rounded-full bg-[#1E2B44] font-semibold text-white transition hover:bg-[#2F4161] disabled:opacity-40"
              >
                Send message
              </button>
            </div>
          )}
        </Dialog>
      )}
    </>
  )
}
