import type { Tile } from '../engine/tiles'
import './TileView.css'

const HONOR_LABELS: Record<string, string> = {
  N: 'N',
  E: 'E',
  S: 'S',
  W: 'W',
  red: 'R',
  green: 'G',
  white: 'Wh',
}

function tileLabel(tile: Tile): string {
  if (tile.suit === 'joker') return 'JOKER'
  if (tile.suit === 'flower') return 'FL'
  if (tile.value !== undefined) return String(tile.value)
  if (tile.honor !== undefined) return HONOR_LABELS[tile.honor] ?? tile.honor
  return '?'
}

function suitLabel(tile: Tile): string {
  switch (tile.suit) {
    case 'dot':
      return 'DOT'
    case 'bam':
      return 'BAM'
    case 'crak':
      return 'CRAK'
    case 'wind':
      return 'WIND'
    case 'dragon':
      return 'DRAGON'
    default:
      return ''
  }
}

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
      <span className="tile-label">{tileLabel(tile)}</span>
      {tile.suit !== 'joker' && tile.suit !== 'flower' && <span className="tile-suit">{suitLabel(tile)}</span>}
    </button>
  )
}
