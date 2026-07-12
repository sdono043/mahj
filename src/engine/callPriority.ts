import { seatDistanceClockwise, type SeatIndex } from './table'

export interface CallCandidates {
  discarderSeat: SeatIndex
  /** Seats that could declare mahjong on this discard. */
  mahjongSeats: SeatIndex[]
  /** Seats that could pung/kong/quint this discard (excluding any mahjong-eligible seats). */
  callSeats: SeatIndex[]
}

export interface CallResolution {
  seat: SeatIndex
  type: 'mahjong' | 'call'
}

/** The seat closest to `discarderSeat` going clockwise, or null if the list is empty. */
export function closestSeatClockwise(discarderSeat: SeatIndex, candidateSeats: readonly SeatIndex[]): SeatIndex | null {
  if (candidateSeats.length === 0) return null
  return candidateSeats.reduce((best, seat) =>
    seatDistanceClockwise(discarderSeat, seat) < seatDistanceClockwise(discarderSeat, best) ? seat : best,
  )
}

/**
 * Resolves which single call wins when multiple seats are eligible on the
 * same discard, per NMJL priority: mahjong beats any pung/kong/quint call,
 * and among several same-tier candidates, whoever sits closest clockwise
 * from the discarder wins (not "first bot to decide"). Returns null if no
 * one is eligible, meaning play advances to the next seat normally.
 */
export function resolveCallPriority(candidates: CallCandidates): CallResolution | null {
  const mahjongWinner = closestSeatClockwise(candidates.discarderSeat, candidates.mahjongSeats)
  if (mahjongWinner !== null) return { seat: mahjongWinner, type: 'mahjong' }

  const callWinner = closestSeatClockwise(candidates.discarderSeat, candidates.callSeats)
  if (callWinner !== null) return { seat: callWinner, type: 'call' }

  return null
}
