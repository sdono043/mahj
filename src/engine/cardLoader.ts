import { PatternValidationError, type HandPattern, validateHandPattern } from './patterns'

export class CardLoadError extends Error {}

/**
 * Parses and validates a user-supplied card JSON document into
 * HandPattern[]. Accepts either a raw array of patterns or `{ patterns:
 * [...] }`. Throws CardLoadError (JSON/shape problems) or
 * PatternValidationError (a specific pattern is internally inconsistent)
 * with a message identifying the offending entry.
 *
 * This never ships or reads any bundled card data — the caller is
 * responsible for supplying their own purchased-card JSON (see
 * docs/card-schema.md). Nothing here is specific to any NMJL card year.
 */
export function loadCard(source: string | unknown): HandPattern[] {
  const parsed = typeof source === 'string' ? parseJson(source) : source

  const rawPatterns = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.patterns)
      ? parsed.patterns
      : null

  if (rawPatterns === null) {
    throw new CardLoadError('Card JSON must be an array of patterns, or an object with a "patterns" array')
  }

  const ids = new Set<string>()
  const patterns: HandPattern[] = []
  rawPatterns.forEach((raw, index) => {
    const pattern = coercePattern(raw, index)
    if (ids.has(pattern.id)) {
      throw new CardLoadError(`Duplicate pattern id "${pattern.id}" (entry ${index})`)
    }
    ids.add(pattern.id)
    try {
      validateHandPattern(pattern)
    } catch (err) {
      if (err instanceof PatternValidationError) {
        throw new CardLoadError(`Entry ${index}: ${err.message}`)
      }
      throw err
    }
    patterns.push(pattern)
  })

  return patterns
}

function parseJson(source: string): unknown {
  try {
    return JSON.parse(source)
  } catch (err) {
    throw new CardLoadError(`Card JSON is not valid JSON: ${(err as Error).message}`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function coercePattern(raw: unknown, index: number): HandPattern {
  if (!isRecord(raw)) {
    throw new CardLoadError(`Entry ${index} is not an object`)
  }
  const required = [
    'id',
    'category',
    'displayPattern',
    'groups',
    'pointsConcealed',
    'pointsExposed',
    'allowsExposed',
    'jokerAllowedPositions',
  ] as const
  for (const field of required) {
    if (!(field in raw)) {
      throw new CardLoadError(`Entry ${index}: missing required field "${field}"`)
    }
  }
  // Structural fields are checked field-by-field above; deeper consistency
  // (group shapes, joker/points rules, tile totals) is checked by
  // validateHandPattern once we have something we can cast confidently.
  return raw as unknown as HandPattern
}
