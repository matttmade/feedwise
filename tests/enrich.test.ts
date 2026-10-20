import { describe, expect, it } from "vitest";
import { detectType, enrichItem, readMinutes } from "../lib/ingest/enrich";
import { parseFeedDocument } from "../lib/ingest/parse";
import type { RawItem } from "../lib/ingest/types";
import { fixture, fixtureFetcher } from "./helpers";

const items = (file: string, url: string) => parseFeedDocument(fixture(file), url).items;

const raw = (over: Partial<RawItem>): RawItem => ({
  guid: over.url ?? "x",
  url: "https://mag.example.com/post/",
  title: "A post",
  media: [],
  ...over,
});

const YT_OEMBED = (id: string) =>
  `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
const VIMEO_OEMBED = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent("https://vimeo.com/1186261079")}`;

describe("enrichItem", () => {
  it("article: og:image when the feed has none, Readability body, read time, ignores sidebar video", async () => {
    const url = "https://mag.example.com/2026/10/random/";
    const { fetcher } = fixtureFetcher({ [url]: { file: "pages/article.html" } });
    const item = await enrichItem(raw({ url, summary: "Playful demos." }), { fetcher });
    expect(item.type).toBe("article");
    expect(item.leadImageUrl).toBe("https://mag.example.com/uploads/random-hero.jpg");
    expect(item.leadImageSource).toBe("og");
    expect(item.bodyHtml).toContain("Design systems thrive");
    expect(item.bodyHtml).not.toContain("<footer");
    expect(item.readMinutes).toBeGreaterThanOrEqual(4);
    expect(item.readMinutes).toBeLessThanOrEqual(6);
    expect(item.embedHtml).toBeNull();
    expect(item.summary).toBe("Playful demos.");
  });

  it("video post: feed image wins, Vimeo iframe → video with oEmbed embed + duration", async () => {
    const [hypersail] = items("feeds/wordpress-media.xml", "https://motion.example.com/feed/");
    const { fetcher } = fixtureFetcher({
      [hypersail.url]: { file: "pages/video-post.html" },
      [VIMEO_OEMBED]: { file: "oembed-vimeo.json" },
    });
    const item = await enrichItem(hypersail, { fetcher });
    expect(item.type).toBe("video");
    expect(item.leadImageSource).toBe("feed");
    expect(item.leadImageUrl).toBe("https://cdn.example.com/hypersail-cover.jpg?fit=700%2C394");
    expect(item.embedHtml).toContain("player.vimeo.com/video/1186261079");
    expect(item.durationSeconds).toBe(72);
    expect(item.readMinutes).toBeNull();
  });

  it("YouTube entry: no page fetch, feed thumbnail, oEmbed player", async () => {
    const [video] = items(
      "feeds/youtube.xml",
      "https://www.youtube.com/feeds/videos.xml?channel_id=x",
    );
    const { fetcher, calls } = fixtureFetcher({
      [YT_OEMBED("0FQC0mu5Z00")]: { file: "oembed-youtube.json" },
    });
    const item = await enrichItem(video, { fetcher });
    expect(calls.map((c) => c.url)).toEqual([YT_OEMBED("0FQC0mu5Z00")]);
    expect(item).toMatchObject({
      type: "video",
      leadImageUrl: "https://i1.ytimg.com/vi/0FQC0mu5Z00/hqdefault.jpg",
      leadImageSource: "feed",
      summary: "A behind-the-scenes of the Inflight design journey.",
    });
    expect(item.embedHtml).toContain("youtube.com/embed/0FQC0mu5Z00");
  });

  it("blocked page: falls back to feed content and its first real image (skipping pixels)", async () => {
    const [post] = items("feeds/content-encoded.xml", "https://ux.example.com/feed");
    const { fetcher } = fixtureFetcher({
      [post.url]: { status: 403, file: "pages/cloudflare-403.html" },
    });
    const item = await enrichItem(post, { fetcher });
    expect(item.notes).toContain("page HTTP 403");
    expect(item.type).toBe("article");
    expect(item.leadImageUrl).toBe("https://cdn-images.example.com/max/1024/office.png");
    expect(item.leadImageSource).toBe("content");
    expect(item.bodyHtml).toContain("judgement systems");
    expect(item.readMinutes).toBe(1);
  });

  it("thin title-only item with an unreachable page: no image, still a typed item", async () => {
    const [, bare] = items("feeds/thin-atom.xml", "https://design.example.com/blog/feed/atom.xml");
    const { fetcher } = fixtureFetcher({});
    const item = await enrichItem(bare, { fetcher });
    expect(item).toMatchObject({
      title: "Build by design",
      type: "article",
      leadImageUrl: null,
      readMinutes: null,
    });
    expect(item.notes).toEqual(["page HTTP 404"]);
  });

  it("skips generic share images and finds the video in client-rendered JSON", async () => {
    const url = "https://site.example.com/articles/talk/";
    const { fetcher } = fixtureFetcher({
      [url]: { file: "pages/spa-escaped-embed.html" },
      [YT_OEMBED("n5PkNF61z9w")]: { file: "oembed-youtube.json" },
    });
    const item = await enrichItem(raw({ url }), { fetcher });
    expect(item.type).toBe("video");
    expect(item.leadImageSource).toBe("oembed");
    expect(item.leadImageUrl).not.toContain("social.jpg");
  });

  it("ignores an og:image that is just the site default", async () => {
    const url = "https://mag.example.com/2026/10/random/";
    const { fetcher } = fixtureFetcher({ [url]: { file: "pages/article.html" } });
    const item = await enrichItem(raw({ url }), {
      fetcher,
      siteImage: "https://mag.example.com/uploads/random-hero.jpg",
    });
    expect(item.leadImageSource).toBe("content");
    expect(item.leadImageUrl).toBe("https://mag.example.com/wp-content/uploads/inline-demo.png");
    expect(item.notes).toContain("og:image is the site default");
  });

  it("several clips in a short post stay an article", () => {
    const base = { item: raw({}), meta: {}, words: 300, images: 2 };
    expect(detectType({ ...base, embeds: ["https://vimeo.com/1"] })).toBe("video");
    expect(detectType({ ...base, embeds: ["https://vimeo.com/1", "https://vimeo.com/2"] })).toBe(
      "article",
    );
    expect(detectType({ ...base, words: 900, embeds: ["https://vimeo.com/1"] })).toBe("article");
  });

  it("many images, few words → image_set", async () => {
    const url = "https://gallery.example.com/posts/one";
    const { fetcher } = fixtureFetcher({ [url]: { file: "pages/gallery.html" } });
    const item = await enrichItem(raw({ url }), { fetcher });
    expect(item.type).toBe("image_set");
    expect(item.leadImageUrl).toBe("https://gallery.example.com/img/poster-1.jpg");
  });

  it("fetchPage: false uses only feed data", async () => {
    const [post] = items("feeds/content-encoded.xml", "https://ux.example.com/feed");
    const { fetcher, calls } = fixtureFetcher({});
    const item = await enrichItem(post, { fetcher, fetchPage: false });
    expect(calls).toHaveLength(0);
    expect(item.leadImageSource).toBe("content");
  });
});

describe("readMinutes", () => {
  it("uses 230 wpm, rounding up, minimum 1", () => {
    expect(readMinutes(1)).toBe(1);
    expect(readMinutes(230)).toBe(1);
    expect(readMinutes(231)).toBe(2);
    expect(readMinutes(2300)).toBe(10);
  });
});
