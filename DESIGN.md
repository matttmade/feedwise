# DESIGN.md — Quiet Editorial aesthetic

> Design direction for this project. Read this before touching any UI, CSS, tokens or copy.
> Import it from CLAUDE.md with: `@DESIGN.md`
>
> Reference sites: sort-office.com · pear.no · coreastudios.com · lifestories.org

---

## 1. The idea in one line

**Few typefaces, few sizes, few colors — and every remaining decision made on purpose.**
The content (work, video, words) is the decoration. The interface is a well-set page around it.

## 2. Five principles

1. **Type is the layout.** Hierarchy comes from typeface, weight, case and spacing — not boxes, cards, shadows or color.
2. **Restraint by count.** Hard caps: 2 families (+1 mono), 4 text sizes, 1 background, 1 ink, 1 accent max.
3. **Contrast at the extremes.** Pair opposites inside one line: serif light vs. sans regular, weight 100 vs. 900, 56px vs. 9px. Avoid the timid middle.
4. **Indexes over interfaces.** Lists, numbers, years, clients, timecodes. Information reads like a catalogue, not a dashboard.
5. **Calm motion.** One easing curve, slow-out. Things fade and slide a little; nothing bounces.

## 3. Tokens (replace existing tokens with these; don't add alongside)

```css
:root {
  /* Color — warm, never pure #000/#fff */
  --press: #0b0a09;      /* dark ground */
  --ink:   #1a1917;      /* text on light */
  --paper: #f3f1ea;      /* light ground / text on dark */
  --muted: color-mix(in srgb, currentColor 45%, transparent); /* secondary text */
  --ghost: color-mix(in srgb, currentColor 20%, transparent); /* tertiary, disabled */
  --rule:  color-mix(in srgb, currentColor 14%, transparent); /* 1px hairlines */
  --accent: #c53633;     /* optional; use for ONE job only (e.g. progress, live state) */

  /* Type families */
  --font-display: "Flecha M", "Newsreader", "Iowan Old Style", Georgia, serif;
  --font-text:    "GT Standard", "Inter Tight", ui-sans-serif, -apple-system, sans-serif;
  --font-mono:    "GT Standard Mono", "Geist Mono", ui-monospace, Menlo, monospace;

  /* Type scale — 4 steps + label. Fluid, clamp-based. */
  --t-label:   0.5625rem;                         /* 9px mono caps */
  --t-body:    clamp(0.8125rem, 0.78rem + 0.15vw, 0.9375rem); /* 13–15px */
  --t-lead:    clamp(1.25rem, 1rem + 1vw, 1.75rem);           /* 20–28px */
  --t-display: clamp(2.25rem, 1.2rem + 4.5vw, 5.5rem);        /* 36–88px */

  /* Line-height & tracking */
  --lh-tight: 0.92;   /* display */
  --lh-snug:  1.1;    /* lead, list rows */
  --lh-text:  1.32;   /* body */
  --tr-display: -0.02em;
  --tr-text:    -0.005em;
  --tr-label:    0.2em;

  /* Space — 4px base, used sparingly at large steps */
  --s-1: 4px; --s-2: 8px; --s-3: 16px; --s-4: 24px;
  --s-5: 48px; --s-6: 96px; --s-7: 160px;
  --gutter: clamp(16px, 2.5vw, 32px);

  /* Shape & motion */
  --radius: 0;                         /* 4px max if anything must round */
  --ease: cubic-bezier(.22, 1, .36, 1);
  --dur-1: 200ms; --dur-2: 450ms; --dur-3: 900ms;
}
```

Font licensing: Flecha (Production Type) and GT Standard (Grilli Type) are paid. If no license exists, use the free fallback named second in each stack and **tell the user** — don't silently substitute.

## 4. Typography rules

| Role | Family | Size | Weight | Case | Notes |
|---|---|---|---|---|---|
| Display / H1 | display serif | `--t-display` | 300 | sentence | `--lh-tight`, `--tr-display`. Italic for the emphasized phrase only. |
| Lead / H2 | display serif | `--t-lead` | 300–400 | sentence | One per section. |
| Body / UI | text sans | `--t-body` | 400 | sentence | Max 62ch. Nav, buttons and body all share this size. |
| Label / meta | mono | `--t-label` | 400 | UPPERCASE | `--tr-label`, `--muted`. Years, indices, timecodes, captions. |

- **Small body is fine.** 13–15px body with generous space around it reads as confident, not cramped.
- **Emphasis = change of face or weight, not color.** e.g. `<em>` switches to the serif italic; a key word goes 900 next to 100.
- **Numbers are design.** Use tabular figures (`font-variant-numeric: tabular-nums`) for indices, years, counts, timecodes. Bracket or zero-pad indices: `[07]`, `01`.
- **Duplicate-in-two-weights titling** (Core-A move): a project name set once heavy/uppercase and once regular — use for list rows and hover states, not everywhere.
- Never: bold body paragraphs, centered body copy, more than one italic per line, letter-spaced lowercase, gradients on text.
- Turn on: `text-wrap: balance` for headings, `text-wrap: pretty` for paragraphs, `-webkit-font-smoothing: antialiased` on dark grounds, `hanging-punctuation: first`.

