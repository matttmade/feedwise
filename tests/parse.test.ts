import { describe, expect, it } from "vitest";
import { looksLikeFeed, parseFeedDocument, stripTracking } from "../lib/ingest/parse";
import { fixture } from "./helpers";

describe("parseFeedDocument", () => {
  it("reads RSS with media:content and dedupes by guid", () => {
    const feed = parseFeedDocument(
      fixture("feeds/wordpress-media.xml"),
      "https://motion.example.com/feed/",
    );
    expect(feed.format).toBe("rss");
    expect(feed.title).toBe("Motion Studio Journal");
    expect(feed.items).toHaveLength(2);
    const [first, second] = feed.items;
    expect(first).toMatchObject({
      guid: "https://motion.example.com/?p=92434",
      url: "https://motion.example.com/quickie/hypersail/",
      title: "Hypersail | FutureDeluxe",
      author: "Staff",
      publishedAt: "2026-10-19T22:52:07.000Z",
    });
    expect(first.media[0]).toMatchObject({ kind: "image", width: 700, height: 394, from: "media" });
    expect(second.media[0]).toMatchObject({
      url: "https://cdn.example.com/rove-thumb.png",
      kind: "image",
    });
  });

  it("strips utm_* and rss source params from item links", () => {
    const rss = parseFeedDocument(
      fixture("feeds/wordpress-media.xml"),
      "https://motion.example.com/feed/",
    );
    expect(rss.items[1].url).toBe("https://motion.example.com/news/rove/");
    const medium = parseFeedDocument(
      fixture("feeds/content-encoded.xml"),
      "https://ux.example.com/feed",
    );
    expect(medium.items[0].url).toBe("https://ux.example.com/human-attention-d7bc");
  });

  it("keeps content:encoded for later enrichment", () => {
    const feed = parseFeedDocument(
      fixture("feeds/content-encoded.xml"),
      "https://ux.example.com/feed",
    );
    expect(feed.items[0].contentHtml).toContain("office.png");
    expect(feed.items[0].author).toBe("Pat Example");
  });

  it("reads a thin Atom feed (title + one line)", () => {
    const feed = parseFeedDocument(
      fixture("feeds/thin-atom.xml"),
      "https://design.example.com/blog/feed/atom.xml",
    );
    expect(feed.format).toBe("atom");
    expect(feed.siteUrl).toBe("https://design.example.com/blog/");
    expect(feed.items.map((i) => i.title)).toEqual([
      "Deepening our investment in India",
      "Build by design",
    ]);
    expect(feed.items[1].contentHtml).toBeUndefined();
    expect(feed.items[1].media).toEqual([]);
  });

  it("reads a YouTube channel feed with thumbnails and descriptions", () => {
    const feed = parseFeedDocument(
      fixture("feeds/youtube.xml"),
      "https://www.youtube.com/feeds/videos.xml?channel_id=x",
    );
    expect(feed.items).toHaveLength(2);
    const [video, short] = feed.items;
    expect(video.guid).toBe("yt:video:0FQC0mu5Z00");
    expect(video.url).toBe("https://www.youtube.com/watch?v=0FQC0mu5Z00");
    expect(video.summary).toContain("behind-the-scenes");
    expect(video.media.find((m) => m.kind === "image")?.url).toBe(
      "https://i1.ytimg.com/vi/0FQC0mu5Z00/hqdefault.jpg",
    );
    expect(short.url).toBe("https://www.youtube.com/shorts/I11v5cOCWog");
  });

  it("reads JSON Feed, resolving relative item URLs", () => {
    const feed = parseFeedDocument(
      fixture("feeds/feed.json"),
      "https://gallery.example.com/feed.json",
    );
    expect(feed.format).toBe("json");
    expect(feed.items[0].url).toBe("https://gallery.example.com/posts/one");
    expect(feed.items[0].media.map((m) => m.kind)).toEqual(["image", "audio"]);
    expect(feed.items[1].title).toBe("Untitled short note about type.");
  });

  it("throws on malformed input", () => {
    expect(() =>
      parseFeedDocument(fixture("feeds/malformed.xml"), "https://x.example.com/feed"),
    ).toThrow();
  });
});

describe("looksLikeFeed", () => {
  it("accepts XML and JSON feeds, rejects HTML served at feed paths", () => {
    expect(looksLikeFeed(fixture("feeds/thin-atom.xml"))).toBe(true);
    expect(looksLikeFeed(fixture("feeds/feed.json"))).toBe(true);
    expect(looksLikeFeed(fixture("pages/spa-catchall.html"), "text/html")).toBe(false);
    expect(looksLikeFeed('{"name":"not a feed"}', "application/json")).toBe(false);
  });
});

describe("stripTracking", () => {
  it("leaves meaningful params alone", () => {
    expect(stripTracking("https://a.example.com/?p=1&utm_campaign=x")).toBe(
      "https://a.example.com/?p=1",
    );
    expect(stripTracking("https://a.example.com/?source=homepage")).toBe(
      "https://a.example.com/?source=homepage",
    );
  });
});
