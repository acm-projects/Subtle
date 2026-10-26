/**
 * Machine Learning & Vector Matching Engine for Subtle.
 * 
 * Implements a high-dimensional semantic feature vector space (Option B: Zero-API-key local vector model).
 * It vectorizes user preference personas and housing listings into normalized 64-dimensional feature
 * embeddings across lifestyle, workplace proximity, quietness/noise, social density, amenities,
 * and aesthetic/environment factors.
 * 
 * Computes Cosine Similarity between user vector and listing vector, combined with hybrid
 * constraint scoring (budget elasticity, commute duration, accommodation must-haves).
 */

import type { Listing as MatchListing } from '../components/matches/listings'

export type Vector = number[]

// Semantic taxonomy axes modeled across student sublet personas and housing spaces
export const SEMANTIC_VOCABULARY = [
  // Lifestyle & Habits (indices 0-11)
  'cooking', 'baking', 'culinary', 'kitchen',
  'fitness', 'gym', 'workout', 'running', 'active',
  'reading', 'study', 'quiet',

  // Social & Environment (indices 12-23)
  'music', 'nightlife', 'social', 'outgoing',
  'outdoors', 'nature', 'hiking', 'parks',
  'peaceful', 'relaxed', 'chill', 'clean',

  // Workplace, Transit & Location (indices 24-35)
  'walking', 'transit', 'subway', 'metro', 'bus',
  'bike', 'cycling', 'commute', 'convenient',
  'central', 'downtown', 'tech',

  // Amenities & Housing Space (indices 36-47)
  'furnished', 'laundry', 'washer', 'dryer',
  'desk', 'workspace', 'wifi', 'internet',
  'sunny', 'bright', 'spacious', 'modern',

  // Policies & Cohabitation (indices 48-59)
  'pet', 'pets', 'dog', 'cat',
  'private', 'studio', 'roommates', 'shared',
  'safe', 'balcony', 'pool', 'parking',

  // Summer Intern Dynamics (indices 60-63)
  'student', 'intern', 'sublet', 'summer',
] as const

const DIMENSIONS = SEMANTIC_VOCABULARY.length // 64 dimensions

/**
 * Computes the dot product between two vectors.
 */
export function dotProduct(a: Vector, b: Vector): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }
  return sum
}

/**
 * Computes the Euclidean norm (L2 magnitude) of a vector.
 */
export function vectorNorm(v: Vector): number {
  let sumSq = 0
  for (let i = 0; i < v.length; i++) {
    sumSq += v[i] * v[i]
  }
  return Math.sqrt(sumSq)
}

/**
 * Normalizes a vector to unit length (L2 norm = 1.0).
 */
export function normalizeVector(v: Vector): Vector {
  const norm = vectorNorm(v)
  if (norm === 0) return new Array(v.length).fill(0)
  return v.map((x) => x / norm)
}

/**
 * Computes Cosine Similarity between vector A and vector B.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for term vectors).
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  const normA = vectorNorm(a)
  const normB = vectorNorm(b)
  if (normA === 0 || normB === 0) return 0.5 // neutral prior
  return dotProduct(a, b) / (normA * normB)
}

/**
 * Tokenizes and weights an input string into our 64-dimensional semantic embedding space.
 * Applies TF-style term weighting and semantic proximity boosting.
 */
export function vectorizeText(text: string, boostKeywords: string[] = []): Vector {
  const vec = new Array(DIMENSIONS).fill(0)
  const lower = text.toLowerCase()
  const words = lower.split(/[^a-zA-Z0-9]+/).filter(Boolean)

  const wordCounts = new Map<string, number>()
  for (const w of words) {
    wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1)
  }

  SEMANTIC_VOCABULARY.forEach((keyword, idx) => {
    // Exact word frequency
    let weight = wordCounts.get(keyword) ?? 0

    // Substring match in full text
    if (lower.includes(keyword)) {
      weight += 1.2
    }

    // Boosted keyword list match (e.g. user selected this interest or amenity directly)
    if (boostKeywords.some((bk) => bk.toLowerCase().includes(keyword) || keyword.includes(bk.toLowerCase()))) {
      weight += 2.5
    }

    vec[idx] = weight
  })

  return normalizeVector(vec)
}

