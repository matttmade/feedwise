import { describe, expect, it } from "vitest";
import { playerSrc } from "../lib/reader/video";

describe("playerSrc", () => {
  it("builds a nocookie YouTube player, muted with captions when asked", () => {
    const src = playerSrc("https://www.youtube.com/watch?v=0FQC0mu5Z00", null, {
      muted: true,
      captions: true,
    })!;
    expect(src.startsWith("https://www.youtube-nocookie.com/embed/0FQC0mu5Z00?")).toBe(true);
    expect(src).toContain("mute=1");
    expect(src).toContain("cc_load_policy=1");
  });

  it("finds a Vimeo id in stored embed HTML", () => {
    const src = playerSrc(
      "https://motion.example.com/post/",
      '<iframe src="https://player.vimeo.com/video/1186261079?app_id=1">',
      {
        muted: true,
      },
    )!;
    expect(src).toMatch(/^https:\/\/player\.vimeo\.com\/video\/1186261079\?.*muted=1/);
  });

  it("ignores anything that isn't YouTube or Vimeo", () => {
    expect(
      playerSrc("https://evil.example.com/v", '<iframe src="https://evil.example.com/embed">'),
    ).toBeNull();
  });
});
