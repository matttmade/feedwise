"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSwipe } from "@/components/motion/use-swipe";
import { shortcutHandler, useItemActions } from "./use-item-actions";

type Actions = ReturnType<typeof useItemActions>;
const ActionsContext = createContext<Actions | null>(null);

/**
 * The only client part of a card: hides it after Keep/Skip (Undo brings it back) and
 * handles K / X while focus is inside. Everything else renders on the server.
 */
export function CardFrame({
  itemId,
  title,
  labelledBy,
  className,
  depth,
  children,
}: {
  itemId: string;
  title: string;
  labelledBy: string;
  className: string;
  /** Scroll depth for components/motion/depth-stage.tsx. */
  depth?: { speed?: number; lag?: number | "auto" };
  children: ReactNode;
}) {
  const actions = useItemActions(itemId, title);
  // Swipe right to keep, left to hide; press and hold to keep. Vertical moves stay scrolling.
  const swipeRef = useSwipe<HTMLElement>({
    onAction: (a) => (a === "skip" ? actions.skip() : actions.keep()),
    enabled: !actions.hidden,
  });
  if (actions.hidden) return null;
  return (
    <ActionsContext value={actions}>
      <article
        ref={swipeRef}
        aria-labelledby={labelledBy}
        onKeyDown={shortcutHandler(actions)}
        data-speed={depth?.speed}
        data-lag={depth?.lag}
        className={`swipeable ${className}`}
      >
        {children}
      </article>
    </ActionsContext>
  );
}

const useActions = () => useContext(ActionsContext)!;

export function KeepButton({ className, label = "Keep" }: { className: string; label?: string }) {
  const { keep, pending } = useActions();
  return (
    <button
      type="button"
      onClick={keep}
      disabled={pending}
      aria-keyshortcuts="K"
      className={className}
    >
      {label}
    </button>
  );
}

export function SkipButton({ className, label = "Skip" }: { className: string; label?: string }) {
  const { skip, pending } = useActions();
  return (
    <button
      type="button"
      onClick={skip}
      disabled={pending}
      aria-keyshortcuts="X"
      className={className}
    >
      {label}
    </button>
  );
}
