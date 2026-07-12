# mahj

American Mahjong (NMJL) Coach — play against bots, with on-demand AI
coaching. See the technical design in the project conversation history for
full architecture; this README covers local dev.

## Status

Rules engine, turn engine, Charleston, basic UI, and heuristic bots are
built and unit-tested (`src/engine/`, `src/bots/`, `src/ui/`) — see
milestones 1-5. The Vercel `/api/coach` function (milestone 6) exists but
isn't wired into the frontend yet, and nothing is deployed to Vercel.

Play it locally with `npm run dev`, or at the live GitHub Pages URL once
deployed.

## Card data

This repo never bundles a specific year's NMJL card (it's copyrighted,
purchased content). `src/engine/` is generic pattern-matching code; you
supply your own card as JSON matching the schema in
[`docs/card-schema.md`](docs/card-schema.md), loaded in the browser via the
card-upload screen (`src/ui/CardLoader.tsx`) — nothing you load there
leaves your browser tab, and it's never committed to this repo.

## Coach API (`api/coach.ts`)

A Vercel serverless function that holds `ANTHROPIC_API_KEY` server-side
and turns a small pre-computed hand summary into plain-English advice via
Claude. To deploy it:

1. Create a new Vercel project pointing at this repo (Vercel auto-detects
   the Vite frontend *and* the `api/` serverless function in one project).
2. In the Vercel project's environment variables, set `ANTHROPIC_API_KEY`
   (see `.env.example`). Never commit the real key.
3. The frontend calls `https://<your-project>.vercel.app/api/coach`.

Rate limiting (10 calls/game) and response caching in `api/coach.ts` are
in-memory and process-local — a deliberate v1 simplification documented in
that file's comments; fine for personal/low-traffic use, not a hard
guarantee under Vercel's serverless scaling.

## Dev

```sh
npm install
npm run dev       # local dev server
npm test          # run the test suite (vitest)
npm run build     # typecheck + production build
npm run lint      # oxlint
```
