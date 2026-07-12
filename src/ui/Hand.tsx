import type { DragEvent } from 'react'
import type { Tile } from '../engine/tiles'
import { TileView } from './TileView'

export interface HandProps {
  tiles: Tile[]
  selectedIds?: ReadonlySet<string>
  onTileClick?: (tile: Tile) => void
  faceDown?: boolean
  /** When provided, tiles become drag-and-drop reorderable (own hand only — never opponents/discards). */
  onReorder?: (draggedId: string, targetId: string) => void
}

export function Hand({ tiles, selectedIds, onTileClick, faceDown = false, onReorder }: HandProps) {
  return (
    <div className="hand-row">
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className={onReorder ? 'hand-slot hand-slot-draggable' : 'hand-slot'}
          draggable={!!onReorder}
          onDragStart={onReorder ? (e: DragEvent) => e.dataTransfer.setData('text/plain', tile.id) : undefined}
          onDragOver={onReorder ? (e: DragEvent) => e.preventDefault() : undefined}
          onDrop={
            onReorder
              ? (e: DragEvent) => {
                  e.preventDefault()
                  const draggedId = e.dataTransfer.getData('text/plain')
                  if (draggedId) onReorder(draggedId, tile.id)
                }
              : undefined
          }
        >
          <TileView
            tile={tile}
            faceDown={faceDown}
            selected={selectedIds?.has(tile.id) ?? false}
            onClick={onTileClick ? () => onTileClick(tile) : undefined}
          />
        </div>
      ))}
    </div>
  )
}
