'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useScoredListing } from './useScored'
import FlowShell from './FlowShell'
import { EMPTY_CONTEXT, stayMonths, type Listing, type MatchContext } from './listings'
import { Icon } from './parts'
import { addBookingRequest } from './activity'
import HouseMascot from '../HouseMascot'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/apiFetch'
import { startBookingConversation } from '../messages/store'

const STEPS = ['Choose dates', 'Review the total', 'Send a request']

/*
  Backend hook-up points:
  - listing / context props: the real listing and the user's quiz context
  - requestBooking: create the booking request (dates + note) and return when it is saved
*/
export default function BookListing({ listing: loadedListing, context = EMPTY_CONTEXT }: { listing: Listing; context?: MatchContext }) {
  // same score, commute and safety as the Matches page and dashboard
  const listing = useScoredListing(loadedListing)
  const router = useRouter()
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sendingRef = useRef(false)
  const months = stayMonths(listing.availableFrom, listing.availableTo)
  const host = listing.hostName.split(' ')[0]

  // POST the booking request to /api/bookings, then open a thread with the host
  const requestBooking = async () => {
    if (sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setError(null)
    try {
      let guestEmail = 'intern@subtle.edu'
      let guestName = 'Summer Intern'
      try {
        const savedUser = localStorage.getItem('subtle-user-v1')
        if (savedUser) {
          const u = JSON.parse(savedUser)
          if (u.email) guestEmail = u.email
          if (u.firstName) guestName = `${u.firstName} ${u.lastName ?? ''}`.trim()
        }
      } catch {}
      try {
        const { data } = await supabase.auth.getUser()
        if (data.user?.email) guestEmail = data.user.email
        const meta = data.user?.user_metadata ?? {}
        const fn = ((meta.first_name ?? meta.firstName ?? '') as string).trim()
        const ln = ((meta.last_name ?? meta.lastName ?? '') as string).trim()
        if (fn) guestName = `${fn} ${ln}`.trim()
      } catch {}

      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          listingTitle: listing.title,
          hostName: listing.hostName,
          moveIn: listing.availableFrom,
          moveOut: listing.availableTo,
          monthlyRent: listing.price,
          note,
          guestEmail,
          guestName,
        }),
      })
      if (!res.ok) throw new Error('Could not send your request. Please try again.')

      // booking saved: open a thread with the host and go straight to it
      // (a failure here must not undo the booking)
      let threadId: string | null = null
      try {
        threadId = await startBookingConversation(
          { id: listing.id, title: listing.title, score: listing.nearWork === false ? undefined : listing.score, hostName: listing.hostName, hostId: listing.hostId ?? undefined },
          { moveIn: listing.availableFrom, moveOut: listing.availableTo, note },
        )
      } catch {}

      if (threadId) {
        setRedirecting(true)
        router.push(`/messages?c=${threadId}`)
        return
      }
      setSent(true) // no thread (sample listing, logged out): show the normal confirmation
    } catch (e) {
      console.error('Error submitting booking:', e)
      setError(e instanceof Error ? e.message : 'Could not send your request. Please try again.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const commute = listing.nearWork === false ? 'far from your office' : `${listing.commuteMinutes} min ${listing.commuteMode === 'walk' ? 'walk' : listing.commuteMode === 'transit' ? 'by transit' : listing.commuteMode === 'bike' ? 'bike' : 'drive'}`

  return (
    <FlowShell listing={listing} context={context} title={sent ? 'Request sent.' : `Book the ${listing.title}`} caption={Array.from(new Set([listing.roomType, listing.tags[0] ?? listing.homeType])).join(' · ') + ` · From ${listing.availableFrom}`}>
      {sent ? (
        <div className="my-auto animate-[fadeIn_.3s_ease-out] py-6" role="status">
          <HouseMascot label="Subtle's house mascot waving" className="-ml-2 h-32 w-32" />
          <p className="mt-3 text-[17px] text-[#4A5A75]">
            {host} usually confirms within a day.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link href={`/matches/${listing.id}`} className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white font-semibold transition hover:-translate-y-0.5">
              Back to listing
            </Link>
            <Link href="/matches" className="flex min-h-12 items-center justify-center rounded-full bg-[#1E2B44] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
              All matches
            </Link>
          </div>
        </div>
      ) : (
        <>

          <ol className="mt-6 space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-[15px]">
                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3F8] text-xs font-bold">
                  {i + 1}
                </span>
                <span>
                  {s}
                  {i === 2 && <span className="block text-sm text-[#4A5A75]">{host} confirms within a day.</span>}
                </span>
              </li>
            ))}
          </ol>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ['Move-in', listing.availableFrom],
              ['Move-out', listing.availableTo],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-[20px] border border-white bg-white/80 px-4 py-3.5">
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#4A5A75]">
                  <Icon name="calendar" size={15} /> {label}
                </dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <label htmlFor="book-note" className="mt-5 block text-xs font-bold uppercase tracking-[0.1em]">
            Note to {host} <span className="font-medium normal-case tracking-normal text-[#4A5A75]">(optional, e.g. different dates)</span>
          </label>
          <textarea
            id="book-note"
            rows={2}
            maxLength={1500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full resize-none rounded-2xl border border-[#D5DFEA] bg-white p-3 text-[15px] outline-none focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
          />

          <div className="mt-5 rounded-[20px] bg-[#F4F7FA] p-4">
            <p className="flex justify-between gap-4 text-[15px] font-semibold">
              <span>First month due when accepted</span>
              <span>${listing.price.toLocaleString()}</span>
            </p>
            {months && (
              <p className="mt-1 flex justify-between gap-4 text-sm text-[#4A5A75]">
                <span>Estimated summer total · about {months} months</span>
                <span>${(listing.price * months).toLocaleString()}</span>
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm font-semibold text-[#8A3A2A]">
              {error}
            </p>
          )}

          <div className="mt-6 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 lg:mt-auto lg:pt-6">
            <Link
              href={`/matches/${listing.id}`}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D5DFEA] bg-white font-semibold transition hover:-translate-y-0.5"
            >
              <Icon name="arrowL" size={16} /> Back
            </Link>
            <button
              type="button"
              onClick={requestBooking}
              disabled={sending || redirecting}
              className="min-h-12 rounded-full bg-[#1E2B44] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] disabled:opacity-60"
            >
              {sending || redirecting ? 'Sending…' : 'Request to book'}
            </button>
          </div>
        </>
      )}
    </FlowShell>
  )
}