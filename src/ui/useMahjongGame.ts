import { useCallback, useEffect, useRef, useState } from 'react'
import { applyCall, type CallOption } from '../engine/calls'
import { decideCourtesy, submitPass, type CharlestonState } from '../engine/charleston'
import { closestSeatClockwise } from '../engine/callPriority'
import { CardLoadError, loadCard } from '../engine/cardLoader'
import { collectCallCandidates, type CollectedCallCandidates } from '../engine/collectCallCandidates'
import { beginPlayAfterCharleston, dealForCharleston, type CharlestonSetup } from '../engine/gameSetup'
import { distanceToAllPatterns } from '../engine/matching'
import { declareMahjongFromDiscard, declareMahjongFromDraw } from '../engine/mahjongDeclaration'
import type { HandPattern } from '../engine/patterns'
import { findValidMahjongDeclarations, type MahjongResult } from '../engine/scoring'
import { advanceToNextPlayerNaturally, discardTile, drawTile, SEATS, type GameState, type SeatIndex } from '../engine/table'
import { tileKind, type Tile } from '../engine/tiles'
import { chooseCharlestonPass, chooseDiscard, decideCall } from '../bots/heuristicBot'

export type AppPhase = 'idle' | 'charleston' | 'playing' | 'ended'

const HUMAN_SEAT: SeatIndex = 0
const BOT_ACTION_DELAY_MS = 600

export interface HumanCallPrompt {
  mahjongOptions: MahjongResult[]
  callOptions: CallOption[]
}

function discardedKindSet(game: GameState): Set<string> {
  return new Set(game.discards.map((d) => tileKind(d.tile)))
}

