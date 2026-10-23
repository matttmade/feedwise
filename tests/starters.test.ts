import { describe, expect, it } from "vitest";
import { DEFAULT_STARTERS, STARTERS, pickStarters } from "@/lib/starters";

describe("starters", () => {
  it("has unique ids and https feeds", () => {
    expect(new Set(STARTERS.map((s) => s.id)).size).toBe(STARTERS.length);
    for (const s of STARTERS) expect(s.feedUrl).toMatch(/^https:\/\//);
  });

  it("defaults to known starters", () => {
    expect(pickStarters(DEFAULT_STARTERS)).toHaveLength(DEFAULT_STARTERS.length);
  });

  it("ignores unknown ids and keeps list order", () => {
    expect(pickStarters(["aeon", "nope", "colossal"]).map((s) => s.id)).toEqual([
      "colossal",
      "aeon",
    ]);
  });
});
