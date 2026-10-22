import { describe, expect, it } from "vitest";
import { dealHome, pickOfTheDay, type HomeItem } from "@/lib/feed/home";

const item = (id: string, over: Partial<HomeItem> = {}): HomeItem => ({
  id,
  type: "article",
  readMinutes: 7,
  durationSeconds: null,
  sourceId: "s1",
  topicIds: [],
  ...over,
});

describe("dealHome", () => {
  const pool = [
    item("shown"),
    item("v1", { type: "video", durationSeconds: 200 }),
    item("q1", { readMinutes: 3 }),
    item("l1", { readMinutes: 20, sourceId: "s2" }),
    item("m1", { topicIds: ["t1"], sourceId: "s3" }),
    item("m2", { topicIds: ["t1"] }),
  ];
  const s = dealHome(pool, new Set(["shown"]));

  it("routes items by type and length", () => {
    expect(s.videos.map((i) => i.id)).toEqual(["v1"]);
    expect(s.quick.map((i) => i.id)).toEqual(["q1"]);
    expect(s.long.map((i) => i.id)).toEqual(["l1"]);
  });
  it("never repeats an item across the main sections, nor shows what's already shown", () => {
    const all = [...s.videos, ...s.quick, ...s.long, ...s.sort, ...s.bySource].map((i) => i.id);
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain("shown");
  });
  it("lets topic tabs view the pool again", () => {
    expect(s.byTopic.t1.map((i) => i.id)).toEqual(["m1", "m2"]);
  });
});

describe("pickOfTheDay", () => {
  it("is stable for a day and empty-safe", () => {
    expect(pickOfTheDay(["a", "b", "c"], "2026-10-22")).toBe(
      pickOfTheDay(["a", "b", "c"], "2026-10-22"),
    );
    expect(pickOfTheDay([], "2026-10-22")).toBeNull();
  });
});
