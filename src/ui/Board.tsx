import type { CallOption } from '../engine/calls'
import type { MahjongResult } from '../engine/scoring'
import type { GameState, SeatIndex } from '../engine/table'
import { CallPrompt } from './CallPrompt'
import { Hand } from './Hand'
import { Legend } from './Legend'
import type { HumanCallPrompt } from './useMahjongGame'

const SEAT_LABELS = ['You', 'Seat 2', 'Seat 3', 'Seat 4']

export interface BoardProps {
  game: GameState
  humanSeat: SeatIndex
  validMahjongOptions: MahjongResult[]
  humanCallPrompt: HumanCallPrompt | null
  onDiscard: (tileId: string) => void
  onDeclareMahjong: (result: MahjongResult) => void
  onTakeMahjong: (result: MahjongResult) => void
  onTakeCall: (option: CallOption) => void
  onPassCall: () => void
  onNewGame: () => void
}

export function Board({
  game,
  humanSeat,
  validMahjongOptions,
  humanCallPrompt,
  onDiscard,
  onDeclareMahjong,
  onTakeMahjong,
  onTakeCall,
  onPassCall,
  onNewGame,
}: BoardProps) {
  const humanTurn = game.currentSeat === humanSeat && game.phase === 'discard' && !humanCallPrompt

  return (
    <section className="board">
      <Legend />
      <p className="board-status">
        Wall: {game.wall.length} tiles remaining —{' '}
        {game.phase === 'ended'
          ? 'Game over'
          : humanCallPrompt
            ? 'A discard is up for grabs'
            : game.currentSeat === humanSeat
              ? 'Your turn'
              : `${SEAT_LABELS[game.currentSeat]}'s turn`}
      </p>

      {game.outcome && (
        <p className="board-outcome">
          {game.outcome.type === 'mahjong'
            ? `${SEAT_LABELS[game.outcome.seat]} declared Mahjong on "${game.outcome.patternId}" for ${game.outcome.points} points!`
            : 'Wall exhausted — no winner this hand.'}
        </p>
      )}

      {humanCallPrompt && (
        <CallPrompt
          prompt={humanCallPrompt}
          discard={game.pendingDiscard?.tile ?? null}
          onTakeMahjong={onTakeMahjong}
          onTakeCall={onTakeCall}
          onPass={onPassCall}
        />
      )}

      <div className="opponents-row">
        {([1, 2, 3] as const).map((seat) => (
          <div key={seat} className="opponent-seat">
            <h3>{SEAT_LABELS[seat]}</h3>
            <Hand tiles={game.hands[seat].concealedTiles} faceDown />
            {game.hands[seat].exposedGroups.length > 0 && (
              <div className="exposed-groups">
                {game.hands[seat].exposedGroups.map((g, i) => (
                  <Hand key={i} tiles={g.tiles} />
                ))}
              </div>
            )}
            <p className="discard-count">{game.discards.filter((d) => d.seat === seat).length} discarded</p>
          </div>
        ))}
      </div>

      <div className="discard-pile">
        <h3>Discards</h3>
        <Hand tiles={game.discards.map((d) => d.tile)} />
      </div>

      <div className="human-seat">
        <h3>Your hand{humanTurn ? ' — click a tile to discard' : ''}</h3>
        {game.hands[humanSeat].exposedGroups.length > 0 && (
          <div className="exposed-groups">
            {game.hands[humanSeat].exposedGroups.map((g, i) => (
              <Hand key={i} tiles={g.tiles} />
            ))}
          </div>
        )}
        <Hand
          tiles={game.hands[humanSeat].concealedTiles}
          onTileClick={humanTurn ? (tile) => onDiscard(tile.id) : undefined}
        />
      </div>

      {humanTurn && validMahjongOptions.length > 0 && (
        <div className="mahjong-options">
          {validMahjongOptions.map((result) => (
            <button key={result.pattern.id} type="button" onClick={() => onDeclareMahjong(result)}>
              Declare Mahjong — {result.pattern.displayPattern} ({result.points} pts)
            </button>
          ))}
        </div>
      )}

      {game.phase === 'ended' && (
        <button type="button" onClick={onNewGame}>
          New game
        </button>
      )}
    </section>
  )
}
