'use client'

import Link from 'next/link'
import { useMatchContext, useScoredListing } from './useScored'
import { useEffect, useState } from 'react'
import FlowShell from './FlowShell'
import { EMPTY_CONTEXT, type Listing, type MatchContext } from './listings'
import { Icon } from './parts'
import { startConversation } from '../messages/store'

/*
  Backend hook-up points:
  - listing / context props: the real listing (with host info) and the user's quiz context
  - sendMessage: send the message to the host and return when it is saved
*/
export default function ContactHost({ listing: loadedListing, context: initialContext = EMPTY_CONTEXT }: { listing: Listing; context?: MatchContext }) {
  // same score, commute and safety as the Matches page and dashboard
  const listing = useScoredListing(loadedListing)
  const context = useMatchContext(initialContext)
  const host = listing.hostName.split(' ')[0]
  const initials = listing.hostName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const draft = (company: string) => `Hi ${host}, I'm interning${company ? ` at ${company}` : ''} this summer and I'm interested in the ${listing.title}.`
  const [message, setMessage] = useState(draft(context.company))
  const [edited, setEdited] = useState(false)
  // once the real company loads, swap it into the draft (unless they've started typing)
  useEffect(() => {
    if (!edited) setMessage(draft(context.company))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.company])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  // real listings message the host through Supabase (Caitlin's /api/conversations)
  const [error, setError] = useState<string | null>(null)
  const sendMessage = async () => {
    if (!listing.hostId) {
      setError('This listing has no host to message yet.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const id = await startConversation(
        { id: listing.id, title: listing.title, score: listing.nearWork === false ? undefined : listing.score, hostName: listing.hostName, hostId: listing.hostId },
        message.trim(),
      )
      setConversationId(id)
      setSent(true)
    } catch (e: any) {
      setError(e?.message ?? "Couldn't send your message. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const commute = listing.nearWork === false ? 'far from your office' : `${listing.commuteMinutes} min ${listing.commuteMode === 'walk' ? 'walk' : listing.commuteMode === 'transit' ? 'by transit' : listing.commuteMode === 'bike' ? 'bike' : 'drive'}`
  const hostMeta = [listing.hostVerified ? 'Verified .edu sub-leaser' : 'Sub-leaser', listing.hostReplyTime].filter(Boolean).join(' · ')

  return (
    <FlowShell listing={listing} context={context} caption={`$${listing.price.toLocaleString()} / month · ${commute}`}>
      {sent ? (
        <div className="my-auto animate-[fadeIn_.3s_ease-out] py-6" role="status">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2B44] text-white">
            <Icon name="check" size={24} />
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em]">Message sent.</h1>
          <p className="mt-3 text-[17px] text-[#4A5A75]">{host} will reply in Messages. (Demo only for now.)</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link href={`/matches/${listing.id}`} className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white font-semibold transition hover:-translate-y-0.5">
              Back to listing
            </Link>
            <Link
              href={conversationId ? `/messages?c=${conversationId}` : '/messages'}
              className="flex min-h-12 items-center justify-center rounded-full bg-[#1E2B44] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]"
            >
              Open messages
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em]">Message the sub-leaser</h1>
          <p className="mt-2 text-[17px] text-[#4A5A75]">
            About the {listing.title}{listing.nearWork === false ? ' · far from your office' : ` · ${listing.score} Subtle score`}
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

          <label htmlFor="contact-message" className="mt-6 block text-[15px] font-semibold">
            Message
          </label>
          <textarea
            id="contact-message"
            rows={5}
            value={message}
            onChange={(e) => {
              setEdited(true)
              setMessage(e.target.value)
            }}
            className="mt-1.5 w-full resize-none rounded-2xl border border-[#D5DFEA] bg-white p-4 text-[15px] leading-relaxed outline-none focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
          />
          {error && (
            <p role="alert" className="mt-4 rounded-2xl border border-[#E8C4BC] bg-[#FBEDEA] px-4 py-3 text-sm font-semibold text-[#8A3A2A]">
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
