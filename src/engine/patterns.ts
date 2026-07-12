import type { Honor, Suit } from './tiles'

export type SuitCategory = Suit
export type GroupKind = 'pair' | 'pung' | 'kong' | 'quint' | 'single'

export const GROUP_SIZE: Record<GroupKind, number> = {
  single: 1,
  pair: 2,
  pung: 3,
  kong: 4,
  quint: 5,
}

/**
 * Describes what concrete tiles can satisfy one slot in a hand pattern.
 *
 * NMJL patterns often correlate slots — "any 3 suits" (each group a
 * different suit), "consecutive run" (each group's number is the last
 * group's number + 1), "any 2 dragons" (two groups, different dragons).
 * `suitVar`/`honorVar`/`numberVar` are the correlation keys: slots that
 * share a var name must resolve to the same (or, for numbers, offset)
 * concrete value within one instantiation of the pattern. A slot with no
 * var and a single-item candidate list is just a fixed/exact tile.
 */
export interface TileConstraint {
  /** Candidate concrete suits for this slot. */
  suits: SuitCategory[]
  /** Correlates this slot's suit choice with other slots sharing the var. */
  suitVar?: string
  /** Fixed numeric value (1-9), for numeric suits, when no numberVar is used. */
  value?: number
  /** Ties this slot's value to numberVar's assigned base + numberOffset. */
  numberVar?: string
  numberOffset?: number
  /** Candidate concrete honors, for wind/dragon suits. */
  honors?: Honor[]
  /** Correlates this slot's honor choice with other slots sharing the var. */
  honorVar?: string
}

export interface TileGroupSlot {
  kind: GroupKind
  constraint: TileConstraint
}

export interface HandPattern {
  id: string
  category: string
  displayPattern: string
  groups: TileGroupSlot[]
  pointsConcealed: number
  pointsExposed: number | null
  allowsExposed: boolean
  /** Parallel to `groups` — whether jokers may substitute in that slot. */
  jokerAllowedPositions: boolean[]
  /**
   * When false (default), distinct suitVars/honorVars used within this
   * pattern must resolve to pairwise-distinct concrete suits/honors (the
   * standard "any 3 suits" / "any 2 different dragons" convention). Set
   * true for patterns that legitimately allow the same suit/honor to
   * satisfy more than one variable.
   */
  allowVariableRepeat?: boolean
}

export class PatternValidationError extends Error {}

/**
 * Validates internal consistency of a single HandPattern's data. Throws
 * PatternValidationError with a descriptive message on the first problem
 * found — meant to run at card-load time, not in the hot matching path.
 */
export function validateHandPattern(pattern: HandPattern): void {
  const prefix = `Pattern "${pattern.id}"`

  if (pattern.groups.length === 0) {
    throw new PatternValidationError(`${prefix}: must have at least one group`)
  }
  if (pattern.jokerAllowedPositions.length !== pattern.groups.length) {
    throw new PatternValidationError(
      `${prefix}: jokerAllowedPositions length (${pattern.jokerAllowedPositions.length}) must match groups length (${pattern.groups.length})`,
    )
  }
  if (!pattern.allowsExposed && pattern.pointsExposed !== null) {
    throw new PatternValidationError(
      `${prefix}: allowsExposed is false but pointsExposed is not null`,
    )
  }
  if (pattern.allowsExposed && pattern.pointsExposed === null) {
    throw new PatternValidationError(
      `${prefix}: allowsExposed is true but pointsExposed is null`,
    )
  }

  const totalTiles = pattern.groups.reduce((sum, g) => sum + GROUP_SIZE[g.kind], 0)
  if (totalTiles !== 14) {
    throw new PatternValidationError(
      `${prefix}: groups sum to ${totalTiles} tiles, expected 14`,
    )
  }

  const varCandidates = new Map<string, string[]>()

  pattern.groups.forEach((slot, index) => {
    const { constraint, kind } = slot
    const slotLabel = `${prefix}, group ${index} (${kind})`

    if (constraint.suits.length === 0) {
      throw new PatternValidationError(`${slotLabel}: constraint.suits must be non-empty`)
    }
    if ((kind === 'pair' || kind === 'single') && pattern.jokerAllowedPositions[index]) {
      throw new PatternValidationError(
        `${slotLabel}: jokerAllowedPositions[${index}] is true, but jokers can never fill a "${kind}" slot — set it to false`,
      )
    }

    const isNumeric = constraint.suits.some((s) => s === 'dot' || s === 'bam' || s === 'crak')
    const isHonor = constraint.suits.some((s) => s === 'wind' || s === 'dragon')
    if (isNumeric && constraint.value === undefined && constraint.numberVar === undefined) {
      throw new PatternValidationError(
        `${slotLabel}: numeric suit requires either "value" or "numberVar"`,
      )
    }
    if (isHonor && !constraint.honors?.length && !constraint.honorVar) {
      throw new PatternValidationError(
        `${slotLabel}: wind/dragon suit requires "honors" or "honorVar"`,
      )
    }

    if (constraint.suitVar) {
      checkSharedCandidates(varCandidates, `suit:${constraint.suitVar}`, constraint.suits, slotLabel)
    }
    if (constraint.honorVar) {
      checkSharedCandidates(
        varCandidates,
        `honor:${constraint.honorVar}`,
        constraint.honors ?? [],
        slotLabel,
      )
    }
  })
}

function checkSharedCandidates(
  registry: Map<string, string[]>,
  key: string,
  candidates: string[],
  slotLabel: string,
): void {
  const existing = registry.get(key)
  const sortedCandidates = [...candidates].sort()
  if (!existing) {
    registry.set(key, sortedCandidates)
    return
  }
  const matches =
    existing.length === sortedCandidates.length &&
    existing.every((v, i) => v === sortedCandidates[i])
  if (!matches) {
    throw new PatternValidationError(
      `${slotLabel}: shared variable "${key}" has inconsistent candidate lists across slots`,
    )
  }
}
