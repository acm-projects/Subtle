/**
 * Neighborhood access for the Subtle score: how easy it is to get everyday things done on foot.
 * This is different from the commute (time to the office). It counts what is within a short walk:
 * grocery stores, restaurants and cafes, and transit stops (bus, rail, tram).
 *
 * Source: Google Places (Nearby Search, same GOOGLE_MAPS_API_KEY as the commute; the key needs
 * "Places API (New)" turned on). If that isn't available we try OpenStreetMap's free Overpass API.
 * If both fail we return null and the score simply leaves this part out: we never guess.
 */

import type { Coordinates } from './geocoding'

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const PLACES = 'https://places.googleapis.com/v1/places:searchNearby'
export const WALK_RADIUS_M = 800 // about a 10 minute walk

// Google place types for each part (Google returns at most 20 per search, more than "plenty" below)
const PLACE_TYPES = {
  groceries: ['grocery_store', 'supermarket', 'convenience_store'],
  food: ['restaurant', 'cafe'],
  transit: ['bus_stop', 'transit_station', 'subway_station', 'train_station', 'light_rail_station'],
}

// how many of each counts as "plenty" (full marks for that part)
const ENOUGH = { groceries: 3, food: 15, transit: 8 }

export type NeighborhoodInfo = {
  groceries: number // supermarkets, grocery and convenience stores
  food: number // restaurants, cafes, fast food
  transit: number // bus stops, rail / subway / tram stations
  radiusMeters: number
  source: 'Google Maps' | 'OpenStreetMap'
}

const CACHE_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { value: NeighborhoodInfo | null; at: number }>()

function overpassQuery(c: Coordinates): string {
  const a = `(around:${WALK_RADIUS_M},${c.lat},${c.lon})`
  return `[out:json][timeout:10];
node${a}[shop~"^(supermarket|grocery|convenience|greengrocer)$"]->.g;
.g out count;
node${a}[amenity~"^(restaurant|cafe|fast_food)$"]->.f;
.f out count;
node${a}[highway=bus_stop]->.b;node${a}[railway~"^(station|halt|tram_stop)$"]->.r;(.b;.r;)->.t;
.t out count;`
}

// how many places of these types Google finds within the walk radius (null if the request fails)
async function placesCount(c: Coordinates, types: string[], key: string): Promise<number | null> {
  const res = await fetch(PLACES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      locationRestriction: { circle: { center: { latitude: c.lat, longitude: c.lon }, radius: WALK_RADIUS_M } },
    }),
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  })
  if (!res.ok) {
    console.warn(`[Neighborhood] Google Places request failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
    return null
  }
  const json = (await res.json()) as { places?: unknown[] }
  return json.places?.length ?? 0
}

async function fromGoogle(c: Coordinates): Promise<NeighborhoodInfo | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return null
  try {
    const [groceries, food, transit] = await Promise.all([
      placesCount(c, PLACE_TYPES.groceries, key),
      placesCount(c, PLACE_TYPES.food, key),
      placesCount(c, PLACE_TYPES.transit, key),
    ])
    if (groceries == null || food == null || transit == null) return null
    return { groceries, food, transit, radiusMeters: WALK_RADIUS_M, source: 'Google Maps' }
  } catch (err) {
    console.warn('[Neighborhood] Google Places error:', err)
    return null
  }
}

// the free public Overpass servers are often busy, so ask two at once and take the first answer
async function fromOverpass(c: Coordinates): Promise<NeighborhoodInfo | null> {
  const ask = async (url: string): Promise<NeighborhoodInfo> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Subtle (ACM UTD student project)' },
      body: `data=${encodeURIComponent(overpassQuery(c))}`,
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Overpass ${res.status}`)
    const json = (await res.json()) as { elements?: { type: string; tags?: { total?: string } }[] }
    const counts = (json.elements ?? []).filter((e) => e.type === 'count').map((e) => Number(e.tags?.total ?? 0))
    if (counts.length !== 3) throw new Error('Overpass: unexpected answer')
    return { groceries: counts[0], food: counts[1], transit: counts[2], radiusMeters: WALK_RADIUS_M, source: 'OpenStreetMap' }
  }
  try {
    return await Promise.any(OVERPASS.map(ask))
  } catch {
    console.warn('[Neighborhood] OpenStreetMap (Overpass) did not answer in time')
    return null
  }
}

/** What is within a short walk of one spot, or null if no source could be reached. */
export async function neighborhoodNear(c: Coordinates): Promise<NeighborhoodInfo | null> {
  const key = `${c.lat.toFixed(3)},${c.lon.toFixed(3)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value

  const value = (await fromGoogle(c)) ?? (await fromOverpass(c))
  if (value) cache.set(key, { value, at: Date.now() }) // failures aren't cached, so a later request can try again
  return value
}

/** 0 to 1: groceries count 40%, restaurants and cafes 30%, transit stops 30%. */
export function neighborhoodFit(info: NeighborhoodInfo): number {
  const part = (n: number, enough: number) => Math.min(1, n / enough)
  return 0.4 * part(info.groceries, ENOUGH.groceries) + 0.3 * part(info.food, ENOUGH.food) + 0.3 * part(info.transit, ENOUGH.transit)
}

/** One line for "Why this score", built only from the real counts. */
export function neighborhoodReason(info: NeighborhoodInfo): string {
  const s = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return `Nearby · ${s(info.groceries, 'grocery store', 'grocery stores')}, ${s(info.food, 'restaurant or cafe', 'restaurants and cafes')}, ${s(info.transit, 'transit stop', 'transit stops')} within a 10 min walk (${info.source})`
}

/**
 * Neighborhood info for many spots, a few at a time. Stops starting new lookups after budgetMs so a slow
 * source never holds up the matches page; homes it didn't reach just leave this part out (and are
 * usually cached by the next visit).
 */
export async function neighborhoodForMany(coords: (Coordinates | null)[], concurrency = 4, budgetMs = 10000): Promise<(NeighborhoodInfo | null)[]> {
  const out: (NeighborhoodInfo | null)[] = coords.map(() => null)
  const stopAt = Date.now() + budgetMs
  let next = 0
  const worker = async () => {
    while (next < coords.length && Date.now() < stopAt) {
      const i = next++
      const c = coords[i]
      if (c) out[i] = await neighborhoodNear(c)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, coords.length) }, worker))
  return out
}
