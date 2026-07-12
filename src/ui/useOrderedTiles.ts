import { useEffect, useState } from 'react'
import type { Tile } from '../engine/tiles'

/**
 * Lets a player manually reorder their own hand (drag-and-drop), independent
 * of the underlying engine array order (which reflects draw/discard
 * mechanics, not how a player wants to visually group their tiles).
 * Reconciles automatically when tiles are added (new draw) or removed
 * (discarded/passed) while preserving the player's chosen order for
 * everything else.
 */
export function useOrderedTiles(tiles: readonly Tile[]): [Tile[], (draggedId: string, targetId: string) => void] {
  const [order, setOrder] = useState<string[]>(() => tiles.map((t) => t.id))
  const idsKey = tiles.map((t) => t.id).join(',')

  useEffect(() => {
    setOrder((prevOrder) => {
      const currentIds = new Set(tiles.map((t) => t.id))
      const kept = prevOrder.filter((id) => currentIds.has(id))
      const keptSet = new Set(kept)
      const added = tiles.map((t) => t.id).filter((id) => !keptSet.has(id))
      return [...kept, ...added]
    })
    // Deliberately keyed on tile identity (idsKey), not the tiles array reference,
    // which changes on every render even when its contents haven't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  const tileById = new Map(tiles.map((t) => [t.id, t]))
  const orderedTiles = order.map((id) => tileById.get(id)).filter((t): t is Tile => t !== undefined)

  function moveTile(draggedId: string, targetId: string) {
    setOrder((prev) => {
      const from = prev.indexOf(draggedId)
      const to = prev.indexOf(targetId)
      if (from === -1 || to === -1 || from === to) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, draggedId)
      return next
    })
  }

  return [orderedTiles, moveTile]
}
