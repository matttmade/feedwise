import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { PageMeta } from "./types";
import { absoluteUrl } from "./http";

const FEED_TYPES = [
  "application/rss+xml",
  "application/atom+xml",
  "application/feed+json",
  "application/json",
  "application/rdf+xml",
  "application/xml",
  "text/xml",
];

// Scripts never run and subresources never load; this only builds a DOM.
const quiet = new VirtualConsole();

export function parseHtml(html: string, url: string): Document {
  return new JSDOM(html, { url, virtualConsole: quiet }).window.document;
}

export function htmlToText(html: string): string {
  if (!/[<&]/.test(html)) return html.replace(/\s+/g, " ").trim();
  const frag = JSDOM.fragment(`<div>${html}</div>`);
  frag.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  return (frag.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export type FeedLink = { url: string; type: string; title?: string };

/** <link rel="alternate" type="…rss/atom/json…"> in document order, comment feeds last. */
export function findFeedLinks(doc: Document, baseUrl: string): FeedLink[] {
  const out: FeedLink[] = [];
  for (const el of Array.from(doc.querySelectorAll("link[rel][href]"))) {
    const rel = (el.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    const type = (el.getAttribute("type") ?? "").toLowerCase().trim();
    if (!rel.includes("alternate") || !FEED_TYPES.includes(type)) continue;
    // Plain JSON alternates are usually oEmbed/REST, not JSON Feed.
    const href = el.getAttribute("href") ?? "";
    if (type === "application/json" && !/feed/i.test(href)) continue;
    const url = absoluteUrl(href, baseUrl);
    if (url && !out.some((f) => f.url === url)) {
      out.push({ url, type, title: el.getAttribute("title") ?? undefined });
    }
  }
  const isComments = (f: FeedLink) => /comment/i.test(`${f.title} ${f.url}`);
  return [...out.filter((f) => !isComments(f)), ...out.filter(isComments)];
}

export function extractPageMeta(doc: Document, url: string): PageMeta {
  const meta = (...keys: string[]) => {
    for (const k of keys) {
      const el = doc.querySelector(
        `meta[property="${k}"], meta[name="${k}"], meta[itemprop="${k}"]`,
      );
      const v = el?.getAttribute("content")?.trim();
      if (v) return v;
    }
    return undefined;
  };
  const int = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  return {
    title: meta("og:title", "twitter:title") ?? doc.title?.trim() ?? undefined,
    description: meta("og:description", "twitter:description", "description"),
    ogType: meta("og:type")?.toLowerCase(),
    image: absoluteUrl(
      meta("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"),
      url,
    ),
    imageWidth: int(meta("og:image:width")),
    imageHeight: int(meta("og:image:height")),
    videoUrl: absoluteUrl(meta("og:video:secure_url", "og:video:url", "og:video"), url),
    durationSeconds: parseDuration(meta("video:duration", "duration")),
    siteName: meta("og:site_name"),
  };
}

/** ISO-8601 (PT1H2M3S) or plain seconds. */
export function parseDuration(v: string | undefined): number | undefined {
  if (!v) return undefined;
  if (/^\d+$/.test(v)) return Number(v);
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(v);
  if (!m) return undefined;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  const total = d * 86400 + h * 3600 + min * 60 + s;
  return total > 0 ? Math.round(total) : undefined;
}

const JUNK_IMAGE =
  /(feedburner|feeds\.feedblitz|pixel|tracking|gravatar\.com|\/avatar|emoji|wp-includes\/images|stat\?|\.svg(\?|$)|spacer|blank\.gif|1x1)/i;

// Share-card fallbacks that sites use when a post has no image of its own.
const GENERIC_IMAGE = /[/_-](social|share|default|og-default|placeholder|logo)[-_.]/i;

export function isGenericImage(src: string): boolean {
  return GENERIC_IMAGE.test(new URL(src, "https://x.invalid").pathname);
}

export function isUsefulImage(src: string, width?: number, height?: number): boolean {
  if (JUNK_IMAGE.test(src)) return false;
  if ((width !== undefined && width < 80) || (height !== undefined && height < 80)) return false;
  return true;
}

export type ContentImage = { url: string; width?: number; height?: number };

/** Images in body HTML, skipping trackers, avatars and icons. */
export function contentImages(html: string, baseUrl: string): ContentImage[] {
  const frag = JSDOM.fragment(`<div>${html}</div>`);
  const out: ContentImage[] = [];
  for (const img of Array.from(frag.querySelectorAll("img"))) {
    const srcset = img.getAttribute("srcset") ?? img.getAttribute("data-srcset");
    const raw =
      img.getAttribute("src") ??
      img.getAttribute("data-src") ??
      img.getAttribute("data-lazy-src") ??
      srcset?.split(",")[0]?.trim().split(/\s+/)[0];
    const url = absoluteUrl(raw?.startsWith("data:") ? undefined : raw, baseUrl);
    const width = num(img.getAttribute("width"));
    const height = num(img.getAttribute("height"));
    if (url && isUsefulImage(url, width, height) && !out.some((i) => i.url === url)) {
      out.push({ url, width, height });
    }
  }
  return out;
}

/** YouTube / Vimeo watch URLs for iframes and links embedded in body HTML. */
export function videoEmbeds(html: string): string[] {
  const out = new Set<string>();
  const re =
    /(?:src|href)=["']([^"']*(?:youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com)[^"']*)["']/gi;
  for (const m of html.matchAll(re)) {
    const url = canonicalVideoUrl(m[1].replace(/&amp;/g, "&"));
    if (url) out.add(url);
  }
  return [...out];
}

/**
 * Video players embedded in the page's main content. Readability strips iframes, so read the
 * page DOM directly, scoped to the article to avoid sidebar/footer players.
 */
export function pageVideoEmbeds(doc: Document): string[] {
  const root =
    doc.querySelector("article, [itemprop=articleBody], .entry-content, main, [role=main]") ??
    doc.body;
  const out = new Set<string>();
  for (const el of Array.from(root?.querySelectorAll("iframe, embed, video source, video") ?? [])) {
    const src = el.getAttribute("src") ?? el.getAttribute("data-src") ?? "";
    const url = canonicalVideoUrl(src);
    if (url) out.add(url);
  }
  if (out.size === 0) {
    // Client-rendered pages often ship the embed inside escaped JSON instead of the DOM.
    const html = doc.documentElement.outerHTML.replace(/\\\//g, "/");
    const re =
      /(?:youtube(?:-nocookie)?\.com\/embed\/[\w-]{6,}|player\.vimeo\.com\/video\/\d{5,})/g;
    for (const m of html.matchAll(re)) {
      const url = canonicalVideoUrl(`https://${m[0]}`);
      if (url) out.add(url);
    }
  }
  return [...out];
}

export function youtubeId(url: string): string | undefined {
  try {
    const u = new URL(url, "https://www.youtube.com");
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || undefined;
    if (host !== "youtube.com" && host !== "youtube-nocookie.com") return undefined;
    if (u.pathname === "/watch") return u.searchParams.get("v") ?? undefined;
    const m = /^\/(?:embed|shorts|v|live)\/([\w-]{6,})/.exec(u.pathname);
    return m?.[1];
  } catch {
    return undefined;
  }
}

export function vimeoId(url: string): string | undefined {
  try {
    const u = new URL(url, "https://vimeo.com");
    if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return undefined;
    return /\/(?:video\/)?(\d{5,})(?:\/|$)/.exec(u.pathname)?.[1];
  } catch {
    return undefined;
  }
}

export function canonicalVideoUrl(url: string): string | undefined {
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube.com/watch?v=${yt}`;
  const vm = vimeoId(url);
  if (vm) return `https://vimeo.com/${vm}`;
  return undefined;
}

export type Readable = { html: string; text: string; excerpt?: string };

/** Mozilla Readability on a parsed page. Returns null when it can't find an article. */
export function readable(doc: Document): Readable | null {
  const clone = doc.cloneNode(true) as Document;
  const article = new Readability(clone, { charThreshold: 250 }).parse();
  if (!article?.content) return null;
  return {
    html: article.content,
    text: (article.textContent ?? "").replace(/\s+/g, " ").trim(),
    excerpt: article.excerpt ?? undefined,
  };
}

function num(v: string | null): number | undefined {
  if (!v || !/^\d+$/.test(v.trim())) return undefined;
  return Number(v);
}
