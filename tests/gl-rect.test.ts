import { describe, expect, it } from "vitest";
import { coverScale, easeOutExpo, lerpRect, nearViewport } from "@/lib/gl/rect";

describe("coverScale", () => {
  it("crops the sides of a wide image in a tall box", () => {
    expect(coverScale({ w: 100, h: 200 }, { w: 200, h: 100 })).toEqual({ x: 0.25, y: 1 });
  });
  it("crops top and bottom of a tall image in a wide box", () => {
    expect(coverScale({ w: 200, h: 100 }, { w: 100, h: 100 })).toEqual({ x: 1, y: 0.5 });
  });
});

describe("lerpRect / easeOutExpo", () => {
  it("interpolates every edge and settles at the target", () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 100, y: 50, w: 110, h: 60 };
    expect(lerpRect(a, b, 0.5)).toEqual({ x: 50, y: 25, w: 60, h: 35 });
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);
    expect(easeOutExpo(0.5)).toBeGreaterThan(0.9);
  });
});

describe("nearViewport", () => {
  it("includes planes just outside the screen and skips far ones", () => {
    expect(nearViewport({ x: 0, y: 900, w: 100, h: 100 }, 400, 800)).toBe(true);
    expect(nearViewport({ x: 0, y: 2000, w: 100, h: 100 }, 400, 800)).toBe(false);
  });
});
