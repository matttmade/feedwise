import { describe, expect, it } from "vitest";
import { damp } from "../lib/motion/damp";
import { stepFollowers } from "../lib/motion/followers";

describe("damp", () => {
  it("moves part of the way, independent of frame rate", () => {
    const at60 = damp(damp(0, 100, 0.08, 16.67), 100, 0.08, 16.67);
    const at30 = damp(0, 100, 0.08, 33.34);
    expect(at60).toBeCloseTo(at30, 6);
    expect(at30).toBeGreaterThan(0);
    expect(at30).toBeLessThan(100);
  });
});

describe("stepFollowers", () => {
  it("leans toward the scroll direction, the slow follower lagging the fast one", () => {
    const s = stepFollowers({ fast: 0, slow: 0 }, 400, 16.67);
    expect(s.fast).toBeGreaterThan(s.slow);
    expect(s.lean).toBeGreaterThan(0);
    expect(stepFollowers({ fast: 400, slow: 400 }, 0, 16.67).lean).toBeLessThan(0);
  });

  it("clamps lean to ±1 on big jumps", () => {
    expect(stepFollowers({ fast: 0, slow: 0 }, 100_000, 16.67).lean).toBe(1);
  });

  it("settles to exactly the target and reports it, so the loop can stop", () => {
    let f = { fast: 0, slow: 0 };
    let frames = 0;
    let s = stepFollowers(f, 300, 16.67);
    while (!s.settled && frames < 2000) {
      f = s;
      s = stepFollowers(f, 300, 16.67);
      frames++;
    }
    expect(s.settled).toBe(true);
    expect(s).toMatchObject({ fast: 300, slow: 300, lean: 0 });
    expect(frames).toBeLessThan(600);
  });
});
