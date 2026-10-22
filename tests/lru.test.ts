import { describe, expect, it } from "vitest";
import { ByteLru } from "../lib/lru";

const bytes = (n: number) => new Uint8Array(n);

describe("ByteLru", () => {
  it("evicts least recently used entries past the byte budget", () => {
    const lru = new ByteLru(10);
    lru.set("a", bytes(4));
    lru.set("b", bytes(4));
    lru.get("a"); // a is now most recent
    lru.set("c", bytes(4));
    expect(lru.get("b")).toBeUndefined();
    expect(lru.get("a")).toBeDefined();
    expect(lru.get("c")).toBeDefined();
    expect(lru.size).toBe(8);
  });

  it("ignores values bigger than the whole budget", () => {
    const lru = new ByteLru(4);
    lru.set("big", bytes(5));
    expect(lru.get("big")).toBeUndefined();
  });
});
