# mahj

American Mahjong (NMJL) Coach — play against bots, with on-demand AI
coaching. See the technical design in the project conversation history for
full architecture; this README covers local dev.

## Status

Milestone 1 (rules engine) in progress: tile model, hand-pattern data
model, hand-matching engine, joker validation, and mahjong scoring are
implemented and unit-tested under `src/engine/`. Turn engine, Charleston,
UI, bots, and the coaching API are not yet built.

## Card data

This repo never bundles a specific year's NMJL card (it's copyrighted,
purchased content). `src/engine/` is generic pattern-matching code; you
supply your own card as JSON matching the schema in
[`docs/card-schema.md`](docs/card-schema.md), loaded locally via
`loadCard()` in `src/engine/cardLoader.ts`. Don't commit your card JSON to
this repo.

## Dev

```sh
npm install
npm run dev       # local dev server
npm test          # run the engine test suite (vitest)
npm run build     # typecheck + production build
npm run lint      # oxlint
```
