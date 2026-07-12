import { SEATS, nextSeat, type SeatIndex } from './table'
import type { Tile } from './tiles'

export type CharlestonDirection = 'right' | 'across' | 'left'
export type CharlestonPhase = 'passing' | 'courtesy-decision' | 'courtesy-passing' | 'done'

const MANDATORY_DIRECTIONS: readonly CharlestonDirection[] = ['right', 'across', 'left']

export function seatAcrossFrom(seat: SeatIndex): SeatIndex {
  return ((seat + 2) % 4) as SeatIndex
}

function targetSeat(seat: SeatIndex, direction: CharlestonDirection): SeatIndex {
  switch (direction) {
    case 'right':
      return nextSeat(seat)
    case 'across':
      return seatAcrossFrom(seat)
    case 'left':
      return ((seat + 3) % 4) as SeatIndex
  }
}

export interface CharlestonState {
  hands: [Tile[], Tile[], Tile[], Tile[]]
  remainingDirections: readonly CharlestonDirection[]
  phase: CharlestonPhase
  /** Proposed courtesy exchange counts (0-3) per seat, set once the decision step completes. */
  courtesyCounts: [number, number, number, number] | null
}

export function startCharleston(hands: readonly Tile[][]): CharlestonState {
  return {
    hands: hands.map((h) => [...h]) as [Tile[], Tile[], Tile[], Tile[]],
    remainingDirections: MANDATORY_DIRECTIONS,
    phase: 'passing',
    courtesyCounts: null,
  }
}

/** Moves each seat's `selected[seat]` tiles to targetSeat(seat, direction), for every seat at once. */
function applyPass(
  hands: readonly Tile[][],
  selected: readonly Tile[][],
  direction: CharlestonDirection,
): [Tile[], Tile[], Tile[], Tile[]] {
  for (const seat of SEATS) {
    for (const tile of selected[seat]) {
      if (!hands[seat].some((t) => t.id === tile.id)) {
        throw new Error(`Seat ${seat} tried to pass tile "${tile.id}" it does not hold`)
      }
    }
  }

  const newHands: [Tile[], Tile[], Tile[], Tile[]] = [[], [], [], []]
  for (const seat of SEATS) {
    const selectedIds = new Set(selected[seat].map((t) => t.id))
    newHands[seat] = hands[seat].filter((t) => !selectedIds.has(t.id))
  }
  for (const seat of SEATS) {
    const target = targetSeat(seat, direction)
    newHands[target] = [...newHands[target], ...selected[seat]]
  }
  return newHands
}

/** Submits one mandatory pass (exactly 3 tiles per seat) and advances to the next direction. */
export function submitPass(state: CharlestonState, selected: readonly Tile[][]): CharlestonState {
  if (state.phase !== 'passing') {
    throw new Error(`Cannot submit a mandatory pass during phase "${state.phase}"`)
  }
  if (selected.some((s) => s.length !== 3)) {
    throw new Error('Each seat must pass exactly 3 tiles')
  }
  const [direction, ...rest] = state.remainingDirections
  const hands = applyPass(state.hands, selected, direction)
  return {
    ...state,
    hands,
    remainingDirections: rest,
    phase: rest.length === 0 ? 'courtesy-decision' : 'passing',
  }
}

/**
 * Each seat proposes how many tiles (0-3) it's willing to courtesy-pass
 * across the table. A pair only exchanges tiles if *both* sides in that
 * across-pairing proposed more than 0 (matching the common house-rule
 * convention that either player can decline the courtesy round); the
 * actual exchanged count per pair is the smaller of the two proposals.
 */
export function decideCourtesy(
  state: CharlestonState,
  proposedCounts: readonly [number, number, number, number],
): CharlestonState {
  if (state.phase !== 'courtesy-decision') {
    throw new Error(`Cannot decide courtesy during phase "${state.phase}"`)
  }
  if (proposedCounts.some((c) => c < 0 || c > 3 || !Number.isInteger(c))) {
    throw new Error('Courtesy counts must be integers between 0 and 3')
  }
  const counts = [...proposedCounts] as [number, number, number, number]
  const anyExchange = SEATS.some((seat) => exchangeCountFor(counts, seat) > 0)
  return {
    ...state,
    courtesyCounts: counts,
    phase: anyExchange ? 'courtesy-passing' : 'done',
  }
}

function exchangeCountFor(counts: readonly [number, number, number, number], seat: SeatIndex): number {
  return Math.min(counts[seat], counts[seatAcrossFrom(seat)])
}

/** Submits the courtesy pass — each seat must pass exactly its pair's agreed exchange count. */
export function submitCourtesyPass(state: CharlestonState, selected: readonly Tile[][]): CharlestonState {
  if (state.phase !== 'courtesy-passing' || !state.courtesyCounts) {
    throw new Error(`Cannot submit a courtesy pass during phase "${state.phase}"`)
  }
  const counts = state.courtesyCounts
  for (const seat of SEATS) {
    const expected = exchangeCountFor(counts, seat)
    if (selected[seat].length !== expected) {
      throw new Error(`Seat ${seat} must courtesy-pass exactly ${expected} tile(s), got ${selected[seat].length}`)
    }
  }
  const hands = applyPass(state.hands, selected, 'across')
  return { ...state, hands, phase: 'done' }
}

export function isCharlestonDone(state: CharlestonState): boolean {
  return state.phase === 'done'
}
