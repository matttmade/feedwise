"use client";

import { useEffect } from "react";
import { tuneValue } from "@/lib/tune";
import { stepFollowers, type Followers } from "@/lib/motion/followers";
import { FRAME_ORDER, cancelFrame, nextFrame } from "@/lib/motion/frame";
import { useMotion } from "@/lib/motion/use-motion";

/**
 * Offset misprint: while you scroll, the cyan and magenta plates drift out of register by
 * up to ~2px (driven by scroll velocity through the damped followers) and settle back into
 * register when you stop. Sets `--misreg` on <html>; CSS and the WebGL layer read it.
 * Press edition and full motion only.
 */
export function PressMotion() {
  const motion = useMotion();
  useEffect(() => {
    if (motion !== "full") return;
    const root = document.documentElement;
    let f: Followers = { fast: window.scrollY, slow: window.scrollY };
    let frame = 0;
    let last = 0;
    const tick = (t: number) => {
      frame = 0;
      const dt = last ? Math.min(64, t - last) : 16.67;
      last = t;
      const step = stepFollowers(f, window.scrollY, dt);
      f = step;
      root.style.setProperty("--misreg", (step.lean * tuneValue("misprint")).toFixed(2));
      if (!step.settled) frame = nextFrame(tick, FRAME_ORDER.press);
      else last = 0;
    };
    const onScroll = () => {
      if ("press" in root.dataset && !frame) frame = nextFrame(tick, FRAME_ORDER.press);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelFrame(tick);
      root.style.removeProperty("--misreg");
    };
  }, [motion]);
  return null;
}
