import type { Fetcher } from "./types";

export const TIMEOUT_MS = 10_000;

const CONTACT = process.env.FEEDWISE_CONTACT_URL ?? "https://github.com/matttmade/feedwise";
export const USER_AGENT = `Mozilla/5.0 (compatible; Feedwise/0.1; +${CONTACT})`;

export type HttpResult = {
  ok: boolean;
  status: number;
  url: string;
  contentType: string;
  headers: Headers;
  text: string;
};

export type GetOptions = {
  fetcher?: Fetcher;
  headers?: Record<string, string>;
  accept?: string;
  timeoutMs?: number;
};

/** Server-side GET with a polite UA and a hard timeout. Throws only on network/timeout errors. */
export async function httpGet(url: string, opts: GetOptions = {}): Promise<HttpResult> {
  const { fetcher = fetch, headers = {}, accept = "*/*", timeoutMs = TIMEOUT_MS } = opts;
  assertHttpUrl(url);
  const res = await fetcher(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": USER_AGENT, accept, ...headers },
  });
  return {
    ok: res.ok,
    status: res.status,
    url: res.url || url,
    contentType: res.headers.get("content-type") ?? "",
    headers: res.headers,
    text: res.status === 304 ? "" : await res.text(),
  };
}

export function assertHttpUrl(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${u.protocol}`);
  }
  return u;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") return "timed out after 10s";
    const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
    if (cause?.code) return `${err.message} (${cause.code})`;
    return err.message;
  }
  return String(err);
}

export function absoluteUrl(href: string | undefined | null, base: string): string | undefined {
  if (!href) return undefined;
  try {
    const u = new URL(href.trim(), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Run `fn` over `items` with at most `limit` in flight; preserves order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
