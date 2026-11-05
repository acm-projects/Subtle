'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '../../lib/auth-fetch'
import { supabase } from '../../lib/supabase'
import type { Listing, MatchContext } from './listings'

/*
  One place for every page to get Subtle scores, so the dashboard, the Matches page and a
  listing's own pages all show the same score, commute time and "Why this score" lines.
  Everything comes from /api/matches (only homes near the user's workplace; commute from Google Maps,
  safety from SFPD data).
  The answer is reused for a minute so moving between pages doesn't refetch it.
*/

export type MatchesPayload = {
  context: MatchContext
  matches: Listing[]
  nearby?: number
  radiusKm?: number | null
  wrongDates?: number
  moveIn?: string | null
  nearest?: Listing[] // closest homes outside the radius, only when nothing is nearby
}

let cached: { email: string; at: number; promise: Promise<MatchesPayload | null> } | null = null

async function currentEmail(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser()
    if (data.user?.email) return data.user.email
  } catch {}
  try {
    const saved = localStorage.getItem('subtle-user-v1')
    if (saved) return JSON.parse(saved)?.email ?? ''
  } catch {}
  return ''
}

/**
 * The whole /api/matches answer for the signed-in user: homes near their workplace, scored.
 * null means the API couldn't be reached (an empty `matches` means there's nothing nearby yet).
 */
export async function fetchMatchesPayload(): Promise<MatchesPayload | null> {
  const email = await currentEmail()
  if (cached && cached.email === email && Date.now() - cached.at < 60_000) return cached.promise

  // personalized by the login token (the server works out who's asking)
  const promise = authFetch('/api/matches', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && Array.isArray(j.matches) ? (j as MatchesPayload) : null))
    .catch(() => null)
  cached = { email, at: Date.now(), promise }
  // don't keep a failure around for a minute; try again next time
  promise.then((p) => {
    if (!p && cached?.promise === promise) cached = null
  })
  return promise
}

/** Nearby listings, scored for the signed-in user. null if the API can't be reached, [] if nothing is nearby. */
export async function fetchScoredMatches(): Promise<Listing[] | null> {
  const payload = await fetchMatchesPayload()
  return payload ? payload.matches : null
}

/**
 * The score-related fields from /api/matches laid over a listing we already have.
 * `listKnown`: we have the user's matches and this listing isn't in them, so it's far from their office.
 */
export function withScore(listing: Listing, scored: Listing | undefined, listKnown = false): Listing {
  if (!scored) return listKnown ? { ...listing, nearWork: false } : listing
  return {
    ...listing,
    nearWork: true,
    score: scored.score,
    commuteMinutes: scored.commuteMinutes,
    commuteMode: scored.commuteMode,
    commuteSource: scored.commuteSource,
    whyScore: scored.whyScore ?? listing.whyScore,
    safety: scored.safety,
  }
}

/** Use on a listing's own pages: starts with the listing as loaded, then swaps in the shared score. */
export function useScoredListing(listing: Listing): Listing {
  const [current, setCurrent] = useState(listing)
  useEffect(() => {
    let alive = true
    setCurrent(listing)
    fetchScoredMatches().then((all) => {
      if (alive && all) setCurrent(withScore(listing, all.find((m) => m.id === listing.id), true))
    })
    return () => {
      alive = false
    }
  }, [listing])
  return current
}

/** The user's company, office and city as /api/matches saw them (from users_table); `fallback` until it loads. */
export function useMatchContext(fallback: MatchContext): MatchContext {
  const [context, setContext] = useState(fallback)
  useEffect(() => {
    let alive = true
    fetchMatchesPayload().then((p) => {
      if (alive && p?.context) setContext(p.context)
    })
    return () => {
      alive = false
    }
  }, [])
  return context
}
