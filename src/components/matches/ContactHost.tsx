'use client'

import Link from 'next/link'
import { useState } from 'react'
import FlowShell from './FlowShell'
import { SAMPLE_CONTEXT, type Listing, type MatchContext } from './listings'
import { Icon } from './parts'

/*
  Backend hook-up points:
  - listing / context props: the real listing (with host info) and the user's quiz context
  - sendMessage: send the message to the host and return when it is saved
*/
export default function ContactHost({ listing, context = SAMPLE_CONTEXT }: { listing: Listing; context?: MatchContext }) {
  const host = listing.hostName.split(' ')[0]
  const initials = listing.hostName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const [message, setMessage] = useState(
    `Hi ${host}, I'm interning at ${context.company} this summer and I'm interested in the ${listing.title}.`,
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // TODO(backend): POST the message { listingId: listing.id, body: message }
  const sendMessage = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 500))
    setSending(false)
    setSent(true)
  }

  const commute = `${listing.commuteMinutes} min ${listing.commuteMode === 'walk' ? 'walk' : listing.commuteMode === 'transit' ? 'by transit' : listing.commuteMode === 'bike' ? 'bike' : 'drive'}`
  const hostMeta = [listing.hostVerified ? 'Verified .edu sub-leaser' : 'Sub-leaser', listing.hostReplyTime].filter(Boolean).join(' · ')

  return (
    <FlowShell listing={listing} context={context} caption={`$${listing.price.toLocaleString()} / month · ${commute}`}>
      {sent ? (
        <div className="my-auto animate-[fadeIn_.3s_ease-out] py-6" role="status">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2B44] text-white">
            <Icon name="check" size={24} />
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em]">Message sent.</h1>
          <p className="mt-3 text-[17px] text-[#4A5A75]">{host} will reply here. (Demo only for now.)</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link href={`/matches/${listing.id}`} className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white font-semibold transition hover:-translate-y-0.5">
              Back to listing
            </Link>
            <Link href={`/matches/${listing.id}/book`} className="flex min-h-12 items-center justify-center rounded-full bg-[#1E2B44] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
              Book it
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="w-fit rounded-full bg-[#EEF3F8] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">Contact</p>
          <h1 className="mt-3 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em]">Message the sub-leaser</h1>
          <p className="mt-2 text-[17px] text-[#4A5A75]">
            About the {listing.title} · {listing.score} Subtle score
          </p>

          <div className="mt-6 flex items-center gap-4 rounded-[24px] border border-white bg-white/80 p-4">
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#C9DBEA] font-[family-name:var(--font-serif)] text-2xl font-medium">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-serif)] text-2xl font-medium leading-tight">{listing.hostName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#4A5A75]">
                {listing.hostVerified && <Icon name="shield" size={14} />} {hostMeta}
              </p>
              {listing.hostEmail && (
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  {listing.hostEmail}
                </p>
              )}
            </div>
          </div>

          <label htmlFor="contact-message" className="mt-6 block text-xs font-bold uppercase tracking-[0.1em]">
            Your message
          </label>
          <textarea
            id="contact-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1.5 w-full resize-none rounded-2xl border border-[#D5DFEA] bg-white p-4 text-[15px] leading-relaxed outline-none focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
          />

          <div className="mt-6 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 lg:mt-auto lg:pt-6">
            <Link
              href={`/matches/${listing.id}`}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D5DFEA] bg-white font-semibold transition hover:-translate-y-0.5"
            >
              <Icon name="arrowL" size={16} /> Back
            </Link>
            <button
              type="button"
              onClick={sendMessage}
              disabled={!message.trim() || sending}
              className="min-h-12 rounded-full bg-[#1E2B44] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </>
      )}
    </FlowShell>
  )
}
