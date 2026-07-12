import { startCharleston, type CharlestonState } from './charleston'
import type { ExposedGroup } from './hand'
import { SEATS, type GameState, type SeatIndex } from './table'
import { buildWall, shuffle, type Tile } from './tiles'

export interface CharlestonSetup {
  charleston: CharlestonState
  wall: Tile[]
  dealerSeat: SeatIndex
}

/**
 * Deals 13 tiles to every seat (the dealer's traditional 14th tile is
 * deferred until after the Charleston finishes) and starts the Charleston
 * state machine. Charleston is intentionally kept independent of
 * `GameState` — it has its own rules and its own UI, per the design.
 */
export function dealForCharleston(dealerSeat: SeatIndex = 0, rng: () => number = Math.random): CharlestonSetup {
  const shuffled = shuffle(buildWall(), rng)
  const remaining = shuffled.slice()
  const hands: [Tile[], Tile[], Tile[], Tile[]] = [[], [], [], []]
  for (const seat of SEATS) {
    hands[seat] = remaining.splice(0, 13)
  }
  return { charleston: startCharleston(hands), wall: remaining, dealerSeat }
}

/**
 * Converts a finished Charleston into the start of real play: the dealer
 * draws their 14th tile and everyone else holds 13, matching `newGame()`'s
 * initial state — but using the post-Charleston hands.
 */
export function beginPlayAfterCharleston(setup: CharlestonSetup): GameState {
  if (setup.charleston.phase !== 'done') {
    throw new Error(`Cannot begin play while Charleston is still in phase "${setup.charleston.phase}"`)
  }
  if (setup.wall.length === 0) {
    throw new Error('Wall is empty; cannot deal the dealer their 14th tile')
  }

  const [dealerTile, ...wall] = setup.wall
  const hands = setup.charleston.hands.map((tiles, seat) => ({
    concealedTiles: seat === setup.dealerSeat ? [...tiles, dealerTile] : [...tiles],
    exposedGroups: [] as ExposedGroup[],
    charlestonPasses: [] as Tile[][],
  })) as unknown as GameState['hands']

  return {
    hands,
    wall,
    discards: [],
    currentSeat: setup.dealerSeat,
    dealerSeat: setup.dealerSeat,
    phase: 'discard',
    pendingDiscard: null,
    outcome: null,
  }
}
