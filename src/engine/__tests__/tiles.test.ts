import { describe, expect, it } from 'vitest'
import {
  TOTAL_TILE_COUNT,
  assertTileConservation,
  buildWall,
  deal,
  describeComposition,
  expectedComposition,
  shuffle,
} from '../tiles'

describe('buildWall', () => {
  it('generates exactly 152 tiles', () => {
    expect(buildWall()).toHaveLength(TOTAL_TILE_COUNT)
  })

  it('matches the standard composition exactly (no suit/value over- or under-represented)', () => {
    expect(describeComposition(buildWall())).toEqual(expectedComposition())
  })

  it('gives every tile a unique id', () => {
    const ids = buildWall().map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('passes the conservation assertion on its own', () => {
    expect(() => assertTileConservation([buildWall()])).not.toThrow()
  })
})

describe('shuffle', () => {
  it('preserves the multiset of tiles (same ids, different order allowed)', () => {
    const wall = buildWall()
    const shuffled = shuffle(wall, () => 0.42)
    expect(shuffled).toHaveLength(wall.length)
    expect(new Set(shuffled.map((t) => t.id))).toEqual(new Set(wall.map((t) => t.id)))
  })

  it('does not mutate the input array', () => {
    const wall = buildWall()
    const before = wall.map((t) => t.id)
    shuffle(wall, () => 0.99)
    expect(wall.map((t) => t.id)).toEqual(before)
  })

  it('is deterministic for a fixed rng', () => {
    const wall = buildWall()
    const a = shuffle(wall, () => 0.5)
    const b = shuffle(wall, () => 0.5)
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id))
  })
})

describe('deal', () => {
  it('gives the dealer 14 tiles and everyone else 13', () => {
    const wall = shuffle(buildWall(), () => 0.13)
    const { hands } = deal(wall, 0)
    expect(hands[0]).toHaveLength(14)
    expect(hands[1]).toHaveLength(13)
    expect(hands[2]).toHaveLength(13)
    expect(hands[3]).toHaveLength(13)
  })

  it('honors an arbitrary dealer seat', () => {
    const wall = shuffle(buildWall(), () => 0.77)
    const { hands } = deal(wall, 2)
    expect(hands[2]).toHaveLength(14)
    expect(hands[0]).toHaveLength(13)
    expect(hands[1]).toHaveLength(13)
    expect(hands[3]).toHaveLength(13)
  })

  it('leaves 152 - 53 = 99 tiles in the live wall', () => {
    const wall = shuffle(buildWall(), () => 0.24)
    const { wall: liveWall } = deal(wall, 0)
    expect(liveWall).toHaveLength(99)
  })

  it('conserves all 152 tiles across hands + wall with no duplicate ids', () => {
    const wall = shuffle(buildWall(), () => 0.61)
    const { hands, wall: liveWall } = deal(wall, 1)
    expect(() => assertTileConservation([...hands, liveWall])).not.toThrow()
  })
})

describe('assertTileConservation', () => {
  it('throws if a tile goes missing', () => {
    const wall = buildWall()
    wall.pop()
    expect(() => assertTileConservation([wall])).toThrow(/expected 152/)
  })

  it('throws if a tile id is duplicated across locations (even with 152 total)', () => {
    const wall = buildWall()
    wall.pop() // drop one so the count still comes out to 152 after duplicating another
    const hand = [wall[0]] // same tile id present in both "wall" and "hand"
    expect(() => assertTileConservation([wall, hand])).toThrow(/duplicate tile id/)
  })
})
