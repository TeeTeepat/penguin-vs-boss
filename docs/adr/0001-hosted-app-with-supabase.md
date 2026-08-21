# 1. Hosted web app with Supabase, not localStorage

Date: 2026-08-09

## Status

Accepted

## Context

The game tracks each Student's Weak Facts so they can be re-served until memorized. Students play on a mix of iPads, phones, and a shared classroom device, and a Student's progress must follow their name across all of them. There are no passwords — a Student just picks their name from a list.

Alternatives considered:

- **localStorage only** — zero backend, but progress is trapped per device/browser, which breaks the multi-device requirement outright.
- **Teacher's machine as a LAN server** — free, but only works when that machine is on and on the same network.
- **Hosted app + small database** — always reachable, progress follows the Student.

## Decision

Deploy as a hosted web app: Next.js on Vercel, with Supabase (Postgres) as the database for Students, Weak Facts, Levels, and Teacher settings (active table range per Student). No authentication beyond name-picking; the classroom is the trust boundary.

## Consequences

- Progress follows a Student across any device with a browser; nothing to install.
- A tiny quiz game carries a real backend — future readers should know this exists solely for cross-device Weak Fact tracking, not scale.
- Name-pick identity means anyone with the URL can play as any Student. Acceptable for a single classroom; revisit if the app is ever opened beyond it.
- Free tiers of Vercel and Supabase comfortably cover classroom load.
