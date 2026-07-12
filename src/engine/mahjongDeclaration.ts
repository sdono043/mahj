import type { PlayerHand } from './hand'
import type { HandPattern } from './patterns'
import { validateMahjongDeclaration } from './scoring'
import { cloneHands, type GameState, type SeatIndex } from './table'

/** Self-drawn mahjong: the current seat just drew and can complete a pattern without waiting on anyone. */
export function declareMahjongFromDraw(state: GameState, pattern: HandPattern): GameState {
  if (state.phase !== 'discard') {
    throw new Error(`Cannot declare mahjong from a draw during phase "${state.phase}"`)
  }
  const result = validateMahjongDeclaration(pattern, state.hands[state.currentSeat])
  if (!result) {
    throw new Error(`Hand does not complete pattern "${pattern.id}"`)
  }
  return {
    ...state,
    phase: 'ended',
    outcome: {
      type: 'mahjong',
      seat: state.currentSeat,
      patternId: pattern.id,
      points: result.points,
      concealed: state.hands[state.currentSeat].exposedGroups.length === 0,
    },
  }
}

/** Mahjong called on another seat's discard — the discard tile joins that seat's concealed tiles. */
export function declareMahjongFromDiscard(state: GameState, seat: SeatIndex, pattern: HandPattern): GameState {
  if (state.phase !== 'awaiting-calls' || !state.pendingDiscard) {
    throw new Error(`Cannot declare mahjong on a discard during phase "${state.phase}"`)
  }
  if (seat === state.pendingDiscard.seat) {
    throw new Error('A seat cannot declare mahjong on its own discard')
  }

  const hand = state.hands[seat]
  const hypotheticalHand: PlayerHand = {
    concealedTiles: [...hand.concealedTiles, state.pendingDiscard.tile],
    exposedGroups: hand.exposedGroups,
    charlestonPasses: hand.charlestonPasses,
  }
  const result = validateMahjongDeclaration(pattern, hypotheticalHand)
  if (!result) {
    throw new Error(`Hand does not complete pattern "${pattern.id}" with this discard`)
  }

  const hands = cloneHands(state.hands)
  hands[seat].concealedTiles.push(state.pendingDiscard.tile)

  return {
    ...state,
    hands,
    pendingDiscard: null,
    phase: 'ended',
    outcome: {
      type: 'mahjong',
      seat,
      patternId: pattern.id,
      points: result.points,
      concealed: hands[seat].exposedGroups.length === 0,
    },
  }
}
