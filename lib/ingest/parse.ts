import { parseFeed } from "feedsmith";
import type { FeedFormat, MediaRef, ParsedFeed, RawItem } from "./types";
import { absoluteUrl } from "./http";
import { htmlToText } from "./html";

/** Cheap check before handing a body to the XML/JSON parser. */
export function looksLikeFeed(body: string, contentType = ""): boolean {
  const head = body.replace(/^﻿/, "").trimStart().slice(0, 1024).toLowerCase();
  if (head.startsWith("{")) return head.includes("jsonfeed.org");
  if (/<html[\s>]/.test(head) || head.startsWith("<!doctype html")) return false;
  if (/<(rss|feed|rdf:rdf)[\s>]/.test(head)) return true;
  return /(rss|atom|xml)/.test(contentType) && head.startsWith("<?xml");
}

/** Parse RSS / Atom / RDF / JSON Feed into one shape. Items are deduped by guid. Throws on unparseable input. */
export function parseFeedDocument(body: string, feedUrl: string): ParsedFeed {
  const { format, feed } = parseFeed(body.replace(/^﻿/, "").trim());
  const f = feed as AnyRecord;
  const siteUrl =
    format === "atom"
      ? atomLink(f.links, "alternate")
      : format === "json"
        ? str(f.home_page_url)
        : str(f.link);

  const rawEntries: AnyRecord[] = (format === "atom" ? f.entries : f.items) ?? [];
  const base = siteUrl ? (absoluteUrl(siteUrl, feedUrl) ?? feedUrl) : feedUrl;
  const items: RawItem[] = [];
  const seen = new Set<string>();
  for (const entry of rawEntries) {
    const item = normaliseEntry(format as FeedFormat, entry, base);
    if (!item || seen.has(item.guid)) continue;
    seen.add(item.guid);
    items.push(item);
  }
  return { format: format as FeedFormat, title: text(f.title), siteUrl: base, items };
}

function normaliseEntry(format: FeedFormat, e: AnyRecord, base: string): RawItem | null {
  let url: string | undefined;
  let guid: string | undefined;
  let summary: string | undefined;
  let contentHtml: string | undefined;
  let publishedAt: string | undefined;
  let author: string | undefined;
  const media: MediaRef[] = [];

  if (format === "atom") {
    url = atomLink(e.links, "alternate") ?? atomLink(e.links);
    guid = str(e.id);
    summary = text(e.summary);
    contentHtml = text(e.content);
    publishedAt = str(e.published) ?? str(e.updated);
    author = str(e.authors?.[0]?.name);
    for (const l of e.links ?? []) {
      if (l?.rel === "enclosure" && l.href) {
        media.push(mediaRef(l.href, l.type, undefined, "enclosure"));
      }
    }
    if (e.yt?.videoId && !url) url = `https://www.youtube.com/watch?v=${e.yt.videoId}`;
  } else if (format === "json") {
    url = str(e.url) ?? str(e.external_url);
    guid = str(e.id);
    summary = str(e.summary) ?? str(e.content_text);
    contentHtml = str(e.content_html);
    publishedAt = str(e.date_published) ?? str(e.date_modified);
    author = str(e.authors?.[0]?.name) ?? str(e.author?.name);
    for (const img of [e.image, e.banner_image]) {
      if (str(img)) media.push({ url: img, kind: "image", from: "json" });
    }
    for (const a of e.attachments ?? []) {
      if (a?.url) media.push(mediaRef(a.url, a.mime_type, undefined, "json"));
    }
  } else {
    // rss + rdf
    url = str(e.link);
    guid = str(e.guid?.value) ?? str(e.guid);
    summary = str(e.description);
    contentHtml = str(e.content?.encoded);
    publishedAt = str(e.pubDate) ?? str(e.dc?.dates?.[0]) ?? str(e.dc?.date);
    author = str(e.dc?.creators?.[0]) ?? str(e.dc?.creator) ?? str(e.authors?.[0]);
    for (const enc of e.enclosures ?? []) {
      if (enc?.url) media.push(mediaRef(enc.url, enc.type, undefined, "enclosure"));
    }
    if (str(e.itunes?.image)) media.push({ url: e.itunes.image, kind: "image", from: "itunes" });
  }

  media.push(...mediaNamespace(e.media));
  // YouTube and some podcast feeds only describe the item inside media:group.
  summary ??= text(e.media?.description) ?? text(e.media?.groups?.[0]?.description);

  // Untitled posts (micro-blogs, JSON Feed notes) borrow their opening words.
  const fallback = summary ?? contentHtml;
  const title = text(e.title) ?? (fallback ? htmlToText(fallback).slice(0, 120) : undefined);
  const absUrl = stripTracking(absoluteUrl(url, base));
  if (!title || !absUrl) return null;

  return {
    guid: guid?.trim() || absUrl,
    url: absUrl,
    title: htmlToText(title).trim(),
    summary,
    contentHtml,
    author,
    publishedAt: isoDate(publishedAt),
    media: dedupeMedia(
      media.map((m) => ({ ...m, url: absoluteUrl(m.url, absUrl) ?? "" })).filter((m) => m.url),
    ),
  };
}

