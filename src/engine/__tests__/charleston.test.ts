import { describe, expect, it } from 'vitest'
import {
  decideCourtesy,
  isCharlestonDone,
  seatAcrossFrom,
  startCharleston,
  submitCourtesyPass,
  submitPass,
} from '../charleston'
import { dot, repeat } from './fixtures'

function makeHands(): [ReturnType<typeof dot>[], ReturnType<typeof dot>[], ReturnType<typeof dot>[], ReturnType<typeof dot>[]] {
  return [repeat(() => dot(1), 13), repeat(() => dot(2), 13), repeat(() => dot(3), 13), repeat(() => dot(4), 13)]
}

describe('seatAcrossFrom', () => {
  it('pairs 0<->2 and 1<->3', () => {
    expect(seatAcrossFrom(0)).toBe(2)
    expect(seatAcrossFrom(2)).toBe(0)
    expect(seatAcrossFrom(1)).toBe(3)
    expect(seatAcrossFrom(3)).toBe(1)
  })
})

describe('submitPass', () => {
  it('moves each seat\'s 3 selected tiles to the right on the first pass', () => {
    const hands = makeHands()
    const state = startCharleston(hands)
    const selected = hands.map((h) => h.slice(0, 3))
    const next = submitPass(state, selected)

    // seat 0's 3 dot-1 tiles should now be in seat 1's hand (seat 0 -> right -> seat 1)
    const seat1Dot1Count = next.hands[1].filter((t) => t.value === 1).length
    expect(seat1Dot1Count).toBe(3)
    expect(next.remainingDirections).toEqual(['across', 'left'])
    expect(next.phase).toBe('passing')
  })

  it('every hand stays at 13 tiles after a pass', () => {
    const hands = makeHands()
    const state = startCharleston(hands)
    const selected = hands.map((h) => h.slice(0, 3))
    const next = submitPass(state, selected)
    for (const hand of next.hands) expect(hand).toHaveLength(13)
  })

  it('advances to courtesy-decision after all 3 mandatory passes', () => {
    let state = startCharleston(makeHands())
    for (let i = 0; i < 3; i++) {
      const selected = state.hands.map((h) => h.slice(0, 3))
      state = submitPass(state, selected)
    }
    expect(state.phase).toBe('courtesy-decision')
    expect(state.remainingDirections).toEqual([])
  })

  it('throws if a seat does not pass exactly 3 tiles', () => {
    const hands = makeHands()
    const state = startCharleston(hands)
    const selected = [hands[0].slice(0, 2), hands[1].slice(0, 3), hands[2].slice(0, 3), hands[3].slice(0, 3)]
    expect(() => submitPass(state, selected)).toThrow(/exactly 3 tiles/)
  })

  it('throws if a seat tries to pass a tile it does not hold', () => {
    const hands = makeHands()
    const state = startCharleston(hands)
    const foreignTile = dot(9)
    const selected = [[foreignTile, hands[0][1], hands[0][2]], hands[1].slice(0, 3), hands[2].slice(0, 3), hands[3].slice(0, 3)]
    expect(() => submitPass(state, selected)).toThrow(/does not hold/)
  })

  it('throws outside the passing phase', () => {
    let state = startCharleston(makeHands())
    for (let i = 0; i < 3; i++) {
      state = submitPass(state, state.hands.map((h) => h.slice(0, 3)))
    }
    expect(() => submitPass(state, state.hands.map((h) => h.slice(0, 3)))).toThrow(/Cannot submit a mandatory pass/)
  })

  it('conserves all 52 tiles (13 x 4) through every mandatory pass, with no duplicate ids', () => {
    let state = startCharleston(makeHands())
    for (let i = 0; i < 3; i++) {
      state = submitPass(state, state.hands.map((h) => h.slice(0, 3)))
      const all = state.hands.flat()
      expect(all).toHaveLength(52)
      expect(new Set(all.map((t) => t.id)).size).toBe(52)
    }
  })
})

describe('decideCourtesy', () => {
  function finishMandatoryPasses() {
    let state = startCharleston(makeHands())
    for (let i = 0; i < 3; i++) {
      state = submitPass(state, state.hands.map((h) => h.slice(0, 3)))
    }
    return state
  }

  it('goes straight to done if every pair proposes 0', () => {
    const state = finishMandatoryPasses()
    const next = decideCourtesy(state, [0, 0, 0, 0])
    expect(next.phase).toBe('done')
  })

  it('goes straight to done if a pair has one side propose 0 (decline)', () => {
    const state = finishMandatoryPasses()
    // seat 0<->2 pair: seat 0 wants 3, seat 2 declines with 0 -> no exchange for that pair.
    // seat 1<->3 pair: seat 1 declines with 0 -> no exchange either. Overall: no exchange anywhere.
    const next = decideCourtesy(state, [3, 0, 0, 2])
    expect(next.phase).toBe('done')
  })

  it('moves to courtesy-passing if any pair mutually agrees', () => {
    const state = finishMandatoryPasses()
    const next = decideCourtesy(state, [2, 0, 2, 0]) // seat 0<->2 both want 2
    expect(next.phase).toBe('courtesy-passing')
    expect(next.courtesyCounts).toEqual([2, 0, 2, 0])
  })

  it('rejects out-of-range or non-integer counts', () => {
    const state = finishMandatoryPasses()
    expect(() => decideCourtesy(state, [4, 0, 0, 0])).toThrow(/between 0 and 3/)
    expect(() => decideCourtesy(state, [1.5, 0, 0, 0])).toThrow(/between 0 and 3/)
  })

  it('throws outside the courtesy-decision phase', () => {
    const state = startCharleston(makeHands())
    expect(() => decideCourtesy(state, [0, 0, 0, 0])).toThrow(/Cannot decide courtesy/)
  })
})

describe('submitCourtesyPass', () => {
  function reachCourtesyPassing() {
    let state = startCharleston(makeHands())
    for (let i = 0; i < 3; i++) {
      state = submitPass(state, state.hands.map((h) => h.slice(0, 3)))
    }
    return decideCourtesy(state, [2, 0, 2, 0]) // only the 0<->2 pair exchanges, 2 tiles each
  }

  it('exchanges the agreed count for participating pairs and 0 for others', () => {
    const state = reachCourtesyPassing()
    const seat0Before = [...state.hands[0]]
    const seat2Before = [...state.hands[2]]
    const selected = [seat0Before.slice(0, 2), [], seat2Before.slice(0, 2), []]

    const next = submitCourtesyPass(state, selected)
    expect(isCharlestonDone(next)).toBe(true)
    // seat 0 gave 2 tiles to seat 2 (across) and received 2 back
    expect(next.hands[0]).toHaveLength(13)
    expect(next.hands[2]).toHaveLength(13)
    expect(next.hands[0].some((t) => t.id === seat2Before[0].id)).toBe(true)
    expect(next.hands[2].some((t) => t.id === seat0Before[0].id)).toBe(true)
  })

  it('throws if a seat passes the wrong count for its agreed exchange', () => {
    const state = reachCourtesyPassing()
    const selected = [state.hands[0].slice(0, 1), [], state.hands[2].slice(0, 2), []] // seat 0 should pass 2, passes 1
    expect(() => submitCourtesyPass(state, selected)).toThrow(/must courtesy-pass exactly 2/)
  })

  it('throws outside the courtesy-passing phase', () => {
    const state = startCharleston(makeHands())
    expect(() => submitCourtesyPass(state, state.hands.map(() => []))).toThrow(/Cannot submit a courtesy pass/)
  })
})
