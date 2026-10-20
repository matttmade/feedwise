import "server-only";
import sharp from "sharp";
import { IMAGE_WIDTHS, type ImageWidth } from "@/lib/images";
import { httpGetBytes } from "@/lib/ingest/http";
import { MAX_IMAGE_BYTES } from "@/lib/ingest/images";
import { ByteLru } from "@/lib/lru";

// Warm instances answer repeats from memory; the CDN (via the immutable header) does the rest.
const cache = new ByteLru(48 * 1024 * 1024);

export function parseWidth(value: string | null): ImageWidth | null {
  const n = Number(value);
  return IMAGE_WIDTHS.includes(n as ImageWidth) ? (n as ImageWidth) : null;
}

/**
 * Fetch a remote image server-side (SSRF-guarded), resize it to an allowed width and answer
 * with WebP and a year-long immutable cache header.
 */
export async function serveResized(url: string, width: ImageWidth): Promise<Response> {
  const key = `${width}:${url}`;
  const hit = cache.get(key);
  if (hit) return webp(hit);
  try {
    const res = await httpGetBytes(url, {
      accept: "image/avif,image/webp,image/*;q=0.8",
      maxBytes: MAX_IMAGE_BYTES,
    });
    if (!res.ok || !/^image\//i.test(res.contentType)) return unavailable();
    const out = await sharp(res.body, { animated: false, limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: width <= 24 ? 40 : 72 })
      .toBuffer();
    const body = new Uint8Array(out);
    cache.set(key, body);
    return webp(body);
  } catch {
    return unavailable();
  }
}

const webp = (body: Uint8Array) =>
  new Response(body as BodyInit, {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });

// Short cache on failures: the origin might come back, and the page shows a fallback meanwhile.
export const unavailable = () =>
  new Response("Image unavailable", {
    status: 404,
    headers: { "cache-control": "public, max-age=600" },
  });
