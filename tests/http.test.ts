import { describe, expect, it } from "vitest";
import { httpGet, isPrivateAddress, type Lookup } from "../lib/ingest/http";
import { fixtureFetcher } from "./helpers";

const fakeDns =
  (table: Record<string, string[]>): Lookup =>
  async (host) =>
    table[host] ?? [];

describe("isPrivateAddress", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.1.2.3", true],
    ["172.20.0.5", true],
    ["192.168.1.1", true],
    ["169.254.169.254", true],
    ["100.64.0.1", true],
    ["::1", true],
    ["fd12::1", true],
    ["fe80::1", true],
    ["::ffff:127.0.0.1", true],
    ["93.184.216.34", false],
    ["2606:4700::6810:84e5", false],
  ])("%s → %s", (address, expected) => {
    expect(isPrivateAddress(address)).toBe(expected);
  });
});

describe("httpGet guard", () => {
  it("refuses hosts that resolve to private addresses", async () => {
    const { fetcher, calls } = fixtureFetcher({
      "http://internal.example.com/": { body: "secret" },
    });
    const lookup = fakeDns({ "internal.example.com": ["10.0.0.7"] });
    await expect(httpGet("http://internal.example.com/", { fetcher, lookup })).rejects.toThrow(
      /not a public address/,
    );
    expect(calls).toHaveLength(0);
  });

  it("refuses literal metadata IPs without a DNS lookup", async () => {
    const { fetcher } = fixtureFetcher({});
    await expect(
      httpGet("http://169.254.169.254/latest/meta-data/", { fetcher, lookup: fakeDns({}) }),
    ).rejects.toThrow(/not a public address/);
  });

  it("checks every redirect hop", async () => {
    const { fetcher, calls } = fixtureFetcher({
      "https://public.example.com/feed": {
        status: 302,
        headers: { location: "http://localhost.example.com/admin" },
      },
    });
    const lookup = fakeDns({
      "public.example.com": ["93.184.216.34"],
      "localhost.example.com": ["127.0.0.1"],
    });
    await expect(httpGet("https://public.example.com/feed", { fetcher, lookup })).rejects.toThrow(
      /localhost\.example\.com is not a public address/,
    );
    expect(calls.map((c) => c.url)).toEqual(["https://public.example.com/feed"]);
  });

  it("follows public redirects and reports the final URL", async () => {
    const { fetcher } = fixtureFetcher({
      "https://a.example.com/feed": { status: 301, headers: { location: "/feed/" } },
      "https://a.example.com/feed/": { body: "ok", type: "text/plain" },
    });
    const lookup = fakeDns({ "a.example.com": ["93.184.216.34"] });
    const res = await httpGet("https://a.example.com/feed", { fetcher, lookup });
    expect(res.url).toBe("https://a.example.com/feed/");
    expect(res.text).toBe("ok");
  });

  it("caps response size", async () => {
    const { fetcher } = fixtureFetcher({ "https://big.example.com/": { body: "x".repeat(2048) } });
    await expect(httpGet("https://big.example.com/", { fetcher, maxBytes: 1024 })).rejects.toThrow(
      /too large/,
    );
  });
});
