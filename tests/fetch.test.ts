import { describe, expect, it } from "vitest";
import { fetchFeed, retryDelay } from "../lib/ingest/fetch";
import { USER_AGENT } from "../lib/ingest/http";
import type { Fetcher } from "../lib/ingest/types";
import { fixtureFetcher } from "./helpers";

const URL_ = "https://motion.example.com/feed/";

describe("fetchFeed", () => {
  it("parses, dedupes and returns caching headers", async () => {
    const { fetcher, calls } = fixtureFetcher({
      [URL_]: {
        file: "feeds/wordpress-media.xml",
        headers: { etag: '"abc"', "last-modified": "Mon, 19 Oct 2026 23:53:46 GMT" },
      },
    });
    const res = await fetchFeed({ url: URL_ }, { fetcher });
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.feed.items).toHaveLength(2);
    expect(res.etag).toBe('"abc"');
    expect(res.lastModified).toBe("Mon, 19 Oct 2026 23:53:46 GMT");
    expect(calls[0].headers.get("user-agent")).toBe(USER_AGENT);
    expect(calls[0].headers.get("user-agent")).toMatch(/Feedwise\/.*\+https?:\/\//);
  });

  it("sends If-None-Match / If-Modified-Since and handles 304", async () => {
    const { fetcher, calls } = fixtureFetcher({
      [URL_]: {
        file: "feeds/wordpress-media.xml",
        onConditional: (h) => (h.get("if-none-match") === '"abc"' ? { status: 304 } : undefined),
      },
    });
    const res = await fetchFeed(
      { url: URL_, etag: '"abc"', lastModified: "Mon, 19 Oct 2026 23:53:46 GMT" },
      { fetcher },
    );
    expect(res).toEqual({ status: "not-modified" });
    expect(calls[0].headers.get("if-modified-since")).toBe("Mon, 19 Oct 2026 23:53:46 GMT");
  });

  it("reports HTTP errors and non-feed bodies without throwing", async () => {
    const { fetcher } = fixtureFetcher({
      "https://a.example.com/feed": { status: 403, file: "pages/cloudflare-403.html" },
      "https://b.example.com/feed": { file: "pages/spa-catchall.html" },
      "https://c.example.com/feed": { file: "feeds/malformed.xml", type: "application/rss+xml" },
    });
    expect(await fetchFeed({ url: "https://a.example.com/feed" }, { fetcher })).toMatchObject({
      status: "error",
      httpStatus: 403,
    });
    expect(await fetchFeed({ url: "https://b.example.com/feed" }, { fetcher })).toMatchObject({
      status: "error",
      error: "Response is not a feed",
    });
    expect(await fetchFeed({ url: "https://c.example.com/feed" }, { fetcher })).toMatchObject({
      status: "error",
    });
  });

  it("retries once on 503, then succeeds", async () => {
    const { fetcher, calls } = fixtureFetcher({
      [URL_]: { sequence: [{ status: 503 }, { file: "feeds/wordpress-media.xml" }] },
    });
    const res = await fetchFeed({ url: URL_ }, { fetcher, retryDelayMs: 1 });
    expect(res.status).toBe("ok");
    expect(calls).toHaveLength(2);
  });

  it("does not retry more than once", async () => {
    const { fetcher, calls } = fixtureFetcher({ [URL_]: { status: 503 } });
    const res = await fetchFeed({ url: URL_ }, { fetcher, retryDelayMs: 1 });
    expect(res).toMatchObject({ status: "error", httpStatus: 503 });
    expect(calls).toHaveLength(2);
  });

  it("honours Retry-After up to a 5s cap", () => {
    expect(retryDelay("2")).toBe(2000);
    expect(retryDelay("120")).toBe(5000);
    expect(retryDelay(null, 10)).toBe(10);
  });

  it("gives up after the timeout", async () => {
    const hang: Fetcher = (_url, init) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      });
    const started = Date.now();
    const res = await fetchFeed({ url: URL_ }, { fetcher: hangWithTimeout(hang, 50) });
    expect(res).toEqual({ status: "error", error: "timed out after 10s" });
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

/** Swap the 10s signal for a short one so the test is fast but exercises the same path. */
function hangWithTimeout(inner: Fetcher, ms: number): Fetcher {
  return (url, init) => inner(url, { ...init, signal: AbortSignal.timeout(ms) });
}