## 5. Layout

- **Grid:** 12 columns, `--gutter` side padding, content aligns to column edges. Allow asymmetric placement (text starting at col 3 or col 7) instead of centering everything.
- **Whitespace is structural.** Sections separated by `--s-6`/`--s-7`, not by background bands or dividers. When a divider is needed: 1px `--rule`, full bleed.
- **Media goes edge-to-edge or sits on the grid** — no rounded thumbnails floating in cards. Video loops muted, no visible controls until hover/tap.
- **Fixed chrome is tiny:** wordmark left, 2–4 text links right, all at `--t-body` or `--t-label`. No hamburger on desktop.
- **Index pattern** for collections: one row = `[index] Title — Client — Year`, hairline between rows, hover reveals media preview. Offer list/grid toggle when there are more than ~8 items.
- **Footer as colophon:** email, social handle, legal line, maybe a live local clock. Mono labels.

## 6. Color & surface

- One ground per page (dark `--press` **or** light `--paper`). Inverting for a single feature section is allowed once per page.
- Hierarchy through opacity of the ink (`--muted`, `--ghost`), not new hues.
- No shadows, no glassmorphism, no gradients except media scrims (`linear-gradient(transparent, rgb(0 0 0 / .5))` under text on video).
- Accent, if used, does exactly one job across the whole product.

## 7. Components

- **Buttons:** text + arrow (`Apply →`) or underlined link. If a container is unavoidable: 1px border, `--radius`, no fill, same `--t-body` type.
- **Inputs:** bottom border only, label in mono caps above.
- **Cards:** remove them. Replace with image + caption on the grid.
- **Icons:** minimal; prefer words. If needed, 1px stroke, sized to cap height.
- **Tags/pills:** convert to mono caps text separated by ` · `.

## 8. Motion

- Use `--ease` everywhere. Enter: fade + 8–16px translate, `--dur-2`. Page transitions: crossfade (View Transitions API if available).
- Hover: opacity or underline-offset change, `--dur-1`. No scale-on-hover for text.
- Loaders: wordmark only, centered, on ground color.
- Respect `prefers-reduced-motion`: drop translates, keep fades.

## 9. Copy voice

Short, declarative, a little dry. Sentence case. Labels are nouns (`Work`, `Info`, `Index`), not verbs-with-exclamation. One idea per sentence. Remove filler adjectives.

---

## 10. Realignment workflow (follow in order)

1. **Audit first, change nothing.** Inventory every font-family, font-size, color, radius, shadow and spacing value in use. Report counts (e.g. "14 font sizes, 9 grays, 6 radii") and where they live. Wait for go-ahead if the project is large.
2. **Install tokens.** Add Section 3 tokens in the global stylesheet / Tailwind theme. Map old tokens to new ones; delete the rest.
3. **Type pass.** Collapse every text style into the 4 roles in Section 4. Any size not on the scale gets snapped to the nearest step.
4. **Surface pass.** Remove shadows, gradients, card backgrounds, radii > 4px, decorative borders. Replace with whitespace or `--rule` hairlines.
5. **Layout pass.** Re-seat sections on the 12-col grid, open up vertical rhythm, convert card grids to index lists or image+caption grids.
6. **Component pass.** Buttons, inputs, tags, nav, footer per Section 7.
7. **Motion pass.** Replace all easings/durations with tokens; add reduced-motion handling.
8. **Copy pass** (only if asked). Tighten labels and headings per Section 9.
9. **Verify.** Screenshot key pages at 390px, 1280px, 1920px in both themes if theming exists. Check the checklist below and report what still violates it.

Work in small, reviewable commits per pass. Don't change behavior, routes or data while restyling.

## 11. Done checklist

- [ ] ≤ 2 type families + 1 mono, all via tokens
- [ ] ≤ 4 text sizes + label size; no stray px values in components
- [ ] One ground color per page; grays are opacity of ink
- [ ] Zero box-shadows; radius 0 (≤ 4px exceptions documented)
- [ ] No cards; collections are index lists or captioned grids
- [ ] Every number in lists uses tabular figures
- [ ] One easing curve; reduced-motion respected
- [ ] Body text ≥ 4.5:1 contrast; `--muted` text ≥ 3:1 and never used for essential info
- [ ] Focus states visible (1px outline offset 3px in ink) — minimal ≠ inaccessible
- [ ] Looks intentional at 390px, not just shrunk

## 12. When in doubt

Remove it. If removing it breaks understanding, put it back as type, not as a box.
