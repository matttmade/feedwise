"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { keepItem, restoreItem, saveKeepNote, type Snapshot } from "@/app/actions/items";
import { useToast } from "@/components/ui/toast";
import { BookmarkIcon, CheckIcon } from "@/components/ui/icons";
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
        className={`flex min-h-11 items-center gap-1.5 rounded-control px-4 font-bold ${
          kept ? "text-keep" : "bg-keep-soft text-keep hover:brightness-95"
        }`}
      >
        {kept ? <CheckIcon width={18} height={18} /> : <BookmarkIcon width={18} height={18} />}
        {kept ? "Kept" : "Keep"}
      </button>
    );
  }

  return (
    <section aria-labelledby="keep-heading" className="mt-12 rounded-card bg-keep-soft p-6">
      <h2 id="keep-heading" className="text-lg font-bold">
        {kept ? "Kept. Want to note the one thing to remember?" : "Worth remembering?"}
      </h2>
      {!kept ? (
        <button
          type="button"
          onClick={keep}
          disabled={pending}
          className="mt-3 flex min-h-12 items-center gap-2 rounded-control bg-keep px-5 font-bold text-white"
        >
          <BookmarkIcon width={18} height={18} />
          Keep this
        </button>
      ) : noteSaved ? (
        <p className="mt-2">Saved. It&apos;ll come back in Review, starting tomorrow.</p>
      ) : (
        <form
          className="mt-3 flex flex-col gap-2"
          action={(form) =>
            start(async () => {
              await saveKeepNote(itemId, String(form.get("note") ?? ""));
              setNoteSaved(true);
            })
          }
        >
          <label htmlFor="keep-note" className="text-sm">
            Optional — a sentence in your own words works best.
          </label>
          <textarea
            id="keep-note"
            name="note"
            rows={3}
            maxLength={1000}
            className="rounded-control border border-line bg-surface p-3"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 self-start rounded-control bg-keep px-5 font-bold text-white"
          >
            Save note
          </button>
        </form>
      )}
    </section>
  );
}
