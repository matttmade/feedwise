"use client";

import { createContext, useContext, type ReactNode } from "react";
import { BookmarkIcon, SkipIcon } from "@/components/ui/icons";
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
  children,
}: {
  itemId: string;
  title: string;
  labelledBy: string;
  className: string;
  children: ReactNode;
}) {
  const actions = useItemActions(itemId, title);
  if (actions.hidden) return null;
  return (
    <ActionsContext value={actions}>
      <article
        aria-labelledby={labelledBy}
        onKeyDown={shortcutHandler(actions)}
        className={className}
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
      <BookmarkIcon width={18} height={18} />
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
      <SkipIcon width={18} height={18} />
      {label}
    </button>
  );
}
