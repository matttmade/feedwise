import { describe, expect, it } from "vitest";
import { chunkHtml } from "../lib/reader/chunk";

const p = (n: number) => Array.from({ length: n }, (_, i) => `<p>Para ${i + 1}</p>`).join("");

describe("chunkHtml", () => {
  it("breaks at h2/h3 headings", () => {
    const html = `<div><div><p>Intro</p><h2>One</h2>${p(2)}<h3>Two</h3>${p(1)}</div></div>`;
    const chunks = chunkHtml(html);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toBe("<p>Intro</p>");
    expect(chunks[1].startsWith("<h2>One</h2>")).toBe(true);
    expect(chunks[2].startsWith("<h3>Two</h3>")).toBe(true);
  });

  it("falls back to every six blocks", () => {
    expect(chunkHtml(p(13))).toHaveLength(3);
    expect(chunkHtml(p(4))).toHaveLength(1);
  });

  it("handles empty input", () => {
    expect(chunkHtml("")).toEqual([]);
  });
});
