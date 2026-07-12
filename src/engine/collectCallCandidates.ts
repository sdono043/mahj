import { type CallOption, getLegalCalls } from './calls'
import type { CallCandidates } from './callPriority'
import type { PlayerHand } from './hand'
import type { HandPattern } from './patterns'
import { findValidMahjongDeclarations } from './scoring'
import { SEATS, type GameState, type SeatIndex } from './table'

export interface CollectedCallCandidates extends CallCandidates {
  /** Legal call options per eligible seat — exposed for debugging/coaching ("you could have punged that too"). */
  callOptionsBySeat: Partial<Record<SeatIndex, CallOption[]>>
}

/**
 * Gathers every seat's eligibility on the pending discard in one pass
 * (not resolved incrementally as each seat "decides") — mahjong
 * eligibility takes precedence over listing a seat as a plain caller,
 * since mahjong always wins the resulting priority resolution anyway.
 */
export function collectCallCandidates(
  state: GameState,
  patterns: readonly HandPattern[],
): CollectedCallCandidates {
  if (state.phase !== 'awaiting-calls' || !state.pendingDiscard) {
    throw new Error(`Cannot collect call candidates during phase "${state.phase}"`)
  }
  const discarderSeat = state.pendingDiscard.seat
  const discard = state.pendingDiscard.tile

  const mahjongSeats: SeatIndex[] = []
  const callSeats: SeatIndex[] = []
  const callOptionsBySeat: Partial<Record<SeatIndex, CallOption[]>> = {}

  for (const seat of SEATS) {
    if (seat === discarderSeat) continue
    const hand = state.hands[seat]

    const hypotheticalHand: PlayerHand = {
      concealedTiles: [...hand.concealedTiles, discard],
      exposedGroups: hand.exposedGroups,
      charlestonPasses: hand.charlestonPasses,
    }
    if (findValidMahjongDeclarations(patterns, hypotheticalHand).length > 0) {
      mahjongSeats.push(seat)
      continue
    }

    const options = getLegalCalls(hand.concealedTiles, discard)
    if (options.length > 0) {
      callSeats.push(seat)
      callOptionsBySeat[seat] = options
    }
  }

  return { discarderSeat, mahjongSeats, callSeats, callOptionsBySeat }
}
