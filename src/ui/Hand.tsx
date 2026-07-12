import type { Tile } from '../engine/tiles'
import { TileView } from './TileView'

export interface HandProps {
  tiles: Tile[]
  selectedIds?: ReadonlySet<string>
  onTileClick?: (tile: Tile) => void
  faceDown?: boolean
}

export function Hand({ tiles, selectedIds, onTileClick, faceDown = false }: HandProps) {
  return (
    <div className="hand-row">
      {tiles.map((tile) => (
        <TileView
          key={tile.id}
          tile={tile}
          faceDown={faceDown}
          selected={selectedIds?.has(tile.id) ?? false}
          onClick={onTileClick ? () => onTileClick(tile) : undefined}
        />
      ))}
    </div>
  )
}
