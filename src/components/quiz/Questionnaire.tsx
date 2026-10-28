'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppNavbar from '../AppNavbar'
import Icon from './icons'
import { Field, OptionRow } from './parts'
import Journey from './Journey'
import DateRange from './DateRange'
import {
  ACCOMMODATIONS,
  BUDGETS,
  buildSteps,
  allInterests,
  EMPTY,
  INTERESTS,
  MIN_INTERESTS,
  label,
  monthIdFor,
  prettyDate,
  type QuizAnswers,
  SCHOOLS,
  SECTIONS,
  type StepId,
} from './options'

export default function Questionnaire() {
  const [a, setA] = useState<QuizAnswers>(EMPTY)
  const [index, setIndex] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // read-only: greet by first name if the account has one, and restore saved answers
  useEffect(() => {
    try {
      const savedQuiz = localStorage.getItem('subtle-quiz-v1')
      if (savedQuiz) {
        setA((prev) => ({ ...prev, ...JSON.parse(savedQuiz) }))
      }
      const savedUser = localStorage.getItem('subtle-user-v1')
      if (savedUser) {
        const u = JSON.parse(savedUser)
        if (u.firstName) setFirstName(u.firstName)
        if (u.lastName) setLastName(u.lastName)
        if (u.email) setUserEmail(u.email)
      }
    } catch {}
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {}
      const fn = ((meta.first_name ?? meta.firstName ?? '') as string).trim()
      const ln = ((meta.last_name ?? meta.lastName ?? '') as string).trim()
      if (fn) setFirstName(fn)
      if (ln) setLastName(ln)
      if (data.user?.email) {
        setUserEmail(data.user.email)
        // answers saved in this browser belong to whoever took the quiz; a different account starts fresh
        try {
          if (localStorage.getItem('subtle-quiz-owner') !== data.user.email.toLowerCase()) {
            setA(EMPTY)
            setIndex(0)
          }
        } catch {}
      }
    })
  }, [])

  const steps = useMemo(() => buildSteps(a), [a])
  const step = steps[Math.min(index, steps.length - 1)]
  // the journey panel: one stop per question (roommate extras don't count)
  const journeySteps = steps.filter((s) => s.id !== 'done' && !s.extra)
  const journeyAt = Math.max(0, journeySteps.findIndex((s) => s.id === step.id))
  const set = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => setA((prev) => ({ ...prev, [key]: value }))
  const toggle = (key: 'accommodations' | 'interests' | 'hangouts', id: string) =>
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

  // numbering inside a section (the roommate extras page isn't counted)
  const sectionSteps = steps.filter((s) => s.section === step.section && !s.extra)
  const qNum = sectionSteps.findIndex((s) => s.id === step.id) + 1
  const progress = step.extra
    ? ((sectionSteps.findIndex((s) => s.id === 'roommates') + 1) / sectionSteps.length) * 100
    : (qNum / Math.max(sectionSteps.length, 1)) * 100

  const canContinue: Record<StepId, boolean> = {
    school: a.university.trim() !== '',
    work: a.company.trim() !== '' && a.address.trim() !== '',
    commute: true,
    budget: a.budget !== null,
    roommates: a.roommates !== null,
    roommatePrefs: true,
    housingType: a.housingType !== null,
    accommodations: a.accommodations.length > 0,
    car: a.car !== null,
    moveIn: a.moveInDate !== '' && a.moveOutDate !== '',
    transit: true,
    interests: a.interests.length >= MIN_INTERESTS,
    hangouts: true,
    done: true,
  }

  const saveQuizProgress = async (nextStepId?: StepId, latestAnswers: QuizAnswers = a) => {
    try {
      localStorage.setItem('subtle-quiz-v1', JSON.stringify(latestAnswers))
      if (userEmail) localStorage.setItem('subtle-quiz-owner', userEmail.toLowerCase())
    } catch {}
    if (nextStepId === 'done') {
      try {
        let email = userEmail
        let fn = firstName
        let ln = lastName

        if (!email) {
          const { data } = await supabase.auth.getUser()
          if (data.user?.email) email = data.user.email
          const meta = data.user?.user_metadata ?? {}
          if (!fn) fn = ((meta.first_name ?? meta.firstName ?? '') as string).trim()
          if (!ln) ln = ((meta.last_name ?? meta.lastName ?? '') as string).trim()
        }

        if (!email) {
          try {
            const savedUser = localStorage.getItem('subtle-user-v1')
            if (savedUser) {
              const u = JSON.parse(savedUser)
              if (u.email) email = u.email
              if (!fn && u.firstName) fn = u.firstName
              if (!ln && u.lastName) ln = u.lastName
            }
          } catch {}
        }

        // send the login token so the server saves the row as this user (the table only lets you write your own row)
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            firstName: fn || 'Intern',
            lastName: ln || 'Student',
            email: email || 'intern@subtle.edu',
            company: latestAnswers.company,
            address: latestAnswers.address,
            budget: latestAnswers.budget,
            roommates: latestAnswers.roommates,
            university: latestAnswers.university.trim(), // TODO(backend): add a university column in users_table and map it in /api/users
            interests: allInterests(latestAnswers),
            housingType: latestAnswers.housingType,
            accommodations: latestAnswers.accommodations,
            moveIn: latestAnswers.moveInDate || latestAnswers.moveIn,
            moveOut: latestAnswers.moveOutDate, // TODO(backend): save the move-out date (users_table has no column yet)
            commuteMode: latestAnswers.commuteMode,
            car: latestAnswers.car,
            maxCommute: latestAnswers.maxCommute,
            transitImportance: latestAnswers.transitImportance,
            gender: latestAnswers.roommatePrefs.gender,
            numRoommates: latestAnswers.roommatePrefs.count,
            noise: latestAnswers.roommatePrefs.noise,
            cleanliness: latestAnswers.roommatePrefs.cleanliness,
            guests: latestAnswers.roommatePrefs.guests,
            sleep: latestAnswers.roommatePrefs.schedule,
            temperature: latestAnswers.roommatePrefs.temperature,
            age: latestAnswers.roommatePrefs.age,
          }),
        })

        // answers are already saved in this browser, so a failed save never blocks the quiz
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          console.warn(`Couldn't save quiz answers to Supabase (status ${res.status}):`, errData?.error ?? 'no details')
        }
      } catch (e) {
        console.warn("Couldn't reach /api/users to save quiz answers:", e)
      }
    }
  }

  const go = (i: number) => {
    const clamped = Math.max(0, Math.min(i, steps.length - 1))
    void saveQuizProgress(steps[clamped]?.id, a)
    setIndex(clamped)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const nextStep = steps[index + 1]
  const nextLabel =
    step.id === 'interests'
      ? 'Finish'
      : nextStep && nextStep.section !== step.section
        ? `Next section (${SECTIONS[nextStep.section]})`
        : 'Next question'

  const mins = a.maxCommute >= 60 ? '60+' : String(a.maxCommute)

  /* right-side panel copy, based on answers */
  const panel: Partial<Record<StepId, { tag: string; icon: string; title: string; caption: string }>> = {
    school: {
      tag: 'School',
      icon: 'book',
      title: a.university.trim() || 'Where you study',
      caption: 'Interns from the same school get a boost in matches.',
    },
    work: {
      tag: 'Commute radius',
      icon: 'map',
      title: a.company.trim() || 'Office',
      caption: a.address.trim() ? `${a.address.trim()} · ${mins} min commute target` : 'Add the office address to set a commute.',
    },
    commute: {
      tag: 'Commute',
      icon: 'clock',
      title: `Up to ${mins} minutes`,
      caption: `Neighborhoods within ${mins} min of the office.`,
    },
    budget: {
      tag: 'Budget match',
      icon: 'dollar',
      title: a.budget ? 'Within budget.' : 'Set a budget.',
      caption: a.budget ? `Verified sublets ${BUDGETS.find((b) => b.id === a.budget)?.range}.` : 'We only show homes inside it.',
    },
    accommodations: {
      tag: 'Accommodations',
      icon: a.accommodations.includes('pets') ? 'paw' : a.accommodations.includes('accessible') ? 'access' : 'shield',
      title: a.accommodations.length && !a.accommodations.includes('none') ? 'Filtered for you.' : 'Every verified sublet.',
      caption: 'Filtered before we show you homes.',
    },
    moveIn: {
      tag: 'Move-in',
      icon: 'calendar',
      title: 'Open for summer.',
      caption: a.moveInDate && a.moveOutDate ? `Homes open ${prettyDate(a.moveInDate)} to ${prettyDate(a.moveOutDate)}.` : 'Pick the days you move in and out.',
    },
    interests: {
      tag: 'Interests',
      icon: 'music',
      title: a.interests.length ? `${a.interests.length} picked.` : 'Shared tastes.',
      caption: 'The more you pick, the better we match you with interns like you.',
    },
  }

  /* question content */
  const content: Partial<Record<StepId, { title: string; sub?: string; body: React.ReactNode }>> = {
    school: {
      title: 'Where do you go to school?',
      sub: 'Interns from the same school show up higher in intern matches, and it helps hosts know who you are.',
      body: (
        <div className="space-y-4">
          <Field id="university" label="University" icon="book" value={a.university} onChange={(v) => set('university', v)} placeholder="e.g. UT Dallas" list="school-options" />
          <datalist id="school-options">
            {SCHOOLS.map((sch) => (
              <option key={sch} value={sch} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-2">
            {SCHOOLS.slice(0, 6).map((sch) => (
              <button
                key={sch}
                type="button"
                aria-pressed={a.university === sch}
                onClick={() => set('university', sch)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${
                  a.university === sch ? 'border-[#1E2B44] bg-[#1E2B44] text-white' : 'border-[#D5DFEA] bg-white/70 hover:bg-white'
                }`}
              >
                {sch}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    work: {
      title: 'Where will you be working this summer?',
      sub: 'We’ll use the office address to calculate commute routes and transit connections for every home we recommend.',
      body: (
        <div className="space-y-4">
          <Field id="company" label="Company or internship" icon="building" value={a.company} onChange={(v) => set('company', v)} placeholder="e.g. Stripe" />
          <Field id="address" label="Office address or city" icon="pin" value={a.address} onChange={(v) => set('address', v)} placeholder="e.g. 500 Howard St, San Francisco, CA" />
          {a.address.trim() && (
            <p className="flex animate-[fadeIn_.3s_ease-out] items-center gap-2.5 rounded-2xl border border-white bg-white/70 px-4 py-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E2B44] text-white">
                <Icon name="check" size={13} />
              </span>
              <span>
                Commute target set: <strong>{a.address.trim()}</strong>
              </span>
            </p>
          )}
        </div>
      ),
    },
    commute: {
      title: 'How long of a commute works for you?',
      sub: 'Set the longest one-way commute you’re okay with. We’ll prioritize homes inside it.',
      body: (
        <div className="space-y-6">
          <div className="rounded-[22px] border border-white bg-white/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="commute-range" className="flex items-center gap-2 text-[15px] font-semibold">
                <Icon name="clock" size={16} /> Max One-Way Commute
              </label>
              <span className="rounded-full bg-[#1E2B44] px-3 py-1 text-sm font-semibold tabular-nums text-white">{mins} min</span>
            </div>
            <input
              id="commute-range"
              type="range"
              min={5}
              max={60}
              step={5}
              value={a.maxCommute}
              onChange={(e) => set('maxCommute', Number(e.target.value))}
              className="mt-5 w-full accent-[#1E2B44]"
            />
          </div>
          <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-white bg-white/70 px-4 py-3 text-sm">
            <Icon name="building" size={16} />
            Commuting to: <strong>{[a.company.trim(), a.address.trim()].filter(Boolean).join(' · ')}</strong>
            <button type="button" onClick={() => go(1)} className="ml-auto font-semibold underline underline-offset-2 hover:text-[#A35F33]">
              Edit
            </button>
          </p>
        </div>
      ),
    },
    budget: {
      title: 'What monthly budget works for you?',
      sub: 'Choose the monthly range you want us to stay inside.',
      body: (
        <div role="radiogroup" className="space-y-3">
          {BUDGETS.map((b) => (
            <OptionRow key={b.id} selected={a.budget === b.id} onClick={() => set('budget', b.id)} icon="dollar" title={b.title} body={b.body} />
          ))}
        </div>
      ),
    },
    accommodations: {
      title: 'Any accommodations to prioritize?',
      sub: 'Select all that apply. We’ll filter homes before we show them.',
      body: (
        <div className="space-y-3">
          {ACCOMMODATIONS.map((o) => (
            <OptionRow key={o.id} multi selected={a.accommodations.includes(o.id)} onClick={() => toggle('accommodations', o.id)} icon={o.icon} title={o.title} body={o.body} />
          ))}
        </div>
      ),
    },
    moveIn: {
      title: 'When do you move in and out?',
      sub: 'Tap the move-in day, then the move-out day.',
      body: (
        <DateRange
          start={a.moveInDate}
          end={a.moveOutDate}
          onChange={(start, end) => setA((prev) => ({ ...prev, moveInDate: start, moveOutDate: end, moveIn: start ? monthIdFor(start) : null }))}
        />
      ),
    },

    interests: {
      title: 'What are you into?',
      sub: `Pick at least ${MIN_INTERESTS}. This is how we find interns you’ll actually get along with.`,
      body: (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <span className={a.interests.length >= MIN_INTERESTS ? 'font-semibold' : 'text-[#4A5A75]'}>
              {a.interests.length} selected{a.interests.length < MIN_INTERESTS ? ` · ${MIN_INTERESTS - a.interests.length} more to go` : ''}
            </span>
            {a.interests.length > 0 && (
              <button type="button" onClick={() => set('interests', [])} className="font-semibold underline underline-offset-2 hover:text-[#A35F33]">
                Clear
              </button>
            )}
          </div>
          <div role="group" aria-label="Interests" className="flex flex-wrap gap-2.5">
            {INTERESTS.map((o) => {
              const on = a.interests.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  title={o.body}
                  onClick={() => toggle('interests', o.id)}
                  className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                    on ? 'border-[#1E2B44] bg-[#1E2B44] text-white shadow-[0_12px_24px_-16px_rgba(30,43,68,0.7)]' : 'border-[#D5DFEA] bg-white/70 hover:bg-white'
                  }`}
                >
                  <Icon name={on ? 'check' : o.icon} size={16} />
                  {o.title}
                </button>
              )
            })}
          </div>
        </div>
      ),
    },
  }

  /* finished screen */
  if (step.id === 'done') {
    const chips = [
      a.university.trim() && `Studying at ${a.university.trim()}`,
      a.company && `Working at ${a.company}`,
      `${mins} min max commute`,
      a.budget && BUDGETS.find((b) => b.id === a.budget)?.title,
      a.moveInDate && a.moveOutDate && `${prettyDate(a.moveInDate)} to ${prettyDate(a.moveOutDate)}`,
    ].filter(Boolean) as string[]

    return (
      <>
        <AppNavbar firstName={firstName} />
        <section className="flex min-h-screen flex-col justify-center px-4 pb-10 pt-28 md:px-8">
          <div className="mx-auto max-w-3xl animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.1)] rounded-[36px] border border-white bg-white/70 p-8 text-center shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-12">
            <Journey compact complete position={journeySteps.length} total={journeySteps.length} />
            <h1 className="mt-4 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-6xl">
              You&apos;re all set{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-lg text-[#4A5A75]">We&apos;ll use these answers to line up verified sublets near the office.</p>
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {chips.map((c) => (
                <li key={c} className="rounded-full border border-[#D5DFEA] bg-white px-4 py-2 text-sm font-medium">
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/home" className="rounded-full bg-[#1E2B44] px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
                Go to my dashboard
              </Link>
              <Link href="/matches" className="rounded-full border border-[#D5DFEA] bg-white px-7 py-3.5 text-[15px] font-semibold transition hover:-translate-y-0.5">
                See all matches
              </Link>
              <Link href="/internMatches" className="rounded-full border border-[#D5DFEA] bg-white px-7 py-3.5 text-[15px] font-semibold transition hover:-translate-y-0.5">
                Intern matches
              </Link>
              <button type="button" onClick={() => go(0)} className="rounded-full border border-[#D5DFEA] bg-white px-7 py-3.5 text-[15px] font-semibold transition hover:-translate-y-0.5">
                Edit my answers
              </button>
            </div>
          </div>
        </section>
      </>
    )
  }

  const c = content[step.id]!
  const p = panel[step.id]
  const wide = step.id === 'roommatePrefs'
  const backClass =
    'flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#D5DFEA] bg-white/70 px-6 text-[15px] font-semibold transition hover:bg-white'

  return (
    <>
      <AppNavbar firstName={firstName} />
      <section className="flex min-h-screen flex-col justify-center px-4 pb-10 pt-28 md:px-8">
        <div
          className={`mx-auto grid w-full max-w-[1240px] gap-6 rounded-[36px] md:min-h-[680px] border border-white bg-white/60 p-4 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-5 ${
            wide ? '' : 'md:grid-cols-[1.1fr_1fr]'
          }`}
        >
          <div className="flex flex-col p-3 md:p-7">
            {/* progress */}
            <div
              className="h-1.5 overflow-hidden rounded-full bg-[#E4EAF1]"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Section progress"
            >
              <div className="h-full rounded-full bg-[#1E2B44] transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>

            {/* question */}
            <div key={step.id} className="mt-8 flex-1 animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)]">
              <h1 className="font-[family-name:var(--font-serif)] text-4xl font-medium leading-[1.08] tracking-[-0.02em] md:text-[46px]">{c.title}</h1>
              {c.sub && <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-[#4A5A75]">{c.sub}</p>}
              <div className="mt-7">{c.body}</div>
            </div>

            {/* back / next */}
            <div className="mt-8 grid grid-cols-[auto_1fr] gap-3">
              {index === 0 ? (
                <Link href="/home" className={backClass}>
                  <Icon name="arrowL" size={16} /> Back
                </Link>
              ) : (
                <button type="button" onClick={() => go(index - 1)} className={backClass}>
                  <Icon name="arrowL" size={16} /> Back
                </button>
              )}
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={!canContinue[step.id]}
                className="group flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#1E2B44] px-6 text-[15px] font-semibold text-white shadow-[0_14px_30px_-16px_rgba(30,43,68,0.7)] transition hover:-translate-y-0.5 hover:bg-[#2F4161] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {nextLabel}
                <Icon name="arrowR" size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {!wide && <Journey position={journeyAt} total={journeySteps.length} caption={p ? { tag: p.tag, title: p.title, text: p.caption } : undefined} />}
        </div>
      </section>
    </>
  )
}
