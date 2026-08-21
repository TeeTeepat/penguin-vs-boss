# Penguin vs Boss

A multiplication practice game for one classroom. A Student picks their name, chooses a Minecraft-style Mode, and defeats the Boss by answering multiplication Facts: every right answer removes one Heart of Boss HP. Wrong answers are tracked as Weak Facts and served about 3x as often until answered right 3 times in a row. See CONTEXT.md for the full ubiquitous language and docs/adr/ for decisions.

## Stack

Next.js 15 (app router, plain JavaScript) with REST API routes. Storage per ADR-0001 is Supabase Postgres; without Supabase keys the API falls back to a local JSON file at `.data/students.json` (dev only - serverless deploys lose file writes, so production requires Supabase).

## Run locally

```
npm install
npm run dev
```

Open http://localhost:3000. Use the Teacher button to add student names and set each student's active table range.

## Tests

```
npm test        # pure game rules + file store, node:test
```

## Deploy (Vercel + Supabase)

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Set env vars on Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never exposed to the client).
3. `vercel --prod`.

## Layout

- `app/page.js` - all four screens (pick, teacher, mode, battle)
- `components/BattleStage.js` - pixel penguin-vs-boss rig, GSAP animations
- `lib/logic.js` - pure game rules (modes, hearts, weak facts, fact picking)
- `lib/store.js` - Supabase or JSON-file data access, used only by API routes
- `app/api/students*` - REST API
- `prototype/` - the original static single-file version, kept as reference
- `mascots/` - standalone animation rig playground
