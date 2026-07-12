import type { ExposedGroup, PlayerHand } from './hand'
import { GROUP_SIZE } from './patterns'
import type { GamePhase, GameState, SeatIndex } from './table'
import { cloneHands } from './table'
import { tileKind, type Tile } from './tiles'

export type CallKind = 'pung' | 'kong' | 'quint'

export interface CallOption {
  kind: CallKind
  /** How many of the caller's own jokers this option uses (the rest come from real matching tiles + the discard itself). */
  jokersUsed: number
}

/**
 * What pung/kong/quint calls a hand could make on `discard`, purely by
 * tile-count mechanics (real matches + jokers). Each feasible kind
 * returns one canonical option that prefers real tiles over jokers.
 * Whether calling is *wise* is a bot/coaching decision, not a legality
 * one — deliberately not checked here.
 */
export function getLegalCalls(concealedTiles: readonly Tile[], discard: Tile): CallOption[] {
  const discardKind = tileKind(discard)
  const realAvailable = concealedTiles.filter((t) => t.suit !== 'joker' && tileKind(t) === discardKind).length
  const jokerAvailable = concealedTiles.filter((t) => t.suit === 'joker').length

  const options: CallOption[] = []
  for (const kind of ['pung', 'kong', 'quint'] as const) {
    const needed = GROUP_SIZE[kind] - 1 // the discard itself fills one slot
    if (realAvailable + jokerAvailable < needed) continue
    const realUsed = Math.min(realAvailable, needed)
    options.push({ kind, jokersUsed: needed - realUsed })
  }
  return options
}

/**
 * Applies a winning call: removes the matching tiles from the caller's
 * concealed hand, forms the exposed meld (discard + hand tiles), and
 * hands control to the caller — who must discard next (rule: exposing a
 * meld never grants a normal draw). A kong call additionally draws one
 * replacement tile from the tail of the wall, since it consumes 4 tiles
 * instead of 3.
 */
export function applyCall(state: GameState, seat: SeatIndex, option: CallOption): GameState {
  if (state.phase !== 'awaiting-calls' || !state.pendingDiscard) {
    throw new Error(`Cannot apply a call during phase "${state.phase}"`)
  }
  if (seat === state.pendingDiscard.seat) {
    throw new Error('A seat cannot call its own discard')
  }

  const discardTile = state.pendingDiscard.tile
  const discardKind = tileKind(discardTile)
  const needed = GROUP_SIZE[option.kind] - 1
  const realNeeded = needed - option.jokersUsed

  const hands = cloneHands(state.hands)
  const hand = hands[seat]
  const usedTiles: Tile[] = [discardTile]

  usedTiles.push(...takeTiles(hand, (t) => t.suit !== 'joker' && tileKind(t) === discardKind, realNeeded))
  usedTiles.push(...takeTiles(hand, (t) => t.suit === 'joker', option.jokersUsed))

  const group: ExposedGroup = { kind: option.kind, tiles: usedTiles }
  hand.exposedGroups.push(group)

  let wall = state.wall
  let phase: GamePhase = 'discard'
  let outcome = state.outcome
  if (option.kind === 'kong') {
    if (wall.length === 0) {
      return { ...state, hands, phase: 'ended', outcome: { type: 'wall-exhausted' } }
    }
    const replacement = wall[wall.length - 1]
    wall = wall.slice(0, -1)
    hand.concealedTiles.push(replacement)
  }

  return {
    ...state,
    hands,
    wall,
    currentSeat: seat,
    pendingDiscard: null,
    phase,
    outcome,
  }
}

function takeTiles(hand: PlayerHand, predicate: (t: Tile) => boolean, count: number): Tile[] {
  const taken: Tile[] = []
  for (let i = 0; i < count; i++) {
    const index = hand.concealedTiles.findIndex(predicate)
    if (index === -1) throw new Error('Not enough matching tiles in hand to complete this call')
    taken.push(...hand.concealedTiles.splice(index, 1))
  }
  return taken
}
