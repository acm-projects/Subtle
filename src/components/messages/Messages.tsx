'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { ScoreBadge } from '../matches/parts'
import { dayLabel, initials, loadConversations, markRead, sendMessage, shortTime, type Conversation } from './store'

const AVATAR = [
  'bg-[#C9DBEA] text-[#1E2B44]',
  'bg-[#F3C9A0] text-[#1E2B44]',
  'bg-[#1E2B44] text-white',
  'bg-[#E4EAF1] text-[#1E2B44]',
]
const avatarTone = (name: string) => AVATAR[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR.length]

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-serif)] font-medium ${avatarTone(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  )
}

export default function Messages() {
  const router = useRouter()
  const params = useSearchParams()
  const selectedId = params.get('c')

  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadConversations().then(setConversations)
  }, [])

  const selected = conversations?.find((c) => c.id === selectedId) ?? null

  // mark as read when opened
  useEffect(() => {
    if (!selected?.unread) return
    markRead(selected.id)
    setConversations((list) => list?.map((c) => (c.id === selected.id ? { ...c, unread: false } : c)) ?? null)
  }, [selected?.id, selected?.unread])

  // keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [selected?.id, selected?.messages.length])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!conversations) return []
    if (!q) return conversations
    return conversations.filter((c) => [c.hostName, c.listingTitle, ...c.messages.map((m) => m.body)].some((t) => t.toLowerCase().includes(q)))
  }, [conversations, query])

  const open = (id: string | null) => {
    setDraft('')
    router.replace(id ? `/messages?c=${id}` : '/messages', { scroll: false })
  }

  const send = async () => {
    const body = draft.trim()
    if (!body || !selected || sending) return
    setSending(true)
    const msg = await sendMessage(selected.id, body)
    setConversations((list) => {
      if (!list) return list
      const updated = list.map((c) => (c.id === selected.id ? { ...c, messages: [...c.messages, msg] } : c))
      // move this conversation to the top, like any messaging app
      return [updated.find((c) => c.id === selected.id)!, ...updated.filter((c) => c.id !== selected.id)]
    })
    setDraft('')
    setSending(false)
    inputRef.current?.focus()
  }

  const unreadCount = conversations?.filter((c) => c.unread).length ?? 0

  const list = (
    <div className={`flex min-h-0 flex-col border-[#E4EAF1] md:border-r ${selected ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-5 pb-3 md:p-6 md:pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-[family-name:var(--font-serif)] text-4xl font-medium tracking-[-0.02em]">Messages</h1>
          {unreadCount > 0 && <span className="rounded-full bg-[#1E2B44] px-2.5 py-0.5 text-xs font-bold text-white">{unreadCount} new</span>}
        </div>
        <label htmlFor="msg-search" className="sr-only">
          Search messages
        </label>
        <div className="mt-4 flex min-h-11 items-center gap-2 rounded-full border border-[#D5DFEA] bg-white px-4 focus-within:border-[#2F4161] focus-within:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-[#4A5A75]">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input id="msg-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, places, messages" className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-[#5F6E84]" />
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Conversations">
        {conversations === null &&
          [0, 1, 2].map((k) => (
            <li key={k} className="m-1 flex animate-pulse items-center gap-3 rounded-[20px] p-3">
              <span className="h-12 w-12 rounded-full bg-[#E4EAF1]" />
              <span className="flex-1 space-y-2">
                <span className="block h-3 w-1/2 rounded bg-[#E4EAF1]" />
                <span className="block h-3 w-3/4 rounded bg-[#EEF3F8]" />
              </span>
            </li>
          ))}
        {shown.map((c, i) => {
          const last = c.messages[c.messages.length - 1]
          const active = c.id === selectedId
          return (
            <li key={c.id} className="animate-[popIn_.35s_cubic-bezier(.2,.8,.3,1.05)_both]" style={{ animationDelay: `${i * 50}ms` }}>
              <button
                type="button"
                onClick={() => open(c.id)}
                aria-current={active ? 'true' : undefined}
                className={`m-0.5 flex w-[calc(100%-4px)] items-center gap-3 rounded-[20px] p-3 text-left transition ${
                  active ? 'bg-white shadow-[0_14px_30px_-20px_rgba(30,43,68,0.55)]' : 'hover:bg-white/70'
                }`}
              >
                <Avatar name={c.hostName} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[15px] ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.hostName}</span>
                    <span className="shrink-0 text-xs text-[#4A5A75]">{last ? shortTime(last.sentAt) : ''}</span>
                  </span>
                  <span className="block truncate text-xs font-semibold text-[#2F4161]">{c.listingTitle}</span>
                  <span className={`mt-0.5 flex items-center gap-2 text-sm ${c.unread ? 'font-semibold text-[#1E2B44]' : 'text-[#4A5A75]'}`}>
                    <span className="truncate">
                      {last?.from === 'me' ? 'You: ' : ''}
                      {last?.body}
                    </span>
                    {c.unread && <span aria-label="Unread" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#C27A4A]" />}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
        {conversations && shown.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-[#4A5A75]">
            {query ? 'No conversations match that search.' : 'No messages yet. Contact a host from your matches to start one.'}
            {!query && (
              <Link href="/matches" className="mx-auto mt-4 flex min-h-11 w-fit items-center rounded-full bg-[#1E2B44] px-5 font-semibold text-white">
                Browse matches
              </Link>
            )}
          </li>
        )}
      </ul>
      {conversations?.some((c) => c.sample) && <p className="px-6 pb-4 text-[11px] text-[#4A5A75]">Includes sample conversations for the demo.</p>}
    </div>
  )

  const thread = selected ? (
    <div className="flex min-h-0 flex-col">
      {/* thread header */}
      <div className="flex items-center gap-3 border-b border-[#E4EAF1] px-4 py-3 md:px-6 md:py-4">
        <button type="button" onClick={() => open(null)} aria-label="Back to conversations" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white md:hidden">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <Avatar name={selected.hostName} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-serif)] text-2xl font-medium leading-tight">{selected.hostName}</p>
          <p className="truncate text-sm text-[#4A5A75]">
            Sub-leaser ·{' '}
            <Link href={`/matches/${selected.listingId}`} className="font-semibold text-[#2F4161] underline-offset-2 hover:underline">
              {selected.listingTitle}
            </Link>
          </p>
        </div>
        {selected.listingScore !== undefined && <ScoreBadge score={selected.listingScore} size={40} />}
        <Link
          href={`/matches/${selected.listingId}/book`}
          className="hidden min-h-11 items-center rounded-full bg-[#1E2B44] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] sm:flex"
        >
          Book
        </Link>
      </div>

      {/* messages */}
      <div role="log" aria-live="polite" aria-label={`Conversation with ${selected.hostName}`} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {selected.messages.map((m, i) => {
          const prev = selected.messages[i - 1]
          const next = selected.messages[i + 1]
          const newDay = !prev || dayLabel(prev.sentAt) !== dayLabel(m.sentAt)
          const gapAfter = !next || next.from !== m.from || new Date(next.sentAt).getTime() - new Date(m.sentAt).getTime() > 10 * 60_000
          const mine = m.from === 'me'
          return (
            <div key={m.id}>
              {newDay && (
                <p className="my-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#4A5A75]">{dayLabel(m.sentAt)}</p>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${gapAfter ? 'mb-4' : 'mb-1'}`}>
                <div className={`max-w-[78%] md:max-w-[62%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  <p
                    className={`animate-[fadeIn_.3s_ease-out] whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed shadow-[0_10px_24px_-18px_rgba(30,43,68,0.6)] ${
                      mine ? 'rounded-[22px] rounded-br-md bg-[#1E2B44] text-white' : 'rounded-[22px] rounded-bl-md border border-white bg-white text-[#1E2B44]'
                    }`}
                  >
                    {m.body}
                  </p>
                  {gapAfter && <span className="mt-1 px-1 text-[11px] text-[#4A5A75]">{new Date(m.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex items-end gap-2 border-t border-[#E4EAF1] p-3 md:p-4"
      >
        <label htmlFor="msg-input" className="sr-only">
          Message {selected.hostName}
        </label>
        <textarea
          ref={inputRef}
          id="msg-input"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={`Message ${selected.hostName}`}
          className="max-h-36 min-h-12 flex-1 resize-none rounded-[24px] border border-[#D5DFEA] bg-white px-5 py-3 text-[15px] outline-none [field-sizing:content] placeholder:text-[#5F6E84] focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1E2B44] text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  ) : (
    <div className="hidden flex-col items-center justify-center p-10 text-center md:flex">
      <span aria-hidden="true" className="flex h-20 w-20 animate-bob items-center justify-center rounded-full bg-white shadow-[0_20px_40px_-24px_rgba(30,43,68,0.5)]">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2F4161" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v11H9l-5 4z" />
        </svg>
      </span>
      <p className="mt-5 font-[family-name:var(--font-serif)] text-3xl font-medium">Pick a conversation</p>
      <p className="mt-2 max-w-xs text-[15px] text-[#4A5A75]">Everyone you&apos;ve contacted shows up on the left. Tap one to keep chatting.</p>
    </div>
  )

  return (
    <>
      <AppNavbar firstName="" />
      <section className="px-4 pb-10 pt-28 md:px-8">
        <div className="mx-auto grid h-[calc(100dvh-10rem)] min-h-[560px] w-full max-w-[1240px] animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[36px] border border-white bg-white/60 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          {list}
          {thread}
        </div>
      </section>
    </>
  )
}
