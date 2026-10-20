import type { DiscoverResult, DiscoveredFeed, Fetcher } from "./types";
import { absoluteUrl, assertHttpUrl, errorMessage, httpGet, mapLimit } from "./http";
import { extractPageMeta, findFeedLinks, parseHtml } from "./html";
import { looksLikeFeed, parseFeedDocument } from "./parse";

export const COMMON_PATHS = [
  "/feed",
  "/rss",
  "/atom.xml",
  "/index.xml",
  "/feed.xml",
  "/rss.xml",
  "/feed.json",
  "/feed/rss/",
  "/feeds/posts/default",
];

const FEED_ACCEPT =
  "application/rss+xml, application/atom+xml, application/feed+json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5";

type Options = { fetcher?: Fetcher; maxCandidates?: number };

/**
 * Find the feeds for a site. Order: the URL itself is a feed → YouTube channel rules →
 * <link rel=alternate> → common paths. Every returned feed has been fetched and parsed.
 */
export async function discoverFeeds(input: string, opts: Options = {}): Promise<DiscoverResult> {
  const { fetcher, maxCandidates = 4 } = opts;
  const siteUrl = normaliseInput(input);

  const direct = youtubeChannelFeed(siteUrl);
  if (direct) {
    const { feed, error } = await probeFeed(direct, "youtube", fetcher);
    return { siteUrl, feeds: feed ? [feed] : [], warning: error };
  }

  let warning: string | undefined;
  let siteImage: string | undefined;
  let pageUrl = siteUrl;
  const candidates: { url: string; via: DiscoveredFeed["via"] }[] = [];

  try {
    const page = await httpGet(siteUrl, { fetcher, accept: `text/html, ${FEED_ACCEPT}` });
    pageUrl = page.url;
    if (page.ok && looksLikeFeed(page.text, page.contentType)) {
      const feed = toDiscovered(page.url, page.text, "self");
      if (feed) return { siteUrl, feeds: [feed] };
    }
    if (page.ok) {
      const doc = parseHtml(page.text, page.url);
      siteImage = extractPageMeta(doc, page.url).image;
      for (const link of findFeedLinks(doc, page.url))
        candidates.push({ url: link.url, via: "link" });
      const yt = youtubeChannelIdFromPage(page.text, page.url);
      if (yt) candidates.unshift({ url: ytFeed(yt), via: "youtube" });
    } else {
      warning = `Site page returned HTTP ${page.status}${botWall(page) ? " (bot protection)" : ""}`;
    }
  } catch (err) {
    warning = `Site page failed: ${errorMessage(err)}`;
  }

  const found: DiscoveredFeed[] = [];
  const failures: string[] = [];
  for (const c of dedupe(candidates).slice(0, maxCandidates)) {
    const probe = await probeFeed(c.url, c.via, fetcher);
    if (probe.feed) found.push(probe.feed);
    else failures.push(`${c.url}: ${probe.error}`);
  }
  if (found.length) return { siteUrl, feeds: found, siteImage, warning };
  if (failures.length) {
    warning = [warning, `Advertised feed failed — ${failures.join("; ")}`]
      .filter(Boolean)
      .join(". ");
  }

  // Nothing advertised (or page blocked): guess paths under the given path, then the origin.
  const guesses = await mapLimit(guessUrls(pageUrl), 4, (url) =>
    probeFeed(url, "common-path", fetcher),
  );
  const guessed = guesses.find((p) => p.feed)?.feed;
  if (guessed) return { siteUrl, feeds: [guessed], siteImage, warning };
  return {
    siteUrl,
    feeds: [],
    siteImage,
    warning: warning ?? "No feed advertised or at common paths",
  };
}

export function normaliseInput(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return assertHttpUrl(withScheme).toString();
}

export function guessUrls(pageUrl: string): string[] {
  const u = new URL(pageUrl);
  const bases = new Set<string>();
  const path = u.pathname.replace(/\/+$/, "");
  if (path) bases.add(`${u.origin}${path}`);
  bases.add(u.origin);
  const out: string[] = [];
  for (const base of bases) for (const p of COMMON_PATHS) out.push(`${base}${p}`);
  return out;
}

const ytFeed = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

/** /channel/UC… URLs map straight to a feed; handles (@name) need the page. */
export function youtubeChannelFeed(url: string): string | undefined {
  const u = new URL(url);
  if (!/(^|\.)youtube\.com$/.test(u.hostname)) return undefined;
  if (u.pathname === "/feeds/videos.xml") return url;
  const m = /^\/channel\/(UC[\w-]{20,})/.exec(u.pathname);
  return m ? ytFeed(m[1]) : undefined;
}

export function youtubeChannelIdFromPage(html: string, pageUrl: string): string | undefined {
  if (!/(^|\.)youtube\.com$/.test(new URL(pageUrl).hostname)) return undefined;
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{20,})"/,
    /<meta itemprop="identifier" content="(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /feeds\/videos\.xml\?channel_id=(UC[\w-]{20,})/,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[1];
  }
  return undefined;
}

type Probe = { feed: DiscoveredFeed | null; error?: string };

async function probeFeed(
  url: string,
  via: DiscoveredFeed["via"],
  fetcher?: Fetcher,
): Promise<Probe> {
  try {
    const res = await httpGet(url, { fetcher, accept: FEED_ACCEPT });
    if (!res.ok) {
      return { feed: null, error: `HTTP ${res.status}${botWall(res) ? " (bot protection)" : ""}` };
    }
    if (!looksLikeFeed(res.text, res.contentType)) return { feed: null, error: "not a feed" };
    const feed = toDiscovered(res.url, res.text, via);
    return feed ? { feed } : { feed: null, error: "feed did not parse" };
  } catch (err) {
    return { feed: null, error: errorMessage(err) };
  }
}

function toDiscovered(
  url: string,
  body: string,
  via: DiscoveredFeed["via"],
): DiscoveredFeed | null {
  try {
    const parsed = parseFeedDocument(body, url);
    return { url, format: parsed.format, title: parsed.title, via };
  } catch {
    return null;
  }
}

function botWall(res: { headers: Headers; text: string }): boolean {
  return (
    res.headers.has("cf-mitigated") ||
    /sucuri|captcha|challenge-platform|Just a moment/i.test(res.text.slice(0, 4000))
  );
}

function dedupe<T extends { url: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = absoluteUrl(c.url, c.url) ?? c.url;
    return seen.has(key) ? false : (seen.add(key), true);
  });
}
