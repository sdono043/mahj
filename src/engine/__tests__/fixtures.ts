// Synthetic, non-NMJL test fixtures. These patterns are made up purely to
// exercise the matching engine's mechanics (suit vars, number vars, honor
// vars, joker rules, kind-pooling) — they are not transcribed from, and do
// not resemble, any real NMJL card year. See docs/card-schema.md for the
// schema a real card should be transcribed into.

import type { ExposedGroup, PlayerHand } from '../hand'
import type { Dragon, Tile, Wind } from '../tiles'
import type { HandPattern } from '../patterns'
import type { GameState, SeatIndex } from '../table'

let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-fixture-${counter}`
}

export function dot(value: number): Tile {
  return { id: nextId('dot'), suit: 'dot', value }
}
export function bam(value: number): Tile {
  return { id: nextId('bam'), suit: 'bam', value }
}
export function crak(value: number): Tile {
  return { id: nextId('crak'), suit: 'crak', value }
}
export function wind(honor: Wind): Tile {
  return { id: nextId('wind'), suit: 'wind', honor }
}
export function dragon(honor: Dragon): Tile {
  return { id: nextId('dragon'), suit: 'dragon', honor }
}
export function flower(): Tile {
  return { id: nextId('flower'), suit: 'flower' }
}
export function joker(): Tile {
  return { id: nextId('joker'), suit: 'joker' }
}

export function repeat(factory: () => Tile, count: number): Tile[] {
  return Array.from({ length: count }, () => factory())
}

export function hand(concealedTiles: Tile[], exposedGroups: ExposedGroup[] = []): PlayerHand {
  return { concealedTiles, exposedGroups, charlestonPasses: [] }
}

/** kong red dragon, pung green dragon, pung dot-9, pair dot-1, pair wind-N — all exact, no vars. */
export const PATTERN_EXACT: HandPattern = {
  id: 'TEST-EXACT-1',
  category: 'Test Exact',
  displayPattern: 'RRRR GGG 999 11 NN',
  groups: [
    { kind: 'kong', constraint: { suits: ['dragon'], honors: ['red'] } },
    { kind: 'pung', constraint: { suits: ['dragon'], honors: ['green'] } },
    { kind: 'pung', constraint: { suits: ['dot'], value: 9 } },
    { kind: 'pair', constraint: { suits: ['dot'], value: 1 } },
    { kind: 'pair', constraint: { suits: ['wind'], honors: ['N'] } },
  ],
  pointsConcealed: 25,
  pointsExposed: 25,
  allowsExposed: true,
  jokerAllowedPositions: [true, true, true, false, false],
}

/** Consecutive run N,N+1,N+2 across 3 distinct suits, plus 2 pairs + 1 single of flower (kind-pooling). */
export const PATTERN_RUN: HandPattern = {
  id: 'TEST-SUITVAR-RUN',
  category: 'Test Run',
  displayPattern: 'NNN N+1N+1N+1 N+2N+2N+2 FF FF F',
  groups: [
    {
      kind: 'pung',
      constraint: { suits: ['dot', 'bam', 'crak'], suitVar: 'A', numberVar: 'N', numberOffset: 0 },
    },
    {
      kind: 'pung',
      constraint: { suits: ['dot', 'bam', 'crak'], suitVar: 'B', numberVar: 'N', numberOffset: 1 },
    },
    {
      kind: 'pung',
      constraint: { suits: ['dot', 'bam', 'crak'], suitVar: 'C', numberVar: 'N', numberOffset: 2 },
    },
    { kind: 'pair', constraint: { suits: ['flower'] } },
    { kind: 'pair', constraint: { suits: ['flower'] } },
    { kind: 'single', constraint: { suits: ['flower'] } },
  ],
  pointsConcealed: 30,
  pointsExposed: null,
  allowsExposed: false,
  jokerAllowedPositions: [true, true, true, false, false, false],
}

/** All pairs/singles, fixed exact tiles, jokers forbidden everywhere (hard rule anyway). */
export const PATTERN_SINGLES_AND_PAIRS: HandPattern = {
  id: 'TEST-SINGLES-PAIRS',
  category: 'Test Singles and Pairs',
  displayPattern: '11 33 55 77 99 22 44',
  groups: [
    { kind: 'pair', constraint: { suits: ['dot'], value: 1 } },
    { kind: 'pair', constraint: { suits: ['dot'], value: 3 } },
    { kind: 'pair', constraint: { suits: ['dot'], value: 5 } },
    { kind: 'pair', constraint: { suits: ['dot'], value: 7 } },
    { kind: 'pair', constraint: { suits: ['dot'], value: 9 } },
    { kind: 'pair', constraint: { suits: ['bam'], value: 2 } },
    { kind: 'pair', constraint: { suits: ['bam'], value: 4 } },
  ],
  pointsConcealed: 50,
  pointsExposed: null,
  allowsExposed: false,
  jokerAllowedPositions: [false, false, false, false, false, false, false],
}

/** "Any 2 different dragons" + kong/pair sharing a kind (bam-5) + 2 flower singles. */
export const PATTERN_HONORVAR: HandPattern = {
  id: 'TEST-HONORVAR-DRAGONS',
  category: 'Test Honor Var',
  displayPattern: 'XXX YYY 5555 55 F F',
  groups: [
    { kind: 'pung', constraint: { suits: ['dragon'], honors: ['red', 'green', 'white'], honorVar: 'X' } },
    { kind: 'pung', constraint: { suits: ['dragon'], honors: ['red', 'green', 'white'], honorVar: 'Y' } },
    { kind: 'kong', constraint: { suits: ['bam'], value: 5 } },
    { kind: 'pair', constraint: { suits: ['bam'], value: 5 } },
    { kind: 'single', constraint: { suits: ['flower'] } },
    { kind: 'single', constraint: { suits: ['flower'] } },
  ],
  pointsConcealed: 40,
  pointsExposed: 40,
  allowsExposed: true,
  jokerAllowedPositions: [true, true, true, false, false, false],
}

/** Test helper: replaces one seat's concealed tiles, keeping GameState['hands'] properly tupled. */
export function withConcealedTiles(state: GameState, seat: SeatIndex, tiles: Tile[]): GameState {
  const hands = state.hands.map((h, i) => (i === seat ? { ...h, concealedTiles: tiles } : h))
  return { ...state, hands: hands as unknown as GameState['hands'] }
}
