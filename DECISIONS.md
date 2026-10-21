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
- **2026-10-20 · Typeface: Atkinson Hyperlegible Next**, the Braille Institute's typeface designed for legibility. *(Replaced 2026-10-21 by the Quiet Editorial faces; see below.)*
- **2026-10-20 · Toasts stay until dismissed or replaced** (no countdown) and always offer Undo for Keep, Skip and Mute. This follows rule 5: no timers.
- **2026-10-20 · Review and Library tabs arrive in Phase 2**, so the nav shows Today, Explore and Sources. Help is in the same place on every screen (rail bottom, or top-right on phones), per WCAG 3.2.6.

- **2026-10-20 · Phase 2 started before Phase 1's gate closed** (Matt's call). Matt may rework card interactions (press to save, swipe off-screen to hide), and he is putting less weight on Lighthouse and accessibility scores for now. The Phase 1 gate (live Lighthouse, 5 days of use) is still open.
- **2026-10-20 · Keep makes a card without changing the data model.** Keep adds a highlight with no text or image (the "keep highlight"), and the card hangs off that ("What was the key idea of …?", answered by your note or else the item's summary). Undoing the Keep, or removing the item from the Library, deletes both.
- **2026-10-20 · FSRS with long-term scheduling only** (`enable_short_term: false`). A card is seen at most once a day, so the daily cap is literal: Forgot means tomorrow, not "again in a minute". New cards first come due the next local morning.
- **2026-10-20 · The cap counts distinct cards reviewed today** (default 10, from `settings.review_cap`). The queue is the oldest-due cards up to what's left of the cap. The nav badge shows the queue length, so it never shows more than the cap.
- **2026-10-20 · Prompts.** A highlighted passage of 8–60 words becomes a fill-in-the-blank. The blank is a number with its unit if there is one, else a proper noun that isn't the first word, else the longest uncommon word. Shorter or longer passages, and plain keeps, get "What was the key idea of …?". Saved images ask what the image showed and why you saved it.
- **2026-10-20 · Review feedback appears above the card, not in a toast.** On phones the toast covered the next card's answer buttons. The session keeps its own queue until it finishes, so it always ends on its own summary.
- **2026-10-20 · Each answer button shows when the card comes back** ("back in 3 days"). This follows rule 5: no surprises.
- **2026-10-20 · Days learned** is the count of days with any reading or reviewing. It's shown on Today and at the end of Review, and never resets.

- **2026-10-20 · Phase 3 started before the Phase 2 gate closed** (Matt's call). Phase 3's own gate is testing with 5 people, which is Matt's to run.
- **2026-10-20 · Gestures** (Matt asked for force press to save and swipe off-screen to hide):
  - Swipe right keeps, left skips, and up opens (Swipe deck only). On the Board, vertical moves stay native scrolling (`touch-action: pan-y`).
  - Press and hold (550 ms, touch and pen) keeps. That's the practical stand-in for force press, which current iPhones and mobile browsers don't expose.
  - Every gesture keeps its visible button and a key (CLAUDE.md).
  - A drag or hold never counts as a tap on the card's link, and the browser's own image/link drag is turned off on cards.
- **2026-10-20 · Swipe sets are 10 cards, then a summary** with an optional "Another set". Swipes save independently, so fast swiping never waits on the previous save. The summary counts outcomes immediately.
- **2026-10-20 · Watch is its own scroll-snap area,** not the page, so it never hijacks page scroll. Players are built from the video ID (YouTube nocookie or Vimeo) and always start muted. Autoplay (muted) happens only when switched on and only for the video that's 70% in view, never in Calm mode. Captions use `cc_load_policy=1` (YouTube) and `texttrack` (Vimeo). Sessions are 8 videos, then a break card.
- **2026-10-20 · Motion levels.** "Full" gives the scroll lean (CLAUDE.md's fast/slow followers: lean = gap ÷ 500, at most 1.5° of skew; the loop stops once settled), gray-at-rest on the Board and the Swipe deck, and the mode morph. "Reduced" and "off" drop those. The OS "reduce motion" setting caps everything at reduced. Calm mode forces off.
- **2026-10-20 · Default motion is "full"** (the column default from Phase 0 was "reduced"). The OS setting still wins, and the new effects are deliberately small. This matters for the Phase 3 tests: testers who want less can turn it down, and their OS preference already applies.
- **2026-10-20 · Mode morph uses React 19.3's `<ViewTransition>`** (no animation library). The same card image is named on the Board, on the top card in Swipe and on the Reader hero, so it moves between them. It only animates at full motion. Browsers without the View Transitions API just switch views.
- **2026-10-20 · Preferences apply before first paint.** They're saved to `settings` and mirrored in a small `fw_prefs` cookie, which an inline script reads to set `data-*` attributes on `<html>`. Text size, density and motion never flash. The Settings screen offers presets, but any sensible stored number is honoured (daily goal 3–5, review cap 1–50).
- **2026-10-20 · On phones, Swipe's buttons stay just above the tab bar** so they're always in thumb reach. Board and Swipe intro text and length chips appear on Board only, to keep one thing in view.

- **2026-10-21 · Quiet Editorial (DESIGN.md) replaces the earlier style** (Matt's call, on branch `claude/quiet-editorial`). It covers tokens, type, surfaces, components and motion feel. Behaviour, routes and data are unchanged. Where it differs from DESIGN.md:
  - **Free faces.** Newsreader, Inter Tight and Geist Mono (Google Fonts via `next/font`) stand in for Flecha M, GT Standard and GT Standard Mono; there's no licence for the paid faces.
  - **Ground follows the OS:** paper in light, press in dark. Watch is the one inverted (press) section on its page.
  - **Body is 15–17px**, not 13–15 (Matt's call). **Reader prose is 17–20px** (`--t-reader`), the one documented exception to the four sizes. **Labels are 11px**, not 9: mono caps at 9px were too small to carry source names and times, which are now essential and in full ink.
  - **`--muted` (45%) is only for non-essential text:** summaries, hints, "recall first" lines. Source, time, progress and counts stay in full ink. On paper, 45% measures about 2.8:1, so muted text never carries something you need.
  - **Accent does one job: progress and live state.** That covers the progress meters, the Reader's reading bar, the due-count square and a source that couldn't be reached.
  - **Touch targets stay ≥ 44px.** Text buttons and mono-label actions get the height from padding, so they look small but aren't.
  - **Reduced motion keeps CLAUDE.md's rule** (all non-essential motion off, fades included). That's stricter than DESIGN.md's "keep fades".
  - **Navigation.** On desktop there's a top bar: wordmark, then Today / Explore / Review / Library, then Sources / Settings / Help as labels. Phones keep a text-only bottom tab bar, because the tabs are the primary way around. Settings and Help sit top-right on every screen.
  - **Cards become image + caption** on the grid: a numbered label, a serif title, and Keep / Skip as labels. Continue, Library and Sources are numbered index lists with hairlines. Every list or deck still ends on a finish block (a hairline, a label and one sentence).
  - **Icons are gone;** words and arrows replace them. Toggles in Settings are a 1px box with a sliding square.
  - **Focus is a 1px ink outline, offset 3px** (DESIGN.md §11).
  - **The swipe gesture's fly-out and spring-back use `--ease`** like everything else, so there's one curve across the product.

## Waiting on Matt

- A source of YouTube durations (Data API key or a watch-page fetch). Cards show "Video" until then.
