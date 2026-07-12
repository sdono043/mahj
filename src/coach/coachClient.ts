import { countJokers, type PlayerHand } from '../engine/hand'
import { distanceToAllPatterns } from '../engine/matching'
import type { HandPattern } from '../engine/patterns'

export interface CoachTopPattern {
  id: string
  displayPattern: string
  tilesNeeded: number
}

export interface CoachSummary {
  sessionId: string
  topPatterns: CoachTopPattern[]
  jokersInHand: number
}

/**
 * Computes the compact summary sent to /api/coach — the engine's own
 * top-3-closest-patterns output, never the full card or raw hand. This
 * is deliberately small: the engine does the math, Claude just explains it.
 */
export function buildCoachSummary(
  sessionId: string,
  patterns: readonly HandPattern[],
  hand: PlayerHand,
  topN = 3,
): CoachSummary {
  const distances = distanceToAllPatterns(patterns, hand).slice(0, topN)
  return {
    sessionId,
    topPatterns: distances.map((d) => ({
      id: d.pattern.id,
      displayPattern: d.pattern.displayPattern,
      tilesNeeded: d.tilesAway,
    })),
    jokersInHand: countJokers(hand.concealedTiles),
  }
}

/** Stable key for the session-local "already coached this exact state" cache. */
export function coachCacheKey(summary: CoachSummary): string {
  return JSON.stringify({ topPatterns: summary.topPatterns, jokersInHand: summary.jokersInHand })
}

export interface CoachResponse {
  advice: string
  cached: boolean
}

export class CoachRequestError extends Error {}

export async function requestCoachAdvice(apiUrl: string, summary: CoachSummary): Promise<CoachResponse> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(summary),
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null
    throw new CoachRequestError(errorBody?.error ?? `Coach request failed (HTTP ${response.status})`)
  }

  return (await response.json()) as CoachResponse
}
