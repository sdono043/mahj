import { describe, expect, it } from 'vitest'
import { PatternValidationError, validateHandPattern } from '../patterns'
import { PATTERN_EXACT, PATTERN_HONORVAR, PATTERN_RUN, PATTERN_SINGLES_AND_PAIRS } from './fixtures'

describe('validateHandPattern', () => {
  it('accepts all fixture patterns', () => {
    for (const pattern of [PATTERN_EXACT, PATTERN_RUN, PATTERN_SINGLES_AND_PAIRS, PATTERN_HONORVAR]) {
      expect(() => validateHandPattern(pattern)).not.toThrow()
    }
  })

  it('rejects jokerAllowedPositions=true on a pair slot', () => {
    const bad = structuredClone(PATTERN_EXACT)
    bad.jokerAllowedPositions[3] = true // slot 3 is the dot-1 pair
    expect(() => validateHandPattern(bad)).toThrow(PatternValidationError)
    expect(() => validateHandPattern(bad)).toThrow(/jokers can never fill/)
  })

  it('rejects jokerAllowedPositions=true on a single slot', () => {
    const bad = structuredClone(PATTERN_RUN)
    bad.jokerAllowedPositions[5] = true // slot 5 is the flower single
    expect(() => validateHandPattern(bad)).toThrow(/jokers can never fill/)
  })

  it('rejects groups that do not sum to 14 tiles', () => {
    const bad = structuredClone(PATTERN_EXACT)
    bad.groups.pop()
    bad.jokerAllowedPositions.pop()
    expect(() => validateHandPattern(bad)).toThrow(/expected 14/)
  })

  it('rejects jokerAllowedPositions length mismatch', () => {
    const bad = structuredClone(PATTERN_EXACT)
    bad.jokerAllowedPositions.pop()
    expect(() => validateHandPattern(bad)).toThrow(/length/)
  })

  it('rejects allowsExposed=false with non-null pointsExposed', () => {
    const bad = structuredClone(PATTERN_RUN)
    bad.pointsExposed = 10
    expect(() => validateHandPattern(bad)).toThrow(/pointsExposed is not null/)
  })

  it('rejects allowsExposed=true with null pointsExposed', () => {
    const bad = structuredClone(PATTERN_EXACT)
    bad.pointsExposed = null
    expect(() => validateHandPattern(bad)).toThrow(/pointsExposed is null/)
  })

  it('rejects a numeric slot with neither value nor numberVar', () => {
    const bad = structuredClone(PATTERN_EXACT)
    delete (bad.groups[2].constraint as { value?: number }).value
    expect(() => validateHandPattern(bad)).toThrow(/requires either "value" or "numberVar"/)
  })

  it('rejects a wind/dragon slot with neither honors nor honorVar', () => {
    const bad = structuredClone(PATTERN_EXACT)
    delete (bad.groups[1].constraint as { honors?: string[] }).honors
    expect(() => validateHandPattern(bad)).toThrow(/requires "honors" or "honorVar"/)
  })

  it('rejects inconsistent candidate lists shared under the same suitVar', () => {
    const bad = structuredClone(PATTERN_RUN)
    // Both slot 0 and slot 1 now share suitVar "A", but with different candidate lists.
    bad.groups[1].constraint.suitVar = 'A'
    bad.groups[1].constraint.suits = ['dot', 'bam']
    expect(() => validateHandPattern(bad)).toThrow(/inconsistent candidate lists/)
  })

  it('rejects a pattern with zero groups', () => {
    const bad = structuredClone(PATTERN_EXACT)
    bad.groups = []
    bad.jokerAllowedPositions = []
    expect(() => validateHandPattern(bad)).toThrow(/at least one group/)
  })
})
