'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getListings } from '../../lib/listings'
import { dbListingToMatchListing, SAMPLE_LISTINGS, type Listing } from '../matches/listings'
import { EMPTY, type QuizAnswers } from '../quiz/options'

export type QuizStatus = 'none' | 'started' | 'done'

export type DashboardData = {
  loading: boolean
  firstName: string
  quiz: QuizAnswers
  quizStatus: QuizStatus
  topMatches: Listing[]
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
*/
export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    loading: true,
    firstName: '',
    quiz: EMPTY,
    quizStatus: 'none',
    topMatches: [],
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
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
        const fromAccount = ((meta.first_name ?? meta.firstName ?? '') as string).trim()
        if (fromAccount) firstName = fromAccount
      } catch {}

      const quizStatus = quizStatusOf(quiz)

      let topMatches: Listing[] = []
      if (quizStatus === 'done') {
        let real: Listing[] = []
        try {
          const { listings } = await getListings({ pageSize: 6 })
          real = (listings ?? []).map(dbListingToMatchListing)
        } catch {}
        topMatches = [...real, ...SAMPLE_LISTINGS].sort((a, b) => b.score - a.score).slice(0, 6)
      }

      if (alive) setData({ loading: false, firstName, quiz, quizStatus, topMatches })
    })()
    return () => {
      alive = false
    }
  }, [])

  return data
}
