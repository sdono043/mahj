import type { CharlestonSetup } from '../engine/gameSetup'
import { Hand } from './Hand'
import { Legend } from './Legend'

const DIRECTION_LABEL: Record<string, string> = {
  right: 'Pass 3 tiles to your right',
  across: 'Pass 3 tiles across the table',
  left: 'Pass 3 tiles to your left',
}

export interface CharlestonScreenProps {
  setup: CharlestonSetup
  selectedIds: ReadonlySet<string>
  onToggleTile: (tileId: string) => void
  onSubmitPass: () => void
}

export function CharlestonScreen({ setup, selectedIds, onToggleTile, onSubmitPass }: CharlestonScreenProps) {
  const direction = setup.charleston.remainingDirections[0]
  const humanHand = setup.charleston.hands[0]

  return (
    <section className="charleston-screen">
      <h2>Charleston</h2>
      <Legend />
      <p>{direction ? DIRECTION_LABEL[direction] : 'Finishing up…'}</p>
      <p className="charleston-hint">Select exactly 3 tiles ({selectedIds.size}/3 selected)</p>
      <Hand tiles={humanHand} selectedIds={selectedIds} onTileClick={(tile) => onToggleTile(tile.id)} />
      <button type="button" onClick={onSubmitPass} disabled={selectedIds.size !== 3}>
        Pass tiles
      </button>
    </section>
  )
}
