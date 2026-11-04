/**
 * Neighborhood safety for the Subtle score, from real police incident data.
 *
 * Source: San Francisco Police Department Incident Reports (2018 to present), DataSF open data
 * https://data.sfgov.org/d/wg3w-h783 (free, no key needed; SF_OPEN_DATA_APP_TOKEN in .env.local
 * is optional and only raises the rate limit).
 *
 * For each listing we count serious incidents reported within RADIUS_M meters over the last DAYS
 * days, and compare that to the San Francisco average for a circle the same size. Listings outside
 * San Francisco get no safety data (null), and their score is left alone: we never guess.
 */

import type { Coordinates } from './geocoding'

const DATASET = 'https://data.sfgov.org/resource/wg3w-h783.json'
export const RADIUS_M = 500
export const DAYS = 90
export const SAFETY_SOURCE = 'SFPD incident reports (DataSF)'

// incidents that matter for personal safety at home (not, e.g., traffic or fraud)
const CATEGORIES = ['Assault', 'Robbery', 'Burglary', 'Homicide', 'Rape', 'Weapons Offense', 'Motor Vehicle Theft']

// rough box around San Francisco; anything outside it has no data from this source
const SF_BOX = { minLat: 37.70, maxLat: 37.84, minLon: -122.53, maxLon: -122.35 }
const SF_AREA_KM2 = 121.4 // land area of San Francisco

export type SafetyInfo = {
  incidents: number // serious incidents within RADIUS_M in the last DAYS days
  cityAverage: number // the SF average for a circle the same size
  ratio: number // incidents / cityAverage (1 = average)
  radiusMeters: number
  days: number
  source: string
}

const CACHE_MS = 12 * 60 * 60 * 1000
const cache = new Map<string, { value: number | null; at: number }>()

export function inSanFrancisco(c: Coordinates): boolean {
  return c.lat >= SF_BOX.minLat && c.lat <= SF_BOX.maxLat && c.lon >= SF_BOX.minLon && c.lon <= SF_BOX.maxLon
}

const since = () => new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 19)
const categoryFilter = () => `incident_category in(${CATEGORIES.map((c) => `'${c}'`).join(',')})`

// one SoQL count query against DataSF; null if it fails
async function countWhere(where: string, cacheKey: string): Promise<number | null> {
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value

  const url = `${DATASET}?$select=${encodeURIComponent("count(*) as n")}&$where=${encodeURIComponent(where)}`
  try {
    const token = process.env.SF_OPEN_DATA_APP_TOKEN
    const res = await fetch(url, { headers: token ? { 'X-App-Token': token } : {}, cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[Safety] DataSF request failed (${res.status})`)
      return null
    }
    const rows = (await res.json()) as { n?: string }[]
    const n = Number(rows?.[0]?.n)
    const value = Number.isFinite(n) ? n : null
    cache.set(cacheKey, { value, at: Date.now() })
    return value
  } catch (err) {
    console.warn('[Safety] DataSF request error:', err)
    return null
  }
}

/** Safety info for one spot, or null if it is outside San Francisco or the data could not be loaded. */
export async function safetyNear(c: Coordinates): Promise<SafetyInfo | null> {
  if (!inSanFrancisco(c)) return null
  const from = since()

  const [incidents, cityTotal] = await Promise.all([
    countWhere(
      `within_circle(point, ${c.lat}, ${c.lon}, ${RADIUS_M}) AND incident_datetime > '${from}' AND ${categoryFilter()}`,
      `near:${c.lat.toFixed(4)},${c.lon.toFixed(4)}`,
    ),
    countWhere(`incident_datetime > '${from}' AND ${categoryFilter()}`, 'city-total'),
  ])
  if (incidents == null || !cityTotal) return null

  const circleKm2 = Math.PI * (RADIUS_M / 1000) ** 2
  const cityAverage = (cityTotal * circleKm2) / SF_AREA_KM2
  return {
    incidents,
    cityAverage: Math.round(cityAverage),
    ratio: cityAverage > 0 ? incidents / cityAverage : 1,
    radiusMeters: RADIUS_M,
    days: DAYS,
    source: SAFETY_SOURCE,
  }
}

/**
 * How much safety moves the Subtle score: a multiplier from 0.85 to 1.05.
 * Half the city average or less: 1.05. Average: 1.0. Three times the average or more: 0.85.
 */
export function safetyFit(info: SafetyInfo | null): number {
  if (!info) return 1
  return Math.max(0.85, Math.min(1.05, 1.05 - 0.1 * (info.ratio - 0.5)))
}

/** One line for "Why this score", built only from the real numbers. */
export function safetyReason(info: SafetyInfo): string {
  const vs = info.ratio < 0.8 ? 'below' : info.ratio > 1.25 ? 'above' : 'near'
  return `Safety · ${info.incidents} serious incidents reported within ${info.radiusMeters} m in ${info.days} days, ${vs} the SF average (SFPD data)`
}

/** Safety for many spots, a few requests at a time so DataSF isn't flooded. */
export async function safetyForMany(coords: (Coordinates | null)[], concurrency = 5): Promise<(SafetyInfo | null)[]> {
  const out: (SafetyInfo | null)[] = coords.map(() => null)
  let next = 0
  const worker = async () => {
    while (next < coords.length) {
      const i = next++
      const c = coords[i]
      if (c) out[i] = await safetyNear(c)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, coords.length) }, worker))
  return out
}
