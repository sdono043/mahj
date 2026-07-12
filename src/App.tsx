import { Board } from './ui/Board'
import { CardLoader } from './ui/CardLoader'
import { CharlestonScreen } from './ui/CharlestonScreen'
import { useCoach } from './ui/useCoach'
import { useMahjongGame } from './ui/useMahjongGame'
import './ui/board.css'

function App() {
  const {
    phase,
    hasCard,
    patterns,
    cardError,
    charleston,
    game,
    sessionId,
    humanSeat,
    selectedIds,
    validMahjongOptions,
    closestPatternInfo,
    humanCallPrompt,
    loadCardText,
    startGame,
    toggleTileSelection,
    submitHumanCharlestonPass,
    discardSelectedTile,
    declareMahjong,
    takeMahjongAsHuman,
    takeCallAsHuman,
    passHumanCall,
  } = useMahjongGame()

  const coach = useCoach(sessionId)

  return (
    <main>
      <h1>American Mahjong Coach</h1>

      {phase === 'idle' && (
        <>
          {!hasCard && (
            <>
              <CardLoader error={cardError} onLoad={loadCardText} />
              <p style={{ textAlign: 'center' }}>You can also explore without a card — mahjong declarations are disabled until one is loaded.</p>
            </>
          )}
          {hasCard && <p style={{ textAlign: 'center' }}>Card loaded — ready to play.</p>}
          <p style={{ textAlign: 'center' }}>
            <button type="button" onClick={startGame}>
              {hasCard ? 'Start game' : 'Start without a card'}
            </button>
          </p>
        </>
      )}

      {phase === 'charleston' && charleston && (
        <CharlestonScreen
          setup={charleston}
          selectedIds={selectedIds}
          onToggleTile={toggleTileSelection}
          onSubmitPass={submitHumanCharlestonPass}
        />
      )}

      {(phase === 'playing' || phase === 'ended') && game && (
        <Board
          game={game}
          humanSeat={humanSeat}
          hasCard={hasCard}
          validMahjongOptions={validMahjongOptions}
          closestPatternInfo={closestPatternInfo}
          humanCallPrompt={humanCallPrompt}
          onDiscard={discardSelectedTile}
          onDeclareMahjong={(result) => declareMahjong(result.pattern)}
          onTakeMahjong={takeMahjongAsHuman}
          onTakeCall={takeCallAsHuman}
          onPassCall={passHumanCall}
          onNewGame={startGame}
          coach={{
            isConfigured: coach.isConfigured,
            loading: coach.loading,
            advice: coach.advice,
            error: coach.error,
            onRequestCoach: () => patterns && coach.requestCoach(patterns, game.hands[humanSeat]),
            onDismiss: coach.dismiss,
          }}
        />
      )}
    </main>
  )
}

export default App
