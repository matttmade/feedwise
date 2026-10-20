import { describe, expect, it } from "vitest";
import {
  discoverFeeds,
  guessUrls,
  normaliseInput,
  youtubeChannelFeed,
} from "../lib/ingest/discover";
import { fixtureFetcher } from "./helpers";

const RSS = "application/rss+xml";

describe("discoverFeeds", () => {
  it("uses <link rel=alternate>, skipping JSON API links and putting comment feeds last", async () => {
    const { fetcher } = fixtureFetcher({
      "https://mag.example.com/": { file: "pages/site-with-link.html" },
      "https://mag.example.com/feed/": { file: "feeds/wordpress-media.xml", type: RSS },
      "https://mag.example.com/comments/feed/": { file: "feeds/thin-atom.xml", type: RSS },
    });
    const res = await discoverFeeds("mag.example.com", { fetcher });
    expect(res.feeds.map((f) => [f.url, f.via])).toEqual([
      ["https://mag.example.com/feed/", "link"],
      ["https://mag.example.com/comments/feed/", "link"],
    ]);
    expect(res.feeds[0]).toMatchObject({ format: "rss", title: "Motion Studio Journal" });
    expect(res.siteImage).toBe("https://mag.example.com/share-default.png");
  });

  it("returns the URL itself when it is already a feed", async () => {
    const { fetcher, calls } = fixtureFetcher({
      "https://design.example.com/blog/feed/atom.xml": {
        file: "feeds/thin-atom.xml",
        type: "application/atom+xml",
      },
    });
    const res = await discoverFeeds("https://design.example.com/blog/feed/atom.xml", { fetcher });
    expect(res.feeds).toEqual([
      {
        url: "https://design.example.com/blog/feed/atom.xml",
        format: "atom",
        title: "Shortcut",
        via: "self",
      },
    ]);
    expect(calls).toHaveLength(1);
  });

  it("falls back to common paths when nothing is advertised", async () => {
    const { fetcher } = fixtureFetcher({
      "https://research.example.com/articles/": { file: "pages/site-no-link.html" },
      "https://research.example.com/feed/rss/": { file: "feeds/content-encoded.xml", type: RSS },
    });
    const res = await discoverFeeds("https://research.example.com/articles/", { fetcher });
    expect(res.feeds).toHaveLength(1);
    expect(res.feeds[0]).toMatchObject({
      url: "https://research.example.com/feed/rss/",
      via: "common-path",
    });
  });

  it("does not mistake an SPA's 200 HTML catch-all for a feed", async () => {
    const routes: Parameters<typeof fixtureFetcher>[0] = {};
    for (const url of ["https://mars.example.com/", ...guessUrls("https://mars.example.com/")]) {
      routes[url] = { file: "pages/spa-catchall.html" };
    }
    const { fetcher } = fixtureFetcher(routes);
    const res = await discoverFeeds("https://mars.example.com/", { fetcher });
    expect(res.feeds).toEqual([]);
    expect(res.warning).toBe("No feed advertised or at common paths");
  });

  it("still guesses paths when the page is behind a bot wall, and says why", async () => {
    const { fetcher } = fixtureFetcher({
      "https://blocked.example.com/": {
        status: 403,
        file: "pages/cloudflare-403.html",
        headers: { "cf-mitigated": "challenge" },
      },
      "https://blocked.example.com/feed": { file: "feeds/content-encoded.xml", type: RSS },
    });
    const res = await discoverFeeds("https://blocked.example.com/", { fetcher });
    expect(res.feeds[0]?.url).toBe("https://blocked.example.com/feed");
    expect(res.warning).toBe("Site page returned HTTP 403 (bot protection)");
  });

  it("reports an advertised feed that is blocked", async () => {
    const { fetcher } = fixtureFetcher({
      "https://mag.example.com/": { file: "pages/site-with-link.html" },
      "https://mag.example.com/feed/": { status: 403, file: "pages/cloudflare-403.html" },
    });
    const res = await discoverFeeds("https://mag.example.com/", { fetcher });
    expect(res.feeds).toEqual([]);
    expect(res.warning).toContain("https://mag.example.com/feed/: HTTP 403 (bot protection)");
  });

  it("maps a YouTube handle page to the channel feed", async () => {
    const feedUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=UCkCnraWwlnBw1_i7C9-3p0w";
    const { fetcher } = fixtureFetcher({
      "https://www.youtube.com/@joindiveclub": { file: "pages/youtube-handle.html" },
      [feedUrl]: { file: "feeds/youtube.xml", type: "application/atom+xml" },
    });
    const res = await discoverFeeds("https://www.youtube.com/@joindiveclub", { fetcher });
    expect(res.feeds[0]).toMatchObject({ url: feedUrl, via: "youtube", title: "Dive Club 🤿" });
  });

  it("maps /channel/UC… URLs without fetching the page", async () => {
    expect(
      youtubeChannelFeed("https://www.youtube.com/channel/UCkCnraWwlnBw1_i7C9-3p0w/videos"),
    ).toBe("https://www.youtube.com/feeds/videos.xml?channel_id=UCkCnraWwlnBw1_i7C9-3p0w");
    expect(youtubeChannelFeed("https://www.youtube.com/@someone")).toBeUndefined();
  });
});

describe("normaliseInput / guessUrls", () => {
  it("adds https and rejects other protocols", () => {
    expect(normaliseInput(" example.com/blog ")).toBe("https://example.com/blog");
    expect(() => normaliseInput("file:///etc/passwd")).toThrow(/protocol/);
  });

  it("guesses under the given path first, then the origin", () => {
    const urls = guessUrls("https://example.com/blog/");
    expect(urls[0]).toBe("https://example.com/blog/feed");
    expect(urls).toContain("https://example.com/atom.xml");
    expect(urls).toContain("https://example.com/index.xml");
  });
});
