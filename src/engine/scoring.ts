import type { PlayerHand } from './hand'
import { totalHandSize } from './hand'
import { distanceToPattern } from './matching'
import type { HandPattern } from './patterns'

export interface MahjongResult {
  pattern: HandPattern
  points: number
}

/**
 * Checks whether declaring mahjong against `pattern` is legal for this
 * exact hand right now (14 tiles, fully matches the pattern with 0 tiles
 * away). Returns the scored result, or null if the declaration is invalid.
 */
export function validateMahjongDeclaration(pattern: HandPattern, hand: PlayerHand): MahjongResult | null {
  if (totalHandSize(hand) !== 14) return null

  const distance = distanceToPattern(pattern, hand)
  if (!distance || distance.tilesAway !== 0) return null

  const isExposed = hand.exposedGroups.length > 0
  const points = isExposed ? pattern.pointsExposed : pattern.pointsConcealed
  if (points === null) return null // shouldn't happen for valid card data, but never award null points

  return { pattern, points }
}

/**
 * Checks every pattern on the loaded card and returns the first one this
 * hand can legally declare mahjong against, if any (a hand may
 * simultaneously match more than one pattern; NMJL play lets the caller
 * pick, so callers wanting every option should filter patterns themselves
 * and call validateMahjongDeclaration per candidate).
 */
export function findValidMahjongDeclarations(
  patterns: readonly HandPattern[],
  hand: PlayerHand,
): MahjongResult[] {
  const results: MahjongResult[] = []
  for (const pattern of patterns) {
    const result = validateMahjongDeclaration(pattern, hand)
    if (result) results.push(result)
  }
  return results.sort((a, b) => b.points - a.points)
}
