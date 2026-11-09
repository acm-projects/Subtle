'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/apiFetch' 
/* ---------- types & constants ---------- */

type Connection = {
  id: string
  otherId: string
  name: string
  avatarUrl: string | null
  shared: number
  score: number | null
  status: 'pending' | 'accepted'
  incoming: boolean
}

type Tab = 'connected' | 'requests' | 'sent'

const AVATAR_COLORS = ['#6f8fbf', '#c07a45', '#4f6a9a', '#7a6f9a', '#8a6f4f']
const colorFor = (id: string) =>
  AVATAR_COLORS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

const glass = 'rounded-[32px] border border-white bg-white/65 shadow-[0_30px_70px_-40px_rgba(30,43,68,0.38)] backdrop-blur-xl'
const serif = 'font-[family-name:var(--font-serif)]'
const btnCls =
  'h-9 rounded-full border border-[#cfd8ea] bg-white px-4 text-sm font-semibold text-[#1f2a44] transition hover:bg-[#f2f5fb] focus-visible:ring-2 focus-visible:ring-[#1f2a44] disabled:opacity-50'
const btnDark =
  'h-9 rounded-full bg-[#1f2a44] px-4 text-sm font-semibold text-white transition hover:bg-[#2b3a5e] focus-visible:ring-2 focus-visible:ring-[#1f2a44] disabled:opacity-50'

/* ---------- small UI ---------- */

function Avatar({ id, url, name }: { id: string; url: string | null; name: string }) {
  const [a, b] = name.split(' ')
  const style = { width: 44, height: 44, fontSize: 14 }
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  }
  return (
    <span
      style={{ ...style, background: colorFor(id) }}
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
    >
      {`${a?.[0] ?? ''}${b?.[0] ?? ''}`.toUpperCase() || '?'}
    </span>
  )
}

/* ---------- component ---------- */

