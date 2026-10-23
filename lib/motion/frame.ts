/**
 * One shared animation frame for every scroll effect, run in a fixed order: smooth scroll
 * first, then depth (moves tiles), then Press drift, then WebGL (reads where tiles ended up).
 * Separate requestAnimationFrame loops ran in whatever order they were queued, so the image
 * layer could draw a tile one frame behind its caption.
 */
export const FRAME_ORDER = { scroll: 0, depth: 1, press: 2, gl: 3 } as const;

const queue = new Map<FrameRequestCallback, number>();
let raf = 0;

function run(t: number) {
  raf = 0;
  const jobs = [...queue].sort((a, b) => a[1] - b[1]);
  queue.clear();
  for (const [job] of jobs) job(t);
}

/** Run `job` on the next frame, after anything with a lower order. Returns a truthy id. */
export function nextFrame(job: FrameRequestCallback, order: number): number {
  queue.set(job, order);
  if (!raf) raf = requestAnimationFrame(run);
  return 1;
}

export function cancelFrame(job: FrameRequestCallback): void {
  queue.delete(job);
}
