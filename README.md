# Feedwise

Turn the sites you already follow into a visual, swipeable learning feed. Product spec: [BRIEF.md](BRIEF.md). Build plan and gates: [PLAN.md](PLAN.md). Working rules: [CLAUDE.md](CLAUDE.md). Visual style: [DESIGN.md](DESIGN.md). Deviations: [DECISIONS.md](DECISIONS.md). Going live: [DEPLOY.md](DEPLOY.md).

## Status

- **Phase 0 (ingestion spike):** done. See [spike-report.md](spike-report.md).
- **Phase 1 (reading loop):** built and verified locally. It's waiting on deployment (DEPLOY.md) and five days of real use.
- **Phase 2 (learn loop):** built and verified locally. Keep and highlights become recall cards, Review shows them on an FSRS schedule capped at 10 a day, and Library holds everything kept. Its gate needs two weeks of real use.
- **Phase 3 (rich modes and craft):** built and verified locally. It adds Swipe and Watch modes, card gestures (swipe to hide, hold to keep), the damped motion system, the mode morph and the "Make it mine" settings. Its gate is testing with 5 people.
- **Visual style:** restyled to Quiet Editorial ([DESIGN.md](DESIGN.md)). That means few faces, few sizes, one ground, image + caption instead of cards, and index lists. Where it departs from DESIGN.md is in DECISIONS.md. Every pushed branch gets a Vercel preview (see DEPLOY.md → Previews).

## Local development

You need Node 22+, pnpm and Docker.

```bash
pnpm install
pnpm db:start                 # local Supabase in Docker; prints the URL and keys
cp .env.example .env.local    # fill in the local keys, ALLOWED_EMAILS, secrets
pnpm dev                      # http://localhost:3000
```

Sign-in links arrive in the local Mailpit inbox at http://127.0.0.1:54324.

To fetch feeds by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/fetch
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm check` | Lint, format check, typecheck and unit tests. Run it before every commit. |
| `pnpm test` | Unit tests on saved fixtures. They make no network calls. |
| `pnpm db:start` / `pnpm db:reset` | Start the local Supabase, or wipe it and re-apply the migrations. |
| `pnpm db:types` | Regenerate `lib/supabase/database.types.ts` from the local schema. |
| `pnpm spike <url...>` | Discover, fetch and enrich sites. Prints JSON and writes `spike-report.md`. |
| `pnpm audit:a11y [--seed]` | Signs in via Mailpit, runs axe on every screen at 375, 768 and 1280 px, and saves screenshots to `audit-output/`. `--seed` adds real sources first. |
| `pnpm exec tsx scripts/smoke-phase2.ts` | Walks the learn loop in a browser against the local stack. It resets local cards first. |
| `pnpm exec tsx scripts/smoke-phase3.ts` | Checks settings, gestures, Swipe, Watch and motion in a browser against the local stack. |
| `pnpm audit:lighthouse` | Lighthouse mobile on every screen, median of `LH_RUNS` (default 3). Run `audit:a11y` first. |

## Layout

```
app/(app)/       today · explore (board / swipe / watch) · review · library · sources · settings · help
app/reader/[id]  the Reader
app/api/         cron/fetch (scheduled ingest) · img (image proxy)
app/actions/     server actions: keep / skip / undo / progress, sources
components/      cards · today · reader · sources · shell · ui
lib/ingest/      discover · fetch · enrich · parse · html · sanitize · images · http (SSRF-guarded) · run
lib/feed/        selection rules (today's set, time chips, masonry estimates)
lib/srs/         FSRS wrapper, capped queue, prompt builder, card creation
lib/motion/      damping, fast/slow followers, swipe rules, motion-level hook
lib/prefs.ts     "Make it mine" settings, pre-paint script
lib/data/        server-side queries for the screens
supabase/        migrations + local config
tests/           unit tests + fixtures
```
