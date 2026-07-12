import { describe, expect, it } from 'vitest'
import { distanceToAllPatterns, distanceToPattern } from '../matching'
import {
  PATTERN_EXACT,
  PATTERN_HONORVAR,
  PATTERN_RUN,
  PATTERN_SINGLES_AND_PAIRS,
  bam,
  crak,
  dot,
  dragon,
  flower,
  hand,
  joker,
  repeat,
  wind,
} from './fixtures'

describe('distanceToPattern — PATTERN_EXACT (kong red, pung green, pung dot-9, pair dot-1, pair wind-N)', () => {
  it('is 0 tiles away for a complete, exact hand', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      ...repeat(() => wind('N'), 2),
    ])
    const result = distanceToPattern(PATTERN_EXACT, h)
    expect(result?.tilesAway).toBe(0)
  })

  it('counts a plain missing tile as 1 away', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 2), // one short
      ...repeat(() => dot(1), 2),
      ...repeat(() => wind('N'), 2),
    ])
    expect(distanceToPattern(PATTERN_EXACT, h)?.tilesAway).toBe(1)
  })

  it('a joker can fill a pung slot shortfall', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 2),
      joker(), // substitutes the 3rd green dragon
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      ...repeat(() => wind('N'), 2),
    ])
    expect(distanceToPattern(PATTERN_EXACT, h)?.tilesAway).toBe(0)
  })

  it('a joker cannot fill a pair slot shortfall (hard rule)', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      dot(1), // one short of the pair
      joker(), // can't substitute here
      ...repeat(() => wind('N'), 2),
    ])
    expect(distanceToPattern(PATTERN_EXACT, h)?.tilesAway).toBe(1)
  })

  it('unrelated extra tiles cost distance (no free pass for a 14th irrelevant tile)', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      wind('N'), // only 1 of the pair
      bam(7), // irrelevant filler tile taking the 14th spot
    ])
    expect(distanceToPattern(PATTERN_EXACT, h)?.tilesAway).toBe(1)
  })
})

describe('distanceToPattern — PATTERN_RUN (kind-pooling across pair+pair+single flower)', () => {
  it('is 0 away when 5 flowers cover 2 pairs + 1 single, regardless of which physical tiles', () => {
    const h = hand([
      ...repeat(() => bam(3), 3),
      ...repeat(() => crak(4), 3),
      ...repeat(() => dot(5), 3),
      ...repeat(() => flower(), 5),
    ])
    expect(distanceToPattern(PATTERN_RUN, h)?.tilesAway).toBe(0)
  })

  it('reports the minimum shortfall across pooled flower slots, not per-slot double counting', () => {
    const h = hand([
      ...repeat(() => bam(3), 3),
      ...repeat(() => crak(4), 3),
      ...repeat(() => dot(5), 3),
      ...repeat(() => flower(), 3), // need 5 total, have 3 => 2 away, however it's distributed
    ])
    expect(distanceToPattern(PATTERN_RUN, h)?.tilesAway).toBe(2)
  })

  it('finds the best suit/number instantiation automatically', () => {
    // dot-6/bam-7/crak-8 is a valid run (base 6) in a different suit arrangement than the helper above.
    const h = hand([
      ...repeat(() => dot(6), 3),
      ...repeat(() => bam(7), 3),
      ...repeat(() => crak(8), 3),
      ...repeat(() => flower(), 5),
    ])
    expect(distanceToPattern(PATTERN_RUN, h)?.tilesAway).toBe(0)
  })
})

describe('distanceToPattern — PATTERN_SINGLES_AND_PAIRS (no jokers ever)', () => {
  it('is 0 away for a complete hand', () => {
    const h = hand([
      ...repeat(() => dot(1), 2),
      ...repeat(() => dot(3), 2),
      ...repeat(() => dot(5), 2),
      ...repeat(() => dot(7), 2),
      ...repeat(() => dot(9), 2),
      ...repeat(() => bam(2), 2),
      ...repeat(() => bam(4), 2),
    ])
    expect(distanceToPattern(PATTERN_SINGLES_AND_PAIRS, h)?.tilesAway).toBe(0)
  })

  it('jokers do not help even when present in the hand', () => {
    const h = hand([
      ...repeat(() => dot(1), 2),
      ...repeat(() => dot(3), 2),
      ...repeat(() => dot(5), 2),
      ...repeat(() => dot(7), 2),
      dot(9), // one short
      joker(), // cannot substitute for the missing dot-9
      ...repeat(() => bam(2), 2),
      ...repeat(() => bam(4), 2),
    ])
    expect(distanceToPattern(PATTERN_SINGLES_AND_PAIRS, h)?.tilesAway).toBe(1)
  })
})

describe('distanceToPattern — exposed groups', () => {
  it('treats a matching exposed pung as already satisfied (0 cost)', () => {
    const h = hand(
      [
        ...repeat(() => dot(9), 3),
        ...repeat(() => dot(1), 2),
        ...repeat(() => wind('N'), 2),
        ...repeat(() => dragon('red'), 4),
      ],
      [{ kind: 'pung', tiles: repeat(() => dragon('green'), 3) }],
    )
    expect(distanceToPattern(PATTERN_EXACT, h)?.tilesAway).toBe(0)
  })

  it('returns null when an exposed meld cannot map to any slot in the pattern', () => {
    const h = hand(
      [
        ...repeat(() => dot(9), 3),
        ...repeat(() => dot(1), 2),
        ...repeat(() => wind('N'), 2),
        ...repeat(() => dragon('red'), 4),
      ],
      [{ kind: 'pung', tiles: repeat(() => bam(8), 3) }], // bam-8 pung has no home in PATTERN_EXACT
    )
    expect(distanceToPattern(PATTERN_EXACT, h)).toBeNull()
  })

  it('returns null for any pattern with allowsExposed=false once a group is exposed', () => {
    const h = hand(
      [...repeat(() => bam(3), 6), ...repeat(() => flower(), 5)],
      [{ kind: 'pung', tiles: repeat(() => crak(4), 3) }],
    )
    expect(distanceToPattern(PATTERN_RUN, h)).toBeNull()
  })

  it('an exposed meld including a joker is identified by its real tile', () => {
    const h = hand(
      [
        ...repeat(() => dot(9), 3),
        ...repeat(() => dot(1), 2),
        ...repeat(() => wind('N'), 2),
        ...repeat(() => dragon('red'), 4),
      ],
      [{ kind: 'pung', tiles: [dragon('green'), dragon('green'), joker()] }],
    )
    expect(distanceToPattern(PATTERN_EXACT, h)?.tilesAway).toBe(0)
  })
})

describe('distanceToAllPatterns', () => {
  it('sorts patterns by ascending tiles-away and skips unreachable ones', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 2), // 1 short
      ...repeat(() => dot(1), 2),
      ...repeat(() => wind('N'), 2),
    ])
    const results = distanceToAllPatterns(
      [PATTERN_RUN, PATTERN_EXACT, PATTERN_SINGLES_AND_PAIRS, PATTERN_HONORVAR],
      h,
    )
    expect(results[0].pattern.id).toBe(PATTERN_EXACT.id)
    expect(results[0].tilesAway).toBe(1)
    expect(results.every((r, i) => i === 0 || r.tilesAway >= results[i - 1].tilesAway)).toBe(true)
  })
})