export default function ConnectionsCard() {
  const router = useRouter()
  const [connections, setConnections] = useState<Connection[]>([])
  const [opening, setOpening] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('connected')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const flash = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setMsg({ tone, text })
    window.setTimeout(() => setMsg(null), 4000)
  }, [])

    useEffect(() => {
    ;(async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const userId = auth.user?.id
        if (!userId) return

        // your own interests, to count shared ones
        const { data: meRow } = await supabase
          .from('public_profiles')
          .select('user_interests')
          .eq('user_id', userId)
          .maybeSingle()
        const mine: string[] = meRow?.user_interests ?? []

        const { data: rows } = await supabase
          .from('connections')
          .select('id, requester_id, addressee_id, status, score')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        if (!rows?.length) return setConnections([])

        // the other person in each connection
        const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))
        const { data: people } = await supabase
          .from('public_profiles')
          .select('user_id, first_name, last_name, user_interests')
          .in('user_id', otherIds)
        const byId = new Map((people ?? []).map((p) => [p.user_id, p]))

        setConnections(
          rows.map((r) => {
            const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id
            const p = byId.get(otherId)
            const interests: string[] = p?.user_interests ?? []
            return {
              id: r.id,
              otherId,
              name: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Subtle user' : 'Subtle user',
              avatarUrl: null, // photos live in auth metadata, which other users can't read
              shared: interests.filter((i: string) => mine.includes(i)).length,
              score: r.score,
              status: r.status,
              incoming: r.addressee_id === userId,
            }
          }),
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function respond(c: Connection, accept: boolean) {
    const q = accept
      ? supabase.from('connections').update({ status: 'accepted' }).eq('id', c.id)
      : supabase.from('connections').delete().eq('id', c.id)
    const { error } = await q
    if (error) return flash('Something went wrong. Try again.', 'err')
    setConnections((cur) =>
      accept ? cur.map((x) => (x.id === c.id ? { ...x, status: 'accepted' } : x)) : cur.filter((x) => x.id !== c.id),
    )
    flash(accept ? `You're now connected with ${c.name}.` : 'Removed.')
  }

  async function openThread(c: Connection) {
  if (opening) return
  setOpening(c.id)
  try {
    // starts a thread with this person, or reuses the existing one
    const res = await apiFetch('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ otherUserId: c.otherId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.error ?? 'Could not open the conversation')
    }
    const { id } = await res.json()
    router.push(`/messages?c=${id}`)
  } catch (e) {
    flash(e instanceof Error ? e.message : 'Could not open the conversation.', 'err')
    setOpening(null)
  }
  }

  async function removeConnection(c: Connection) {
    if (!window.confirm(`Remove ${c.name} from connections?`)) return
    await respond(c, false)
  }

  const connected = connections.filter((c) => c.status === 'accepted')
  const requests = connections.filter((c) => c.status === 'pending' && c.incoming)
  const sent = connections.filter((c) => c.status === 'pending' && !c.incoming)
  const visible = tab === 'connected' ? connected : tab === 'requests' ? requests : sent

  return (
    <section
      className={`${glass} flex h-full animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.05)_both] flex-col p-6 [animation-delay:150ms] md:p-7`}
    >
      <h2 className={`${serif} text-3xl font-medium`}>Connections</h2>
      <p className="mb-4 mt-1 text-[15px] text-[#4A5A75]">
        {connected.length} connected · {requests.length} {requests.length === 1 ? 'request' : 'requests'} waiting
      </p>

      <div role="tablist" className="mb-4 flex gap-1 rounded-full bg-[#e8edf7] p-1">
        {([
          ['connected', 'Connected', 0],
          ['requests', 'Requests', requests.length],
          ['sent', 'Sent', 0],
        ] as [Tab, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-10 flex-1 rounded-full text-[13px] font-semibold transition focus-visible:ring-2 focus-visible:ring-[#1f2a44] ${
              tab === key ? 'bg-[#1f2a44] text-white' : 'text-[#3d4a6b]'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 inline-block min-w-[18px] rounded-full bg-[#b5662f] px-1 text-[11px] leading-[18px] text-white">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <ul className="flex flex-1 flex-col gap-2.5" role="tabpanel">
        {loading && <li className="h-20 animate-pulse rounded-2xl bg-[#E4EAF1]" />}
        {!loading && visible.length === 0 && (
          <li className="rounded-2xl bg-white p-4 text-[13px] text-[#4a5878]">
            {tab === 'connected' && 'No connections yet. Find interns with shared interests.'}
            {tab === 'requests' && 'No requests waiting on you.'}
            {tab === 'sent' && "You haven't sent any requests."}
          </li>
        )}
        {visible.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3.5 rounded-[18px] bg-white p-3">
            <Avatar id={c.otherId} url={c.avatarUrl} name={c.name} />
            <div className="min-w-[120px] flex-1">
              <p className="truncate text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-[#4a5878]">
                {c.shared} shared {c.shared === 1 ? 'interest' : 'interests'}
              </p>
            </div>
            {c.score !== null && (
              <span
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#3b7a4a] text-xs font-bold text-white"
                aria-label={`Subtle score ${c.score}`}
              >
                {c.score}
              </span>
            )}
            <div className="flex w-full gap-1.5 pl-[58px]">
              {c.status === 'accepted' && (
                <>
                  <button type="button" onClick={() => openThread(c)} disabled={opening === c.id} className={btnCls}>
                  {opening === c.id ? 'Opening…' : 'Message'}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => removeConnection(c)}
                    className={`${btnCls} !text-[#8a3a2a]`}
                  >
                    Remove
                  </button>
                </>
              )}
              {c.status === 'pending' && c.incoming && (
                <>
                  <button type="button" onClick={() => respond(c, true)} className={btnDark}>
                    Accept
                  </button>
                  <button type="button" onClick={() => respond(c, false)} className={btnCls}>
                    Decline
                  </button>
                </>
              )}
              {c.status === 'pending' && !c.incoming && (
                <button type="button" onClick={() => respond(c, false)} className={btnCls}>
                  Cancel request
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className={`mt-3 min-h-5 text-sm font-semibold ${msg?.tone === 'err' ? 'text-[#8a3a2a]' : 'text-[#2f6b3f]'}`}>
        {msg?.text}
      </p>

      <Link
        href="/internMatches"
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#D5DFEA] bg-white/80 px-6 text-[15px] font-semibold transition hover:bg-white"
      >
        Find more matches
      </Link>
    </section>
  )
}