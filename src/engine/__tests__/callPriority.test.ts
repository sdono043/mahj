import { describe, expect, it } from 'vitest'
import { closestSeatClockwise, resolveCallPriority } from '../callPriority'

describe('closestSeatClockwise', () => {
  it('returns null for an empty candidate list', () => {
    expect(closestSeatClockwise(0, [])).toBeNull()
  })

  it('picks the single candidate', () => {
    expect(closestSeatClockwise(0, [2])).toBe(2)
  })

  it('picks whichever candidate is closest clockwise from the discarder', () => {
    expect(closestSeatClockwise(0, [3, 1])).toBe(1) // distance 3 vs 1
    expect(closestSeatClockwise(1, [3, 0])).toBe(3) // distance 2 vs 3
    expect(closestSeatClockwise(2, [0, 1])).toBe(0) // distance 2 vs 3
  })
})

describe('resolveCallPriority', () => {
  it('returns null when no one is eligible', () => {
    expect(resolveCallPriority({ discarderSeat: 0, mahjongSeats: [], callSeats: [] })).toBeNull()
  })

  it('mahjong beats a pung/kong/quint call regardless of seating', () => {
    // seat 3 could mahjong; seat 1 (much closer) could only pung — mahjong still wins.
    const result = resolveCallPriority({ discarderSeat: 0, mahjongSeats: [3], callSeats: [1] })
    expect(result).toEqual({ seat: 3, type: 'mahjong' })
  })

  it('among two simultaneous pung/kong calls, closest-clockwise-from-discarder wins', () => {
    const result = resolveCallPriority({ discarderSeat: 0, mahjongSeats: [], callSeats: [3, 2] })
    expect(result).toEqual({ seat: 2, type: 'call' })
  })

  it('among three simultaneous mahjong-eligible seats, closest-clockwise wins', () => {
    const result = resolveCallPriority({ discarderSeat: 1, mahjongSeats: [3, 0, 2], callSeats: [] })
    // distances from seat 1: seat2=1, seat3=2, seat0=3
    expect(result).toEqual({ seat: 2, type: 'mahjong' })
  })

  it('is deterministic regardless of input candidate order', () => {
    const a = resolveCallPriority({ discarderSeat: 0, mahjongSeats: [], callSeats: [3, 2, 1] })
    const b = resolveCallPriority({ discarderSeat: 0, mahjongSeats: [], callSeats: [1, 2, 3] })
    expect(a).toEqual(b)
    expect(a).toEqual({ seat: 1, type: 'call' })
  })
})
