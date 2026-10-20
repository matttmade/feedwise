import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Fetcher } from "../lib/ingest/types";

const FIXTURES = join(import.meta.dirname, "fixtures");

export const fixture = (path: string) => readFileSync(join(FIXTURES, path), "utf8");

type Route = {
  status?: number;
  body?: string;
  /** Path under tests/fixtures; overrides body. */
  file?: string;
  type?: string;
  headers?: Record<string, string>;
  /** Respond to a conditional request instead of the normal response. */
  onConditional?: (headers: Headers) => Route | undefined;
  /** Responses served in order on successive requests; the last one repeats. */
  sequence?: Route[];
};

/**
 * A fetch stand-in backed by fixtures. Unknown URLs are 404s, so tests never touch the network.
 * `calls` records every requested URL with its request headers.
 */
export function fixtureFetcher(routes: Record<string, Route>) {
  const calls: { url: string; headers: Headers }[] = [];
  const fetcher: Fetcher = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, headers });
    let route = routes[url];
    if (route?.sequence) {
      const hits = calls.filter((c) => c.url === url).length;
      route = route.sequence[Math.min(hits, route.sequence.length) - 1];
    }
    if (route?.onConditional) route = route.onConditional(headers) ?? route;
    if (!route)
      return new Response("not found", { status: 404, headers: { "content-type": "text/html" } });
    const body = route.file ? fixture(route.file) : (route.body ?? "");
    const status = route.status ?? 200;
    const res = new Response(status === 304 ? null : body, {
      status,
      headers: { "content-type": route.type ?? guessType(route.file), ...route.headers },
    });
    Object.defineProperty(res, "url", { value: url });
    return res;
  };
  return { fetcher, calls };
}

function guessType(file?: string): string {
  if (!file) return "text/html; charset=utf-8";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".xml")) return "application/rss+xml; charset=utf-8";
  return "text/html; charset=utf-8";
}
