import { describe, expect, it } from "vitest";
import { columnStarts, eagerIndexes } from "../lib/feed/masonry";

describe("columnStarts", () => {
  it("splits equal cards evenly", () => {
    const square = Array(12).fill(1);
    expect(columnStarts(square, 2)).toEqual([6]);
    expect(columnStarts(square, 3)).toEqual([4, 8]);
    expect(columnStarts(square, 4)).toEqual([3, 6, 9]);
  });

  it("puts fewer tall cards in a column", () => {
    // Four tall portraits then wide images: column 2 starts sooner.
    const ratios = [0.66, 0.66, 0.66, 0.66, 2, 2, 2, 2, 2, 2, 2, 2];
    expect(columnStarts(ratios, 2)[0]).toBeLessThan(6);
  });

  it("returns nothing for a single column or empty list", () => {
    expect(columnStarts([1, 1], 1)).toEqual([]);
    expect(columnStarts([], 3)).toEqual([]);
  });
});

describe("eagerIndexes", () => {
  it("includes the first card and likely column tops", () => {
    const set = eagerIndexes(Array(24).fill(1));
    expect(set.has(0)).toBe(true);
    expect(set.has(12)).toBe(true);
    expect(set.size).toBeLessThanOrEqual(4);
  });
});
