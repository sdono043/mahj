import { describe, expect, it, vi } from 'vitest'
import { buildCoachSummary, coachCacheKey, CoachRequestError, requestCoachAdvice } from '../coachClient'
import { PATTERN_EXACT, PATTERN_SINGLES_AND_PAIRS, dot, dragon, hand, joker, repeat, wind } from '../../engine/__tests__/fixtures'

describe('buildCoachSummary', () => {
  it('takes the top 3 closest patterns, in ascending distance order', () => {
    const h = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 2), // 1 short
      ...repeat(() => dot(1), 2),
      ...repeat(() => wind('N'), 2),
    ])
    const summary = buildCoachSummary('session-1', [PATTERN_EXACT, PATTERN_SINGLES_AND_PAIRS], h)
    expect(summary.sessionId).toBe('session-1')
    expect(summary.topPatterns[0]).toEqual({
      id: PATTERN_EXACT.id,
      displayPattern: PATTERN_EXACT.displayPattern,
      tilesNeeded: 1,
    })
  })

  it('counts jokers in the concealed hand', () => {
    const h = hand([joker(), joker(), ...repeat(() => dot(1), 11)])
    const summary = buildCoachSummary('s', [PATTERN_EXACT], h)
    expect(summary.jokersInHand).toBe(2)
  })

  it('respects the topN cap', () => {
    const h = hand(repeat(() => dot(1), 14))
    const summary = buildCoachSummary('s', [PATTERN_EXACT, PATTERN_SINGLES_AND_PAIRS], h, 1)
    expect(summary.topPatterns.length).toBeLessThanOrEqual(1)
  })
})

describe('coachCacheKey', () => {
  it('is stable for identical summaries', () => {
    const a = buildCoachSummary('s', [PATTERN_EXACT], hand(repeat(() => dot(1), 14)))
    const b = buildCoachSummary('s', [PATTERN_EXACT], hand(repeat(() => dot(1), 14)))
    expect(coachCacheKey(a)).toBe(coachCacheKey(b))
  })

  it('ignores sessionId (cache is keyed on hand state, not session)', () => {
    const h = hand(repeat(() => dot(1), 14))
    const a = buildCoachSummary('session-a', [PATTERN_EXACT], h)
    const b = buildCoachSummary('session-b', [PATTERN_EXACT], h)
    expect(coachCacheKey(a)).toBe(coachCacheKey(b))
  })

  it('differs when tilesNeeded differs', () => {
    const closeHand = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 3),
      ...repeat(() => dot(1), 2),
      wind('N'),
      dot(5),
    ])
    const fartherHand = hand([
      ...repeat(() => dragon('red'), 4),
      ...repeat(() => dragon('green'), 3),
      ...repeat(() => dot(9), 2),
      ...repeat(() => dot(1), 2),
      wind('N'),
      dot(5),
      dot(6),
    ])
    const a = buildCoachSummary('s', [PATTERN_EXACT], closeHand)
    const b = buildCoachSummary('s', [PATTERN_EXACT], fartherHand)
    expect(coachCacheKey(a)).not.toBe(coachCacheKey(b))
  })
})

describe('requestCoachAdvice', () => {
  it('returns the parsed response on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ advice: 'Go for it', cached: false }) }),
    )
    const result = await requestCoachAdvice('https://example.com/api/coach', {
      sessionId: 's',
      topPatterns: [],
      jokersInHand: 0,
    })
    expect(result).toEqual({ advice: 'Go for it', cached: false })
    vi.unstubAllGlobals()
  })

  it('throws CoachRequestError with the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'Rate limit reached' }) }),
    )
    await expect(
      requestCoachAdvice('https://example.com/api/coach', { sessionId: 's', topPatterns: [], jokersInHand: 0 }),
    ).rejects.toThrow(CoachRequestError)
    await expect(
      requestCoachAdvice('https://example.com/api/coach', { sessionId: 's', topPatterns: [], jokersInHand: 0 }),
    ).rejects.toThrow(/Rate limit reached/)
    vi.unstubAllGlobals()
  })

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('bad json') } }),
    )
    await expect(
      requestCoachAdvice('https://example.com/api/coach', { sessionId: 's', topPatterns: [], jokersInHand: 0 }),
    ).rejects.toThrow(/HTTP 502/)
    vi.unstubAllGlobals()
  })
})
