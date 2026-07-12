import type { Dragon, Suit } from '../engine/tiles'
import { suitIcon, suitLabel } from './tileDisplay'
import { TileView } from './TileView'

const DRAGON_LABELS: Record<Dragon, string> = {
  red: 'Red Dragon',
  green: 'Green Dragon',
  white: "White Dragon (“Soap”)",
}

const NUMERIC_LEGEND: { suit: Suit; sample: Parameters<typeof TileView>[0]['tile'] }[] = [
  { suit: 'dot', sample: { id: 'legend-dot', suit: 'dot', value: 5 } },
  { suit: 'bam', sample: { id: 'legend-bam', suit: 'bam', value: 5 } },
  { suit: 'crak', sample: { id: 'legend-crak', suit: 'crak', value: 5 } },
  { suit: 'wind', sample: { id: 'legend-wind', suit: 'wind', honor: 'N' } },
]

const DRAGON_LEGEND: Dragon[] = ['red', 'green', 'white']

const OTHER_LEGEND: { suit: Suit; sample: Parameters<typeof TileView>[0]['tile'] }[] = [
  { suit: 'flower', sample: { id: 'legend-flower', suit: 'flower' } },
  { suit: 'joker', sample: { id: 'legend-joker', suit: 'joker' } },
]

export function Legend() {
  return (
    <details className="legend">
      <summary>Tile legend</summary>
      <div className="legend-row">
        {NUMERIC_LEGEND.map(({ suit, sample }) => (
          <div key={suit} className="legend-entry">
            <TileView tile={sample} />
            <span>{suitLabel(suit)}</span>
          </div>
        ))}
        {DRAGON_LEGEND.map((honor) => (
          <div key={honor} className="legend-entry">
            <TileView tile={{ id: `legend-dragon-${honor}`, suit: 'dragon', honor }} />
            <span>{DRAGON_LABELS[honor]}</span>
          </div>
        ))}
        {OTHER_LEGEND.map(({ suit, sample }) => (
          <div key={suit} className="legend-entry">
            <TileView tile={sample} />
            <span>{suitLabel(suit)}</span>
          </div>
        ))}
      </div>
      <p className="legend-note">
        Each suit has its own color and icon ({suitIcon('dot')} dots, {suitIcon('bam')} bamboo, {suitIcon('crak')}{' '}
        characters). The White Dragon ("Wh") is traditionally a blank tile, nicknamed "Soap" — some cards also use
        it as a wild "0" that works with any suit.
      </p>
    </details>
  )
}
