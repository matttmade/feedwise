import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, effectivePrefs, normalisePrefs, prefsCookieValue } from "../lib/prefs";

describe("prefs", () => {
  it("fills defaults and rejects unknown values", () => {
    expect(normalisePrefs({})).toEqual(DEFAULT_PREFS);
    expect(normalisePrefs({ motion: "wild", density: "huge", textSize: "xxl" })).toMatchObject({
      motion: "full",
      density: "comfortable",
      textSize: "md",
    });
  });

  it("reads form values and clamps numbers", () => {
    const p = normalisePrefs({ autoplay: "on", captions: "false", reviewCap: "2", dailyGoal: "9" });
    expect(p).toMatchObject({ autoplay: true, captions: false, reviewCap: 2, dailyGoal: 5 });
    expect(normalisePrefs({ reviewCap: 500 }).reviewCap).toBe(50);
  });

  it("Calm mode turns motion and autoplay off without losing the saved choices", () => {
    const saved = normalisePrefs({ calmMode: true, motion: "full", autoplay: true });
    expect(effectivePrefs(saved)).toMatchObject({ motion: "off", autoplay: false, calmMode: true });
    expect(saved).toMatchObject({ motion: "full", autoplay: true });
    expect(JSON.parse(prefsCookieValue(saved))).toMatchObject({ m: "off", a: 0, c: 1 });
  });
});
