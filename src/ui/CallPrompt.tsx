import type { CallOption } from '../engine/calls'
import type { MahjongResult } from '../engine/scoring'
import type { Tile } from '../engine/tiles'
import type { HumanCallPrompt } from './useMahjongGame'

const CALL_KIND_LABEL: Record<CallOption['kind'], string> = {
  pung: 'Pung',
  kong: 'Kong',
  quint: 'Quint',
}

export interface CallPromptProps {
  prompt: HumanCallPrompt
  discard: Tile | null
  onTakeMahjong: (result: MahjongResult) => void
  onTakeCall: (option: CallOption) => void
  onPass: () => void
}

export function CallPrompt({ prompt, discard, onTakeMahjong, onTakeCall, onPass }: CallPromptProps) {
  return (
    <div className="call-prompt">
      <p>
        {discard ? `That discard (${discard.suit}${discard.value ?? discard.honor ?? ''}) is callable!` : 'A call is available!'}
      </p>
      <div className="call-prompt-actions">
        {prompt.mahjongOptions.map((result) => (
          <button key={result.pattern.id} type="button" onClick={() => onTakeMahjong(result)}>
            Declare Mahjong — {result.pattern.displayPattern} ({result.points} pts)
          </button>
        ))}
        {prompt.callOptions.map((option) => (
          <button key={option.kind} type="button" onClick={() => onTakeCall(option)}>
            Take {CALL_KIND_LABEL[option.kind]}
          </button>
        ))}
        <button type="button" onClick={onPass}>
          Pass
        </button>
      </div>
    </div>
  )
}
