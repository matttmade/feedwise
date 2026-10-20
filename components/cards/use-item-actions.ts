"use client";

import { useState, useTransition } from "react";
import { keepItem, restoreItem, skipItem } from "@/app/actions/items";
import { useToast } from "@/components/ui/toast";

/** Keep / Skip with optimistic hiding and an Undo that restores the exact previous state. */
export function useItemActions(itemId: string, title: string) {
  const toast = useToast();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  const act = (kind: "keep" | "skip") => {
    setHidden(true);
    startTransition(async () => {
      try {
        const before = await (kind === "keep" ? keepItem(itemId) : skipItem(itemId));
        toast(kind === "keep" ? `Kept “${short(title)}”.` : "Skipped.", async () => {
          await restoreItem(itemId, before);
          setHidden(false);
        });
      } catch {
        setHidden(false);
        toast("That didn't save. Your connection may have dropped — try again.");
      }
    });
  };

  return { hidden, pending, keep: () => act("keep"), skip: () => act("skip") };
}

const short = (t: string) => (t.length > 40 ? `${t.slice(0, 38)}…` : t);

/** K keeps, X skips — only when focus is inside the card and not in a text field. */
export function shortcutHandler(actions: { keep: () => void; skip: () => void }) {
  return (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as HTMLElement).closest("input, textarea, select")) return;
    const key = e.key.toLowerCase();
    if (key === "k") {
      e.preventDefault();
      actions.keep();
    } else if (key === "x") {
      e.preventDefault();
      actions.skip();
    }
  };
}
