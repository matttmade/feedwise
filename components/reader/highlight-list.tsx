"use client";

import { useState, useTransition } from "react";
import { removeHighlight, restoreHighlight, setHighlightNote } from "@/app/actions/highlights";
import type { ReaderHighlight } from "@/lib/data/feed";
import { useToast } from "@/components/ui/toast";

/** What you've saved from this piece, each with an optional note. */
export function HighlightList({ highlights }: { highlights: ReaderHighlight[] }) {
  if (!highlights.length) return null;
  return (
    <section aria-labelledby="highlights-heading" className="mt-(--s-6)">
      <h2 id="highlights-heading" className="t-label">
        Your highlights · {String(highlights.length).padStart(2, "0")}
      </h2>
      <p className="mt-(--s-2) text-muted">
        Each one comes back in Review. A note in your own words helps it stick.
      </p>
      <ul className="mt-(--s-3) border-t border-rule">
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
    <li className="border-b border-rule py-(--s-3)" aria-busy={pending}>
      {highlight.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail
        <img src={highlight.image} alt="Saved image" className="max-h-56 object-contain" />
      ) : (
        <blockquote className="t-lead border-l border-rule pl-(--s-3)">{highlight.text}</blockquote>
      )}
      {editing ? (
        <form
          className="mt-(--s-3) flex flex-col gap-(--s-2)"
          action={(form) =>
            start(async () => {
              await setHighlightNote(highlight.id, String(form.get("note") ?? ""));
              setEditing(false);
            })
          }
        >
          <label htmlFor={`note-${highlight.id}`} className="t-label">
            Your note
          </label>
          <textarea
            id={`note-${highlight.id}`}
            name="note"
            rows={2}
            maxLength={1000}
            defaultValue={highlight.note ?? ""}
            autoFocus
            className="field resize-y"
          />
          <div className="flex gap-(--s-4)">
            <button type="submit" className="link">
              Save note
            </button>
            <button type="button" onClick={() => setEditing(false)} className="link">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {highlight.note && (
            <p className="mt-(--s-2)">
              <span className="t-label mr-(--s-2)">Note</span>
              {highlight.note}
            </p>
          )}
          <div className="t-label mt-(--s-1) flex gap-(--s-4)">
            <button type="button" onClick={() => setEditing(true)} className="link">
              {highlight.note ? "Edit note" : "Add a note"}
            </button>
            <button type="button" onClick={remove} className="link">
              Remove
            </button>
          </div>
        </>
      )}
    </li>
  );
}
