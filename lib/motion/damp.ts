/** Frame-rate-independent damping (CLAUDE.md). k ≈ 0.07–0.1; dt in ms. */
export const damp = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(Math.log(1 - k) * (dt / 16.67)));

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
