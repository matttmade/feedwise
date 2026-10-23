"use client";

import { useSyncExternalStore } from "react";
import { pressOn, setPress } from "@/lib/press";

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-press"] });
  return () => mo.disconnect();
};

/** The small "Press" switch in the top bar: newsprint on, newsprint off. */
export function PressToggle() {
  const on = useSyncExternalStore(subscribe, pressOn, () => false);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setPress(!on)}
      title="Vintage newspaper look"
      className={`t-label flex min-h-11 items-center gap-(--s-1) decoration-1 underline-offset-[6px] hover:underline ${
        on ? "underline" : ""
      }`}
    >
      <span aria-hidden="true" className="inline-block size-2 border border-current">
        <span className={`block size-full ${on ? "bg-current" : ""}`} />
      </span>
      Press
    </button>
  );
}
