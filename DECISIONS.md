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

- **2026-10-20 · Scheduled fetch runs on GitHub Actions, not Vercel Cron** (Matt approved). Vercel's free plan only allows daily cron. `.github/workflows/fetch-feeds.yml` calls `/api/cron/fetch` every 2 hours with `CRON_SECRET`. If the secrets aren't set yet, the job skips with a notice instead of failing.
- **2026-10-20 · Columns added** (Matt approved): `sources.etag` and `sources.last_modified`, `items.lead_image_width` and `items.lead_image_height`. Migration `20261020120000_phase1_columns.sql`.
- **2026-10-20 · No-feed sites deferred to Phase 4** (Matt approved). Google Design and Built for Mars wait for the HTML-listing source type.
- **2026-10-20 · Read view `feed_items`** (`security_invoker`, so RLS still applies). It joins each item to its source and to the caller's own `user_items` row. No table changes shape.
- **2026-10-20 · Single-user sign-in.** `ALLOWED_EMAILS` gates the magic-link form, and DEPLOY.md turns Supabase sign-ups off. The form gives the same reply for any address, so it doesn't reveal who has access.
- **2026-10-20 · "Handled today" is `user_items.last_opened_at` today.** Opening, keeping or skipping an item sets it. Today's set is `daily_goal` (clamped to 3–5) minus items handled since local midnight (`APP_TIMEZONE`). Picks are round-robined across sources so one busy feed can't fill the set.
- **2026-10-20 · Unread items older than 14 days drop out** of Today and Explore. Old posts quietly age out instead of becoming a backlog. Kept items stay.
- **2026-10-20 · The Board shows 16 cards, then the finish card.** That's calmer than a long wall, and it brought Explore's mobile Lighthouse score from about 85 to about 90 (fewer bytes and less main-thread work). Topic, source and length filters show different cards.
- **2026-10-20 · Board masonry uses CSS columns** (no JavaScript, no layout shift). As a result, keyboard order runs down each column rather than across rows. That's consistent and predictable, but it's a known trade-off: a JavaScript masonry would keep row order at the cost of a reflow after load.
- **2026-10-20 · Own image proxy (`/api/img`, sharp → WebP, immutable cache), not `next/image`.** It goes through the same SSRF guard as feed fetching, only serves images we chose at ingest (card images by item id, article images by HMAC-signed URL), and stays off Vercel's metered image-optimisation quota. Each lead image is validated at ingest by trying the candidates in order (feed media, then og:image, then content image, then oEmbed thumbnail), and its real size is stored.
- **2026-10-20 · SSRF guard on every server-side fetch.** Only http(s) is allowed, private, loopback and link-local addresses are refused after DNS resolution, redirects are followed by hand so each hop is checked, and bodies are capped at 5 MB (15 MB for images).
- **2026-10-20 · Article HTML is sanitised with DOMPurify** at ingest and again when the Reader renders it. Scripts, styles, forms, iframes and site-supplied ARIA are removed. Videos play only through our own click-to-play player, which builds the YouTube (nocookie) or Vimeo URL from the video ID.
- **2026-10-20 · The Keep note becomes a `highlights` row** (`note`, with no text or image) linked to the item. Phase 2 turns highlights into cards.
- **2026-10-20 · Typeface: Atkinson Hyperlegible Next**, the Braille Institute's typeface designed for legibility.
- **2026-10-20 · Toasts stay until dismissed or replaced** (no countdown) and always offer Undo for Keep, Skip and Mute. This follows rule 5: no timers.
- **2026-10-20 · Review and Library tabs arrive in Phase 2**, so the nav shows Today, Explore and Sources. Help is in the same place on every screen (rail bottom, or top-right on phones), per WCAG 3.2.6.

## Waiting on Matt

- A source of YouTube durations (Data API key or a watch-page fetch). Cards show "Video" until then.
