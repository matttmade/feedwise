import { vimeoId, youtubeId } from "@/lib/ingest/html";

export type PlayerOptions = {
  /** Start muted (Watch mode). The viewer can unmute in the player. */
  muted?: boolean;
  captions?: boolean;
};

/**
 * Player URL for an item's video, built by us from a YouTube/Vimeo id rather than trusting
 * stored embed HTML. It autoplays because it only loads after Play (or the autoplay setting).
 */
export function playerSrc(
  itemUrl: string,
  embedHtml: string | null,
  opts: PlayerOptions = {},
): string | null {
  const embedSrc = embedHtml?.match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
  for (const candidate of [itemUrl, embedSrc]) {
    if (!candidate) continue;
    const yt = youtubeId(candidate);
    if (yt) {
      const q = new URLSearchParams({
        autoplay: "1",
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
      });
      if (opts.muted) q.set("mute", "1");
      if (opts.captions) q.set("cc_load_policy", "1");
      return `https://www.youtube-nocookie.com/embed/${yt}?${q}`;
    }
    const vm = vimeoId(candidate);
    if (vm) {
      const q = new URLSearchParams({ autoplay: "1", dnt: "1", playsinline: "1" });
      if (opts.muted) q.set("muted", "1");
      if (opts.captions) q.set("texttrack", "en");
      return `https://player.vimeo.com/video/${vm}?${q}`;
    }
  }
  return null;
}
