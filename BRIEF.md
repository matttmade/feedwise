# Feedwise — Product Brief

> Working name. Owner: Matt Taylor. Date: 2026-10-20.

## The bet

Turn the sites you already follow into a **visual, swipeable learning feed that actually sticks**.

1. User pastes in websites (and YouTube channels).
2. The server finds their RSS/Atom/JSON feeds, fetches items, and enriches each one with a lead image, video embed, clean article text, and read time.
3. The app presents items as a masonry **Board**, a **Swipe** deck, a vertical **Watch** stream, and a calm **Reader**.
4. Anything worth keeping becomes a **recall card** that resurfaces on a spaced schedule.

Feed readers are text lists built for skimming. Learning apps teach someone else's curriculum. Feedwise is *your* sources, presented as a learning product.

## Who it's for

Visual learners who struggle with focus, anxiety, and recall (ADHD/ADD, anxiety, short attention span, weak working memory). Every screen follows the neuro-inclusive rules below. v1 user: Matt only.

## Platform

- Browser-first, fully responsive (phone → desktop), installable PWA.
- Later: import from Matt's **Stash** inbox (iOS Shortcut that saves X/Instagram links to `Inbox/saved.txt` as `date | URL` lines).

## The 6 UX rules (non-negotiable)

1. **One thing at a time** — one card in focus, one primary action per screen.
2. **Show, then say** — every item leads with image/video; text is a short label.
3. **The app remembers** — resume point on everything, Continue rail, visible progress.
4. **Recall beats review** — kept items become recall cards in a capped daily queue.
5. **No surprises, no punishment** — cumulative "days learned", never a resetting streak; no timers; undo everywhere.
6. **User holds the dials** — motion, density, autoplay, sound, reminders are settings.

## Core loop

Follow → Feed (capped daily visual batch) → Learn (read/watch, resume anytime) → Keep (save the one thing) → Review (recall cards, spaced) → due cards lead the next day's Today screen.

## Reference patterns (from Mobbin screens)

| Source | Borrow | Avoid |
| --- | --- | --- |
| Babbel Today | Giant single-CTA hero ("Time to review"); Today / Learning plan tabs; Review tab with due-count badge | Streak flame, loss framing |
| MasterClass | Peek carousel with one card in focus; paired Play + My List; "Continue Watching" with progress + "Lesson 1 of 17"; duration chips | Autoplay rotation; endless rails |
| Pinterest | Two-column masonry with native aspect ratios; topic tabs | Infinite scroll with no finish line |

## Motion craft (from aristidebenoist.com teardown)

- **One set of cards, many layouts** — Board/Swipe/Reader reuse the same card objects; switching modes morphs positions instead of reloading.
- **Fast + slow followers** — the gap between a quick and a lagging scroll value drives a subtle lean/stretch.
- **Gray at rest, color on focus** — off-focus cards slightly desaturate.
- **Frame-rate-independent damping** — `lerp(a, b, 1 - Math.exp(Math.log(1 - k) * dt / 16.67))`.
- **Render only when moving** — stop the loop when values settle.
- **Guardrail:** all of it turns off under `prefers-reduced-motion` and in Calm mode. Never hijack scroll for reading.

## Screens

| Tab | Job | Key parts |
| --- | --- | --- |
| Today | "What's my one next thing?" | Hero = single next action (reviews due, else a fresh pick); Continue rail; 3–5 new items; cumulative days learned |
| Explore | Browse what sources published | Mode switch (Board / Swipe / Watch); topic + source tabs; time chips |
| Review | Spaced recall | Capped queue (default 10); recall-first cards; Got it / Shaky / Forgot; finish screen |
| Library | Everything kept | Saved items, highlights, topics, search |

Supporting: **Reader**, **Sources** (add by URL, detected feeds, mute/tag, feed health), **Onboarding** (paste 3 sites, pick topics, set daily goal, < 2 min), **Settings "Make it mine"**.

## Feed modes

| Mode | Gesture | Best for | Finish line |
| --- | --- | --- | --- |
| Board | Vertical scroll, tap to open | Images | "You're caught up" card after today's batch |
| Swipe | Right = Keep, Left = Skip, Up = Open | Fast triage | Batch of 10 → summary |
| Watch | Vertical snap scroll, 1 video/screen | Video | Session of N → break card |
| Reader | Normal scroll | Long-form | "Keep one thing" prompt at end |

Every mode: shows cost ("4 min read", "2:31"); one-tap undo toast; no autoplay with sound; every batch ends; keyboard parity (←/→, K keep, X skip, Enter open, Esc close); visible buttons for every swipe action.

## Responsive

| Breakpoint | Nav | Board cols | Swipe/Watch | Reader |
| --- | --- | --- | --- | --- |
| < 640px | Bottom tab bar | 2 | Full-screen card | Full width, 18px |
| 640–1024px | Bottom bar / side rail in landscape | 3 | Centered card, peeking neighbours | 640px column |
| > 1024px | Left rail | 4–5 (max 1440px) | Centered + side detail panel | 680px column |

8px spacing scale · 16–20px card radius · fluid type via `clamp()` · touch targets ≥ 44px · safe-area insets · Density setting changes card size and column count.

## Out of scope for v1

Multi-user accounts, social features, public sharing, native apps, AI summaries, monetization.
