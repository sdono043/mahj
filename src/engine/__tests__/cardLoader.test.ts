import { describe, expect, it } from 'vitest'
import { CardLoadError, loadCard } from '../cardLoader'
import { PatternValidationError } from '../patterns'
import { PATTERN_EXACT, PATTERN_RUN } from './fixtures'

describe('loadCard', () => {
  it('accepts a bare array of valid patterns', () => {
    const loaded = loadCard([PATTERN_EXACT, PATTERN_RUN])
    expect(loaded.map((p) => p.id)).toEqual([PATTERN_EXACT.id, PATTERN_RUN.id])
  })

  it('accepts an object with a "patterns" key', () => {
    const loaded = loadCard({ patterns: [PATTERN_EXACT] })
    expect(loaded).toHaveLength(1)
  })

  it('accepts a JSON string', () => {
    const loaded = loadCard(JSON.stringify([PATTERN_EXACT]))
    expect(loaded).toHaveLength(1)
  })

  it('throws CardLoadError on malformed JSON text', () => {
    expect(() => loadCard('{ not valid json')).toThrow(CardLoadError)
  })

  it('throws CardLoadError when the top level is not an array or {patterns}', () => {
    expect(() => loadCard({ foo: 'bar' })).toThrow(/must be an array/)
  })

  it('throws CardLoadError on a duplicate pattern id', () => {
    expect(() => loadCard([PATTERN_EXACT, { ...PATTERN_EXACT }])).toThrow(/Duplicate pattern id/)
  })

  it('throws CardLoadError naming a missing required field', () => {
    const { groups: _groups, ...missingGroups } = PATTERN_EXACT
    expect(() => loadCard([missingGroups])).toThrow(/missing required field "groups"/)
  })

  it('propagates a pattern-level validation error via CardLoadError, naming the entry', () => {
    const bad = { ...PATTERN_EXACT, jokerAllowedPositions: [true, true, true, true, false] } // slot 3 is a pair
    expect(() => loadCard([bad])).toThrow(CardLoadError)
    expect(() => loadCard([bad])).toThrow(/Entry 0/)
    expect(() => loadCard([bad])).not.toThrow(PatternValidationError) // wrapped, not raw
  })
})
