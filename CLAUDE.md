# CLAUDE.md — Feedwise

Visual, swipeable learning feed built from RSS. Product spec: `BRIEF.md`. Build order and acceptance gates: `PLAN.md`.

Visual style: @DESIGN.md (Quiet Editorial). It replaces the earlier style direction: tokens, type, cards, corners, icons, surfaces and motion feel. The UX rules, accessibility constraints and hard constraints below still apply.

## How to work

- Work one phase at a time, in `PLAN.md` order. Tick checkboxes as tasks land.
- At the end of a phase, stop and report against its exit gate before starting the next.
- Record any deviation from the default decisions in `DECISIONS.md` (date · decision · why).
- Small commits with clear messages. Run lint, typecheck and tests before each commit.
- Ask Matt before: adding a paid service, changing the data model shape, or changing a UX rule.

## Stack

Next.js App Router · TypeScript strict · Tailwind + CSS token variables · Supabase (Postgres + RLS + Storage + magic-link auth) · Vercel + Vercel Cron · ts-fsrs · pnpm.

## Project layout

```
app/                 routes: (tabs)/today, explore, review, library; reader/[id]; sources; settings; api/cron/fetch
components/          ui primitives, cards, modes (board, swipe, watch)
lib/ingest/          discover.ts, fetch.ts, enrich.ts, parse.ts (pure, unit-tested)
lib/motion/          damp.ts, followers.ts, useReducedMotion.ts
lib/srs/             fsrs wrapper, queue (respects daily cap)
supabase/migrations/ SQL migrations
tests/fixtures/      saved feeds and pages; no live network in tests
```

## UX rules — check every screen against these

1. One thing at a time: one primary action per screen.
2. Show, then say: image/video first, short labels.
3. The app remembers: resume points, Continue rail, visible progress.
4. Recall beats review: kept items → capped spaced queue.
5. No surprises, no punishment: no streaks that reset, no timers, undo everywhere, no shaming copy.
6. User holds the dials: motion, density, autoplay, sound, reminders.

## Hard constraints

- **No infinite scroll.** Every list or deck ends with a finish card.
- **No autoplay with sound.** Video autoplay is a setting, off in Calm mode.
- **Motion:** all non-essential animation off under `prefers-reduced-motion` and Calm mode. Never hijack page scroll in Reader or Board.
- **Accessibility:** WCAG 2.2 AA; touch targets ≥ 44px; every gesture has a visible button and a keyboard shortcut; consistent help location.
- **Feeds are fetched server-side only** (CORS). Time out at 10s. One failing source never breaks a run.
- **Content:** show summaries + lead media; full article text only in the Reader for personal use; always link to the original.
- **Secrets** stay in env vars; commit `.env.example` only.

## Motion helpers (reference)

```ts
// frame-rate-independent damping; k ≈ 0.07–0.1, dt in ms
export const damp = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(Math.log(1 - k) * (dt / 16.67)));
// fast follower = damp(curr, target, 0.08); slow follower = damp(lag, target, 0.04)
// lean = clamp((target - lag) / 500, -1, 1) — drive skew/rotate from it; stop RAF when |target - curr| < 0.01
```

## Copy voice

Short, warm, literal. "Welcome back — here's a 2-minute warm-up." "You're caught up." "Not quite — here's the trick." Never "You missed X days" or "Incorrect."
