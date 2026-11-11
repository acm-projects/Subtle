'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppNavbar from '../AppNavbar'
import { ScoreBadge } from '../matches/parts'
import { supabase } from '../../lib/supabase'
import {
  answerInvite,
  createGroup,
  dayLabel,
  initials,
  inviteToGroup,
  loadConversations,
  loadGroupStuff,
  markRead,
  sendMessage,
  shortTime,
  type Conversation,
  type GroupInvite,
  type Message,
  type Person,
} from './store'

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

  // always-current copy of the conversations, so the realtime handler can check it without re-subscribing
  const convosRef = useRef(conversations)
  convosRef.current = conversations

  // group chats: who I can add, invites waiting for my yes / no, and the "new group" / "add people" form
  const [connections, setConnections] = useState<Person[]>([])
  const [invites, setInvites] = useState<GroupInvite[]>([])
  const [groupForm, setGroupForm] = useState<null | 'new' | 'add'>(null)
  const [groupName, setGroupName] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [groupBusy, setGroupBusy] = useState(false)
  const [groupError, setGroupError] = useState('')
  const [groupNote, setGroupNote] = useState('')

  const refresh = () => {
    loadConversations().then(setConversations)
    loadGroupStuff().then((g) => {
      setConnections(g.connections)
      setInvites(g.invites)
    })
  }
  useEffect(refresh, [])

  // live updates: new messages land in the open thread (and the list) without a reload.
  // RLS decides which inserts this user receives.
  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const myId = data.user?.id
      if (!myId || cancelled) return

      channel = supabase
        .channel('messages-page')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const row = payload.new as { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }

            // a conversation this page doesn't have yet (new DM or group): reload the list
            if (!convosRef.current?.some((c) => c.id === row.conversation_id)) {
              loadConversations().then(setConversations)
              return
            }

            setConversations((list) => {
              const convo = list?.find((c) => c.id === row.conversation_id)
              if (!list || !convo || convo.messages.some((m) => m.id === row.id)) return list // already have it

              const mine = row.sender_id === myId
              const msg: Message = {
                id: row.id,
                from: mine ? 'me' : 'them',
                senderName: mine ? undefined : convo.members?.find((p) => p.id === row.sender_id)?.name ?? 'Former member',
                body: row.body,
                sentAt: row.created_at,
              }
              const updated = { ...convo, messages: [...convo.messages, msg], unread: mine ? convo.unread : true }
              return [updated, ...list.filter((c) => c.id !== convo.id)] // bump to top
            })
          },
        )
        .subscribe((status, err) => console.log('messages channel', status, err))
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
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
    setGroupNote('')
    router.replace(id ? `/messages?c=${id}` : '/messages', { scroll: false })
  }

  const send = async () => {
    const body = draft.trim()
    if (!body || !selected || sending) return
    setSending(true)
    const msg = await sendMessage(selected.id, body)
    setConversations((list) => {
      if (!list) return list
      // the realtime event can arrive before this POST resolves, so don't add the message twice
      const updated = list.map((c) =>
        c.id === selected.id
          ? { ...c, messages: c.messages.some((m) => m.id === msg.id) ? c.messages : [...c.messages, msg] }
          : c,
      )
      // move this conversation to the top, like any messaging app
      return [updated.find((c) => c.id === selected.id)!, ...updated.filter((c) => c.id !== selected.id)]
    })
    setDraft('')
    setSending(false)
    inputRef.current?.focus()
  }

  const unreadCount = (conversations?.filter((c) => c.unread).length ?? 0) + invites.length

  const openGroupForm = (mode: 'new' | 'add') => {
    setGroupForm(mode)
    setGroupName('')
    setPicked([])
    setGroupError('')
    setGroupNote('')
  }

  const submitGroup = async () => {
    if (groupBusy || !picked.length) return
    if (groupForm === 'new' && !groupName.trim()) return setGroupError('Give the group a name.')
    setGroupBusy(true)
    setGroupError('')
    try {
      if (groupForm === 'new') {
        const id = await createGroup(groupName.trim(), picked)
        setGroupForm(null)
        refresh()
        open(id)
      } else if (selected) {
        const n = await inviteToGroup(selected.id, picked)
        setGroupForm(null)
        setGroupNote(n ? `Invite sent to ${n} ${n === 1 ? 'person' : 'people'}. They'll join once they say yes.` : 'Everyone you picked is already in the group.')
      }
    } catch (e) {
      setGroupError(e instanceof Error ? e.message : 'Something went wrong')
    }
    setGroupBusy(false)
  }

  const respond = async (invite: GroupInvite, accept: boolean) => {
    setInvites((list) => list.filter((i) => i.id !== invite.id))
    try {
      const id = await answerInvite(invite.id, accept)
      if (id) {
        const fresh = await loadConversations()
        setConversations(fresh)
        open(id)
      }
    } catch {
      setInvites((list) => [invite, ...list]) // put it back so they can try again
    }
  }

  // people shown in the "add people" form: my connections not already in this group
  const pickable = groupForm === 'add' && selected ? connections.filter((p) => !selected.members?.some((m) => m.id === p.id)) : connections

  const list = (
    <div className={`flex min-h-0 flex-col border-[#E4EAF1] md:border-r ${selected ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-5 pb-3 md:p-6 md:pb-3">
        <label htmlFor="msg-search" className="sr-only">
          Search messages
        </label>
        <div className="flex min-h-11 items-center gap-2 rounded-full border border-[#D5DFEA] bg-white px-4 focus-within:border-[#2F4161] focus-within:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-[#4A5A75]">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input id="msg-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, places, messages" className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-[#5F6E84]" />
        </div>
        <button
          type="button"
          onClick={() => openGroupForm('new')}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#D5DFEA] bg-white text-sm font-semibold text-[#1E2B44] transition hover:-translate-y-0.5 hover:border-[#2F4161]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New group
        </button>
      </div>

      {invites.length > 0 && (
        <ul className="space-y-2 px-4 pb-2" aria-label="Group invites">
          {invites.map((inv) => (
            <li key={inv.id} className="animate-[popIn_.35s_cubic-bezier(.2,.8,.3,1.05)_both] rounded-[20px] border border-[#F3C9A0] bg-[#FFF7EF] p-4">
              {inv.company ? (
                <p className="text-sm text-[#1E2B44]">
                  Hey! There&apos;s a group chat with all the interns from{' '}
                  <span className="font-semibold">{inv.title.replace(/^Interns at /, '')}</span>.
                </p>
              ) : (
                <p className="text-sm text-[#1E2B44]">
                  <span className="font-semibold">{inv.invitedBy}</span> wants to add you to{' '}
                  <span className="font-semibold">{inv.title}</span>
                </p>
              )}
              <p className="mt-1 truncate text-xs text-[#4A5A75]">
                {inv.members.length > 0 ? `In it: ${inv.members.join(', ')}` : 'You’d be the first one in.'}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#1E2B44]">{inv.company ? 'Want to join?' : 'Join this group?'}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => respond(inv, true)} className="min-h-10 flex-1 rounded-full bg-[#1E2B44] text-sm font-semibold text-white transition hover:bg-[#2F4161]">
                  Yes
                </button>
                <button type="button" onClick={() => respond(inv, false)} className="min-h-10 flex-1 rounded-full border border-[#D5DFEA] bg-white text-sm font-semibold text-[#1E2B44] transition hover:border-[#2F4161]">
                  No
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

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
            {query ? 'No conversations match that search.' : 'No messages yet. Contact a host from matches to start one.'}
            {!query && (
              <Link href="/matches" className="mx-auto mt-4 flex min-h-11 w-fit items-center rounded-full bg-[#1E2B44] px-5 font-semibold text-white">
                Browse matches
              </Link>
            )}
          </li>
        )}
      </ul>
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
            {selected.isGroup ? (
              <>{['You', ...(selected.members ?? []).map((m) => m.name)].join(', ')}</>
            ) : selected.listingId ? (
              <>
                {selected.iAmHost ? 'Interested in' : 'Sub-leaser'} ·{' '}
                <Link href={`/matches/${selected.listingId}`} className="font-semibold text-[#2F4161] underline-offset-2 hover:underline">
                  {selected.listingTitle}
                </Link>
              </>
            ) : (
              'Connection'
            )}
          </p>
        </div>
        {selected.listingScore !== undefined && <ScoreBadge score={selected.listingScore} size={40} />}
        {selected.isGroup && (
          <button
            type="button"
            onClick={() => openGroupForm('add')}
            className="flex min-h-11 items-center rounded-full border border-[#D5DFEA] bg-white px-4 text-sm font-semibold text-[#1E2B44] transition hover:-translate-y-0.5 hover:border-[#2F4161]"
          >
            Add people
          </button>
        )}
        {selected.listingId && !selected.isGroup && !selected.iAmHost && (
          <Link
            href={`/matches/${selected.listingId}/book`}
            className="hidden min-h-11 items-center rounded-full bg-[#1E2B44] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] sm:flex"
          >
            Book
          </Link>
        )}
      </div>

      {/* messages */}
      <div role="log" aria-live="polite" aria-label={`Conversation with ${selected.hostName}`} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {selected.messages.map((m, i) => {
          const prev = selected.messages[i - 1]
          const next = selected.messages[i + 1]
          const newDay = !prev || dayLabel(prev.sentAt) !== dayLabel(m.sentAt)
          const gapAfter = !next || next.from !== m.from || new Date(next.sentAt).getTime() - new Date(m.sentAt).getTime() > 10 * 60_000
          const mine = m.from === 'me'
          const showSender = !!selected.isGroup && !mine && (newDay || !prev || prev.from === 'me' || prev.senderName !== m.senderName)
          return (
            <div key={m.id}>
              {newDay && (
                <p className="my-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#4A5A75]">{dayLabel(m.sentAt)}</p>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${gapAfter ? 'mb-4' : 'mb-1'}`}>
                <div className={`max-w-[78%] md:max-w-[62%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {showSender && <span className="mb-1 px-1 text-xs font-semibold text-[#2F4161]">{m.senderName}</span>}
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
        {selected.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-[#4A5A75]">No messages yet. Say hi to {selected.hostName}.</p>
        )}
        {groupNote && <p className="py-2 text-center text-xs font-semibold text-[#2F4161]">{groupNote}</p>}
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
      <section className="px-4 pb-10 pt-32 md:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          {/* same heading treatment as the renter dashboard */}
          <header className="flex animate-[fadeIn_.5s_ease-out] flex-wrap items-end justify-between gap-4 md:pl-10">
            <div>
              <h1 className="font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-6xl">Messages</h1>
            </div>
            {unreadCount > 0 && <span className="mb-2 rounded-full bg-[#1E2B44] px-3 py-1 text-xs font-bold text-white">{unreadCount} new</span>}
          </header>

          {/* height leaves room for the navbar, the heading and the footer gap */}
          <div className="mt-6 grid h-[calc(100dvh-17rem)] min-h-[520px] w-full animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[36px] border border-white bg-white/60 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
            {list}
            {thread}
          </div>
        </div>
      </section>

      {groupForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2B44]/30 p-4 backdrop-blur-sm" onClick={() => setGroupForm(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-form-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              submitGroup()
            }}
            className="w-full max-w-md animate-[popIn_.3s_cubic-bezier(.2,.8,.3,1.05)_both] rounded-[28px] border border-white bg-white p-6 shadow-[0_30px_70px_-30px_rgba(30,43,68,0.5)]"
          >
            <h2 id="group-form-title" className="font-[family-name:var(--font-serif)] text-3xl font-medium">
              {groupForm === 'new' ? 'New group' : `Add to ${selected?.hostName ?? 'group'}`}
            </h2>
            <p className="mt-1 text-sm text-[#4A5A75]">Each person gets a yes / no invite in their Messages and joins only if they say yes.</p>

            {groupForm === 'new' && (
              <>
                <label htmlFor="group-name" className="mt-5 block text-sm font-semibold">
                  Group name
                </label>
                <input
                  id="group-name"
                  value={groupName}
                  maxLength={60}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Summer interns"
                  className="mt-2 min-h-11 w-full rounded-full border border-[#D5DFEA] bg-white px-4 text-[15px] outline-none focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
                />
              </>
            )}

            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">Your connections</legend>
              <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                {pickable.map((p) => {
                  const on = picked.includes(p.id)
                  return (
                    <li key={p.id}>
                      <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] px-3 transition ${on ? 'bg-[#EEF3F8]' : 'hover:bg-[#F4F7FB]'}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setPicked((list) => (on ? list.filter((x) => x !== p.id) : [...list, p.id]))}
                          className="h-4 w-4 accent-[#1E2B44]"
                        />
                        <Avatar name={p.name} size={32} />
                        <span className="text-[15px] font-semibold">{p.name}</span>
                      </label>
                    </li>
                  )
                })}
                {pickable.length === 0 && (
                  <li className="py-4 text-sm text-[#4A5A75]">
                    {groupForm === 'add' ? 'All your connections are already in this group.' : 'No connections yet. Connect with interns first, then start a group.'}
                    {groupForm === 'new' && (
                      <Link href="/internMatches" className="mt-2 block font-semibold text-[#2F4161] underline-offset-2 hover:underline">
                        Find interns
                      </Link>
                    )}
                  </li>
                )}
              </ul>
            </fieldset>

            {groupError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-[#9A3B1E]">
                {groupError}
              </p>
            )}

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setGroupForm(null)} className="min-h-11 flex-1 rounded-full border border-[#D5DFEA] bg-white text-sm font-semibold">
                Cancel
              </button>
              <button
                type="submit"
                disabled={groupBusy || !picked.length}
                className="min-h-11 flex-1 rounded-full bg-[#1E2B44] text-sm font-semibold text-white transition hover:bg-[#2F4161] disabled:opacity-40"
              >
                {groupBusy ? 'Sending…' : groupForm === 'new' ? 'Create & invite' : 'Send invites'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}