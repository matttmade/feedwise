# Feedwise — Phase 0 ingestion spike report

Run: 2026-10-20T14:20:56.318Z · 5 newest items sampled per site

**Card** = item has a title, a lead image that actually loads (HTTP 2xx, `image/*`), and a type in the site's expected set. **Pass** = feed found, at least 3 items in it, and ≥ 60% of sampled items make a card.

## Result: 8 of 12 sites passed

1 site(s) not run (no URL).

| Site | Role | Feed | Cards | Types | Verdict | Problem |
| --- | --- | --- | --- | --- | --- | --- |
| Codrops |  | none | 0/0 | — | ❌ fail | Advertised feed failed — https://tympanus.net/codrops/feed/: HTTP 403 (bot protection) |
| Nielsen Norman Group – Articles & Videos |  | [common-path](https://www.nngroup.com/feed/rss/) | 5/5 | article | ✅ pass |  |
| Smashing Magazine – Articles |  | [link](https://www.smashingmagazine.com/feed/) | 4/5 | article | ✅ pass | 1 image didn't load |
| Figma Blog \| Shortcut | thin title-only feed | [link](https://www.figma.com/blog/feed/atom.xml) | 5/5 | article | ✅ pass |  |
| It's Nice That | image-heavy blog | [link](http://feeds2.feedburner.com/itsnicethat/SlXC) | 5/5 | video, article | ✅ pass |  |
| Awwwards Blog |  | [common-path](https://www.awwwards.com/blog/feed/) | 5/5 | article | ✅ pass |  |
| Motionographer |  | [link](https://motionographer.com/feed/) | 5/5 | article, video | ✅ pass |  |
| Google Design |  | none | 0/0 | — | ❌ fail | No feed advertised or at common paths |
| UX Collective |  | [common-path](https://uxdesign.cc/feed) | 5/5 | article | ✅ pass |  |
| Dive Club | YouTube channel | [youtube](https://www.youtube.com/feeds/videos.xml?channel_id=UCkCnraWwlnBw1_i7C9-3p0w) | 5/5 | video | ✅ pass |  |
| Built for Mars |  | none | 0/0 | — | ❌ fail | No feed advertised or at common paths |
| CreativeApplications.Net |  | [common-path](https://www.creativeapplications.net/feed/) | 1/1 | article | ❌ fail | only 1 item(s) in feed |
| Gorilla Newsletter 102 |  | none | 0/0 | — | not run | Couldn't identify the site — need a URL from Matt. |

## Reviewer notes (Claude, 2026-10-20)

**Exit gate:** "10 real sites, including 1 YouTube channel, 1 image-heavy blog and 1 thin title-only feed → at least 8 make a card with title, image and correct type."

- Matt's list had **13 sites**, not 10. 12 were run. Gorilla Newsletter 102 has no URL, so it wasn't run.
- The three required roles are covered and all pass:
  - YouTube: Dive Club, `youtube.com/@joindiveclub`.
  - Image-heavy blog: It's Nice That.
  - Thin title-only feed: Figma Shortcut. Its Atom feed has a title and one sentence, and the cards come entirely from each page's `og:image`.
- **8 sites pass**, so the gate's literal bar ("at least 8") is met. As a share it's 8 of 12, not 8 of 10.
- I checked the types by hand on the passing sites:
  - Motionographer "quickie" posts are single Vimeo films and come out as `video`. News and interview posts come out as `article`.
  - The It's Nice That Nicer Tuesdays talk comes out as `video`. Identity pieces with several clips stay `article`.

### Why the 4 failures failed

| Site | Cause | Fixable in code? |
| --- | --- | --- |
| Codrops | The site advertises `/codrops/feed/`. Cloudflare serves this container's IP a bot challenge (HTTP 403, `cf-mitigated: challenge`). The HTML page loads fine. | Not by us. Vercel's IPs may well get the same challenge, so test from a Vercel preview before deciding. |
| Google Design | No feed is advertised and none exists at the common paths. | Only with an HTML-listing fallback (see below). |
| Built for Mars | No feed. `/feed`, `/rss` and similar return the SPA's 200 HTML page, which discovery correctly rejects. | Only with an HTML-listing fallback. |
| CreativeApplications.Net | The feed is live but holds one placeholder item, "RSS Feed Inactive", that links to the member sign-up page. CAN moved its feed behind membership. | No. It would need Matt's member feed URL. |

### Things the spike surfaced for Phase 1

- **No-feed sites are common in this set** (2 of 12). Phase 1 would need a "page as source" fallback: read a listing page's article links, then build items from each link's `og:` metadata. That changes the source model (`feed_type = 'html'`), so it needs Matt's call.
- **Bot walls and rate limits.** Some fetches failed, but not consistently:
  - Codrops's feed was blocked outright.
  - UX Collective's article pages return 403, so the body comes from the feed's `content:encoded`, which is the full post.
  - NN/g pages sometimes time out under parallel requests. Results varied between runs, so item enrichment now runs one request at a time per host.
  - Awwwards' feed once returned 503 a few seconds after discovery had fetched it fine. `fetchFeed` now retries once on 429/5xx, honouring `Retry-After` up to a 5s cap.
  - The cron should retry enrichment for items left without an image.
- **Lead images can fail to load.** One Smashing feed image returns 403 even though the article has a working `og:image`. The Phase 1 image proxy should fall back through the candidate list (feed media, then og:image, then content image) when a fetch fails.
- **Generic share images.** Some It's Nice That pages use a site-wide `social.jpg` as their `og:image`. These are now skipped in two cases: the URL looks generic, or it matches the site homepage's og:image.
- **YouTube duration is missing.** The feed and oEmbed don't carry it. Watch mode needs a duration chip ("2:31"). Options are the YouTube Data API (free key, quota) or one fetch of the watch page per video. Matt's call: the API key is free but it is another service.
- **Body HTML is not sanitised yet.** Readability output must go through a sanitiser (e.g. DOMPurify) before the Reader renders it.
- **SSRF.** User-entered URLs are fetched server-side. Only http(s) is allowed today. Before Phase 1 ships, block private, loopback and link-local addresses after DNS resolution.


## Codrops

- Site: https://tympanus.net/codrops/
- Discovery warning: Advertised feed failed — https://tympanus.net/codrops/feed/: HTTP 403 (bot protection)
- Feeds found: none
- Expected types: article · time 8.0s

## Nielsen Norman Group – Articles & Videos

- Site: https://www.nngroup.com/articles/
- Feeds found: https://www.nngroup.com/feed/rss/ (rss, via common-path)
- Items in feed: 20
- Expected types: article, video · time 18.4s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [UX Maps: Glossary](https://www.nngroup.com/articles/ux-maps-glossary/) | article | [og](https://media.nngroup.com/media/articles/opengraph_images/UX_Mapping__Glossary.png) | 7 min read | ✅ |  |
| 2 | [Synthetic Users vs. Human Respondents: Same Conclusion, Less Variation](https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/) | article | [og](https://media.nngroup.com/media/articles/opengraph_images/Synthetic_Users_vs._Human_Respondents__Same_Conclusion_Less_Variation.png) | 8 min read | ✅ |  |
| 3 | [The New Siri’s Biggest Strength Is Not Intelligence](https://www.nngroup.com/articles/ai-assistant-context/) | article | [og](https://media.nngroup.com/media/articles/opengraph_images/The_New_Siri-1.png) | 9 min read | ✅ |  |
| 4 | [Context Libraries: How AI Power Users Manage Context Engineering](https://www.nngroup.com/articles/context-libraries/) | article | [og](https://media.nngroup.com/media/articles/opengraph_images/Context_Libraries-1.png) | 10 min read | ✅ |  |
| 5 | [Empathy Mapping: The First Step in Design Thinking](https://www.nngroup.com/articles/empathy-mapping/) | article | [og](https://media.nngroup.com/media/articles/opengraph_images/Empathy_Mapping-1.png) | 10 min read | ✅ |  |

## Smashing Magazine – Articles

- Site: https://www.smashingmagazine.com/articles/
- Feeds found: https://www.smashingmagazine.com/feed/ (rss, via link)
- Items in feed: 40
- Expected types: article · time 14.9s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Embracing Playful Imperfection With The CSS `random()` Function](https://smashingmagazine.com/2026/10/embracing-playful-imperfection-css-random-function/) | article | [feed](http://files.smashing.media/articles/embracing-playful-imperfection-css-random-function/embracing-playful-imperfection-css-random-function.jpg) | 15 min read | ✅ |  |
| 2 | [Is Your Organization Messing Up AI Adoption?](https://smashingmagazine.com/2026/10/is-your-organization-messing-up-ai-adoption/) | article | [feed](http://files.smashing.media/articles/is-your-organization-messing-up-ai-adoption/is-your-organization-messing-up-ai-adoption.jpg) | 10 min read | ✅ |  |
| 3 | [A Practical Guide To Naming Things](https://smashingmagazine.com/2026/10/how-name-things/) | article | [feed](http://files.smashing.media/articles/how-name-things-choose-accordion-icons/how-name-things.jpg) ⚠️ didn't load | 7 min read | ❌ |  |
| 4 | [Under Autumn’s Spell (October 2026 Wallpapers Edition)](https://smashingmagazine.com/2026/09/desktop-wallpaper-calendars-october-2026/) | article | [feed](http://archive.smashing.media/assets/344dbf88-fdf9-42bb-adb4-46f01eedd629/0fdda8cd-7c63-4b61-86f6-f3188d312aaf/oct-20-magical-october-preview-opt.png) | 9 min read | ✅ |  |
| 5 | [Stop Treating CSS Container Queries Like Traditional Media Queries](https://smashingmagazine.com/2026/09/stop-treating-css-container-queries-traditional-media-queries/) | article | [feed](http://files.smashing.media/articles/stop-treating-css-container-queries-traditional-media-queries/stop-treating-css-container-queries-traditional-media-queries.jpg) | 11 min read | ✅ |  |

## Figma Blog | Shortcut

- Site: https://www.figma.com/blog/
- Feeds found: https://www.figma.com/blog/feed/atom.xml (atom, via link); https://www.figma.com/blog/feed/feed.json (json, via link)
- Items in feed: 761
- Expected types: article · time 18.4s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Figma deepens investment in India with largest international Config ye](https://www.figma.com/blog/figma-deepens-investment-in-india/) | article | [og](https://cdn.sanity.io/images/599r6htc/regionalized/bbbd715863ae9596492a6b6eda14af49a9b802de-2400x1260.png?w=1200&q=70&fit=max&auto=format) | 4 min read | ✅ |  |
| 2 | [Build by design: New workflows for new ways of building](https://www.figma.com/blog/build-by-design/) | article | [og](https://cdn.sanity.io/images/599r6htc/regionalized/6fb8bfd609660ecc0fc8729137a58c451db49fe1-3840x2160.png?w=1200&q=70&fit=max&auto=format) | 6 min read | ✅ |  |
| 3 | [Design together with code layers on the canvas](https://www.figma.com/blog/design-together-with-code-layers/) | article | [og](https://cdn.sanity.io/images/599r6htc/regionalized/fd9f6ce97dbb2f1dadaf0baf1542447e73bcf51d-3840x2160.png?w=1200&q=70&fit=max&auto=format) | 7 min read | ✅ |  |
| 4 | [Introducing Specs: Markdown as a medium](https://www.figma.com/blog/introducing-figma-specs/) | article | [og](https://cdn.sanity.io/images/599r6htc/regionalized/d89a510a2d9768f462349e3355890e600a37c52f-3840x2160.png?w=1200&q=70&fit=max&auto=format) | 7 min read | ✅ |  |
| 5 | [Create, ship, and manage data-backed websites with Payload in Figma](https://www.figma.com/blog/websites-with-payload-in-figma/) | article | [og](https://cdn.sanity.io/images/599r6htc/regionalized/e2f3fa38dc26a6eb00e472ed04855ecfc34f1e64-3840x2160.png?w=1200&q=70&fit=max&auto=format) | 4 min read | ✅ |  |

## It's Nice That

- Site: https://www.itsnicethat.com/
- Feeds found: http://feeds2.feedburner.com/itsnicethat/SlXC (atom, via link)
- Items in feed: 20
- Expected types: article, image_set, video · time 14.2s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Why self-publishing pays off: No Ideas studio on the journey behind bu](https://www.itsnicethat.com/articles/nicer-tuesdays-new-york-september-no-ideas-201026) | video | [oembed](https://i.ytimg.com/vi/n5PkNF61z9w/hqdefault.jpg) | — | ✅ |  |
| 2 | [Studio Herrström gives disruptor music label a lightning logomark and ](https://www.itsnicethat.com/articles/studio-herrstrom-milkshake-graphic-design-201026) | article | [og](https://m.itsnicethat.com/original_images/studio-herrstrom-milkshake-graphic-design-project-itsnicethat-1.png?class=w1440) | 2 min read | ✅ |  |
| 3 | [Carolina Incerti’s A Book for Making Books is designed to be torn apar](https://www.itsnicethat.com/articles/carolina-incerti-a-book-for-making-books-publication-project-201026) | article | [og](https://m.itsnicethat.com/original_images/ABFMB_carolinaincerti_1.jpg?class=w1440) | 3 min read | ✅ |  |
| 4 | [See the process behind Laika’s stop-motion fantasy fable, Wildwood, in](https://www.itsnicethat.com/articles/laika-wildwood-london-exhibition-event-sponsored-content-201026) | article | [og](https://m.itsnicethat.com/original_images/LAIKA_Wildwood_2.jpg?class=w1440) | 3 min read | ✅ |  |
| 5 | [The era of the book trailer: why Somesuch Editions are promoting novel](https://www.itsnicethat.com/articles/somesuch-editions-book-trailers-film-publication-project-201026) | article | [og](https://m.itsnicethat.com/original_images/MARLOESHAARMANS_SOMESUCH_NOWBURNSBLUE_2_sggwhlY.jpeg?class=w1440) | 4 min read | ✅ |  |

## Awwwards Blog

- Site: https://www.awwwards.com/blog/
- Feeds found: https://www.awwwards.com/blog/feed/ (rss, via common-path)
- Items in feed: 30
- Expected types: article · time 25.5s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Razorpay Sprint26: The Future of Payments.](https://www.awwwards.com/razorpay-sprint26-the-future-of-payments.html) | article | [og](https://assets.awwwards.com/awards/images/2026/08/69f03e17c2e6f377520226.jpg) | 6 min read | ✅ |  |
| 2 | [Awwwards Interview — Bonhomme](https://www.awwwards.com/awwards-interview-bonhomme.html) | article | [og](https://assets.awwwards.com/awards/images/2026/08/5b894a01cecbb.jpg) | 5 min read | ✅ |  |
| 3 | [Floema: Spaces for people, made for life.](https://www.awwwards.com/floema-spaces-for-people-made-for-life.html) | article | [og](https://assets.awwwards.com/awards/images/2026/08/floema-cs-thumb.jpg) | 11 min read | ✅ |  |
| 4 | [Capitolium: A Digital Hub for a First-of-its-Kind Sports Collaboration](https://www.awwwards.com/capitolium-a-digital-hub-for-a-first-of-its-kind-sports-collaboration.html) | article | [og](https://assets.awwwards.com/awards/images/2026/07/69e9350bc520b242777543.jpg) | 4 min read | ✅ |  |
| 5 | [iyO - Case Study: selling the world's first audio computer](https://www.awwwards.com/iyo-case-study-selling-the-worlds-first-audio-computer.html) | article | [og](https://assets.awwwards.com/awards/images/2026/07/69a9a284df880582577799.jpg) | 8 min read | ✅ |  |

## Motionographer

- Site: https://motionographer.com/
- Feeds found: https://motionographer.com/feed/ (rss, via link); https://motionographer.com/comments/feed/ (rss, via link)
- Items in feed: 10
- Expected types: video, article · time 12.7s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [ROVE Launches a New Identity and Website, Signs Ashley McKim Consultin](https://motionographer.com/news/rove-new-brand-identity-website-ashley-mckim/) | article | [feed](https://i0.wp.com/motionographer.com/wp-content/uploads/2026/10/CleanShot-2026-10-19-at-6.53.01-PM%402x-scaled.png?fit=700%2C310&quality=80&ssl=1) | 2 min read | ✅ |  |
| 2 | [The Continuous Thread \| Tomakti Studio](https://motionographer.com/quickie/the-continuous-thread-tomakti-studio/) | video | [feed](https://i0.wp.com/motionographer.com/wp-content/uploads/2026/10/The-Continuous-Thread-Tomakti-cosmos.png?fit=700%2C298&quality=80&ssl=1) | 5:26 | ✅ |  |
| 3 | [Hypersail \| FutureDeluxe](https://motionographer.com/quickie/hypersail-futuredeluxe/) | video | [feed](https://i0.wp.com/motionographer.com/wp-content/uploads/2026/10/Hypersail-FutureDeluxe-cover-scaled.jpg?fit=700%2C394&quality=89&ssl=1) | 1:12 | ✅ |  |
| 4 | [What Is Dyslexia? \| Art&Graft](https://motionographer.com/quickie/what-is-dyslexia-artgraft/) | video | [feed](https://i0.wp.com/motionographer.com/wp-content/uploads/2026/10/What-Is-Dyslexia-ArtGraft-D_026.jpg?fit=700%2C394&quality=89&ssl=1) | 3:38 | ✅ |  |
| 5 | [Creative Must Win: The Belief Behind RevThink’s Tim Thompson](https://motionographer.com/2026/10/13/creative-must-win-the-belief-behind-revthinks-tim-thompson/) | article | [feed](https://i0.wp.com/motionographer.com/wp-content/uploads/2026/10/tim-thompson-portrait-loop-bw-v3-deeper-vignette.gif?fit=700%2C700&ssl=1) | 11 min read | ✅ |  |

## Google Design

- Site: https://design.google/
- Discovery warning: No feed advertised or at common paths
- Feeds found: none
- Expected types: article · time 3.7s

## UX Collective

- Site: https://uxdesign.cc/
- Discovery warning: Site page returned HTTP 403 (bot protection)
- Feeds found: https://uxdesign.cc/feed (rss, via common-path)
- Items in feed: 10
- Expected types: article · time 12.5s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Human attention is the new old bottleneck. We have to design for it ev](https://uxdesign.cc/anthropic-october-2026-study-human-attention-is-the-new-old-bottleneck-d7bc4642668a) | article | [content](https://cdn-images-1.medium.com/max/1024/1*sE14LY9q2J83iqFOPTgcmg.png) | 11 min read | ✅ | page HTTP 403 |
| 2 | [Playing the sanshin without a sound](https://uxdesign.cc/playing-the-sanshin-without-a-sound-3ac88df6f65c) | article | [content](https://cdn-images-1.medium.com/max/2400/1*-9c3qFwy0_rjTxZU4sUsqw.jpeg) | 1 min read | ✅ | page HTTP 403 |
| 3 | [Why design (still) matters, Taste is not a methodology, Borrowed slope](https://uxdesign.cc/why-design-still-matters-taste-is-not-a-methodology-borrowed-slopes-62701d4c33dc) | article | [content](https://cdn-images-1.medium.com/max/1024/0*_AFc-N6YBG0m1h14.png) | 3 min read | ✅ | page HTTP 403 |
| 4 | [What if AI sets us free?](https://uxdesign.cc/what-if-ai-sets-us-free-084f4310709b) | article | [content](https://cdn-images-1.medium.com/max/761/0*NDkwg7zEfl4MUzXA.jpeg) | 11 min read | ✅ | page HTTP 403 |
| 5 | [UX designers are not designing interfaces, they design personalities](https://uxdesign.cc/ux-designers-are-not-designing-interfaces-they-design-personalities-d94d874bb43d) | article | [content](https://cdn-images-1.medium.com/max/1024/0*AN3LC1K2RIhbxkXx) | 12 min read | ✅ | page HTTP 403 |

## Dive Club

- Site: https://www.youtube.com/@joindiveclub
- Feeds found: https://www.youtube.com/feeds/videos.xml?channel_id=UCkCnraWwlnBw1_i7C9-3p0w (atom, via youtube)
- Items in feed: 15
- Expected types: video · time 4.6s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Kyle Barber - Designing Inflight (the raw behind-the-scenes)](https://www.youtube.com/watch?v=0FQC0mu5Z00) | video | [feed](https://i1.ytimg.com/vi/0FQC0mu5Z00/hqdefault.jpg) | — | ✅ |  |
| 2 | [Dive Radio: Get Your Portfolio Reviewed](https://www.youtube.com/watch?v=J3NB3migbE0) | video | [feed](https://i3.ytimg.com/vi/J3NB3migbE0/hqdefault.jpg) | — | ✅ |  |
| 3 | [Myles Palmer - Building Custom AI Tools at Metalab](https://www.youtube.com/watch?v=eWTXkbZxAQo) | video | [feed](https://i2.ytimg.com/vi/eWTXkbZxAQo/hqdefault.jpg) | — | ✅ |  |
| 4 | ["Cats" 🐾 #googledesign #googleux #design #podcast #diveclub](https://www.youtube.com/shorts/I11v5cOCWog) | video | [feed](https://i2.ytimg.com/vi/I11v5cOCWog/hqdefault.jpg) | — | ✅ |  |
| 5 | [The types of portfolios that get designers hired](https://www.youtube.com/watch?v=0pfidFgk7G8) | video | [feed](https://i1.ytimg.com/vi/0pfidFgk7G8/hqdefault.jpg) | — | ✅ |  |

## Built for Mars

- Site: https://builtformars.com/
- Discovery warning: No feed advertised or at common paths
- Feeds found: none
- Expected types: article · time 5.2s

## CreativeApplications.Net

- Site: https://www.creativeapplications.net/
- Feeds found: https://www.creativeapplications.net/feed/ (rss, via common-path)
- Items in feed: 1
- Expected types: article, image_set · time 8.9s

| # | Title | Type | Image | Cost | Card | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [RSS Feed Inactive](https://www.creativeapplications.net/register/?pk_campaign=rss-feed&pk_source=feed&pk_medium=rss) | article | [og](https://www.creativeapplications.net/wp-content/uploads/2023/09/slideshow_400.gif) | 5 min read | ✅ |  |

## Gorilla Newsletter 102

Not run: Couldn't identify the site — need a URL from Matt.
