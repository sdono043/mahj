import { useCallback, useEffect, useRef, useState } from 'react'
import { CardLoadError, loadCard } from '../engine/cardLoader'
import { decideCourtesy, submitPass, type CharlestonState } from '../engine/charleston'
import { beginPlayAfterCharleston, dealForCharleston, type CharlestonSetup } from '../engine/gameSetup'
import { declareMahjongFromDraw } from '../engine/mahjongDeclaration'
import type { HandPattern } from '../engine/patterns'
import { findValidMahjongDeclarations } from '../engine/scoring'
import { advanceToNextPlayerNaturally, discardTile, drawTile, type GameState, type SeatIndex } from '../engine/table'
import type { Tile } from '../engine/tiles'

export type AppPhase = 'idle' | 'charleston' | 'playing' | 'ended'

const HUMAN_SEAT: SeatIndex = 0
const BOT_ACTION_DELAY_MS = 600

function randomTiles(hand: readonly Tile[], count: number): Tile[] {
  const shuffled = [...hand].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function useMahjongGame() {
  const [patterns, setPatterns] = useState<HandPattern[] | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const [charleston, setCharleston] = useState<CharlestonSetup | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
      const selections = prev.charleston.hands.map((hand, seat) =>
        seat === HUMAN_SEAT ? humanSelection : randomTiles(hand, 3),
      )
      let nextCharleston: CharlestonState = submitPass(prev.charleston, selections)
      // Courtesy round isn't exposed in this UI yet — always decline it so play starts promptly.
      if (nextCharleston.phase === 'courtesy-decision') {
        nextCharleston = decideCourtesy(nextCharleston, [0, 0, 0, 0])
      }
      return { ...prev, charleston: nextCharleston }
    })
    setSelectedIds(new Set())
  }, [selectedIds])

  useEffect(() => {
    if (charleston && charleston.charleston.phase === 'done') {
      setGame(beginPlayAfterCharleston(charleston))
      setCharleston(null)
    }
  }, [charleston])

  const discardSelectedTile = useCallback((tileId: string) => {
    setGame((prev) => {
      if (!prev || prev.phase !== 'discard' || prev.currentSeat !== HUMAN_SEAT) return prev
      const discarded = discardTile(prev, tileId)
      // Call windows aren't wired into this UI yet (arrives with bots in the next milestone) —
      // every discard is treated as uncalled and play advances immediately.
      return advanceToNextPlayerNaturally(discarded)
    })
  }, [])

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

  // Bot auto-discard: a short delay for pacing, then a random tile.
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (botTimer.current) clearTimeout(botTimer.current)
    if (game && game.phase === 'discard' && game.currentSeat !== HUMAN_SEAT) {
      botTimer.current = setTimeout(() => {
        setGame((prev) => {
          if (!prev || prev.phase !== 'discard' || prev.currentSeat === HUMAN_SEAT) return prev
          const hand = prev.hands[prev.currentSeat].concealedTiles
          const [tile] = randomTiles(hand, 1)
          const discarded = discardTile(prev, tile.id)
          return advanceToNextPlayerNaturally(discarded)
        })
      }, BOT_ACTION_DELAY_MS)
    }
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current)
    }
  }, [game])

  const validMahjongOptions = game && patterns ? findValidMahjongDeclarations(patterns, game.hands[HUMAN_SEAT]) : []

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
    loadCardText,
    startGame,
    toggleTileSelection,
    submitHumanCharlestonPass,
    discardSelectedTile,
    declareMahjong,
  }
}
