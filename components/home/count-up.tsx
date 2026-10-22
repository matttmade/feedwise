"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/lib/motion/use-motion";

/** A number that counts up once when it scrolls into view (full motion only). */
export function CountUp({ value }: { value: number }) {
  const motion = useMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || motion !== "full" || value === 0) return;
    let frame = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 1100);
        setShown(Math.round(value * (1 - Math.pow(2, -10 * p))));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      setShown(0);
      frame = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [motion, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {String(shown ?? value).padStart(2, "0")}
    </span>
  );
}
