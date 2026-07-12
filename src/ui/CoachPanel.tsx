export interface CoachPanelProps {
  isConfigured: boolean
  loading: boolean
  advice: string | null
  error: string | null
  onRequestCoach: () => void
  onDismiss: () => void
}

export function CoachPanel({ isConfigured, loading, advice, error, onRequestCoach, onDismiss }: CoachPanelProps) {
  if (!isConfigured) {
    return (
      <div className="coach-panel coach-panel-unconfigured">
        <button type="button" disabled>
          Coach
        </button>
        <p className="coach-hint">Coach isn't set up yet — deploy the Vercel function and set VITE_COACH_API_URL (see README).</p>
      </div>
    )
  }

  return (
    <div className="coach-panel">
      <button type="button" onClick={onRequestCoach} disabled={loading}>
        {loading ? 'Thinking…' : 'Coach'}
      </button>
      {(advice || error) && (
        <div className="coach-response">
          {error ? <p className="coach-error">{error}</p> : <p>{advice}</p>}
          <button type="button" className="coach-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
