/** Pure gesture rules, shared by the Swipe deck and Board cards. */

export type SwipeAction = "keep" | "skip" | "open" | null;

/** Past this share of the card's width (or a fast flick), a drag commits. */
export const COMMIT_FRACTION = 0.3;
export const FLICK_SPEED = 0.6; // px per ms
/** Before this, a touch is still a tap or the start of a scroll. */
export const DRAG_SLOP = 10;
/** Hold this long without moving to keep (the "press to save" gesture). */
export const LONG_PRESS_MS = 550;

export type Release = {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  width: number;
  allowUp: boolean;
};

/** Right keeps, left skips, up opens (deck only). Otherwise the card springs back. */
export function classifySwipe(r: Release): SwipeAction {
  const dist = Math.max(80, r.width * COMMIT_FRACTION);
  const horizontal = Math.abs(r.dx) >= Math.abs(r.dy);
  if (horizontal) {
    if (r.dx > dist || (r.vx > FLICK_SPEED && r.dx > DRAG_SLOP)) return "keep";
    if (r.dx < -dist || (r.vx < -FLICK_SPEED && r.dx < -DRAG_SLOP)) return "skip";
    return null;
  }
  if (r.allowUp && (r.dy < -dist || (r.vy < -FLICK_SPEED && r.dy < -DRAG_SLOP))) return "open";
  return null;
}

/** Which way a touch is heading once it passes the slop: decides drag vs. native scroll. */
export function dragIntent(
  dx: number,
  dy: number,
  allowUp: boolean,
): "drag" | "scroll" | "undecided" {
  if (Math.hypot(dx, dy) < DRAG_SLOP) return "undecided";
  if (Math.abs(dx) > Math.abs(dy)) return "drag";
  return allowUp && dy < 0 ? "drag" : "scroll";
}

/** Tilt while dragging: a few degrees, proportional to how far across the card has moved. */
export const dragRotation = (dx: number, width: number) =>
  Math.max(-12, Math.min(12, (dx / Math.max(width, 1)) * 14));
