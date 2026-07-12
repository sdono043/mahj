import { describe, expect, it } from 'vitest'
import { findValidMahjongDeclarations, validateMahjongDeclaration } from '../scoring'
import { PATTERN_EXACT, PATTERN_SINGLES_AND_PAIRS, bam, dot, dragon, hand, repeat, wind } from './fixtures'

function completeExactHand() {
  return hand([
    ...repeat(() => dragon('red'), 4),
    ...repeat(() => dragon('green'), 3),
    ...repeat(() => dot(9), 3),
    ...repeat(() => dot(1), 2),
    ...repeat(() => wind('N'), 2),
  ])
}

describe('validateMahjongDeclaration', () => {
  it('accepts a complete concealed hand and awards concealed points', () => {
    const result = validateMahjongDeclaration(PATTERN_EXACT, completeExactHand())
    expect(result).toEqual({ pattern: PATTERN_EXACT, points: 25 })
  })

  it('awards exposed points once any group is exposed', () => {
    const h = hand(
      [...repeat(() => dragon('red'), 4), ...repeat(() => dot(9), 3), ...repeat(() => dot(1), 2), ...repeat(() => wind('N'), 2)],
      [{ kind: 'pung', tiles: repeat(() => dragon('green'), 3) }],
    )
    const result = validateMahjongDeclaration(PATTERN_EXACT, h)
    expect(result).toEqual({ pattern: PATTERN_EXACT, points: 25 })
  })

  it('rejects a hand that is not exactly 14 tiles', () => {
    const h = completeExactHand()
    h.concealedTiles.pop()
    expect(validateMahjongDeclaration(PATTERN_EXACT, h)).toBeNull()
  })

  it('rejects a 14-tile hand that is 1 tile away from the pattern', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      wind('N'), // one short of the pair
      bam(7), // irrelevant filler keeping the hand at 14 tiles
    ])
    expect(validateMahjongDeclaration(PATTERN_EXACT, h)).toBeNull()
  })

  it('rejects declaring against a pattern that does not allow exposed hands, once exposed', () => {
    const concealedOnly = { ...PATTERN_EXACT, allowsExposed: false, pointsExposed: null }
    const h = hand(
      [...repeat(() => dragon('red'), 4), ...repeat(() => dot(9), 3), ...repeat(() => dot(1), 2), ...repeat(() => wind('N'), 2)],
      [{ kind: 'pung', tiles: repeat(() => dragon('green'), 3) }],
    )
    expect(validateMahjongDeclaration(concealedOnly, h)).toBeNull()
  })
})

describe('findValidMahjongDeclarations', () => {
  it('returns only patterns the hand actually completes, sorted by points descending', () => {
    const results = findValidMahjongDeclarations([PATTERN_EXACT, PATTERN_SINGLES_AND_PAIRS], completeExactHand())
    expect(results).toHaveLength(1)
    expect(results[0].pattern.id).toBe(PATTERN_EXACT.id)
  })

  it('returns an empty list when no pattern matches', () => {
    const h = completeExactHand()
    h.concealedTiles[0] = dot(2) // break the red-dragon kong
    expect(findValidMahjongDeclarations([PATTERN_EXACT], h)).toEqual([])
  })
})
