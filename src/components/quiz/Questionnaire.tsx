'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AppNavbar from '../AppNavbar'
import HouseMascot from '../HouseMascot'
import Icon from './icons'
import { Field, OptionRow, OptionTile, SidePanel } from './parts'
import {
  ACCOMMODATIONS,
  BUDGETS,
  buildSteps,
  CAR,
  COMMUTE_MODES,
  EMPTY,
  HOUSING_TYPES,
  INTERESTS,
  label,
  MOVE_IN,
  type QuizAnswers,
  ROOMMATE_GROUPS,
  SECTIONS,
  type StepId,
  TRANSIT_LEVELS,
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
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  const steps = useMemo(() => buildSteps(a), [a])
  const step = steps[Math.min(index, steps.length - 1)]
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

  // numbering inside a section (the roommate extras page isn't counted)
  const sectionSteps = steps.filter((s) => s.section === step.section && !s.extra)
  const qNum = sectionSteps.findIndex((s) => s.id === step.id) + 1
  const progress = step.extra
    ? ((sectionSteps.findIndex((s) => s.id === 'roommates') + 1) / sectionSteps.length) * 100
    : (qNum / Math.max(sectionSteps.length, 1)) * 100

  const canContinue: Record<StepId, boolean> = {
    work: a.company.trim() !== '' && a.address.trim() !== '',
    commute: a.commuteMode !== null,
    budget: a.budget !== null,
    roommates: a.roommates !== null,
    roommatePrefs: true,
    housingType: a.housingType !== null,
    accommodations: a.accommodations.length > 0,
    car: a.car !== null,
    moveIn: a.moveIn !== null,
    transit: true,
    interests: true,
    done: true,
  }

  const saveQuizProgress = async (nextStepId?: StepId) => {
    try {
      localStorage.setItem('subtle-quiz-v1', JSON.stringify(a))
    } catch {}
    if (nextStepId === 'done') {
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: firstName || 'Intern',
            lastName: lastName || 'Student',
            email: userEmail || 'intern@subtle.edu',
            company: a.company,
            address: a.address,
            budget: a.budget,
            roommates: a.roommates,
            interests: a.interests,
            housingType: a.housingType,
            accommodations: a.accommodations,
            moveIn: a.moveIn,
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
      } catch {}
    }
  }

  const go = (i: number) => {
    const clamped = Math.max(0, Math.min(i, steps.length - 1))
    void saveQuizProgress(steps[clamped]?.id)
    setIndex(clamped)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const nextStep = steps[index + 1]
  const nextLabel =
    step.id === 'interests'
      ? 'See my matches'
      : nextStep && nextStep.section !== step.section
        ? `Next section (${SECTIONS[nextStep.section]})`
        : 'Next question'

  const mins = a.maxCommute >= 60 ? '60+' : String(a.maxCommute)

  /* right-side panel copy, based on answers */
  const panel: Partial<Record<StepId, { tag: string; icon: string; title: string; caption: string }>> = {
    work: {
      tag: 'Commute radius',
      icon: 'map',
      title: a.company.trim() || 'Your office',
      caption: a.address.trim() ? `${a.address.trim()} · ${mins} min commute target` : 'Add your office to set your commute.',
    },
    commute: {
      tag: 'Commute route matcher',
      icon: COMMUTE_MODES.find((m) => m.id === a.commuteMode)?.icon ?? 'clock',
      title: a.commuteMode ? `${label(COMMUTE_MODES, a.commuteMode)} commute` : 'How you get there',
      caption: `Neighborhoods within ${mins} min of your office.`,
    },
    budget: {
      tag: 'Budget match',
      icon: 'dollar',
      title: a.budget ? 'Within your range.' : 'Set your range.',
      caption: a.budget ? `Verified sublets ${BUDGETS.find((b) => b.id === a.budget)?.range}.` : 'We only show homes inside it.',
    },
    roommates: {
      tag: 'Roommate matching',
      icon: a.roommates === 'no' ? 'user' : 'people',
      title: a.roommates === 'no' ? 'Your own place.' : 'Intern houses.',
      caption: a.roommates === 'no' ? 'A private place, just for you.' : 'Live with interns on the same summer timeline.',
    },
    housingType: {
      tag: 'Housing type',
      icon: a.housingType === 'apartment' ? 'apartment' : 'home',
      title: a.housingType && a.housingType !== 'any' ? `${label(HOUSING_TYPES, a.housingType)}s first.` : 'Apartments and houses.',
      caption: 'Every one verified for the summer.',
    },
    accommodations: {
      tag: 'Accommodations',
      icon: a.accommodations.includes('pets') ? 'paw' : a.accommodations.includes('accessible') ? 'access' : 'shield',
      title: a.accommodations.length && !a.accommodations.includes('none') ? 'Filtered for you.' : 'Every verified sublet.',
      caption: 'Filtered before we show you homes.',
    },
    car: {
      tag: 'Getting around',
      icon: a.car === 'car' ? 'car' : a.car === 'either' ? 'flex' : 'train',
      title: a.car === 'car' ? 'Parking-friendly neighborhoods.' : a.car === 'either' ? 'Flexible neighborhoods.' : 'Transit-first neighborhoods.',
      caption: a.car === 'car' ? 'Easy parking near home and work.' : 'Close to the line and your office.',
    },
    moveIn: {
      tag: 'Move-in',
      icon: 'calendar',
      title: 'Open for summer.',
      caption: a.moveIn && a.moveIn !== 'flexible' ? `Homes available for a ${label(MOVE_IN, a.moveIn)} start.` : 'Homes available all summer.',
    },
    transit: {
      tag: 'Transit access',
      icon: 'train',
      title: ['Anywhere works.', 'Close is a bonus.', 'Walk to the line.'][a.transitImportance],
      caption: ['We won’t filter by transit.', 'We’ll favor homes near transit.', 'Homes near reliable public transit.'][a.transitImportance],
    },
    interests: {
      tag: 'Interests',
      icon: 'music',
      title: 'Shared tastes.',
      caption: 'Helps us find people with similar interests.',
    },
  }

  /* question content */
  const content: Partial<Record<StepId, { title: string; sub?: string; body: React.ReactNode }>> = {
    work: {
      title: 'Where will you be working this summer?',
      sub: 'We’ll use your office address to calculate commute routes and transit connections for every home we recommend.',
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
      title: 'Commute time and how you’ll get there',
      sub: 'Set the longest one-way commute you’re okay with. We’ll prioritize homes inside it.',
      body: (
        <div className="space-y-6">
          <div className="rounded-[22px] border border-white bg-white/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="commute-range" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
                <Icon name="clock" size={16} /> Max one-way commute
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
            <div className="mt-1 flex justify-between text-xs text-[#4A5A75]">
              <span>5 min</span>
              <span>25 min</span>
              <span>45 min</span>
              <span>60+ min</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em]">Main way of getting to work</p>
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
              {COMMUTE_MODES.map((m) => (
                <OptionTile key={m.id} compact selected={a.commuteMode === m.id} onClick={() => set('commuteMode', m.id)} icon={m.icon} title={m.title} body={m.body} />
              ))}
            </div>
          </div>
          <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-white bg-white/70 px-4 py-3 text-sm">
            <Icon name="building" size={16} />
            Commuting to: <strong>{[a.company.trim(), a.address.trim()].filter(Boolean).join(' · ')}</strong>
            <button type="button" onClick={() => go(0)} className="ml-auto font-semibold underline underline-offset-2 hover:text-[#A35F33]">
              Edit
            </button>
          </p>
        </div>
      ),
    },
    budget: {
      title: 'What’s your monthly housing budget?',
      sub: 'Choose the monthly range you want us to stay inside.',
      body: (
        <div role="radiogroup" className="space-y-3">
          {BUDGETS.map((b) => (
            <OptionRow key={b.id} selected={a.budget === b.id} onClick={() => set('budget', b.id)} icon="dollar" title={b.title} body={b.body} />
          ))}
        </div>
      ),
    },
    roommates: {
      title: 'Are you looking for roommates?',
      sub: 'Sharing can lower rent and match you with other summer interns.',
      body: (
        <div className="space-y-3">
          <div role="radiogroup" className="space-y-3">
            <OptionRow selected={a.roommates === 'yes'} onClick={() => set('roommates', 'yes')} icon="people" title="Yes, I want roommates." body="Split a verified sublet." />
            <OptionRow selected={a.roommates === 'no'} onClick={() => set('roommates', 'no')} icon="user" title="No, I’d rather live alone." body="A private place, just for you." />
          </div>
          {a.roommates === 'yes' && (
            <p className="flex animate-[fadeIn_.3s_ease-out] items-center gap-2 px-1 pt-1 text-sm text-[#4A5A75]">
              <Icon name="sparkle" size={16} /> A few quick roommate questions come next.
            </p>
          )}
        </div>
      ),
    },
    roommatePrefs: {
      title: 'A few more questions',
      sub: 'Only because you want roommates. Skip anything you don’t mind.',
      body: (
        <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
          {ROOMMATE_GROUPS.map((g) => (
            <fieldset key={g.id}>
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.1em]">{g.label}</legend>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const on = a.roommatePrefs[g.id] === o
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set('roommatePrefs', { ...a.roommatePrefs, [g.id]: on ? '' : o })}
                      className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${
                        on ? 'border-[#1E2B44] bg-[#1E2B44] text-white' : 'border-[#D5DFEA] bg-white/70 hover:bg-white'
                      }`}
                    >
                      {o}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ),
    },
    housingType: {
      title: 'What type of housing do you prefer?',
      sub: 'Pick one. We’ll prioritize that kind of verified sublet.',
      body: (
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
          {HOUSING_TYPES.map((h) => (
            <OptionTile key={h.id} selected={a.housingType === h.id} onClick={() => set('housingType', h.id)} icon={h.icon} title={h.title} body={h.body} />
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
    car: {
      title: 'Do you have a car?',
      sub: 'We’ll use this with your commute to rank neighborhoods.',
      body: (
        <div role="radiogroup" className="space-y-3">
          {CAR.map((o) => (
            <OptionRow key={o.id} selected={a.car === o.id} onClick={() => set('car', o.id)} icon={o.icon} title={o.title} body={o.body} />
          ))}
        </div>
      ),
    },
    moveIn: {
      title: 'When do you need to move in?',
      sub: 'We’ll line up verified sublets that are open for your start date.',
      body: (
        <div role="radiogroup" className="space-y-3">
          {MOVE_IN.map((o) => (
            <OptionRow key={o.id} selected={a.moveIn === o.id} onClick={() => set('moveIn', o.id)} icon={o.icon} title={o.title} body={o.body} />
          ))}
        </div>
      ),
    },
    transit: {
      title: 'How important is public transit?',
      sub: 'This decides how strictly we keep homes near a train or bus line.',
      body: (
        <div className="rounded-[22px] border border-white bg-white/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="transit-range" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
              <Icon name="train" size={16} /> Public transit importance
            </label>
            <span className="rounded-full bg-[#1E2B44] px-3 py-1 text-sm font-semibold text-white">{TRANSIT_LEVELS[a.transitImportance]}</span>
          </div>
          <input
            id="transit-range"
            type="range"
            min={0}
            max={2}
            step={1}
            value={a.transitImportance}
            onChange={(e) => set('transitImportance', Number(e.target.value))}
            aria-valuetext={TRANSIT_LEVELS[a.transitImportance]}
            className="mt-6 w-full accent-[#1E2B44]"
          />
          <div className="mt-2 flex justify-between text-sm">
            {TRANSIT_LEVELS.map((t, i) => (
              <span key={t} className={i === a.transitImportance ? 'font-semibold' : 'text-[#4A5A75]'}>
                {t}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    interests: {
      title: 'What are your interests?',
      sub: 'Select all that apply.',
      body: (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {INTERESTS.map((o) => (
            <OptionTile key={o.id} multi selected={a.interests.includes(o.id)} onClick={() => toggle('interests', o.id)} icon={o.icon} title={o.title} body={o.body} />
          ))}
        </div>
      ),
    },
  }

  /* finished screen */
  if (step.id === 'done') {
    const chips = [
      a.company && `Working at ${a.company}`,
      `${mins} min max commute`,
      a.commuteMode && label(COMMUTE_MODES, a.commuteMode),
      a.budget && BUDGETS.find((b) => b.id === a.budget)?.title,
      a.roommates === 'yes' ? 'With roommates' : a.roommates === 'no' ? 'Living alone' : null,
      a.housingType && label(HOUSING_TYPES, a.housingType),
      a.moveIn && (a.moveIn === 'flexible' ? 'Flexible move-in' : `${label(MOVE_IN, a.moveIn)} move-in`),
      `Transit: ${TRANSIT_LEVELS[a.transitImportance].toLowerCase()}`,
    ].filter(Boolean) as string[]

    return (
      <>
        <AppNavbar firstName={firstName} />
        <section className="flex min-h-screen flex-col justify-center px-4 pb-10 pt-28 md:px-8">
          <div className="mx-auto max-w-3xl animate-[popIn_.5s_cubic-bezier(.2,.8,.3,1.1)] rounded-[36px] border border-white bg-white/70 p-8 text-center shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-12">
            <HouseMascot label="Subtle's house mascot cheering" className="mx-auto h-40 w-40" />
            <h1 className="mt-4 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-6xl">
              You&apos;re all set{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-lg text-[#4A5A75]">We&apos;ll use your answers to line up verified sublets near your office.</p>
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {chips.map((c) => (
                <li key={c} className="rounded-full border border-[#D5DFEA] bg-white px-4 py-2 text-sm font-medium">
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/matches" className="rounded-full bg-[#1E2B44] px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
                See my matches
              </Link>
              <Link href="/internMatches" className="rounded-full border border-[#D5DFEA] bg-white px-7 py-3.5 text-[15px] font-semibold transition hover:-translate-y-0.5">
                Intern matches
              </Link>
              <Link href="/home" className="rounded-full border border-[#D5DFEA] bg-white px-7 py-3.5 text-[15px] font-semibold transition hover:-translate-y-0.5">
                Back to home
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
            {/* section + progress */}
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-xs font-bold uppercase tracking-[0.14em]">
                {step.extra ? 'Roommate preferences' : `Section ${step.section} · ${SECTIONS[step.section]}`}
              </span>
              <span className="text-[#4A5A75]">{step.extra ? 'Only if you want roommates' : `Question ${qNum} of ${sectionSteps.length}`}</span>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E4EAF1]"
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

          {!wide && p && <SidePanel step={step.id} tag={p.tag} icon={p.icon} title={p.title} caption={p.caption} />}
        </div>
        <p className="mt-8 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
