import { describe, expect, it } from "vitest";
import { autoLag, lagK, lagOffset, parallaxOffset } from "@/lib/motion/depth";

describe("depth", () => {
  it("parallax is zero at mid-screen and opposite-signed for fast vs slow", () => {
    expect(parallaxOffset(400, 800, 1.2)).toBeCloseTo(0);
    expect(parallaxOffset(800, 800, 1.2)).toBeLessThan(0);
    expect(parallaxOffset(800, 800, 0.8)).toBeGreaterThan(0);
  });
  it("longer lag means looser damping, within bounds", () => {
    expect(lagK(0.5)).toBeLessThan(lagK(0.1));
    expect(lagK(5)).toBe(0.025);
    expect(lagK(0)).toBe(0.16);
  });
  it("edges trail the centre", () => {
    expect(autoLag(0, 1000)).toBeGreaterThan(autoLag(500, 1000));
  });
  it("caps the lag offset", () => {
    expect(lagOffset(1000, 0)).toBe(140);
    expect(lagOffset(100, 120)).toBe(-20);
  });
});
