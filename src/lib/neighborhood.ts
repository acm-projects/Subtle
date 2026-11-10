/**
 * Neighborhood access for the Subtle score: how easy it is to get everyday things done on foot.
 * This is different from the commute (time to the office). It counts what is within a short walk:
 * grocery stores, restaurants and cafes, and transit stops (bus, rail, tram).
 *
 * Source: OpenStreetMap via the public Overpass API (free, no key). Works in every city.
 * If the request fails we return null and the score simply leaves this part out: we never guess.
 */

import type { Coordinates } from './geocoding'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
export const WALK_RADIUS_M = 800 // about a 10 minute walk
export const NEIGHBORHOOD_SOURCE = 'OpenStreetMap'

// how many of each counts as "plenty" (full marks for that part)
const ENOUGH = { groceries: 3, food: 15, transit: 8 }

export type NeighborhoodInfo = {
  groceries: number // supermarkets, grocery and convenience stores
  food: number // restaurants, cafes, fast food
  transit: number // bus stops, rail / subway / tram stations
  radiusMeters: number
  source: string
}

const CACHE_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { value: NeighborhoodInfo | null; at: number }>()

function query(c: Coordinates): string {
  const a = `(around:${WALK_RADIUS_M},${c.lat},${c.lon})`
  return `[out:json][timeout:15];
nwr${a}[shop~"^(supermarket|grocery|convenience|greengrocer)$"]->.g;
.g out count;
nwr${a}[amenity~"^(restaurant|cafe|fast_food)$"]->.f;
.f out count;
(node${a}[highway=bus_stop];nwr${a}[railway~"^(station|halt|tram_stop)$"];)->.t;
.t out count;`
}

/** What is within a short walk of one spot, or null if OpenStreetMap could not be reached. */
export async function neighborhoodNear(c: Coordinates): Promise<NeighborhoodInfo | null> {
  const key = `${c.lat.toFixed(3)},${c.lon.toFixed(3)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Subtle (ACM UTD student project)' },
      body: `data=${encodeURIComponent(query(c))}`,
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn(`[Neighborhood] Overpass request failed (${res.status})`)
      return null // not cached, so a later request can try again
    }
    const json = (await res.json()) as { elements?: { type: string; tags?: { total?: string } }[] }
    const counts = (json.elements ?? []).filter((e) => e.type === 'count').map((e) => Number(e.tags?.total ?? 0))
    if (counts.length !== 3) return null
    const value: NeighborhoodInfo = {
      groceries: counts[0],
      food: counts[1],
      transit: counts[2],
      radiusMeters: WALK_RADIUS_M,
      source: NEIGHBORHOOD_SOURCE,
    }
    cache.set(key, { value, at: Date.now() })
    return value
  } catch (err) {
    console.warn('[Neighborhood] Overpass request error:', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 0 to 1: groceries count 40%, restaurants and cafes 30%, transit stops 30%. */
export function neighborhoodFit(info: NeighborhoodInfo): number {
  const part = (n: number, enough: number) => Math.min(1, n / enough)
  return 0.4 * part(info.groceries, ENOUGH.groceries) + 0.3 * part(info.food, ENOUGH.food) + 0.3 * part(info.transit, ENOUGH.transit)
}

/** One line for "Why this score", built only from the real counts. */
export function neighborhoodReason(info: NeighborhoodInfo): string {
  const s = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return `Nearby · ${s(info.groceries, 'grocery store', 'grocery stores')}, ${s(info.food, 'restaurant or cafe', 'restaurants and cafes')}, ${s(info.transit, 'transit stop', 'transit stops')} within a 10 min walk (OpenStreetMap)`
}

/** Neighborhood info for many spots, two at a time so the free Overpass server isn't flooded. */
export async function neighborhoodForMany(coords: (Coordinates | null)[], concurrency = 2): Promise<(NeighborhoodInfo | null)[]> {
  const out: (NeighborhoodInfo | null)[] = coords.map(() => null)
  let next = 0
  const worker = async () => {
    while (next < coords.length) {
      const i = next++
      const c = coords[i]
      if (c) out[i] = await neighborhoodNear(c)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, coords.length) }, worker))
  return out
}
