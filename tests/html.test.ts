import { describe, expect, it } from "vitest";
import {
  canonicalVideoUrl,
  contentImages,
  extractPageMeta,
  isGenericImage,
  parseDuration,
  parseHtml,
} from "../lib/ingest/html";
import { fixture } from "./helpers";

describe("html helpers", () => {
  it("canonicalises YouTube and Vimeo URLs", () => {
    const yt = "https://www.youtube.com/watch?v=0FQC0mu5Z00";
    expect(canonicalVideoUrl("https://youtu.be/0FQC0mu5Z00")).toBe(yt);
    expect(canonicalVideoUrl("https://www.youtube-nocookie.com/embed/0FQC0mu5Z00?rel=0")).toBe(yt);
    expect(canonicalVideoUrl("https://www.youtube.com/shorts/0FQC0mu5Z00")).toBe(yt);
    expect(canonicalVideoUrl("https://player.vimeo.com/video/1186261079?dnt=1")).toBe(
      "https://vimeo.com/1186261079",
    );
    expect(canonicalVideoUrl("https://example.com/video/123456")).toBeUndefined();
  });

  it("parses ISO-8601 and plain durations", () => {
    expect(parseDuration("PT1H2M3S")).toBe(3723);
    expect(parseDuration("PT4M")).toBe(240);
    expect(parseDuration("151")).toBe(151);
    expect(parseDuration("soon")).toBeUndefined();
  });

  it("reads og meta with absolute URLs", () => {
    const meta = extractPageMeta(
      parseHtml(fixture("pages/article.html"), "https://mag.example.com/a/"),
      "https://mag.example.com/a/",
    );
    expect(meta).toMatchObject({
      ogType: "article",
      image: "https://mag.example.com/uploads/random-hero.jpg",
      imageWidth: 1200,
      imageHeight: 630,
    });
  });

  it("finds real content images, skipping trackers, tiny images and data URIs", () => {
    const html = `
      <img src="data:image/gif;base64,R0lGOD">
      <img src="https://feeds.feedburner.com/~r/x/~4/abc" width="1" height="1">
      <img src="/icons/star.svg">
      <img data-src="/lazy/hero.jpg" width="1200" height="800">
      <img srcset="/a-480.jpg 480w, /a-960.jpg 960w">`;
    expect(contentImages(html, "https://x.example.com/post/").map((i) => i.url)).toEqual([
      "https://x.example.com/lazy/hero.jpg",
      "https://x.example.com/a-480.jpg",
    ]);
  });

  it("spots generic share images", () => {
    expect(isGenericImage("https://www.itsnicethat.com/images/social.jpg")).toBe(true);
    expect(isGenericImage("https://x.example.com/og-default.png")).toBe(true);
    expect(isGenericImage("https://x.example.com/uploads/socialite-portrait.jpg")).toBe(false);
  });
});
