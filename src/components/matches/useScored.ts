'use client'

import { useEffect, useState } from 'react'
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
  userProfile?: Record<string, unknown> | null
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

  const url = email ? `/api/matches?email=${encodeURIComponent(email)}` : '/api/matches'
  const promise = fetch(url, { cache: 'no-store' })
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

/** The score-related fields from /api/matches laid over a listing we already have. */
export function withScore(listing: Listing, scored: Listing | undefined): Listing {
  if (!scored) return listing
  return {
    ...listing,
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
      if (alive && all) setCurrent(withScore(listing, all.find((m) => m.id === listing.id)))
    })
    return () => {
      alive = false
    }
  }, [listing])
  return current
}
