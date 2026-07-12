// Tile model and wall generation. This module is the single point where
// `Tile` objects are constructed — everything else in the app should get
// tiles by moving these instances between locations (hand/wall/discard/
// exposed meld), never by building a new Tile from scratch. That's what
// keeps the "152 tiles total, no duplicate ids" invariant enforceable.

export type Suit = 'dot' | 'bam' | 'crak' | 'wind' | 'dragon' | 'flower' | 'joker'

export type Wind = 'N' | 'E' | 'S' | 'W'
export type Dragon = 'red' | 'green' | 'white'
export type Honor = Wind | Dragon

export interface Tile {
  id: string
  suit: Suit
  value?: number // 1-9 for dot/bam/crak, undefined otherwise
  honor?: Honor // winds/dragons only
}

export const SUIT_NUMBERS = ['dot', 'bam', 'crak'] as const
export const NUMBER_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const WINDS: readonly Wind[] = ['N', 'E', 'S', 'W']
export const DRAGONS: readonly Dragon[] = ['red', 'green', 'white']

export const TOTAL_TILE_COUNT = 152
const COPIES_PER_NUMBER_TILE = 4
const COPIES_PER_HONOR_TILE = 4
const FLOWER_COUNT = 8
const JOKER_COUNT = 8

/** Builds the fixed 152-tile American mahjong set, unshuffled. */
export function buildWall(): Tile[] {
  const tiles: Tile[] = []

  for (const suit of SUIT_NUMBERS) {
    for (const value of NUMBER_VALUES) {
      for (let copy = 0; copy < COPIES_PER_NUMBER_TILE; copy++) {
        tiles.push({ id: `${suit}-${value}-${copy}`, suit, value })
      }
    }
  }

  for (const honor of WINDS) {
    for (let copy = 0; copy < COPIES_PER_HONOR_TILE; copy++) {
      tiles.push({ id: `wind-${honor}-${copy}`, suit: 'wind', honor })
    }
  }

  for (const honor of DRAGONS) {
    for (let copy = 0; copy < COPIES_PER_HONOR_TILE; copy++) {
      tiles.push({ id: `dragon-${honor}-${copy}`, suit: 'dragon', honor })
    }
  }

  for (let copy = 0; copy < FLOWER_COUNT; copy++) {
    tiles.push({ id: `flower-${copy}`, suit: 'flower' })
  }

  for (let copy = 0; copy < JOKER_COUNT; copy++) {
    tiles.push({ id: `joker-${copy}`, suit: 'joker' })
  }

  return tiles
}

/** Fisher-Yates shuffle. Takes an injectable RNG so tests can be deterministic. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export interface DealResult {
  hands: [Tile[], Tile[], Tile[], Tile[]]
  wall: Tile[]
}

/**
 * Deals 13 tiles to each of 4 players (dealer gets 14 — seat index
 * `dealerSeat`), consuming from the front of `shuffledWall`. The remainder
 * becomes the live wall.
 */
export function deal(shuffledWall: readonly Tile[], dealerSeat: 0 | 1 | 2 | 3 = 0): DealResult {
  const HAND_SIZE = 13
  const remaining = shuffledWall.slice()
  const hands: [Tile[], Tile[], Tile[], Tile[]] = [[], [], [], []]

  for (let seat = 0; seat < 4; seat++) {
    const count = seat === dealerSeat ? HAND_SIZE + 1 : HAND_SIZE
    hands[seat] = remaining.splice(0, count)
  }

  return { hands, wall: remaining }
}

/** Suit/value/honor "kind" key used to check the tile set is fully represented. */
export function tileKind(tile: Tile): string {
  if (tile.value !== undefined) return `${tile.suit}-${tile.value}`
  if (tile.honor !== undefined) return `${tile.suit}-${tile.honor}`
  return tile.suit
}

/** Counts tiles by kind — the shape used to verify the standard 152-tile composition. */
export function describeComposition(tiles: readonly Tile[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const tile of tiles) {
    const kind = tileKind(tile)
    counts[kind] = (counts[kind] ?? 0) + 1
  }
  return counts
}

/** The expected kind -> count map for a complete, standard 152-tile set. */
export function expectedComposition(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const suit of SUIT_NUMBERS) {
    for (const value of NUMBER_VALUES) {
      counts[`${suit}-${value}`] = COPIES_PER_NUMBER_TILE
    }
  }
  for (const honor of WINDS) counts[`wind-${honor}`] = COPIES_PER_HONOR_TILE
  for (const honor of DRAGONS) counts[`dragon-${honor}`] = COPIES_PER_HONOR_TILE
  counts['flower'] = FLOWER_COUNT
  counts['joker'] = JOKER_COUNT
  return counts
}

/**
 * Throws if the given tile locations (hand(s), wall, discards, exposed
 * melds — pass every location in play) don't sum to exactly 152 tiles, or
 * if any tile id appears more than once across them.
 */
export function assertTileConservation(locations: readonly (readonly Tile[])[]): void {
  const all = locations.flat()
  if (all.length !== TOTAL_TILE_COUNT) {
    throw new Error(`Tile conservation violated: expected ${TOTAL_TILE_COUNT} tiles, found ${all.length}`)
  }
  const seen = new Set<string>()
  for (const tile of all) {
    if (seen.has(tile.id)) {
      throw new Error(`Tile conservation violated: duplicate tile id "${tile.id}"`)
    }
    seen.add(tile.id)
  }
}
