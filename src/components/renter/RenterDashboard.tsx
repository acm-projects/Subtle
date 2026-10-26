'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppNavbar from '../AppNavbar'
import HouseMascot from '../HouseMascot'
import Icon from '../quiz/icons'
import { getMyListings, type Listing } from '../../lib/listings'

type Booking = { id: string; guestName: string; guestEmail: string; moveIn: string; moveOut: string; note: string; status: 'pending' | 'accepted' | 'declined'; createdAt: string }
type Thread = { id: string; listingId: string; messages: { from: 'me' | 'them'; body: string; sentAt: string }[] }
type Activity = { views: number; bookings: Booking[]; threads: Thread[] }

const glass = 'rounded-[32px] border border-white bg-white/65 shadow-[0_30px_70px_-40px_rgba(30,43,68,0.38)] backdrop-blur-xl'
const eyebrow = 'text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]'
const serif = 'font-[family-name:var(--font-serif)]'
const btnDark = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1E2B44] px-6 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]'
const btnLight = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D5DFEA] bg-white/80 px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-white'

const shortDate = (iso: string | null) => {
  if (!iso) return 'Flexible'
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : iso
}
const ago = (iso: string) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} d ago`
}

/*
  Renter (host) view: every place this user posted, with views and who wants to talk.
  Data: getMyListings (Supabase), /api/listing-views, /api/bookings?listingId=, /api/messages.
  TODO(backend): messages need the sender's name/email so hosts can see who wrote.
*/
async function loadActivity(id: string, threads: Thread[]): Promise<Activity> {
  const [views, bookings] = await Promise.all([
    fetch(`/api/listing-views?listingId=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { views: 0 }))
      .then((j) => Number(j.views) || 0)
      .catch(() => 0),
    fetch(`/api/bookings?listingId=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { bookings: [] }))
      .then((j) => (Array.isArray(j.bookings) ? (j.bookings as Booking[]) : []))
      .catch(() => [] as Booking[]),
  ])
  return { views, bookings, threads: threads.filter((t) => t.listingId === id) }
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="rounded-[22px] border border-white bg-white/80 p-4">
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#4A5A75]">
        <Icon name={icon} size={14} /> {label}
      </span>
      <p className={`${serif} mt-1 text-4xl font-medium tabular-nums`}>{value}</p>
    </div>
  )
}

export default function RenterDashboard() {
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [activity, setActivity] = useState<Record<string, Activity>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // accept or decline a booking request; the intern sees the result on their dashboard
  // TODO(backend): PATCH /api/bookings keeps this in server memory until bookings move to Supabase
  const decide = async (listingId: string, bookingId: string, status: 'accepted' | 'declined' | 'pending') => {
    setBusy(bookingId)
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, status }),
      })
      if (res.ok) {
        const updated = (await res.json()) as Booking
        setActivity((all) => ({
          ...all,
          [listingId]: { ...all[listingId], bookings: all[listingId].bookings.map((b) => (b.id === bookingId ? { ...b, status: updated.status } : b)) },
        }))
      }
    } catch {}
    setBusy(null)
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      let mine: Listing[] = []
      try {
        mine = await getMyListings()
      } catch {
        if (alive) setNeedsLogin(true)
      }
      let threads: Thread[] = []
      try {
        const res = await fetch('/api/messages', { cache: 'no-store' })
        if (res.ok) threads = ((await res.json()).conversations ?? []) as Thread[]
      } catch {}
      const entries = await Promise.all(mine.map(async (l) => [l.id, await loadActivity(l.id, threads)] as const))
      if (!alive) return
      setListings(mine)
      setActivity(Object.fromEntries(entries))
      setLoading(false)
    }
    load()
    // refresh when you come back to the tab (and every 20s), so new requests and host replies show up
    const onFocus = () => document.visibilityState === 'visible' && load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const timer = setInterval(onFocus, 20000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      clearInterval(timer)
      alive = false
    }
  }, [])

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/matches/${id}`)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  return (
    <>
      <AppNavbar firstName="" />
      <section className="px-4 pb-16 pt-32 md:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          <header className="flex animate-[fadeIn_.5s_ease-out] flex-wrap items-end justify-between gap-6 md:pl-10">
            <div>
              <p className={eyebrow}>For hosts</p>
              <h1 className={`${serif} mt-2 text-5xl font-medium tracking-[-0.02em] md:text-6xl`}>Your listings</h1>
              <p className="mt-2 text-[17px] text-[#4A5A75]">See who&apos;s looking at your place and who wants to talk.</p>
            </div>
            <Link href="/post" className={btnLight}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Post a place
            </Link>
          </header>

          {loading ? (
            <div className={`${glass} mt-10 p-8`}>
              <div className="h-7 w-56 animate-pulse rounded-xl bg-[#E4EAF1]" />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="h-24 animate-pulse rounded-[22px] bg-[#E4EAF1]" />
                ))}
              </div>
            </div>
          ) : listings.length === 0 ? (
            <div className={`${glass} mt-10 grid items-center gap-8 p-8 md:grid-cols-[1fr_auto] md:p-12`}>
              <div>
                <h2 className={`${serif} text-4xl font-medium`}>{needsLogin ? 'Log in to see your listings' : 'Nothing posted yet'}</h2>
                <p className="mt-3 max-w-md text-[16px] text-[#4A5A75]">
                  {needsLogin
                    ? 'Your listings, views and requests show up here once you’re logged in.'
                    : 'Post your place and you’ll see views, booking requests and messages from interns right here.'}
                </p>
                <div className="mt-6">
                  <Link href={needsLogin ? '/login?mode=login' : '/post'} className={btnDark}>
                    {needsLogin ? 'Log in' : 'Post your place'} <Icon name="arrowR" size={16} />
                  </Link>
                </div>
              </div>
              <HouseMascot label="Subtle's house mascot" className="mx-auto h-48 w-48" />
            </div>
          ) : (
            <div className="mt-10 space-y-6">
              {listings.map((l, idx) => {
                const act = activity[l.id] ?? { views: 0, bookings: [], threads: [] }
                const cover = l.image_urls?.[0]
                const people = act.bookings.length + act.threads.length
                return (
                  <article
                    key={l.id}
                    className={`${glass} animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] p-6 md:p-8`}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                      {/* the place */}
                      <div className="flex gap-4">
                        <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-[20px] bg-gradient-to-b from-[#C9DBEA] to-[#F3E6DA]">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-[#2F4161]">
                              <Icon name="home" size={32} />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${l.is_active ? 'bg-[#E3F1E8] text-[#2E6B45]' : 'bg-[#EEF3F8] text-[#4A5A75]'}`}>
                            {l.is_active ? 'Live' : 'Paused'}
                          </span>
                          <h2 className={`${serif} mt-2 truncate text-3xl font-medium`}>{l.title || 'Your place'}</h2>
                          <p className="mt-1 text-[15px] text-[#4A5A75]">
                            {l.monthly_rent ? `$${l.monthly_rent.toLocaleString()} / month · ` : ''}
                            {shortDate(l.start_date)} – {shortDate(l.end_date)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href={`/matches/${l.id}`} className={btnLight}>
                              View listing
                            </Link>
                            <button type="button" onClick={() => copyLink(l.id)} className={btnLight}>
                              {copied === l.id ? 'Link copied' : 'Copy link'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* numbers */}
                      <div className="grid grid-cols-3 gap-3">
                        <Stat icon="sparkle" value={act.views} label="Views" />
                        <Stat icon="calendar" value={act.bookings.length} label="Requests" />
                        <Stat icon="people" value={act.threads.length} label="Messages" />
                      </div>
                    </div>

                    {/* who wants to talk */}
                    <div className="mt-6 border-t border-[#E4EAF1] pt-5">
                      <p className={eyebrow}>Who wants to connect {people > 0 ? `· ${people}` : ''}</p>
                      {people === 0 ? (
                        <p className="mt-3 text-[15px] text-[#4A5A75]">
                          No one has reached out yet. Share your link to get it in front of more interns.
                        </p>
                      ) : (
                        <ul className="mt-3 grid gap-3 md:grid-cols-2">
                          {[...act.bookings].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).map((b) => (
                            <li key={b.id} className="flex items-start gap-3 rounded-[22px] border border-white bg-white/80 p-4">
                              <span aria-hidden="true" className={`${serif} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C9DBEA] text-lg font-medium`}>
                                {(b.guestName || 'I').charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="truncate font-semibold">
                                    {b.guestName || 'An intern'}
                                    {b.status === 'pending' && <span className="ml-2 rounded-full bg-[#1E2B44] px-2 py-0.5 align-middle text-[10px] font-bold text-white">new</span>}
                                  </p>
                                  <span className="shrink-0 text-xs text-[#4A5A75]">{ago(b.createdAt)}</span>
                                </div>
                                <p className="text-sm text-[#4A5A75]">
                                  Wants to book · {b.moveIn || 'Flexible'} – {b.moveOut || 'Flexible'}
                                </p>
                                {b.note && <p className="mt-1 line-clamp-2 text-sm">&ldquo;{b.note}&rdquo;</p>}
                                {b.status === 'pending' ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={busy === b.id}
                                      onClick={() => decide(l.id, b.id, 'accepted')}
                                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#1E2B44] px-4 text-sm font-semibold text-white transition hover:bg-[#2F4161] disabled:opacity-50"
                                    >
                                      <Icon name="check" size={14} /> Accept
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy === b.id}
                                      onClick={() => decide(l.id, b.id, 'declined')}
                                      className="inline-flex min-h-10 items-center rounded-full border border-[#D5DFEA] bg-white px-4 text-sm font-semibold transition hover:bg-[#F7F9FB] disabled:opacity-50"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                        b.status === 'accepted' ? 'bg-[#E3F1E8] text-[#2E6B45]' : 'bg-[#FBEDE4] text-[#8A4B26]'
                                      }`}
                                    >
                                      {b.status === 'accepted' && <Icon name="check" size={12} />}
                                      {b.status === 'accepted' ? 'Accepted' : 'Declined'}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={busy === b.id}
                                      onClick={() => decide(l.id, b.id, 'pending')}
                                      className="text-xs font-semibold text-[#4A5A75] underline underline-offset-2 hover:text-[#1E2B44]"
                                    >
                                      Undo
                                    </button>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                          {act.threads.map((t) => {
                            const last = t.messages[t.messages.length - 1]
                            return (
                              <li key={t.id}>
                                <Link href={`/messages?c=${t.id}`} className="flex items-start gap-3 rounded-[22px] border border-white bg-white/80 p-4 transition hover:bg-white">
                                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3E3D2]">
                                    <Icon name="people" size={18} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <p className="truncate font-semibold">Message from an intern</p>
                                      {last && <span className="shrink-0 text-xs text-[#4A5A75]">{ago(last.sentAt)}</span>}
                                    </div>
                                    <p className="line-clamp-2 text-sm text-[#4A5A75]">{last?.body}</p>
                                  </div>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
        <p className="mt-12 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
