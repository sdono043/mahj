import type { GroupKind } from './patterns'
import type { Tile } from './tiles'

/**
 * An already-called meld. Holds real Tile objects (which may include
 * jokers substituted in at call time) — deviates from the design doc's
 * `exposedGroups: TileGroupSlot[]` sketch, since a *slot definition* can't
 * represent the specific tiles a player actually laid down. `kind` fixes
 * the meld's size/type so it never has to be re-derived from tile count.
 */
export interface ExposedGroup {
  kind: GroupKind
  tiles: Tile[]
}

export interface PlayerHand {
  concealedTiles: Tile[]
  exposedGroups: ExposedGroup[]
  /** Charleston pass history, for undo/debug — not consulted by the matching engine. */
  charlestonPasses: Tile[][]
}

export function countJokers(tiles: readonly Tile[]): number {
  return tiles.filter((t) => t.suit === 'joker').length
}

export function totalHandSize(hand: PlayerHand): number {
  return hand.concealedTiles.length + hand.exposedGroups.reduce((sum, g) => sum + g.tiles.length, 0)
}
