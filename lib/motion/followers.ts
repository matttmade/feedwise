import { clamp, damp } from "./damp";

export type Followers = { fast: number; slow: number };

export const FAST_K = 0.08;
export const SLOW_K = 0.04;
const SETTLED = 0.01;

/**
 * One frame of the fast/slow follower pair. The gap between the slow follower and the target
 * becomes `lean` (−1…1), which drives a slight skew. `settled` says the loop can stop.
 */
export function stepFollowers(f: Followers, target: number, dt: number) {
  const fast = damp(f.fast, target, FAST_K, dt);
  const slow = damp(f.slow, target, SLOW_K, dt);
  const settled = Math.abs(target - fast) < SETTLED && Math.abs(target - slow) < SETTLED;
  return {
    fast: settled ? target : fast,
    slow: settled ? target : slow,
    lean: settled ? 0 : clamp((target - slow) / 500, -1, 1),
    settled,
  };
}
