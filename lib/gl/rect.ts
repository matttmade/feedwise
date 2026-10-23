/** Pure helpers for the WebGL image layer (unit-tested; no DOM or GL here). */

export type Rect = { x: number; y: number; w: number; h: number };

/** Scale for "object-fit: cover": how much of the image (0–1 per axis) shows in the box. */
export function coverScale(box: { w: number; h: number }, image: { w: number; h: number }) {
  const boxRatio = box.w / box.h;
  const imageRatio = image.w / image.h;
  return boxRatio > imageRatio
    ? { x: 1, y: imageRatio / boxRatio }
    : { x: boxRatio / imageRatio, y: 1 };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

/** The --ease curve's feel (fast start, long settle) as a function of 0–1 progress. */
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** True when the rect overlaps the viewport, with a margin so planes are ready early. */
export const nearViewport = (r: Rect, vw: number, vh: number, margin = 200) =>
  r.y + r.h > -margin && r.y < vh + margin && r.x + r.w > -margin && r.x < vw + margin;
