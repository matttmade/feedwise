import type { FeedRequest, FetchFeedResult, Fetcher } from "./types";
import { errorMessage, httpGet } from "./http";
import { looksLikeFeed, parseFeedDocument } from "./parse";

const ACCEPT =
  "application/rss+xml, application/atom+xml, application/feed+json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5";

/**
 * Conditional GET + parse. Never throws: one failing feed must not stop a run.
 * Items come back deduped by guid, in feed order.
 */
export async function fetchFeed(
  req: FeedRequest,
  opts: { fetcher?: Fetcher; retryDelayMs?: number } = {},
): Promise<FetchFeedResult> {
  const headers: Record<string, string> = {};
  if (req.etag) headers["if-none-match"] = req.etag;
  if (req.lastModified) headers["if-modified-since"] = req.lastModified;

  try {
    let res = await httpGet(req.url, { fetcher: opts.fetcher, headers, accept: ACCEPT });
    if (RETRYABLE.has(res.status)) {
      // One polite retry for rate limits and brief outages; the next cron run covers the rest.
      await sleep(retryDelay(res.headers.get("retry-after"), opts.retryDelayMs));
      res = await httpGet(req.url, { fetcher: opts.fetcher, headers, accept: ACCEPT });
    }
    if (res.status === 304) return { status: "not-modified" };
    if (!res.ok) return { status: "error", error: `HTTP ${res.status}`, httpStatus: res.status };
    if (!looksLikeFeed(res.text, res.contentType)) {
      return { status: "error", error: "Response is not a feed", httpStatus: res.status };
    }
    const feed = parseFeedDocument(res.text, res.url);
    return {
      status: "ok",
      feed,
      etag: res.headers.get("etag") ?? undefined,
      lastModified: res.headers.get("last-modified") ?? undefined,
    };
  } catch (err) {
    return { status: "error", error: errorMessage(err) };
  }
}

const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRY_DELAY_MS = 5_000;

export function retryDelay(retryAfter: string | null, fallbackMs = 1_500): number {
  const seconds = retryAfter && /^\d+$/.test(retryAfter.trim()) ? Number(retryAfter) : undefined;
  return Math.min(seconds !== undefined ? seconds * 1000 : fallbackMs, MAX_RETRY_DELAY_MS);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
