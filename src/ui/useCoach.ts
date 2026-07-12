import { useCallback, useRef, useState } from 'react'
import { buildCoachSummary, coachCacheKey, CoachRequestError, requestCoachAdvice } from '../coach/coachClient'
import type { PlayerHand } from '../engine/hand'
import type { HandPattern } from '../engine/patterns'

const COACH_API_URL = import.meta.env.VITE_COACH_API_URL

export function useCoach(sessionId: string) {
  const [advice, setAdvice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef(new Map<string, string>())

  const isConfigured = Boolean(COACH_API_URL)

  const requestCoach = useCallback(
    async (patterns: HandPattern[], hand: PlayerHand) => {
      if (!COACH_API_URL) {
        setError('Coach API is not configured yet (VITE_COACH_API_URL is unset). See the README.')
        return
      }
      const summary = buildCoachSummary(sessionId, patterns, hand)
      const key = coachCacheKey(summary)
      const cached = cache.current.get(key)
      if (cached) {
        setAdvice(cached)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await requestCoachAdvice(COACH_API_URL, summary)
        cache.current.set(key, response.advice)
        setAdvice(response.advice)
      } catch (err) {
        setError(err instanceof CoachRequestError ? err.message : `Unexpected error: ${(err as Error).message}`)
      } finally {
        setLoading(false)
      }
    },
    [sessionId],
  )

  const dismiss = useCallback(() => {
    setAdvice(null)
    setError(null)
  }, [])

  return { isConfigured, advice, loading, error, requestCoach, dismiss }
}
