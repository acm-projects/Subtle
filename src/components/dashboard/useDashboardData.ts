'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getListing as getDbListing, getListings } from '../../lib/listings'
import { loadMyBookings, loadSaved, type Booking } from '../matches/activity'
import { dbListingToMatchListing, SAMPLE_LISTINGS, type Listing } from '../matches/listings'
import { EMPTY, type QuizAnswers } from '../quiz/options'

export type QuizStatus = 'none' | 'started' | 'done'

export type DashboardData = {
  loading: boolean
  firstName: string
  quiz: QuizAnswers
  quizStatus: QuizStatus
  topMatches: Listing[]
  savedHomes: Listing[]
  bookings: Booking[]
}

// The quiz counts as done once the core questions are answered.
// TODO(backend): read this from the user's row in users_table instead of this browser.
function quizStatusOf(q: QuizAnswers): QuizStatus {
  const core = [q.company.trim(), q.address.trim(), q.budget, q.housingType, q.moveIn]
  const answered = core.filter(Boolean).length
  if (answered === core.length) return 'done'
  return answered > 0 || q.commuteMode ? 'started' : 'none'
}

/*
  Everything the dashboard shows, in one place for backend:
  - name: Supabase user metadata, then the copy the login page saves
  - quiz: answers the questionnaire saves in this browser
  - topMatches: real listings from Supabase plus sample listings, ranked purely by Subtle score
  - savedHomes / bookings: matches/activity.ts
*/
export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    loading: true,
    firstName: '',
    quiz: EMPTY,
    quizStatus: 'none',
    topMatches: [],
    savedHomes: [],
    bookings: [],
  })

  useEffect(() => {
    let alive = true
    const load = async () => {
      let firstName = ''
      let quiz: QuizAnswers = EMPTY
      try {
        const savedUser = localStorage.getItem('subtle-user-v1')
        if (savedUser) firstName = (JSON.parse(savedUser).firstName ?? '').trim()
        const savedQuiz = localStorage.getItem('subtle-quiz-v1')
        if (savedQuiz) quiz = { ...EMPTY, ...JSON.parse(savedQuiz) }
      } catch {}

      try {
        const { data: auth } = await supabase.auth.getUser()
        const meta = auth.user?.user_metadata ?? {}
        const savedHere = firstName
        firstName = ((meta.first_name ?? meta.firstName ?? '') as string).trim()
        // quiz answers in this browser only count if this account took the quiz
        const email = auth.user?.email?.toLowerCase()
        if (email && localStorage.getItem('subtle-quiz-owner') !== email) quiz = EMPTY
        // no name on the account: use the first name saved on their profile (what they entered at sign-up)
        if (!firstName && auth.user) {
          try {
            const { data: prof } = await supabase.from('profiles').select('first_name').eq('id', auth.user.id).single()
            const fromProfile = ((prof?.first_name ?? '') as string).trim()
            if (fromProfile) firstName = fromProfile
          } catch {}
        }
        if (!firstName && email) {
          try {
            const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`)
            const row = res.ok ? await res.json() : null
            const fromRow = ((row?.first_name ?? '') as string).trim()
            if (fromRow && fromRow !== 'Intern') firstName = fromRow
          } catch {}
        }
        if (!firstName) firstName = ((meta.given_name ?? '') as string).trim()
        if (!firstName && !savedHere.includes('@')) firstName = savedHere
        // only the first word, in case a full name was saved
        firstName = firstName.split(/\s+/)[0] ?? ''
      } catch {}

      const quizStatus = quizStatusOf(quiz)

      let topMatches: Listing[] = []
      if (quizStatus === 'done') {
        let real: Listing[] = []
        try {
          const { listings } = await getListings({ pageSize: 20 })
          real = (listings ?? []).map(dbListingToMatchListing)
        } catch {}
        topMatches = [...real, ...SAMPLE_LISTINGS].sort((a, b) => b.score - a.score).slice(0, 12)
      }

      const savedHomes: Listing[] = []
      for (const id of loadSaved().slice(0, 4)) {
        const sample = SAMPLE_LISTINGS.find((l) => l.id === id)
        if (sample) {
          savedHomes.push(sample)
          continue
        }
        try {
          const db = await getDbListing(id)
          if (db) savedHomes.push(dbListingToMatchListing(db))
        } catch {}
      }
      let myEmail: string | null = null
      try {
        const { data: auth } = await supabase.auth.getUser()
        myEmail = auth.user?.email ?? null
        if (!myEmail) myEmail = JSON.parse(localStorage.getItem('subtle-user-v1') ?? '{}').email ?? null
      } catch {}
      const bookings = await loadMyBookings(myEmail)

      if (alive) setData({ loading: false, firstName, quiz, quizStatus, topMatches, savedHomes, bookings })
    }
    load()
    // refresh when you come back to the tab (and every 20s), so new requests and host replies show up
    const onFocus = () => document.visibilityState === 'visible' && load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const timer = setInterval(onFocus, 20000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      clearInterval(timer)
      alive = false
    }
  }, [])

  return data
}
