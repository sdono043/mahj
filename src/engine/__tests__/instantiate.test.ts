import { describe, expect, it } from 'vitest'
import { enumerateInstantiations } from '../instantiate'
import { PATTERN_EXACT, PATTERN_HONORVAR, PATTERN_RUN, PATTERN_SINGLES_AND_PAIRS } from './fixtures'

describe('enumerateInstantiations', () => {
  it('produces exactly one instantiation for a fully fixed pattern', () => {
    const instantiations = enumerateInstantiations(PATTERN_EXACT)
    expect(instantiations).toHaveLength(1)
    expect(instantiations[0].slots.map((s) => s.requiredKind)).toEqual([
      'dragon-red',
      'dragon-green',
      'dot-9',
      'dot-1',
      'wind-N',
    ])
  })

  it('produces exactly one instantiation for singles-and-pairs (no vars at all)', () => {
    expect(enumerateInstantiations(PATTERN_SINGLES_AND_PAIRS)).toHaveLength(1)
  })

  it('enumerates 3 distinct suits x 7 valid run bases = 18 instantiations for PATTERN_RUN', () => {
    // distinct suit assignments for A,B,C over {dot,bam,crak}: 3! = 6
    // number bases N such that N, N+1, N+2 all in 1..9: N in 1..7 => 7
    const instantiations = enumerateInstantiations(PATTERN_RUN)
    expect(instantiations).toHaveLength(6 * 7)
  })

  it('every PATTERN_RUN instantiation uses 3 pairwise-distinct suits', () => {
    for (const inst of enumerateInstantiations(PATTERN_RUN)) {
      const suits = inst.slots.slice(0, 3).map((s) => s.requiredKind.split('-')[0])
      expect(new Set(suits).size).toBe(3)
    }
  })

  it('every PATTERN_RUN instantiation has consecutive values', () => {
    for (const inst of enumerateInstantiations(PATTERN_RUN)) {
      const values = inst.slots.slice(0, 3).map((s) => Number(s.requiredKind.split('-')[1]))
      expect(values[1]).toBe(values[0] + 1)
      expect(values[2]).toBe(values[0] + 2)
    }
  })

  it('enumerates 3 x 2 = 6 distinct dragon-pair instantiations for PATTERN_HONORVAR', () => {
    // honorVar X,Y distinct over {red,green,white}: 3 x 2 = 6 ordered pairs
    const instantiations = enumerateInstantiations(PATTERN_HONORVAR)
    expect(instantiations).toHaveLength(6)
  })

  it('every PATTERN_HONORVAR instantiation uses 2 different dragons', () => {
    for (const inst of enumerateInstantiations(PATTERN_HONORVAR)) {
      const dragons = inst.slots.slice(0, 2).map((s) => s.requiredKind)
      expect(dragons[0]).not.toBe(dragons[1])
    }
  })

  it('carries joker eligibility through to concrete slots', () => {
    const [inst] = enumerateInstantiations(PATTERN_EXACT)
    expect(inst.slots.map((s) => s.jokerAllowed)).toEqual([true, true, true, false, false])
  })

  it('carries slot counts through matching GROUP_SIZE', () => {
    const [inst] = enumerateInstantiations(PATTERN_EXACT)
    expect(inst.slots.map((s) => s.count)).toEqual([4, 3, 3, 2, 2])
  })
})
