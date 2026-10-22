import { describe, expect, it } from "vitest";
import { classifySwipe, dragIntent, dragRotation } from "../lib/motion/swipe";

const base = { dx: 0, dy: 0, vx: 0, vy: 0, width: 360, allowUp: true };

describe("classifySwipe", () => {
  it("right keeps, left skips, past ~30% of the width", () => {
    expect(classifySwipe({ ...base, dx: 130 })).toBe("keep");
    expect(classifySwipe({ ...base, dx: -130 })).toBe("skip");
    expect(classifySwipe({ ...base, dx: 60 })).toBeNull();
  });

  it("a fast flick commits even when short", () => {
    expect(classifySwipe({ ...base, dx: 40, vx: 1.2 })).toBe("keep");
    expect(classifySwipe({ ...base, dx: -40, vx: -1.2 })).toBe("skip");
    expect(classifySwipe({ ...base, dx: 5, vx: 1.2 })).toBeNull();
  });

  it("up opens in the deck only", () => {
    expect(classifySwipe({ ...base, dy: -150 })).toBe("open");
    expect(classifySwipe({ ...base, dy: -150, allowUp: false })).toBeNull();
    expect(classifySwipe({ ...base, dy: 150 })).toBeNull();
  });
});

describe("dragIntent", () => {
  it("waits for the slop, then lets vertical moves scroll on the Board", () => {
    expect(dragIntent(4, 3, false)).toBe("undecided");
    expect(dragIntent(20, 5, false)).toBe("drag");
    expect(dragIntent(3, 25, false)).toBe("scroll");
    expect(dragIntent(3, -25, false)).toBe("scroll");
    expect(dragIntent(3, -25, true)).toBe("drag");
  });
});

describe("dragRotation", () => {
  it("tilts a little and never more than 12°", () => {
    expect(dragRotation(0, 360)).toBe(0);
    expect(dragRotation(180, 360)).toBe(7);
    expect(dragRotation(2000, 360)).toBe(12);
  });
});
