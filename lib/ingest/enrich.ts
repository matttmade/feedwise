import type { EnrichedItem, Fetcher, ItemType, MediaRef, PageMeta, RawItem } from "./types";
import { errorMessage, httpGet } from "./http";
import {
  canonicalVideoUrl,
  contentImages,
  extractPageMeta,
  htmlToText,
  isGenericImage,
  isUsefulImage,
  pageVideoEmbeds,
  parseHtml,
  readable,
  videoEmbeds,
  vimeoId,
  wordCount,
  youtubeId,
  type Readable,
} from "./html";

export const WORDS_PER_MINUTE = 230;
const SUMMARY_MAX = 280;

type Options = {
  fetcher?: Fetcher;
  /** Fetch the item's page for og:image + Readability. Off = feed data only. */
  fetchPage?: boolean;
  /** The site's own og:image. An item whose og:image equals it has no image of its own. */
  siteImage?: string;
};

export type OEmbed = {
  html?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  duration?: number;
  title?: string;
};

/** Feed item → card-ready item: lead image, type, embed, clean body, read time. Never throws. */
export async function enrichItem(item: RawItem, opts: Options = {}): Promise<EnrichedItem> {
  const { fetcher, fetchPage = true, siteImage } = opts;
  const notes: string[] = [];
  const ownVideo = canonicalVideoUrl(item.url);

  let meta: PageMeta = {};
  let read: Readable | null = null;
  let pageEmbeds: string[] = [];
  // Video pages (YouTube/Vimeo) are heavy and oEmbed gives us what we need.
  if (fetchPage && !ownVideo) {
    try {
      const page = await httpGet(item.url, { fetcher, accept: "text/html,*/*;q=0.8" });
      if (!page.ok) notes.push(`page HTTP ${page.status}`);
      else if (!/html/i.test(page.contentType)) notes.push(`page is ${page.contentType}`);
      else {
        const doc = parseHtml(page.text, page.url);
        meta = extractPageMeta(doc, page.url);
        read = readable(doc);
        pageEmbeds = pageVideoEmbeds(doc);
      }
    } catch (err) {
      notes.push(`page failed: ${errorMessage(err)}`);
    }
  }

  const feedHtml = item.contentHtml ?? item.summary ?? "";
  const feedText = feedHtml ? htmlToText(feedHtml) : "";
  // Prefer Readability, unless the page was a stub (paywall, consent wall) and the feed has more.
  const useRead = read !== null && wordCount(read.text) >= Math.min(wordCount(feedText), 80);
  const bodyHtml = useRead ? read!.html : feedHtml || null;
  const bodyText = useRead ? read!.text : feedText;
  const words = wordCount(bodyText);

  const images = bodyHtml ? contentImages(bodyHtml, item.url) : [];
  const embeds = [...new Set([...videoEmbeds(feedHtml), ...pageEmbeds])];
  const type = detectType({ item, ownVideo, meta, words, images: images.length, embeds });

  let embedHtml: string | null = null;
  let oembed: OEmbed | null = null;
  const videoUrl = type === "video" ? (ownVideo ?? embeds[0]) : undefined;
  if (videoUrl) {
    try {
      oembed = await fetchOEmbed(videoUrl, fetcher);
      embedHtml = oembed?.html ?? null;
      if (!oembed) notes.push("no oEmbed provider");
    } catch (err) {
      notes.push(`oEmbed failed: ${errorMessage(err)}`);
    }
  }

  if (siteImage && meta.image === siteImage) {
    meta = { ...meta, image: undefined };
    notes.push("og:image is the site default");
  }
  const lead = pickLeadImage(item.media, meta, images, oembed);

  return {
    guid: item.guid,
    url: item.url,
    title: item.title,
    summary: summarise(item, meta, read),
    type,
    leadImageUrl: lead?.url ?? null,
    leadImageSource: lead?.source ?? null,
    media: item.media,
    embedHtml,
    bodyHtml: type === "video" ? feedHtml || null : bodyHtml,
    readMinutes: type === "video" || words === 0 ? null : readMinutes(words),
    durationSeconds:
      item.media.find((m) => m.durationSeconds)?.durationSeconds ??
      oembed?.duration ??
      meta.durationSeconds ??
      null,
    publishedAt: item.publishedAt ?? null,
    notes,
  };
}

export function readMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function detectType(x: {
  item: RawItem;
  ownVideo?: string;
  meta: PageMeta;
  words: number;
  images: number;
  embeds: string[];
}): ItemType {
  if (x.ownVideo) return "video";
  if (x.meta.ogType?.startsWith("video")) return "video";
  const feedVideo = x.item.media.some((m) => m.kind === "video" && canonicalVideoUrl(m.url));
  // One player with a caption is a video. A long read with an embed, or a showcase with
  // several clips, is an article that contains video.
  if ((feedVideo || x.embeds.length === 1) && x.words < 400) return "video";
  if (x.images >= 4 && x.words < 40 * x.images) return "image_set";
  return "article";
}

type Lead = { url: string; source: NonNullable<EnrichedItem["leadImageSource"]> };

/** Feed media → og:image → first content image → oEmbed thumbnail. */
export function pickLeadImage(
  media: MediaRef[],
  meta: PageMeta,
  images: { url: string; width?: number; height?: number }[],
  oembed: OEmbed | null,
): Lead | null {
  const feedImages = media
    .filter((m) => m.kind === "image" && isUsefulImage(m.url, m.width, m.height))
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  if (feedImages[0]) return { url: feedImages[0].url, source: "feed" };
  if (
    meta.image &&
    !isGenericImage(meta.image) &&
    isUsefulImage(meta.image, meta.imageWidth, meta.imageHeight)
  ) {
    return { url: meta.image, source: "og" };
  }
  if (images[0]) return { url: images[0].url, source: "content" };
  if (oembed?.thumbnail_url) return { url: oembed.thumbnail_url, source: "oembed" };
  return null;
}

export function oembedEndpoint(videoUrl: string): string | undefined {
  const q = encodeURIComponent(videoUrl);
  if (youtubeId(videoUrl)) return `https://www.youtube.com/oembed?format=json&url=${q}`;
  if (vimeoId(videoUrl)) return `https://vimeo.com/api/oembed.json?url=${q}`;
  return undefined;
}

export async function fetchOEmbed(videoUrl: string, fetcher?: Fetcher): Promise<OEmbed | null> {
  const endpoint = oembedEndpoint(videoUrl);
  if (!endpoint) return null;
  const res = await httpGet(endpoint, { fetcher, accept: "application/json" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return JSON.parse(res.text) as OEmbed;
}

function summarise(item: RawItem, meta: PageMeta, read: Readable | null): string | null {
  const source = item.summary ?? item.contentHtml;
  let text = source ? htmlToText(source) : "";
  if (!text) text = meta.description ?? read?.excerpt ?? "";
  text = text.trim();
  if (!text) return null;
  if (text.length <= SUMMARY_MAX) return text;
  const cut = text.slice(0, SUMMARY_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 200 ? cut.lastIndexOf(" ") : SUMMARY_MAX)}…`;
}
