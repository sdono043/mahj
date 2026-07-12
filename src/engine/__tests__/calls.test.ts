import { describe, expect, it } from 'vitest'
import { applyCall, getLegalCalls } from '../calls'
import { discardTile, newGame } from '../table'
import { bam, dot, joker, repeat, withConcealedTiles } from './fixtures'

describe('getLegalCalls', () => {
  it('offers pung when 2 real matching tiles are held', () => {
    const options = getLegalCalls([...repeat(() => bam(5), 2), dot(1)], bam(5))
    expect(options).toEqual([{ kind: 'pung', jokersUsed: 0 }])
  })

  it('offers pung and kong when 3 real matching tiles are held', () => {
    const options = getLegalCalls([...repeat(() => bam(5), 3), dot(1)], bam(5))
    expect(options.map((o) => o.kind)).toEqual(['pung', 'kong'])
    expect(options.every((o) => o.jokersUsed === 0)).toBe(true)
  })

  it('offers nothing with only 1 matching tile and no jokers', () => {
    expect(getLegalCalls([bam(5), dot(1)], bam(5))).toEqual([])
  })

  it('lets a joker cover the missing tile for a pung', () => {
    const options = getLegalCalls([bam(5), joker()], bam(5))
    expect(options).toEqual([{ kind: 'pung', jokersUsed: 1 }])
  })

  it('prefers real tiles over jokers when both are available', () => {
    const options = getLegalCalls([...repeat(() => bam(5), 2), joker()], bam(5))
    const pung = options.find((o) => o.kind === 'pung')
    expect(pung).toEqual({ kind: 'pung', jokersUsed: 0 })
  })

  it('offers a quint when enough real tiles + jokers are available', () => {
    const options = getLegalCalls([...repeat(() => bam(5), 3), joker()], bam(5))
    expect(options.map((o) => o.kind)).toEqual(['pung', 'kong', 'quint'])
    const quint = options.find((o) => o.kind === 'quint')
    expect(quint?.jokersUsed).toBe(1)
  })
})

describe('applyCall', () => {
  function setupAwaitingCalls() {
    let state = newGame(0, () => 0.5)
    // Every hand gets any dealt bam-7 scrubbed out so real-wall luck can't make a seat
    // spuriously eligible to call (kind-matching only cares about suit+value, not id).
    for (const seat of [0, 1, 2, 3] as const) {
      const scrubbed = state.hands[seat].concealedTiles.map((t) =>
        t.suit === 'bam' && t.value === 7 ? dot(2) : t,
      )
      state = withConcealedTiles(state, seat, scrubbed)
    }

    // Force seat 1's hand to hold a callable pung and discard a matching tile from seat 0.
    const seat1Tiles = [...state.hands[1].concealedTiles]
    seat1Tiles[0] = bam(7)
    seat1Tiles[1] = bam(7)
    state = withConcealedTiles(state, 1, seat1Tiles)

    const seat0Tiles = [...state.hands[0].concealedTiles]
    seat0Tiles[0] = bam(7)
    state = withConcealedTiles(state, 0, seat0Tiles)

    state = discardTile(state, state.hands[0].concealedTiles[0].id)
    return state
  }

  it('moves the called tiles from concealed to an exposed group and hands control to the caller', () => {
    const state = setupAwaitingCalls()
    const before = state.hands[1].concealedTiles.length
    const next = applyCall(state, 1, { kind: 'pung', jokersUsed: 0 })

    expect(next.hands[1].exposedGroups).toHaveLength(1)
    expect(next.hands[1].exposedGroups[0].kind).toBe('pung')
    expect(next.hands[1].exposedGroups[0].tiles).toHaveLength(3)
    expect(next.hands[1].concealedTiles).toHaveLength(before - 2)
    expect(next.currentSeat).toBe(1)
    expect(next.phase).toBe('discard')
    expect(next.pendingDiscard).toBeNull()
  })

  it('a kong call draws one replacement tile from the tail of the wall', () => {
    let state = setupAwaitingCalls()
    // give seat 1 a third matching tile so kong is available
    state = withConcealedTiles(state, 1, [...state.hands[1].concealedTiles, bam(7)])
    const wallBefore = state.wall.length
    const tailTile = state.wall[state.wall.length - 1]

    const next = applyCall(state, 1, { kind: 'kong', jokersUsed: 0 })

    expect(next.hands[1].exposedGroups[0].kind).toBe('kong')
    expect(next.hands[1].exposedGroups[0].tiles).toHaveLength(4)
    expect(next.wall).toHaveLength(wallBefore - 1)
    expect(next.hands[1].concealedTiles.some((t) => t.id === tailTile.id)).toBe(true)
  })

  it('a pung call does not draw a replacement tile', () => {
    const state = setupAwaitingCalls()
    const wallBefore = state.wall.length
    const next = applyCall(state, 1, { kind: 'pung', jokersUsed: 0 })
    expect(next.wall).toHaveLength(wallBefore)
  })

  it('throws if the discarder tries to call their own discard', () => {
    const state = setupAwaitingCalls()
    expect(() => applyCall(state, 0, { kind: 'pung', jokersUsed: 0 })).toThrow(/cannot call its own discard/)
  })

  it('throws if the hand does not actually have enough matching tiles for the option claimed', () => {
    const state = setupAwaitingCalls()
    expect(() => applyCall(state, 2, { kind: 'pung', jokersUsed: 0 })).toThrow(/Not enough matching tiles/)
  })
})
