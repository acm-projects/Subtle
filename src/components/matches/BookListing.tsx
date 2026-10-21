'use client'

import Link from 'next/link'
import { useState } from 'react'
import FlowShell from './FlowShell'
import { SAMPLE_CONTEXT, stayMonths, type Listing, type MatchContext } from './listings'
import { Icon } from './parts'

const STEPS = ['Choose your dates', 'Review the total', 'Send a request']

/*
  Backend hook-up points:
  - listing / context props: the real listing and the user's quiz context
  - requestBooking: create the booking request (dates + note) and return when it is saved
*/
export default function BookListing({ listing, context = SAMPLE_CONTEXT }: { listing: Listing; context?: MatchContext }) {
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const months = stayMonths(listing.availableFrom, listing.availableTo)
  const host = listing.hostName.split(' ')[0]

  // POST the booking request to /api/bookings
  const requestBooking = async () => {
    setSending(true)
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

      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (e) {
      console.error('Error submitting booking:', e)
    }
    setSending(false)
    setSent(true)
  }

  const commute = `${listing.commuteMinutes} min ${listing.commuteMode === 'walk' ? 'walk' : listing.commuteMode === 'transit' ? 'by transit' : listing.commuteMode === 'bike' ? 'bike' : 'drive'}`

  return (
    <FlowShell listing={listing} context={context} caption={`${listing.roomType} · ${listing.tags[0] ?? listing.homeType} · From ${listing.availableFrom}`}>
      {sent ? (
        <div className="my-auto animate-[fadeIn_.3s_ease-out] py-6" role="status">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2B44] text-white">
            <Icon name="check" size={24} />
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em]">Request sent.</h1>
          <p className="mt-3 text-[17px] text-[#4A5A75]">
            {host} usually confirms within a day. You won&apos;t be charged until they accept. (Demo only for now.)
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
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">How to book</p>
          <h1 className="mt-2 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em]">Book the {listing.title}</h1>
          <p className="mt-2 text-[17px] text-[#4A5A75]">
            {listing.score} Subtle score · ${listing.price.toLocaleString()} / month · {commute}
          </p>

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
              disabled={sending}
              className="min-h-12 rounded-full bg-[#1E2B44] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Request to book'}
            </button>
          </div>
        </>
      )}
    </FlowShell>
  )
}
