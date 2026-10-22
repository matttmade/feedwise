import { createHmac, timingSafeEqual } from "node:crypto";

/** Widths the proxy will render. Anything else is refused, so the cache stays bounded. */
export const IMAGE_WIDTHS = [24, 320, 480, 640, 960, 1280] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

function secret(): string {
  const s = process.env.IMAGE_PROXY_SECRET;
  if (!s) throw new Error("IMAGE_PROXY_SECRET is not set");
  return s;
}

const sign = (url: string, width: number) =>
  createHmac("sha256", secret()).update(`${width}:${url}`).digest("base64url").slice(0, 22);

/** Signed proxy URL, so /api/img only ever fetches images our own pages asked for. */
export function proxiedImage(url: string, width: ImageWidth): string {
  const q = new URLSearchParams({ u: url, w: String(width), s: sign(url, width) });
  return `/api/img?${q}`;
}

export function verifyImageSignature(url: string, width: number, signature: string): boolean {
  const expected = Buffer.from(sign(url, width));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type ImageSet = { src: string; srcSet: string; blur: string };

/** Responsive sources for a card or hero image plus a tiny blurred placeholder. */
export function imageSet(url: string, widths: ImageWidth[] = [320, 480, 640, 960]): ImageSet {
  return {
    src: proxiedImage(url, widths[Math.min(1, widths.length - 1)]),
    srcSet: widths.map((w) => `${proxiedImage(url, w)} ${w}w`).join(", "),
    blur: proxiedImage(url, 24),
  };
}

/** Lead image of a stored item: short, unsigned URLs (see app/api/img/item/[id]). */
export function itemImageSet(
  itemId: string,
  widths: ImageWidth[] = [320, 480, 640, 960],
): ImageSet {
  const at = (w: number) => `/api/img/item/${itemId}?w=${w}`;
  return {
    src: at(widths[Math.min(1, widths.length - 1)]),
    srcSet: widths.map((w) => `${at(w)} ${w}w`).join(", "),
    blur: at(24),
  };
}

/** Rewrite <img src> in sanitised article HTML to go through the proxy (https, resized, private). */
export function proxyBodyImages(html: string): string {
  return html.replace(/<img\b([^>]*?)\ssrc="([^"]+)"/g, (whole, before: string, src: string) => {
    const decoded = src.replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(decoded)) return whole;
    const proxied = proxiedImage(decoded, 960).replace(/&/g, "&amp;");
    return `<img${before} loading="lazy" decoding="async" src="${proxied}"`;
  });
}
