import { describe, expect, it } from 'vitest'
import { collectCallCandidates } from '../collectCallCandidates'
import { discardTile, newGame } from '../table'
import { PATTERN_EXACT, bam, dot, dragon, wind, withConcealedTiles } from './fixtures'

describe('collectCallCandidates', () => {
  it('lists a seat as mahjong-eligible, not merely call-eligible, when the discard completes their hand', () => {
    let state = newGame(0, () => 0.5)
    const oneAway = [
      ...Array.from({ length: 4 }, () => dragon('red')),
      ...Array.from({ length: 3 }, () => dragon('green')),
      ...Array.from({ length: 3 }, () => dot(9)),
      ...Array.from({ length: 2 }, () => dot(1)),
      wind('N'),
    ]
    state = withConcealedTiles(state, 1, oneAway)
    state = withConcealedTiles(state, 0, [wind('N'), ...state.hands[0].concealedTiles.slice(1)])
    state = discardTile(state, state.hands[0].concealedTiles[0].id)

    const candidates = collectCallCandidates(state, [PATTERN_EXACT])
    expect(candidates.mahjongSeats).toEqual([1])
    expect(candidates.callSeats).not.toContain(1)
  })

  it('lists call-eligible seats with their legal options', () => {
    let state = newGame(0, () => 0.5)
    for (const seat of [0, 1, 2, 3] as const) {
      const scrubbed = state.hands[seat].concealedTiles.map((t) =>
        t.suit === 'bam' && t.value === 7 ? dot(2) : t,
      )
      state = withConcealedTiles(state, seat, scrubbed)
    }
    const seat1Tiles = [...state.hands[1].concealedTiles]
    seat1Tiles[0] = bam(7)
    seat1Tiles[1] = bam(7)
    state = withConcealedTiles(state, 1, seat1Tiles)

    const seat0Tiles = [...state.hands[0].concealedTiles]
    seat0Tiles[0] = bam(7)
    state = withConcealedTiles(state, 0, seat0Tiles)

    state = discardTile(state, state.hands[0].concealedTiles[0].id)

    const candidates = collectCallCandidates(state, [PATTERN_EXACT])
    expect(candidates.mahjongSeats).toEqual([])
    expect(candidates.callSeats).toEqual([1])
    expect(candidates.callOptionsBySeat[1]).toEqual([{ kind: 'pung', jokersUsed: 0 }])
  })

  it('never includes the discarder seat in either list', () => {
    let state = newGame(0, () => 0.5)
    state = discardTile(state, state.hands[0].concealedTiles[0].id)
    const candidates = collectCallCandidates(state, [PATTERN_EXACT])
    expect(candidates.mahjongSeats).not.toContain(0)
    expect(candidates.callSeats).not.toContain(0)
  })

  it('throws outside the awaiting-calls phase', () => {
    const state = newGame(0, () => 0.5)
    expect(() => collectCallCandidates(state, [PATTERN_EXACT])).toThrow(/Cannot collect call candidates/)
  })
})
