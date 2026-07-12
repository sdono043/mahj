import { describe, expect, it } from 'vitest'
import { assertTileConservation } from '../tiles'
import { advanceToNextPlayerNaturally, discardTile, drawTile, newGame, nextSeat, seatDistanceClockwise } from '../table'

describe('nextSeat', () => {
  it('wraps around clockwise', () => {
    expect(nextSeat(0)).toBe(1)
    expect(nextSeat(1)).toBe(2)
    expect(nextSeat(2)).toBe(3)
    expect(nextSeat(3)).toBe(0)
  })
})

describe('seatDistanceClockwise', () => {
  it('computes clockwise distance, wrapping at 4', () => {
    expect(seatDistanceClockwise(0, 1)).toBe(1)
    expect(seatDistanceClockwise(0, 3)).toBe(3)
    expect(seatDistanceClockwise(2, 1)).toBe(3)
    expect(seatDistanceClockwise(3, 0)).toBe(1)
  })
})

describe('newGame', () => {
  it('deals the dealer 14 tiles and starts them in the discard phase', () => {
    const state = newGame(0, () => 0.5)
    expect(state.hands[0].concealedTiles).toHaveLength(14)
    expect(state.hands[1].concealedTiles).toHaveLength(13)
    expect(state.phase).toBe('discard')
    expect(state.currentSeat).toBe(0)
  })

  it('conserves all 152 tiles across hands + wall', () => {
    const state = newGame(0, () => 0.5)
    expect(() =>
      assertTileConservation([...state.hands.map((h) => h.concealedTiles), state.wall]),
    ).not.toThrow()
  })
})

describe('drawTile / discardTile', () => {
  it('draw brings the current seat to 14 tiles and moves to the discard phase', () => {
    let state = newGame(0, () => 0.5)
    state = discardTile(state, state.hands[0].concealedTiles[0].id)
    state = advanceToNextPlayerNaturally(state)
    expect(state.currentSeat).toBe(1)
    expect(state.phase).toBe('draw')

    state = drawTile(state)
    expect(state.hands[1].concealedTiles).toHaveLength(14)
    expect(state.phase).toBe('discard')
  })

  it('discard removes the exact tile and opens the awaiting-calls window', () => {
    let state = newGame(0, () => 0.5)
    const tileId = state.hands[0].concealedTiles[5].id
    state = discardTile(state, tileId)
    expect(state.hands[0].concealedTiles.find((t) => t.id === tileId)).toBeUndefined()
    expect(state.hands[0].concealedTiles).toHaveLength(13)
    expect(state.phase).toBe('awaiting-calls')
    expect(state.pendingDiscard?.tile.id).toBe(tileId)
    expect(state.discards).toHaveLength(1)
  })

  it('throws when discarding a tile not in hand', () => {
    const state = newGame(0, () => 0.5)
    expect(() => discardTile(state, 'not-a-real-id')).toThrow(/not in seat/)
  })

  it('throws when drawing outside the draw phase', () => {
    const state = newGame(0, () => 0.5) // starts in 'discard' phase
    expect(() => drawTile(state)).toThrow(/Cannot draw/)
  })

  it('ends the game with wall-exhausted outcome when the wall runs out', () => {
    let state = newGame(0, () => 0.5)
    state = { ...state, wall: [], phase: 'draw', currentSeat: 1 }
    state = drawTile(state)
    expect(state.phase).toBe('ended')
    expect(state.outcome).toEqual({ type: 'wall-exhausted' })
  })

  it('advanceToNextPlayerNaturally moves to the seat after the discarder', () => {
    let state = newGame(0, () => 0.5)
    state = discardTile(state, state.hands[0].concealedTiles[0].id)
    state = advanceToNextPlayerNaturally(state)
    expect(state.currentSeat).toBe(1)
    expect(state.pendingDiscard).toBeNull()
    expect(state.phase).toBe('draw')
  })

  it('does not mutate the original state object (pure functions)', () => {
    const state = newGame(0, () => 0.5)
    const before = state.hands[0].concealedTiles.length
    discardTile(state, state.hands[0].concealedTiles[0].id)
    expect(state.hands[0].concealedTiles).toHaveLength(before)
    expect(state.phase).toBe('discard')
  })

  it('conserves all 152 tiles through a draw+discard cycle', () => {
    let state = newGame(0, () => 0.5)
    state = discardTile(state, state.hands[0].concealedTiles[0].id)
    state = advanceToNextPlayerNaturally(state)
    state = drawTile(state)
    expect(() =>
      assertTileConservation([
        ...state.hands.map((h) => h.concealedTiles),
        state.wall,
        state.discards.map((d) => d.tile),
      ]),
    ).not.toThrow()
  })
})
