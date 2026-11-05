/**
 * Real commute times from the Google Maps Routes API (Compute Route Matrix).
 *
 * Server-only: needs GOOGLE_MAPS_API_KEY in .env.local (never NEXT_PUBLIC_, so the key
 * stays off the browser). The key's Google Cloud project must have the "Routes API" enabled.
 *
 * If the key is missing or Google fails, every function here returns null for that listing,
 * and /api/matches keeps the estimate from lib/geocoding.ts instead. Nothing breaks.
 */

import type { CommuteMode, Coordinates } from './geocoding'

const ENDPOINT = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix'

// Google's travel modes for our commute modes
const TRAVEL_MODE: Record<CommuteMode, 'WALK' | 'TRANSIT' | 'BICYCLE' | 'DRIVE'> = {
  walk: 'WALK',
  transit: 'TRANSIT',
  bike: 'BICYCLE',
  drive: 'DRIVE',
}

// Google allows at most 100 origin-destination pairs per transit request (625 for the others),
// so listings are sent in groups of 50 to stay well under both.
const BATCH_SIZE = 50

// Same listing + office + mode within 6 hours reuses the last answer (saves API calls and money)
const CACHE_MS = 6 * 60 * 60 * 1000
const cache = new Map<string, { minutes: number | null; at: number }>()

const keyFor = (from: Coordinates, to: Coordinates, mode: CommuteMode) =>
  `${from.lat.toFixed(5)},${from.lon.toFixed(5)}>${to.lat.toFixed(5)},${to.lon.toFixed(5)}:${mode}`

// Transit times depend on when you leave (a 10 pm trip can mean an hour of waiting), so transit is
// always asked for the next weekday at 8:30 am at the office. The office's time zone is approximated
// from its longitude (15 degrees per hour), which is close enough for a morning commute.
function nextWeekdayMorningUtc(office: Coordinates): string {
  const offsetHours = Math.round(office.lon / 15)
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(8 - offsetHours, 30, 0, 0)
  return d.toISOString()
}

const waypoint = (c: Coordinates) => ({ waypoint: { location: { latLng: { latitude: c.lat, longitude: c.lon } } } })

export function hasGoogleMapsKey(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY)
}

/**
 * One-way commute minutes from each origin (a listing) to the office, for one travel mode.
 * Returns an array lined up with `origins`: a number of minutes, or null where Google had no route.
 */
export async function googleCommuteMinutes(
  origins: Coordinates[],
  office: Coordinates,
  mode: CommuteMode,
): Promise<(number | null)[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  const results: (number | null)[] = origins.map(() => null)
  if (!apiKey || origins.length === 0) return results

  // answer from the cache where we can
  const todo: number[] = []
  origins.forEach((o, i) => {
    const hit = cache.get(keyFor(o, office, mode))
    if (hit && Date.now() - hit.at < CACHE_MS) results[i] = hit.minutes
    else todo.push(i)
  })

  for (let start = 0; start < todo.length; start += BATCH_SIZE) {
    const batch = todo.slice(start, start + BATCH_SIZE)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // only ask for the fields we use (Google bills by field mask)
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,condition',
        },
        body: JSON.stringify({
          origins: batch.map((i) => waypoint(origins[i])),
          destinations: [waypoint(office)],
          travelMode: TRAVEL_MODE[mode],
          ...(mode === 'transit' ? { departureTime: nextWeekdayMorningUtc(office) } : {}),
        }),
        cache: 'no-store',
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.warn(`[GoogleMaps] Route matrix failed (${res.status}): ${detail.slice(0, 300)}`)
        continue
      }

      const rows = (await res.json()) as { originIndex?: number; duration?: string; condition?: string }[]
      for (const row of Array.isArray(rows) ? rows : []) {
        const i = batch[row.originIndex ?? 0]
        if (i === undefined) continue
        // duration comes back like "1234s"
        const seconds = row.condition === 'ROUTE_EXISTS' && row.duration ? parseInt(row.duration, 10) : NaN
        const minutes = Number.isFinite(seconds) ? Math.max(1, Math.round(seconds / 60)) : null
        results[i] = minutes
        cache.set(keyFor(origins[i], office, mode), { minutes, at: Date.now() })
      }
    } catch (err) {
      console.warn('[GoogleMaps] Route matrix request error:', err)
    }
  }

  return results
}
