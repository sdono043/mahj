import type { Honor } from './tiles'
import { GROUP_SIZE, type HandPattern, type SuitCategory, type TileGroupSlot } from './patterns'

export interface ConcreteSlot {
  /** Matches the `tileKind()` format from tiles.ts, e.g. "dot-5", "wind-N", "flower". */
  requiredKind: string
  count: number
  jokerAllowed: boolean
}

export interface PatternInstantiation {
  slots: ConcreteSlot[]
}

function autoSuitKey(slotIndex: number): string {
  return `__slotSuit${slotIndex}`
}

function autoHonorKey(slotIndex: number): string {
  return `__slotHonor${slotIndex}`
}

interface VarGroup<T> {
  name: string
  candidates: T[]
}

function collectVarGroups<T>(
  groups: TileGroupSlot[],
  getVarName: (slot: TileGroupSlot, index: number) => string | undefined,
  getCandidates: (slot: TileGroupSlot) => T[],
  autoKey: (index: number) => string,
): VarGroup<T>[] {
  const byName = new Map<string, T[]>()
  groups.forEach((slot, index) => {
    const explicit = getVarName(slot, index)
    const candidates = getCandidates(slot)
    if (candidates.length <= 1) return // constant, no enumeration needed
    const name = explicit ?? autoKey(index)
    if (!byName.has(name)) byName.set(name, candidates)
  })
  return [...byName.entries()].map(([name, candidates]) => ({ name, candidates }))
}

/** Cartesian product of variable assignments, optionally requiring pairwise-distinct values. */
function enumerateAssignments<T>(
  varGroups: VarGroup<T>[],
  distinct: boolean,
): Record<string, T>[] {
  if (varGroups.length === 0) return [{}]

  let results: Record<string, T>[] = [{}]
  for (const group of varGroups) {
    const next: Record<string, T>[] = []
    for (const partial of results) {
      for (const candidate of group.candidates) {
        if (distinct && Object.values(partial).includes(candidate)) continue
        next.push({ ...partial, [group.name]: candidate })
      }
    }
    results = next
  }
  return results
}

/** Valid base values for a numberVar such that every slot's (base + offset) stays in 1-9. */
function numberVarRange(pattern: HandPattern, varName: string): number[] {
  let min = 1
  let max = 9
  for (const slot of pattern.groups) {
    if (slot.constraint.numberVar !== varName) continue
    const offset = slot.constraint.numberOffset ?? 0
    min = Math.max(min, 1 - offset)
    max = Math.min(max, 9 - offset)
  }
  const range: number[] = []
  for (let v = min; v <= max; v++) range.push(v)
  return range
}

function resolveSlotKind(
  slot: TileGroupSlot,
  index: number,
  suitAssignment: Record<string, SuitCategory>,
  honorAssignment: Record<string, Honor>,
  numberAssignment: Record<string, number>,
): string {
  const c = slot.constraint
  const suit: SuitCategory =
    c.suits.length === 1 ? c.suits[0] : suitAssignment[c.suitVar ?? autoSuitKey(index)]

  if (suit === 'flower' || suit === 'joker') return suit

  if (suit === 'wind' || suit === 'dragon') {
    const honor: Honor =
      c.honors && c.honors.length === 1
        ? c.honors[0]
        : honorAssignment[c.honorVar ?? autoHonorKey(index)]
    return `${suit}-${honor}`
  }

  const value = c.numberVar !== undefined ? numberAssignment[c.numberVar] + (c.numberOffset ?? 0) : c.value!
  return `${suit}-${value}`
}

/**
 * Enumerates every concrete way this pattern's suit/honor/number variables
 * can be assigned. Each yielded instantiation is a fully concrete list of
 * required tile-kind+count+joker-eligibility slots, ready for distance
 * matching against a hand.
 */
export function enumerateInstantiations(pattern: HandPattern): PatternInstantiation[] {
  const distinct = !pattern.allowVariableRepeat

  const suitVarGroups = collectVarGroups(
    pattern.groups,
    (slot) => slot.constraint.suitVar,
    (slot) => slot.constraint.suits,
    autoSuitKey,
  )
  const honorVarGroups = collectVarGroups(
    pattern.groups,
    (slot) => slot.constraint.honorVar,
    (slot) => slot.constraint.honors ?? [],
    autoHonorKey,
  )

  const numberVarNames = [
    ...new Set(
      pattern.groups
        .map((s) => s.constraint.numberVar)
        .filter((v): v is string => v !== undefined),
    ),
  ]

  const suitAssignments = enumerateAssignments(suitVarGroups, distinct)
  const honorAssignments = enumerateAssignments(honorVarGroups, distinct)
  const numberAssignmentsList = numberVarNames.length === 0
    ? [{}]
    : cartesianNumberAssignments(pattern, numberVarNames)

  const instantiations: PatternInstantiation[] = []
  for (const suitAssignment of suitAssignments) {
    for (const honorAssignment of honorAssignments) {
      for (const numberAssignment of numberAssignmentsList) {
        const slots: ConcreteSlot[] = pattern.groups.map((slot, index) => ({
          requiredKind: resolveSlotKind(slot, index, suitAssignment, honorAssignment, numberAssignment),
          count: GROUP_SIZE[slot.kind],
          jokerAllowed: pattern.jokerAllowedPositions[index],
        }))
        instantiations.push({ slots })
      }
    }
  }
  return instantiations
}

function cartesianNumberAssignments(
  pattern: HandPattern,
  varNames: string[],
): Record<string, number>[] {
  let results: Record<string, number>[] = [{}]
  for (const name of varNames) {
    const range = numberVarRange(pattern, name)
    const next: Record<string, number>[] = []
    for (const partial of results) {
      for (const value of range) {
        next.push({ ...partial, [name]: value })
      }
    }
    results = next
  }
  return results
}
