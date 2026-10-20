"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  classifySwipe,
  dragIntent,
  dragRotation,
  LONG_PRESS_MS,
  type SwipeAction,
} from "@/lib/motion/swipe";
import { useMotion } from "@/lib/motion/use-motion";

type Action = Exclude<SwipeAction, null>;

type Options = {
  onAction: (action: Action, via: "swipe" | "press") => void;
  /** Swipe up to open (the deck). On the Board vertical moves stay native scroll. */
  allowUp?: boolean;
  /** Press and hold to keep. Touch and pen only; a mouse already has the Keep button. */
  longPress?: boolean;
  enabled?: boolean;
};

const FLY_MS = 220;

/**
 * Drag a card to keep (right), skip (left) or open (up), or press and hold to keep. The card
 * follows the finger, flies off-screen when a swipe commits and springs back when it doesn't.
 * Returns a callback ref for the card element (it attaches and cleans up its own listeners).
 */
export function useSwipe<T extends HTMLElement>({
  onAction,
  allowUp = false,
  longPress = true,
  enabled = true,
}: Options) {
  const motion = useMotion();
  const handler = useRef(onAction);

  useEffect(() => {
    handler.current = onAction;
  });

  return useCallback(
    (el: T | null) => {
      if (!el || !enabled) return;
      let suppressClick = false;

      let start: { x: number; y: number; id: number } | null = null;
      let mode: "pending" | "drag" | "idle" = "idle";
      let last = { x: 0, y: 0, t: 0 };
      let velocity = { x: 0, y: 0 };
      let pressTimer: ReturnType<typeof setTimeout> | undefined;
      const animated = motion !== "off";

      const setTransform = (dx: number, dy: number, transition = "none") => {
        el.style.transition = transition;
        el.style.transform =
          dx || dy
            ? `translate(${dx}px, ${dy}px) rotate(${dragRotation(dx, el.offsetWidth)}deg)`
            : "";
      };

      const finish = (action: Action, via: "swipe" | "press", dx = 0, dy = 0) => {
        suppressClick = true;
        if (via === "swipe" && animated) {
          const w = window.innerWidth;
          const to =
            action === "keep"
              ? [w * 1.2, dy]
              : action === "skip"
                ? [-w * 1.2, dy]
                : [dx, -window.innerHeight];
          setTransform(to[0], to[1], `transform ${FLY_MS}ms ease-in`);
          setTimeout(() => handler.current(action, via), FLY_MS);
        } else {
          handler.current(action, via);
        }
      };

      const onDown = (e: PointerEvent) => {
        if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
        if ((e.target as HTMLElement).closest("button, input, textarea, select")) return;
        start = { x: e.clientX, y: e.clientY, id: e.pointerId };
        last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        velocity = { x: 0, y: 0 };
        mode = "pending";
        if (longPress && e.pointerType !== "mouse") {
          pressTimer = setTimeout(() => {
            if (mode !== "pending") return;
            mode = "idle";
            navigator.vibrate?.(15);
            finish("keep", "press");
          }, LONG_PRESS_MS);
        }
      };

      const onMove = (e: PointerEvent) => {
        if (!start || e.pointerId !== start.id) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (mode === "pending") {
          const intent = dragIntent(dx, dy, allowUp);
          if (intent === "undecided") return;
          clearTimeout(pressTimer);
          if (intent === "scroll") {
            mode = "idle";
            start = null;
            return;
          }
          mode = "drag";
          el.setPointerCapture(e.pointerId);
        }
        if (mode !== "drag") return;
        const dt = Math.max(1, e.timeStamp - last.t);
        velocity = { x: (e.clientX - last.x) / dt, y: (e.clientY - last.y) / dt };
        last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
        setTransform(dx, allowUp ? dy : 0);
      };

      const onUp = (e: PointerEvent) => {
        clearTimeout(pressTimer);
        if (!start || e.pointerId !== start.id) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        const wasDrag = mode === "drag";
        start = null;
        mode = "idle";
        if (!wasDrag) return;
        const action = classifySwipe({
          dx,
          dy,
          vx: velocity.x,
          vy: velocity.y,
          width: el.offsetWidth,
          allowUp,
        });
        if (action) finish(action, "swipe", dx, dy);
        else {
          suppressClick = true;
          setTransform(0, 0, animated ? "transform 200ms ease-out" : "none");
        }
      };

      const onCancel = () => {
        clearTimeout(pressTimer);
        if (mode === "drag") setTransform(0, 0, animated ? "transform 200ms ease-out" : "none");
        start = null;
        mode = "idle";
      };

      // A mouse drag over a card's link or image would start the browser's own drag-and-drop
      // (and cancel ours). Cards aren't draggable things, so turn that off.
      const onDragStart = (e: Event) => e.preventDefault();

      // Stop the long-press image menu from popping up while holding a card.
      const onContextMenu = (e: Event) => {
        if (mode === "pending") e.preventDefault();
      };

      // A drag or long-press shouldn't also count as a tap on the card's link.
      const onClick = (e: MouseEvent) => {
        if (!suppressClick) return;
        suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
      };

      el.addEventListener("click", onClick, true);
      el.addEventListener("dragstart", onDragStart);
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onCancel);
      el.addEventListener("contextmenu", onContextMenu);
      return () => {
        clearTimeout(pressTimer);
        el.removeEventListener("click", onClick, true);
        el.removeEventListener("dragstart", onDragStart);
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onCancel);
        el.removeEventListener("contextmenu", onContextMenu);
      };
    },
    [allowUp, longPress, enabled, motion],
  );
}
