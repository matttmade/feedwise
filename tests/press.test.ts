import { describe, expect, it } from "vitest";
import { issueLine } from "@/lib/press";

describe("issueLine", () => {
  it("numbers the issue by day of the year", () => {
    expect(issueLine(new Date("2026-10-23T09:00:00Z"))).toBe("Vol. 1 · No. 296");
    expect(issueLine(new Date("2027-01-01T09:00:00Z"))).toBe("Vol. 2 · No. 1");
  });
});
