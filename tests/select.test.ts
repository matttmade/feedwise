import { describe, expect, it } from "vitest";
import { batchGoal, costLabel, matchesTime, pickBatch, startOfDay } from "../lib/feed/select";

const item = (id: string, sourceId: string, sortAt: string) => ({ id, sourceId, sortAt });

describe("pickBatch", () => {
  it("round-robins sources so one busy feed can't take over", () => {
    const items = [
      item("a1", "A", "2026-10-20T10:00:00Z"),
      item("a2", "A", "2026-10-20T09:00:00Z"),
      item("a3", "A", "2026-10-20T08:00:00Z"),
      item("b1", "B", "2026-10-19T10:00:00Z"),
      item("c1", "C", "2026-10-18T10:00:00Z"),
    ];
    expect(pickBatch(items, 4).map((i) => i.id)).toEqual(["a1", "b1", "c1", "a2"]);
  });

  it("returns fewer when there isn't enough, and nothing for n ≤ 0", () => {
    const items = [item("a1", "A", "2026-10-20T10:00:00Z")];
    expect(pickBatch(items, 5)).toHaveLength(1);
    expect(pickBatch(items, 0)).toEqual([]);
  });
});

describe("batchGoal", () => {
  it("clamps to 3–5", () => {
    expect(batchGoal(undefined)).toBe(5);
    expect(batchGoal(1)).toBe(3);
    expect(batchGoal(4)).toBe(4);
    expect(batchGoal(12)).toBe(5);
  });
});

describe("cost", () => {
  it("labels read time and video length", () => {
    expect(costLabel({ type: "article", readMinutes: 4, durationSeconds: null })).toBe(
      "4 min read",
    );
    expect(costLabel({ type: "video", readMinutes: null, durationSeconds: 151 })).toBe("2:31");
    expect(costLabel({ type: "video", readMinutes: null, durationSeconds: 3725 })).toBe("1:02:05");
    expect(costLabel({ type: "video", readMinutes: null, durationSeconds: null })).toBe("Video");
    expect(costLabel({ type: "article", readMinutes: null, durationSeconds: null })).toBeNull();
  });

  it("filters by time chip", () => {
    const quick = { type: "article", readMinutes: 3, durationSeconds: null };
    const long = { type: "video", readMinutes: null, durationSeconds: 1800 };
    expect(matchesTime(quick, "quick")).toBe(true);
    expect(matchesTime(quick, "medium")).toBe(false);
    expect(matchesTime(long, "long")).toBe(true);
    expect(matchesTime(long, "video")).toBe(true);
    expect(
      matchesTime({ type: "article", readMinutes: null, durationSeconds: null }, "quick"),
    ).toBe(false);
  });
});

describe("startOfDay", () => {
  it("finds local midnight as a UTC instant", () => {
    const now = new Date("2026-10-20T03:30:00Z");
    expect(startOfDay(now, "UTC").toISOString()).toBe("2026-10-20T00:00:00.000Z");
    // 03:30Z is still 19 Oct in Los Angeles (UTC−7 in October).
    expect(startOfDay(now, "America/Los_Angeles").toISOString()).toBe("2026-10-19T07:00:00.000Z");
    expect(startOfDay(now, "Europe/London").toISOString()).toBe("2026-10-19T23:00:00.000Z");
  });
});
