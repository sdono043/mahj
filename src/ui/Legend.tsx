import type { Suit } from '../engine/tiles'
import { suitIcon, suitLabel } from './tileDisplay'
import { TileView } from './TileView'

const LEGEND_TILES: { suit: Suit; sample: Parameters<typeof TileView>[0]['tile'] }[] = [
  { suit: 'dot', sample: { id: 'legend-dot', suit: 'dot', value: 5 } },
  { suit: 'bam', sample: { id: 'legend-bam', suit: 'bam', value: 5 } },
  { suit: 'crak', sample: { id: 'legend-crak', suit: 'crak', value: 5 } },
  { suit: 'wind', sample: { id: 'legend-wind', suit: 'wind', honor: 'N' } },
  { suit: 'dragon', sample: { id: 'legend-dragon', suit: 'dragon', honor: 'red' } },
  { suit: 'flower', sample: { id: 'legend-flower', suit: 'flower' } },
  { suit: 'joker', sample: { id: 'legend-joker', suit: 'joker' } },
]

export function Legend() {
  return (
    <details className="legend">
      <summary>Tile legend</summary>
      <div className="legend-row">
        {LEGEND_TILES.map(({ suit, sample }) => (
          <div key={suit} className="legend-entry">
            <TileView tile={sample} />
            <span>{suitLabel(suit)}</span>
          </div>
        ))}
      </div>
      <p className="legend-note">
        Each suit has its own color and icon ({suitIcon('dot')} dots, {suitIcon('bam')} bamboo, {suitIcon('crak')}{' '}
        characters) — dragons are also colored to match red/green/white.
      </p>
    </details>
  )
}