function mediaNamespace(ns: AnyRecord | undefined): MediaRef[] {
  if (!ns) return [];
  const out: MediaRef[] = [];
  const fromBlock = (b: AnyRecord) => {
    for (const c of b.contents ?? []) {
      if (!c?.url) continue;
      out.push({
        ...mediaRef(c.url, c.type, c.medium, "media"),
        width: num(c.width),
        height: num(c.height),
        durationSeconds: num(c.duration),
      });
      for (const t of c.thumbnails ?? []) out.push(thumb(t));
    }
    for (const t of b.thumbnails ?? []) out.push(thumb(t));
  };
  fromBlock(ns);
  for (const g of ns.groups ?? []) fromBlock(g);
  return out.filter((m) => m.url);
}

const thumb = (t: AnyRecord): MediaRef => ({
  url: str(t?.url) ?? "",
  kind: "image",
  width: num(t?.width),
  height: num(t?.height),
  from: "media",
});

function mediaRef(
  url: string,
  mime: string | undefined,
  medium: string | undefined,
  from: MediaRef["from"],
): MediaRef {
  const m = (mime ?? "").toLowerCase();
  let kind: MediaRef["kind"] = "other";
  if (medium === "image" || m.startsWith("image/")) kind = "image";
  else if (medium === "video" || m.startsWith("video/") || m.includes("shockwave")) kind = "video";
  else if (medium === "audio" || m.startsWith("audio/")) kind = "audio";
  else if (!m && /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) kind = "image";
  return { url, kind, mime: mime || undefined, from };
}

function dedupeMedia(list: MediaRef[]): MediaRef[] {
  const seen = new Set<string>();
  return list.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));
}

function atomLink(links: AnyRecord[] | undefined, rel?: string): string | undefined {
  if (!Array.isArray(links)) return undefined;
  const match = links.find((l) => l?.href && (rel ? (l.rel ?? "alternate") === rel : true));
  return str(match?.href);
}

/** Drop utm_* and feed-source params so links are clean and stable. */
export function stripTracking(url: string | undefined): string | undefined {
  if (!url) return url;
  const u = new URL(url);
  for (const key of [...u.searchParams.keys()]) {
    if (/^utm_/i.test(key) || (key === "source" && /^rss/i.test(u.searchParams.get(key) ?? ""))) {
      u.searchParams.delete(key);
    }
  }
  return u.toString();
}

function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// feedsmith's per-format types are a deep union; we read them defensively instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function text(v: unknown): string | undefined {
  if (typeof v === "string") return str(v);
  if (v && typeof v === "object" && "value" in v) return str((v as { value: unknown }).value);
  return undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}
