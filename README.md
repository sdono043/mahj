# AM's 40th — Party HQ

A one-page logistics dashboard for AM's 40th birthday party — **Saturday, Sept 12, 6:00 PM, the backyard.**

Live site: https://sdono043.github.io/mahj/

## What's on it

- **Countdown** to the party.
- **Teams** — Flowers & Decor, Grazing Table, Bar, Cake, Setup, and Piñata — each with lead, support, and a checkable task list. One team (Flowers & Decor) has a "copy text" button with the ask message for its lead.
- **Suggested day-of timeline** — a draft run of show from 3:00 PM setup through the end of the night. Times are a starting point, not fixed.
- **Guest list / RSVP tracker** — add guests one at a time or bulk-paste a list (e.g. from a Paperless Post export). Paperless Post doesn't offer a public API for personal accounts, so there's no live sync — this is a manual tracker.

## How it works

Static HTML/CSS/JS, no build step. Task checkboxes and the guest list are saved to `localStorage` **on whatever device/browser you're using** — there's no shared backend, so checking a box on your phone won't show up on your laptop. If you want everyone on the same page from different devices, that'd need a small backend (e.g. a Supabase table) — say the word if you want that added later.

## Local preview

Just open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Deploying

Pushes to `main` publish automatically via GitHub Pages.
