import { simulateCallOnHand, type CallOption } from '../engine/calls'
import type { PlayerHand } from '../engine/hand'
import { distanceToAllPatterns } from '../engine/matching'
import type { HandPattern } from '../engine/patterns'
import { tileKind, type Tile } from '../engine/tiles'

/**
 * Deterministic, heuristic bot opponent. No training/ML — it leans
 * entirely on the same hand-matching engine (`distanceToAllPatterns`)
 * everything else uses, per the design doc: offense (stay close to
 * completing a pattern) dominates the decision, with a simple defensive
 * tiebreak (prefer discarding tile kinds someone has already discarded
 * without being punished for it, over kinds nobody's let go of yet).
 */

function bestDistance(patterns: readonly HandPattern[], hand: PlayerHand): number {
  const results = distanceToAllPatterns(patterns, hand)
  return results.length > 0 ? results[0].tilesAway : Infinity
}

function withoutTile(tiles: readonly Tile[], target: Tile): Tile[] {
  const index = tiles.findIndex((t) => t.id === target.id)
  return [...tiles.slice(0, index), ...tiles.slice(index + 1)]
}

/** How much worse the hand's best distance gets without this tile — 0 means it's not helping anything right now. */
function marginalUsefulness(hand: PlayerHand, patterns: readonly HandPattern[], tile: Tile, baseline: number): number {
  const without: PlayerHand = { ...hand, concealedTiles: withoutTile(hand.concealedTiles, tile) }
  const distanceWithout = bestDistance(patterns, without)
  return distanceWithout - baseline
}

const JOKER_DISCARD_PENALTY = 1000

/**
 * Picks which tile to discard: least useful to our own best pattern
 * first, breaking ties by preferring to let go of a tile-kind that's
 * already appeared safely in the discard pile. Jokers are kept unless
 * there's truly nothing better to give up.
 */
export function chooseDiscard(
  hand: PlayerHand,
  patterns: readonly HandPattern[],
  discardedKinds: ReadonlySet<string>,
): Tile {
  const concealed = hand.concealedTiles
  if (concealed.length === 0) {
    throw new Error('Cannot choose a discard from an empty hand')
  }
  if (patterns.length === 0) {
    return pickSafestFallback(concealed, discardedKinds)
  }

  const baseline = bestDistance(patterns, hand)
  let best: { tile: Tile; score: number } | null = null

  for (const tile of concealed) {
    const usefulness = marginalUsefulness(hand, patterns, tile, baseline)
    const dangerPenalty = discardedKinds.has(tileKind(tile)) ? 0 : 1
    const jokerPenalty = tile.suit === 'joker' ? JOKER_DISCARD_PENALTY : 0
    const score = usefulness * 10 + dangerPenalty + jokerPenalty
    if (!best || score < best.score) {
      best = { tile, score }
    }
  }

  return best!.tile
}

function pickSafestFallback(tiles: readonly Tile[], discardedKinds: ReadonlySet<string>): Tile {
  const nonJokers = tiles.filter((t) => t.suit !== 'joker')
  const pool = nonJokers.length > 0 ? nonJokers : tiles
  const safe = pool.find((t) => discardedKinds.has(tileKind(t)))
  return safe ?? pool[0]
}

/**
 * Picks 3 tiles to pass during the Charleston: the 3 least useful to our
 * own best pattern, same marginal-usefulness scoring as discards (danger
 * doesn't apply — there's no discard pile yet). Falls back to passing
 * arbitrary non-joker tiles if no card is loaded.
 */
export function chooseCharlestonPass(tiles: readonly Tile[], patterns: readonly HandPattern[]): Tile[] {
  if (patterns.length === 0) {
    const nonJokers = tiles.filter((t) => t.suit !== 'joker')
    return (nonJokers.length >= 3 ? nonJokers : tiles).slice(0, 3)
  }

  const hand: PlayerHand = { concealedTiles: [...tiles], exposedGroups: [], charlestonPasses: [] }
  const baseline = bestDistance(patterns, hand)

  const scored = tiles.map((tile) => {
    const usefulness = marginalUsefulness(hand, patterns, tile, baseline)
    const jokerPenalty = tile.suit === 'joker' ? JOKER_DISCARD_PENALTY : 0
    return { tile, score: usefulness * 10 + jokerPenalty }
  })
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, 3).map((s) => s.tile)
}

/**
 * Decides whether to take a pung/kong/quint call: simulates each legal
 * option and only calls if it actually improves the hand's best distance
 * to completion (never calls just to churn tiles). Picks whichever
 * feasible option improves the most; ties broken by fewest jokers spent.
 */
export function decideCall(
  hand: PlayerHand,
  patterns: readonly HandPattern[],
  discard: Tile,
  options: readonly CallOption[],
): CallOption | null {
  if (options.length === 0 || patterns.length === 0) return null

  const currentBest = bestDistance(patterns, hand)
  let best: { option: CallOption; distance: number } | null = null

  for (const option of options) {
    const simulated = simulateCallOnHand(hand, discard, option)
    const distance = bestDistance(patterns, simulated)
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && option.jokersUsed < best.option.jokersUsed)
    ) {
      best = { option, distance }
    }
  }

  return best && best.distance < currentBest ? best.option : null
}
