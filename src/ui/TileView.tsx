import type { Tile } from '../engine/tiles'
import { suitAbbrev, suitIcon, tileLabel } from './tileDisplay'
import './TileView.css'

export interface TileViewProps {
  tile: Tile
  selected?: boolean
  faceDown?: boolean
  onClick?: () => void
}

export function TileView({ tile, selected = false, faceDown = false, onClick }: TileViewProps) {
  if (faceDown) {
    return <div className="tile tile-face-down" aria-hidden="true" />
  }

  const classes = ['tile', `tile-suit-${tile.suit}`]
  if (tile.suit === 'dragon' && tile.honor) classes.push(`tile-dragon-${tile.honor}`)
  if (selected) classes.push('tile-selected')
  if (onClick) classes.push('tile-clickable')

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={selected}
    >
      <span className="tile-icon" aria-hidden="true">
        {suitIcon(tile.suit)}
      </span>
      <span className="tile-label">{tileLabel(tile)}</span>
      {tile.suit !== 'joker' && tile.suit !== 'flower' && <span className="tile-suit">{suitAbbrev(tile.suit)}</span>}
    </button>
  )
}
