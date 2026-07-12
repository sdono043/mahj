# Card JSON schema

This describes the JSON format the app expects for a loaded NMJL card. **No
card year's actual patterns are bundled in this repo** — copy this schema,
transcribe your own purchased card's patterns into it, and load the file
locally (it should never be committed to a public repo). See the root
README for why.

The engine types live in `src/engine/patterns.ts`; this doc explains how to
fill them in with worked (fictional) examples.

## Top-level shape

Either a bare array, or an object with a `patterns` key:

```json
{ "patterns": [ /* HandPattern objects */ ] }
```

## HandPattern

```ts
interface HandPattern {
  id: string                          // unique, e.g. "2024-CONSECUTIVE-RUN-1"
  category: string                    // e.g. "Consecutive Run"
  displayPattern: string              // human-readable, e.g. "111 222 3333 44"
  groups: TileGroupSlot[]             // must sum to 14 tiles total
  pointsConcealed: number
  pointsExposed: number | null        // null only if allowsExposed is false
  allowsExposed: boolean
  jokerAllowedPositions: boolean[]    // parallel to groups
  allowVariableRepeat?: boolean       // default false — see "Variables" below
}
```

`groups` is a list of `TileGroupSlot`, each `{ kind, constraint }`.
`kind` is one of `"single" | "pair" | "pung" | "kong" | "quint"` (sizes 1,
2, 3, 4, 5). The sizes across all groups in one pattern must add to 14.

`jokerAllowedPositions[i]` says whether jokers may substitute in group `i`.
**Hard rule enforced by the engine, regardless of what you put here:**
jokers can never fill a `"single"` or `"pair"` slot — the loader will
reject a pattern that sets `true` there. For `pung`/`kong`/`quint` slots,
set it per your card (some patterns forbid jokers entirely, e.g. "no
jokers" consecutive-run or singles/pairs hands).

## TileConstraint — what tiles satisfy a group

```ts
interface TileConstraint {
  suits: SuitCategory[]     // candidate suits: "dot" | "bam" | "crak" | "wind" | "dragon" | "flower"
  suitVar?: string          // correlate this group's suit with other groups sharing the name
  value?: number             // fixed 1-9, for numeric suits (when not using numberVar)
  numberVar?: string         // ties this group's value to a shared base + numberOffset
  numberOffset?: number
  honors?: Honor[]           // candidate honors: "N"|"E"|"S"|"W"|"red"|"green"|"white"
  honorVar?: string          // correlate this group's honor with other groups sharing the name
}
```

### Fixed / exact group

A pung of green dragons:

```json
{ "kind": "pung", "constraint": { "suits": ["dragon"], "honors": ["green"] } }
```

A pung of the number 5, in dots specifically:

```json
{ "kind": "pung", "constraint": { "suits": ["dot"], "value": 5 } }
```

### "Any 3 suits" (each group a different suit)

Three pungs of 1, one per suit, suits must all differ — give each group
the same `suitVar` name but let each resolve independently by NOT sharing
a fixed suit:

```json
{
  "groups": [
    { "kind": "pung", "constraint": { "suits": ["dot", "bam", "crak"], "suitVar": "A", "value": 1 } },
    { "kind": "pung", "constraint": { "suits": ["dot", "bam", "crak"], "suitVar": "B", "value": 1 } },
    { "kind": "pung", "constraint": { "suits": ["dot", "bam", "crak"], "suitVar": "C", "value": 1 } }
  ]
}
```

Because `A`, `B`, `C` are different variable names with overlapping
numeric-suit candidates, the engine requires them to resolve to three
*different* concrete suits (the "any 3 suits" convention) — this is the
default (`allowVariableRepeat` unset/false). If your pattern actually wants
the *same* suit in two groups, give those two groups the same `suitVar`.

### Consecutive run (e.g. "123 234 345" shifted as a block)

```json
{
  "groups": [
    { "kind": "pung", "constraint": { "suits": ["bam"], "numberVar": "N", "numberOffset": 0 } },
    { "kind": "pung", "constraint": { "suits": ["bam"], "numberVar": "N", "numberOffset": 1 } },
    { "kind": "pung", "constraint": { "suits": ["bam"], "numberVar": "N", "numberOffset": 2 } }
  ]
}
```

The engine tries every valid base value for `N` (here, 1 through 7, so
`N+2` stays ≤ 9) and keeps whichever gives the closest match.

### "Any 2 different dragons"

```json
{
  "groups": [
    { "kind": "pung", "constraint": { "suits": ["dragon"], "honors": ["red", "green", "white"], "honorVar": "X" } },
    { "kind": "pung", "constraint": { "suits": ["dragon"], "honors": ["red", "green", "white"], "honorVar": "Y" } }
  ]
}
```

Same distinctness rule applies to `honorVar` as to `suitVar`.

## Points

- `pointsConcealed`: value when the hand stays fully concealed.
- `pointsExposed`: value when exposed (calling pungs/kongs is allowed);
  must be `null` only if `allowsExposed` is `false`.

## Validation

`loadCard()` (in `src/engine/cardLoader.ts`) parses and runs
`validateHandPattern()` on every entry, which checks: groups sum to 14
tiles, joker flags respect the pair/single hard rule, shared variables
have consistent candidate lists, and exposed-points consistency. It throws
a `CardLoadError` naming the offending entry and field on any problem.
