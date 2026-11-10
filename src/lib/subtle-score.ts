/**
 * The final Subtle score (58 to 99). Each part is a fit from 0 to 1:
 *
 *   Budget        35%  rent vs. the budget from the quiz
 *   Lifestyle     25%  how well the home matches the quiz answers (vector similarity)
 *   Commute       15%  real door-to-door time to the office vs. the max commute from the quiz
 *   Safety        15%  serious incidents nearby vs. the city average (SF only for now)
 *   Neighborhood  10%  groceries, restaurants and transit stops within a 10 min walk
 *
 * Pets / wheelchair needs are not weighted: homes that don't meet them are filtered out first.
 * If a part has no real data (no office yet, or no safety data outside SF) it is left out and the
 * other weights are scaled up so they still add to 100%.
 */

export const WEIGHTS = { budget: 0.35, lifestyle: 0.25, commute: 0.15, safety: 0.15, neighborhood: 0.1 } as const
export type ScorePart = keyof typeof WEIGHTS
export type ScoreParts = Partial<Record<ScorePart, number>>

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** Safety ratio (1 = city average) to a 0 to 1 fit: half the average or less is 1, average is 0.75, 2.5x or more is 0. */
export function safetyFitFromRatio(ratio: number): number {
  return clamp01(1.25 - 0.5 * ratio)
}

/** Blend whatever parts have real data, re-scaling the weights over just those parts. */
export function subtleScore(parts: ScoreParts): { score: number; weightsUsed: ScoreParts } {
  const have = (Object.keys(WEIGHTS) as ScorePart[]).filter((k) => typeof parts[k] === 'number' && Number.isFinite(parts[k]))
  const total = have.reduce((s, k) => s + WEIGHTS[k], 0)
  if (!total) return { score: 80, weightsUsed: {} }

  const weightsUsed: ScoreParts = {}
  let composite = 0
  for (const k of have) {
    const w = WEIGHTS[k] / total
    weightsUsed[k] = Math.round(w * 100) / 100
    composite += w * clamp01(parts[k] as number)
  }
  return { score: Math.max(58, Math.min(99, Math.round(55 + 44 * composite))), weightsUsed }
}
