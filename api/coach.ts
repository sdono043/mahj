import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Vercel serverless function: /api/coach
 *
 * Holds ANTHROPIC_API_KEY server-side (set it in the Vercel project's
 * environment variables — never commit it). Takes a small pre-computed
 * summary from the frontend's own hand-matching engine (never the full
 * card or raw hand) and asks Claude to turn it into plain-English advice.
 *
 * Rate limiting and the response cache below are process-local (an
 * in-memory Map). That's a deliberate, documented v1 simplification: on
 * Vercel's free tier a function can run as multiple concurrent instances
 * and cold-starts wipe this state, so it's a best-effort speed bump and
 * cost-reducer, not a hard guarantee. If usage ever justifies it, swap
 * these Maps for a shared store (Vercel KV / Upstash Redis) — the call
 * sites here wouldn't need to change shape, just their backing store.
 */

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const MAX_CALLS_PER_SESSION = 10
const MAX_ADVICE_TOKENS = 200

interface TopPatternSummary {
  id: string
  displayPattern?: string
  tilesNeeded: number
  using?: string[]
}

interface CoachRequestBody {
  sessionId: string
  topPatterns: TopPatternSummary[]
  jokersInHand: number
}

interface CoachResponseBody {
  advice: string
  cached: boolean
}

interface VercelLikeRequest extends IncomingMessage {
  method?: string
  body?: unknown
}

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse
  json(body: unknown): void
}

const callsThisSession = new Map<string, number>()
const adviceCache = new Map<string, string>()

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' })
    return
  }

  const body = parseBody(req.body)
  if (!body) {
    res.status(400).json({ error: 'Expected { sessionId, topPatterns, jokersInHand }' })
    return
  }

  const cacheKey = `${body.sessionId}:${JSON.stringify(body.topPatterns)}:${body.jokersInHand}`
  const cached = adviceCache.get(cacheKey)
  if (cached) {
    const response: CoachResponseBody = { advice: cached, cached: true }
    res.status(200).json(response)
    return
  }

  const used = callsThisSession.get(body.sessionId) ?? 0
  if (used >= MAX_CALLS_PER_SESSION) {
    res.status(429).json({ error: `Rate limit reached (${MAX_CALLS_PER_SESSION} coach calls per game)` })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' })
    return
  }

  try {
    const advice = await callClaude(apiKey, body)
    callsThisSession.set(body.sessionId, used + 1)
    adviceCache.set(cacheKey, advice)
    const response: CoachResponseBody = { advice, cached: false }
    res.status(200).json(response)
  } catch (err) {
    res.status(502).json({ error: `Coach request failed: ${(err as Error).message}` })
  }
}

function parseBody(raw: unknown): CoachRequestBody | null {
  const value = typeof raw === 'string' ? safeJsonParse(raw) : raw
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as CoachRequestBody).sessionId !== 'string' ||
    !Array.isArray((value as CoachRequestBody).topPatterns) ||
    typeof (value as CoachRequestBody).jokersInHand !== 'number'
  ) {
    return null
  }
  return value as CoachRequestBody
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function buildPrompt(body: CoachRequestBody): string {
  const patternLines = body.topPatterns
    .map((p, i) => {
      const name = p.displayPattern ?? p.id
      const using = p.using?.length ? `, already using ${p.using.join(', ')}` : ''
      return `${i + 1}. "${name}" — ${p.tilesNeeded} tile(s) away${using}`
    })
    .join('\n')

  return [
    'You are a friendly American Mahjong (NMJL) coach helping a beginner mid-game.',
    "Here are the player's closest hand patterns, computed by the game engine:",
    patternLines,
    `They currently hold ${body.jokersInHand} joker(s).`,
    'In 2-3 short sentences, give plain-English advice on which pattern to pursue and why. No markdown, no bullet points.',
  ].join('\n')
}

async function callClaude(apiKey: string, body: CoachRequestBody): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_ADVICE_TOKENS,
      messages: [{ role: 'user', content: buildPrompt(body) }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API returned ${response.status}: ${await response.text()}`)
  }

  const data = (await response.json()) as { content: { type: string; text?: string }[] }
  const textBlock = data.content.find((block) => block.type === 'text')
  if (!textBlock?.text) {
    throw new Error('Anthropic API response had no text content')
  }
  return textBlock.text
}
