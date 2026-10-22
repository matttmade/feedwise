import { describe, expect, it } from "vitest";
import {
  runIngest,
  type IngestSource,
  type IngestStore,
  type NewItem,
  type SourcePatch,
} from "../lib/ingest/run";
import type { EnrichedItem, RawItem } from "../lib/ingest/types";
import { fixtureFetcher } from "./helpers";

function memoryStore(sources: (IngestSource & { last_fetched_at?: string | null })[]) {
  const items: NewItem[] = [];
  const patches: Record<string, SourcePatch[]> = {};
  const store: IngestStore = {
    async dueSources({ dueBefore, sourceId }) {
      return sources.filter((s) =>
        sourceId
          ? s.id === sourceId
          : !s.last_fetched_at || new Date(s.last_fetched_at) < dueBefore,
      );
    },
    async knownGuids(sourceId, guids) {
      return new Set(
        items.filter((i) => i.source_id === sourceId && guids.includes(i.guid)).map((i) => i.guid),
      );
    },
    async insertItems(rows) {
      items.push(...rows);
    },
    async updateSource(id, patch) {
      (patches[id] ??= []).push(patch);
    },
  };
  return { store, items, patches };
}

const fakeEnrich = async (raw: RawItem): Promise<EnrichedItem> => ({
  guid: raw.guid,
  url: raw.url,
  title: raw.title,
  summary: raw.summary ?? null,
  type: "article",
  leadImageUrl: "https://img.example.com/broken.jpg",
  leadImageSource: "feed",
  leadImageCandidates: [
    { url: "https://img.example.com/broken.jpg", source: "feed" },
    { url: "https://img.example.com/og.jpg", source: "og" },
  ],
  media: raw.media,
  embedHtml: null,
  bodyHtml: '<p>Hello</p><script>alert(1)</script><a href="https://x.example.com">x</a>',
  readMinutes: 1,
  durationSeconds: null,
  publishedAt: raw.publishedAt ?? null,
  notes: [],
});

const probe = async (url: string) => (url.includes("broken") ? null : { width: 1200, height: 630 });

const FEED = "https://motion.example.com/feed/";

describe("runIngest", () => {
  it("stores new items with a working lead image, sanitised body and source health", async () => {
    const { fetcher } = fixtureFetcher({
      [FEED]: { file: "feeds/wordpress-media.xml", headers: { etag: '"v1"' } },
    });
    const { store, items, patches } = memoryStore([
      { id: "s1", feed_url: FEED, etag: null, last_modified: null, last_fetched_at: null },
    ]);
    const summary = await runIngest(store, { fetcher, enrich: fakeEnrich, probe });

    expect(summary.sources).toEqual([{ id: "s1", status: "ok", newItems: 2 }]);
    expect(items[0]).toMatchObject({
      source_id: "s1",
      lead_image_url: "https://img.example.com/og.jpg",
      lead_image_width: 1200,
      lead_image_height: 630,
    });
    expect(items[0].body_html).not.toContain("<script");
    expect(items[0].body_html).toContain('rel="noopener noreferrer nofollow"');
    expect(patches.s1[0]).toMatchObject({ last_status: "ok", last_error: null, etag: '"v1"' });
  });

  it("skips known guids on the next run", async () => {
    const { fetcher } = fixtureFetcher({ [FEED]: { file: "feeds/wordpress-media.xml" } });
    const { store, items } = memoryStore([
      { id: "s1", feed_url: FEED, etag: null, last_modified: null },
    ]);
    await runIngest(store, { fetcher, enrich: fakeEnrich, probe });
    const second = await runIngest(store, { fetcher, enrich: fakeEnrich, probe });
    expect(second.sources[0].newItems).toBe(0);
    expect(items).toHaveLength(2);
  });

  it("records a failing source and keeps going", async () => {
    const { fetcher } = fixtureFetcher({
      "https://down.example.com/feed": { status: 500 },
      [FEED]: { file: "feeds/wordpress-media.xml" },
    });
    const { store, patches } = memoryStore([
      { id: "bad", feed_url: "https://down.example.com/feed", etag: null, last_modified: null },
      { id: "good", feed_url: FEED, etag: null, last_modified: null },
    ]);
    const summary = await runIngest(store, { fetcher, enrich: fakeEnrich, probe });
    expect(summary.sources.map((s) => [s.id, s.status])).toEqual([
      ["bad", "error"],
      ["good", "ok"],
    ]);
    expect(patches.bad[0]).toMatchObject({ last_status: "error", last_error: "HTTP 500" });
  });

  it("an exception inside enrichment fails only that source", async () => {
    const { fetcher } = fixtureFetcher({ [FEED]: { file: "feeds/wordpress-media.xml" } });
    const { store, patches } = memoryStore([
      { id: "s1", feed_url: FEED, etag: null, last_modified: null },
    ]);
    const summary = await runIngest(store, {
      fetcher,
      probe,
      enrich: async () => {
        throw new Error("boom");
      },
    });
    expect(summary.sources[0]).toMatchObject({ status: "error", error: "boom" });
    expect(patches.s1[0].last_status).toBe("error");
  });

  it("only fetches due sources unless one is asked for by id", async () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const { fetcher, calls } = fixtureFetcher({ [FEED]: { file: "feeds/wordpress-media.xml" } });
    const { store } = memoryStore([
      {
        id: "fresh",
        feed_url: FEED,
        etag: null,
        last_modified: null,
        last_fetched_at: "2026-10-20T11:30:00Z",
      },
    ]);
    expect((await runIngest(store, { fetcher, now, enrich: fakeEnrich, probe })).sources).toEqual(
      [],
    );
    expect(calls).toHaveLength(0);
    const forced = await runIngest(store, {
      fetcher,
      now,
      sourceId: "fresh",
      enrich: fakeEnrich,
      probe,
    });
    expect(forced.sources[0].status).toBe("ok");
  });

  it("caps new items per source and stores no validators when cut short", async () => {
    const { fetcher } = fixtureFetcher({
      [FEED]: { file: "feeds/wordpress-media.xml", headers: { etag: '"v1"' } },
    });
    const { store, items, patches } = memoryStore([
      { id: "s1", feed_url: FEED, etag: null, last_modified: null },
    ]);
    await runIngest(store, { fetcher, enrich: fakeEnrich, probe, maxNewPerSource: 1 });
    expect(items).toHaveLength(1);
    expect(patches.s1[0].etag).toBe('"v1"');

    const out = memoryStore([{ id: "s1", feed_url: FEED, etag: null, last_modified: null }]);
    await runIngest(out.store, { fetcher, enrich: fakeEnrich, probe, budgetMs: -1 });
    expect(out.items).toHaveLength(0);
  });

  it("sends stored validators and treats 304 as healthy", async () => {
    const { fetcher } = fixtureFetcher({
      [FEED]: {
        file: "feeds/wordpress-media.xml",
        onConditional: (h) => (h.get("if-none-match") === '"v1"' ? { status: 304 } : undefined),
      },
    });
    const { store, patches } = memoryStore([
      { id: "s1", feed_url: FEED, etag: '"v1"', last_modified: null },
    ]);
    const summary = await runIngest(store, { fetcher, enrich: fakeEnrich, probe });
    expect(summary.sources[0].status).toBe("not-modified");
    expect(patches.s1[0]).toMatchObject({ last_status: "not-modified", last_error: null });
  });
});
