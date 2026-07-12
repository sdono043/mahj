import type { ExposedGroup, PlayerHand } from './hand'
import { type ConcreteSlot, type PatternInstantiation, enumerateInstantiations } from './instantiate'
import type { HandPattern } from './patterns'
import { tileKind } from './tiles'

function resolveExposedGroupKind(group: ExposedGroup): string {
  const realTile = group.tiles.find((t) => t.suit !== 'joker')
  if (!realTile) {
    throw new Error('Exposed group has no real (non-joker) tile to identify its kind')
  }
  return tileKind(realTile)
}

/**
 * Finds a one-to-one assignment of already-exposed melds to pattern slots
 * of matching kind+size. Exposed melds are locked — if no assignment
 * exists, this pattern is unreachable from the current hand no matter what
 * gets drawn next. Returns the set of slot indices "consumed" by exposed
 * melds, or null if no valid assignment exists.
 */
function matchExposedGroups(
  exposedGroups: readonly ExposedGroup[],
  slots: readonly ConcreteSlot[],
): Set<number> | null {
  const used = new Set<number>()

  function backtrack(groupIndex: number): boolean {
    if (groupIndex === exposedGroups.length) return true
    const group = exposedGroups[groupIndex]
    const groupKind = resolveExposedGroupKind(group)
    for (let i = 0; i < slots.length; i++) {
      if (used.has(i)) continue
      const slot = slots[i]
      if (slot.count !== group.tiles.length || slot.requiredKind !== groupKind) continue
      used.add(i)
      if (backtrack(groupIndex + 1)) return true
      used.delete(i)
    }
    return false
  }

  return backtrack(0) ? used : null
}

/**
 * Tiles-away for one concrete instantiation of a pattern, given a hand.
 * Returns null if the hand's already-exposed melds rule this
 * instantiation out entirely (can't be undone by drawing).
 */
export function distanceForInstantiation(
  instantiation: PatternInstantiation,
  hand: PlayerHand,
): number | null {
  const usedSlotIndices = matchExposedGroups(hand.exposedGroups, instantiation.slots)
  if (usedSlotIndices === null) return null

  const remainingSlots = instantiation.slots.filter((_, i) => !usedSlotIndices.has(i))

  const realTileCounts = new Map<string, number>()
  let jokerCount = 0
  for (const tile of hand.concealedTiles) {
    if (tile.suit === 'joker') {
      jokerCount++
    } else {
      const kind = tileKind(tile)
      realTileCounts.set(kind, (realTileCounts.get(kind) ?? 0) + 1)
    }
  }

  const byKind = new Map<string, ConcreteSlot[]>()
  for (const slot of remainingSlots) {
    const list = byKind.get(slot.requiredKind) ?? []
    list.push(slot)
    byKind.set(slot.requiredKind, list)
  }

  let ineligibleShortfall = 0
  let eligibleShortfallBeforeJokers = 0

  for (const [kind, slots] of byKind) {
    const available = realTileCounts.get(kind) ?? 0
    const ineligibleNeeded = slots
      .filter((s) => !s.jokerAllowed)
      .reduce((sum, s) => sum + s.count, 0)
    const eligibleNeeded = slots.filter((s) => s.jokerAllowed).reduce((sum, s) => sum + s.count, 0)

    // Real tiles go to joker-ineligible slots first — jokers have no other
    // way to help those, so any real tile "wasted" there is unrecoverable.
    const usedForIneligible = Math.min(available, ineligibleNeeded)
    ineligibleShortfall += ineligibleNeeded - usedForIneligible

    const usedForEligible = Math.min(available - usedForIneligible, eligibleNeeded)
    eligibleShortfallBeforeJokers += eligibleNeeded - usedForEligible
  }

  const jokersUsed = Math.min(jokerCount, eligibleShortfallBeforeJokers)
  return ineligibleShortfall + (eligibleShortfallBeforeJokers - jokersUsed)
}

export interface PatternDistance {
  pattern: HandPattern
  tilesAway: number
  bestInstantiation: PatternInstantiation
}

/** Best (minimum tiles-away) result for one pattern, or null if unreachable. */
export function distanceToPattern(pattern: HandPattern, hand: PlayerHand): PatternDistance | null {
  if (hand.exposedGroups.length > 0 && !pattern.allowsExposed) return null

  let best: PatternDistance | null = null
  for (const instantiation of enumerateInstantiations(pattern)) {
    const tilesAway = distanceForInstantiation(instantiation, hand)
    if (tilesAway === null) continue
    if (best === null || tilesAway < best.tilesAway) {
      best = { pattern, tilesAway, bestInstantiation: instantiation }
    }
  }
  return best
}

/** Distance to every pattern on the loaded card simultaneously, closest first. */
export function distanceToAllPatterns(
  patterns: readonly HandPattern[],
  hand: PlayerHand,
): PatternDistance[] {
  const results: PatternDistance[] = []
  for (const pattern of patterns) {
    const distance = distanceToPattern(pattern, hand)
    if (distance) results.push(distance)
  }
  return results.sort((a, b) => a.tilesAway - b.tilesAway)
}
