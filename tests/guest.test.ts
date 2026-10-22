import { afterEach, describe, expect, it, vi } from "vitest";
import { guestAllowed, safeNext } from "@/lib/guest";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/explore?mode=swipe")).toBe("/explore?mode=swipe");
  });
  it("falls back to Today for anything else", () => {
    expect(safeNext(null)).toBe("/today");
    expect(safeNext("https://example.com")).toBe("/today");
    expect(safeNext("//example.com")).toBe("/today");
  });
});

describe("guestAllowed", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("is on for Vercel previews and when ALLOW_GUEST=true", () => {
    vi.stubEnv("ALLOW_GUEST", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(guestAllowed()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(guestAllowed()).toBe(false);
    vi.stubEnv("ALLOW_GUEST", "true");
    expect(guestAllowed()).toBe(true);
  });
});
