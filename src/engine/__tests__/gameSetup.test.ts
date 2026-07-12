import { describe, expect, it } from 'vitest'
import { decideCourtesy, submitPass } from '../charleston'
import { beginPlayAfterCharleston, dealForCharleston } from '../gameSetup'
import { assertTileConservation } from '../tiles'

describe('dealForCharleston', () => {
  it('deals exactly 13 tiles to every seat, deferring the dealer bonus tile', () => {
    const setup = dealForCharleston(0, () => 0.5)
    for (const hand of setup.charleston.hands) expect(hand).toHaveLength(13)
  })

  it('conserves all 152 tiles across hands + wall', () => {
    const setup = dealForCharleston(0, () => 0.5)
    expect(() => assertTileConservation([...setup.charleston.hands, setup.wall])).not.toThrow()
  })
})

describe('beginPlayAfterCharleston', () => {
  function runFullCharleston(dealerSeat: 0 | 1 | 2 | 3 = 0) {
    let setup = dealForCharleston(dealerSeat, () => 0.5)
    for (let i = 0; i < 3; i++) {
      setup = {
        ...setup,
        charleston: submitPass(setup.charleston, setup.charleston.hands.map((h) => h.slice(0, 3))),
      }
    }
    setup = { ...setup, charleston: decideCourtesy(setup.charleston, [0, 0, 0, 0]) }
    return setup
  }

  it('deals the dealer their 14th tile and starts in the discard phase', () => {
    const setup = runFullCharleston(0)
    const state = beginPlayAfterCharleston(setup)
    expect(state.hands[0].concealedTiles).toHaveLength(14)
    expect(state.hands[1].concealedTiles).toHaveLength(13)
    expect(state.phase).toBe('discard')
    expect(state.currentSeat).toBe(0)
  })

  it('honors an arbitrary dealer seat', () => {
    const setup = runFullCharleston(2)
    const state = beginPlayAfterCharleston(setup)
    expect(state.hands[2].concealedTiles).toHaveLength(14)
    expect(state.currentSeat).toBe(2)
  })

  it('conserves all 152 tiles across hands + wall after dealing the bonus tile', () => {
    const setup = runFullCharleston(0)
    const state = beginPlayAfterCharleston(setup)
    expect(() =>
      assertTileConservation([...state.hands.map((h) => h.concealedTiles), state.wall]),
    ).not.toThrow()
  })

  it('throws if the Charleston has not finished yet', () => {
    const setup = dealForCharleston(0, () => 0.5)
    expect(() => beginPlayAfterCharleston(setup)).toThrow(/still in phase/)
  })
})
