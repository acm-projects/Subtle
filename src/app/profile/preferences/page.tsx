'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import AppNavbar from "../../../components/AppNavbar";
import { Field } from '../../../components/quiz/parts'
import DateRange from '../../../components/quiz/DateRange'


import {
  ACCOMMODATIONS,
  allInterests,
  BUDGETS,
  EMPTY,
  INTERESTS,
  MIN_INTERESTS,
  monthIdFor,
  type QuizAnswers,
  SCHOOLS,
} from '../../../components/quiz/options'

/* ---------- small UI pieces ---------- */

type Opt = { id: string; title: string; body?: string }

const card = 'rounded-[28px] border border-white bg-white/70 p-6 shadow-[0_10px_40px_rgba(31,42,68,0.08)] backdrop-blur md:p-7'
const labelCls = 'text-[15px] font-semibold text-[#1E2B44]'
const btnLight =
  'min-h-11 rounded-full border border-[#D5DFEA] bg-white px-5 text-sm font-semibold text-[#1E2B44] transition hover:bg-[#F7F9FB] focus-visible:ring-2 focus-visible:ring-[#1E2B44] disabled:cursor-not-allowed disabled:opacity-50'
const btnDark =
  'min-h-11 rounded-full bg-[#1E2B44] px-6 text-sm font-semibold text-white transition hover:bg-[#2F4161] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E2B44] disabled:cursor-not-allowed disabled:opacity-40'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h2 className="font-[family-name:var(--font-serif)] text-[28px] font-medium">{title}</h2>
      <div className="mt-5 flex flex-col gap-6">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-2">
        <span className={labelCls}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function Chip({ on, onClick, title, children }: { on: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-[#1E2B44] ${
        on ? 'border-[#1E2B44] bg-[#1E2B44] text-white' : 'border-[#D5DFEA] bg-white text-[#1E2B44] hover:bg-[#F7F9FB]'
      }`}
    >
      {children}
    </button>
  )
}

// one chip per option; `multi` allows several to be on at once
function Choices({ options, isOn, onPick }: { options: readonly Opt[]; isOn: (id: string) => boolean; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.id} on={isOn(o.id)} title={o.body} onClick={() => onPick(o.id)}>
          {o.title}
        </Chip>
      ))}
    </div>
  )
}

/* ---------- page ---------- */

export default function PreferencesPage() {
  const router = useRouter()

  const [a, setA] = useState<QuizAnswers>(EMPTY)
  const [saved, setSaved] = useState<QuizAnswers>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const flash = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ tone, text })
    window.setTimeout(() => setToast(null), 4000)
  }, [])

  // load the same answers the questionnaire keeps for this account
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return router.replace('/login')
      const meta = data.user.user_metadata ?? {}
      const mail = (data.user.email ?? '').toLowerCase()
      setFirstName(((meta.first_name ?? meta.firstName ?? '') as string).trim())
      setLastName(((meta.last_name ?? meta.lastName ?? '') as string).trim())
      setEmail(data.user.email ?? '')

      let loaded: QuizAnswers = EMPTY
      try {
        // answers saved in this browser only count if they belong to this account
        const owner = localStorage.getItem('subtle-quiz-owner')
        const raw = localStorage.getItem('subtle-quiz-v1')
        if (raw && (!owner || owner === mail)) loaded = { ...EMPTY, ...JSON.parse(raw) }
      } catch {}
      setA(loaded)
      setSaved(loaded)
      setLoading(false)
    })()
  }, [router])

  const set = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => setA((prev) => ({ ...prev, [key]: value }))

  const toggle = (key: 'accommodations' | 'interests', id: string) =>
    setA((prev) => {
      const list = prev[key]
      if (key === 'accommodations') {
        // "No specific needs" clears the others, and picking any need clears it
        if (id === 'none') return { ...prev, accommodations: list.includes('none') ? [] : ['none'] }
        const rest = list.filter((x) => x !== 'none')
        return { ...prev, accommodations: rest.includes(id) ? rest.filter((x) => x !== id) : [...rest, id] }
      }
      return { ...prev, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }
    })

  const dirty = useMemo(() => JSON.stringify(a) !== JSON.stringify(saved), [a, saved])

  // the same required answers the questionnaire asks for
  const missing = [
    !a.university.trim() && 'school',
    !a.company.trim() && 'company',
    !a.address.trim() && 'office address',
    a.budget === null && 'budget',
    a.accommodations.length === 0 && 'accommodations',
    !(a.moveInDate && a.moveOutDate) && 'move-in and move-out dates',
    a.interests.length < MIN_INTERESTS && `at least ${MIN_INTERESTS} interests`,
  ].filter(Boolean) as string[]

  async function save() {
    if (missing.length) return
    setSaving(true)
    try {
      // keep this browser in sync with the questionnaire
      localStorage.setItem('subtle-quiz-v1', JSON.stringify(a))
      if (email) localStorage.setItem('subtle-quiz-owner', email.toLowerCase())
    } catch {}

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      // same body the questionnaire sends when it finishes
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          firstName: firstName || 'Intern',
          lastName: lastName || 'Student',
          email: email || 'intern@subtle.edu',
          company: a.company,
          address: a.address,
          budget: a.budget,
          roommates: a.roommates,
          university: a.university.trim(),
          interests: allInterests(a),
          housingType: a.housingType,
          accommodations: a.accommodations,
          moveIn: a.moveInDate || a.moveIn,
          moveOut: a.moveOutDate, // TODO(backend): save the move-out date (users_table has no column yet)
          commuteMode: a.commuteMode,
          car: a.car,
          maxCommute: a.maxCommute,
          transitImportance: a.transitImportance,
          gender: a.roommatePrefs.gender,
          numRoommates: a.roommatePrefs.count,
          noise: a.roommatePrefs.noise,
          cleanliness: a.roommatePrefs.cleanliness,
          guests: a.roommatePrefs.guests,
          sleep: a.roommatePrefs.schedule,
          temperature: a.roommatePrefs.temperature,
          age: a.roommatePrefs.age,
        }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      setSaved(a)
      flash('Preferences updated. New matches will reflect them.')
    } catch (e) {
      console.warn("Couldn't save preferences:", e)
      flash("Saved on this device, but we couldn't update the account. Try again.", 'err')
    }
    setSaving(false)
  }

  if (loading) {
    return <main className="min-h-screen bg-gradient-to-b from-[#c3d5ee] to-[#f6e6d2] p-10 text-[#1E2B44]">Loading…</main>
  }

  const mins = a.maxCommute >= 60 ? '60+' : String(a.maxCommute)
  const noAnswers = JSON.stringify(saved) === JSON.stringify(EMPTY)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#c3d5ee] via-[#e6ebf4] to-[#f6e6d2] px-6 pb-28 pt-28 text-[#1E2B44]">
      <AppNavbar firstName={firstName} />

      <div className="mx-auto flex max-w-[820px] flex-col gap-6">
        <header className="animate-[fadeIn_.5s_ease-out]">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1E2B44]/80 px-4 text-sm text-white font-semibold transition hover:bg-[#1E2B44] focus-visible:ring-2 focus-visible:ring-white"
          >
            <span aria-hidden="true">←</span> Back to profile
          </button>
          <h1 className="mt-2 font-medium text-5xl font-[family-name:var(--font-serif)] tracking-[-0.02em] md:text-6xl">Preferences</h1>
          <p className="mt-2 text-[15px] text-[#3D4A6B]">
            Every questionnaire answer is below. Change any of them and save to refresh matches.
          </p>
          {noAnswers && (
            <p className="mt-3 rounded-2xl border border-white bg-white/70 px-4 py-3 text-sm">
              We couldn&apos;t find saved answers on this device. Fill them in below, or finish the questionnaire first.
            </p>
          )}
        </header>

        {/* About you */}
        <Section title="School">
          <div>
            <Field id="university" label="University" icon="book" value={a.university} onChange={(v: string) => set('university', v)} placeholder="e.g. UT Dallas" list="school-options" />
            <datalist id="school-options">
              {SCHOOLS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </Section>

        {/* Work & commute */}
        <Section title="Work and Commute">
          <Field id="company" label="Company or internship" icon="building" value={a.company} onChange={(v: string) => set('company', v)} placeholder="e.g. Stripe" />
          <Field id="address" label="Office address or city" icon="pin" value={a.address} onChange={(v: string) => set('address', v)} placeholder="e.g. 500 Howard St, San Francisco, CA" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="commute-range" className={labelCls}>Max One-Way Commute</label>
              <span className="rounded-full bg-[#1E2B44] px-3 py-1 text-sm font-semibold tabular-nums text-white">{mins} min</span>
            </div>
            <input id="commute-range" type="range" min={5} max={60} step={5} value={a.maxCommute} onChange={(e) => set('maxCommute', Number(e.target.value))} className="mt-3 w-full accent-[#1E2B44]" />
          </div>

        </Section>

        {/* Budget & housing */}
        <Section title="Budget and Housing">
          <Row label="Monthly housing budget">
            <Choices options={BUDGETS} isOn={(id) => a.budget === id} onPick={(id) => set('budget', id as QuizAnswers['budget'])} />
          </Row>

          <Row label="Accommodations">
            <Choices options={ACCOMMODATIONS} isOn={(id) => a.accommodations.includes(id)} onPick={(id) => toggle('accommodations', id)} />
          </Row>

          <Row label="Move-In and Move-Out">
            <DateRange
              start={a.moveInDate}
              end={a.moveOutDate}
              onChange={(start, end) => setA((prev) => ({ ...prev, moveInDate: start, moveOutDate: end, moveIn: start ? monthIdFor(start) : null }))}
            />
          </Row>
        </Section>

        {/* Interests */}
        <Section title="Interests">
          <Row label={`Pick at least ${MIN_INTERESTS}`}>
            <Choices options={INTERESTS} isOn={(id) => a.interests.includes(id)} onPick={(id) => toggle('interests', id)} />
          </Row>
          <div>
            <label htmlFor="other-interests" className={`${labelCls} mb-2 block`}>
              Anything else?
            </label>
            <input
              id="other-interests"
              value={a.otherInterests}
              onChange={(e) => set('otherInterests', e.target.value)}
              placeholder="e.g. pottery, chess, running club"
              className="h-12 w-full rounded-2xl border border-[#D5DFEA] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#6B7691] focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
            />
          </div>
        </Section>
      </div>

      {/* save bar */}
      <div className="fixed inset-x-0 bottom-4 z-40 px-4">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-3 rounded-full border border-white bg-white/85 py-2.5 pl-6 pr-2.5 shadow-[0_20px_50px_-30px_rgba(30,43,68,0.45)] backdrop-blur-xl">
          
          <div className="flex gap-2">
            <button type="button" onClick={() => setA(saved)} disabled={saving} className={btnLight}>
              Discard
            </button>
            <button type="button" onClick={save} disabled={saving} className={btnDark}>
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center px-4">
        {toast && (
          <p className={`pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg ${toast.tone === 'ok' ? 'bg-[#1E2B44]' : 'bg-[#8A3A2A]'}`}>
            {toast.text}
          </p>
        )}
      </div>
    </main>
  )
}