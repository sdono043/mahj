import { describe, expect, it } from 'vitest'
import { declareMahjongFromDiscard, declareMahjongFromDraw } from '../mahjongDeclaration'
import { discardTile, newGame } from '../table'
import { PATTERN_EXACT, dot, dragon, wind, withConcealedTiles } from './fixtures'

function stackWinningHand() {
  return [
    ...Array.from({ length: 4 }, () => dragon('red')),
    ...Array.from({ length: 3 }, () => dragon('green')),
    ...Array.from({ length: 3 }, () => dot(9)),
    ...Array.from({ length: 2 }, () => dot(1)),
    ...Array.from({ length: 2 }, () => wind('N')),
  ]
}

describe('declareMahjongFromDraw', () => {
  it('ends the game with a mahjong outcome when the current seat completes a pattern', () => {
    let state = newGame(0, () => 0.5)
    state = withConcealedTiles(state, 0, stackWinningHand())
    const next = declareMahjongFromDraw(state, PATTERN_EXACT)
    expect(next.phase).toBe('ended')
    expect(next.outcome).toEqual({ type: 'mahjong', seat: 0, patternId: PATTERN_EXACT.id, points: 25, concealed: true })
  })

  it('throws if the hand does not actually complete the pattern', () => {
    const state = newGame(0, () => 0.5) // random dealt hand, not a match
    expect(() => declareMahjongFromDraw(state, PATTERN_EXACT)).toThrow(/does not complete pattern/)
  })

  it('throws outside the discard phase', () => {
    let state = newGame(0, () => 0.5)
    state = discardTile(state, state.hands[0].concealedTiles[0].id) // now 'awaiting-calls'
    expect(() => declareMahjongFromDraw(state, PATTERN_EXACT)).toThrow(/Cannot declare mahjong from a draw/)
  })
})

describe('declareMahjongFromDiscard', () => {
  it('adds the discard to the caller hand and ends the game with the mahjong outcome', () => {
    let state = newGame(0, () => 0.5)
    // seat 1 is 1 tile away: missing the second wind-N, seat 0 discards it.
    const oneAway = stackWinningHand()
    oneAway.pop() // drop one wind-N
    state = withConcealedTiles(state, 1, oneAway)
    state = withConcealedTiles(state, 0, [wind('N'), ...state.hands[0].concealedTiles.slice(1)])
    state = discardTile(state, state.hands[0].concealedTiles[0].id)

    const next = declareMahjongFromDiscard(state, 1, PATTERN_EXACT)
    expect(next.phase).toBe('ended')
    expect(next.outcome).toMatchObject({ type: 'mahjong', seat: 1, patternId: PATTERN_EXACT.id, points: 25 })
    expect(next.hands[1].concealedTiles).toHaveLength(14)
  })

  it('throws if the discard does not complete the pattern for that seat', () => {
    let state = newGame(0, () => 0.5)
    state = discardTile(state, state.hands[0].concealedTiles[0].id)
    expect(() => declareMahjongFromDiscard(state, 1, PATTERN_EXACT)).toThrow(/does not complete pattern/)
  })

  it('throws if the discarder tries to declare mahjong on their own discard', () => {
    let state = newGame(0, () => 0.5)
    state = discardTile(state, state.hands[0].concealedTiles[0].id)
    expect(() => declareMahjongFromDiscard(state, 0, PATTERN_EXACT)).toThrow(/cannot declare mahjong on its own discard/)
  })

  it('throws outside the awaiting-calls phase', () => {
    const state = newGame(0, () => 0.5)
    expect(() => declareMahjongFromDiscard(state, 1, PATTERN_EXACT)).toThrow(/Cannot declare mahjong on a discard/)
  })
})
