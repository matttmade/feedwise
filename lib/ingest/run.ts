import type { EnrichedItem, Fetcher, RawItem } from "./types";
import { enrichItem } from "./enrich";
import { fetchFeed } from "./fetch";
import { errorMessage, mapLimit } from "./http";
import { chooseLeadImage, probeImage, type ImageSize } from "./images";
import { sanitizeBody } from "./sanitize";

export type IngestSource = {
  id: string;
  feed_url: string;
  etag: string | null;
  last_modified: string | null;
};

export type NewItem = {
  source_id: string;
  guid: string;
  url: string;
  title: string;
  summary: string | null;
  type: EnrichedItem["type"];
  lead_image_url: string | null;
  lead_image_width: number | null;
  lead_image_height: number | null;
  media: EnrichedItem["media"];
  embed_html: string | null;
  body_html: string | null;
  read_minutes: number | null;
  duration_seconds: number | null;
  published_at: string | null;
};

export type SourcePatch = {
  last_fetched_at: string;
  last_status: "ok" | "not-modified" | "error";
  last_error: string | null;
  etag?: string | null;
  last_modified?: string | null;
  title?: string;
};

/** Persistence the ingest job needs. The Supabase version lives in supabase-store.ts. */
export interface IngestStore {
  dueSources(opts: { dueBefore: Date; limit: number; sourceId?: string }): Promise<IngestSource[]>;
  knownGuids(sourceId: string, guids: string[]): Promise<Set<string>>;
  insertItems(items: NewItem[]): Promise<void>;
  updateSource(id: string, patch: SourcePatch): Promise<void>;
}

export type IngestOptions = {
  fetcher?: Fetcher;
  now?: Date;
  /** Sources fetched in the last `intervalMinutes` are skipped. */
  intervalMinutes?: number;
  maxSources?: number;
  maxNewPerSource?: number;
  /** Stop starting new work after this long, leaving the rest for the next run. */
  budgetMs?: number;
  /** Ingest one source now regardless of when it was last fetched (used right after adding it). */
  sourceId?: string;
  enrich?: (item: RawItem) => Promise<EnrichedItem>;
  probe?: (url: string) => Promise<ImageSize | null>;
};

export type SourceResult = {
  id: string;
  status: SourcePatch["last_status"] | "skipped";
  newItems: number;
  error?: string;
};

export type IngestSummary = { sources: SourceResult[]; outOfTime: boolean; ms: number };

/**
 * Fetch due sources, enrich their new items and store them. One failing source never stops
 * the run: its error is recorded on the source and the loop moves on.
 */
export async function runIngest(
  store: IngestStore,
  opts: IngestOptions = {},
): Promise<IngestSummary> {
  const started = Date.now();
  const now = opts.now ?? new Date();
  const budgetMs = opts.budgetMs ?? 50_000;
  const maxNew = opts.maxNewPerSource ?? 8;
  const enrich = opts.enrich ?? ((item: RawItem) => enrichItem(item, { fetcher: opts.fetcher }));
  const probe = opts.probe ?? ((url: string) => probeImage(url, { fetcher: opts.fetcher }));
  const outOfTime = () => Date.now() - started > budgetMs;

  const dueBefore = opts.sourceId
    ? new Date(now.getTime() + 60_000)
    : new Date(now.getTime() - (opts.intervalMinutes ?? 100) * 60_000);
  const sources = await store.dueSources({
    dueBefore,
    limit: opts.maxSources ?? 25,
    sourceId: opts.sourceId,
  });

  const results = await mapLimit(sources, 3, async (source): Promise<SourceResult> => {
    if (outOfTime()) return { id: source.id, status: "skipped", newItems: 0 };
    const fetchedAt = new Date().toISOString();
    try {
      const res = await fetchFeed(
        { url: source.feed_url, etag: source.etag, lastModified: source.last_modified },
        { fetcher: opts.fetcher },
      );
      if (res.status === "not-modified") {
        await store.updateSource(source.id, ok(fetchedAt, "not-modified"));
        return { id: source.id, status: "not-modified", newItems: 0 };
      }
      if (res.status === "error") {
        await store.updateSource(source.id, failed(fetchedAt, res.error));
        return { id: source.id, status: "error", newItems: 0, error: res.error };
      }

      // Feeds list newest first; anything past the first 100 is too old to surface anyway.
      const recent = res.feed.items.slice(0, 100);
      const known = await store.knownGuids(
        source.id,
        recent.map((i) => i.guid),
      );
      const fresh = recent.filter((i) => !known.has(i.guid)).slice(0, maxNew);
      const rows: NewItem[] = [];
      for (const raw of fresh) {
        if (outOfTime()) break;
        const item = await enrich(raw);
        const lead = await chooseLeadImage(item.leadImageCandidates, probe);
        rows.push(toRow(source.id, item, lead));
      }
      if (rows.length) await store.insertItems(rows);
      // Only remember validators once every new item is stored, so a cut-short run retries.
      const complete = rows.length === fresh.length;
      await store.updateSource(source.id, {
        ...ok(fetchedAt, "ok"),
        etag: complete ? (res.etag ?? null) : null,
        last_modified: complete ? (res.lastModified ?? null) : null,
      });
      return { id: source.id, status: "ok", newItems: rows.length };
    } catch (err) {
      const error = errorMessage(err);
      await store.updateSource(source.id, failed(fetchedAt, error)).catch(() => {});
      return { id: source.id, status: "error", newItems: 0, error };
    }
  });

  return { sources: results, outOfTime: outOfTime(), ms: Date.now() - started };
}

const ok = (at: string, status: "ok" | "not-modified"): SourcePatch => ({
  last_fetched_at: at,
  last_status: status,
  last_error: null,
});

const failed = (at: string, error: string): SourcePatch => ({
  last_fetched_at: at,
  last_status: "error",
  last_error: error.slice(0, 500),
});

function toRow(
  sourceId: string,
  item: EnrichedItem,
  lead: (ImageSize & { url: string }) | null,
): NewItem {
  return {
    source_id: sourceId,
    guid: item.guid,
    url: item.url,
    title: item.title.slice(0, 500),
    summary: item.summary,
    type: item.type,
    lead_image_url: lead?.url ?? null,
    lead_image_width: lead?.width ?? null,
    lead_image_height: lead?.height ?? null,
    media: item.media,
    embed_html: item.embedHtml,
    body_html: item.bodyHtml ? sanitizeBody(item.bodyHtml) : null,
    read_minutes: item.readMinutes,
    duration_seconds: item.durationSeconds ? Math.round(item.durationSeconds) : null,
    published_at: item.publishedAt,
  };
}
