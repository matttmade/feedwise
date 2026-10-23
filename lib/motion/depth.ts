import { clamp } from "./damp";

/**
 * Per-element scroll depth, after GSAP ScrollSmoother's data-speed / data-lag and Codrops'
 * "Elastic Grid Scroll" (edge columns trail, centre ones lead), but on native scroll: the
 * page scrolls normally and each element is offset with `translate`.
 */

/** Parallax: speed 1 moves with the page; >1 moves faster, <1 slower. Zero at mid-screen. */
export const parallaxOffset = (centerY: number, viewportH: number, speed: number) =>
  -(centerY - viewportH / 2) * (speed - 1);

/** Damping per frame for a lag in seconds (0 = glued to scroll, ~0.6 = loose). */
export const lagK = (lag: number) => clamp(0.16 - lag * 0.22, 0.025, 0.16);

/** "auto" lag from horizontal position: centre leads, edges trail (the elastic grid). */
export const autoLag = (centerX: number, viewportW: number) =>
  0.08 + 0.42 * clamp(Math.abs(centerX - viewportW / 2) / (viewportW / 2), 0, 1);

/** How far behind the scroll an element sits, capped so nothing drifts too far. */
export const lagOffset = (scrollY: number, follower: number, max = 140) =>
  clamp(scrollY - follower, -max, max);
