import sharp from "sharp";
import type { Fetcher } from "./types";
import { httpGetBytes } from "./http";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export type ImageSize = { width: number; height: number };

/** Download an image and read its real size. Null when it doesn't load or isn't an image. */
export async function probeImage(
  url: string,
  opts: { fetcher?: Fetcher } = {},
): Promise<ImageSize | null> {
  try {
    const res = await httpGetBytes(url, {
      fetcher: opts.fetcher,
      accept: "image/avif,image/webp,image/*;q=0.8",
      maxBytes: MAX_IMAGE_BYTES,
    });
    if (!res.ok || !/^image\//i.test(res.contentType)) return null;
    const meta = await sharp(res.body).metadata();
    if (!meta.width || !meta.height) return null;
    // EXIF-rotated photos report swapped dimensions.
    const rotated = (meta.orientation ?? 1) >= 5;
    return rotated
      ? { width: meta.height, height: meta.width }
      : { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

/** First candidate that actually loads, with its size. */
export async function chooseLeadImage<T extends { url: string }>(
  candidates: T[],
  probe: (url: string) => Promise<ImageSize | null>,
): Promise<(T & ImageSize) | null> {
  for (const c of candidates) {
    const size = await probe(c.url);
    if (size) return { ...c, ...size };
  }
  return null;
}
