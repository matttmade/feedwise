"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { FRAME_ORDER, cancelFrame, nextFrame } from "@/lib/motion/frame";
import { useMotion } from "@/lib/motion/use-motion";
import { TUNE_EVENT, tuneValue } from "@/lib/tune";

/** Pages where wheel scrolling glides. Never the Reader or the Board (CLAUDE.md). */
const SMOOTH_PATHS = new Set(["/today"]);

/**
 * Wheel scrolling on Today glides (Lenis): the page then scrolls on the same frame the WebGL
 * images and tiles are drawn, so they stay locked together instead of trailing a frame
 * behind the browser's own scroll. Keyboard, scrollbar and touch stay native. Full motion
 * only, and Tune's "Smooth scroll" switches it off.
 */
export function SmoothScroll() {
  const motion = useMotion();
  const path = usePathname();
  const smooth = SMOOTH_PATHS.has(path);

  useEffect(() => {
    if (motion !== "full" || !smooth) return;
    let lenis: Lenis | null = null;
    let frame = 0;

    const tick = (t: number) => {
      frame = 0;
      if (!lenis) return;
      lenis.options.lerp = tuneValue("glide");
      lenis.raf(t);
      if (lenis.isScrolling) wake();
    };
    function wake() {
      if (!frame) frame = nextFrame(tick, FRAME_ORDER.scroll);
    }

    const sync = () => {
      const on = document.documentElement.getAttribute("data-smooth") !== "off";
      if (on && !lenis) {
        lenis = new Lenis({
          autoRaf: false,
          lerp: tuneValue("glide"),
          smoothWheel: true,
          syncTouch: false,
          // Panels with their own scroll (Tune) keep native wheel scrolling.
          prevent: (node) => Boolean(node.closest?.("[data-scroll-native]")),
        });
        lenis.on("scroll", wake);
      } else if (!on && lenis) {
        lenis.destroy();
        lenis = null;
      }
    };
    sync();
    window.addEventListener("wheel", wake, { passive: true });
    window.addEventListener(TUNE_EVENT, sync);
    return () => {
      window.removeEventListener("wheel", wake);
      window.removeEventListener(TUNE_EVENT, sync);
      cancelFrame(tick);
      lenis?.destroy();
    };
  }, [motion, smooth]);

  return null;
}
