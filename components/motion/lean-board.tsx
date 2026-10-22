"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { stepFollowers, type Followers } from "@/lib/motion/followers";
import { useMotion } from "@/lib/motion/use-motion";

/**
 * Cards lean slightly into the scroll and settle back when it stops. It only reads scroll
 * position (never sets it), runs only while values are moving, and only at full motion.
 */
export function LeanBoard({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || motion !== "full") {
      el?.style.setProperty("--lean", "0");
      return;
    }
    let f: Followers = { fast: window.scrollY, slow: window.scrollY };
    let frame = 0;
    let last = 0;

    const tick = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16.67;
      last = t;
      const next = stepFollowers(f, window.scrollY, dt);
      f = next;
      el.style.setProperty("--lean", next.lean.toFixed(4));
      frame = next.settled ? 0 : requestAnimationFrame(tick);
      if (next.settled) last = 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      el.style.setProperty("--lean", "0");
    };
  }, [motion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
