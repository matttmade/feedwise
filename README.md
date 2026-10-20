# Feedwise

Turn the sites you already follow into a visual, swipeable learning feed. Product spec: [BRIEF.md](BRIEF.md). Build plan and gates: [PLAN.md](PLAN.md). Working rules: [CLAUDE.md](CLAUDE.md). Deviations: [DECISIONS.md](DECISIONS.md).

## Status

Phase 0 is the ingestion spike: discover, then fetch, then enrich. The latest results are in [spike-report.md](spike-report.md).

## Setup

```bash
pnpm install
cp .env.example .env.local   # Supabase keys from Phase 1 onward
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm spike <url...>` | Discover, fetch and enrich the given sites. Prints JSON and writes `spike-report.md`. |
| `pnpm spike --sites spike/sites.json` | The same for Matt's named sites, with expected item types checked. |
| `pnpm test` | Unit tests on saved fixtures. They make no network calls. |
| `pnpm check` | Lint, format check, typecheck and tests. Run it before every commit. |
| `pnpm dev` | Next.js dev server. Only a placeholder page exists until Phase 1. |

Spike options: `--items N` (default 5), `--report path`, `--json path` (default `spike-output/spike.json`, gitignored) and `--full` (include the body HTML in the JSON output).

## Layout

```
lib/ingest/   discover.ts · fetch.ts · enrich.ts · parse.ts (feeds) · html.ts (pages) · http.ts
scripts/      spike.ts
spike/        sites.json (the spike set) · notes.md (reviewer notes merged into the report)
supabase/     migrations/
tests/        *.test.ts · fixtures/ (feeds, pages, oEmbed responses)
```
