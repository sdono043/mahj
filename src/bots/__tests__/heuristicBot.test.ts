import { describe, expect, it } from 'vitest'
import {
  PATTERN_EXACT,
  PATTERN_RUN,
  bam,
  crak,
  dot,
  dragon,
  hand as makeHand,
  joker,
  repeat,
  wind,
} from '../../engine/__tests__/fixtures'
import { chooseCharlestonPass, chooseDiscard, decideCall } from '../heuristicBot'

describe('chooseDiscard', () => {
  it('discards the tile irrelevant to the best pattern, keeping everything needed', () => {
    // 1 away from PATTERN_EXACT (missing the 2nd wind-N), plus one clearly irrelevant tile.
    const hand = makeHand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      wind('N'),
      bam(7), // irrelevant filler
    ])
    const discard = chooseDiscard(hand, [PATTERN_EXACT], new Set())
    expect(discard.suit).toBe('bam')
    expect(discard.value).toBe(7)
  })

  it('never discards a joker while a non-joker alternative is at least as good', () => {
    const hand = makeHand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      wind('N'),
      joker(), // irrelevant to this pattern, but still a joker
    ])
    const discard = chooseDiscard(hand, [PATTERN_EXACT], new Set())
    expect(discard.suit).not.toBe('joker')
  })

  it('prefers discarding a kind that already appeared safely in the discard pile, among equally useless tiles', () => {
    const hand = makeHand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      wind('N'),
      bam(7), // irrelevant, kind never discarded before
      crakLike(), // irrelevant, kind already discarded before (see below)
    ])
    const discard = chooseDiscard(hand, [PATTERN_EXACT], new Set(['crak-8']))
    expect(discard.suit).toBe('crak')
    expect(discard.value).toBe(8)

    function crakLike() {
      return { id: 'crak-8-test', suit: 'crak' as const, value: 8 }
    }
  })

  it('falls back to a safe non-joker tile when no card is loaded', () => {
    const hand = makeHand([...repeat(() => dot(1), 13), joker()])
    const discard = chooseDiscard(hand, [], new Set())
    expect(discard.suit).not.toBe('joker')
  })
})

describe('chooseCharlestonPass', () => {
  it('passes the 3 least useful tiles, keeping everything needed for the best pattern', () => {
    const tiles = [
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      dot(1),
      bam(7),
      bam(8),
      bam(9),
    ] // 13 tiles; dot(1) alone is 1 short of its pair, bam 7/8/9 are irrelevant filler
    const passed = chooseCharlestonPass(tiles, [PATTERN_EXACT])
    expect(passed).toHaveLength(3)
    expect(passed.every((t) => t.suit === 'bam')).toBe(true)
  })

  it('avoids passing jokers when non-joker filler is available', () => {
    const tiles = [
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      joker(),
      bam(7),
      bam(8),
    ]
    const passed = chooseCharlestonPass(tiles, [PATTERN_EXACT])
    expect(passed.some((t) => t.suit === 'joker')).toBe(false)
  })
})

describe('decideCall', () => {
  it('takes a call that improves the best distance to completion', () => {
    const hand = makeHand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 2), // 1 short of the pung
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      wind('N'), // 1 short of the pair
    ])
    const option = decideCall(hand, [PATTERN_EXACT], dragon('green'), [{ kind: 'pung', jokersUsed: 0 }])
    expect(option).toEqual({ kind: 'pung', jokersUsed: 0 })
  })

  it('declines a call that would break the only reachable pattern (concealed-only)', () => {
    const hand = makeHand([
      ...repeat(() => bam(3), 2), // 1 short of the bam-3/crak-4/dot-5 run's first pung
      ...repeat(() => crak(4), 3),
      ...repeat(() => dot(5), 3),
      ...repeat(() => bam(9), 5), // filler, irrelevant to PATTERN_RUN
    ])
    const option = decideCall(hand, [PATTERN_RUN], bam(3), [{ kind: 'pung', jokersUsed: 0 }])
    expect(option).toBeNull()
  })

  it('returns null when there are no legal options', () => {
    const hand = makeHand(repeat(() => dot(1), 13))
    expect(decideCall(hand, [PATTERN_EXACT], dot(5), [])).toBeNull()
  })

  it('returns null when no card is loaded', () => {
    const hand = makeHand(repeat(() => dot(1), 13))
    expect(decideCall(hand, [], dot(1), [{ kind: 'pung', jokersUsed: 0 }])).toBeNull()
  })
})
