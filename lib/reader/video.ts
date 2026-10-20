import { vimeoId, youtubeId } from "@/lib/ingest/html";

/**
 * Player URL for an item's video, built by us from a YouTube/Vimeo id rather than trusting
 * stored embed HTML. Autoplay is set because it only loads after the user presses Play.
 */
export function playerSrc(itemUrl: string, embedHtml: string | null): string | null {
  const embedSrc = embedHtml?.match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
  for (const candidate of [itemUrl, embedSrc]) {
    if (!candidate) continue;
    const yt = youtubeId(candidate);
    if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`;
    const vm = vimeoId(candidate);
    if (vm) return `https://player.vimeo.com/video/${vm}?autoplay=1&dnt=1`;
  }
  return null;
}
