"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { keepItem, restoreItem, saveKeepNote, type Snapshot } from "@/app/actions/items";
import { useToast } from "@/components/ui/toast";
import { useKept } from "./reader-shell";

/** One tap keeps. Afterwards, an optional "one thing to remember" note. */
export function KeepPanel({ itemId, variant }: { itemId: string; variant: "bar" | "end" }) {
  const { kept, setKept, keepRequest } = useKept();
  const [noteSaved, setNoteSaved] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const keep = () =>
    start(async () => {
      setKept(true);
      const before: Snapshot = await keepItem(itemId);
      toast("Kept.", async () => {
        await restoreItem(itemId, before);
        setKept(false);
      });
    });

  // The K shortcut is handled once, by the bar button.
  const seen = useRef(keepRequest);
  useEffect(() => {
    if (variant === "bar" && keepRequest !== seen.current && !kept) keep();
    seen.current = keepRequest;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to new requests only
  }, [keepRequest]);

  if (variant === "bar") {
    return (
      <button
        type="button"
        onClick={keep}
        disabled={kept || pending}
        aria-keyshortcuts="K"
        className={kept ? "flex min-h-11 items-center px-(--s-2)" : "btn"}
      >
        {kept ? "Kept ✓" : "Keep"}
      </button>
    );
  }

  return (
    <section aria-labelledby="keep-heading" className="mt-(--s-6) border-t border-rule pt-(--s-3)">
      <p className="t-label">Keep</p>
      <h2 id="keep-heading" className="t-lead mt-(--s-2)">
        {kept ? "Kept. Want to note the one thing to remember?" : "Worth remembering?"}
      </h2>
      {!kept ? (
        <button type="button" onClick={keep} disabled={pending} className="btn mt-(--s-3)">
          Keep this →
        </button>
      ) : noteSaved ? (
        <p className="mt-(--s-2)">Saved. It&apos;ll come back in Review, starting tomorrow.</p>
      ) : (
        <form
          className="mt-(--s-3) flex flex-col gap-(--s-2)"
          action={(form) =>
            start(async () => {
              await saveKeepNote(itemId, String(form.get("note") ?? ""));
              setNoteSaved(true);
            })
          }
        >
          <label htmlFor="keep-note" className="t-label">
            Optional — a sentence in your own words works best.
          </label>
          <textarea
            id="keep-note"
            name="note"
            rows={3}
            maxLength={1000}
            className="field resize-y"
          />
          <button type="submit" disabled={pending} className="link self-start">
            Save note →
          </button>
        </form>
      )}
    </section>
  );
}
