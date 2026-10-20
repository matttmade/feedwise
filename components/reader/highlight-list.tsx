"use client";

import { useState, useTransition } from "react";
import { removeHighlight, restoreHighlight, setHighlightNote } from "@/app/actions/highlights";
import type { ReaderHighlight } from "@/lib/data/feed";
import { useToast } from "@/components/ui/toast";

/** What you've saved from this piece, each with an optional note. */
export function HighlightList({ highlights }: { highlights: ReaderHighlight[] }) {
  if (!highlights.length) return null;
  return (
    <section aria-labelledby="highlights-heading" className="mt-12">
      <h2 id="highlights-heading" className="text-lg font-bold">
        Your highlights ({highlights.length})
      </h2>
      <p className="mt-1 text-sm text-muted">
        Each one comes back in Review. A note in your own words helps it stick.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {highlights.map((h) => (
          <HighlightRow key={h.id} highlight={h} />
        ))}
      </ul>
    </section>
  );
}

function HighlightRow({ highlight }: { highlight: ReaderHighlight }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const remove = () =>
    start(async () => {
      const snapshot = await removeHighlight(highlight.id);
      toast("Highlight removed.", snapshot ? () => restoreHighlight(snapshot) : undefined);
    });

  return (
    <li className="rounded-card border border-line bg-surface p-4" aria-busy={pending}>
      {highlight.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail
        <img
          src={highlight.image}
          alt="Saved image"
          className="max-h-56 rounded-control object-contain"
        />
      ) : (
        <blockquote className="border-l-4 border-accent pl-3">{highlight.text}</blockquote>
      )}
      {editing ? (
        <form
          className="mt-3 flex flex-col gap-2"
          action={(form) =>
            start(async () => {
              await setHighlightNote(highlight.id, String(form.get("note") ?? ""));
              setEditing(false);
            })
          }
        >
          <label htmlFor={`note-${highlight.id}`} className="text-sm">
            Your note
          </label>
          <textarea
            id={`note-${highlight.id}`}
            name="note"
            rows={2}
            maxLength={1000}
            defaultValue={highlight.note ?? ""}
            autoFocus
            className="rounded-control border border-line bg-bg p-3"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-control bg-accent px-4 font-bold text-accent-ink"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-control px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {highlight.note && <p className="mt-3 text-muted">Note: {highlight.note}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-11 rounded-control px-3 font-bold text-accent"
            >
              {highlight.note ? "Edit note" : "Add a note"}
            </button>
            <button
              type="button"
              onClick={remove}
              className="min-h-11 rounded-control px-3 text-muted hover:text-ink"
            >
              Remove
            </button>
          </div>
        </>
      )}
    </li>
  );
}
