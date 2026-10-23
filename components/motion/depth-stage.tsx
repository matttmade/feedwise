"use client";

import { useEffect } from "react";
import { damp } from "@/lib/motion/damp";
import { autoLag, lagK, lagOffset, parallaxOffset } from "@/lib/motion/depth";
import { useMotion } from "@/lib/motion/use-motion";

type Entry = {
  el: HTMLElement;
  speed: number;
  /** Lag in seconds, or "auto" (from horizontal position). */
  lag: number | "auto";
  top: number;
  height: number;
  centerX: number;
  follower: number;
  applied: number;
};

/**
 * Gives elements with `data-speed` and/or `data-lag` their own scroll depth, so tiles don't
 * all move as one: some drift slower or faster than the page (parallax), and some trail
 * behind and catch up (lag; "auto" makes edge columns trail the centre). The page itself
 * scrolls natively; this only reads the scroll position and sets each element's
 * `translate`. Full motion only.
 */
export function DepthStage() {
  const motion = useMotion();

  useEffect(() => {
    if (motion !== "full") return;
    const entries = new Map<HTMLElement, Entry>();
    let frame = 0;
    let last = 0;
    let vh = window.innerHeight;
    let vw = window.innerWidth;

    const measure = (e: Entry) => {
      const r = e.el.getBoundingClientRect();
      e.top = r.top + window.scrollY - e.applied;
      e.height = r.height;
      e.centerX = r.left + r.width / 2;
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-speed],[data-lag]").forEach((el) => {
        if (entries.has(el)) return;
        const lagAttr = el.dataset.lag;
        const e: Entry = {
          el,
          speed: Number(el.dataset.speed ?? 1) || 1,
          lag: lagAttr === "auto" ? "auto" : Number(lagAttr ?? 0) || 0,
          top: 0,
          height: 0,
          centerX: 0,
          follower: window.scrollY,
          applied: 0,
        };
        measure(e);
        entries.set(el, e);
      });
      for (const [el, e] of entries) {
        if (el.isConnected) continue;
        e.el.style.translate = "";
        entries.delete(el);
      }
      wake();
    };

    const remeasure = () => {
      vh = window.innerHeight;
      vw = window.innerWidth;
      entries.forEach(measure);
      wake();
    };

    const tick = (t: number) => {
      frame = 0;
      const dt = last ? Math.min(64, t - last) : 16.67;
      last = t;
      const y = window.scrollY;
      let moving = false;
      for (const e of entries.values()) {
        const centerY = e.top + e.height / 2 - y;
        if (centerY < -vh || centerY > vh * 2) {
          e.follower = y;
          if (e.applied !== 0) {
            e.applied = 0;
            e.el.style.translate = "";
          }
          continue;
        }
        const lag = e.lag === "auto" ? autoLag(e.centerX, vw) : e.lag;
        let offset = parallaxOffset(centerY, vh, e.speed);
        if (lag > 0) {
          e.follower = damp(e.follower, y, lagK(lag), dt);
          if (Math.abs(e.follower - y) < 0.3) e.follower = y;
          else moving = true;
          // Each tile's drift is capped in proportion to its lag, so even a fast flick
          // leaves the centre close and the edges trailing well behind.
          offset += lagOffset(y, e.follower, 20 + 260 * lag);
        }
        if (Math.abs(offset - e.applied) > 0.05) {
          e.applied = offset;
          e.el.style.translate = `0 ${offset.toFixed(1)}px`;
        }
      }
      if (moving) wake();
      else last = 0;
    };

    function wake() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", remeasure);
    scan();

    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", remeasure);
      entries.forEach((e) => (e.el.style.translate = ""));
    };
  }, [motion]);

  return null;
}