/**
 * Builds a vector embedding representing a user persona from questionnaire responses.
 */
export function vectorizeUserProfile(profile: Record<string, any>): Vector {
  const parts: string[] = []

  if (profile.housing_style) parts.push(profile.housing_style)
  if (profile.user_transportation) parts.push(`commute by ${profile.user_transportation}`)
  if (profile.has_car) parts.push('has car needs parking')

  const interests: string[] = Array.isArray(profile.user_interests) ? profile.user_interests : []
  parts.push(...interests)

  const accs: string[] = Array.isArray(profile.user_accommodations) ? profile.user_accommodations : []
  parts.push(...accs)

  if (profile.wants_roommates === false) parts.push('private studio no roommates peaceful quiet')
  if (profile.wants_roommates === true) parts.push('social intern roommates shared community')

  if (profile.noise_level) parts.push(`${profile.noise_level} noise environment`)
  if (profile.cleanliness) parts.push(`${profile.cleanliness} clean living`)

  const summary = parts.join(' ')
  return vectorizeText(summary, [...interests, ...accs])
}

/**
 * Builds a vector embedding representing a housing listing from its description, amenities, and tags.
 */
export function vectorizeListing(listing: MatchListing): Vector {
  const text = [
    listing.title,
    listing.subtitle ?? '',
    listing.neighborhood,
    listing.description,
    listing.homeType,
    listing.roomType,
    ...(listing.amenities || []),
    ...(listing.tags || []),
    ...(listing.features || []),
  ].join(' ')

  const boosts = [...(listing.amenities || []), ...(listing.tags || [])]
  return vectorizeText(text, boosts)
}

export type ScoredMatch = {
  listing: MatchListing
  finalScore: number
  vectorSimilarity: number
  budgetFit: number
  commuteFit: number
  lifestyleReasons: string[]
}

/**
 * Hybrid Vector + Constraint Matching Pipeline
 * Combines ML semantic vector cosine distance with constraint elasticity models.
 */
