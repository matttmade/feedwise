# Feedwise — Build Plan

Read `BRIEF.md` first. Build phase by phase. **Do not start a phase until the previous phase's exit gate passes.** Each phase ends with a working, deployed app.

## Default decisions (change only if Matt says so)

| Decision | Default |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + CSS custom-property design tokens |
| Database / auth / storage | Supabase (Postgres, RLS, Storage) |
| Hosting + jobs | Vercel; GitHub Actions schedule hits a protected `/api/cron/fetch` route (see DECISIONS.md) |
| Users | Single user (Matt) in v1; still use Supabase auth (magic link) and RLS so multi-user is a later switch, not a rewrite |
| Keep action | One tap saves; optional "one thing to remember" note |
| Spaced repetition | FSRS via `ts-fsrs` |
| Review cap | 10 cards/day (setting) |
| Package manager | pnpm |

Confirm library versions and APIs against current docs before installing. If a candidate library is unmaintained, pick the closest maintained alternative and note it in `DECISIONS.md`.

## Data model (Postgres)

```
sources      id, user_id, site_url, feed_url, feed_type, title, icon_url, topic_ids[], muted, last_fetched_at, last_status, last_error
items        id, source_id, guid, url, title, summary, type ('article'|'video'|'image_set'), lead_image_url, media jsonb, embed_html, body_html, read_minutes, duration_seconds, published_at, created_at   -- unique(source_id, guid)
user_items   user_id, item_id, state ('new'|'skipped'|'kept'|'read'), resume_position, last_opened_at, kept_at
highlights   id, user_id, item_id, text, image_url, note, created_at
cards        id, user_id, highlight_id, prompt, answer, fsrs jsonb (due, stability, difficulty, reps, lapses, state), last_review_at
reviews      id, card_id, rating ('again'|'hard'|'good'), reviewed_at
topics       id, user_id, name, color, icon
settings     user_id, density, motion ('off'|'reduced'|'full'), autoplay, captions, text_size, daily_goal, review_cap, calm_mode
activity     user_id, day date, items_read, cards_reviewed   -- powers cumulative "days learned"
```

RLS on every user table: `user_id = auth.uid()`. Map review buttons: Got it → good, Shaky → hard, Forgot → again.

---

## Phase 0 — Ingestion spike

**Goal:** prove the hard part — rich cards from real feeds.

- [x] Scaffold repo, lint, prettier, `.env.example`, Supabase migrations
- [x] `discoverFeeds(url)`: fetch page, read `<link rel="alternate">` for RSS/Atom/JSON Feed; try common paths (`/feed`, `/rss`, `/atom.xml`, `/index.xml`); YouTube channel URL → `https://www.youtube.com/feeds/videos.xml?channel_id=…`
- [x] `fetchFeed(feed)`: parse RSS/Atom/JSON Feed; dedupe by guid; respect ETag/Last-Modified; 10s timeout; polite User-Agent
- [x] `enrichItem(item)`: lead image from feed media → `og:image` → first content image; video via oEmbed (YouTube, Vimeo); clean body with Mozilla Readability; read time at 230 wpm; type detection
- [x] CLI script `pnpm spike <url...>` that prints enriched items as JSON and writes `spike-report.md`
- [x] Unit tests with saved fixture feeds (no live network in tests)

**Exit gate:** 10 real sites chosen by Matt (include 1 YouTube channel, 1 image-heavy blog, 1 thin title-only feed) → at least 8 produce a card with title + image + correct type.

## Phase 1 — Personal MVP (reading loop)

- [x] Auth (magic link), app shell, design tokens (light + dark), responsive nav (bottom bar < 1024px, left rail above)
- [x] **Sources** screen: add by URL → show detected feeds → confirm; list with health status, mute, rename, topic tags
- [x] Cron route: fetch due sources every 2h, enrich, store; per-source error capture; never let one failing feed stop the run
- [x] **Today**: hero = one next action; Continue rail; today's batch of 3–5 new items; finish card
- [x] **Explore → Board**: 2/3/4–5 column masonry, native aspect ratios, lazy images, topic/source tabs, time chips, "caught up" card
- [x] **Reader**: lead image, chunked body, progress bar, resume position saved on scroll (debounced), "Keep" action, link to original
- [x] Keep / Skip with one-tap undo toast
- [x] Image proxy/resizing for thumbnails; blurred placeholder; branded fallback when no image
- [ ] Deploy to Vercel (ready: follow DEPLOY.md; needs Matt's Supabase + Vercel accounts)

**Exit gate:** Matt uses it 5 days in a row. Lighthouse mobile ≥ 90 performance and accessibility. Axe: zero critical issues.

## Phase 2 — Learn loop

- [x] Highlight text or image in Reader → creates highlight (+ optional note)
- [x] Highlight → card (prompt = cloze or "What was the key idea of …?", answer = highlight/note)
- [x] **Review** tab: due-count badge (capped display), recall-first card (prompt → tap reveal → Got it / Shaky / Forgot), FSRS scheduling, finish screen
- [x] Today hero switches to "Time to review" when cards are due
- [x] **Library**: kept items, highlights, filter by topic, search
- [x] Cumulative "days learned" from `activity` (never a streak)

**Exit gate:** cards return on schedule over 2 weeks; queue never exceeds the cap; nothing in the UI uses loss framing.

## Phase 3 — Rich modes + craft

- [x] **Swipe** mode: gesture deck, visible Keep/Skip/Open buttons, keyboard shortcuts, batch of 10 → summary
- [x] **Watch** mode: CSS scroll-snap vertical stream, click-to-play embeds (poster first), muted by default, session break card
- [x] Mode morph: shared card objects animate between Board/Swipe/Reader layouts
- [x] Damped motion system (fast + slow follower lean; gray-at-rest/color-on-focus); loop stops when settled
- [x] **Settings "Make it mine"**: density, motion, autoplay, captions, text size, daily goal, review cap, Calm mode
- [x] `prefers-reduced-motion` and Calm mode disable all non-essential motion

**Exit gate:** test with 5 people who identify with ADHD, anxiety or memory struggles using W3C COGA test questions; fix top 5 issues.

## Phase 4 — Connect Matt's world (outline)

Stash inbox import (parse `date | URL` lines; X/Instagram via oEmbed/Open Graph) · OPML import/export · PWA install + offline kept items · research-aggregator sources.

## Phase 5 — Multi-user (outline)

Open sign-up, starter source packs, onboarding polish, shareable collections.

---

## Definition of done (every task)

- Works at 375px, 768px, 1280px widths; keyboard-operable; visible focus
- Respects `prefers-reduced-motion` and Calm mode
- No infinite lists; every batch has a finish line
- Copy is reassuring, never shaming ("Not quite — here's the trick", never "Incorrect")
- Typed, tested where logic is non-trivial (feeds, enrichment, scheduling)
