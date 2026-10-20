"use client";

import { useSyncExternalStore } from "react";
import type { Motion } from "@/lib/prefs";

/**
 * The motion level to use right now: the user's setting (Calm mode forces "off"), capped at
 * "reduced" when the OS asks for less motion. Updates live when either changes.
 */
export function useMotion(): Motion {
  return useSyncExternalStore(subscribe, read, () => "off");
}

function read(): Motion {
  const h = document.documentElement;
  if ("calm" in h.dataset || h.dataset.motion === "off") return "off";
  const os = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (os || h.dataset.motion === "reduced") return "reduced";
  return "full";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion", "data-calm"],
  });
  return () => {
    mq.removeEventListener("change", onChange);
    mo.disconnect();
  };
}
