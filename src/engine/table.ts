import type { ExposedGroup, PlayerHand } from './hand'
import { buildWall, deal, shuffle, type Tile } from './tiles'

export type SeatIndex = 0 | 1 | 2 | 3
export const SEATS: readonly SeatIndex[] = [0, 1, 2, 3]

export function nextSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex
}

/** Number of seats clockwise from `from` to reach `to` (1-3; calls never target your own discard). */
export function seatDistanceClockwise(from: SeatIndex, to: SeatIndex): number {
  return ((to - from) + 4) % 4
}

export interface DiscardRecord {
  seat: SeatIndex
  tile: Tile
}

export type GameOutcome =
  | { type: 'mahjong'; seat: SeatIndex; patternId: string; points: number; concealed: boolean }
  | { type: 'wall-exhausted' }

export type GamePhase =
  | 'draw' // currentSeat must draw
  | 'discard' // currentSeat holds 14 tiles; must discard or declare mahjong
  | 'awaiting-calls' // pendingDiscard is live; other seats may call or declare mahjong on it
  | 'ended'

export interface GameState {
  hands: readonly [PlayerHand, PlayerHand, PlayerHand, PlayerHand]
  wall: readonly Tile[]
  discards: readonly DiscardRecord[]
  currentSeat: SeatIndex
  dealerSeat: SeatIndex
  phase: GamePhase
  pendingDiscard: DiscardRecord | null
  outcome: GameOutcome | null
}

export function newGame(dealerSeat: SeatIndex = 0, rng: () => number = Math.random): GameState {
  const shuffled = shuffle(buildWall(), rng)
  const { hands: dealtHands, wall } = deal(shuffled, dealerSeat)
  const hands = dealtHands.map((tiles) => ({
    concealedTiles: tiles,
    exposedGroups: [] as ExposedGroup[],
    charlestonPasses: [] as Tile[][],
  })) as unknown as GameState['hands']

  return {
    hands,
    wall,
    discards: [],
    currentSeat: dealerSeat,
    dealerSeat,
    phase: 'discard', // the dealer starts holding 14 tiles and must discard (or self-mahjong) first
    pendingDiscard: null,
    outcome: null,
  }
}

export function cloneHands(hands: GameState['hands']): [PlayerHand, PlayerHand, PlayerHand, PlayerHand] {
  return hands.map((h) => ({
    concealedTiles: [...h.concealedTiles],
    exposedGroups: h.exposedGroups.map((g) => ({ kind: g.kind, tiles: [...g.tiles] })),
    charlestonPasses: h.charlestonPasses,
  })) as [PlayerHand, PlayerHand, PlayerHand, PlayerHand]
}

/** Draws the current seat's tile from the front of the wall. Ends the game if the wall is empty. */
export function drawTile(state: GameState): GameState {
  if (state.phase !== 'draw') {
    throw new Error(`Cannot draw during phase "${state.phase}"`)
  }
  if (state.wall.length === 0) {
    return { ...state, phase: 'ended', outcome: { type: 'wall-exhausted' } }
  }
  const [tile, ...rest] = state.wall
  const hands = cloneHands(state.hands)
  hands[state.currentSeat].concealedTiles.push(tile)
  return { ...state, hands, wall: rest, phase: 'discard' }
}

/** Discards a tile from the current seat's concealed hand, opening the window for other seats to call. */
export function discardTile(state: GameState, tileId: string): GameState {
  if (state.phase !== 'discard') {
    throw new Error(`Cannot discard during phase "${state.phase}"`)
  }
  const hand = state.hands[state.currentSeat]
  const index = hand.concealedTiles.findIndex((t) => t.id === tileId)
  if (index === -1) {
    throw new Error(`Tile "${tileId}" is not in seat ${state.currentSeat}'s concealed hand`)
  }

  const hands = cloneHands(state.hands)
  const [tile] = hands[state.currentSeat].concealedTiles.splice(index, 1)
  const record: DiscardRecord = { seat: state.currentSeat, tile }

  return {
    ...state,
    hands,
    discards: [...state.discards, record],
    pendingDiscard: record,
    phase: 'awaiting-calls',
  }
}

/** No one called the pending discard — play proceeds to the next seat's draw. */
export function advanceToNextPlayerNaturally(state: GameState): GameState {
  if (state.phase !== 'awaiting-calls' || !state.pendingDiscard) {
    throw new Error('No pending discard to advance from')
  }
  return {
    ...state,
    currentSeat: nextSeat(state.pendingDiscard.seat),
    pendingDiscard: null,
    phase: 'draw',
  }
}
