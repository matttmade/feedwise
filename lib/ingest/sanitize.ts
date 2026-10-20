import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const purify = createDOMPurify(new JSDOM("").window);

// Every remaining link opens the original site in a new tab without leaking our page.
purify.addHook("afterSanitizeAttributes", (node) => {
  // Scrollable blocks must be reachable by keyboard (WCAG 2.1.1).
  if (node.tagName === "PRE" || node.tagName === "TABLE") node.setAttribute("tabindex", "0");
  if (node.tagName === "A" && node.getAttribute("href")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer nofollow");
  }
});

/**
 * Article HTML as the Reader may render it: text, headings, lists, quotes, code, figures
 * and images. No scripts, styles, forms or embeds (videos play through our own player).
 */
export function sanitizeBody(html: string): string {
  return purify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      "style",
      "form",
      "input",
      "button",
      "select",
      "textarea",
      "iframe",
      "object",
      "embed",
      "svg",
      "math",
      "noscript",
      "video",
      "audio",
      "source",
      "picture",
    ],
    // Site-supplied ARIA rarely matches what we render (e.g. "Share on Twitter" labels on links).
    FORBID_ATTR: [
      "style",
      "class",
      "id",
      "srcset",
      "sizes",
      "loading",
      "decoding",
      "role",
      "tabindex",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-hidden",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
