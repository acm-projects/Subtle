/**
 * Geocoding and Commute Estimation Service for Subtle.
 * 
 * Uses OpenStreetMap Nominatim for address geocoding (coordinates)
 * with in-memory caching to respect rate limits (1 req/sec).
 * Computes estimated commute time by travel mode using Haversine distance
 * and realistic urban routing coefficients (transit, driving, walking, biking).
 */

export type Coordinates = {
  lat: number
  lon: number
  displayName?: string
}

export type CommuteMode = 'walk' | 'transit' | 'bike' | 'drive'

// In-memory cache to prevent repeated calls to Nominatim
const GEO_CACHE = new Map<string, Coordinates | null>()

// Known coordinates for default sample neighborhoods / addresses
const KNOWN_PLACES: Record<string, Coordinates> = {
  soma: { lat: 37.7785, lon: -122.3998, displayName: 'SoMa, San Francisco, CA' },
  'hayes valley': { lat: 37.7758, lon: -122.4243, displayName: 'Hayes Valley, San Francisco, CA' },
  mission: { lat: 37.7599, lon: -122.4148, displayName: 'Mission District, San Francisco, CA' },
  'nob hill': { lat: 37.7932, lon: -122.4145, displayName: 'Nob Hill, San Francisco, CA' },
  'potrero hill': { lat: 37.7573, lon: -122.3995, displayName: 'Potrero Hill, San Francisco, CA' },
  '500 howard st': { lat: 37.7885, lon: -122.3967, displayName: '500 Howard St, San Francisco, CA' },
  'one apple park way': { lat: 37.3350, lon: -122.0131, displayName: 'One Apple Park Way, Cupertino, CA' },
  '1600 amphitheatre pkwy': { lat: 37.4220, lon: -122.0841, displayName: 'Googleplex, Mountain View, CA' },
  '2801 rutford ave': { lat: 32.9902, lon: -96.7513, displayName: '2801 Rutford Ave, Richardson, TX' },
  '800 w campbell rd': { lat: 32.9857, lon: -96.7501, displayName: 'UT Dallas, Richardson, TX' },
  '123 sunset blvd': { lat: 34.0417, lon: -118.5540, displayName: 'Sunset Blvd, Los Angeles, CA' },
}

/**
 * Geocodes an address string using Nominatim OpenStreetMap API.
 * Includes local known place resolution and caching.
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  // Nominatim often can't find an address with a unit number ("Unit 205", "Apt 3B") or a typo in
  // the street, so try the full address, then without the unit, then just "City, ST 12345".
  const full = (address || '').trim()
  if (!full) return null
  const candidates = [full]
  const noUnit = full
    .replace(/[,\s]*\b(unit|apt|apartment|suite|ste|room|rm|fl|floor)\b\.?\s*#?\s*[\w-]+/gi, '')
    .replace(/[,\s]*#\s*[\w-]+/g, '')
    .replace(/\s+,/g, ',')
    .trim()
  if (noUnit && noUnit !== full) candidates.push(noUnit)
  const parts = full.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 3) candidates.push(parts.slice(-2).join(', '))
  for (const q of candidates) {
    const hit = await geocodeOnce(q)
    if (hit) return hit
  }
  return null
}

async function geocodeOnce(address: string): Promise<Coordinates | null> {
  const clean = (address || '').trim()
  if (!clean) return null

  const key = clean.toLowerCase()
  if (GEO_CACHE.has(key)) {
    return GEO_CACHE.get(key) ?? null
  }

  // Check known shortcut / neighborhood table
  for (const [name, coords] of Object.entries(KNOWN_PLACES)) {
    // exact name, or the name followed by a city ("SoMa, San Francisco"); a looser match sent
    // places like "Mission Bend, Houston" to San Francisco's Mission District
    if (key === name || key.startsWith(`${name},`)) {
      GEO_CACHE.set(key, coords)
      return coords
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SubtleStudentRelocationApp/1.0 (contact@subtle.app)',
      },
      next: { revalidate: 86400 }, // Cache 24h
    })

    if (!res.ok) {
      GEO_CACHE.set(key, null)
      return null
    }

    const data = await res.json()
    if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
      const coords: Coordinates = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      }
      GEO_CACHE.set(key, coords)
      return coords
    }
  } catch (err) {
    console.warn(`[Geocode] Nominatim request failed for "${clean}":`, err)
  }

  GEO_CACHE.set(key, null)
  return null
}

/**
 * Computes great-circle distance (in kilometers) between two coordinates using Haversine formula.
 */
export function haversineDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180
  const dLon = ((c2.lon - c1.lon) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculates estimated commute time in minutes based on distance and travel mode.
 * Applies urban detour factor (~1.35x straight-line distance) and realistic travel speeds.
 * Cap at 90 minutes for local regional commuting.
 */
export function estimateCommuteMinutes(
  distanceKm: number,
  mode: CommuteMode = 'transit',
): number {
  // If distance is across different states or countries (> 120km), cap commute time
  if (distanceKm > 120) {
    return 90
  }

  const detourFactor = 1.35
  const routeDistanceKm = distanceKm * detourFactor

  switch (mode) {
    case 'walk': {
      // Walking speed: ~4.8 km/h (3 mph)
      const walkSpeedKmPerHour = 4.8
      return Math.min(90, Math.max(3, Math.round((routeDistanceKm / walkSpeedKmPerHour) * 60)))
    }
    case 'bike': {
      // Cycling speed: ~15 km/h + 2 min lock/unlock
      const bikeSpeedKmPerHour = 15.0
      return Math.min(90, Math.max(4, Math.round((routeDistanceKm / bikeSpeedKmPerHour) * 60 + 2)))
    }
    case 'drive': {
      // Urban driving speed: ~32 km/h + 4 min parking/traffic buffer
      const driveSpeedKmPerHour = 32.0
      return Math.min(90, Math.max(5, Math.round((routeDistanceKm / driveSpeedKmPerHour) * 60 + 4)))
    }
    case 'transit':
    default: {
      // Public transit (bus/metro) including headways/wait time:
      // ~22 km/h average speed + 6 min average wait/transfer buffer
      const transitSpeedKmPerHour = 22.0
      return Math.min(90, Math.max(6, Math.round((routeDistanceKm / transitSpeedKmPerHour) * 60 + 6)))
    }
  }
}

/**
 * Automatically chooses the most sensible commute mode if distance is very short or long.
 */
export function pickOptimalCommuteMode(distanceKm: number, preferredMode?: string | null): CommuteMode {
  const pref = (preferredMode || '').toLowerCase()
  if (pref.includes('walk') && distanceKm <= 2.2) return 'walk'
  if (pref.includes('bike') && distanceKm <= 9.0) return 'bike'
  if (pref.includes('drive') || pref.includes('car')) return 'drive'
  if (pref.includes('transit')) return distanceKm <= 1.2 ? 'walk' : 'transit'

  // Default auto-selection
  if (distanceKm <= 1.5) return 'walk'
  if (distanceKm <= 7.0) return 'transit'
  return distanceKm <= 16.0 ? 'transit' : 'drive'
}