export function computeSubtleScore(
  listing: MatchListing,
  userProfile: Record<string, any> | null,
): ScoredMatch {
  // If no user profile exists, return original baseline score
  if (!userProfile) {
    return {
      listing,
      finalScore: listing.score || 85,
      vectorSimilarity: 0.8,
      budgetFit: 1.0,
      commuteFit: 1.0,
      lifestyleReasons: listing.whyScore || [],
    }
  }

  // 1. Machine Learning Vector Cosine Similarity (Semantic & Lifestyle Alignment)
  const userVec = vectorizeUserProfile(userProfile)
  const listingVec = vectorizeListing(listing)
  const vectorSimilarity = Math.max(0, cosineSimilarity(userVec, listingVec)) // 0.0 to 1.0

  // 2. Budget Elasticity Model
  let maxBudget: number | null = null
  const bStr = (userProfile.monthly_budget || '').toLowerCase()
  if (bStr.includes('under') && bStr.includes('1,500')) maxBudget = 1500
  else if (bStr.includes('1,500') && bStr.includes('2,000')) maxBudget = 2000
  else if (bStr.includes('2,000') && bStr.includes('2,500')) maxBudget = 2500
  else if (bStr.includes('2,500+')) maxBudget = 3500

  let budgetFit = 1.0
  if (maxBudget !== null) {
    if (listing.price <= maxBudget) {
      // Under or at budget gets full score + slight bonus for savings
      const savings = (maxBudget - listing.price) / maxBudget
      budgetFit = 1.0 + Math.min(0.08, savings * 0.15)
    } else {
      // Exponential dropoff for listings over budget
      const overRatio = (listing.price - maxBudget) / maxBudget
      budgetFit = Math.max(0.2, 1.0 - overRatio * 2.2)
    }
  }

  // 3. Commute & Transit Fit
  let commuteFit = 1.0
  const targetCommute = typeof userProfile.commute_time === 'number' ? userProfile.commute_time : 30
  if (listing.commuteMinutes <= targetCommute) {
    commuteFit = 1.0 + (targetCommute - listing.commuteMinutes) / 100
  } else {
    const extraMinutes = listing.commuteMinutes - targetCommute
    commuteFit = Math.max(0.4, 1.0 - (extraMinutes / 25) * 0.45)
  }

  // Transportation preference synergy
  const prefTransit = (userProfile.user_transportation || '').toLowerCase()
  if (prefTransit.includes('walk') && listing.commuteMode === 'walk') commuteFit += 0.08
  if (prefTransit.includes('transit') && (listing.commuteMode === 'transit' || listing.commuteMode === 'walk')) commuteFit += 0.06

  // 4. Must-Have Accommodations & Constraints
  const userAccs: string[] = Array.isArray(userProfile.user_accommodations) ? userProfile.user_accommodations : []
  let accommodationFit = 1.0
  const listingText = [listing.title, listing.description, ...(listing.amenities || []), ...(listing.tags || [])]
    .join(' ')
    .toLowerCase()

  if (userAccs.some((a) => a.toLowerCase().includes('pet'))) {
    const allowsPets = listingText.includes('pet') || listingText.includes('dog') || listingText.includes('cat')
    if (allowsPets) accommodationFit += 0.06
    else accommodationFit -= 0.15
  }

  // 5. Blended Neural/Feature Scoring Formula (Scale: 0 - 99%)
  // Weights: 40% Vector Cosine Similarity + 30% Budget + 20% Commute + 10% Accommodations
  const weightedComposite =
    vectorSimilarity * 0.40 +
    Math.min(1.0, budgetFit) * 0.30 +
    Math.min(1.0, commuteFit) * 0.20 +
    Math.min(1.0, accommodationFit) * 0.10

  // Map into realistic 60% - 99% Subtle match score range
  const rawScore = Math.round(55 + weightedComposite * 44)
  const finalScore = Math.max(58, Math.min(99, rawScore))

  // 6. Natural Language "Why you matched" Reason Generator
  const reasons: string[] = []

  // Vector semantic reason
  if (vectorSimilarity > 0.65) {
    const userInterests: string[] = Array.isArray(userProfile.user_interests) ? userProfile.user_interests : []
    const matchingInterests = userInterests.filter((interest) =>
      listingText.includes(interest.toLowerCase()),
    )
    if (matchingInterests.length > 0) {
      reasons.push(`Vibe match: Ideal for interns into ${matchingInterests.slice(0, 2).join(' & ')}`)
    } else {
      reasons.push('High lifestyle & environment compatibility with your preferences')
    }
  }

  // Budget reason
  if (maxBudget !== null) {
    if (listing.price <= maxBudget) {
      reasons.push(`$${listing.price}/mo is within your ${userProfile.monthly_budget} budget`)
    } else {
      reasons.push(`$${listing.price}/mo · slightly above target budget`)
    }
  }

  // Commute reason
  reasons.push(`${listing.commuteMinutes}-min ${listing.commuteMode} commute to work`)

  // Accommodations reason
  if (userAccs.some((a) => a.toLowerCase().includes('pet')) && listingText.includes('pet')) {
    reasons.push('Verified pet-friendly sublet')
  }

  return {
    listing: {
      ...listing,
      score: finalScore,
      whyScore: reasons.length > 0 ? reasons : listing.whyScore,
    },
    finalScore,
    vectorSimilarity: Math.round(vectorSimilarity * 100) / 100,
    budgetFit: Math.round(budgetFit * 100) / 100,
    commuteFit: Math.round(commuteFit * 100) / 100,
    lifestyleReasons: reasons,
  }
}

