'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getListing as getDbListing, getListings } from '../../lib/listings'
import { loadMyBookings, loadSaved, type Booking } from '../matches/activity'
import { dbListingToMatchListing, SAMPLE_LISTINGS, type Listing } from '../matches/listings'
import { EMPTY, type QuizAnswers } from '../quiz/options'
import { userRowToQuizAnswers } from '../../lib/quiz-sync'

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
function quizStatusOf(q: QuizAnswers): QuizStatus {
  // If company and address are filled, or budget and housingType, the user has completed their onboarding
  if ((q.company.trim() || q.address.trim()) && (q.budget || q.housingType || q.moveIn)) return 'done'
  const core = [q.company.trim(), q.address.trim(), q.budget, q.housingType, q.moveIn]
  const answered = core.filter(Boolean).length
  if (answered >= 3) return 'done'
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
        const { data: auth } = await supabase.auth.getUser()
        const meta = auth.user?.user_metadata ?? {}
        const fromAccount = ((meta.first_name ?? meta.firstName ?? '') as string).trim()
        if (fromAccount) firstName = fromAccount
        
        const email = auth.user?.email?.toLowerCase()

        // 1. If we have local storage for this EXACT user account, start with it
        try {
          const savedUser = localStorage.getItem('subtle-user-v1')
          if (!firstName && savedUser) firstName = (JSON.parse(savedUser).firstName ?? '').trim()
          
          const quizOwner = (localStorage.getItem('subtle-quiz-owner') ?? '').toLowerCase()
          const savedQuiz = localStorage.getItem('subtle-quiz-v1')
          if (savedQuiz && (!email || quizOwner === email)) {
            quiz = { ...EMPTY, ...JSON.parse(savedQuiz) }
          }
        } catch {}

        // 2. Fetch ground truth from Supabase users_table
        if (email) {
          const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
          if (res.ok) {
            const dbUser = await res.json()
            if (dbUser && (dbUser.company_name || dbUser.office_address || dbUser.monthly_budget)) {
              const fromDb = userRowToQuizAnswers(dbUser)
              quiz = { ...quiz, ...fromDb }
              try {
                localStorage.setItem('subtle-quiz-v1', JSON.stringify(quiz))
                localStorage.setItem('subtle-quiz-owner', email)
              } catch {}
            } else if (!localStorage.getItem('subtle-quiz-owner') || localStorage.getItem('subtle-quiz-owner')?.toLowerCase() !== email) {
              // User has no row in Supabase and no personal quiz cached for this email
              quiz = EMPTY
            }
          }
        }
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
