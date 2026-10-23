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

- **2026-10-22 · Guest previews** (Matt's call; email links weren't arriving on the preview). On Vercel preview deployments, or anywhere `ALLOW_GUEST=true`, a visitor with no session gets a Supabase anonymous session instead of the sign-in page. The session lives in cookies like any other, and their data sits under that anonymous user, so row-level security is unchanged. The sign-in page also offers "Preview without an account". Production stays email-only unless `ALLOW_GUEST` is set there.
- **2026-10-22 · The wordmark is plain text,** "Feedwise" at body size with no weight or italic change.

- **2026-10-22 · jsdom pinned to 26.x.** jsdom 30 loads ten ES-module-only dependencies with `require()` (parse5 8, @asamuzakjp/css-color and others). That needs Node's `require(esm)` support, and Vercel's functions fail it with `ERR_REQUIRE_ESM`, which broke every signed-in page. jsdom 26 supports Node 18, so all its dependencies load the classic way. Revisit when moving to jsdom ≥ 27.

- **2026-10-22 · Second design pass after studying aristidebenoist.com and zajno.com** (Matt's direction: keep the serif, an editorial layout with several items per view, cards that fly in, diving into an item and back, sections you engage with differently, one WebGL layer, dark ground that flips on open).
  - **Ground:** near-black (`--press` #121110) everywhere, ignoring the OS setting. The Reader flips the page to light stone (#dddbd5) while it's showing. This replaces "ground follows the OS".
  - **Type:** the serif stays. `--t-display` grows to 52–168px for page titles. Long titles (the lead story, the Reader) use `--t-headline` (36–88px, the old display step) so they don't run to six lines. That's a documented fifth step alongside the Reader prose size.
  - **Today is a sectioned home:** masthead (date, progress), then numbered sections:
    - Recall (when cards are due, and then it's the primary action)
    - the lead story: edge-to-edge 2.2:1 image, the title overlapping it, an A/B/C/D fact table
    - the rest of today's set as an offset magazine spread
    - quick reads and videos as sideways swipe rows (their own scrollers)
    - Continue
    - a finish
  - **Fly-in:** items rise and settle as they enter the viewport, using a CSS view timeline. It reads scroll position and never moves the page. It's full motion only and off under Calm mode or reduced motion. Explore's board uses it too.
  - **WebGL layer** (`components/gl/gl-stage.tsx`, OGL, MIT, about 25 KB): one canvas behind the page draws each framed image in place. Three effects:
    - grayscale at rest, colour on hover or focus (on touch, the item nearest the middle)
    - a slight bend from scroll velocity (the existing fast/slow followers)
    - opening an item grows its image to fill the screen, and coming back shrinks it into place

    It's full motion only. Otherwise, or without WebGL, the `<img>` shows as before. The Reader's image is now edge to edge so the dive lands on it.

- **2026-10-22 · Third pass: a richer home, depth and transitions** (Matt: more content, the dynamic sections, intros and outros between pages, tiles that don't all move as one).
  - **Limits raised:** fresh means the last 30 days (was 14), and the board shows 24 (was 16). The daily set stays 3–5.
  - **The home deals a pool of up to 150 fresh items into sections, each engaged differently:**
    - count-up stats
    - Recall
    - the lead story
    - the rest of today's set
    - an inline keep-or-skip stack (swipe or tap, undoable)
    - quick reads and videos to swipe
    - "From your sources" (newest from each, as an index)
    - a resurfaced highlight that changes daily
    - topic tabs
    - long reads for later
    - Continue
    - a finish

    No item appears in two of the main sections (`lib/feed/home.ts`, tested).
  - **Per-tile scroll depth** (`components/motion/depth-stage.tsx`) follows the GSAP ScrollSmoother `data-speed` / `data-lag` and Codrops "Elastic Grid Scroll" patterns, but on native scroll: tiles get their own parallax speed and lag via `translate`.
    - Explore's columns use "auto" lag, so edges trail the centre (measured: about 60px at the centre, 120px at the edges mid-scroll).
    - Index rows cascade.
    - Full motion only.
  - **Transitions:** pages exit (lift, blur) and enter (rise) through React `<ViewTransition>`. Loading placeholders sink as content rises. No Next config is needed.
    - The view transitions stay at 450ms or less, because the page is a snapshot and can't be tapped while they run. An earlier 900ms version blocked drags right after load.
    - The longer intro runs on the live page afterwards: the masthead rising out of a mask, staggered rises, and WebGL image wipes.
  - **Images inside rotated or dragged cards** (the keep-or-skip stack, the Swipe deck) stay plain `<img>`. The WebGL layer can't follow their rotation.
  - **Axe on Explore** can flag contrast on cards still flying in at the bottom edge, because they're partly transparent mid-animation. They settle at full ink.

- **2026-10-22 · No tracking: Today is a ranked feed that keeps refreshing** (Matt's call: "less like a tracker or chore"). This reverses UX rule 3's "visible progress" and PLAN's daily set of 3–5.
  - **Removed:**
    - days learned (the activity rows are still written, just never shown)
    - the stats strip
    - the "02 / 05 done" daily quota
    - the nav's due-count badge and the Recall due count
    - the "Today's set" setting (the column stays in `settings`, so no data change)
  - **Ranking** (`lib/feed/rank.ts`, tested) has three parts:
    - **Freshness:** a 4-day half-life feel.
    - **Affinity to the post's source and topics,** from the last 120 days of what you did. Opened counts +1, read past half +1, kept +2, skipped −1, squashed to −1…1.
    - **Variety:** a seeded nudge that reshuffles every 10 minutes, or straight away with "Shuffle".
  - **Home order:**
    1. the lead story
    2. For you (8)
    3. Still reading
    4. Keep or skip (it teaches the feed)
    5. quick reads
    6. from your sources
    7. a resurfaced highlight
    8. topics
    9. Watch
    10. Recall (a quiet link, not a count)
    11. long reads
    12. a finish with Shuffle and Explore

    It still always ends.

- **2026-10-23 · Press edition** (branch `claude/press-edition`; Matt asked for a toggle that makes it feel like a vintage newspaper, subtle and editorial).
  - **The toggle:** "Press" in the top bar. It's a per-browser cookie (`fw_press`) applied before first paint, so it isn't stored in the database.
  - **Paper:** a newsprint ground (#ebe5d4) with ink (#1c1a16) and a static grain at 7%.
  - **Images:** continuous tone printed on newsprint with a fine 45° dot screen blended in at 45%, drawn in the WebGL shader. There's a lighter CSS dot screen when WebGL is off. On hover the image's colour shows faintly, like a second spot ink.
  - **Misprints:** the cyan and magenta plates sit a third of a pixel out of register on headlines and images. While you scroll they drift up to about 2px, driven by scroll velocity through the damped followers (`--misreg`), and settle back when you stop. That part is full motion only.
  - **Furniture:** registration marks and crop lines bleed off the screen corners, plus a small colour bar on the right edge. They're decorative, `aria-hidden`, and never take pointer events.
  - **Type:** the wordmark becomes a serif nameplate, the masthead gains "Vol. 1 · No. 296", and section rules become double rules.

- **2026-10-23 · Google sign-in, open sign-ups.** "Continue with Google" is the sign-in, and anyone with a Google account can create their own account; this replaces the single-user email gate. The email link stays only where `ALLOWED_EMAILS` is set (owner, local Mailpit audits). New accounts get a welcome step on Today that follows a few picked starter feeds (`lib/starters.ts`) and fetches them straight away, so the first Today isn't empty. Data model unchanged: every table was already per-user under RLS.

- **2026-10-23 · The app is called The Me Times** (Matt renamed the Vercel project to `themetimes`). The wordmark, page titles, sign-in page, welcome and Help say "The Me Times". The repo, package name, cookies and the fetcher's User-Agent keep "feedwise".

## Waiting on Matt

- A source of YouTube durations (Data API key or a watch-page fetch). Cards show "Video" until then.
