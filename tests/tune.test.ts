import { describe, expect, it } from "vitest";
import { DEFAULT_TUNE, DIALS, TUNE_SCRIPT, changedTune, normaliseTune } from "@/lib/tune";

describe("tune", () => {
  it("has unique keys and defaults inside their ranges", () => {
    expect(new Set(DIALS.map((d) => d.key)).size).toBe(DIALS.length);
    for (const d of DIALS) {
      if (d.kind === "range") {
        expect(d.value).toBeGreaterThanOrEqual(d.min);
        expect(d.value).toBeLessThanOrEqual(d.max);
      } else expect(d.options).toContain(d.value);
    }
  });

  it("clamps numbers, rejects unknown options and drops unknown keys", () => {
    const t = normaliseTune({ display: 9, grid: "masonry", bend: "40", nope: 1 });
    expect(t.display).toBe(1.3);
    expect(t.grid).toBe("editorial");
    expect(t.bend).toBe(40);
    expect(t).not.toHaveProperty("nope");
  });

  it("falls back to defaults for junk", () => {
    expect(normaliseTune(null)).toEqual(DEFAULT_TUNE);
    expect(normaliseTune("x")).toEqual(DEFAULT_TUNE);
  });

  it("reports only changed dials", () => {
    expect(changedTune({ ...DEFAULT_TUNE, gutter: 48, grid: "even" })).toEqual({
      gutter: 48,
      grid: "even",
    });
  });

  it("pre-paint script is valid JavaScript", () => {
    expect(() => new Function(TUNE_SCRIPT)).not.toThrow();
  });
});
