import type { Tile } from '../engine/tiles'

const HONOR_LABELS: Record<string, string> = {
  N: 'N',
  E: 'E',
  S: 'S',
  W: 'W',
  red: 'R',
  green: 'G',
  white: 'Wh',
}

/**
 * Small glyph shown above the number/letter — a second visual cue beyond
 * color, for at-a-glance suit recognition. Deliberately basic Unicode
 * (dingbats/CJK), not emoji — emoji rendering depends on a color-emoji
 * font being installed, which isn't guaranteed on every platform, while
 * these render consistently from any standard system font.
 */
const SUIT_ICON: Record<Tile['suit'], string> = {
  dot: '●',
  bam: '▮▮▮',
  crak: '萬',
  wind: '≈',
  dragon: '◆',
  flower: '❀',
  joker: '★',
}

export function tileLabel(tile: Tile): string {
  if (tile.suit === 'joker') return 'JOKER'
  if (tile.suit === 'flower') return 'FL'
  if (tile.value !== undefined) return String(tile.value)
  if (tile.honor !== undefined) return HONOR_LABELS[tile.honor] ?? tile.honor
  return '?'
}

/** Full suit name, used by the legend. */
export function suitLabel(suit: Tile['suit']): string {
  switch (suit) {
    case 'dot':
      return 'Dots'
    case 'bam':
      return 'Bamboo'
    case 'crak':
      return 'Characters'
    case 'wind':
      return 'Winds'
    case 'dragon':
      return 'Dragons'
    case 'flower':
      return 'Flowers'
    case 'joker':
      return 'Jokers'
  }
}

export function suitIcon(suit: Tile['suit']): string {
  return SUIT_ICON[suit]
}

/** Compact suit tag printed on the tile face itself; suitLabel() has the full name for the legend. */
export function suitAbbrev(suit: Tile['suit']): string {
  switch (suit) {
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