export function useMahjongGame() {
  const [patterns, setPatterns] = useState<HandPattern[] | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const [charleston, setCharleston] = useState<CharlestonSetup | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [humanCallPrompt, setHumanCallPrompt] = useState<HumanCallPrompt | null>(null)

  const phase: AppPhase = game ? (game.phase === 'ended' ? 'ended' : 'playing') : charleston ? 'charleston' : 'idle'
  const hasCard = patterns !== null

  const loadCardText = useCallback((text: string) => {
    try {
      const loaded = loadCard(text)
      setPatterns(loaded)
      setCardError(null)
    } catch (err) {
      setCardError(err instanceof CardLoadError ? err.message : `Unexpected error: ${(err as Error).message}`)
    }
  }, [])

  const startGame = useCallback(() => {
    setCharleston(dealForCharleston(0, Math.random))
    setGame(null)
    setSelectedIds(new Set())
    setHumanCallPrompt(null)
  }, [])

  const toggleTileSelection = useCallback((tileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(tileId)) {
        next.delete(tileId)
      } else if (next.size < 3) {
        next.add(tileId)
      }
      return next
    })
  }, [])

  const submitHumanCharlestonPass = useCallback(() => {
    setCharleston((prev) => {
      if (!prev || selectedIds.size !== 3) return prev
      const humanHand = prev.charleston.hands[HUMAN_SEAT]
      const humanSelection = humanHand.filter((t) => selectedIds.has(t.id))
      const currentPatterns = patterns ?? []
      const selections = prev.charleston.hands.map((tiles, seat) =>
        seat === HUMAN_SEAT ? humanSelection : chooseCharlestonPass(tiles, currentPatterns),
      )
      let nextCharleston: CharlestonState = submitPass(prev.charleston, selections)
      // Courtesy round isn't exposed in this UI yet — always decline it so play starts promptly.
      if (nextCharleston.phase === 'courtesy-decision') {
        nextCharleston = decideCourtesy(nextCharleston, [0, 0, 0, 0])
      }
      return { ...prev, charleston: nextCharleston }
    })
    setSelectedIds(new Set())
  }, [selectedIds, patterns])

  useEffect(() => {
    if (charleston && charleston.charleston.phase === 'done') {
      setGame(beginPlayAfterCharleston(charleston))
      setCharleston(null)
    }
  }, [charleston])

  /**
   * Resolves the aftermath of any discard (human or bot): the human is
   * always offered first refusal on anything they're eligible for
   * (simpler and friendlier than strictly seating-priority-arbitrating
   * humans against bots); otherwise bots that actually *want* the call
   * (via the heuristic, not just mechanical eligibility) are resolved by
   * seating priority, and if nobody wants it, play just advances.
   */
  const resolveAfterDiscard = useCallback(
    (discarded: GameState) => {
      const currentPatterns = patterns ?? []
      const candidates: CollectedCallCandidates = collectCallCandidates(discarded, currentPatterns)

      const humanEligible = candidates.mahjongSeats.includes(HUMAN_SEAT) || candidates.callSeats.includes(HUMAN_SEAT)
      if (humanEligible) {
        const humanHand = { ...discarded.hands[HUMAN_SEAT], concealedTiles: [...discarded.hands[HUMAN_SEAT].concealedTiles, discarded.pendingDiscard!.tile] }
        const mahjongOptions = candidates.mahjongSeats.includes(HUMAN_SEAT)
          ? findValidMahjongDeclarations(currentPatterns, humanHand)
          : []
        const callOptions = candidates.callSeats.includes(HUMAN_SEAT) ? candidates.callOptionsBySeat[HUMAN_SEAT] ?? [] : []
        setGame(discarded)
        setHumanCallPrompt({ mahjongOptions, callOptions })
        return
      }

      setGame(resolveBotOnlyCandidates(discarded, candidates, currentPatterns))
    },
    [patterns],
  )

  function resolveBotOnlyCandidates(
    discarded: GameState,
    candidates: CollectedCallCandidates,
    currentPatterns: readonly HandPattern[],
  ): GameState {
    // Bots always take mahjong when eligible.
    const mahjongWinner = closestSeatClockwise(candidates.discarderSeat, candidates.mahjongSeats)
    if (mahjongWinner !== null) {
      const bestPattern = findValidMahjongDeclarations(
        currentPatterns,
        { ...discarded.hands[mahjongWinner], concealedTiles: [...discarded.hands[mahjongWinner].concealedTiles, discarded.pendingDiscard!.tile] },
      )[0]?.pattern
      if (bestPattern) return declareMahjongFromDiscard(discarded, mahjongWinner, bestPattern)
    }

    const desiringSeats: SeatIndex[] = []
    const chosenOptions = new Map<SeatIndex, CallOption>()
    for (const seat of candidates.callSeats) {
      const options = candidates.callOptionsBySeat[seat] ?? []
      const chosen = decideCall(discarded.hands[seat], currentPatterns, discarded.pendingDiscard!.tile, options)
      if (chosen) {
        desiringSeats.push(seat)
        chosenOptions.set(seat, chosen)
      }
    }
    const callWinner = closestSeatClockwise(candidates.discarderSeat, desiringSeats)
    if (callWinner !== null) {
      return applyCall(discarded, callWinner, chosenOptions.get(callWinner)!)
    }

    return advanceToNextPlayerNaturally(discarded)
  }

  const discardSelectedTile = useCallback(
    (tileId: string) => {
      if (!game || game.phase !== 'discard' || game.currentSeat !== HUMAN_SEAT) return
      resolveAfterDiscard(discardTile(game, tileId))
    },
    [game, resolveAfterDiscard],
  )

  const takeMahjongAsHuman = useCallback(
    (result: MahjongResult) => {
      if (!game) return
      setGame(declareMahjongFromDiscard(game, HUMAN_SEAT, result.pattern))
      setHumanCallPrompt(null)
    },
    [game],
  )

  const takeCallAsHuman = useCallback(
    (option: CallOption) => {
      if (!game) return
      setGame(applyCall(game, HUMAN_SEAT, option))
      setHumanCallPrompt(null)
    },
    [game],
  )

  const passHumanCall = useCallback(() => {
    if (!game || !patterns) return
    const candidates = collectCallCandidates(game, patterns)
    const withoutHuman: CollectedCallCandidates = {
      ...candidates,
      mahjongSeats: candidates.mahjongSeats.filter((s) => s !== HUMAN_SEAT),
      callSeats: candidates.callSeats.filter((s) => s !== HUMAN_SEAT),
    }
    setGame(resolveBotOnlyCandidates(game, withoutHuman, patterns))
    setHumanCallPrompt(null)
  }, [game, patterns])

  const declareMahjong = useCallback((pattern: HandPattern) => {
    setGame((prev) => {
      if (!prev || prev.phase !== 'discard' || prev.currentSeat !== HUMAN_SEAT) return prev
      return declareMahjongFromDraw(prev, pattern)
    })
  }, [])

  // Auto-draw for whichever seat's turn it is (drawing is not a real decision).
  useEffect(() => {
    if (game && game.phase === 'draw') {
      setGame(drawTile(game))
    }
  }, [game])

  // Bot auto-discard: a short delay for pacing, then the heuristic's chosen tile.
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (botTimer.current) clearTimeout(botTimer.current)
    if (game && game.phase === 'discard' && game.currentSeat !== HUMAN_SEAT && !humanCallPrompt) {
      const seat = game.currentSeat
      const hand = game.hands[seat]
      const tile = chooseDiscard(hand, patterns ?? [], discardedKindSet(game))
      botTimer.current = setTimeout(() => {
        resolveAfterDiscard(discardTile(game, tile.id))
      }, BOT_ACTION_DELAY_MS)
    }
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current)
    }
  }, [game, patterns, humanCallPrompt, resolveAfterDiscard])

  const validMahjongOptions = game && patterns ? findValidMahjongDeclarations(patterns, game.hands[HUMAN_SEAT]) : []
  const closestPattern =
    game && patterns ? distanceToAllPatterns(patterns, game.hands[HUMAN_SEAT])[0] ?? null : null
  const closestPatternInfo = closestPattern
    ? { displayPattern: closestPattern.pattern.displayPattern, tilesAway: closestPattern.tilesAway }
    : null

  return {
    phase,
    hasCard,
    patterns,
    cardError,
    charleston,
    game,
    humanSeat: HUMAN_SEAT,
    selectedIds,
    validMahjongOptions,
    closestPatternInfo,
    humanCallPrompt,
    loadCardText,
    startGame,
    toggleTileSelection,
    submitHumanCharlestonPass,
    discardSelectedTile,
    declareMahjong,
    takeMahjongAsHuman,
    takeCallAsHuman,
    passHumanCall,
  }
}

// SEATS is re-exported for consumers that want to render a full seat list; kept here to avoid
// UI components importing directly from the engine's table module for a single constant.
export { SEATS }
export type { Tile }
