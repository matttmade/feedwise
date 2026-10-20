import { BlockList, isIP } from "node:net";
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
  /** Refuse bodies larger than this (default 5 MB). */
  maxBytes?: number;
  /**
   * Block private / loopback / link-local targets on every hop. On by default for real
   * network calls; tests that inject a fetcher can pass a fake `lookup` to exercise it.
   */
  lookup?: Lookup | false;
};

export type Lookup = (hostname: string) => Promise<string[]>;

const MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/** Server-side GET with a polite UA and a hard timeout. Throws only on network/timeout/guard errors. */
export async function httpGet(url: string, opts: GetOptions = {}): Promise<HttpResult> {
  const res = await httpRequest(url, opts);
  return { ...res, text: new TextDecoder().decode(res.body) };
}

/** Same as httpGet but returns raw bytes (images). */
export async function httpGetBytes(
  url: string,
  opts: GetOptions = {},
): Promise<Omit<HttpResult, "text"> & { body: Uint8Array }> {
  return httpRequest(url, opts);
}

async function httpRequest(url: string, opts: GetOptions) {
  const { fetcher, headers = {}, accept = "*/*", timeoutMs = TIMEOUT_MS } = opts;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const lookup = opts.lookup === undefined ? (fetcher ? false : dnsLookup) : opts.lookup;
  const signal = AbortSignal.timeout(timeoutMs);

  let current = assertHttpUrl(url).toString();
  for (let hop = 0; ; hop++) {
    if (lookup) await assertPublicHost(new URL(current).hostname, lookup);
    const res = await (fetcher ?? fetch)(current, {
      // Follow redirects ourselves so each hop is checked against the private-address guard.
      redirect: "manual",
      signal,
      headers: { "user-agent": USER_AGENT, accept, ...headers },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && res.status !== 304 && location) {
      if (hop >= MAX_REDIRECTS) throw new Error("Too many redirects");
      await res.body?.cancel();
      current = assertHttpUrl(new URL(location, current).toString()).toString();
      continue;
    }
    return {
      ok: res.ok,
      status: res.status,
      url: res.url || current,
      contentType: res.headers.get("content-type") ?? "",
      headers: res.headers,
      body: res.status === 304 ? new Uint8Array() : await readCapped(res, maxBytes),
    };
  }
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    await res.body?.cancel();
    throw new Error(`Response too large (${declared} bytes)`);
  }
  if (!res.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error(`Response too large (>${maxBytes} bytes)`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

const dnsLookup: Lookup = async (hostname) => {
  const { lookup } = await import("node:dns/promises");
  return (await lookup(hostname, { all: true, verbatim: true })).map((a) => a.address);
};

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return blocked.check(mapped, "ipv4");
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) return blocked.check(address, "ipv6");
  return true;
}

async function assertPublicHost(hostname: string, lookup: Lookup) {
  const host = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : await lookup(host);
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error(`Blocked: ${hostname} is not a public address`);
  }
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
