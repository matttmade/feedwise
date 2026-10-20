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
