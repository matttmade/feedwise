# Decisions

Deviations from the defaults in `PLAN.md`, and library choices the plan left open. Format: date · decision · why.

- **2026-10-20 · Feed parser: `feedsmith` (3.x), not `rss-parser`.** `rss-parser` hasn't had a release since April 2023. `feedsmith` is actively maintained. It parses RSS, Atom, RDF and JSON Feed with one call, and handles the Media RSS and YouTube namespaces that the lead-image and video logic depend on.
- **2026-10-20 · HTML parsing: `jsdom` + `@mozilla/readability`.** Readability's documented host is jsdom. One DOM library serves discovery, `og:` metadata and Readability. Scripts never run and subresources never load.
- **2026-10-20 · TypeScript stays on 5.9, not the new 7.x.** `typescript-eslint` (used by `eslint-config-next`) supports TypeScript below 6.1. `create-next-app@16.4.2` also pins `^5`. Revisit when typescript-eslint supports 7.
- **2026-10-20 · Tests: Vitest; CLI runner: `tsx`.** Both are current and need no config for TypeScript ESM.
- **2026-10-20 · Network access is injected (`Fetcher`) everywhere in `lib/ingest`.** This lets tests run fully on fixtures with no live network, as `CLAUDE.md` requires.
- **2026-10-20 · Spike "card" rule.** A card has a title, a lead image that actually loads, and a type in the site's expected set. A site passes when its feed has at least 3 items and at least 60% of the 5 newest make a card. The gate said "produce a card". This is deliberately stricter, so a one-off lucky item doesn't count, and a placeholder feed (CAN's "RSS Feed Inactive") can't pass.
- **2026-10-20 · Discovery common paths extended.** Beyond the plan's `/feed`, `/rss`, `/atom.xml` and `/index.xml`, discovery also tries `/feed.xml`, `/rss.xml`, `/feed.json`, `/feed/rss/` (NN/g) and `/feeds/posts/default` (Blogger). Each guess is checked by parsing the body, not by HTTP status, because SPAs return 200 HTML for every path.
- **2026-10-20 · Settings defaults in the migration** (not in the plan): `motion = 'reduced'`, `autoplay = false`, `captions = true`, `daily_goal = 5`, `review_cap = 10`. These lean calm for the target audience. Matt can change them in Phase 3.

## Proposed, waiting on Matt

These change the data-model shape or add a service, so per `CLAUDE.md` they need sign-off:

- `sources.etag` and `sources.last_modified`. `fetchFeed` already does conditional GETs, but there's nowhere to persist the validators.
- `items.lead_image_width` and `items.lead_image_height`. The Board needs native aspect ratios without layout shift.
- An HTML-listing source type for sites without feeds (Google Design, Built for Mars).
- A source of YouTube durations (Data API key or a watch-page fetch).
