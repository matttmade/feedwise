import { describe, expect, it } from "vitest";
import { sanitizeBody } from "../lib/ingest/sanitize";

describe("sanitizeBody", () => {
  it("drops site ARIA and makes scrollable blocks focusable", () => {
    const out = sanitizeBody(
      '<p><a href="https://t.example.com" aria-label="Share on Twitter">quote</a></p><pre>code</pre>',
    );
    expect(out).not.toContain("aria-label");
    expect(out).toContain('<pre tabindex="0">code</pre>');
  });

  it("keeps reading content and removes anything executable or styled", () => {
    const out = sanitizeBody(`
      <h2 class="x" style="color:red">Title</h2>
      <p onclick="steal()">Text with <a href="https://ex.example.com/a">a link</a></p>
      <img src="https://img.example.com/a.jpg" srcset="a.jpg 1x" width="800" height="400" onerror="x()">
      <script>alert(1)</script><style>p{}</style>
      <iframe src="https://evil.example.com"></iframe>
      <a href="javascript:alert(1)">bad</a>
      <form><input name="q"></form>`);
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain('<img src="https://img.example.com/a.jpg" width="800" height="400">');
    expect(out).toContain('target="_blank" rel="noopener noreferrer nofollow"');
    for (const bad of [
      "<script",
      "<style",
      "<iframe",
      "onclick",
      "onerror",
      "javascript:",
      "<form",
      "<input",
      "srcset",
      "class=",
    ]) {
      expect(out).not.toContain(bad);
    }
  });
});
