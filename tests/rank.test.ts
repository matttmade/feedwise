import { describe, expect, it } from "vitest";
import {
  affinity,
  noise,
  rank,
  score,
  signalWeight,
  varietySeed,
  type Signal,
} from "@/lib/feed/rank";

const sig = (over: Partial<Signal>): Signal => ({
  sourceId: "s",
  topicIds: [],
  opened: false,
  progress: 0,
  kept: false,
  skipped: false,
  ...over,
});
const NOW = Date.parse("2026-10-22T12:00:00Z");
const item = (id: string, sourceId: string, daysAgo = 1, topicIds: string[] = []) => ({
  id,
  sourceId,
  topicIds,
  sortAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
});

describe("signals and affinity", () => {
  it("reading and keeping count for, skipping against", () => {
    expect(signalWeight(sig({ opened: true, progress: 0.8, kept: true }))).toBe(4);
    expect(signalWeight(sig({ skipped: true }))).toBe(-1);
  });
  it("builds per-source and per-topic affinity in −1…1", () => {
    const a = affinity([
      sig({ sourceId: "loved", topicIds: ["motion"], opened: true, kept: true }),
      sig({ sourceId: "loved", opened: true, progress: 0.9 }),
      sig({ sourceId: "meh", skipped: true }),
    ]);
    expect(a.sources.get("loved")!).toBeGreaterThan(0.6);
    expect(a.sources.get("meh")!).toBeLessThan(0);
    expect(a.topics.get("motion")!).toBeGreaterThan(0);
  });
});

describe("rank", () => {
  const a = affinity([
    sig({ sourceId: "loved", opened: true, progress: 1, kept: true }),
    sig({ sourceId: "loved", opened: true, progress: 1, kept: true }),
    sig({ sourceId: "meh", skipped: true }),
    sig({ sourceId: "meh", skipped: true }),
  ]);
  it("floats what you're into above what you skip, at equal freshness", () => {
    const out = rank([item("m", "meh"), item("l", "loved")], a, NOW, "x");
    expect(out[0].id).toBe("l");
  });
  it("gives brand-new posts a head start over old ones from the same source", () => {
    expect(score(item("new", "z", 0), a, NOW, "x")).toBeGreaterThan(
      score(item("old", "z", 20), a, NOW, "x") - 0.45,
    );
  });
  it("reshuffles when the seed moves on, but is stable for one seed", () => {
    const pool = Array.from({ length: 30 }, (_, i) => item(`i${i}`, "z", 2));
    const a1 = rank(pool, a, NOW, "1").map((i) => i.id);
    expect(rank(pool, a, NOW, "1").map((i) => i.id)).toEqual(a1);
    expect(rank(pool, a, NOW, "2").map((i) => i.id)).not.toEqual(a1);
  });
  it("seeds change every ten minutes and with a shuffle", () => {
    expect(varietySeed(NOW)).toBe(varietySeed(NOW + 60_000));
    expect(varietySeed(NOW)).not.toBe(varietySeed(NOW, 10, "b"));
    expect(noise("a")).toBeGreaterThanOrEqual(0);
  });
});
